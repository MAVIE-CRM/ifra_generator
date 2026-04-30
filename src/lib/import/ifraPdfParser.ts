/**
 * IFRA PDF Standards Parser
 * Estrae dati tecnici e limiti dai PDF ufficiali IFRA.
 */

export interface IfraPdfLimit {
  category: string;
  limit: number | null;
  limitText: string;
  isNoRestriction: boolean;
}

export interface IfraPdfData {
  title: string;
  amendment: string;
  casNumbers: string[];
  synonyms: string;
  recommendation: string;
  limits: IfraPdfLimit[];
}

export function parseIfraPdfText(text: string): IfraPdfData {
  // 1. Titolo Standard - Logica Avanzata
  let title = "";
  
  // Pattern per pulizia: rimuoviamo Amendment, anni, numeri pagina
  const cleanLine = (line: string) => {
    return line
      .replace(/IFRA STANDARD/gi, '')
      .replace(/\d{4}\s*\(Amendment\s*\d+\)/gi, '')
      .replace(/Amendment\s*\d+/gi, '')
      .replace(/\d+\s*\/\s*\d+/g, '') // Pagina 1/3, 1 / 3 etc
      .replace(/Page \d+ of \d+/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Strategia 1: Cerca tra "IFRA STANDARD" e "CAS-No.:"
  const sectionMatch = text.match(/IFRA STANDARD(.*?)(?=CAS-No\.?[:\s])/si);
  if (sectionMatch) {
    const rawContent = sectionMatch[1];
    const lines = rawContent.split('\n')
      .map(l => cleanLine(l))
      .filter(l => l.length > 2 && !l.toLowerCase().includes('cas-no'));
    
    title = lines.join(' ').replace(/\s+/g, ' ').trim();
  }

  // Strategia 2: Fallback - riga lunga prima di CAS-No
  if (!title || title.length < 5) {
    const linesBeforeCas = text.split(/CAS-No\.?[:\s]/i)[0].split('\n');
    for (let i = linesBeforeCas.length - 1; i >= 0; i--) {
      const cleaned = cleanLine(linesBeforeCas[i]);
      if (cleaned.length > 10 && !cleaned.includes('MAXIMUM ACCEPTABLE')) {
        title = cleaned;
        break;
      }
    }
  }

  // Debug Logs Titolo
  console.log("FINAL IFRA TITLE:", title);

  // 2. Amendment
  let amendment = "unknown";
  const amMatch = text.match(/Amendment\s+(\d+)/i) || text.match(/(\d+)\s*\(Amendment\s*\d+\)/i);
  if (amMatch) {
    amendment = amMatch[1];
  }

  // 3. CAS Numbers
  const casNumbers: string[] = [];
  const casSection = text.match(/CAS-No\.?[:\s]+(.*?)(?=Synonyms:|$)/si);
  if (casSection) {
    const rawCas = casSection[1].split(/[,;\s\n]+/).filter(s => /^\d+-\d+-\d+$/.test(s.trim()));
    casNumbers.push(...rawCas.map(s => s.trim()));
  }

  // 4. Synonyms
  let synonyms = "";
  const synSection = text.match(/Synonyms[:\s]+(.*?)(?=History:|Publication date:|RECOMMENDATION:|$)/si);
  if (synSection) {
    synonyms = synSection[1].trim().replace(/\s\s+/g, ' ');
  }

  // 5. Recommendation
  let recommendation = "";
  const recMatch = text.match(/RECOMMENDATION[:\s]+(.*?)(?:\n|$)/i);
  if (recMatch) {
    recommendation = recMatch[1].trim();
  }

  // 6. Limits
  const limits: IfraPdfLimit[] = [];
  const limitRegex = /Category\s+([0-9]+[A-Z]?)\s+((?:[0-9]+(?:\.[0-9]+)?)|No Restriction)\s*%?/gi;
  
  let match;
  while ((match = limitRegex.exec(text)) !== null) {
    const category = match[1].trim();
    const value = match[2].trim();

    if (value.toLowerCase() === "no restriction") {
      limits.push({
        category,
        limit: null,
        limitText: "No Restriction",
        isNoRestriction: true
      });
    } else {
      const numLimit = parseFloat(value);
      limits.push({
        category,
        limit: numLimit,
        limitText: value + "%",
        isNoRestriction: false
      });
    }
  }

  return {
    title: title || "Standard Sconosciuto",
    amendment,
    casNumbers,
    synonyms,
    recommendation,
    limits
  };
}
