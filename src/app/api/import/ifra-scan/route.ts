import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { normalizeOptionalUrl } from '@/lib/normalizeUrl';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ success: false, error: "URL mancante." }, { status: 400 });
    }

    console.log("SCANNING IFRA LIBRARY:", url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Impossibile leggere la pagina: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const pdfs: any[] = [];
    const seenUrls = new Set<string>();

    // Cerca tutti i link che finiscono in .pdf o che sembrano standard
    $('a').each((_, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      
      if (href) {
        // Normalizza URL relativo
        let fullUrl = href;
        if (href.startsWith('/')) {
          const baseUrl = new URL(url);
          fullUrl = `${baseUrl.origin}${href}`;
        }

        const isPdf = fullUrl.toLowerCase().endsWith('.pdf');
        const isStandard = fullUrl.toLowerCase().includes('standard') || text.toLowerCase().includes('standard');

        if (isPdf && isStandard && !seenUrls.has(fullUrl)) {
          seenUrls.add(fullUrl);
          
          // Tenta di estrarre amendment o titolo dal testo del link o dall'URL
          let amendment = "unknown";
          const amMatch = text.match(/Amendment\s+(\d+)/i) || fullUrl.match(/Amendment[_-]?(\d+)/i);
          if (amMatch) amendment = amMatch[1];

          pdfs.push({
            title: text || fullUrl.split('/').pop()?.replace(/[-_]/g, ' ') || "IFRA Standard",
            pdfUrl: fullUrl,
            amendment: amendment
          });
        }
      }
    });

    if (pdfs.length === 0) {
      // Se non trovo PDF, potrebbe essere una pagina dinamica
      const isDynamic = html.includes('script') && !html.includes('.pdf');
      return NextResponse.json({ 
        success: true, 
        pdfs: [],
        message: isDynamic ? "La pagina IFRA è dinamica: incolla direttamente i link PDF oppure usa import manuale PDF." : "Nessun PDF trovato."
      });
    }

    return NextResponse.json({ success: true, pdfs });

  } catch (error: any) {
    console.error("IFRA SCAN ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
