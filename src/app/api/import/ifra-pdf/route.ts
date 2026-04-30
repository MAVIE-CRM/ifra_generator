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
    const formData = await request.formData();
    const action = formData.get('action') as string; // "preview" | "save"
    const pdfUrl = formData.get('pdfUrl') as string;
    const file = formData.get('file') as File;

    let buffer: Buffer;
    let sourceUrl = pdfUrl || (file ? file.name : "Uploaded PDF");

    if (file) {
      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
    } else if (pdfUrl) {
      const response = await fetch(pdfUrl);
      if (!response.ok) throw new Error("Impossibile scaricare il PDF.");
      const bytes = await response.arrayBuffer();
      buffer = Buffer.from(bytes);
    } else {
      return NextResponse.json({ success: false, error: "Nessun PDF fornito." }, { status: 400 });
    }

    // Estrazione testo dal PDF
    const parser = new PDFParse({ data: buffer });
    const pdfData = await parser.getText();
    await parser.destroy();
    
    const parsedData = parseIfraPdfText(pdfData.text);

    if (action === 'preview') {
      return NextResponse.json({ 
        success: true, 
        data: { ...parsedData, sourceUrl } 
      });
    }

    if (action === 'save') {
      const { title, amendment, casNumbers, synonyms, recommendation, limits } = parsedData;
      
      if (casNumbers.length === 0) {
        throw new Error("Nessun numero CAS trovato nel PDF. Impossibile salvare.");
      }

      const primaryCas = casNumbers[0];

      // Naming Fallback Logic
      let finalName = title;
      if (!finalName || finalName === "Standard Sconosciuto") {
        finalName = synonyms ? synonyms.split(/[,;]/)[0].trim() : primaryCas;
      }

      // Upsert Material
      const material = await prisma.material.upsert({
        where: { cas: primaryCas },
        update: {
          name: finalName,
          synonyms: synonyms,
          recommendation: recommendation,
          supplier: "IFRA Standards Library",
          ifraSourceUrl: sourceUrl,
          ifraAmendment: amendment,
          ifraStandardTitle: title,
          ifraStatus: "found"
        },
        create: {
          name: finalName,
          cas: primaryCas,
          synonyms: synonyms,
          recommendation: recommendation,
          supplier: "IFRA Standards Library",
          ifraSourceUrl: sourceUrl,
          ifraAmendment: amendment,
          ifraStandardTitle: title,
          ifraStatus: "found"
        }
      });

      // Cancella vecchi limiti IFRA ufficiali per questo materiale
      await prisma.ifraLimit.deleteMany({
        where: {
          materialId: material.id,
          source: "IFRA"
        }
      });

      // Salva nuovi limiti
      await prisma.ifraLimit.createMany({
        data: limits.map(l => ({
          materialId: material.id,
          amendment: amendment,
          category: l.category,
          limit: l.limit,
          limitText: l.limitText,
          isNoRestriction: l.isNoRestriction,
          isRestricted: !l.isNoRestriction,
          source: "IFRA",
          sourceUrl: sourceUrl
        }))
      });

      return NextResponse.json({ 
        success: true, 
        message: `Standard IFRA per ${finalName} salvato correttamente.`,
        materialId: material.id
      });
    }

    return NextResponse.json({ success: false, error: "Azione non valida." }, { status: 400 });

  } catch (error: any) {
    console.error("IFRA PDF IMPORT ERROR:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Errore durante l'elaborazione del PDF." 
    }, { status: 500 });
  }
}
