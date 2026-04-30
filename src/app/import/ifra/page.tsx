'use client';

import { useState } from 'react';
import { ShieldCheck, Zap, Globe, FileText, Loader2, CheckCircle2, AlertCircle, Search, Save, Info, ListChecks, Database, X, ArrowRight, LayoutGrid } from 'lucide-react';

export default function IfraImportPage() {
  // Scansione e Import Massa
  const [urlsText, setUrlsText] = useState('https://ifrafragrance.org/standards-library');
  const [maxPdfLimit, setMaxPdfLimit] = useState(20);
  const [importing, setImporting] = useState(false);
  
  // Progress State
  const [progress, setProgress] = useState({
    pagesScanned: 0,
    pdfsFound: 0,
    pdfsProcessed: 0,
    created: 0,
    updated: 0,
    errors: [] as string[]
  });

  const [message, setMessage] = useState<string | null>(null);

  // Import Singolo
  const [singlePdfUrl, setSinglePdfUrl] = useState('');
  const [singleLoading, setSingleLoading] = useState(false);

  // 1. Avvia Import Automatico Multi-Pagina
  const handleStartAutoImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setImporting(true);
    setMessage(null);
    setProgress({
      pagesScanned: 0,
      pdfsFound: 0,
      pdfsProcessed: 0,
      created: 0,
      updated: 0,
      errors: []
    });

    const urls = urlsText.split('\n').map(u => u.trim()).filter(u => u.startsWith('http'));
    if (urls.length === 0) {
      setMessage("Inserisci almeno un link valido.");
      setImporting(false);
      return;
    }

    try {
      // Step A: Scansione multi-pagina
      const scanRes = await fetch("/api/import/ifra-scan-pages", {
        method: "POST",
        body: JSON.stringify({ urls }),
      });
      const scanData = await scanRes.json();

      if (!scanRes.ok || !scanData.success) {
        throw new Error(scanData.error || "Errore durante la scansione delle pagine.");
      }

      const pdfs = scanData.pdfs || [];
      setProgress(p => ({ ...p, pagesScanned: urls.length, pdfsFound: pdfs.length }));

      if (pdfs.length === 0) {
        setMessage(scanData.message || "Nessun PDF trovato nelle pagine specificate.");
        setImporting(false);
        return;
      }

      // Step B: Import Bulk con limite
      const pdfUrls = pdfs.map((p: any) => p.pdfUrl);
      const importRes = await fetch("/api/import/ifra-bulk-pdf", {
        method: "POST",
        body: JSON.stringify({ pdfUrls, limit: maxPdfLimit }),
      });
      const importData = await importRes.json();

      if (!importRes.ok || !importData.success) {
        throw new Error(importData.error || "Errore durante l'importazione di massa.");
      }

      setProgress(p => ({
        ...p,
        pdfsProcessed: Math.min(pdfs.length, maxPdfLimit),
        created: importData.created,
        updated: importData.updated,
        errors: importData.errors
      }));

      setMessage("Importazione completata con successo.");

    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setImporting(false);
    }
  };

  // 2. Import Singolo PDF
  const handleSingleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singlePdfUrl) return;
    
    setSingleLoading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('action', 'save');
      formData.append('pdfUrl', singlePdfUrl);

      const res = await fetch("/api/import/ifra-pdf", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setMessage(`Successo: ${data.message}`);
        setSinglePdfUrl('');
      } else {
        throw new Error(data.error || "Errore importazione singola.");
      }
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setSingleLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest mb-2 shadow-inner">
          <ShieldCheck className="w-4 h-4" />
          Official Standards Pipeline
        </div>
        <h1 className="text-6xl font-black tracking-tighter text-gradient italic">IFRA Hub</h1>
        <p className="text-foreground/60 text-lg max-w-2xl mx-auto italic">Sincronizzazione multi-pagina e importazione di massa degli standard IFRA ufficiali.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Bulk Scraper */}
        <div className="lg:col-span-7 space-y-6">
          <div className="luxury-card p-10 space-y-8 bg-card/40 backdrop-blur-3xl border-primary/10 shadow-2xl shadow-primary/5">
            <div className="flex items-center gap-4 border-b border-border/50 pb-8">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center shadow-inner">
                <LayoutGrid className="text-primary w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter">Automated Bulk Import</h2>
                <p className="text-sm text-foreground/40 font-medium">Scansiona più pagine contemporaneamente.</p>
              </div>
            </div>

            <form onSubmit={handleStartAutoImport} className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 ml-1">IFRA Standards Pages (una per riga)</label>
                <textarea
                  placeholder="https://ifrafragrance.org/standards-library"
                  className="w-full h-32 px-5 py-4 luxury-card bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 outline-none text-sm font-mono custom-scrollbar resize-none"
                  value={urlsText}
                  onChange={(e) => setUrlsText(e.target.value)}
                  disabled={importing}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 ml-1">Max PDF da importare</label>
                  <input
                    type="number"
                    className="w-full px-5 py-3 luxury-card bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 outline-none text-sm font-bold"
                    value={maxPdfLimit}
                    onChange={(e) => setMaxPdfLimit(parseInt(e.target.value))}
                    disabled={importing}
                  />
                </div>
                <div className="flex items-end">
                   <button
                    type="submit"
                    disabled={importing || !urlsText}
                    className="w-full h-[46px] bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-primary/20"
                  >
                    {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    Avvia Import
                  </button>
                </div>
              </div>
            </form>

            {(importing || progress.pdfsFound > 0) && (
              <div className="pt-8 border-t border-border/50 space-y-6">
                 <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Progresso Importazione</span>
                    <span className="text-xs font-mono font-bold text-primary">{progress.pdfsProcessed} / {Math.min(progress.pdfsFound, maxPdfLimit)}</span>
                 </div>
                 <div className="h-2 w-full bg-foreground/5 rounded-full overflow-hidden shadow-inner border border-border/50">
                    <div 
                      className="h-full bg-primary transition-all duration-700 ease-out shadow-lg shadow-primary/50"
                      style={{ width: `${(progress.pdfsProcessed / Math.min(progress.pdfsFound, maxPdfLimit)) * 100 || 0}%` }}
                    />
                 </div>

                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-foreground/5 rounded-xl border border-border/50 text-center">
                       <div className="text-sm font-black">{progress.pagesScanned}</div>
                       <div className="text-[8px] font-bold uppercase opacity-30 tracking-tighter">Pagine</div>
                    </div>
                    <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 text-center">
                       <div className="text-sm font-black text-primary">{progress.pdfsFound}</div>
                       <div className="text-[8px] font-bold uppercase text-primary/40 tracking-tighter">Found</div>
                    </div>
                    <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/20 text-center">
                       <div className="text-sm font-black text-emerald-500">{progress.created}</div>
                       <div className="text-[8px] font-bold uppercase text-emerald-500/40 tracking-tighter">New</div>
                    </div>
                    <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/20 text-center">
                       <div className="text-sm font-black text-amber-500">{progress.updated}</div>
                       <div className="text-[8px] font-bold uppercase text-amber-500/40 tracking-tighter">Update</div>
                    </div>
                 </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Log and Single Import */}
        <div className="lg:col-span-5 space-y-8">
           {/* Results Log */}
           {progress.errors.length > 0 && (
              <div className="luxury-card p-8 bg-red-500/5 border-red-500/10 space-y-4">
                <div className="flex items-center gap-2 text-red-500">
                  <AlertCircle className="w-5 h-5" />
                  <h3 className="text-sm font-black uppercase tracking-widest">Error Log</h3>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                   {progress.errors.map((err, i) => (
                     <p key={i} className="text-[10px] font-mono text-red-500/60 leading-tight bg-red-500/5 p-2 rounded-lg border border-red-500/10 break-all">{err}</p>
                   ))}
                </div>
              </div>
           )}

           {/* Manual PDF Import */}
           <div className="luxury-card p-8 space-y-6 bg-accent/5 border-accent/10 shadow-2xl shadow-accent/5">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent shadow-inner">
                    <FileText className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="text-lg font-black uppercase tracking-tighter italic">Manual PDF Entry</h3>
                    <p className="text-xs text-foreground/40 font-medium">Link diretto al documento standard.</p>
                 </div>
              </div>

              <form onSubmit={handleSingleImport} className="space-y-4">
                <input
                  type="text"
                  placeholder="Inserisci URL PDF (es. https://ifra...)"
                  className="w-full px-4 py-3 luxury-card bg-background focus:outline-none focus:ring-2 focus:ring-accent/20 text-sm font-medium"
                  value={singlePdfUrl}
                  onChange={(e) => setSinglePdfUrl(e.target.value)}
                  disabled={singleLoading}
                />
                <button
                  type="submit"
                  disabled={singleLoading || !singlePdfUrl}
                  className="w-full bg-accent text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-accent/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-accent/20"
                >
                  {singleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  Import PDF
                </button>
              </form>
           </div>

           {/* Summary Info */}
           <div className="luxury-card p-8 space-y-4 bg-foreground/[0.02]">
              <div className="flex items-center gap-2 text-foreground/40">
                 <Info className="w-4 h-4" />
                 <span className="text-[10px] font-bold uppercase tracking-widest">Protocollo Normativo</span>
              </div>
              <p className="text-xs text-foreground/60 leading-relaxed">
                 Tutti i dati importati dalla <strong>IFRA Standards Library</strong> hanno priorità assoluta nel calcolo delle formule. I limiti precedenti (Supplier/SDS) vengono conservati come riferimento ma non utilizzati per la validazione finale se è presente uno standard ufficiale.
              </p>
           </div>
        </div>
      </div>

      {message && (
        <div className={`p-6 rounded-3xl flex items-start gap-4 animate-in slide-in-from-top-4 border-2 shadow-2xl ${
          message.includes('successo') || message.includes('trovato') ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
        }`}>
          <div className="mt-1">
            {message.includes('successo') ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-black uppercase tracking-tight">{message}</p>
          </div>
          <button onClick={() => setMessage(null)} className="p-1 hover:bg-foreground/10 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
