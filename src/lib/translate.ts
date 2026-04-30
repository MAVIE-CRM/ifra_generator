/**
 * Traduttore automatico usando Lingva (Google Translate Frontend).
 * Più resiliente per testi lunghi rispetto a MyMemory.
 */
export async function translateToItalian(text: string | null): Promise<string | null> {
  if (!text) return null;

  console.log("TRANSLATE INPUT:", text.substring(0, 50) + "...");

  try {
    const url = `https://lingva.ml/api/v1/en/it/${encodeURIComponent(text)}`;
    
    const res = await fetch(url);

    if (!res.ok) {
      console.error("Lingva API Error Status:", res.status);
      return text; // Fallback silenzioso su testo originale
    }

    const data = await res.json();
    console.log("LINGVA RESPONSE RECEIVED");

    return data.translation || text;
  } catch (e) {
    console.error("Translation Exception:", e);
    return text;
  }
}
