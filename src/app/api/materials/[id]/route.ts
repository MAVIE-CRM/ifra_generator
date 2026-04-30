import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * DELETE /api/materials/[id]
 * Eliminazione sicura del materiale con controllo dipendenze.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // 1. Verifica se il materiale è usato in qualche fragranza
    const usageCount = await prisma.fragranceItem.count({
      where: { materialId: id }
    });

    if (usageCount > 0) {
      return NextResponse.json(
        { success: false, error: "Materiale usato in una o più fragranze. Rimuovilo prima dalle formule." },
        { status: 400 }
      );
    }

    // 2. Eliminazione (Prisma gestisce onDelete: Cascade per IfraLimit e Document se configurato, 
    // ma per sicurezza e chiarezza lo facciamo esplicito o ci affidiamo allo schema)
    await prisma.material.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Materiale eliminato correttamente." });
  } catch (error: any) {
    console.error('DELETE MATERIAL ERROR:', error);
    return NextResponse.json(
      { success: false, error: "Errore durante l'eliminazione del materiale." },
      { status: 500 }
    );
  }
}
