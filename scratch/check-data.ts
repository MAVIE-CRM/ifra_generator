import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  const materials = await prisma.material.findMany({
    take: 10,
    select: { name: true, collection: true }
  });
  console.log('SAMPLE MATERIALS:', JSON.stringify(materials, null, 2));
  await prisma.$disconnect();
}

checkData();
