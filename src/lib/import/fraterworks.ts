import * as cheerio from 'cheerio';
import { normalizeOptionalUrl } from '../normalizeUrl';
import { translateToItalian } from '../translate';

export interface FraterworksIfraLimit {
  amendment: string;
  limitPercent: number;
  category: string;
  context: string | null;
}

export interface FraterworksVariant {
  variantId: string;
  title: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  weight: string | null;
  concentration: string | null;
  price: number;
  currency: string;
  available: boolean;
}

export interface FraterworksImportResult {
  name: string;
  cas: string | null;
  description: string | null;
  descriptionIt: string | null;
  sourceUrl: string;
  supplier: string;
  referenceCode: string | null;
  collection: string | null;
  appearance: string | null;
  appearanceIt: string | null;
  odourProfile: string | null;
  odourProfileIt: string | null;
  longevity: string | null;
  uses: string | null;
  usesIt: string | null;
  unNumber: string | null;
  ifraLimits: FraterworksIfraLimit[];
  primaryIfraLimit: FraterworksIfraLimit | null;
  documents: Array<{ type: string; url: string; name: string }>;
  variants: FraterworksVariant[];
}

export async function parseFraterworksProduct(cleanUrl: string): Promise<FraterworksImportResult> {
  try {
    const response = await fetch(cleanUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    });

    if (!response.ok) throw new Error(`Fetch fallita: ${response.status}`);

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Rimuoviamo script e stili per pulire il testo
    $('script, style').remove();
    const cleanText = $('body').text().replace(/\s\s+/g, ' '); 
    
    let variants: FraterworksVariant[] = [];
    let productData = null;
    const jsonUrls = [cleanUrl.split('?')[0] + '.js', cleanUrl.split('?')[0] + '.json'];
    
    // 1. RECUPERO VARIANTI E PREZZI (JSON & HTML FALLBACK)
    for (const jUrl of jsonUrls) {
      if (productData) break;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const jsonRes = await fetch(jUrl, { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
            next: { revalidate: 0 }
          });
          if (jsonRes.ok) {
            const raw = await jsonRes.json();
            productData = raw.product || raw;
            break; 
          }
          await new Promise(r => setTimeout(r, 500 * attempt));
        } catch (e) {}
      }
    }

    if (!productData) {
      try {
        const scriptJson = $('script[id^="ProductJson-"]').first().html() || 
                           html.match(/var\s+meta\s*=\s*({[\s\S]*?});/i)?.[1];
        if (scriptJson) productData = JSON.parse(scriptJson).product || JSON.parse(scriptJson);
      } catch (e) {}
    }

    if (productData && productData.variants) {
      const pVariants = productData.variants;
      const options = productData.options || [];
      const weightIdx = options.findIndex((o: any) => /weight|peso/i.test(typeof o === 'string' ? o : o.name));
      const concIdx = options.findIndex((o: any) => /concentration|concentrazione/i.test(typeof o === 'string' ? o : o.name));

      variants = pVariants.map((v: any) => {
        const price = v.price || (v.variants && v.variants[0]?.price);
        const numericPrice = typeof price === 'string' ? parseFloat(price) : (price / 100);
        return {
          variantId: String(v.id || v.variant_id),
          title: v.title || v.name,
          option1: v.option1 || null,
          option2: v.option2 || null,
          option3: v.option3 || null,
          weight: weightIdx !== -1 ? v[`option${weightIdx + 1}`] : v.option1,
          concentration: concIdx !== -1 ? v[`option${concIdx + 1}`] : v.option2,
          price: isNaN(numericPrice) ? 0 : numericPrice,
          currency: "EUR",
          available: v.available ?? true
        };
      });
    }

    // 2. RECUPERO DATI TECNICI (ESTRAZIONE INTELLIGENTE)
    const getTechnicalField = (keywords: string[]) => {
      let result = null;
      
      // Tentativo 1: Cerca tag forti/titoli che contengono le keywords
      $('strong, b, h3, h4, span').each((_, el) => {
        const text = $(el).text().trim();
        if (keywords.some(k => text.toLowerCase().includes(k.toLowerCase()))) {
          // Il valore è solitamente nel nodo di testo successivo o nel genitore
          const element = $(el).get(0);
          let nextText = (element && element.nextSibling) ? (element.nextSibling as any).nodeValue?.trim() : '';
          
          if (!nextText || nextText.length < 5) {
            nextText = $(el).parent().text().replace(text, '').trim();
          }
          if (nextText && nextText.length > 5) {
            result = nextText;
            return false; // break
          }
        }
      });

      // Tentativo 2: Fallback Regex su testo pulito se Cheerio fallisce
      if (!result) {
        const regex = new RegExp(`(?:${keywords.join('|')})[:\\s]+(.*?)(?=Appearance:|Odour Profile:|Uses:|Reference:|CAS:|UN:|Longevity:|IFRA|Collection|$)`, 'i');
        const match = cleanText.match(regex);
        if (match) result = match[1].trim();
      }
      
      return result;
    };

    const odourProfile = getTechnicalField(['Odour Profile', 'Profilo Olfattivo']);
    const uses = getTechnicalField(['Suggested Uses', 'Uses', 'Utilizzo']);
    const appearance = getTechnicalField(['Physical Appearance', 'Appearance', 'Aspetto']);
    const longevity = getTechnicalField(['Longevity', 'Persistenza']);
    const casMatch = html.match(/CAS[:\s]+([\d-]+)/i);
    const refMatch = html.match(/Ref[:\s]+([A-Z0-9]+)/i);
    const unMatch = html.match(/UN[:\s]+(\d+)/i);
    const name = $('h1').first().text().trim() || getFallbackName(cleanUrl);

    // 3. TRADUZIONE PROFESSIONALE (OPENAI)
    const [odourProfileIt, usesIt, appearanceIt] = await Promise.all([
      translateToItalian(odourProfile),
      translateToItalian(uses),
      translateToItalian(appearance)
    ]);

    // 4. LIMITI IFRA (Parsing Avanzato)
    const rawIfraLimits: (FraterworksIfraLimit & { isNoRestriction?: boolean })[] = [];
    const ifraPatterns = [
      // Standard: IFRA 51: 2.5% (Cat. 4)
      /IFRA\s+(\d+)[:\s-]+([\d.]+)%\s*(?:in\s+finished\s+product)?\s*(?:\(Cat\.\s*([^)]+)\))?/gi,
      // No Restriction: IFRA 51: No restriction for category 4
      /IFRA\s+(\d+)[:\s-]+no\s+restriction\s+for\s+category\s+(\d+)/gi,
      // Generic No Restriction: No restriction for category 4
      /no\s+restriction\s+for\s+category\s+(\d+)/gi,
      // Compact: IFRA Cat. 4: 2.5%
      /IFRA\s+(?:Cat\.\s*([^:\s]+))?[:\s-]+([\d.]+)%/gi,
    ];

    ifraPatterns.forEach((regex, index) => {
      let match;
      while ((match = regex.exec(cleanText)) !== null) {
        let amendment = "unknown";
        let limitPercent = 0;
        let category = "4"; 
        let isNoRestriction = false;

        if (index === 0) { // Standard
          amendment = match[1];
          limitPercent = parseFloat(match[2]);
          category = (match[3] || "4").trim();
        } else if (index === 1) { // No restriction with amendment
          amendment = match[1];
          limitPercent = 100;
          category = match[2].trim();
          isNoRestriction = true;
        } else if (index === 2) { // Generic No restriction
          limitPercent = 100;
          category = match[1].trim();
          isNoRestriction = true;
        } else if (index === 3) { // Compact
          limitPercent = parseFloat(match[2]);
          category = (match[1] || "4").trim();
        }

        rawIfraLimits.push({
          amendment,
          limitPercent,
          category: category.replace(/^Cat\./i, '').trim(),
          context: match[0].substring(0, 50),
          isNoRestriction
        });
      }
    });

    const uniqueLimitsMap = new Map<string, FraterworksIfraLimit>();
    rawIfraLimits.forEach(limit => {
      const key = `${limit.amendment}-${limit.category}`;
      if (!uniqueLimitsMap.has(key) || uniqueLimitsMap.get(key)!.limitPercent > limit.limitPercent) {
        uniqueLimitsMap.set(key, limit);
      }
    });

    // 5. DOCUMENTI PDF
    const docLinks: Array<{ type: string; url: string; name: string }> = [];
    $('a[href*=".pdf"]').each((_, el) => {
      const url = normalizeOptionalUrl($(el).attr('href'));
      if (!url) return;
      
      const linkText = $(el).text().trim();
      let type = "OTHER";
      let name = linkText || "Document"; // Default al testo del link
      
      const lowerUrl = url.toLowerCase();
      const lowerText = linkText.toLowerCase();

      if (lowerUrl.includes('sds') || lowerText.includes('sds') || lowerText.includes('safety')) { 
        type = "SDS"; name = "Safety Data Sheet"; 
      }
      else if (lowerUrl.includes('ifra') || lowerText.includes('ifra') || lowerText.includes('cert')) { 
        type = "IFRA_CERT"; name = "IFRA Certificate"; 
      }
      else if (lowerUrl.includes('coa') || lowerText.includes('analysis')) { 
        type = "COA"; name = "Certificate of Analysis"; 
      }
      else if (lowerUrl.includes('tds') || lowerText.includes('technical')) { 
        type = "TDS"; name = "Technical Data Sheet"; 
      }
      else if (lowerUrl.includes('allergen')) { 
        type = "ALLERGEN"; name = "Allergens Statement"; 
      }
      
      if (!docLinks.some(d => d.url === url)) docLinks.push({ type, url, name });
    });

    // 6. CATEGORIA E TAGS (Shopify metadata)
    const category = productData?.type || productData?.product_type || html.match(/"type":"([^"]+)"/i)?.[1] || null;
    const tags = Array.isArray(productData?.tags) ? productData.tags : (typeof productData?.tags === 'string' ? productData.tags.split(',') : []);

    return {
      name,
      cas: casMatch ? casMatch[1].trim() : null,
      description: 'Imported from Fraterworks',
      descriptionIt: 'Importato da Fraterworks',
      sourceUrl: cleanUrl,
      supplier: 'Fraterworks',
      referenceCode: refMatch ? refMatch[1].trim() : null,
      collection: category, // Usiamo il tipo di prodotto come collezione/categoria
      appearance,
      appearanceIt,
      odourProfile,
      odourProfileIt,
      longevity,
      uses,
      usesIt,
      unNumber: unMatch ? unMatch[1].trim() : null,
      ifraLimits: Array.from(uniqueLimitsMap.values()),
      primaryIfraLimit: Array.from(uniqueLimitsMap.values())[0] || null,
      documents: docLinks,
      variants
    };
  } catch (error) {
    console.error('PARSE ERROR:', error);
    return { name: "ERRORE", cas: null, description: null, descriptionIt: null, sourceUrl: cleanUrl, supplier: 'Fraterworks', referenceCode: null, collection: null, appearance: null, appearanceIt: null, odourProfile: null, odourProfileIt: null, longevity: null, uses: null, usesIt: null, unNumber: null, ifraLimits: [], primaryIfraLimit: null, documents: [], variants: [] };
  }
}

function getFallbackName(url: string) {
  try {
    return new URL(url).pathname.split('/').pop()?.replace(/-/g, ' ').toUpperCase() || 'Materiale';
  } catch { return 'Materiale Fraterworks'; }
}

export const importFromFraterworks = parseFraterworksProduct;
