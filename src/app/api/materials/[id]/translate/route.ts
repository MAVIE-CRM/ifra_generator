import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { translateToItalian } from '@/lib/translate';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const materialId = params.id;
    
    // 1. Recupera il materiale
    const material = await prisma.material.findUnique({
      where: { id: materialId }
    });

    if (!material) {
      return NextResponse.json({ success: false, error: "Materiale non trovato" }, { status: 404 });
    }

    console.log(`FORCING RE-TRANSLATION FOR: ${material.name} (${material.id})`);

    // 2. Traduci i campi principali
    const [odourIt, usesIt, appearanceIt, descIt] = await Promise.all([
      translateToItalian(material.odourProfile),
      translateToItalian(material.uses),
      translateToItalian(material.appearance),
      translateToItalian(material.description)
    ]);

    // 3. Salva solo se abbiamo ottenuto traduzioni valide (non null)
    // Se la traduzione fallisce (null), manteniamo quello che c'è (o null)
    const updateData: any = {};
    if (odourIt) updateData.odourProfileIt = odourIt;
    if (usesIt) updateData.usesIt = usesIt;
    if (appearanceIt) updateData.appearanceIt = appearanceIt;
    if (descIt) updateData.descriptionIt = descIt;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: "Servizi di traduzione non disponibili o testo identico. Riprova più tardi." 
      });
    }

    const updatedMaterial = await prisma.material.update({
      where: { id: materialId },
      data: updateData
    });

    return NextResponse.json({ 
      success: true, 
      material: updatedMaterial,
      translatedFields: Object.keys(updateData)
    });

  } catch (error: any) {
    console.error("RE-TRANSLATE ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
