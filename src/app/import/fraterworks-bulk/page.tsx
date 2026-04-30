'use client';

import { useState } from 'react';
import { 
  Zap, 
  Search, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  Globe, 
  Database, 
  ListChecks,
  FileText,
  Clock,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';

export default function FraterworksBulkPage() {
  const [collectionUrl, setCollectionUrl] = useState('https://fraterworks.com/collections/aromachemicals');
  const [maxPages, setMaxPages] = useState(3);
  const [limit, setLimit] = useState(20);
  
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [products, setProducts] = useState<Array<{ title: string; url: string; selected: boolean }>>([]);
  
  const [stats, setStats] = useState({
    total: 0,
    processed: 0,
    created: 0,
    updated: 0,
    errors: 0
  });
  const [logs, setLogs] = useState<string[]>([]);

  const handleScan = async () => {
    setScanning(true);
    setProducts([]);
    setLogs(["Avvio scansione collection..."]);
    
    try {
      const res = await fetch('/api/import/fraterworks-scan-collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionUrl, maxPages })
      });
      
      const data = await res.json();
      if (data.success) {
        setProducts(data.products.map((p: any) => ({ ...p, selected: true })));
        setLogs(prev => [...prev, `Scansione completata. Trovati ${data.products.length} prodotti.`]);
      } else {
        setLogs(prev => [...prev, `ERRORE: ${data.error}`]);
      }
    } catch (err: any) {
      setLogs(prev => [...prev, `ERRORE: ${err.message}`]);
    } finally {
      setScanning(false);
    }
  };

  const handleImport = async () => {
    const selectedUrls = products.filter(p => p.selected).map(p => p.url);
    if (selectedUrls.length === 0) return;

    setImporting(true);
    setStats({ total: selectedUrls.length, processed: 0, created: 0, updated: 0, errors: 0 });
    setLogs(prev => [...prev, `Avvio importazione di ${selectedUrls.length} prodotti...`]);

    try {
      const res = await fetch('/api/import/fraterworks-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productUrls: selectedUrls, limit })
      });

      const data = await res.json();
      if (data.success) {
        setStats(prev => ({
          ...prev,
          processed: data.results.processed,
          created: data.results.created,
          updated: data.results.updated,
          errors: data.results.errors
        }));
        setLogs(prev => [...prev, ...data.results.logs]);
        setLogs(prev => [...prev, "Importazione completata con successo."]);
      } else {
        setLogs(prev => [...prev, `ERRORE CRITICO: ${data.error}`]);
      }
    } catch (err: any) {
      setLogs(prev => [...prev, `ERRORE: ${err.message}`]);
    } finally {
      setImporting(false);
    }
  };

  const toggleProduct = (index: number) => {
    const newProducts = [...products];
    newProducts[index].selected = !newProducts[index].selected;
    setProducts(newProducts);
  };

  const selectAll = (val: boolean) => {
    setProducts(products.map(p => ({ ...p, selected: val })));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <Download className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-widest">Supplier Sync</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-gradient">Fraterworks Bulk Import</h1>
          <p className="text-foreground/60 text-sm">Sincronizza massivamente la tua libreria con il catalogo ufficiale Fraterworks.</p>
        </div>
        <Link href="/import" className="px-4 py-2 bg-foreground/5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-foreground/10 transition-all border border-border">
          Torna al Centro Import
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Configurazione */}
        <div className="lg:col-span-4 space-y-6">
          <div className="luxury-card p-6 space-y-6 bg-card/30 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Globe className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-black uppercase tracking-widest">Sorgente Collection</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 px-1">URL Collection Shopify</label>
                <input
                  type="text"
                  className="w-full bg-foreground/5 border border-border focus:border-primary/30 rounded-xl px-4 py-3 text-sm font-medium transition-all"
                  value={collectionUrl}
                  onChange={(e) => setCollectionUrl(e.target.value)}
                  placeholder="https://fraterworks.com/collections/..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 px-1">Max Pagine</label>
                  <input
                    type="number"
                    className="w-full bg-foreground/5 border border-border focus:border-primary/30 rounded-xl px-4 py-3 text-sm font-mono transition-all"
                    value={maxPages}
                    onChange={(e) => setMaxPages(parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 px-1">Max Prodotti</label>
                  <input
                    type="number"
                    className="w-full bg-foreground/5 border border-border focus:border-primary/30 rounded-xl px-4 py-3 text-sm font-mono transition-all"
                    value={limit}
                    onChange={(e) => setLimit(parseInt(e.target.value))}
                  />
                </div>
              </div>

              <button
                onClick={handleScan}
                disabled={scanning || importing}
                className="w-full bg-primary text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {scanning ? "Scansione in corso..." : "Scansiona Collection"}
              </button>
            </div>
          </div>

          {/* Statistiche Real-time */}
          <div className="luxury-card p-6 bg-foreground/[0.02] border-dashed border-border space-y-6">
             <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest">Progress Stats</span>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-background rounded-2xl border border-border flex flex-col items-center">
                   <span className="text-2xl font-black tracking-tighter">{stats.processed} / {stats.total}</span>
                   <span className="text-[8px] font-bold uppercase tracking-widest opacity-40">Processati</span>
                </div>
                <div className="p-4 bg-background rounded-2xl border border-border flex flex-col items-center">
                   <span className="text-2xl font-black tracking-tighter text-emerald-500">{stats.created + stats.updated}</span>
                   <span className="text-[8px] font-bold uppercase tracking-widest opacity-40">Salvati</span>
                </div>
                <div className="p-4 bg-background rounded-2xl border border-border flex flex-col items-center">
                   <span className="text-2xl font-black tracking-tighter text-amber-500">{stats.errors}</span>
                   <span className="text-[8px] font-bold uppercase tracking-widest opacity-40">Errori</span>
                </div>
                <div className="p-4 bg-background rounded-2xl border border-border flex flex-col items-center">
                   <span className="text-2xl font-black tracking-tighter text-primary">0.5s</span>
                   <span className="text-[8px] font-bold uppercase tracking-widest opacity-40">Delay</span>
                </div>
             </div>

             {importing && (
               <div className="w-full bg-foreground/5 h-1.5 rounded-full overflow-hidden">
                 <div 
                   className="bg-primary h-full transition-all duration-500" 
                   style={{ width: `${(stats.processed / stats.total) * 100}%` }}
                 />
               </div>
             )}
          </div>
        </div>

        {/* Risultati e Log */}
        <div className="lg:col-span-8 space-y-6">
          {products.length > 0 && (
            <div className="luxury-card overflow-hidden">
              <div className="p-4 bg-foreground/[0.03] border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-primary" />
                  <span className="text-xs font-black uppercase tracking-widest">Prodotti Trovati ({products.length})</span>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => selectAll(true)} className="text-[10px] font-bold uppercase text-primary hover:underline">Seleziona Tutti</button>
                  <button onClick={() => selectAll(false)} className="text-[10px] font-bold uppercase text-foreground/40 hover:underline">Deseleziona</button>
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto custom-scrollbar divide-y divide-border">
                {products.map((product, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 hover:bg-foreground/[0.01] transition-colors group">
                    <input 
                      type="checkbox" 
                      checked={product.selected} 
                      onChange={() => toggleProduct(idx)}
                      className="w-4 h-4 rounded-md border-border text-primary focus:ring-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">{product.title}</div>
                      <div className="text-[10px] text-foreground/30 truncate font-mono">{product.url}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-foreground/10 group-hover:text-primary/40 transition-colors" />
                  </div>
                ))}
              </div>

              <div className="p-6 bg-foreground/[0.02] border-t border-border">
                <button
                  onClick={handleImport}
                  disabled={importing || scanning || products.filter(p => p.selected).length === 0}
                  className="w-full bg-emerald-500 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-white/20" />}
                  {importing ? "Importazione in corso..." : `Importa ${products.filter(p => p.selected).length} prodotti selezionati`}
                </button>
              </div>
            </div>
          )}

          {/* Terminal Logs */}
          <div className="luxury-card bg-[#0A0A0A] border-border/50 overflow-hidden shadow-2xl">
             <div className="px-4 py-2 border-b border-white/5 bg-white/5 flex items-center gap-2">
                <div className="flex gap-1.5">
                   <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                   <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20" />
                   <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/40 ml-2">Import System Logs</span>
             </div>
             <div className="p-6 h-64 overflow-y-auto font-mono text-[11px] space-y-1 custom-scrollbar">
                {logs.length === 0 ? (
                  <div className="text-white/20 italic">In attesa di operazioni...</div>
                ) : (
                  logs.map((log, i) => {
                    const isError = log.includes('ERROR');
                    const isSuccess = log.includes('SUCCESS');
                    return (
                      <div key={i} className={`flex gap-3 ${isError ? 'text-red-400' : isSuccess ? 'text-emerald-400' : 'text-white/60'}`}>
                        <span className="opacity-20">[{new Date().toLocaleTimeString()}]</span>
                        <span>{log}</span>
                      </div>
                    );
                  })
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
