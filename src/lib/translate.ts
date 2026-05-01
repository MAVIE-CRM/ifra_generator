/**
 * Motore di traduzione con diagnostica avanzata e fallback MyMemory
 */

export async function translateToItalian(text: string | null): Promise<string | null> {
  if (!text || text.trim() === "") return null;

  const original = text.trim();
  const libreUrl = process.env.LIBRETRANSLATE_URL || "https://libretranslate.de/translate";

  console.log("--- START TRANSLATION ATTEMPT ---");
  console.log("ORIGINAL:", original.substring(0, 50) + "...");

  // 1. TENTATIVO LIBRETRANSLATE
  try {
    console.log("TRYING LIBRETRANSLATE:", libreUrl);
    const res = await fetch(libreUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: original,
        source: "en",
        target: "it",
        format: "text"
      }),
      next: { revalidate: 0 }
    });

    const raw = await res.text();
    console.log("LIBRETRANSLATE STATUS:", res.status);
    
    if (res.ok) {
      try {
        const data = JSON.parse(raw);
        const translated = data.translatedText;
        if (translated && translated.toLowerCase() !== original.toLowerCase()) {
          console.log("LIBRETRANSLATE SUCCESS:", translated.substring(0, 50) + "...");
          return translated;
        }
        console.log("LIBRETRANSLATE RETURNED SAME TEXT OR EMPTY");
      } catch (e) {
        console.error("LIBRETRANSLATE JSON PARSE ERROR:", raw);
      }
    } else {
      console.log("LIBRETRANSLATE ERROR RAW:", raw);
    }
  } catch (error: any) {
    console.error("LIBRETRANSLATE FETCH CRASH:", error.message);
  }

  // 2. TENTATIVO MYMEMORY (Fallback)
  try {
    console.log("TRYING MYMEMORY FALLBACK...");
    const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(original)}&langpair=en|it`;
    
    const res = await fetch(myMemoryUrl, { next: { revalidate: 0 } });
    const data = await res.json();
    console.log("MYMEMORY RAW:", JSON.stringify(data).substring(0, 200) + "...");

    if (res.ok && data.responseData) {
      const translated = data.responseData.translatedText;
      if (translated && translated.toLowerCase() !== original.toLowerCase() && !translated.includes("MYMEMORY WARNING")) {
        console.log("MYMEMORY SUCCESS:", translated.substring(0, 50) + "...");
        return translated;
      }
      console.log("MYMEMORY RETURNED INVALID TEXT:", translated);
    }
  } catch (error: any) {
    console.error("MYMEMORY FETCH CRASH:", error.message);
  }

  console.log("--- TRANSLATION FAILED: ALL SERVICES UNAVAILABLE ---");
  return null;
}
