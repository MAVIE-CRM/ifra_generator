import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function addColumns() {
    try {
        console.log('Adding columns via raw SQL...');
        await prisma.$executeRawUnsafe(`ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "collection" TEXT;`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "tags" TEXT[];`);
        console.log('Columns added successfully.');
    }
    catch (err) {
        console.error('Error adding columns:', err);
    }
    finally {
        await prisma.$disconnect();
    }
}
addColumns();
