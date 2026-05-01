import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { prisma } from '@/lib/prisma';

// Funzione utility per costruire l'URL corretto della pagina senza conflitti di query string
function buildCollectionPageUrl(collectionUrl: string, page: number) {
  const url = new URL(collectionUrl);
  url.search = ""; 
  url.searchParams.set("page", String(page));
  return url.toString();
}

export async function POST(request: Request) {
  try {
    const { collectionUrl, pageFrom = 1, pageTo = 1, maxProducts } = await request.json();

    // LOG DI AVVIO RIGOROSO
    console.log("-----------------------------------------");
    console.log("PAGE RANGE START:", pageFrom);
    console.log("PAGE RANGE END:", pageTo);
    console.log("-----------------------------------------");

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
      pageFrom,
      pageTo,
      pagesScanned: 0,
      totalFound: 0,
      uniqueFound: 0,
      duplicatesInScan: 0,
      alreadyInDatabase: 0,
      newProducts: 0
    };

    // CICLO RIGIDO: NON ESCIRA' MAI DAL RANGE [pageFrom -> pageTo]
    for (let page = pageFrom; page <= pageTo; page++) {
      const pageUrl = buildCollectionPageUrl(collectionUrl, page);
      console.log("SCANNING PAGE:", pageUrl);

      const response = await fetch(pageUrl, {
        headers: { 'User-Agent': 'IFRA_GENERATOR/1.0' },
        cache: 'no-store'
      });

      if (!response.ok) {
        console.warn(`STOP: Page ${page} returned status ${response.status}`);
        break; 
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      summary.pagesScanned++;

      const links = $('a[href*="/products/"]');
      const foundOnThisPage = [];
      
      for (const el of links.toArray()) {
        const href = $(el).attr('href');
        const title = $(el).text().trim() || $(el).find('img').attr('alt')?.trim() || "Prodotto senza titolo";
        
        if (href) {
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

          const product = {
            title,
            url: cleanUrl,
            slug,
            existsInDatabase: !!existingInDb,
            existingMaterialId: existingInDb?.id || null
          };

          allProducts.push(product);
          foundOnThisPage.push(product);

          if (maxProducts && allProducts.length >= maxProducts) {
            console.log("MAX PRODUCTS REACHED. STOPPING SCAN.");
            break;
          }
        }
      }

      console.log(`PAGE ${page} COMPLETED. PRODUCTS FOUND:`, foundOnThisPage.length);

      if (maxProducts && allProducts.length >= maxProducts) break;
    }

    console.log("-----------------------------------------");
    console.log("TOTAL UNIQUE PRODUCTS ACROSS RANGE:", allProducts.length);
    console.log("SCAN SUMMARY:", summary);
    console.log("-----------------------------------------");

    return NextResponse.json({ 
      success: true, 
      products: allProducts,
      summary
    });

  } catch (error: any) {
    console.error("FRATERWORKS SCAN SYSTEM ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
