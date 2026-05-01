import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { messages, category } = await request.json();
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: "Chiave OpenAI mancante." }, { status: 500 });
    }

    // 1. Recuperiamo i materiali disponibili per dare contesto all'AI
    const materials = await prisma.material.findMany({
      select: {
        name: true,
        odourProfile: true,
        odourProfileIt: true,
        cas: true
      }
    });

    const materialsContext = materials.map(m => 
      `- ${m.name}: ${m.odourProfileIt || m.odourProfile || 'Nessuna descrizione'}`
    ).join('\n');

    // 2. Prepariamo il prompt di sistema
    const systemPrompt = `Sei un esperto Maestro Profumiere creativo e tecnico. 
Il tuo compito è aiutare l'utente a creare formule di profumeria di alta qualità.
HAI ACCESSO A QUESTI MATERIALI REALI NEL DATABASE DELL'UTENTE:
${materialsContext}

REGOLE:
1. Suggerisci formule basandoti PRINCIPALMENTE sui materiali sopra elencati.
2. Se suggerisci un materiale non presente, specificalo come "Suggerimento esterno".
3. Quando proponi una formula, usa sempre questo formato finale per permettere l'importazione automatica:
[FORMULA_START]
NomeMateriale1 45%
NomeMateriale2 10%
...
[FORMULA_END]
4. Sii creativo, spiega l'armonia tra le note (testa, cuore, fondo).
5. Tieni conto che l'utente lavora in Categoria IFRA: ${category}.`;

    // 3. Chiamata a OpenAI
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
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "Errore API OpenAI");
    }

    const data = await response.json();
    return NextResponse.json({ 
      message: data.choices[0].message.content 
    });

  } catch (error: any) {
    console.error("AI ASSISTANT ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
