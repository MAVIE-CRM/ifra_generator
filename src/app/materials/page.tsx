'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Plus, 
  Download, 
  RefreshCw, 
  Trash2, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  Database,
  ShieldCheck,
  Zap,
  Wind,
  ChevronDown,
  ChevronUp,
  X,
  Trash,
  Info,
  Languages,
  Loader2,
  Euro,
  Eye,
  EyeOff
} from 'lucide-react';

export default function MaterialsPage() {
  const router = useRouter();
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Stati per toggles EN e Varianti Selezionate
  const [showEn, setShowEn] = useState<Record<string, boolean>>({});
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({}); // materialId -> variantId

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/materials');
      const data = await res.json();
      setMaterials(data);
      
      // Pre-seleziona la prima variante disponibile per ogni materiale
      const initialVariants: Record<string, string> = {};
      data.forEach((m: any) => {
        if (m.variants && m.variants.length > 0) {
          const firstAvailable = m.variants.find((v: any) => v.available) || m.variants[0];
          initialVariants[m.id] = firstAvailable.variantId;
        }
      });
      setSelectedVariants(initialVariants);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const [isBulkSyncing, setIsBulkSyncing] = useState(false);

  const handleBulkSync = async () => {
    if (isBulkSyncing || materials.length === 0) return;
    
    const confirm = window.confirm(`Sincronizzare ${materials.length} materiali? Potrebbe richiedere del tempo.`);
    if (!confirm) return;

    setIsBulkSyncing(true);
    let successCount = 0;
    
    try {
      for (const m of materials) {
        if (!m.sourceUrl?.includes('fraterworks.com')) continue;
        
        try {
          const res = await fetch(`/api/materials/${m.id}/sync`, { method: 'POST' });
          if (res.ok) successCount++;
        } catch (e) {
          console.error(`Error syncing ${m.name}:`, e);
        }
      }
      setMessage({ type: 'success', text: `Sincronizzazione completata: ${successCount} materiali aggiornati.` });
      await fetchMaterials();
    } catch (err) {
      setMessage({ type: 'error', text: "Errore durante la sincronizzazione massiva." });
    } finally {
      setIsBulkSyncing(false);
    }
  };

  const handleSync = async (id: string) => {
    setActionId(id);
    try {
      const res = await fetch(`/api/materials/${id}/sync`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: "Materiale sincronizzato con successo." });
        await fetchMaterials(); 
      } else {
        setMessage({ type: 'error', text: data.error || "Errore durante la sincronizzazione." });
      }
    } catch (err) {
      setMessage({ type: 'error', text: "Errore di connessione." });
    } finally {
      setActionId(null);
    }
  };

  const toggleEn = (materialId: string, section: string) => {
    const key = `${materialId}_${section}`;
    setShowEn(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const [aiSearchMode, setAiSearchMode] = useState(false);
  const [aiFilteredIds, setAiFilteredIds] = useState<string[] | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const handleSemanticSearch = async () => {
    if (!search.trim() || aiLoading) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/material-finder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [{ 
            role: 'user', 
            content: `Cerca i materiali più adatti nel database per questa richiesta: "${search}". Rispondi SOLO con la lista degli ID nel formato [ID:id1][ID:id2] ecc. Non aggiungere altro testo.` 
          }] 
        })
      });
      const data = await res.json();
      if (data.message) {
        const matches = data.message.match(/\[ID:(.+?)\]/g);
        if (matches) {
          const ids = matches.map((m: string) => {
            const innerMatch = m.match(/\[ID:(.+?)\]/);
            return innerMatch ? innerMatch[1] : null;
          }).filter(Boolean);
          setAiFilteredIds(ids as string[]);
        } else {
          setAiFilteredIds([]);
        }
      }
    } catch (err) {
      console.error("Semantic search error:", err);
    } finally {
      setAiLoading(false);
    }
  };

  const filteredMaterials = materials.filter(m => {
    // 1. Filtro AI
    if (aiSearchMode && aiFilteredIds) {
      return aiFilteredIds.includes(m.id);
    }
    
    // 2. Filtro Ricerca Testuale
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) || 
                          (m.cas && m.cas.includes(search)) ||
                          (m.supplier && m.supplier.toLowerCase().includes(search.toLowerCase()));
    
    if (!matchesSearch) return false;

    // 3. Filtro Categoria
    if (categoryFilter) {
      const coll = (m.collection || '').toLowerCase();
      const name = m.name.toLowerCase();
      const hasCas = !!m.cas;
      
      // Logica Naturale: Cerca termini chiave in collezione o nome
      const isNatural = coll.includes('oil') || coll.includes('absolute') || coll.includes('natural') || coll.includes('extract') || coll.includes('resin') || coll.includes('balsam') ||
                        name.includes('essential oil') || name.includes('absolute') || name.includes('olio essenziale') || name.includes('assoluta') || name.includes('estratto');

      if (categoryFilter === 'natural') return isNatural;

      if (categoryFilter === 'chemical') {
        // Logica Chemical: Se è marcato come chemical O se ha un CAS e NON è naturale
        return coll.includes('chemical') || name.includes('aroma chemical') || (hasCas && !isNatural);
      }
      
      if (categoryFilter === 'base') {
        return coll.includes('base') || coll.includes('accord') || name.includes('base') || name.includes('accordo');
      }
    }

    return true;
  });

  // --- STATO AI FINDER ---
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<any[]>([
    { role: 'assistant', content: 'Ciao! Sono il tuo cercatore di materiali. Dimmi cosa stai cercando (es. "qualcosa di agrumato per una nota di testa" o "un fissativo per muschi") e lo cercherò nel tuo database.' }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const handleAiSend = async () => {
    if (!aiInput.trim() || aiLoading) return;
    
    const newMessages = [...aiMessages, { role: 'user', content: aiInput }];
    setAiMessages(newMessages);
    setAiInput('');
    setAiLoading(true);

    try {
      const res = await fetch('/api/ai/material-finder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
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

  const locateMaterial = (content: string) => {
    const match = content.match(/\[ID:(.+?)\]/);
    if (match && match[1]) {
      const materialId = match[1];
      const material = materials.find(m => m.id === materialId);
      if (material) {
        setSearch(material.name); // Filtra la lista per nome
        setExpandedId(materialId); // Espandi la scheda
        setIsAiOpen(false); // Chiudi chat
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 pt-6 px-4 relative">
      
      {/* --- AI FINDER SIDEBAR --- */}
      <div className={`fixed top-0 right-0 h-full w-full md:w-96 bg-white shadow-2xl z-[100] transform transition-transform duration-500 ease-out border-l border-slate-200 flex flex-col ${isAiOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
           <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold uppercase tracking-widest text-xs">AI Material Finder</h3>
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
                  ? 'bg-slate-900 text-white rounded-tr-none' 
                  : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'
              }`}>
                <div className="whitespace-pre-wrap">{msg.content.replace(/\[ID:.+?\]/g, '')}</div>
                
                {msg.role === 'assistant' && msg.content.includes('[ID:') && (
                  <button 
                    onClick={() => locateMaterial(msg.content)}
                    className="mt-4 w-full bg-emerald-50 text-emerald-700 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-all flex items-center justify-center gap-2"
                  >
                    <Database className="w-3 h-3" />
                    Vedi Materiale Suggerito
                  </button>
                )}
              </div>
            </div>
          ))}
          {aiLoading && (
            <div className="flex justify-start">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-slate-900 rounded-full animate-bounce" />
                 <div className="w-1.5 h-1.5 bg-slate-900 rounded-full animate-bounce [animation-delay:0.2s]" />
                 <div className="w-1.5 h-1.5 bg-slate-900 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-white border-t border-slate-200">
           <div className="relative">
              <textarea 
                placeholder="Cosa stai cercando?"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 resize-none h-24"
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
                className="absolute bottom-4 right-4 p-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-all"
              >
                <Search className="w-4 h-4" />
              </button>
           </div>
        </div>
      </div>

      {/* --- AI FLOATING BUTTON --- */}
      <button 
        onClick={() => setIsAiOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center shadow-2xl shadow-slate-900/20 hover:scale-110 active:scale-95 transition-all z-50 group"
      >
        <Search className="w-8 h-8 text-white group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-12 right-0 bg-slate-900 text-white text-[10px] font-black py-2 px-4 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
           AI MATERIAL FINDER
        </span>
      </button>

      {/* Header Gestionale */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Material Database</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Gestione Professionale Aromachemicals</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleBulkSync}
            disabled={isBulkSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-all border border-slate-200 disabled:opacity-50"
          >
            {isBulkSyncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isBulkSyncing ? 'Sincronizzazione in corso...' : 'Bulk Sync'}
          </button>
          <Link 
            href="/materials/new"
            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nuovo Materiale
          </Link>
        </div>
      </div>

      {/* Search Bar con AI Toggle */}
      <div className="space-y-4">
        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-slate-900 transition-colors" />
          <input
            type="text"
            placeholder={aiSearchMode ? "Descrivi l'odore o l'effetto che cerchi (AI Search)..." : "Cerca per nome, CAS o fornitore..."}
            className={`w-full pl-14 pr-32 py-5 bg-white border-2 rounded-3xl text-sm font-medium focus:outline-none transition-all ${
              aiSearchMode 
                ? 'border-emerald-500 bg-emerald-50/30 ring-4 ring-emerald-500/10' 
                : 'border-slate-100 focus:border-slate-900'
            }`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && aiSearchMode) {
                handleSemanticSearch();
              }
            }}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {aiSearchMode && (
              <button 
                onClick={handleSemanticSearch}
                disabled={aiLoading}
                className="bg-emerald-600 text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                Chiedi AI
              </button>
            )}
            <button
              onClick={() => {
                setAiSearchMode(!aiSearchMode);
                setAiFilteredIds(null);
                if (!aiSearchMode) setSearch(''); // Pulisci quando attivi
              }}
              className={`p-3 rounded-2xl transition-all ${
                aiSearchMode 
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                  : 'bg-white border border-slate-200 text-slate-400 hover:border-slate-900 hover:text-slate-900'
              }`}
              title={aiSearchMode ? "Disattiva Ricerca AI" : "Attiva Ricerca Semantica AI"}
            >
              <Zap className={`w-4 h-4 ${aiSearchMode ? 'fill-white/20' : ''}`} />
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {(() => {
            const counts = {
              all: materials.length,
              natural: materials.filter(m => {
                 const coll = (m.collection || '').toLowerCase();
                 const name = m.name.toLowerCase();
                 return coll.includes('oil') || coll.includes('absolute') || coll.includes('natural') || coll.includes('extract') || coll.includes('resin') || coll.includes('balsam') ||
                        name.includes('essential oil') || name.includes('absolute') || name.includes('olio essenziale') || name.includes('assoluta') || name.includes('estratto');
              }).length,
              chemical: materials.filter(m => {
                 const coll = (m.collection || '').toLowerCase();
                 const name = m.name.toLowerCase();
                 const isNatural = coll.includes('oil') || coll.includes('absolute') || coll.includes('natural') || coll.includes('extract') || coll.includes('resin') || coll.includes('balsam') ||
                                   name.includes('essential oil') || name.includes('absolute') || name.includes('olio essenziale') || name.includes('assoluta') || name.includes('estratto');
                 return coll.includes('chemical') || name.includes('aroma chemical') || (!!m.cas && !isNatural);
              }).length,
              base: materials.filter(m => {
                 const coll = (m.collection || '').toLowerCase();
                 const name = m.name.toLowerCase();
                 return coll.includes('base') || coll.includes('accord') || name.includes('base') || name.includes('accordo');
              }).length,
            };

            return (
              <>
                <button 
                  onClick={() => setCategoryFilter(null)}
                  className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${!categoryFilter ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'bg-white border border-slate-100 text-slate-400 hover:border-slate-900 hover:text-slate-900'}`}
                >
                  Tutti <span className="opacity-40 text-[8px]">{counts.all}</span>
                </button>
                <button 
                  onClick={() => setCategoryFilter('natural')}
                  className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${categoryFilter === 'natural' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white border border-slate-100 text-slate-400 hover:border-emerald-500 hover:text-emerald-500'}`}
                >
                  🌿 Naturali <span className={categoryFilter === 'natural' ? 'opacity-60 text-[8px]' : 'opacity-40 text-[8px]'}>{counts.natural}</span>
                </button>
                <button 
                  onClick={() => setCategoryFilter('chemical')}
                  className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${categoryFilter === 'chemical' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white border border-slate-100 text-slate-400 hover:border-blue-500 hover:text-blue-500'}`}
                >
                  🧪 Chemicals <span className={categoryFilter === 'chemical' ? 'opacity-60 text-[8px]' : 'opacity-40 text-[8px]'}>{counts.chemical}</span>
                </button>
                <button 
                  onClick={() => setCategoryFilter('base')}
                  className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${categoryFilter === 'base' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'bg-white border border-slate-100 text-slate-400 hover:border-purple-500 hover:text-purple-500'}`}
                >
                  🧱 Basi/Accord <span className={categoryFilter === 'base' ? 'opacity-60 text-[8px]' : 'opacity-40 text-[8px]'}>{counts.base}</span>
                </button>
              </>
            );
          })()}
        </div>

        {/* Info Ricerca AI */}
        {aiSearchMode && aiFilteredIds && (
          <div className="flex items-center justify-between px-6 py-3 bg-emerald-50 rounded-2xl border border-emerald-100 animate-in fade-in slide-in-from-top-2">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">
              Risultati AI per: "{search}" ({filteredMaterials.length})
            </span>
            <button 
              onClick={() => { setAiFilteredIds(null); setSearch(''); }}
              className="text-[10px] font-black text-emerald-700 hover:underline uppercase"
            >
              Reset Filtri AI
            </button>
          </div>
        )}
      </div>

      {loading && materials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <RefreshCw className="w-10 h-10 animate-spin text-slate-200" />
          <p className="text-xs font-bold uppercase tracking-widest text-slate-300">Caricamento Libreria...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map((m) => {
            const isExpanded = expandedId === m.id;
            const isSyncing = actionId === m.id;
            
            const hasAnyIfra = m.ifraLimits && m.ifraLimits.length > 0;
            const hasOfficialIfra = m.ifraLimits?.some((l: any) => l.source === "IFRA");
            
            let ifraLabel = "NON TROVATO";
            let ifraColor = "bg-slate-50 border-slate-200 text-slate-400";
            let ifraIconColor = "text-slate-300";

            if (hasOfficialIfra) {
              ifraLabel = "TROVATO";
              ifraColor = "bg-emerald-50 border-emerald-200 text-emerald-900";
              ifraIconColor = "text-emerald-600";
            } else if (hasAnyIfra) {
              ifraLabel = "TROVATO";
              ifraColor = "bg-amber-50 border-amber-200 text-amber-900";
              ifraIconColor = "text-amber-600";
            }

            const currentVariantId = selectedVariants[m.id];
            const currentVariant = m.variants?.find((v: any) => v.variantId === currentVariantId) || m.variants?.[0];
            
            const mainLimit = m.ifraLimits?.find((l: any) => l.category === 'cat4' || l.category === '4') || m.ifraLimits?.[0];

            return (
              <div 
                key={m.id} 
                className={`bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative h-fit ${
                  isExpanded ? 'lg:col-span-3 md:col-span-2' : ''
                }`}
              >
                <div className="p-6">
                  {/* Card Content */}
                  <div className="space-y-5">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="text-lg font-bold text-slate-900 leading-tight group-hover:text-emerald-700 transition-colors flex items-center flex-wrap gap-2">
                          {m.name}
                          {m.collection && (
                            <span className={`text-[9px] px-2 py-0.5 rounded-lg font-black uppercase tracking-tighter ${
                              m.collection.toLowerCase().includes('chemical') 
                                ? 'bg-blue-100 text-blue-600' 
                                : m.collection.toLowerCase().includes('oil') || m.collection.toLowerCase().includes('absolute') || m.collection.toLowerCase().includes('natural')
                                  ? 'bg-emerald-100 text-emerald-600'
                                  : 'bg-slate-100 text-slate-600'
                            }`}>
                              {m.collection}
                            </span>
                          )}
                        </h3>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-medium text-slate-500">{m.cas || 'CAS non disponibile'}</span>
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">{m.supplier || 'Fornitore Generico'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                         {m.sourceUrl && (
                           <a href={m.sourceUrl} target="_blank" className="p-2 text-slate-300 hover:text-emerald-600 transition-colors"><ExternalLink className="w-4 h-4" /></a>
                         )}
                      </div>
                    </div>

                    {/* IFRA Status */}
                    <div className={`p-4 rounded-2xl border flex flex-col gap-2 ${ifraColor}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className={`w-4 h-4 ${ifraIconColor}`} />
                          <span className="text-[10px] font-black uppercase tracking-widest">IFRA Status</span>
                        </div>
                        <span className="text-[10px] font-bold uppercase">{ifraLabel}</span>
                      </div>
                      
                      {/* Ripristino Visualizzazione Rapida Limite */}
                      {mainLimit && (
                        <div className="mt-1 pt-1 border-t border-black/5 flex items-baseline gap-2">
                           <span className="text-[10px] font-bold opacity-60 uppercase">Cat. {mainLimit.category.replace('cat', '')}:</span>
                           <span className="text-sm font-black">{mainLimit.isNoRestriction ? 'No Limit' : `${mainLimit.limit}%`}</span>
                           {mainLimit.amendment && <span className="text-[8px] font-bold opacity-40 ml-auto">IFRA {mainLimit.amendment}</span>}
                        </div>
                      )}
                    </div>

                    {/* Prezzo Quick View */}
                    {!isExpanded && currentVariant && (
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prezzo {currentVariant.title}</span>
                         <span className="text-sm font-black text-emerald-600">€{currentVariant.price?.toFixed(2)}</span>
                      </div>
                    )}

                    {!isExpanded && (m.odourProfileIt || m.odourProfile) && (
                      <p className="text-xs text-slate-500 line-clamp-2 italic leading-relaxed">
                        "{m.odourProfileIt || m.odourProfile}"
                      </p>
                    )}

                    {/* Actions Row */}
                    <div className="pt-4 flex items-center justify-between gap-3">
                       <button 
                        onClick={() => setExpandedId(isExpanded ? null : m.id)}
                        className={`flex-1 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm ${
                          isExpanded ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        {isExpanded ? 'Chiudi' : 'Dettagli'}
                      </button>
                      <button 
                        onClick={() => handleSync(m.id)}
                        disabled={isSyncing}
                        className="p-2.5 bg-slate-100 text-slate-500 rounded-2xl hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-slate-200"
                      >
                        {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded View */}
                  {isExpanded && (
                    <div className="mt-12 space-y-12 animate-in fade-in slide-in-from-top-4 duration-500 max-w-4xl mx-auto">
                      
                      {/* 1. VARIANTI E PREZZI INTERATTIVI */}
                      {m.variants && m.variants.length > 0 && (
                        <div className="space-y-6">
                           <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
                             <Euro className="w-4 h-4 text-emerald-600" />
                             <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">Prezzi e Varianti Shopify</h4>
                           </div>

                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50 p-8 rounded-3xl border border-slate-200">
                              <div className="space-y-6">
                                 <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Seleziona Variante</label>
                                    <select 
                                      className="w-full bg-white border border-slate-200 p-4 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                      value={currentVariantId}
                                      onChange={(e) => setSelectedVariants(prev => ({ ...prev, [m.id]: e.target.value }))}
                                    >
                                      {m.variants.map((v: any) => (
                                        <option key={v.variantId} value={v.variantId}>
                                          {v.title} {v.available ? '' : '(Esaurito)'}
                                        </option>
                                      ))}
                                    </select>
                                 </div>
                                 <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white rounded-2xl border border-slate-200 flex-1">
                                       <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">ID Variante</span>
                                       <span className="text-xs font-mono font-bold text-slate-600">{currentVariant?.variantId}</span>
                                    </div>
                                    <div className={`p-3 rounded-2xl border flex-1 ${currentVariant?.available ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                                       <span className="text-[9px] font-black uppercase tracking-widest opacity-60 block">Status</span>
                                       <span className="text-xs font-black uppercase tracking-widest">{currentVariant?.available ? 'Disponibile' : 'Esaurito'}</span>
                                    </div>
                                 </div>
                              </div>

                              <div className="flex flex-col items-center justify-center p-8 bg-emerald-600 text-white rounded-3xl shadow-xl shadow-emerald-600/20">
                                 <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-2">Prezzo Totale</span>
                                 <span className="text-5xl font-black">€{currentVariant?.price?.toFixed(2)}</span>
                                 <span className="text-[10px] font-bold mt-4 uppercase tracking-widest opacity-60 italic">Aggiornato da Fraterworks</span>
                              </div>
                           </div>
                        </div>
                      )}

                      {/* 2. SCHEDA TECNICA CON TOGGLE EN */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
                           <FileText className="w-4 h-4 text-emerald-600" />
                           <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">Scheda Tecnica</h4>
                        </div>

                        {[
                          { label: 'Profilo Olfattivo', key: 'odourProfile' },
                          { label: 'Aspetto Fisico', key: 'appearance' },
                          { label: 'Utilizzo Consigliato', key: 'uses' },
                          { label: 'Descrizione', key: 'description' }
                        ].map((section) => {
                          const itValue = m[`${section.key}It` as keyof any];
                          const enValue = m[section.key as keyof any];
                          const showEnKey = `${m.id}_${section.key}`;
                          const isShowingEn = showEn[showEnKey];

                          if (!itValue && !enValue) return null;

                          return (
                            <div key={section.key} className="luxury-section space-y-4">
                               <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{section.label} (IT)</span>
                                  {enValue && (
                                    <button 
                                      onClick={() => toggleEn(m.id, section.key)}
                                      className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                                        isShowingEn ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                      }`}
                                    >
                                      {isShowingEn ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                      {isShowingEn ? 'Nascondi EN' : 'Mostra EN'}
                                    </button>
                                  )}
                               </div>
                               <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                  <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap font-medium">
                                    {itValue || "Traduzione non disponibile"}
                                  </p>
                                  
                                  {isShowingEn && enValue && (
                                    <div className="mt-6 pt-6 border-t border-slate-200 animate-in fade-in slide-in-from-top-2">
                                       <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 block mb-3">Testo Originale (EN)</span>
                                       <p className="text-sm leading-relaxed text-slate-500 italic whitespace-pre-wrap">
                                         {enValue}
                                       </p>
                                    </div>
                                  )}
                               </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* 3. LIMITI IFRA */}
                      {m.ifraLimits && m.ifraLimits.length > 0 && (
                        <div className="space-y-4">
                           <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
                             <ShieldCheck className="w-4 h-4 text-emerald-600" />
                             <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">Sicurezza IFRA</h4>
                           </div>
                           <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                              <table className="w-full text-left text-sm">
                                <thead>
                                  <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <th className="px-6 py-5">Categoria</th>
                                    <th className="px-6 py-5 text-right">Limite Massimo %</th>
                                    <th className="px-6 py-5 text-right">Fonte</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {m.ifraLimits.map((l: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                      <td className="px-6 py-4 font-bold text-slate-700">Cat. {l.category.replace('cat', '')}</td>
                                      <td className="px-6 py-4 text-right font-black text-slate-900">{l.isNoRestriction ? 'NESSUNA RESTRIZIONE' : `${l.limit}%`}</td>
                                      <td className="px-6 py-4 text-right">
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${l.source === 'IFRA' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                          {l.source}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                           </div>
                        </div>
                      )}

                      {/* 4. DOCUMENTI */}
                      {m.documents && m.documents.length > 0 && (
                        <div className="space-y-4">
                           <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
                             <Download className="w-4 h-4 text-emerald-600" />
                             <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">Documenti Disponibili</h4>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {m.documents.map((doc: any) => (
                                <a key={doc.id} href={doc.url} target="_blank" className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-emerald-500 hover:shadow-lg transition-all group">
                                   <div className="flex items-center gap-3">
                                      <FileText className="w-5 h-5 text-slate-300 group-hover:text-emerald-600 transition-colors" />
                                      <div className="flex flex-col">
                                         <span className="text-[10px] font-black uppercase text-slate-400">{doc.type}</span>
                                         <span className="text-xs font-bold text-slate-700">{doc.name}</span>
                                      </div>
                                   </div>
                                   <ExternalLink className="w-3 h-3 text-slate-200 group-hover:text-emerald-500" />
                                </a>
                              ))}
                           </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
