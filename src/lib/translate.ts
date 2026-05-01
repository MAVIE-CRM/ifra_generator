/**
 * Servizio di traduzione gratuita tramite LibreTranslate
 */

export async function translateToItalian(text: string | null): Promise<string | null> {
  if (!text || text.trim() === "") return null;

  const url = process.env.LIBRETRANSLATE_URL || "https://libretranslate.de/translate";

  console.log("TRANSLATING:", text.substring(0, 50) + (text.length > 50 ? "..." : ""));

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        q: text,
        source: "en",
        target: "it",
        format: "text",
      }),
    });

    const raw = await res.text();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      console.error("LibreTranslate non ha restituito JSON:", raw);
      return text; // Fallback al testo originale
    }

    if (!res.ok) {
      console.error("LibreTranslate error:", data);
      return text; // Fallback al testo originale
    }

    const translated = data.translatedText || text;
    console.log("TRANSLATED:", translated.substring(0, 50) + (translated.length > 50 ? "..." : ""));
    
    return translated;
  } catch (error) {
    console.error("Translation system error:", error);
    return text; // Fallback al testo originale in caso di crash del servizio
  }
}
