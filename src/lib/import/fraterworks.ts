import { normalizeOptionalUrl } from '../normalizeUrl';

export interface FraterworksIfraLimit {
  amendment: string;
  limitPercent: number;
  category: string;
  context: string | null;
}

export interface FraterworksImportResult {
  name: string;
  cas: string | null;
  description: string | null;
  sourceUrl: string;
  supplier: string;
  referenceCode: string | null;
  collection: string | null;
  appearance: string | null;
  odourProfile: string | null;
  longevity: string | null;
  uses: string | null;
  unNumber: string | null;
  ifraLimits: FraterworksIfraLimit[];
  primaryIfraLimit: FraterworksIfraLimit | null;
  documents: Array<{ type: string; url: string; name: string }>;
}

/**
 * Reusable Fraterworks product parser.
 * Used by both initial import and real-time synchronization.
 */
export async function parseFraterworksProduct(cleanUrl: string): Promise<FraterworksImportResult> {
  try {
    const response = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'IFRA_GENERATOR/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Fetch fallita: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const cleanText = html.replace(/<[^>]*>?/gm, ' ').replace(/\s\s+/g, ' '); 
    
    const getFallbackName = (url: string) => {
      try {
        const u = new URL(url);
        const parts = u.pathname.split('/').filter(Boolean);
        const lastPart = parts[parts.length - 1] || 'Materiale';
        return lastPart.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      } catch {
        return 'Materiale Fraterworks';
      }
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

    // --- MOTORE PARSING IFRA AVANZATO ---
    const rawIfraLimits: FraterworksIfraLimit[] = [];
    const patterns = [
      /IFRA\s+(\d+)[:\s-]+([\d.]+)%\s*(?:in\s+finished\s+product)?\s*(?:\(Cat\.\s*([^)]+)\))?/gi,
      /IFRA\s+(?:Cat\.\s*([^:\s]+))?[:\s-]+([\d.]+)%/gi,
      /(?:Cat\.|Category)\s*([^:\s]+)[:\s-]+([\d.]+)%/gi,
      /Restricted\s+to\s+([\d.]+)%\s+in\s+(?:Cat\.|Category)\s*([^:\s]+)/gi,
      /Maximum\s+use\s+level[:\s-]+([\d.]+)%/gi
    ];

    patterns.forEach((regex, index) => {
      let match;
      while ((match = regex.exec(cleanText)) !== null) {
        let amendment = "unknown";
        let limitPercent = 0;
        let category = "4"; 
        let context = match[0];

        if (index === 0) {
          amendment = match[1];
          limitPercent = parseFloat(match[2]);
          category = (match[3] || "4").trim();
        } else if (index === 1) {
          limitPercent = parseFloat(match[2]);
          category = (match[1] || "4").trim();
        } else if (index === 2) {
          limitPercent = parseFloat(match[2]);
          category = match[1].trim();
        } else if (index === 3) {
          limitPercent = parseFloat(match[1]);
          category = match[2].trim();
        } else if (index === 4) {
          limitPercent = parseFloat(match[1]);
          category = "4";
        }

        if (amendment === "unknown") {
          const amMatch = cleanText.match(/IFRA\s+(\d+)/i);
          if (amMatch) amendment = amMatch[1];
        }

        rawIfraLimits.push({
          amendment,
          limitPercent,
          category: category.replace(/^Cat\./i, '').trim(),
          context: context.substring(0, 100).trim()
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
    ifraLimits.sort((a, b) => {
      const amA = a.amendment === 'unknown' ? 0 : parseInt(a.amendment);
      const amB = b.amendment === 'unknown' ? 0 : parseInt(b.amendment);
      return amB - amA;
    });
    const primaryIfra = ifraLimits.length > 0 ? ifraLimits[0] : null;

    const name = nameMatch ? nameMatch[1].trim() : getFallbackName(cleanUrl);

    const docLinks: Array<{ type: string; url: string; name: string }> = [];
    const sdsMatch = html.match(/href="([^"]+sds[^"]+)"/i);
    if (sdsMatch) {
      const sdsUrl = normalizeOptionalUrl(sdsMatch[1]);
      if (sdsUrl) docLinks.push({ type: 'SDS', url: sdsUrl, name: 'Safety Data Sheet' });
    }

    const ifraMatch = html.match(/href="([^"]+ifra[^"]+)"/i);
    if (ifraMatch) {
      const ifraUrl = normalizeOptionalUrl(ifraMatch[1]);
      if (ifraUrl) docLinks.push({ type: 'IFRA_CERT', url: ifraUrl, name: 'IFRA Certificate' });
    }

    return {
      name: name,
      cas: casMatch ? casMatch[1].trim() : null,
      description: 'Importato da Fraterworks',
      sourceUrl: cleanUrl,
      supplier: 'Fraterworks',
      referenceCode: refMatch ? refMatch[1].trim() : null,
      collection: collectionMatch ? collectionMatch[1].trim() : null,
      appearance: appearance,
      odourProfile: odourProfile,
      longevity: longevity,
      uses: uses,
      unNumber: unMatch ? unMatch[1].trim() : null,
      ifraLimits: ifraLimits,
      primaryIfraLimit: primaryIfra,
      documents: docLinks,
    };
  } catch (error: any) {
    console.error('FETCH/PARSER ERROR:', error);
    
    const fallbackName = (function() {
       try {
         const u = new URL(cleanUrl);
         const p = u.pathname.split('/').filter(Boolean);
         return p[p.length-1].replace(/-/g, ' ').toUpperCase();
       } catch { return "MATERIALE FRATERWORKS"; }
    })();

    return {
      name: fallbackName,
      cas: null,
      description: 'Importazione parziale (fetch fallita)',
      sourceUrl: cleanUrl,
      supplier: 'Fraterworks',
      referenceCode: null,
      collection: null,
      appearance: null,
      odourProfile: null,
      longevity: null,
      uses: null,
      unNumber: null,
      ifraLimits: [],
      primaryIfraLimit: null,
      documents: [],
    };
  }
}

// Mantieni retrocompatibilità per ora
export const importFromFraterworks = parseFraterworksProduct;
