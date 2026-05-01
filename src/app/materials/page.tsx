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
  Scale,
  FlaskConical
} from 'lucide-react';

export default function MaterialsPage() {
  const router = useRouter();
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/materials');
      const data = await res.json();
      setMaterials(data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminare definitivamente questo materiale?")) return;
    setActionId(id);
    try {
      const res = await fetch(`/api/materials/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMaterials(prev => prev.filter(m => m.id !== id));
        setMessage({ type: 'success', text: "Materiale rimosso dalla libreria." });
      }
    } catch (err) {
      setMessage({ type: 'error', text: "Errore durante l'eliminazione." });
    } finally {
      setActionId(null);
    }
  };

  const handleSync = async (id: string) => {
    setActionId(id);
    try {
      const res = await fetch(`/api/materials/${id}/sync`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: "Materiale sincronizzato con successo." });
        await fetchMaterials(); // Ricarica dati
      } else {
        setMessage({ type: 'error', text: data.error || "Errore durante la sincronizzazione." });
      }
    } catch (err) {
      setMessage({ type: 'error', text: "Errore di connessione." });
    } finally {
      setActionId(null);
    }
  };

  const handleClearLibrary = async () => {
    if (!confirm("ATTENZIONE: Stai per eliminare TUTTI i materiali dal database. Questa operazione non è reversibile. Procedere?")) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/materials/clear', { method: 'DELETE' });
      if (res.ok) {
        setMaterials([]);
        setMessage({ type: 'success', text: "Libreria svuotata con successo." });
      } else {
        setMessage({ type: 'error', text: "Errore durante la pulizia." });
      }
    } catch (err) {
      setMessage({ type: 'error', text: "Errore tecnico durante la pulizia." });
    } finally {
      setLoading(false);
    }
  };

  const formatCategory = (cat: string) => {
    return cat.replace('cat', 'Cat. ');
  };

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    (m.cas && m.cas.includes(search)) ||
    (m.supplier && m.supplier.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 pt-6 px-4">
      {/* Header Gestionale */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Material Database</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Gestione Professionale Aromachemicals</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleClearLibrary}
            className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold hover:bg-red-50 hover:text-red-600 transition-all border border-slate-200"
          >
            <Trash className="w-4 h-4" />
            Svuota Database
          </button>
          <a 
            href="/import/fraterworks-bulk"
            className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-all border border-slate-200"
          >
            <Download className="w-4 h-4" />
            Bulk Sync
          </a>
          <a 
            href="/materials/new"
            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nuovo Materiale
          </a>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 border ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm font-semibold">{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-auto p-1 hover:bg-black/5 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Cerca per nome, CAS o fornitore..."
          className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-2xl pl-14 pr-6 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-sm placeholder:text-slate-400"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
            
            // Logica Status IFRA
            const hasAnyIfra = m.ifraLimits?.length > 0;
            const hasOfficialIfra = m.ifraLimits?.some((l: any) => l.source === "IFRA");
            const hasFraterworksIfra = m.ifraLimits?.some((l: any) => l.source === "Fraterworks");
            
            let ifraLabel = "NON TROVATO";
            let ifraColor = "bg-slate-50 border-slate-200 text-slate-400";
            let ifraIconColor = "text-slate-300";
            let ifraSourceLabel = "";

            if (hasOfficialIfra) {
              ifraLabel = "TROVATO";
              ifraColor = "bg-emerald-50 border-emerald-200 text-emerald-900";
              ifraIconColor = "text-emerald-600";
              ifraSourceLabel = "Fonte Ufficiale IFRA";
            } else if (hasFraterworksIfra) {
              ifraLabel = "TROVATO";
              ifraColor = "bg-amber-50 border-amber-200 text-amber-900";
              ifraIconColor = "text-amber-600";
              ifraSourceLabel = "Fonte Fraterworks";
            }

            const mainLimit = m.ifraLimits?.find((l: any) => l.category === 'cat4') || m.ifraLimits?.[0];
            
            return (
              <div 
                key={m.id} 
                className={`bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative h-fit ${
                  isExpanded ? 'lg:col-span-3 md:col-span-2' : ''
                }`}
              >
                <div className="p-6">
                  {/* Card Header & Content */}
                  <div className="space-y-5">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="text-lg font-bold text-slate-900 leading-tight group-hover:text-emerald-700 transition-colors">{m.name}</h3>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-slate-500">{m.cas || 'CAS non disponibile'}</span>
                          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{m.supplier || 'Fornitore Generico'}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDelete(m.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    {/* IFRA Focus Box (Dynamic Colors) */}
                    <div className={`p-4 rounded-xl border flex flex-col gap-2 ${ifraColor}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className={`w-4 h-4 ${ifraIconColor}`} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Status IFRA</span>
                        </div>
                        <span className="text-[10px] font-bold uppercase">{ifraLabel}</span>
                      </div>
                      
                      <div className="mt-1">
                        {mainLimit ? (
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-bold opacity-70">IFRA {mainLimit.amendment || '49'} — {formatCategory(mainLimit.category)}:</span>
                            <span className="text-lg font-black">{mainLimit.isNoRestriction ? 'No Limit' : `${mainLimit.limit}%`}</span>
                          </div>
                        ) : (
                          <p className="text-xs font-semibold italic opacity-60">IFRA non presente</p>
                        )}
                        {ifraSourceLabel && <p className="text-[9px] font-bold uppercase opacity-50 mt-1 tracking-tighter">{ifraSourceLabel}</p>}
                      </div>
                    </div>

                    {/* Odour Description - Preview */}
                    {!isExpanded && (m.odourProfileIt || m.odourProfile) && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Wind className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Profilo Olfattivo</span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed italic">
                          "{m.odourProfileIt || m.odourProfile}"
                        </p>
                      </div>
                    )}

                    {/* Documents */}
                    <div className="flex flex-wrap gap-2">
                      {m.documents?.map((doc: any) => (
                        <a 
                          key={doc.id}
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold hover:bg-slate-200 transition-colors border border-slate-200"
                        >
                          <FileText className="w-3 h-3 text-slate-400" />
                          {doc.type}
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setExpandedId(isExpanded ? null : m.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm ${
                          isExpanded ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        {isExpanded ? 'Chiudi' : 'Dettagli'}
                      </button>
                      
                      <button 
                        disabled={isSyncing}
                        onClick={() => handleSync(m.id)}
                        className={`p-2 rounded-xl transition-all border flex items-center gap-2 ${
                          isSyncing ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 border-slate-200 hover:border-emerald-100'
                        }`}
                        title="Sincronizza Dati Shopify/IFRA"
                      >
                        {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      </button>

                      <button 
                        onClick={async () => {
                          const confirm = window.confirm("Vuoi ritradurre questo materiale?");
                          if (!confirm) return;
                          handleSync(m.id); // Riutilizziamo la logica di sync che include traduzione
                        }}
                        className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-slate-200 hover:border-emerald-100"
                        title="Ritraduci Materiale (IT)"
                      >
                        <Languages className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {m.sourceUrl && (
                      <a 
                        href={m.sourceUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  {/* Expanded Technical Sheet */}
                  {isExpanded && (
                    <div className="mt-8 pt-8 border-t border-slate-100 animate-in fade-in slide-in-from-top-4 duration-500 max-w-4xl mx-auto w-full space-y-12">
                      
                      {/* 1. PREZZI E VARIANTI SHOPIFY */}
                      {m.variants && m.variants.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                            <Euro className="w-4 h-4 text-emerald-600" />
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">Prezzi e Varianti Shopify</h4>
                          </div>
                          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                            <table className="w-full text-left text-sm">
                              <thead>
                                <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-[9px] tracking-widest">
                                  <th className="px-6 py-4">Opzione / Peso</th>
                                  <th className="px-6 py-4 text-right">Prezzo Unitario</th>
                                  <th className="px-6 py-4 text-center">Disponibilità</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {m.variants.map((v: any) => (
                                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-700">{v.title}</td>
                                    <td className="px-6 py-4 font-black text-right text-emerald-600">€{v.price?.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-center">
                                      <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${v.available ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                        {v.available ? 'In Stock' : 'Esaurito'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* 2. SCHEDA TECNICA */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                          <FileText className="w-4 h-4 text-emerald-600" />
                          <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">Dettagli Tecnici</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-6">
                          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">Profilo Olfattivo (IT)</span>
                            <p className="text-sm leading-7 text-slate-700 whitespace-pre-wrap font-medium">{m.odourProfileIt || "Traduzione non disponibile"}</p>
                          </div>

                          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">Aspetto Fisico</span>
                            <p className="text-sm leading-7 text-slate-700 font-medium">{m.appearanceIt || "Traduzione non disponibile"}</p>
                          </div>

                          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">Utilizzo Consigliato</span>
                            <p className="text-sm leading-7 text-slate-700 font-medium">{m.usesIt || "Traduzione non disponibile"}</p>
                          </div>
                        </div>
                      </div>

                      {/* 3. LIMITI IFRA */}
                      {m.ifraLimits && m.ifraLimits.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">Limiti di Utilizzo IFRA</h4>
                          </div>
                          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                            <table className="w-full text-left text-sm">
                              <thead>
                                <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-[9px] tracking-widest">
                                  <th className="px-6 py-4">Categoria</th>
                                  <th className="px-6 py-4 text-right">Limite %</th>
                                  <th className="px-6 py-4 text-right">Fonte</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {m.ifraLimits.map((limit: any, idx: number) => (
                                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-semibold text-slate-700">{formatCategory(limit.category)}</td>
                                    <td className="px-6 py-4 font-bold text-right text-slate-900">
                                      {limit.isNoRestriction ? 'NESSUNA RESTRIZIONE' : `${limit.limit}%`}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${limit.source === 'IFRA' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {limit.source}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* 4. DOCUMENTI TECNICI */}
                      {m.documents && m.documents.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                            <Download className="w-4 h-4 text-emerald-600" />
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">Documentazione Tecnica</h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {m.documents.map((doc: any) => (
                              <a 
                                key={doc.id}
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-emerald-500 hover:shadow-md transition-all group"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-emerald-50 transition-colors">
                                    <FileText className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{doc.type}</span>
                                    <span className="text-xs font-bold text-slate-700">{doc.name}</span>
                                  </div>
                                </div>
                                <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-emerald-600" />
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
          
          {/* Empty State */}
          {filteredMaterials.length === 0 && !loading && (
            <div className="lg:col-span-3 flex flex-col items-center justify-center py-32 bg-white border-2 border-dashed border-slate-200 rounded-[2rem] space-y-6">
               <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                  <Database className="w-10 h-10 text-slate-200" />
               </div>
               <div className="text-center space-y-2">
                  <p className="text-lg font-bold text-slate-400">Database Materiali Vuoto</p>
                  <p className="text-xs text-slate-300 font-semibold uppercase tracking-[0.2em]">Esegui un Bulk Sync per popolare la libreria</p>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
