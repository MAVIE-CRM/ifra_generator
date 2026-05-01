import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeOptionalUrl } from '@/lib/normalizeUrl';

export async function GET() {
  try {
    const materials = await prisma.material.findMany({
      include: {
        ifraLimits: {
          orderBy: [
            { amendment: 'desc' },
            { category: 'asc' }
          ]
        },
        documents: true,
        variants: true,
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(materials);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      name, 
      cas, 
      description, 
      notes, 
      supplier, 
      sourceUrl, 
      ifraLimits, 
      documents 
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Il nome del materiale è obbligatorio' }, { status: 400 });
    }

    // Normalizzazione sicura degli URL nel backend
    const cleanSourceUrl = normalizeOptionalUrl(sourceUrl);
    const cleanDocuments = (documents || []).map((doc: any) => ({
      ...doc,
      url: normalizeOptionalUrl(doc.url) || doc.url
    })).filter((doc: any) => doc.url);

    const material = await prisma.material.create({
      data: {
        name: name.trim(),
        cas: cas ? cas.trim() : null,
        description,
        notes,
        supplier,
        sourceUrl: cleanSourceUrl,
        ifraLimits: {
          create: ifraLimits || [],
        },
        documents: {
          create: cleanDocuments,
        },
      },
      include: {
        ifraLimits: true,
        documents: true,
      }
    });

    return NextResponse.json(material);
  } catch (error: any) {
    console.error('Material POST Error:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Questo numero CAS esiste già nel database' }, { status: 400 });
    }

    return NextResponse.json(
      { error: error.message || 'Errore durante la creazione del materiale' }, 
      { status: 500 }
    );
  }
}
