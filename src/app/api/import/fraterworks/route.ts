import { NextResponse } from 'next/server';
import { importFromFraterworks } from '@/lib/import/fraterworks';
import { prisma } from '@/lib/prisma';
import { syncMaterialWithIfra } from '@/lib/import/ifraLibrary';
import { normalizeOptionalUrl } from '@/lib/normalizeUrl';
import { translateToItalian } from '@/lib/translate';

export async function POST(request: Request) {
  let rawUrl = '';
  try {
    const body = await request.json();
    rawUrl = body.url;
    const previewOnly = body.previewOnly;

    console.log("RAW URL:", rawUrl);

    // 1. Normalizzazione Sicura
    const cleanUrl = normalizeOptionalUrl(rawUrl);
    
    if (!cleanUrl || !cleanUrl.includes("fraterworks.com/products/")) {
      return NextResponse.json(
        { success: false, error: "URL Fraterworks non valido. Incolla un link prodotto completo." },
        { status: 400 }
      );
    }

    // 2. Importazione (il parser gestisce già la traduzione internamente)
    const data = await importFromFraterworks(cleanUrl);
    
    const odourProfileIt = data.odourProfileIt && data.odourProfileIt.trim().toLowerCase() !== data.odourProfile?.trim().toLowerCase() ? data.odourProfileIt : null;
    const usesIt = data.usesIt && data.usesIt.trim().toLowerCase() !== data.uses?.trim().toLowerCase() ? data.usesIt : null;
    const appearanceIt = data.appearanceIt && data.appearanceIt.trim().toLowerCase() !== data.appearance?.trim().toLowerCase() ? data.appearanceIt : null;
    const descriptionIt = data.descriptionIt && data.descriptionIt.trim().toLowerCase() !== data.description?.trim().toLowerCase() ? data.descriptionIt : null;

    if (previewOnly) {
      return NextResponse.json({ 
        success: true, 
        preview: { 
          ...data, 
          appearanceIt, 
          odourProfileIt, 
          usesIt,
          descriptionIt
        } 
      });
    }
    
    // 3. Upsert Material
    const materialId = data.cas || 'fw-' + data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Determiniamo lo stato IFRA: se abbiamo limiti (anche "No Restriction") lo stato è "found"
    const hasIfraData = data.ifraLimits && data.ifraLimits.length > 0;
    const ifraStatus = hasIfraData ? "found" : "not_found";

    const material = await prisma.material.upsert({
      where: { cas: data.cas ? data.cas : materialId },
      update: {
        name: data.name,
        description: data.description,
        descriptionIt: descriptionIt,
        sourceUrl: data.sourceUrl,
        supplier: data.supplier,
        referenceCode: data.referenceCode,
        appearance: data.appearance,
        appearanceIt: appearanceIt,
        odourProfile: data.odourProfile,
        odourProfileIt: odourProfileIt,
        longevity: data.longevity,
        uses: data.uses,
        usesIt: usesIt,
        unNumber: data.unNumber,
        ifraAmendment: data.primaryIfraLimit?.amendment,
        ifraStatus: ifraStatus,
        documents: {
          deleteMany: {},
          create: data.documents.map(doc => ({
            type: doc.type,
            url: doc.url,
            name: doc.name,
          })),
        },
        ifraLimits: {
          deleteMany: {},
          create: data.ifraLimits.map(limit => ({
            amendment: limit.amendment,
            category: limit.category,
            limit: limit.limitPercent,
            limitText: (limit as any).isNoRestriction ? "No Limit" : `${limit.limitPercent}%`,
            isNoRestriction: (limit as any).isNoRestriction || false,
            context: limit.context,
            isRestricted: !(limit as any).isNoRestriction,
          })),
        },
        variants: {
          deleteMany: {},
          create: data.variants.map(v => ({
            variantId: v.variantId,
            title: v.title,
            option1: v.option1,
            option2: v.option2,
            option3: v.option3,
            price: v.price,
            currency: v.currency,
            available: v.available
          }))
        }
      },
      create: {
        name: data.name,
        cas: data.cas,
        description: data.description,
        descriptionIt: descriptionIt,
        sourceUrl: data.sourceUrl,
        supplier: data.supplier,
        referenceCode: data.referenceCode,
        appearance: data.appearance,
        appearanceIt: appearanceIt,
        odourProfile: data.odourProfile,
        odourProfileIt: odourProfileIt,
        longevity: data.longevity,
        uses: data.uses,
        usesIt: usesIt,
        unNumber: data.unNumber,
        ifraAmendment: data.primaryIfraLimit?.amendment,
        ifraStatus: data.ifraLimits.length > 0 ? "found" : "not_found",
        documents: {
          create: data.documents.map(doc => ({
            type: doc.type,
            url: doc.url,
            name: doc.name,
          })),
        },
        ifraLimits: {
          create: data.ifraLimits.map(limit => ({
            amendment: limit.amendment,
            category: limit.category,
            limit: limit.limitPercent,
            limitText: (limit as any).isNoRestriction ? "No Limit" : `${limit.limitPercent}%`,
            isNoRestriction: (limit as any).isNoRestriction || false,
            context: limit.context,
            isRestricted: !(limit as any).isNoRestriction,
          })),
        },
        variants: {
          create: data.variants.map(v => ({
            variantId: v.variantId,
            title: v.title,
            option1: v.option1,
            option2: v.option2,
            option3: v.option3,
            price: v.price,
            currency: v.currency,
            available: v.available
          }))
        }
      },
    });

    if (data.ifraLimits.length === 0) {
      try {
        await syncMaterialWithIfra(material.id);
      } catch (ifraError) {
        console.error('Auto-IFRA Sync failed:', ifraError);
      }
    }

    return NextResponse.json({ success: true, material });
  } catch (error: any) {
    console.error('FRATERWORKS ROUTE EXCEPTION:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
