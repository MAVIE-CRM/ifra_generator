import { PrismaClient } from '@prisma/client';
import { parseFraterworksProduct } from './src/lib/import/fraterworks';

const prisma = new PrismaClient();

async function bulkSync() {
  console.log('--- START BULK SYNC ---');
  const materials = await prisma.material.findMany({
    where: {
      sourceUrl: {
        contains: 'fraterworks.com'
      }
    }
  });

  console.log(`Found ${materials.length} materials to sync.`);

  for (const m of materials) {
    try {
      console.log(`Syncing: ${m.name}...`);
      const freshData = await parseFraterworksProduct(m.sourceUrl!);
      
      const odourProfileIt = freshData.odourProfileIt && freshData.odourProfileIt.trim().toLowerCase() !== freshData.odourProfile?.trim().toLowerCase() ? freshData.odourProfileIt : null;
      const usesIt = freshData.usesIt && freshData.usesIt.trim().toLowerCase() !== freshData.uses?.trim().toLowerCase() ? freshData.usesIt : null;
      const appearanceIt = freshData.appearanceIt && freshData.appearanceIt.trim().toLowerCase() !== freshData.appearance?.trim().toLowerCase() ? freshData.appearanceIt : null;

      await prisma.$transaction(async (tx) => {
        await tx.material.update({
          where: { id: m.id },
          data: {
            cas: freshData.cas || m.cas,
            referenceCode: freshData.referenceCode,
            unNumber: freshData.unNumber,
            appearance: freshData.appearance,
            appearanceIt: appearanceIt,
            odourProfile: freshData.odourProfile,
            odourProfileIt: odourProfileIt,
            uses: freshData.uses,
            usesIt: usesIt,
            collection: freshData.collection || m.collection,
            ifraStatus: (freshData.ifraLimits && freshData.ifraLimits.length > 0) ? "found" : "not_found",
            updatedAt: new Date()
          }
        });

        await tx.ifraLimit.deleteMany({ where: { materialId: m.id, source: "Fraterworks" } });
        if (freshData.ifraLimits.length > 0) {
          await tx.ifraLimit.createMany({
            data: freshData.ifraLimits.map(l => ({
              materialId: m.id,
              category: l.category,
              limit: l.limitPercent,
              limitText: (l as any).isNoRestriction ? "No Limit" : `${l.limitPercent}%`,
              amendment: l.amendment,
              source: "Fraterworks",
              isNoRestriction: (l as any).isNoRestriction || false,
              isRestricted: !(l as any).isNoRestriction,
              context: l.context
            }))
          });
        }

        await tx.materialVariant.deleteMany({ where: { materialId: m.id } });
        if (freshData.variants.length > 0) {
          await tx.materialVariant.createMany({
            data: freshData.variants.map(v => ({
              materialId: m.id,
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
      console.log(`Success: ${m.name}`);
    } catch (err) {
      console.error(`Error syncing ${m.name}:`, err);
    }
  }
  console.log('--- BULK SYNC COMPLETE ---');
}

bulkSync()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
