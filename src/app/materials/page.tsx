'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Plus, 
  Download, 
  RefreshCw, 
  Trash2, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  Database,
  ShieldCheck,
  Zap,
  Wind,
  Eye,
  ChevronDown,
  ChevronUp,
  X,
  Trash
} from 'lucide-react';

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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
        setMessage({ type: 'success', text: "Materiale eliminato." });
      }
    } catch (err) {
      setMessage({ type: 'error', text: "Errore durante l'eliminazione." });
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
        setMessage({ type: 'error', text: "Errore: Endpoint di pulizia non configurato." });
      }
    } catch (err) {
      setMessage({ type: 'error', text: "Errore durante la pulizia totale." });
    } finally {
      setLoading(false);
    }
  };

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    (m.cas && m.cas.includes(search)) ||
    (m.supplier && m.supplier.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 pt-10 px-4 md:px-8">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-900 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Database className="w-6 h-6 text-white" />
             </div>
             <h2 className="text-2xl font-black tracking-tighter text-[#1b4332]">IFRA_GENERATOR</h2>
          </div>
          <div className="space-y-1">
            <h1 className="text-6xl font-black tracking-tighter text-[#1b4332] leading-tight">
              Material Database
            </h1>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.4em] ml-1">
              GESTIONE PROFESSIONALE AROMACHEMICALS
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleClearLibrary}
            className="flex items-center gap-2 px-5 py-3.5 bg-red-50 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all border border-red-100"
          >
            <Trash className="w-3.5 h-3.5" />
            Svuota
          </button>
          <Link 
            href="/import/fraterworks-bulk"
            className="flex items-center gap-2 px-5 py-3.5 bg-gray-50 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all border border-gray-200"
          >
            <Download className="w-3.5 h-3.5" />
            Sync
          </Link>
          <Link 
            href="/materials/new"
            className="flex items-center gap-2 px-8 py-3.5 bg-[#1b4332] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#2d6a4f] transition-all shadow-xl shadow-emerald-900/10"
          >
            <Plus className="w-4 h-4" />
            Nuovo
          </Link>
        </div>
      </div>

      {message && (
        <div className={`p-5 rounded-3xl flex items-center gap-4 animate-in fade-in slide-in-from-top-2 border ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm font-bold">{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-auto p-1.5 hover:bg-black/5 rounded-xl">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-300 group-focus-within:text-emerald-600 transition-colors" />
        <input
          type="text"
          placeholder="Cerca per nome, CAS o fornitore..."
          className="w-full bg-white border border-gray-100 focus:border-emerald-500/30 rounded-[2.5rem] pl-20 pr-10 py-7 text-base focus:outline-none focus:ring-[15px] focus:ring-emerald-500/5 transition-all shadow-sm placeholder:text-gray-300 font-medium"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && materials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 space-y-6">
          <RefreshCw className="w-12 h-12 animate-spin text-emerald-100" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300">Caricamento Libreria...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {filteredMaterials.map((m) => (
            <div key={m.id} className="bg-white rounded-[3rem] p-10 flex flex-col hover:shadow-2xl transition-all duration-700 group relative border border-gray-50 shadow-sm">
              <div className="space-y-8">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <h3 className="text-3xl font-black tracking-tight text-[#1b4332] leading-tight">{m.name}</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-400">{m.cas || '3142-72-1'}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-100" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600/70">{m.supplier || 'FRATERWORKS'}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(m.id)}
                    className="p-2 text-gray-100 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                </div>

                {/* IFRA Compliance Box */}
                <div className="p-6 bg-gray-50/50 rounded-[2rem] border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Zap className={`w-5 h-5 ${m.ifraStatus === 'found' ? 'text-emerald-500' : 'text-gray-300'}`} />
                    <span className="text-[12px] font-black uppercase tracking-widest text-gray-500">IFRA Compliance</span>
                  </div>
                  <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                    m.ifraStatus === 'found' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-gray-200/60 text-gray-400'
                  }`}>
                    {m.ifraStatus === 'found' ? 'Conforme' : 'Da Verificare'}
                  </div>
                </div>

                {/* Info Pills */}
                <div className="flex flex-wrap gap-4">
                   {m.odourProfile && (
                     <div className="flex items-center gap-3 px-5 py-3 bg-gray-50/50 rounded-2xl border border-gray-100">
                        <Wind className="w-4 h-4 text-gray-300" />
                        <span className="text-xs font-bold text-gray-600 truncate max-w-[180px]">{m.odourProfile}</span>
                     </div>
                   )}
                   {m.sourceUrl && (
                     <a 
                       href={m.sourceUrl} 
                       target="_blank" 
                       rel="noopener noreferrer" 
                       className="flex items-center gap-3 px-5 py-3 bg-gray-50/50 rounded-2xl border border-gray-100 hover:bg-gray-100 transition-colors"
                     >
                        <ExternalLink className="w-4 h-4 text-gray-300" />
                        <span className="text-xs font-black text-gray-400 uppercase tracking-[0.1em]">Sorgente</span>
                     </a>
                   )}
                </div>
              </div>
            </div>
          ))}
          
          {/* Empty State */}
          {filteredMaterials.length === 0 && !loading && (
            <div className="lg:col-span-3 flex flex-col items-center justify-center py-32 border-2 border-dashed border-gray-100 rounded-[4rem] space-y-8">
               <Database className="w-20 h-20 text-gray-100" />
               <div className="text-center space-y-3">
                  <p className="text-xl font-bold text-gray-300">Libreria vuota</p>
                  <p className="text-xs text-gray-200 uppercase tracking-[0.3em]">Carica dati per iniziare</p>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
}
