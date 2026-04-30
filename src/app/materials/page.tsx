'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Database, Search, Plus, ExternalLink, FileText, RefreshCw, CheckCircle2, AlertCircle, HelpCircle, ChevronDown, ChevronUp, Zap, Wind, Eye, Quote, Trash2, ShieldCheck } from 'lucide-react';

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null); // Per sync e delete loading
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchMaterials = () => {
    setLoading(true);
    fetch('/api/materials')
      .then(res => res.json())
      .then(data => {
        setMaterials(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const handleIfraSync = async (materialId: string) => {
    setActionId(materialId);
    setMessage(null);
    try {
      const response = await fetch(`/api/materials/${materialId}/sync`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: "Materiale sincronizzato con Fraterworks" });
        // Aggiorna il materiale nella lista locale senza refetch totale per velocità
        setMaterials(prev => prev.map(m => m.id === materialId ? data.material : m));
      } else {
        setMessage({ type: 'error', text: data.error || 'Errore durante la sincronizzazione' });
      }
    } catch (error) {
      console.error('Sync error:', error);
      setMessage({ type: 'error', text: 'Eccezione durante la sincronizzazione' });
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (materialId: string) => {
    if (!confirm("Vuoi eliminare definitivamente questo materiale?")) return;
    
    setActionId(materialId);
    setMessage(null);
    try {
      const response = await fetch(`/api/materials/${materialId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setMaterials(prev => prev.filter(m => m.id !== materialId));
      } else {
        setMessage({ type: 'error', text: data.error || "Errore durante l'eliminazione" });
      }
    } catch (error) {
      console.error('Delete error:', error);
      setMessage({ type: 'error', text: "Errore imprevisto durante l'eliminazione" });
    } finally {
      setActionId(null);
    }
  };

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    (m.cas && m.cas.includes(search))
  );

  const getIfraStatusIcon = (status: string | null) => {
    switch (status) {
      case 'found': return <CheckCircle2 className="w-3 h-3 text-emerald-500" />;
      case 'not_found': return <AlertCircle className="w-3 h-3 text-amber-500" />;
      default: return <HelpCircle className="w-3 h-3 text-foreground/30" />;
    }
  };

  const getIfraStatusText = (status: string | null) => {
    switch (status) {
      case 'found': return 'Trovato';
      case 'not_found': return 'Non Trovato';
      case 'to_verify': return 'Da Verificare';
      default: return 'Non Verificato';
    }
  };

  const formatCategory = (cat: string) => {
    if (!cat) return 'N/A';
    return cat.startsWith('Cat.') ? cat : `Cat.${cat}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient">Material Database</h1>
          <p className="text-foreground/60 mt-2">Gestisci la tua collezione e sincronizza i dati normativi.</p>
        </div>
        <Link 
          href="/materials/new"
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-medium hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
        >
          <Plus className="w-4 h-4" />
          Add Material
        </Link>
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

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
        <input
          type="text"
          placeholder="Cerca per nome o numero CAS..."
          className="w-full pl-12 pr-4 py-4 luxury-card focus:outline-none focus:ring-2 focus:ring-primary/20 bg-card"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && materials.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map((material) => {
            const primaryLimit = material.ifraLimits?.[0];
            const isExpanded = expandedId === material.id;
            const isActing = actionId === material.id;

            return (
              <div key={material.id} className={`luxury-card p-6 flex flex-col transition-all duration-500 ${isExpanded ? 'lg:col-span-2 row-span-2' : ''}`}>
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold truncate">{material.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono text-foreground/40">CAS: {material.cas || 'N/A'}</span>
                        {material.referenceCode && <span className="text-[10px] font-mono text-primary/60 uppercase">{material.referenceCode}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        material.ifraStatus === 'found' ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/20' : 
                        material.ifraStatus === 'not_found' ? 'bg-amber-500/5 text-amber-500 border-amber-500/20' : 
                        'bg-foreground/5 text-foreground/40 border-border'
                      }`}>
                        {getIfraStatusIcon(material.ifraStatus)}
                        {getIfraStatusText(material.ifraStatus)}
                      </div>
                      <button 
                        onClick={() => handleDelete(material.id)}
                        disabled={isActing}
                        className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 disabled:opacity-30 transition-colors"
                        title="Elimina Materiale"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                    {primaryLimit ? (
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-bold text-foreground/80 uppercase">
                          IFRA {primaryLimit.amendment} — <span className="text-primary">{primaryLimit.limitText || `${primaryLimit.limit}%`}</span> ({formatCategory(primaryLimit.category)})
                        </span>
                        {primaryLimit.source === 'IFRA' && (
                          <div className="ml-auto" title="Fonte: IFRA Standards Library">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-foreground/40 italic">IFRA non presente</span>
                    )}
                  </div>

                  {/* Descriptive Summary */}
                  <div className="space-y-3 py-2">
                    {(material.appearanceIt || material.appearance) && (
                      <div className="flex items-start gap-2">
                        <Eye className="w-3.5 h-3.5 text-foreground/30 mt-0.5" />
                        <div className="text-xs leading-relaxed">
                           <span className="font-bold text-foreground/40 uppercase text-[9px] block">Aspetto</span>
                           {material.appearanceIt || material.appearance}
                        </div>
                      </div>
                    )}
                    {(material.odourProfileIt || material.odourProfile) && (
                      <div className="flex items-start gap-2">
                        <Wind className="w-3.5 h-3.5 text-foreground/30 mt-0.5" />
                        <div className="text-xs leading-relaxed line-clamp-2">
                           <span className="font-bold text-foreground/40 uppercase text-[9px] block">Profilo Olfattivo</span>
                           {material.odourProfileIt || material.odourProfile}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => setExpandedId(isExpanded ? null : material.id)}
                      className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-1 rounded-full flex items-center gap-1 hover:bg-primary/20"
                    >
                      {isExpanded ? 'Chiudi Dettagli' : 'Mostra Dettagli'}
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    {material.documents.map((doc: any) => (
                      <a 
                        key={doc.id}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold uppercase tracking-wider bg-accent/10 text-accent px-2 py-1 rounded-full flex items-center gap-1 hover:bg-accent/20 transition-colors"
                      >
                        <FileText className="w-3 h-3" />
                        {doc.type}
                      </a>
                    ))}
                  </div>

                  {isExpanded && (
                    <div className="mt-4 space-y-6 animate-in zoom-in-95 duration-300">
                      <div className="grid grid-cols-1 gap-4">
                        {(material.odourProfileIt || material.odourProfile) && (
                          <div className="p-4 bg-background/50 rounded-2xl border border-border">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 italic">Profilo Olfattivo</h4>
                            <p className="text-xs leading-relaxed mb-2 font-medium">{material.odourProfileIt || material.odourProfile}</p>
                            {material.odourProfileIt && material.odourProfileIt !== material.odourProfile && (
                              <p className="text-[10px] text-foreground/30 italic border-t border-border/30 pt-2">Original: {material.odourProfile}</p>
                            )}
                          </div>
                        )}
                        {(material.usesIt || material.uses) && (
                          <div className="p-4 bg-background/50 rounded-2xl border border-border">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent mb-2 italic">Usi e Applicazioni</h4>
                            <p className="text-xs leading-relaxed mb-2 font-medium">{material.usesIt || material.uses}</p>
                            {material.usesIt && material.usesIt !== material.uses && (
                              <p className="text-[10px] text-foreground/30 italic border-t border-border/30 pt-2">Original: {material.uses}</p>
                            )}
                          </div>
                        )}
                      </div>

                      {material.ifraLimits.length > 0 && (
                        <div className="p-4 bg-background/50 rounded-2xl border border-border shadow-inner">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 mb-3">Cronologia Limiti IFRA</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-[11px]">
                              <thead>
                                <tr className="border-b border-border/50">
                                  <th className="py-2 font-bold text-foreground/40 uppercase">Emendamento</th>
                                  <th className="py-2 font-bold text-foreground/40 uppercase">Categoria</th>
                                  <th className="py-2 font-bold text-foreground/40 uppercase">Limite</th>
                                  <th className="py-2 font-bold text-foreground/40 uppercase">Fonte</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/30">
                                {material.ifraLimits.map((limit: any, idx: number) => (
                                  <tr key={idx} className="hover:bg-foreground/5 transition-colors">
                                    <td className="py-2 font-medium">IFRA {limit.amendment || 'N/A'}</td>
                                    <td className="py-2">{formatCategory(limit.category)}</td>
                                    <td className={`py-2 font-bold ${limit.isNoRestriction ? 'text-emerald-500 italic' : 'text-primary'}`}>
                                      {limit.limitText || `${limit.limit}%`}
                                    </td>
                                    <td className="py-2">
                                      <div className="flex items-center gap-1.5">
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase ${
                                          limit.source === 'IFRA' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-foreground/10 text-foreground/40'
                                        }`}>
                                          {limit.source || 'Supplier'}
                                        </span>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="mt-auto pt-6">
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <button 
                      onClick={() => handleIfraSync(material.id)}
                      disabled={isActing}
                      className="text-sm font-bold text-primary hover:text-primary/80 flex items-center gap-2 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${isActing ? 'animate-spin' : ''}`} />
                      {isActing ? 'Sincronizzazione...' : 'Sincronizza FW'}
                    </button>
                    <a 
                      href={material.sourceUrl || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`p-2 hover:bg-foreground/5 rounded-lg transition-colors ${!material.sourceUrl && 'pointer-events-none opacity-20'}`}
                    >
                      <ExternalLink className="w-4 h-4 text-foreground/40" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
  );
}
