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

    // 2. Importazione con il URL pulito
    const data = await importFromFraterworks(cleanUrl);
    
    // 2b. Traduzione Automatica (parallela per efficienza)
    const [appearanceIt, odourProfileIt, usesIt, descriptionIt] = await Promise.all([
      translateToItalian(data.appearance),
      translateToItalian(data.odourProfile),
      translateToItalian(data.uses),
      translateToItalian(data.description)
    ]);

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
            context: limit.context,
            isRestricted: true,
          })),
        },
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
            context: limit.context,
            isRestricted: true,
          })),
        },
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
