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
  HelpCircle
} from 'lucide-react';

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

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
      if (res.ok) setMaterials(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setActionId(null);
    }
  };

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    (m.cas && m.cas.includes(search))
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-gradient">Libreria Materiali</h1>
          <p className="text-foreground/40 text-sm font-medium uppercase tracking-widest mt-1">Gestione Catalogo & Compliance</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link 
            href="/import/fraterworks-bulk"
            className="flex items-center gap-2 px-5 py-3 bg-foreground/5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-foreground/10 transition-all border border-border"
          >
            <Download className="w-4 h-4" />
            Import Massivo
          </Link>
          <Link 
            href="/materials/new"
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-xl shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            Nuovo Materiale
          </Link>
        </div>
      </div>

      {/* Search & Stats */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/20 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Cerca per nome, CAS o fornitore..."
            className="w-full bg-card/50 backdrop-blur-md border border-border focus:border-primary/30 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="px-6 py-4 bg-foreground/5 rounded-2xl border border-border whitespace-nowrap">
           <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mr-3">Totale:</span>
           <span className="text-sm font-black">{materials.length} prodotti</span>
        </div>
      </div>

      {/* Materials List */}
      <div className="luxury-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-foreground/[0.02] border-b border-border">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-foreground/40">Materiale</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-foreground/40">CAS Number</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-foreground/40">IFRA Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-foreground/40 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary/20" />
                  </td>
                </tr>
              ) : filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center text-foreground/30 text-sm">
                    Nessun materiale trovato.
                  </td>
                </tr>
              ) : (
                filteredMaterials.map((m) => (
                  <tr key={m.id} className="hover:bg-foreground/[0.01] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{m.name}</span>
                        <span className="text-[10px] text-foreground/40 font-mono uppercase">{m.supplier || 'Nessun Fornitore'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono text-foreground/60">{m.cas || '---'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        m.ifraStatus === 'found' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                        m.ifraStatus === 'not_found' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                        'bg-foreground/5 text-foreground/40 border-border'
                      }`}>
                        {m.ifraStatus === 'found' ? <CheckCircle2 className="w-3 h-3" /> : <HelpCircle className="w-3 h-3" />}
                        {m.ifraStatus === 'found' ? 'Conforme' : 'Da Verificare'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleDelete(m.id)}
                          disabled={actionId === m.id}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Elimina"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {m.sourceUrl && (
                          <a
                            href={m.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all"
                            title="Vedi Sorgente"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
