import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    if (!text) return NextResponse.json({ error: "Manca il testo da testare" }, { status: 400 });

    const results: any = {
      original: text,
      libreTranslate: { status: null, data: null, error: null },
      myMemory: { status: null, data: null, error: null },
      final: null
    };

    // 1. TEST LIBRETRANSLATE
    try {
      const libreUrl = process.env.LIBRETRANSLATE_URL || "https://libretranslate.de/translate";
      const res = await fetch(libreUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text, source: "en", target: "it", format: "text" })
      });
      results.libreTranslate.status = res.status;
      results.libreTranslate.data = await res.json().catch(() => "Invalid JSON");
      if (res.ok && results.libreTranslate.data.translatedText) {
        results.final = results.libreTranslate.data.translatedText;
      }
    } catch (e: any) {
      results.libreTranslate.error = e.message;
    }

    // 2. TEST MYMEMORY
    try {
      const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|it`;
      const res = await fetch(myMemoryUrl);
      results.myMemory.status = res.status;
      results.myMemory.data = await res.json();
      if (!results.final && res.ok && results.myMemory.data.responseData?.translatedText) {
        results.final = results.myMemory.data.responseData.translatedText;
      }
    } catch (e: any) {
      results.myMemory.error = e.message;
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
