import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(request: Request) {
  try {
    const { urls } = await request.json();

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json({ success: false, error: "Array urls mancante." }, { status: 400 });
    }

    const allPdfs: any[] = [];
    const seenUrls = new Set<string>();

    for (const url of urls) {
      if (!url.trim()) continue;
      
      console.log("PAGE SCANNED:", url);

      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          next: { revalidate: 0 } // Evita cache
        });

        if (!response.ok) {
          console.error(`Impossibile leggere la pagina ${url}: ${response.status}`);
          continue;
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        $('a').each((_, el) => {
          const href = $(el).attr('href');
          const text = $(el).text().trim();
          
          if (href) {
            let fullUrl = href;
            if (href.startsWith('/')) {
              try {
                const baseUrl = new URL(url);
                fullUrl = `${baseUrl.origin}${href}`;
              } catch (e) {
                // Se URL base non valido, salta
                return;
              }
            }

            const isPdf = fullUrl.toLowerCase().endsWith('.pdf');
            const isStandard = fullUrl.toLowerCase().includes('standard') || 
                               fullUrl.toLowerCase().includes('ifra') ||
                               text.toLowerCase().includes('standard');

            if (isPdf && isStandard && !seenUrls.has(fullUrl)) {
              seenUrls.add(fullUrl);
              
              let amendment = "unknown";
              const amMatch = text.match(/Amendment\s+(\d+)/i) || fullUrl.match(/Amendment[_-]?(\d+)/i);
              if (amMatch) amendment = amMatch[1];

              allPdfs.push({
                title: text || fullUrl.split('/').pop()?.replace(/[-_]/g, ' ') || "IFRA Standard",
                pdfUrl: fullUrl,
                amendment: amendment
              });
              
              console.log("PDF FOUND:", fullUrl);
            }
          }
        });
      } catch (pageErr) {
        console.error(`Errore durante scansione di ${url}:`, pageErr);
      }
    }

    if (allPdfs.length === 0) {
      return NextResponse.json({ 
        success: true, 
        pdfs: [],
        message: "Nessun PDF trovato nelle pagine fornite. Se le pagine sono dinamiche, inserisci direttamente i link PDF."
      });
    }

    return NextResponse.json({ success: true, pdfs: allPdfs });

  } catch (error: any) {
    console.error("IFRA MULTI-SCAN ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
