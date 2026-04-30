import { NextResponse } from 'next/server';
import { parseFraterworksProduct } from '@/lib/import/fraterworks';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { productUrls, limit = 20 } = await request.json();

    if (!productUrls || !Array.isArray(productUrls)) {
      return NextResponse.json({ success: false, error: "Lista URL non valida." }, { status: 400 });
    }

    const results = {
      total: Math.min(productUrls.length, limit),
      processed: 0,
      created: 0,
      updated: 0,
      errors: 0,
      logs: [] as string[]
    };

    const urlsToProcess = productUrls.slice(0, limit);

    for (const url of urlsToProcess) {
      try {
        console.log(`Bulk Importing Fraterworks: ${url}`);
        const data = await parseFraterworksProduct(url);
        
        // Chiave primaria di ricerca: CAS o Slug
        const slug = url.split('/').pop() || data.name;
        const searchWhere = data.cas ? { cas: data.cas } : { id: 'slug-' + slug }; // Fallback se CAS manca (usiamo un ID fittizio o cerchiamo per nome?)
        
        // Cerchiamo prima se esiste per nome se CAS manca
        let existingMaterial = null;
        if (data.cas) {
          existingMaterial = await prisma.material.findUnique({ where: { cas: data.cas } });
        } else {
          existingMaterial = await prisma.material.findFirst({ where: { name: data.name } });
        }

        const materialData = {
          name: data.name,
          cas: data.cas,
          supplier: "Fraterworks",
          sourceUrl: data.sourceUrl,
          ifraSourceUrl: data.sourceUrl, // Usiamo questo come fallback se non c'è IFRA ufficiale
          referenceCode: data.referenceCode,
          appearance: data.appearance,
          odourProfile: data.odourProfile,
          longevity: data.longevity,
          uses: data.uses,
          unNumber: data.unNumber,
          synonyms: data.collection, // Usiamo collection come sinonimo/nota
          ifraStatus: existingMaterial?.ifraStatus || "to_verify"
        };

        let material;
        if (existingMaterial) {
          material = await prisma.material.update({
            where: { id: existingMaterial.id },
            data: materialData
          });
          results.updated++;
        } else {
          material = await prisma.material.create({
            data: materialData
          });
          results.created++;
        }

        // Gestione Documenti
        if (data.documents && data.documents.length > 0) {
          for (const doc of data.documents) {
            await prisma.document.upsert({
              where: { id: `doc-${material.id}-${doc.type}` }, // ID deterministico per evitare duplicati
              update: { url: doc.url, name: doc.name },
              create: {
                id: `doc-${material.id}-${doc.type}`,
                materialId: material.id,
                type: doc.type,
                url: doc.url,
                name: doc.name
              }
            });
          }
        }

        // Gestione Limiti IFRA Fraterworks
        // 1. Cancella vecchi limiti Fraterworks per questo materiale
        await prisma.ifraLimit.deleteMany({
          where: {
            materialId: material.id,
            source: "Fraterworks"
          }
        });

        // 2. Salva nuovi limiti se presenti
        if (data.ifraLimits && data.ifraLimits.length > 0) {
          await prisma.ifraLimit.createMany({
            data: data.ifraLimits.map(l => ({
              materialId: material.id,
              amendment: l.amendment,
              category: l.category,
              limit: l.limitPercent,
              limitText: `${l.limitPercent}%`,
              context: l.context,
              source: "Fraterworks",
              sourceUrl: url
            }))
          });
        }

        results.processed++;
        results.logs.push(`SUCCESS: ${data.name} (${data.cas || 'No CAS'})`);

        // Delay 500ms
        await new Promise(r => setTimeout(r, 500));

      } catch (err: any) {
        console.error(`Error processing ${url}:`, err);
        results.errors++;
        results.logs.push(`ERROR: ${url} - ${err.message}`);
      }
    }

    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    console.error("FRATERWORKS BULK ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
