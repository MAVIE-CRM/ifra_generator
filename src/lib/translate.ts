/**
 * Motore di traduzione con diagnostica avanzata, fallback MyMemory e chunking automatico (limite 500 car)
 */

function splitIntoChunks(text: string, maxLength: number = 450): string[] {
  if (text.length <= maxLength) return [text];
  
  const chunks: string[] = [];
  let remaining = text;
  
  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }
    
    // Cerca un punto di rottura naturale (punto, a capo, punto e virgola)
    let splitIndex = -1;
    const breakPoints = ["\n", ". ", "; ", ": "];
    
    for (const bp of breakPoints) {
      const idx = remaining.lastIndexOf(bp, maxLength);
      if (idx > splitIndex) splitIndex = idx;
    }
    
    // Se non trova un punto di rottura, spezza forzatamente allo spazio
    if (splitIndex === -1) {
      splitIndex = remaining.lastIndexOf(" ", maxLength);
    }
    
    // Se ancora nulla, spezza al limite
    if (splitIndex === -1) splitIndex = maxLength;
    
    const chunk = remaining.substring(0, splitIndex + 1).trim();
    if (chunk) chunks.push(chunk);
    remaining = remaining.substring(splitIndex + 1).trim();
  }
  
  return chunks;
}

export async function translateToItalian(text: string | null): Promise<string | null> {
  if (!text || text.trim() === "") return null;

  const original = text.trim();
  const chunks = splitIntoChunks(original);
  console.log(`TRANSLATION: Splitting text (${original.length} chars) into ${chunks.length} chunks`);

  const translatedChunks: string[] = [];

  for (const chunk of chunks) {
    console.log(`TRANSLATING CHUNK (${chunk.length} chars):`, chunk.substring(0, 30) + "...");
    
    let translatedChunk: string | null = null;

    // 1. TENTATIVO MYMEMORY (Fallback principale per chunking gratuito)
    try {
      const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|it`;
      const res = await fetch(myMemoryUrl, { next: { revalidate: 0 } });
      const data = await res.json();
      
      if (res.ok && data.responseData) {
        const result = data.responseData.translatedText;
        // Se non è un errore e non è identico all'originale
        if (result && result.toLowerCase() !== chunk.toLowerCase() && !result.includes("MYMEMORY WARNING")) {
          translatedChunk = result;
          console.log("MYMEMORY CHUNK SUCCESS");
        }
      }
    } catch (e: any) {
      console.error("MYMEMORY CHUNK ERROR:", e.message);
    }

    // 2. TENTATIVO LIBRETRANSLATE (Se configurato e MyMemory fallisce)
    if (!translatedChunk && process.env.LIBRETRANSLATE_URL) {
      try {
        const res = await fetch(process.env.LIBRETRANSLATE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: chunk, source: "en", target: "it", format: "text" }),
          next: { revalidate: 0 }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.translatedText && data.translatedText.toLowerCase() !== chunk.toLowerCase()) {
            translatedChunk = data.translatedText;
            console.log("LIBRETRANSLATE CHUNK SUCCESS");
          }
        }
      } catch (e: any) {
        console.error("LIBRETRANSLATE CHUNK ERROR:", e.message);
      }
    }

    // Se fallisce tutto, mettiamo il chunk originale o null? 
    // Il requisito dice: se fallisce, non copiare mai testo inglese nei campi IT.
    // Quindi se un chunk fallisce, l'intera traduzione potrebbe essere corrotta.
    // Ma per robustezza, se fallisce MyMemory e Libre, ritorniamo null per fermare tutto.
    if (!translatedChunk) {
      console.log("CHUNK TRANSLATION FAILED - ABORTING FULL TEXT");
      return null;
    }
    
    translatedChunks.push(translatedChunk);
  }

  const finalResult = translatedChunks.join(" ");
  console.log("--- FULL TRANSLATION COMPLETED ---");
  return finalResult;
}
