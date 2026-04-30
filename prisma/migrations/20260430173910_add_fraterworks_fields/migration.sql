/*
  Warnings:

  - Made the column `limit` on table `IfraLimit` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Material" ADD COLUMN "appearance" TEXT;
ALTER TABLE "Material" ADD COLUMN "longevity" TEXT;
ALTER TABLE "Material" ADD COLUMN "odourProfile" TEXT;
ALTER TABLE "Material" ADD COLUMN "referenceCode" TEXT;
ALTER TABLE "Material" ADD COLUMN "unNumber" TEXT;
ALTER TABLE "Material" ADD COLUMN "uses" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_IfraLimit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "materialId" TEXT NOT NULL,
    "amendment" TEXT,
    "category" TEXT NOT NULL,
    "limit" REAL NOT NULL,
    "context" TEXT,
    "isRestricted" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IfraLimit_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_IfraLimit" ("category", "id", "isRestricted", "limit", "materialId", "notes") SELECT "category", "id", "isRestricted", "limit", "materialId", "notes" FROM "IfraLimit";
DROP TABLE "IfraLimit";
ALTER TABLE "new_IfraLimit" RENAME TO "IfraLimit";
CREATE UNIQUE INDEX "IfraLimit_materialId_category_amendment_key" ON "IfraLimit"("materialId", "category", "amendment");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
