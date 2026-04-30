/*
  Warnings:

  - A unique constraint covering the columns `[fraterworksSlug]` on the table `Material` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Material" ADD COLUMN "fraterworksSlug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Material_fraterworksSlug_key" ON "Material"("fraterworksSlug");
