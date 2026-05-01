import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: "Chiave OpenAI mancante." }, { status: 500 });
    }

    // 1. Recuperiamo tutti i materiali con i loro profili olfattivi
    const materials = await prisma.material.findMany({
      select: {
        id: true,
        name: true,
        odourProfile: true,
        odourProfileIt: true,
        appearanceIt: true,
        usesIt: true
      }
    });

    const materialsContext = materials.map(m => 
      `ID:[${m.id}] NAME:${m.name} PROFILE:${m.odourProfileIt || m.odourProfile || 'N/A'}`
    ).join('\n');

    // 2. Prompt di sistema per la ricerca
    const systemPrompt = `Sei un assistente esperto nella gestione di materie prime per profumeria.
Il tuo compito è aiutare l'utente a trovare i materiali più adatti nel suo database.
ECCO I MATERIALI DISPONIBILI:
${materialsContext}

REGOLE:
1. Rispondi in modo tecnico e professionale.
2. Quando suggerisci un materiale che è presente nel database, DEVI includere il suo ID in questo formato: [ID:id_materiale].
3. Spiega perché quel materiale è adatto alla richiesta dell'utente.
4. Se un materiale non è presente ma sarebbe ideale, specificalo come suggerimento per un futuro acquisto.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        temperature: 0.5 // Più preciso per la ricerca
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "Errore OpenAI");
    }

    const data = await response.json();
    return NextResponse.json({ 
      message: data.choices[0].message.content 
    });

  } catch (error: any) {
    console.error("MATERIAL FINDER ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
