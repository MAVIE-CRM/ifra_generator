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

/**
 * Reusable Fraterworks product parser.
 * Now extracts variants, prices, and ALL technical documents.
 */
export async function parseFraterworksProduct(cleanUrl: string): Promise<FraterworksImportResult> {
  try {
    // 1. FETCH HTML PER DATI TECNICI E IFRA
    const response = await fetch(cleanUrl, {
      headers: { 'User-Agent': 'IFRA_GENERATOR/1.0' },
    });

    if (!response.ok) throw new Error(`Fetch fallita: ${response.status}`);

    const html = await response.text();
    const cleanText = html.replace(/<[^>]*>?/gm, ' ').replace(/\s\s+/g, ' '); 
    
    // 2. FETCH JSON SHOPIFY PER PREZZI E VARIANTI
    let variants: FraterworksVariant[] = [];
    try {
      const jsonUrl = cleanUrl.split('?')[0] + '.js';
      const jsonRes = await fetch(jsonUrl);
      if (jsonRes.ok) {
        const productData = await jsonRes.json();
        variants = productData.variants.map((v: any) => ({
          variantId: String(v.id),
          title: v.title,
          option1: v.option1,
          option2: v.option2,
          option3: v.option3,
          price: v.price / 100, // Shopify è in centesimi
          currency: "EUR", // Fraterworks è solitamente EUR o USD, ma forziamo o rileviamo se possibile
          available: v.available
        }));
      }
    } catch (e) {
      console.error("SHOPIFY JSON PARSE ERROR:", e);
    }

    const getFallbackName = (url: string) => {
      try {
        const u = new URL(url);
        return u.pathname.split('/').pop()?.replace(/-/g, ' ').toUpperCase() || 'Materiale';
      } catch { return 'Materiale Fraterworks'; }
    };

    const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
    const casMatch = html.match(/CAS[:\s]+([\d-]+)/i);
    const refMatch = html.match(/Ref[:\s]+([A-Z0-9]+)/i);
    const unMatch = html.match(/UN[:\s]+(\d+)/i);
    
    const extractSection = (label: string) => {
      const regex = new RegExp(`${label}[:\\s]+(.*?)(?=Appearance:|Odour Profile:|Uses:|Reference:|CAS:|UN:|Longevity:|IFRA|Collection|$)`, 'i');
      const match = cleanText.match(regex);
      return match ? match[1].trim() : null;
    };

    const odourProfile = extractSection('Odour Profile');
    const uses = extractSection('Uses');
    const appearance = extractSection('Appearance');
    const longevity = extractSection('Longevity');
    const collectionMatch = html.match(/([A-Za-z\s]+Collection)/i);

    // TRADUZIONE
    const [odourProfileIt, usesIt, appearanceIt] = await Promise.all([
      translateToItalian(odourProfile),
      translateToItalian(uses),
      translateToItalian(appearance)
    ]);

    // PARSING IFRA
    const rawIfraLimits: FraterworksIfraLimit[] = [];
    const patterns = [
      /IFRA\s+(\d+)[:\s-]+([\d.]+)%\s*(?:in\s+finished\s+product)?\s*(?:\(Cat\.\s*([^)]+)\))?/gi,
      /IFRA\s+(?:Cat\.\s*([^:\s]+))?[:\s-]+([\d.]+)%/gi,
      /(?:Cat\.|Category)\s*([^:\s]+)[:\s-]+([\d.]+)%/gi,
    ];

    patterns.forEach((regex, index) => {
      let match;
      while ((match = regex.exec(cleanText)) !== null) {
        let amendment = "unknown";
        let limitPercent = 0;
        let category = "4"; 
        if (index === 0) {
          amendment = match[1];
          limitPercent = parseFloat(match[2]);
          category = (match[3] || "4").trim();
        } else {
          limitPercent = parseFloat(match[2]);
          category = (match[1] || "4").trim();
        }
        
        if (amendment === "unknown") {
          const amMatch = cleanText.match(/IFRA\s+(\d+)/i);
          if (amMatch) amendment = amMatch[1];
        }

        rawIfraLimits.push({
          amendment,
          limitPercent,
          category: category.replace(/^Cat\./i, '').trim(),
          context: match[0].substring(0, 50)
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

    const ifraLimits = Array.from(uniqueLimitsMap.values());
    const primaryIfra = ifraLimits.length > 0 ? ifraLimits[0] : null;

    // --- ESTRAZIONE DOCUMENTI POTENZIATA ---
    const docLinks: Array<{ type: string; url: string; name: string }> = [];
    const docRegex = /href="([^"]+\.pdf[^"]*)"/gi;
    let docMatch;
    
    while ((docMatch = docRegex.exec(html)) !== null) {
      const originalUrl = docMatch[1];
      const url = normalizeOptionalUrl(originalUrl);
      if (!url) continue;

      let type = "OTHER";
      let name = "Document";
      const lowerUrl = url.toLowerCase();

      if (lowerUrl.includes('sds') || lowerUrl.includes('safety')) {
        type = "SDS";
        name = "Safety Data Sheet";
      } else if (lowerUrl.includes('ifra') || lowerUrl.includes('cert')) {
        type = "IFRA_CERT";
        name = "IFRA Certificate";
      } else if (lowerUrl.includes('coa')) {
        type = "COA";
        name = "Certificate of Analysis";
      } else if (lowerUrl.includes('tds') || lowerUrl.includes('technical')) {
        type = "TDS";
        name = "Technical Data Sheet";
      } else if (lowerUrl.includes('allergen')) {
        type = "ALLERGEN";
        name = "Allergens Statement";
      }

      // Evita duplicati URL
      if (!docLinks.some(d => d.url === url)) {
        docLinks.push({ type, url, name });
      }
    }

    return {
      name: nameMatch ? nameMatch[1].trim() : getFallbackName(cleanUrl),
      cas: casMatch ? casMatch[1].trim() : null,
      description: 'Imported from Fraterworks',
      descriptionIt: 'Importato da Fraterworks',
      sourceUrl: cleanUrl,
      supplier: 'Fraterworks',
      referenceCode: refMatch ? refMatch[1].trim() : null,
      collection: collectionMatch ? collectionMatch[1].trim() : null,
      appearance,
      appearanceIt,
      odourProfile,
      odourProfileIt,
      longevity,
      uses,
      usesIt,
      unNumber: unMatch ? unMatch[1].trim() : null,
      ifraLimits,
      primaryIfraLimit: primaryIfra,
      documents: docLinks,
      variants
    };
  } catch (error) {
    console.error('PARSE ERROR:', error);
    return {
      name: "ERRORE IMPORT",
      cas: null,
      description: null,
      descriptionIt: null,
      sourceUrl: cleanUrl,
      supplier: 'Fraterworks',
      referenceCode: null,
      collection: null,
      appearance: null,
      appearanceIt: null,
      odourProfile: null,
      odourProfileIt: null,
      longevity: null,
      uses: null,
      usesIt: null,
      unNumber: null,
      ifraLimits: [],
      primaryIfraLimit: null,
      documents: [],
      variants: []
    };
  }
}

export const importFromFraterworks = parseFraterworksProduct;
