import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { collectionUrl, pageFrom = 1, pageTo = 1, maxProducts } = await request.json();

    console.log("PAGE RANGE:", pageFrom, pageTo);

    if (!collectionUrl || !collectionUrl.includes('fraterworks.com/collections/')) {
      return NextResponse.json({ success: false, error: "URL non valido. Inserire una collection Fraterworks." }, { status: 400 });
    }

    if (pageFrom < 1 || pageTo < pageFrom) {
      return NextResponse.json({ success: false, error: "Range pagine non valido." }, { status: 400 });
    }

    const baseUrl = new URL(collectionUrl).origin;
    const allProducts: any[] = [];
    const seenSlugs = new Set<string>();

    const summary = {
      pagesScanned: 0,
      totalFound: 0,
      uniqueFound: 0,
      duplicatesInScan: 0,
      alreadyInDatabase: 0,
      newProducts: 0
    };

    for (let page = pageFrom; page <= pageTo; page++) {
      const pageUrl = `${collectionUrl.split('?')[0]}?page=${page}`;
      console.log("SCANNING PAGE:", pageUrl);

      const response = await fetch(pageUrl, {
        headers: { 'User-Agent': 'IFRA_GENERATOR/1.0' }
      });

      if (!response.ok) break;

      const html = await response.text();
      const $ = cheerio.load(html);
      summary.pagesScanned++;

      const links = $('a[href*="/products/"]');
      
      for (const el of links.toArray()) {
        const href = $(el).attr('href');
        const title = $(el).text().trim() || $(el).find('img').attr('alt')?.trim() || "Prodotto senza titolo";
        
        if (href) {
          // Normalizzazione URL: rimuovi parametri query
          const absoluteUrl = href.startsWith('http') ? href : `${baseUrl}${href.split('?')[0]}`;
          const cleanUrl = absoluteUrl.split('?')[0].split('#')[0];
          const slug = cleanUrl.split('/').pop() || '';

          if (!slug || !cleanUrl.includes('/products/')) continue;

          summary.totalFound++;

          if (seenSlugs.has(slug)) {
            summary.duplicatesInScan++;
            continue;
          }

          seenSlugs.add(slug);
          summary.uniqueFound++;

          // Controllo duplicati nel Database
          const existingInDb = await prisma.material.findFirst({
            where: {
              OR: [
                { sourceUrl: cleanUrl },
                { fraterworksSlug: slug }
              ]
            },
            select: { id: true, name: true }
          });

          if (existingInDb) {
            summary.alreadyInDatabase++;
          } else {
            summary.newProducts++;
          }

          allProducts.push({
            title,
            url: cleanUrl,
            slug,
            existsInDatabase: !!existingInDb,
            existingMaterialId: existingInDb?.id || null
          });

          console.log("PRODUCT FOUND:", cleanUrl, existingInDb ? "(IN DB)" : "(NEW)");
          
          if (maxProducts && allProducts.length >= maxProducts) break;
        }
      }

      if (maxProducts && allProducts.length >= maxProducts) break;
    }

    console.log("IMPORT SUMMARY:", summary);

    return NextResponse.json({ 
      success: true, 
      products: allProducts,
      summary
    });

  } catch (error: any) {
    console.error("FRATERWORKS SCAN ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
