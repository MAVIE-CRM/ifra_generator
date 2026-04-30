import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const fragrances = await prisma.fragrance.findMany({
      include: {
        items: {
          include: {
            material: {
              include: {
                ifraLimits: true,
              }
            }
          }
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json(fragrances);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch fragrances' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, items } = body;

    const fragrance = await prisma.fragrance.create({
      data: {
        name,
        description,
        items: {
          create: items.map((item: any) => ({
            materialId: item.materialId,
            parts: item.parts,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json(fragrance);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create fragrance' }, { status: 500 });
  }
}
