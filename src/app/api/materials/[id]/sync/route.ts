import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseFraterworksProduct } from '@/lib/import/fraterworks';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Recupera il materiale esistente
    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        ifraLimits: true,
        documents: true,
        variants: true
      }
    });

    if (!material) {
      return NextResponse.json({ error: "Materiale non trovato" }, { status: 404 });
    }

    if (!material.sourceUrl || !material.sourceUrl.includes('fraterworks.com')) {
      return NextResponse.json({ error: "Sincronizzazione supportata solo per Fraterworks" }, { status: 400 });
    }

    console.log(`SYNCING MATERIAL: ${material.name} (${id})`);

    // 2. Parsa nuovamente il prodotto
    const freshData = await parseFraterworksProduct(material.sourceUrl);

    // 3. Aggiornamento atomico del materiale
    await prisma.$transaction(async (tx) => {
      // Aggiorna campi base
      await tx.material.update({
        where: { id },
        data: {
          cas: freshData.cas || material.cas,
          referenceCode: freshData.referenceCode,
          unNumber: freshData.unNumber,
          appearance: freshData.appearance,
          appearanceIt: freshData.appearanceIt,
          odourProfile: freshData.odourProfile,
          odourProfileIt: freshData.odourProfileIt,
          uses: freshData.uses,
          usesIt: freshData.usesIt,
          ifraStatus: freshData.ifraLimits.length > 0 ? "found" : "not_found",
          updatedAt: new Date()
        }
      });

      // Sincronizza Limiti IFRA (Fonte Fraterworks)
      // Rimuoviamo quelli vecchi di Fraterworks e mettiamo i nuovi
      await tx.ifraLimit.deleteMany({
        where: { materialId: id, source: "Fraterworks" }
      });

      if (freshData.ifraLimits.length > 0) {
        await tx.ifraLimit.createMany({
          data: freshData.ifraLimits.map(l => ({
            materialId: id,
            category: l.category,
            limit: l.limitPercent,
            amendment: l.amendment,
            source: "Fraterworks",
            isNoRestriction: l.limitPercent >= 100
          }))
        });
      }

      // Sincronizza Documenti (Fonte Fraterworks)
      await tx.document.deleteMany({
        where: { materialId: id, type: { notIn: ["MANUAL"] } } // Non cancelliamo documenti caricati manualmente
      });

      if (freshData.documents.length > 0) {
        await tx.document.createMany({
          data: freshData.documents.map(d => ({
            materialId: id,
            type: d.type,
            name: d.name,
            url: d.url
          }))
        });
      }

      // Sincronizza Varianti e Prezzi
      await tx.materialVariant.deleteMany({
        where: { materialId: id }
      });

      if (freshData.variants.length > 0) {
        await tx.materialVariant.createMany({
          data: freshData.variants.map(v => ({
            materialId: id,
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
    });

    return NextResponse.json({ 
      success: true, 
      message: "Sincronizzazione completata",
      updates: {
        ifraCount: freshData.ifraLimits.length,
        docCount: freshData.documents.length,
        variantCount: freshData.variants.length
      }
    });

  } catch (error: any) {
    console.error("SYNC ERROR:", error);
    return NextResponse.json({ error: error.message || "Errore durante il sync" }, { status: 500 });
  }
}
