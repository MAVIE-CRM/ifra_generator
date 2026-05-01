/**
 * Servizio di traduzione multi-livello (LibreTranslate + MyMemory)
 */

export async function translateToItalian(text: string | null): Promise<string | null> {
  if (!text || text.trim() === "") return null;

  const original = text.trim();
  const libreUrl = process.env.LIBRETRANSLATE_URL || "https://libretranslate.de/translate";

  console.log("TRANSLATING (Level 1 - LibreTranslate):", original.substring(0, 40) + "...");

  try {
    // TENTATIVO 1: LibreTranslate
    const libreRes = await fetch(libreUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: original, source: "en", target: "it", format: "text" }),
    });

    if (libreRes.ok) {
      const data = await libreRes.json();
      const translated = data.translatedText;
      if (translated && translated.toLowerCase() !== original.toLowerCase()) {
        console.log("SUCCESS (LibreTranslate):", translated.substring(0, 40) + "...");
        return translated;
      }
    }
  } catch (error) {
    console.error("LibreTranslate Level 1 failed, trying Level 2...");
  }

  // TENTATIVO 2: MyMemory API (Fallback gratuito)
  try {
    console.log("TRANSLATING (Level 2 - MyMemory):", original.substring(0, 40) + "...");
    const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(original)}&langpair=en|it`;
    
    const myMemoryRes = await fetch(myMemoryUrl);
    if (myMemoryRes.ok) {
      const data = await myMemoryRes.json();
      const translated = data.responseData?.translatedText;
      
      if (translated && translated.toLowerCase() !== original.toLowerCase() && !translated.includes("MYMEMORY WARNING")) {
        console.log("SUCCESS (MyMemory):", translated.substring(0, 40) + "...");
        return translated;
      }
    }
  } catch (error) {
    console.error("MyMemory Level 2 failed.");
  }

  // Se tutto fallisce o la traduzione è identica, ritorniamo null
  console.log("TRANSLATION UNAVAILABLE: Returning null");
  return null;
}
