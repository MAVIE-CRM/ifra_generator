-- AlterTable
ALTER TABLE "Material" ADD COLUMN "recommendation" TEXT;
ALTER TABLE "Material" ADD COLUMN "synonyms" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_IfraLimit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "materialId" TEXT NOT NULL,
    "amendment" TEXT,
    "category" TEXT NOT NULL,
    "limit" REAL,
    "limitText" TEXT,
    "isNoRestriction" BOOLEAN NOT NULL DEFAULT false,
    "context" TEXT,
    "isRestricted" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "sourceUrl" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IfraLimit_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_IfraLimit" ("amendment", "category", "context", "createdAt", "id", "isRestricted", "limit", "materialId", "notes") SELECT "amendment", "category", "context", "createdAt", "id", "isRestricted", "limit", "materialId", "notes" FROM "IfraLimit";
DROP TABLE "IfraLimit";
ALTER TABLE "new_IfraLimit" RENAME TO "IfraLimit";
CREATE UNIQUE INDEX "IfraLimit_materialId_category_amendment_source_key" ON "IfraLimit"("materialId", "category", "amendment", "source");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
