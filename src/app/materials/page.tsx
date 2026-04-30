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
      // Usiamo l'endpoint esistente o uno nuovo? 
      // Per velocità facciamo un loop o un endpoint dedicato. 
      // Creiamo un endpoint dedicato /api/materials/clear per sicurezza
      const res = await fetch('/api/materials/clear', { method: 'DELETE' });
      if (res.ok) {
        setMaterials([]);
        setMessage({ type: 'success', text: "Libreria svuotata con successo." });
      } else {
        // Fallback: se l'endpoint non esiste ancora, diamo errore istruttivo
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
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter text-gradient">Material Database</h1>
          <p className="text-foreground/40 text-sm font-medium uppercase tracking-widest">Gestione Professionale Aromachemicals</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleClearLibrary}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all border border-red-500/20"
          >
            <Trash className="w-3.5 h-3.5" />
            Svuota Libreria
          </button>
          <Link 
            href="/import/fraterworks-bulk"
            className="flex items-center gap-2 px-4 py-2.5 bg-foreground/5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-foreground/10 transition-all border border-border"
          >
            <Download className="w-3.5 h-3.5" />
            Bulk Sync
          </Link>
          <Link 
            href="/materials/new"
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            Nuovo
          </Link>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 border ${
          message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm font-medium">{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-auto p-1 hover:bg-foreground/10 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/20 group-focus-within:text-primary transition-colors" />
        <input
          type="text"
          placeholder="Cerca per nome, CAS o fornitore..."
          className="w-full bg-card/50 backdrop-blur-xl border border-border focus:border-primary/30 rounded-3xl pl-14 pr-6 py-5 text-sm focus:outline-none focus:ring-8 focus:ring-primary/5 transition-all shadow-inner"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && materials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <RefreshCw className="w-10 h-10 animate-spin text-primary/20" />
          <p className="text-[10px] font-black uppercase tracking-widest text-foreground/20">Caricamento Libreria...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map((m) => (
            <div key={m.id} className="luxury-card p-6 flex flex-col hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 group relative overflow-hidden">
              {/* Badge Fornitore */}
              <div className="absolute -right-8 -top-8 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
              
              <div className="space-y-4 relative z-10">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="text-lg font-black tracking-tight leading-tight">{m.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-foreground/40">{m.cas || 'NO CAS'}</span>
                      <span className="w-1 h-1 rounded-full bg-foreground/10" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">{m.supplier || 'Generic'}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(m.id)}
                    className="p-2 text-foreground/10 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 bg-foreground/5 rounded-2xl border border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className={`w-3.5 h-3.5 ${m.ifraStatus === 'found' ? 'text-amber-500' : 'text-foreground/20'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground/60">IFRA Compliance</span>
                  </div>
                  <div className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                    m.ifraStatus === 'found' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-foreground/10 text-foreground/40'
                  }`}>
                    {m.ifraStatus === 'found' ? 'Conforme' : 'Da Verificare'}
                  </div>
                </div>

                {/* Info Pills */}
                <div className="flex flex-wrap gap-2">
                   {m.odourProfile && (
                     <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 rounded-lg border border-primary/10">
                        <Wind className="w-3 h-3 text-primary/40" />
                        <span className="text-[9px] font-bold text-foreground/70 truncate max-w-[120px]">{m.odourProfile}</span>
                     </div>
                   )}
                   {m.sourceUrl && (
                     <a 
                       href={m.sourceUrl} 
                       target="_blank" 
                       rel="noopener noreferrer" 
                       className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground/5 rounded-lg border border-border hover:bg-foreground/10 transition-colors"
                     >
                        <ExternalLink className="w-3 h-3 text-foreground/40" />
                        <span className="text-[9px] font-bold text-foreground/40 uppercase">Sorgente</span>
                     </a>
                   )}
                </div>
              </div>
            </div>
          ))}
          
          {/* Empty State */}
          {filteredMaterials.length === 0 && !loading && (
            <div className="lg:col-span-3 flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-3xl space-y-4">
               <Database className="w-12 h-12 text-foreground/10" />
               <div className="text-center">
                  <p className="text-sm font-bold text-foreground/40">Nessun materiale in libreria</p>
                  <p className="text-[10px] text-foreground/20 uppercase tracking-widest mt-1">Usa il Bulk Sync per caricare i dati</p>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
