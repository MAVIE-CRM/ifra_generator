import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const fragrance = await prisma.fragrance.findUnique({
      where: { id },
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
    });

    if (!fragrance) {
      return NextResponse.json({ error: 'Fragrance not found' }, { status: 404 });
    }

    return NextResponse.json(fragrance);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch fragrance' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, items } = body;

    // Update atoms logic: delete old items and create new ones
    const fragrance = await prisma.fragrance.update({
      where: { id },
      data: {
        name,
        description,
        items: {
          deleteMany: {},
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
    console.error("Update error:", error);
    return NextResponse.json({ error: 'Failed to update fragrance' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.fragrance.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete fragrance' }, { status: 500 });
  }
}
