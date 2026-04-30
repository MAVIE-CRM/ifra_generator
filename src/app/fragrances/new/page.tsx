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

  const handleSave = async () => {
    if (!name || selectedItems.length === 0) return;

    try {
      const response = await fetch('/api/fragrances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, items: selectedItems }),
      });

      if (response.ok) {
        router.push('/fragrances');
      }
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  const handleSmartPaste = () => {
    if (!smartPasteText.trim()) return;

    const lines = smartPasteText.split('\n').filter(line => line.trim());
    const newItems: any[] = [];

    lines.forEach(line => {
      // Regex per estrarre nome e parti/percentuale
      // Esempio: "Ambrox® Super 45%" -> match[1]="Ambrox® Super", match[2]="45"
      const match = line.match(/^(.+?)\s+([\d.,]+)%?\s*$/);
      if (match) {
        const materialName = match[1].trim();
        const parts = parseFloat(match[2].replace(',', '.'));

        // Cerca il materiale nel database locale (caricato in `materials`)
        const foundMaterial = materials.find(m => 
          m.name.toLowerCase() === materialName.toLowerCase() || 
          m.synonyms?.toLowerCase().includes(materialName.toLowerCase())
        );

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

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gradient italic">Formula Studio</h1>
          <p className="text-foreground/60 mt-1">Sviluppa le tue creazioni con validazione IFRA ufficiale in tempo reale.</p>
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
            disabled={!name || selectedItems.length === 0}
            className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Salva Formula
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Editor Area */}
        <div className="lg:col-span-8 space-y-6">
          <div className="luxury-card p-8 space-y-4 bg-card/30 backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <button 
                onClick={() => setIsSmartPasteOpen(!isSmartPasteOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isSmartPasteOpen ? 'bg-primary text-white' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
              >
                <Zap className="w-3 h-3" />
                Smart Paste
              </button>
            </div>

            <input
              type="text"
              placeholder="Nome della Fragranza"
              className="w-full text-3xl font-black bg-transparent border-none focus:outline-none placeholder:text-foreground/10 pr-32"
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

            {isSmartPasteOpen && (
              <div className="mt-6 pt-6 border-t border-primary/10 space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary">
                    <Zap className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Incolla Formula (Nome + %)</span>
                  </div>
                  <button onClick={() => setIsSmartPasteOpen(false)} className="text-foreground/20 hover:text-foreground/40">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <textarea
                  placeholder={"Ambrox Super 45%\nBenzaldehyde 8%\n..."}
                  className="w-full h-40 bg-foreground/5 border border-primary/10 rounded-2xl p-4 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 custom-scrollbar"
                  value={smartPasteText}
                  onChange={(e) => setSmartPasteText(e.target.value)}
                />
                <button 
                  onClick={handleSmartPaste}
                  className="w-full bg-primary text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                  Analizza e Aggiungi
                </button>
              </div>
            )}
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
        </div>
      </div>
    </div>
  );
}
