import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseFraterworksProduct } from '@/lib/import/fraterworks';
import { translateToItalian } from '@/lib/translate';

/**
 * POST /api/materials/[id]/sync
 * Risincronizza un materiale con la sua fonte originale (Fraterworks).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // 1. Recupera il materiale dal DB
    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        ifraLimits: true,
        documents: true
      }
    });

    if (!material) {
      return NextResponse.json({ success: false, error: "Materiale non trovato." }, { status: 404 });
    }

    if (!material.sourceUrl) {
      return NextResponse.json({ success: false, error: "Nessun URL sorgente disponibile per la sincronizzazione." }, { status: 400 });
    }

    if (!material.sourceUrl.includes("fraterworks.com/products/")) {
      return NextResponse.json({ success: false, error: "Sync automatico disponibile solo per Fraterworks." }, { status: 400 });
    }

    // 2. Riesegui il parsing della pagina
    const newData = await parseFraterworksProduct(material.sourceUrl);

    // 3. Traduzione Automatica (parallela)
    const [appearanceIt, odourProfileIt, usesIt, descriptionIt] = await Promise.all([
      translateToItalian(newData.appearance),
      translateToItalian(newData.odourProfile),
      translateToItalian(newData.uses),
      translateToItalian(newData.description)
    ]);

    // 4. Aggiorna il materiale (conservando i vecchi valori se i nuovi sono null)
    await prisma.material.update({
      where: { id },
      data: {
        name: newData.name || material.name,
        cas: newData.cas || material.cas,
        referenceCode: newData.referenceCode || material.referenceCode,
        appearance: newData.appearance || material.appearance,
        appearanceIt: appearanceIt || material.appearanceIt,
        odourProfile: newData.odourProfile || material.odourProfile,
        odourProfileIt: odourProfileIt || material.odourProfileIt,
        uses: newData.uses || material.uses,
        usesIt: usesIt || material.usesIt,
        description: newData.description || material.description,
        descriptionIt: descriptionIt || material.descriptionIt,
        longevity: newData.longevity || material.longevity,
        unNumber: newData.unNumber || material.unNumber,
        ifraAmendment: newData.primaryIfraLimit?.amendment || material.ifraAmendment,
        
        // Pulisce e ricrea i limiti e i documenti per garantire coerenza con la fonte
        ifraLimits: {
          deleteMany: {},
          create: newData.ifraLimits.map(limit => ({
            amendment: limit.amendment,
            category: limit.category,
            limit: limit.limitPercent,
            context: limit.context,
            isRestricted: true,
          })),
        },
        documents: {
          deleteMany: {},
          create: newData.documents.map(doc => ({
            type: doc.type,
            url: doc.url,
            name: doc.name,
          })),
        }
      }
    });

    const updatedMaterial = await prisma.material.findUnique({
      where: { id },
      include: {
        ifraLimits: true,
        documents: true
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Materiale sincronizzato correttamente con Fraterworks.",
      material: updatedMaterial 
    });

  } catch (error: any) {
    console.error('SYNC MATERIAL ERROR:', error);
    return NextResponse.json(
      { success: false, error: error.message || "Errore durante la sincronizzazione." },
      { status: 500 }
    );
  }
}
