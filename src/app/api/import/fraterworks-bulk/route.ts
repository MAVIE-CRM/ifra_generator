import { NextResponse } from 'next/server';
import { parseFraterworksProduct } from '@/lib/import/fraterworks';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { productUrls, skipExisting = false, updateExisting = true } = await request.json();

    if (!productUrls || !Array.isArray(productUrls)) {
      return NextResponse.json({ success: false, error: "Lista URL non valida." }, { status: 400 });
    }

    const results = {
      total: productUrls.length,
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      logs: [] as string[]
    };

    for (const url of productUrls) {
      try {
        const cleanUrl = url.split('?')[0].split('#')[0];
        const slug = cleanUrl.split('/').pop() || '';

        // 1. Controllo se esiste già nel DB
        const existingMaterial = await prisma.material.findFirst({
          where: {
            OR: [
              { sourceUrl: cleanUrl },
              { fraterworksSlug: slug }
            ]
          }
        });

        if (existingMaterial) {
          if (skipExisting) {
            results.skipped++;
            results.processed++;
            results.logs.push(`SKIPPED: ${slug} (Già presente)`);
            continue;
          }
          if (!updateExisting) {
            results.skipped++;
            results.processed++;
            results.logs.push(`SKIPPED: ${slug} (Aggiornamento disattivato)`);
            continue;
          }
        }

        console.log(`Processing Fraterworks Product: ${cleanUrl}`);
        const data = await parseFraterworksProduct(cleanUrl);
        
        const materialData: any = {
          name: data.name,
          cas: data.cas,
          supplier: "Fraterworks",
          sourceUrl: cleanUrl,
          fraterworksSlug: slug,
          referenceCode: data.referenceCode,
          appearance: data.appearance,
          odourProfile: data.odourProfile,
          longevity: data.longevity,
          uses: data.uses,
          unNumber: data.unNumber,
          synonyms: data.collection,
        };

        let material;
        if (existingMaterial) {
          material = await prisma.material.update({
            where: { id: existingMaterial.id },
            data: materialData
          });
          results.updated++;
        } else {
          // Se non esiste ancora per slug/url, controlla per CAS come ultima spiaggia
          let materialByCas = null;
          if (data.cas) {
            materialByCas = await prisma.material.findUnique({ where: { cas: data.cas } });
          }

          if (materialByCas) {
            material = await prisma.material.update({
              where: { id: materialByCas.id },
              data: materialData
            });
            results.updated++;
          } else {
            material = await prisma.material.create({
              data: materialData
            });
            results.created++;
          }
        }

        // Gestione Documenti (Deduplica per materiale e tipo)
        if (data.documents && data.documents.length > 0) {
          for (const doc of data.documents) {
            await prisma.document.upsert({
              where: { id: `doc-${material.id}-${doc.type}` },
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
        // 1. Cancella SOLO limiti Fraterworks vecchi
        await prisma.ifraLimit.deleteMany({
          where: {
            materialId: material.id,
            source: "Fraterworks"
          }
        });

        // 2. Salva nuovi limiti Fraterworks
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
              sourceUrl: cleanUrl
            }))
          });
        }

        results.processed++;
        results.logs.push(`SUCCESS: ${data.name} (${existingMaterial ? 'Aggiornato' : 'Creato'})`);

        // Delay 500ms
        await new Promise(r => setTimeout(r, 500));

      } catch (err: any) {
        console.error(`Error processing ${url}:`, err);
        results.errors++;
        results.logs.push(`ERROR: ${url} - ${err.message}`);
      }
    }

    console.log("IMPORT SUMMARY:", results);

    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    console.error("FRATERWORKS BULK ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
