'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  Activity,
  ArrowRight,
  RefreshCw,
  Languages
} from 'lucide-react';
import Link from 'next/link';

export default function FraterworksBulkPage() {
  const router = useRouter();
  const [collectionUrl, setCollectionUrl] = useState('https://fraterworks.com/collections/aromachemicals');
  const [pageFrom, setPageFrom] = useState(1);
  const [pageTo, setPageTo] = useState(1);
  const [maxProducts, setMaxProducts] = useState(20);
  const [skipExisting, setSkipExisting] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(false);
  
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importCompleted, setImportCompleted] = useState(false);
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
    setImportCompleted(false);
    setLogs([`Avvio scansione intelligente (Pag. ${pageFrom} - ${pageTo})...`]);
    
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
        setLogs(prev => [...prev, `Scansione completata. Trovati ${data.summary.totalFound} prodotti in ${data.summary.pagesScanned} pagine.`]);
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
    const selectedProducts = products.filter(p => p.selected);
    if (selectedProducts.length === 0) return;

    setImporting(true);
    setImportCompleted(false);
    const newStats = { total: selectedProducts.length, processed: 0, created: 0, updated: 0, skipped: 0, errors: 0 };
    setStats(newStats);
    setLogs(prev => [...prev, `--- AVVIO IMPORTAZIONE SEQUENZIALE (${selectedProducts.length} prodotti) ---`]);

    for (const product of selectedProducts) {
      try {
        setLogs(prev => [...prev, `ELABORAZIONE: ${product.title}...`]);
        
        const res = await fetch('/api/import/fraterworks-single', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            url: product.url, 
            skipExisting, 
            updateExisting 
          })
        });

        const data = await res.json();
        
        if (data.success) {
          if (data.status === 'CREATED') newStats.created++;
          else if (data.status === 'UPDATED' || data.status === 'MERGED') newStats.updated++;
          else if (data.status === 'SKIPPED') newStats.skipped++;
          
          setLogs(prev => [...prev, `SUCCESS: ${data.name || product.title} -> ${data.status} (IFRA: ${data.ifraCount}, Var: ${data.variantCount})`]);
        } else {
          newStats.errors++;
          setLogs(prev => [...prev, `ERROR: ${product.title} -> ${data.error}`]);
        }
      } catch (err: any) {
        newStats.errors++;
        setLogs(prev => [...prev, `CRITICAL: ${product.title} -> ${err.message}`]);
      } finally {
        newStats.processed++;
        setStats({ ...newStats });
      }
      
      // Piccolo delay per non saturare il server o le API di traduzione
      await new Promise(r => setTimeout(r, 200));
    }

    setLogs(prev => [...prev, `--- OPERAZIONE COMPLETATA ---`]);
    setImportCompleted(true);
    router.refresh();
    setImporting(false);
  };

  const toggleProduct = (index: number) => {
    const newProducts = [...products];
    newProducts[index].selected = !newProducts[index].selected;
    setProducts(newProducts);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <Layers className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Collection Scraper v2.1</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-gradient">Fraterworks Bulk Sync</h1>
          <p className="text-foreground/40 text-sm">Sincronizzazione professionale con range di pagine e normalizzazione URL.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.refresh()} 
            className="p-2.5 bg-foreground/5 rounded-xl text-foreground/40 hover:text-primary transition-colors border border-border"
            title="Aggiorna Cache"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link href="/materials" className="flex items-center gap-2 px-5 py-2.5 bg-foreground/5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-foreground/10 transition-all border border-border">
            Vai ai Materiali
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Configurazione */}
        <div className="lg:col-span-4 space-y-6">
          <div className="luxury-card p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Globe className="w-5 h-5" />
              </div>
              <h2 className="text-xs font-black uppercase tracking-widest">Configurazione Scan</h2>
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
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 px-1">A Pagina</label>
                  <input
                    type="number"
                    className="w-full bg-foreground/5 border border-border rounded-xl px-4 py-3 text-xs font-mono"
                    value={pageTo}
                    onChange={(e) => setPageTo(parseInt(e.target.value))}
                    min="1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 px-1">Max Prodotti Totali</label>
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
                    <span className="text-[9px] text-foreground/40">Ignora duplicati esistenti</span>
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
                    <span className="text-[10px] font-black uppercase tracking-widest">Aggiorna Dati</span>
                    <span className="text-[9px] text-foreground/40">Aggiorna se già nel DB</span>
                  </div>
                </label>
              </div>

              <button
                onClick={handleScan}
                disabled={scanning || importing}
                className="w-full bg-primary text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {scanning ? "Scansione..." : "Analizza Pagine"}
              </button>
            </div>
          </div>

          {/* Riepilogo Scansione */}
          {scanSummary && (
            <div className="luxury-card p-6 bg-primary/5 border-primary/20 animate-in zoom-in-95">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Dati Scansione</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[11px]">
                  <span className="text-foreground/40">Pagine scansionate:</span>
                  <span className="font-bold text-primary">{scanSummary.pageFrom} - {scanSummary.pageTo}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-foreground/40">Prodotti unici:</span>
                  <span className="font-bold">{scanSummary.uniqueFound}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-foreground/40">Già nel Database:</span>
                  <span className="font-bold text-amber-500">{scanSummary.alreadyInDatabase}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-foreground/40">Nuovi disponibili:</span>
                  <span className="font-bold text-emerald-500">{scanSummary.newProducts}</span>
                </div>
              </div>
            </div>
          )}

          {/* Report Finale Import */}
          {importCompleted && (
            <div className="luxury-card p-6 bg-emerald-500/5 border-emerald-500/20 animate-in slide-in-from-bottom-4">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Report Finale</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <div className="text-[10px] text-foreground/40 uppercase font-black">Creati</div>
                    <div className="text-xl font-black text-emerald-500">{stats.created}</div>
                 </div>
                 <div className="space-y-1">
                    <div className="text-[10px] text-foreground/40 uppercase font-black">Aggiornati</div>
                    <div className="text-xl font-black text-primary">{stats.updated}</div>
                 </div>
                 <div className="space-y-1">
                    <div className="text-[10px] text-foreground/40 uppercase font-black">Saltati</div>
                    <div className="text-xl font-black text-amber-500">{stats.skipped}</div>
                 </div>
                 <div className="space-y-1">
                    <div className="text-[10px] text-foreground/40 uppercase font-black">Errori</div>
                    <div className="text-xl font-black text-red-500">{stats.errors}</div>
                 </div>
              </div>
              <div className="mt-6 pt-6 border-t border-emerald-500/10">
                 <Link href="/materials" className="w-full py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20">
                    <Database className="w-3.5 h-3.5" />
                    Vai al Database
                 </Link>
              </div>
            </div>
          )}
        </div>

        {/* Risultati e Logs */}
        <div className="lg:col-span-8 space-y-6">
          {products.length > 0 && (
            <div className="luxury-card overflow-hidden animate-in fade-in duration-500">
              <div className="p-4 bg-foreground/[0.03] border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-foreground/60">Coda di Importazione</span>
                </div>
                <button
                  onClick={handleImport}
                  disabled={importing || products.filter(p => p.selected).length === 0}
                  className="bg-emerald-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {importing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 fill-white" />}
                  Importa Selezionati ({products.filter(p => p.selected).length})
                </button>
              </div>

              <div className="max-h-[400px] overflow-y-auto custom-scrollbar divide-y divide-border">
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
                          <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase rounded">In Archivio</span>
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
          <div className="luxury-card bg-[#0A0A0A] overflow-hidden shadow-2xl">
             <div className="px-4 py-2 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <Activity className="w-3 h-3 text-primary" />
                   <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Sync Engine Output</span>
                </div>
                {importing && (
                  <div className="text-[9px] font-mono text-primary animate-pulse">
                    PROCESSING: {stats.processed}/{stats.total}
                  </div>
                )}
             </div>
             <div className="p-6 h-80 overflow-y-auto font-mono text-[10px] space-y-1 custom-scrollbar">
                {logs.length === 0 ? (
                  <div className="text-white/10 italic">Engine in standby. Avvia una scansione...</div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className={`flex gap-3 ${
                      log.includes('ERROR') ? 'text-red-400' : 
                      log.includes('CREATED') || log.includes('SUCCESS') ? 'text-emerald-400' : 
                      log.includes('UPDATED') || log.includes('MERGED') ? 'text-primary' :
                      log.includes('SKIPPED') ? 'text-amber-400' : 'text-white/40'
                    }`}>
                      <span className="opacity-20 text-[8px] w-4">{i+1}</span>
                      <span>{log}</span>
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>
      </div>

      {/* STRUMENTO DI DIAGNOSI TRADUZIONE */}
      <div className="mt-12 p-8 bg-slate-50 rounded-3xl border border-slate-200 shadow-sm max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
            <Languages className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Diagnosi Traduzione Libera</h2>
            <p className="text-sm text-slate-500">Testa i servizi di traduzione (LibreTranslate / MyMemory)</p>
          </div>
        </div>

        <div className="space-y-4">
          <textarea 
            id="test-translate-input"
            className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm min-h-[100px] focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            placeholder="Inserisci un testo in inglese da tradurre..."
          />
          <button 
            onClick={async () => {
              const text = (document.getElementById('test-translate-input') as HTMLTextAreaElement).value;
              if (!text) return alert("Inserisci un testo");
              
              const btn = document.getElementById('btn-test-translate');
              if (btn) btn.innerText = "Test in corso...";
              
              try {
                const res = await fetch('/api/translate/test', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ text })
                });
                const data = await res.json();
                
                const out = document.getElementById('test-translate-output');
                if (out) {
                   out.innerText = JSON.stringify(data.results, null, 2);
                   out.classList.remove('hidden');
                }
              } catch (e) {
                alert("Errore di connessione");
              } finally {
                if (btn) btn.innerText = "Esegui Test Diagnostico";
              }
            }}
            id="btn-test-translate"
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-md"
          >
            Esegui Test Diagnostico
          </button>
          
          <pre id="test-translate-output" className="hidden mt-4 p-4 bg-slate-900 text-emerald-400 text-[10px] rounded-2xl overflow-x-auto border border-slate-800 leading-relaxed" />
        </div>
      </div>
    </div>
  );
}
