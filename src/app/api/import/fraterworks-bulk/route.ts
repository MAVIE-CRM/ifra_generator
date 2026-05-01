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

    console.log(`STARTING BULK IMPORT: ${productUrls.length} items`);

    for (const url of productUrls) {
      try {
        // Normalizzazione rigorosa
        const cleanUrl = url.split('?')[0].split('#')[0];
        const slug = cleanUrl.split('/').pop() || '';

        if (!slug) throw new Error("Slug non valido");

        // 1. Controllo duplicati (Slug o URL)
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
            results.logs.push(`SKIPPED: ${slug} (Già presente nel database)`);
            continue;
          }
          if (!updateExisting) {
            results.skipped++;
            results.processed++;
            results.logs.push(`SKIPPED: ${slug} (Aggiornamento non richiesto)`);
            continue;
          }
        }

        console.log(`SCRAPING & TRANSLATING: ${cleanUrl}`);
        const data = await parseFraterworksProduct(cleanUrl);
        
        const materialData: any = {
          name: data.name,
          cas: data.cas,
          supplier: "Fraterworks",
          sourceUrl: cleanUrl,
          fraterworksSlug: slug,
          referenceCode: data.referenceCode,
          appearance: data.appearance,
          appearanceIt: data.appearanceIt,
          odourProfile: data.odourProfile,
          odourProfileIt: data.odourProfileIt,
          longevity: data.longevity,
          uses: data.uses,
          usesIt: data.usesIt,
          unNumber: data.unNumber,
          synonyms: data.collection,
          description: data.description,
          descriptionIt: data.descriptionIt,
        };

        let material;
        if (existingMaterial) {
          material = await prisma.material.update({
            where: { id: existingMaterial.id },
            data: materialData
          });
          results.updated++;
          results.logs.push(`UPDATED: ${data.name}`);
        } else {
          // Ultimo controllo per CAS prima di creare (per evitare duplicati di sostanze uguali da fonti diverse)
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
            results.logs.push(`MERGED: ${data.name} (Trovato per CAS)`);
          } else {
            material = await prisma.material.create({
              data: materialData
            });
            results.created++;
            results.logs.push(`CREATED: ${data.name}`);
          }
        }

        // Sincronizzazione Documenti
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

        // Sincronizzazione Limiti IFRA
        await prisma.ifraLimit.deleteMany({
          where: { materialId: material.id, source: "Fraterworks" }
        });

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

        // Delay per evitare rate-limiting e saturazione
        await new Promise(r => setTimeout(r, 400));

      } catch (err: any) {
        console.error(`FAILED ${url}:`, err.message);
        results.errors++;
        results.logs.push(`ERROR: ${url} -> ${err.message}`);
        results.processed++;
      }
    }

    console.log("BULK IMPORT COMPLETED", results);

    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    console.error("FRATERWORKS BULK SYSTEM ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
