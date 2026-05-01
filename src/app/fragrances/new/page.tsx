'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, Calculator, AlertTriangle, CheckCircle2, Info, ShieldCheck, Beaker, Zap, Quote, X } from 'lucide-react';
import { calculateFragranceIfra, IfraCalculationResult } from '@/lib/calculateIfra';

export default function NewFragrancePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [materials, setMaterials] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [category, setCategory] = useState('4'); // Default Fine Fragrance
  const [calculation, setCalculation] = useState<IfraCalculationResult | null>(null);
  const [smartPasteText, setSmartPasteText] = useState('');
  const [isSmartPasteOpen, setIsSmartPasteOpen] = useState(false);

  useEffect(() => {
    fetch('/api/materials')
      .then(res => res.json())
      .then(data => setMaterials(data));
  }, []);

  const addItem = () => {
    setSelectedItems([...selectedItems, { materialId: '', parts: 0 }]);
  };

  const removeItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...selectedItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setSelectedItems(newItems);
  };

  useEffect(() => {
    if (selectedItems.length > 0 && selectedItems.some(i => i.materialId)) {
      const itemsForCalc = selectedItems
        .filter(item => item.materialId)
        .map(item => {
          const material = materials.find(m => m.id === item.materialId);
          return {
            materialId: item.materialId,
            name: material?.name || 'Unknown',
            cas: material?.cas || null,
            parts: Number(item.parts) || 0,
            ifraLimits: material?.ifraLimits || [],
          };
        });

      const result = calculateFragranceIfra(name || 'Untitled', category, itemsForCalc);
      setCalculation(result);
    } else {
      setCalculation(null);
    }
  }, [selectedItems, category, name, materials]);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    // Filtriamo le righe vuote (senza materiale selezionato)
    const validItems = selectedItems.filter(item => item.materialId);

    if (!name || validItems.length === 0) {
      alert("Inserisci un nome e almeno un ingrediente valido.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/fragrances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          description, 
          items: validItems.map(item => ({
            materialId: item.materialId,
            parts: Number(item.parts) || 0
          }))
        }),
      });

      if (response.ok) {
        router.push('/fragrances');
      } else {
        const err = await response.json();
        alert("Errore durante il salvataggio: " + (err.error || "Riprova."));
      }
    } catch (error) {
      console.error('Save error:', error);
      alert("Errore di connessione durante il salvataggio.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSmartPaste = () => {
    if (!smartPasteText.trim()) return;

    const lines = smartPasteText.split('\n').filter(line => line.trim());
    const newItems: any[] = [];

    lines.forEach(line => {
      // Regex più flessibile: Nome (qualsiasi cosa) + Spazio/Tab + Numero (con virgola o punto) + % opzionale
      // Funziona anche con spazi multipli
      const match = line.match(/^(.+?)\s+([\d.,]+)\s*%?\s*$/);
      if (match) {
        const materialName = match[1].trim();
        const parts = parseFloat(match[2].replace(',', '.'));

        // Normalizzazione per confronto "Smart"
        const cleanSearch = materialName.toLowerCase()
          .replace(/[®™]/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        // Cerca il materiale nel database con logica a cascata
        const foundMaterial = materials.find(m => {
          const mName = m.name.toLowerCase().replace(/[®™]/g, '').trim();
          const mSyns = (m.synonyms || '').toLowerCase().replace(/[®™]/g, '').trim();
          
          // 1. Match Esatto (senza simboli)
          if (mName === cleanSearch) return true;
          
          // 2. Il nome nel DB contiene la ricerca (es: "Ambrox Super" contiene "Ambrox")
          if (mName.includes(cleanSearch) && cleanSearch.length > 3) return true;
          
          // 3. La ricerca contiene il nome nel DB (es: "Ambrox Super" cercato, "Ambrox" nel DB)
          if (cleanSearch.includes(mName) && mName.length > 3) return true;

          // 4. Match nei sinonimi
          if (mSyns.includes(cleanSearch) && cleanSearch.length > 3) return true;

          return false;
        });

        if (foundMaterial) {
          newItems.push({ materialId: foundMaterial.id, parts });
        } else {
          // Se non trovato, aggiungi comunque una riga vuota con il nome cercato come nota?
          // Per ora, lo aggiungiamo come riga da selezionare manualmente ma con le parti già impostate
          newItems.push({ materialId: '', parts, placeholderName: materialName });
        }
      }
    });

    if (newItems.length > 0) {
      setSelectedItems([...selectedItems, ...newItems]);
      setSmartPasteText('');
      setIsSmartPasteOpen(false);
    }
  };

  // --- STATO AI ASSISTANT ---
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<any[]>([
    { role: 'assistant', content: 'Ciao! Sono il tuo assistente profumiere. Dimmi che tipo di fragranza hai in mente e ti aiuterò a comporla usando i materiali nel tuo database.' }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const [selectedPricingVariants, setSelectedPricingVariants] = useState<Record<number, string>>({}); // index -> variantId

  const calculateCost = () => {
    if (!selectedItems.length || !materials.length) return { perGram: 0, perKg: 0 };
    
    let totalCost = 0;
    const totalParts = selectedItems.reduce((acc, item) => acc + (Number(item.parts) || 0), 0);
    
    if (totalParts === 0) return { perGram: 0, perKg: 0 };

    selectedItems.forEach((item, index) => {
      const material = materials.find(m => m.id === item.materialId);
      if (!material || !item.parts) return;

      const variantId = selectedPricingVariants[index] || (material.variants && material.variants[0]?.variantId);
      const variant = material.variants?.find((v: any) => v.variantId === variantId);

      if (variant && variant.price) {
        // Estrai peso in grammi dal titolo (es: "10g", "1kg")
        let weightInGrams = 1;
        const weightStr = (variant.weight || variant.title || '').toLowerCase();
        if (weightStr.includes('kg')) weightInGrams = parseFloat(weightStr) * 1000;
        else if (weightStr.includes('g')) weightInGrams = parseFloat(weightStr);
        
        const pricePerGram = variant.price / weightInGrams;
        const itemWeightInFormula = (Number(item.parts) / totalParts) * 1000; // Costo per 1kg di concentrato
        totalCost += pricePerGram * itemWeightInFormula;
      }
    });

    return { 
      perGram: totalCost / 1000, 
      perKg: totalCost 
    };
  };

  const costs = calculateCost();

  const handleAiSend = async () => {
    if (!aiInput.trim() || aiLoading) return;
    
    const newMessages = [...aiMessages, { role: 'user', content: aiInput }];
    setAiMessages(newMessages);
    setAiInput('');
    setAiLoading(true);

    try {
      const res = await fetch('/api/ai/formula-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, category })
      });
      const data = await res.json();
      if (data.message) {
        setAiMessages([...newMessages, { role: 'assistant', content: data.message }]);
      }
    } catch (err) {
      console.error("AI Error:", err);
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiFormula = (content: string) => {
    const match = content.match(/\[FORMULA_START\]([\s\S]*?)\[FORMULA_END\]/);
    if (match && match[1]) {
      setSmartPasteText(match[1].trim());
      setIsSmartPasteOpen(true);
      setIsAiOpen(false); // Chiudi chat per mostrare l'importatore
      // Scroll to top to see smart paste
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 relative">
      
      {/* --- AI ASSISTANT SIDEBAR --- */}
      <div className={`fixed top-0 right-0 h-full w-full md:w-96 bg-white shadow-2xl z-[100] transform transition-transform duration-500 ease-out border-l border-border flex flex-col ${isAiOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 bg-gradient-to-br from-primary to-accent text-white flex items-center justify-between">
           <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 fill-white/20" />
              <h3 className="font-bold uppercase tracking-widest text-sm">AI Formula Assistant</h3>
           </div>
           <button onClick={() => setIsAiOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
              <X className="w-5 h-5" />
           </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50">
          {aiMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-primary text-white rounded-tr-none' 
                  : 'bg-white text-slate-700 border border-border rounded-tl-none'
              }`}>
                <div className="whitespace-pre-wrap">{msg.content.replace(/\[FORMULA_START\][\s\S]*?\[FORMULA_END\]/, '(Formula suggerita sotto)')}</div>
                
                {msg.role === 'assistant' && msg.content.includes('[FORMULA_START]') && (
                  <button 
                    onClick={() => applyAiFormula(msg.content)}
                    className="mt-4 w-full bg-emerald-500 text-white py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-3 h-3" />
                    Applica Formula Suggerita
                  </button>
                )}
              </div>
            </div>
          ))}
          {aiLoading && (
            <div className="flex justify-start">
              <div className="bg-white p-4 rounded-2xl border border-border flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                 <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                 <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-white border-t border-border">
           <div className="relative">
              <textarea 
                placeholder="Chiedi un suggerimento creativo..."
                className="w-full bg-slate-50 border border-border rounded-2xl p-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none h-24"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAiSend();
                  }
                }}
              />
              <button 
                onClick={handleAiSend}
                disabled={aiLoading || !aiInput.trim()}
                className="absolute bottom-4 right-4 p-2 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                <Zap className="w-4 h-4" />
              </button>
           </div>
        </div>
      </div>

      {/* --- AI FLOATING BUTTON --- */}
      <button 
        onClick={() => setIsAiOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-2xl shadow-primary/40 hover:scale-110 active:scale-95 transition-all z-50 group"
      >
        <Zap className="w-8 h-8 text-white fill-white/10 group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-12 right-0 bg-slate-900 text-white text-[10px] font-black py-2 px-4 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
           AI FORMULA ASSISTANT
        </span>
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/fragrances')}
            className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-slate-900 hover:border-slate-900 transition-all shadow-sm group"
          >
            <Plus className="w-5 h-5 rotate-45 group-hover:scale-110 transition-transform" />
          </button>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gradient italic">Formula Studio</h1>
            <p className="text-foreground/60 mt-1">Sviluppa le tue creazioni con validazione IFRA ufficiale in tempo reale.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-foreground/5 rounded-xl border border-border shadow-inner">
             <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Categoria IFRA</span>
             <select 
               className="bg-transparent font-bold text-sm focus:outline-none"
               value={category}
               onChange={(e) => setCategory(e.target.value)}
             >
               <option value="1">Cat 1: Lip Products</option>
               <option value="2">Cat 2: Deodorants</option>
               <option value="3">Cat 3: Eye Products</option>
               <option value="4">Cat 4: Fine Fragrance</option>
               <option value="5A">Cat 5A: Body Lotions</option>
               <option value="5B">Cat 5B: Face Moisturizer</option>
               <option value="10A">Cat 10A: Laundry</option>
               <option value="12">Cat 12: Candles / Air Care</option>
             </select>
          </div>
          <button 
            onClick={handleSave} 
            disabled={isSaving || !name || selectedItems.length === 0} 
            className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 min-w-[160px] justify-center"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? 'Salvataggio...' : 'Salva Formula'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Editor Area */}
        <div className="lg:col-span-8 space-y-6">
          {/* Smart Paste Section - ORA SOPRA IL TITOLO */}
          <div className="luxury-card p-6 bg-primary/5 border-primary/20 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <Zap className="w-5 h-5 fill-primary/20" />
                <h3 className="text-xs font-black uppercase tracking-widest">Smart Formula Paste</h3>
              </div>
              <button 
                onClick={() => setIsSmartPasteOpen(!isSmartPasteOpen)}
                className="text-[10px] font-bold uppercase text-primary hover:underline"
              >
                {isSmartPasteOpen ? 'Chiudi' : 'Apri Importatore'}
              </button>
            </div>
            
            {isSmartPasteOpen ? (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                <textarea
                  placeholder={"Esempio:\nAmbrox Super 45%\nBenzaldehyde 8%\nIso E Super 20%"}
                  className="w-full h-48 bg-background border border-primary/20 rounded-2xl p-4 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 custom-scrollbar shadow-inner"
                  value={smartPasteText}
                  onChange={(e) => setSmartPasteText(e.target.value)}
                />
                <div className="flex gap-3">
                  <button 
                    onClick={handleSmartPaste}
                    className="flex-1 bg-primary text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                  >
                    Analizza e Aggiungi alla Formula
                  </button>
                  <button 
                    onClick={() => { setSmartPasteText(''); setIsSmartPasteOpen(false); }}
                    className="px-6 py-4 bg-foreground/5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-foreground/10"
                  >
                    Annulla
                  </button>
                </div>
                <p className="text-[9px] text-foreground/40 italic text-center">
                  Incolla la tua formula completa. Il sistema riconoscerà automaticamente nomi e dosaggi.
                </p>
              </div>
            ) : (
              <p className="text-[10px] text-foreground/40 italic">
                Hai una formula in formato testo? Clicca su <strong>Apri Importatore</strong> per incollarla velocemente.
              </p>
            )}
          </div>

          <div className="luxury-card p-8 space-y-4 bg-card/30 backdrop-blur-xl relative overflow-hidden">
            <input
              type="text"
              placeholder="Nome della Fragranza"
              className="w-full text-3xl font-black bg-transparent border-none focus:outline-none placeholder:text-foreground/10"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="flex items-center gap-2 text-foreground/40">
               <Quote className="w-4 h-4 opacity-30" />
               <textarea
                 placeholder="Note creative o descrizione del concept..."
                 className="w-full bg-transparent border-none focus:outline-none text-sm resize-none h-12"
                 value={description}
                 onChange={(e) => setDescription(e.target.value)}
               />
            </div>
          </div>

          <div className="luxury-card overflow-hidden shadow-2xl shadow-primary/5">
            <div className="grid grid-cols-12 p-4 bg-foreground/[0.03] border-b border-border text-[10px] font-bold uppercase tracking-widest text-foreground/40">
              <div className="col-span-4">Materiale</div>
              <div className="col-span-2 text-center">Parti</div>
              <div className="col-span-2 text-center">Limite IFRA</div>
              <div className="col-span-1 text-center">% Formula</div>
              <div className="col-span-2 text-center">Max Uso</div>
              <div className="col-span-1"></div>
            </div>
            
            <div className="divide-y divide-border">
              {selectedItems.map((item, index) => {
                const calcItem = calculation?.items.find(ci => ci.materialId === item.materialId && ci.parts === Number(item.parts));
                return (
                  <div key={index} className={`grid grid-cols-12 items-center p-4 group transition-colors ${calcItem?.isLimiting ? 'bg-amber-500/[0.03]' : 'hover:bg-foreground/[0.01]'}`}>
                    <div className="col-span-4 pr-4">
                      <select
                        className="w-full bg-transparent border-none focus:outline-none font-bold text-sm appearance-none"
                        value={item.materialId}
                        onChange={(e) => updateItem(index, 'materialId', e.target.value)}
                      >
                        <option value="">Seleziona ingrediente...</option>
                        {materials.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                      {item.materialId && (
                        <div className="mt-1 flex items-center gap-2">
                           <select 
                             className="text-[9px] bg-foreground/5 border-none rounded px-1.5 py-0.5 focus:outline-none font-medium"
                             value={selectedPricingVariants[index] || materials.find(m => m.id === item.materialId)?.variants[0]?.variantId}
                             onChange={(e) => setSelectedPricingVariants({...selectedPricingVariants, [index]: e.target.value})}
                           >
                             {materials.find(m => m.id === item.materialId)?.variants?.map((v: any) => (
                               <option key={v.variantId} value={v.variantId}>{v.title} - €{v.price}</option>
                             ))}
                           </select>
                        </div>
                      )}
                    </div>
                    <div className="col-span-2 px-2">
                      <input
                        type="number"
                        className="w-full bg-foreground/5 border border-transparent focus:border-primary/30 focus:bg-background px-3 py-1.5 rounded-lg text-right font-mono text-sm transition-all"
                        value={item.parts}
                        onChange={(e) => updateItem(index, 'parts', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2 text-center">
                       {calcItem ? (
                         <div className="flex flex-col items-center">
                            <span className={`text-[11px] font-bold ${calcItem.isNoRestriction ? 'text-emerald-500 italic' : (calcItem.hasNoData ? 'text-red-500' : 'text-primary')}`}>
                              {calcItem.limitText}
                            </span>
                            <div className="flex items-center gap-1 mt-0.5">
                               {calcItem.source === 'IFRA' && <ShieldCheck className="w-2.5 h-2.5 text-emerald-500" />}
                               <span className="text-[8px] font-bold uppercase tracking-tighter opacity-30">{calcItem.source || '---'}</span>
                            </div>
                         </div>
                       ) : <span className="text-[10px] text-foreground/20">---</span>}
                    </div>
                    <div className="col-span-1 text-center font-mono text-[11px] text-foreground/60">
                      {calcItem ? `${calcItem.formulaPercent.toFixed(2)}%` : '0%'}
                    </div>
                    <div className="col-span-2 text-center">
                      {calcItem && calcItem.maxFragranceUsage !== null ? (
                        <div className="flex flex-col items-center">
                           <span className={`text-[11px] font-black ${calcItem.isLimiting ? 'text-amber-500' : 'text-foreground/70'}`}>
                             {calcItem.maxFragranceUsage.toFixed(2)}%
                           </span>
                           {calcItem.isLimiting && <span className="text-[8px] font-black uppercase text-amber-500 tracking-tighter">LIMITANTE</span>}
                        </div>
                      ) : <span className="text-[10px] text-foreground/20">---</span>}
                    </div>
                    <div className="col-span-1 text-right">
                      <button 
                        onClick={() => removeItem(index)}
                        className="p-2 text-red-500/20 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <button 
              onClick={addItem}
              className="w-full py-6 flex items-center justify-center gap-2 text-sm font-bold text-primary hover:bg-primary/5 transition-colors border-t border-border"
            >
              <Plus className="w-4 h-4" />
              Aggiungi Componente alla Formula
            </button>
          </div>
        </div>

        {/* Calculation Summary Panel */}
        <div className="lg:col-span-4 space-y-6 sticky top-8">
          <div className="luxury-card overflow-hidden shadow-2xl shadow-primary/10">
            <div className="p-4 bg-gradient-to-br from-primary to-accent text-white">
               <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest opacity-80">IFRA Compliance Report</span>
               </div>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="text-center space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Limite Massimo Fragranza</div>
                <div className={`text-6xl font-black tracking-tighter ${calculation?.finalMaxUsage == null ? 'text-foreground/10' : (calculation.finalMaxUsage < 100 ? 'text-amber-500' : 'text-emerald-500')}`}>
                  {calculation?.finalMaxUsage != null ? `${calculation.finalMaxUsage.toFixed(2)}%` : '--%'}
                </div>
                <div className="text-[10px] text-foreground/40 font-medium">Dosaggio massimo consigliato nel prodotto finito (Cat.{category})</div>
              </div>

              <div className="space-y-4">
                {calculation?.limitingComponent && (
                  <div className="p-5 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-amber-500">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Componente Limitante</span>
                    </div>
                    <div>
                       <div className="text-sm font-black">{calculation?.limitingComponent?.name}</div>
                       <div className="text-[10px] text-foreground/40 font-mono mt-1">CAS: {calculation?.limitingComponent?.cas || 'N/A'}</div>
                    </div>
                    <div className="pt-3 border-t border-amber-500/10 flex justify-between items-end">
                       <div className="space-y-1">
                          <span className="text-[9px] font-bold uppercase text-foreground/30 block tracking-tighter">IFRA Limit (Cat.{category})</span>
                          <span className="text-sm font-bold text-primary">{calculation?.limitingComponent?.limitText}</span>
                       </div>
                       <div className="text-right space-y-1">
                          <span className="text-[9px] font-bold uppercase text-foreground/30 block tracking-tighter">Fonte Normativa</span>
                          <div className="flex items-center justify-end gap-1.5">
                             {calculation?.limitingComponent?.source === 'IFRA' && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />}
                             <span className="text-[10px] font-black uppercase text-foreground/60">{calculation?.limitingComponent?.source || 'Supplier'}</span>
                          </div>
                       </div>
                    </div>
                  </div>
                )}

                {(calculation?.missingDataComponents?.length ?? 0) > 0 && (
                  <div className="p-5 bg-foreground/5 border border-border rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-foreground/40">
                      <Info className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Dati IFRA Mancanti</span>
                    </div>
                    <div className="space-y-2">
                      {calculation?.missingDataComponents?.map(item => (
                        <div key={item.materialId} className="flex items-center gap-2 text-[11px] font-bold text-foreground/70">
                           <div className="w-1.5 h-1.5 rounded-full bg-red-500/40" />
                           {item.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!calculation && (
                  <div className="py-12 text-center text-foreground/20 space-y-4">
                     <Beaker className="w-12 h-12 mx-auto opacity-10 animate-pulse" />
                     <p className="text-xs font-bold uppercase tracking-widest">Inizia a comporre la formula</p>
                  </div>
                )}

                {calculation && (calculation.missingDataComponents?.length ?? 0) === 0 && !calculation.limitingComponent && (
                   <div className="flex items-center gap-3 text-emerald-500 bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/20">
                     <CheckCircle2 className="w-6 h-6" />
                     <div className="space-y-0.5">
                        <span className="text-[11px] font-black uppercase tracking-widest">Pienamente Conforme</span>
                        <p className="text-[10px] opacity-80">Nessun limite restrittivo rilevato per questa categoria.</p>
                     </div>
                   </div>
                )}
              </div>
              
              <div className="pt-4 flex items-center justify-between text-[9px] font-bold uppercase tracking-tighter text-foreground/30">
                 <span>Analisi in Tempo Reale</span>
                 <span>Total Parts: {calculation?.totalParts || 0}</span>
              </div>
            </div>
          </div>

          {/* Financial Summary Panel */}
          <div className="luxury-card overflow-hidden shadow-2xl shadow-emerald-500/10 border-emerald-500/20">
            <div className="p-4 bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
               <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest opacity-80">Economic Analysis</span>
               </div>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-end border-b border-border pb-6">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Costo Stimato (g)</div>
                  <div className="text-2xl font-black text-slate-900">€{costs.perGram.toFixed(4)}</div>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Costo Stimato (Kg)</div>
                  <div className="text-4xl font-black text-emerald-600">€{costs.perKg.toFixed(2)}</div>
                </div>
              </div>
              <p className="text-[9px] text-foreground/40 italic leading-relaxed">
                Il calcolo si basa sulla variante di prezzo selezionata per ogni ingrediente. I costi sono stimati per 1Kg di concentrato puro.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
