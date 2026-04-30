-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "cas" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "sourceUrl" TEXT,
    "supplier" TEXT,
    "ifraStatus" TEXT,
    "ifraLastCheckedAt" DATETIME,
    "ifraSourceUrl" TEXT,
    "ifraNotes" TEXT,
    "ifraStandardTitle" TEXT,
    "ifraAmendment" TEXT,
    "ifraStandardType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "IfraLimit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "materialId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "limit" REAL,
    "isRestricted" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    CONSTRAINT "IfraLimit_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "materialId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Fragrance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FragranceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fragranceId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "parts" REAL NOT NULL,
    CONSTRAINT "FragranceItem_fragranceId_fkey" FOREIGN KEY ("fragranceId") REFERENCES "Fragrance" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FragranceItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Material_cas_key" ON "Material"("cas");

-- CreateIndex
CREATE UNIQUE INDEX "IfraLimit_materialId_category_key" ON "IfraLimit"("materialId", "category");
