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

    console.log("-----------------------------------------");
    console.log("PAGE RANGE START:", pageFrom);
    console.log("PAGE RANGE END:", pageTo);

    if (!collectionUrl || !collectionUrl.includes('fraterworks.com/collections/')) {
      return NextResponse.json({ success: false, error: "URL non valido. Inserire una collection Fraterworks." }, { status: 400 });
    }

    const baseUrl = "https://fraterworks.com";
    const allProducts: any[] = [];
    const globalSeenSlugs = new Set<string>();

    const summary = {
      pageFrom,
      pageTo,
      pagesScanned: 0,
      totalRawFound: 0,
      totalUniqueAcrossPages: 0,
      alreadyInDatabase: 0
    };

    for (let page = pageFrom; page <= pageTo; page++) {
      const pageUrl = buildCollectionPageUrl(collectionUrl, page);
      console.log("SCANNING PAGE:", pageUrl);

      const response = await fetch(pageUrl, {
        headers: { 'User-Agent': 'IFRA_GENERATOR/1.0' },
        cache: 'no-store',
        redirect: 'manual' // Evitiamo redirect automatici strani
      });

      if (!response.ok && response.status !== 301 && response.status !== 302) {
        console.warn(`STOP: Page ${page} returned status ${response.status}`);
        break; 
      }

      const html = await response.text();
      console.log("PAGE HTML LENGTH:", html.length);
      
      const $ = cheerio.load(html);
      summary.pagesScanned++;

      // REGOLA ASSOLUTA: Cerchiamo i prodotti solo nell'area principale (MAIN)
      // Escludiamo header, footer e sezioni di raccomandazione
      const mainContent = $('main, #MainContent, .main-content').first();
      const searchArea = mainContent.length > 0 ? mainContent : $('body');
      
      // Selettore specifico per i prodotti nella griglia
      const rawProductLinks = searchArea.find('a[href^="/products/"]')
        .map((_, el) => $(el).attr('href'))
        .get()
        .filter(href => href && href.includes('/products/'));

      console.log("RAW LINKS FOUND:", rawProductLinks.length);

      // DEDUPLICA FORTE PER PAGINA
      const uniqueLinksInPage = [...new Set(rawProductLinks.map(link => {
        const url = new URL(link, baseUrl);
        return url.origin + url.pathname;
      }))];

      console.log("UNIQUE LINKS IN PAGE:", uniqueLinksInPage.length);
      summary.totalRawFound += rawProductLinks.length;

      // ELABORAZIONE PRODOTTI
      for (const cleanUrl of uniqueLinksInPage) {
        const slug = cleanUrl.split('/').pop() || '';
        
        if (!slug || globalSeenSlugs.has(slug)) continue;
        globalSeenSlugs.add(slug);

        // Controllo Database
        const existingInDb = await prisma.material.findFirst({
          where: {
            OR: [
              { sourceUrl: cleanUrl },
              { fraterworksSlug: slug }
            ]
          },
          select: { id: true, name: true }
        });

        if (existingInDb) summary.alreadyInDatabase++;

        // Titolo (cerchiamo di prenderlo dal testo del link o attributi se possibile, altrimenti fallback)
        const productData = {
          title: slug.replace(/-/g, ' ').toUpperCase(),
          url: cleanUrl,
          slug,
          existsInDatabase: !!existingInDb,
          existingMaterialId: existingInDb?.id || null
        };

        allProducts.push(productData);

        if (maxProducts && allProducts.length >= maxProducts) break;
      }

      if (maxProducts && allProducts.length >= maxProducts) break;
    }

    summary.totalUniqueAcrossPages = allProducts.length;

    console.log("-----------------------------------------");
    console.log("TOTAL REAL PRODUCTS EXTRACTED:", allProducts.length);
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
