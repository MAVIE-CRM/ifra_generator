import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { normalizeOptionalUrl } from '@/lib/normalizeUrl';

export async function POST(request: Request) {
  try {
    const { collectionUrl, maxPages = 3 } = await request.json();

    if (!collectionUrl || !collectionUrl.includes('fraterworks.com/collections/')) {
      return NextResponse.json({ success: false, error: "URL non valido. Inserire una collection Fraterworks." }, { status: 400 });
    }

    const baseUrl = new URL(collectionUrl).origin;
    const allProducts: Array<{ title: string; url: string }> = [];
    const seenUrls = new Set<string>();

    for (let page = 1; page <= maxPages; page++) {
      const pageUrl = `${collectionUrl}${collectionUrl.includes('?') ? '&' : '?'}page=${page}`;
      console.log(`Scanning Fraterworks Collection Page ${page}: ${pageUrl}`);

      const response = await fetch(pageUrl, {
        headers: { 'User-Agent': 'IFRA_GENERATOR/1.0' }
      });

      if (!response.ok) break;

      const html = await response.text();
      const $ = cheerio.load(html);

      const pageProducts: Array<{ title: string; url: string }> = [];
      
      // Selettore tipico Shopify per link prodotto nelle collection
      $('a[href*="/products/"]').each((_, el) => {
        const href = $(el).attr('href');
        const title = $(el).text().trim() || $(el).find('img').attr('alt')?.trim() || "Prodotto senza titolo";
        
        if (href) {
          const absoluteUrl = href.startsWith('http') ? href : `${baseUrl}${href.split('?')[0]}`;
          const cleanUrl = absoluteUrl.split('?')[0]; // Rimuovi parametri tracking

          if (!seenUrls.has(cleanUrl) && cleanUrl.includes('/products/')) {
            seenUrls.add(cleanUrl);
            pageProducts.push({ title, url: cleanUrl });
          }
        }
      });

      if (pageProducts.length === 0) break; // Fine dei prodotti
      allProducts.push(...pageProducts);
    }

    return NextResponse.json({ 
      success: true, 
      products: allProducts,
      count: allProducts.length
    });

  } catch (error: any) {
    console.error("FRATERWORKS SCAN ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
