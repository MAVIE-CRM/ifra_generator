import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE() {
  try {
    // Cancellazione a cascata di tutti i materiali
    // Nota: i limiti e i documenti dovrebbero essere cancellati via onDelete: Cascade nel database
    // Ma per sicurezza e su SQLite/alcuni setup Prisma, meglio essere espliciti se necessario
    
    await prisma.material.deleteMany({});
    
    return NextResponse.json({ 
      success: true, 
      message: "Tutti i materiali sono stati eliminati correttamente." 
    });
  } catch (error: any) {
    console.error("CLEAR LIBRARY ERROR:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
