import { NextResponse } from 'next/server';
import { parseIfraPdfText } from '@/lib/import/ifraPdfParser';
import { prisma } from '@/lib/prisma';
import { PDFParse } from 'pdf-parse';
import path from 'path';

// Configurazione worker per Next.js/Node environment
const workerPath = path.join(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
PDFParse.setWorker(workerPath);

export async function POST(request: Request) {
  try {
    const { pdfUrls, limit = 20 } = await request.json();

    if (!pdfUrls || !Array.isArray(pdfUrls)) {
      return NextResponse.json({ success: false, error: "Array pdfUrls mancante." }, { status: 400 });
    }

    const results = {
      created: 0,
      updated: 0,
      errors: [] as string[]
    };

    // Limita il numero di PDF da processare
    const pdfsToProcess = pdfUrls.slice(0, limit);

    // Funzione helper per ritardare l'esecuzione
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (const pdfUrl of pdfsToProcess) {
      try {
        console.log("BULK PROCESSING PDF:", pdfUrl);
        
        // 1. Scarica PDF
        const response = await fetch(pdfUrl);
        if (!response.ok) throw new Error(`Download fallito per ${pdfUrl}`);
        const buffer = Buffer.from(await response.arrayBuffer());

        // 2. Parse PDF
        const parser = new PDFParse({ data: buffer });
        const pdfData = await parser.getText();
        await parser.destroy();
        
        const parsed = parseIfraPdfText(pdfData.text);
        console.log("IFRA PARSED:", { title: parsed.title, casCount: parsed.casNumbers.length });

        if (parsed.casNumbers.length === 0) {
          throw new Error(`Nessun CAS trovato nel PDF: ${parsed.title}`);
        }

        const primaryCas = parsed.casNumbers[0];

        // Naming Fallback Logic
        let finalName = parsed.title;
        if (!finalName || finalName === "Standard Sconosciuto") {
          finalName = parsed.synonyms ? parsed.synonyms.split(/[,;]/)[0].trim() : primaryCas;
        }

        // 3. Verifica se è un update o un create
        const existing = await prisma.material.findUnique({ where: { cas: primaryCas } });

        // 4. Upsert Material
        const material = await prisma.material.upsert({
          where: { cas: primaryCas },
          update: {
            name: finalName,
            synonyms: parsed.synonyms,
            recommendation: parsed.recommendation,
            supplier: "IFRA",
            ifraSourceUrl: pdfUrl,
            ifraAmendment: parsed.amendment,
            ifraStandardTitle: parsed.title,
            ifraStatus: "found"
          },
          create: {
            name: finalName,
            cas: primaryCas,
            synonyms: parsed.synonyms,
            recommendation: parsed.recommendation,
            supplier: "IFRA",
            ifraSourceUrl: pdfUrl,
            ifraAmendment: parsed.amendment,
            ifraStandardTitle: parsed.title,
            ifraStatus: "found"
          }
        });

        console.log("MATERIAL SAVED:", material.name);

        // 5. Salva Limiti (Deduplicati per source="IFRA")
        await prisma.ifraLimit.deleteMany({
          where: {
            materialId: material.id,
            source: "IFRA"
          }
        });

        await prisma.ifraLimit.createMany({
          data: parsed.limits.map(l => ({
            materialId: material.id,
            amendment: parsed.amendment,
            category: l.category,
            limit: l.limit,
            limitText: l.limitText,
            isNoRestriction: l.isNoRestriction,
            isRestricted: !l.isNoRestriction,
            source: "IFRA",
            sourceUrl: pdfUrl
          }))
        });

        if (existing) results.updated++; else results.created++;

        // Delay 500ms tra i PDF come richiesto
        await delay(500);

      } catch (err: any) {
        console.error(`ERROR PROCESSING ${pdfUrl}:`, err.message);
        results.errors.push(`${pdfUrl}: ${err.message}`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      created: results.created, 
      updated: results.updated, 
      errors: results.errors 
    });

  } catch (error: any) {
    console.error("BULK IMPORT EXCEPTION:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
