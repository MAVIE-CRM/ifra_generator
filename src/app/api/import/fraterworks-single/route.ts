import { NextRequest, NextResponse } from 'next/server';
import { parseFraterworksProduct } from '@/lib/import/fraterworks';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { url, skipExisting = false, updateExisting = true } = await request.json();

    if (!url) {
      return NextResponse.json({ success: false, error: "URL mancante." }, { status: 400 });
    }

    const cleanUrl = url.split('?')[0].split('#')[0];
    const slug = cleanUrl.split('/').pop() || '';

    if (!slug) {
      return NextResponse.json({ success: false, error: "Slug non valido." }, { status: 400 });
    }

    // 1. Controllo esistenza
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
        return NextResponse.json({ success: true, status: 'SKIPPED', message: "Già presente nel database" });
      }
      if (!updateExisting) {
        return NextResponse.json({ success: true, status: 'SKIPPED', message: "Aggiornamento non richiesto" });
      }
    }

    // 2. Scraping e Traduzione
    console.log(`IMPORTING SINGLE: ${cleanUrl}`);
    const data = await parseFraterworksProduct(cleanUrl);

    // 3. Preparazione dati
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
      ifraStatus: data.ifraLimits.length > 0 ? "found" : "not_found",
    };

    let material;
    let status = 'CREATED';

    if (existingMaterial) {
      material = await prisma.material.update({
        where: { id: existingMaterial.id },
        data: materialData
      });
      status = 'UPDATED';
    } else {
      // Controllo per CAS
      let materialByCas = null;
      if (data.cas) {
        materialByCas = await prisma.material.findUnique({ where: { cas: data.cas } });
      }

      if (materialByCas) {
        material = await prisma.material.update({
          where: { id: materialByCas.id },
          data: materialData
        });
        status = 'MERGED';
      } else {
        material = await prisma.material.create({
          data: materialData
        });
        status = 'CREATED';
      }
    }

    // 4. Sincronizzazione Documenti
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

    // 5. Sincronizzazione Limiti IFRA
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

    // 6. Sincronizzazione Varianti/Prezzi
    await prisma.materialVariant.deleteMany({
      where: { materialId: material.id }
    });

    if (data.variants && data.variants.length > 0) {
      await prisma.materialVariant.createMany({
        data: data.variants.map(v => ({
          materialId: material.id,
          variantId: v.variantId,
          title: v.title,
          option1: v.option1,
          option2: v.option2,
          option3: v.option3,
          price: v.price,
          currency: v.currency,
          available: v.available
        }))
      });
    }

    return NextResponse.json({ 
      success: true, 
      status, 
      name: data.name,
      ifraCount: data.ifraLimits.length,
      variantCount: data.variants.length
    });

  } catch (error: any) {
    console.error("SINGLE IMPORT ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
