-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cas" TEXT,
    "description" TEXT,
    "descriptionIt" TEXT,
    "notes" TEXT,
    "sourceUrl" TEXT,
    "supplier" TEXT,
    "synonyms" TEXT,
    "recommendation" TEXT,
    "referenceCode" TEXT,
    "appearance" TEXT,
    "appearanceIt" TEXT,
    "odourProfile" TEXT,
    "odourProfileIt" TEXT,
    "longevity" TEXT,
    "uses" TEXT,
    "usesIt" TEXT,
    "unNumber" TEXT,
    "fraterworksSlug" TEXT,
    "ifraAmendment" TEXT,
    "ifraStatus" TEXT,
    "ifraLastCheckedAt" TIMESTAMP(3),
    "ifraSourceUrl" TEXT,
    "ifraNotes" TEXT,
    "ifraStandardTitle" TEXT,
    "ifraStandardType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IfraLimit" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "amendment" TEXT,
    "category" TEXT NOT NULL,
    "limit" DOUBLE PRECISION,
    "limitText" TEXT,
    "isNoRestriction" BOOLEAN NOT NULL DEFAULT false,
    "context" TEXT,
    "isRestricted" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "sourceUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IfraLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fragrance" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fragrance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FragranceItem" (
    "id" TEXT NOT NULL,
    "fragranceId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "parts" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "FragranceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Material_cas_key" ON "Material"("cas");

-- CreateIndex
CREATE UNIQUE INDEX "Material_fraterworksSlug_key" ON "Material"("fraterworksSlug");

-- CreateIndex
CREATE UNIQUE INDEX "IfraLimit_materialId_category_amendment_source_key" ON "IfraLimit"("materialId", "category", "amendment", "source");

-- AddForeignKey
ALTER TABLE "IfraLimit" ADD CONSTRAINT "IfraLimit_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FragranceItem" ADD CONSTRAINT "FragranceItem_fragranceId_fkey" FOREIGN KEY ("fragranceId") REFERENCES "Fragrance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FragranceItem" ADD CONSTRAINT "FragranceItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
