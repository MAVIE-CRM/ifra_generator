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
    } catch (e: any) {
      results.myMemory.error = e.message;
    }

    // 3. TEST OPENAI
    results.openai = { status: null, data: null, error: null };
    if (process.env.OPENAI_API_KEY) {
      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: `Translate to Italian: ${text}` }],
            max_tokens: 500
          })
        });
        results.openai.status = res.status;
        results.openai.data = await res.json();
        if (res.ok && results.openai.data.choices?.[0]?.message?.content) {
          results.final = results.openai.data.choices[0].message.content.trim();
        }
      } catch (e: any) {
        results.openai.error = e.message;
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
