'use client';

import { useState } from 'react';
import { 
  Zap, 
  Search, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Globe, 
  Database, 
  ListChecks,
  Clock,
  ChevronRight,
  Filter,
  Check,
  Info,
  Layers,
  Activity
} from 'lucide-react';
import Link from 'next/link';

export default function FraterworksBulkPage() {
  const [collectionUrl, setCollectionUrl] = useState('https://fraterworks.com/collections/aromachemicals');
  const [pageFrom, setPageFrom] = useState(1);
  const [pageTo, setPageTo] = useState(1);
  const [maxProducts, setMaxProducts] = useState(20);
  const [skipExisting, setSkipExisting] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(false);
  
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [scanSummary, setScanSummary] = useState<any>(null);
  
  const [stats, setStats] = useState({
    total: 0,
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0
  });
  const [logs, setLogs] = useState<string[]>([]);

  const handleScan = async () => {
    setScanning(true);
    setProducts([]);
    setScanSummary(null);
    setLogs(["Avvio scansione intelligente..."]);
    
    try {
      const res = await fetch('/api/import/fraterworks-scan-collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionUrl, pageFrom, pageTo, maxProducts })
      });
      
      const data = await res.json();
      if (data.success) {
        setProducts(data.products.map((p: any) => ({ ...p, selected: !p.existsInDatabase })));
        setScanSummary(data.summary);
        setLogs(prev => [...prev, `Scansione completata. Trovati ${data.summary.totalFound} prodotti.`]);
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
    setStats({ total: selectedUrls.length, processed: 0, created: 0, updated: 0, skipped: 0, errors: 0 });
    setLogs(prev => [...prev, `Inizio importazione di ${selectedUrls.length} prodotti...`]);

    try {
      const res = await fetch('/api/import/fraterworks-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productUrls: selectedUrls, 
          skipExisting, 
          updateExisting 
        })
      });

      const data = await res.json();
      if (data.success) {
        setStats({
          total: selectedUrls.length,
          processed: data.results.processed,
          created: data.results.created,
          updated: data.results.updated,
          skipped: data.results.skipped,
          errors: data.results.errors
        });
        setLogs(prev => [...prev, ...data.results.logs]);
        setLogs(prev => [...prev, "Operazione completata."]);
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

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <Layers className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Advanced Import v2</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-gradient">Fraterworks Bulk Sync</h1>
          <p className="text-foreground/40 text-sm">Sincronizzazione intelligente basata su range di pagine e deduplicazione automatica.</p>
        </div>
        <Link href="/materials" className="px-5 py-2.5 bg-foreground/5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-foreground/10 transition-all border border-border">
          Torna ai Materiali
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Configurazione */}
        <div className="lg:col-span-4 space-y-6">
          <div className="luxury-card p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Globe className="w-5 h-5" />
              </div>
              <h2 className="text-xs font-black uppercase tracking-widest">Configurazione</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 px-1">URL Collection</label>
                <input
                  type="text"
                  className="w-full bg-foreground/5 border border-border rounded-xl px-4 py-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  value={collectionUrl}
                  onChange={(e) => setCollectionUrl(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 px-1">Da Pagina</label>
                  <input
                    type="number"
                    className="w-full bg-foreground/5 border border-border rounded-xl px-4 py-3 text-xs font-mono"
                    value={pageFrom}
                    onChange={(e) => setPageFrom(parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 px-1">A Pagina</label>
                  <input
                    type="number"
                    className="w-full bg-foreground/5 border border-border rounded-xl px-4 py-3 text-xs font-mono"
                    value={pageTo}
                    onChange={(e) => setPageTo(parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 px-1">Max Prodotti</label>
                <input
                  type="number"
                  className="w-full bg-foreground/5 border border-border rounded-xl px-4 py-3 text-xs font-mono"
                  value={maxProducts}
                  onChange={(e) => setMaxProducts(parseInt(e.target.value))}
                />
              </div>

              <div className="pt-4 space-y-3">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-foreground/[0.02] cursor-pointer transition-all">
                  <input 
                    type="checkbox" 
                    checked={skipExisting} 
                    onChange={(e) => setSkipExisting(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest">Salta Presenti</span>
                    <span className="text-[9px] text-foreground/40">Non importare se già nel DB</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-foreground/[0.02] cursor-pointer transition-all">
                  <input 
                    type="checkbox" 
                    checked={updateExisting} 
                    onChange={(e) => setUpdateExisting(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest">Aggiorna Presenti</span>
                    <span className="text-[9px] text-foreground/40">Sincronizza se già nel DB</span>
                  </div>
                </label>
              </div>

              <button
                onClick={handleScan}
                disabled={scanning || importing}
                className="w-full bg-primary text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {scanning ? "Scansione..." : "Avvia Scansione"}
              </button>
            </div>
          </div>

          {/* Riepilogo Scansione */}
          {scanSummary && (
            <div className="luxury-card p-6 bg-primary/5 border-primary/20 animate-in zoom-in-95">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Esito Scansione</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[11px]">
                  <span className="text-foreground/40">Prodotti trovati:</span>
                  <span className="font-bold">{scanSummary.totalFound}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-foreground/40">Pagine lette:</span>
                  <span className="font-bold">{scanSummary.pagesScanned}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-foreground/40">Già nel Database:</span>
                  <span className="font-bold text-amber-500">{scanSummary.alreadyInDatabase}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-foreground/40">Nuovi Prodotti:</span>
                  <span className="font-bold text-emerald-500">{scanSummary.newProducts}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Risultati */}
        <div className="lg:col-span-8 space-y-6">
          {products.length > 0 && (
            <div className="luxury-card overflow-hidden">
              <div className="p-4 bg-foreground/[0.03] border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-foreground/60">Selezione Prodotti</span>
                </div>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="bg-emerald-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  {importing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 fill-white" />}
                  Importa ({products.filter(p => p.selected).length})
                </button>
              </div>

              <div className="max-h-[500px] overflow-y-auto custom-scrollbar divide-y divide-border">
                {products.map((product, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 hover:bg-foreground/[0.01] transition-colors">
                    <input 
                      type="checkbox" 
                      checked={product.selected} 
                      onChange={() => toggleProduct(idx)}
                      className="w-4 h-4 rounded border-border text-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold truncate">{product.title}</span>
                        {product.existsInDatabase && (
                          <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase rounded">DB</span>
                        )}
                      </div>
                      <div className="text-[9px] text-foreground/30 truncate font-mono">{product.url}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-foreground/10" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Terminal Logs */}
          <div className="luxury-card bg-[#0A0A0A] overflow-hidden">
             <div className="px-4 py-2 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <Activity className="w-3 h-3 text-primary" />
                   <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Sync Engine Logs</span>
                </div>
                {importing && (
                  <div className="text-[9px] font-mono text-primary animate-pulse">
                    PROGRESS: {stats.processed}/{stats.total}
                  </div>
                )}
             </div>
             <div className="p-6 h-80 overflow-y-auto font-mono text-[10px] space-y-1 custom-scrollbar">
                {logs.length === 0 ? (
                  <div className="text-white/10 italic">In attesa di scansione...</div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className={`flex gap-3 ${log.includes('ERROR') ? 'text-red-400' : log.includes('SUCCESS') ? 'text-emerald-400' : log.includes('SKIPPED') ? 'text-amber-400' : 'text-white/40'}`}>
                      <span className="opacity-20">{i+1}</span>
                      <span>{log}</span>
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
