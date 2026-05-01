/**
 * Motore di traduzione avanzato con supporto OpenAI (Primario), MyMemory e LibreTranslate (Fallback)
 */

export async function translateToItalian(text: string | null): Promise<string | null> {
  if (!text || text.trim() === "") return null;

  const original = text.trim();
  console.log(`TRANSLATION START: "${original.substring(0, 50)}..." (${original.length} chars)`);

  // 1. TENTATIVO OPENAI (Il più affidabile e professionale)
  if (process.env.OPENAI_API_KEY) {
    try {
      console.log("TRYING OPENAI TRANSLATION...");
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { 
              role: "system", 
              content: "Sei un traduttore esperto nel settore della profumeria. Traduci fedelmente dall'inglese all'italiano." 
            },
            { 
              role: "user", 
              content: `Traduci in italiano: ${original}` 
            }
          ],
          temperature: 0.3
        })
      });

      console.log(`OPENAI RESPONSE STATUS: ${res.status}`);

      if (res.ok) {
        const data = await res.json();
        const translation = data.choices?.[0]?.message?.content?.trim();
        if (translation) {
          console.log("OPENAI SUCCESS:", translation.substring(0, 30) + "...");
          return translation;
        }
      } else {
        const err = await res.json().catch(() => ({ error: { message: "Unknown error" } }));
        console.error("OPENAI ERROR DETAILS:", JSON.stringify(err));
      }
    } catch (e: any) {
      console.error("OPENAI CONNECTION ERROR:", e.message);
    }
  }

  // 2. FALLBACK A MYMEMORY (Con chunking se necessario)
  console.log("FALLING BACK TO MYMEMORY...");
  const chunks = splitIntoChunks(original, 450);
  const translatedChunks: string[] = [];

  for (const chunk of chunks) {
    try {
      const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|it`;
      const res = await fetch(myMemoryUrl);
      if (res.ok) {
        const data = await res.json();
        const result = data.responseData?.translatedText;
        if (result && !result.includes("MYMEMORY WARNING")) {
          translatedChunks.push(result);
          continue;
        }
      }
    } catch (e) {
      console.error("MYMEMORY CHUNK ERROR");
    }
    
    // Se arriviamo qui, il chunk ha fallito MyMemory. Proviamo LibreTranslate come ultima spiaggia.
    if (process.env.LIBRETRANSLATE_URL) {
      try {
        const ltRes = await fetch(process.env.LIBRETRANSLATE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: chunk, source: "en", target: "it", format: "text" })
        });
        if (ltRes.ok) {
          const ltData = await ltRes.json();
          if (ltData.translatedText) {
            translatedChunks.push(ltData.translatedText);
            continue;
          }
        }
      } catch (e) {}
    }

    // Se fallisce tutto per questo chunk, ritorniamo null per l'intero testo per evitare traduzioni parziali
    return null;
  }

  const finalResult = translatedChunks.join(" ");
  return finalResult && finalResult !== original ? finalResult : null;
}

/**
 * Utility per spezzare il testo in blocchi naturali
 */
function splitIntoChunks(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];
  const chunks: string[] = [];
  let remaining = text;
  
  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }
    let splitIndex = -1;
    const breakPoints = ["\n", ". ", "; ", ": "];
    for (const bp of breakPoints) {
      const idx = remaining.lastIndexOf(bp, maxLength);
      if (idx > splitIndex) splitIndex = idx;
    }
    if (splitIndex === -1) splitIndex = remaining.lastIndexOf(" ", maxLength);
    if (splitIndex === -1) splitIndex = maxLength;
    chunks.push(remaining.substring(0, splitIndex + 1).trim());
    remaining = remaining.substring(splitIndex + 1).trim();
  }
  return chunks;
}
