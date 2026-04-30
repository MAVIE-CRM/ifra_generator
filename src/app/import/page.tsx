'use client';

import { useState } from 'react';
import { FileUp, Globe, Database, Loader2, CheckCircle2, AlertCircle, FileText, Save, X, Beaker, Wind, Zap, Info, Quote, ShieldCheck, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function ImportPage() {
  const [url, setUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [preview, setPreview] = useState<any | null>(null);

  const handleUrlFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    setImporting(true);
    setResult(null);
    setPreview(null);

    try {
      const response = await fetch("/api/import/fraterworks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, previewOnly: true }),
      });

      const rawText = await response.text();
      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch (parseError) {
        data = { error: rawText || "Risposta server non valida" };
      }

      if (response.ok && data.success) {
        setPreview(data.preview);
      } else {
        throw new Error(data.error || `Errore server ${response.status}`);
      }
    } catch (error: any) {
      setResult({ 
        success: false, 
        message: error instanceof Error ? error.message : "Errore sconosciuto" 
      });
    } finally {
      setImporting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!preview) return;
    setImporting(true);
    setResult(null);

    try {
      const response = await fetch("/api/import/fraterworks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, previewOnly: false }),
      });

      const rawText = await response.text();
      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch (parseError) {
        data = { error: rawText || "Risposta server non valida" };
      }

      if (response.ok && data.success) {
        setResult({ success: true, message: `Salvato correttamente: ${data.material.name}` });
        setPreview(null);
        setUrl('');
      } else {
        throw new Error(data.error || `Errore durante il salvataggio`);
      }
    } catch (error: any) {
      setResult({ 
        success: false, 
        message: error instanceof Error ? error.message : "Errore sconosciuto" 
      });
    } finally {
      setImporting(false);
    }
  };

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/import/bulk', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResult({ success: true, message: `Importati correttamente ${data.count} materiali.` });
      } else {
        setResult({ success: false, message: data.error || 'Import fallito' });
      }
    } catch (error) {
      setResult({ success: false, message: 'Errore imprevisto durante l\'import di massa' });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-gradient">Import Center</h1>
        <p className="text-foreground/60 text-lg">Estrai dati avanzati con traduzione tecnica automatica.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* URL Import */}
        <div className="luxury-card p-8 space-y-6">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Globe className="text-primary w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Fraterworks URL</h2>
            <p className="text-sm text-foreground/60 mt-1">Estrai dati prodotto da Fraterworks incollando l'URL.</p>
          </div>
          
          {!preview ? (
            <form onSubmit={handleUrlFetch} className="space-y-4">
              <input
                type="text"
                placeholder="https://fraterworks.com/products/..."
                className="w-full px-4 py-3 luxury-card bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 outline-none"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
              <button
                type="submit"
                disabled={importing}
                className="w-full bg-primary text-white py-3 rounded-xl font-medium hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analisi e Traduzione AI...
                  </>
                ) : (
                  'Estrai Dettagli'
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-6 animate-in zoom-in-95 duration-300">
              <div className="p-6 bg-foreground/5 rounded-3xl space-y-4 border border-border shadow-inner max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-start sticky top-0 bg-transparent backdrop-blur-md pb-2 z-10">
                  <div>
                    <h3 className="font-bold text-xl">{preview.name}</h3>
                    {preview.referenceCode && <p className="text-[10px] font-mono text-primary uppercase">{preview.referenceCode}</p>}
                  </div>
                  <button onClick={() => setPreview(null)} className="p-2 hover:bg-foreground/10 rounded-full transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 py-2 border-y border-border/50">
                  <div className="flex items-center gap-2">
                    <Beaker className="w-4 h-4 text-foreground/40" />
                    <div className="text-xs">
                      <span className="block font-bold text-foreground/30 uppercase tracking-tighter">CAS Number</span>
                      <span className="font-mono">{preview.cas || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className={`w-4 h-4 ${preview.primaryIfraLimit ? 'text-amber-500' : 'text-foreground/20'}`} />
                    <div className="text-xs">
                      <span className={`block font-bold uppercase tracking-tighter ${preview.primaryIfraLimit ? 'text-amber-500/50' : 'text-foreground/20'}`}>
                        IFRA {preview.primaryIfraLimit?.amendment || ''}
                      </span>
                      <span className={preview.primaryIfraLimit ? 'font-bold' : 'text-foreground/40 italic'}>
                        {preview.primaryIfraLimit 
                          ? `${preview.primaryIfraLimit.limitPercent}% (Cat.${preview.primaryIfraLimit.category})`
                          : 'IFRA non rilevato'
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sezioni IT/EN */}
                <div className="space-y-6">
                  {preview.odourProfile && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-primary">
                        <Wind className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Profilo Olfattivo</span>
                      </div>
                      <div className="pl-5 space-y-2">
                        <div>
                          <span className="text-[9px] font-bold text-foreground/30 uppercase mr-2">IT:</span>
                          <p className="text-xs leading-relaxed">{preview.odourProfileIt || preview.odourProfile}</p>
                        </div>
                        <div className="opacity-40">
                          <span className="text-[9px] font-bold text-foreground/30 uppercase mr-2">EN:</span>
                          <p className="text-[11px] italic leading-relaxed">{preview.odourProfile}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {preview.uses && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-accent">
                        <Zap className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Utilizzo</span>
                      </div>
                      <div className="pl-5 space-y-2">
                        <div>
                          <span className="text-[9px] font-bold text-foreground/30 uppercase mr-2">IT:</span>
                          <p className="text-xs leading-relaxed">{preview.usesIt || preview.uses}</p>
                        </div>
                        <div className="opacity-40">
                          <span className="text-[9px] font-bold text-foreground/30 uppercase mr-2">EN:</span>
                          <p className="text-[11px] italic leading-relaxed">{preview.uses}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {preview.appearance && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-foreground/40">
                        <Beaker className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Aspetto</span>
                      </div>
                      <div className="pl-5 space-y-2">
                        <div>
                          <span className="text-[9px] font-bold text-foreground/30 uppercase mr-2">IT:</span>
                          <p className="text-xs leading-relaxed">{preview.appearanceIt || preview.appearance}</p>
                        </div>
                        <div className="opacity-40">
                          <span className="text-[9px] font-bold text-foreground/30 uppercase mr-2">EN:</span>
                          <p className="text-[11px] italic leading-relaxed">{preview.appearance}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {preview.description && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-foreground/40">
                        <Quote className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Descrizione</span>
                      </div>
                      <div className="pl-5 space-y-2">
                        <div>
                          <span className="text-[9px] font-bold text-foreground/30 uppercase mr-2">IT:</span>
                          <p className="text-xs leading-relaxed">{preview.descriptionIt || preview.description}</p>
                        </div>
                        <div className="opacity-40">
                          <span className="text-[9px] font-bold text-foreground/30 uppercase mr-2">EN:</span>
                          <p className="text-[11px] italic leading-relaxed line-clamp-3">{preview.description}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-4">
                  {preview.documents.map((doc: any, i: number) => (
                    <span key={i} className="text-[9px] font-bold uppercase bg-primary/10 text-primary px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                      <FileText className="w-3 h-3" />
                      {doc.type}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSaveDraft}
                disabled={importing}
                className="w-full bg-accent text-white py-4 rounded-2xl font-bold hover:bg-accent/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent/20 disabled:opacity-50"
              >
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Conferma e Salva Materiale
              </button>
            </div>
          )}
        </div>

        {/* CSV/Excel Import */}
        <div className="luxury-card p-8 space-y-6 relative overflow-hidden group">
          <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center">
            <FileUp className="text-accent w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Import di Massa</h2>
            <p className="text-sm text-foreground/60 mt-1">Carica file CSV o Excel per importare più materiali contemporaneamente.</p>
          </div>
          
          <label className="border-2 border-dashed border-border rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-foreground/5 transition-colors group-hover:border-accent/50">
            <input 
              type="file" 
              className="hidden" 
              accept=".csv,.xlsx,.xls"
              onChange={handleBulkImport}
              disabled={importing}
            />
            <FileUp className={`w-8 h-8 ${importing ? 'text-accent animate-bounce' : 'text-foreground/20'}`} />
            <span className="text-sm font-medium text-foreground/40">
              {importing ? 'Elaborazione...' : 'Trascina i file qui o clicca per caricare'}
            </span>
          </label>
        </div>

        {/* IFRA Standards Library Navigation */}
        <div className="luxury-card p-8 space-y-6 bg-primary/5 border-primary/20 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="text-emerald-500 w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">IFRA Standards Library</h2>
              <p className="text-sm text-foreground/60 mt-1">Importa gli standard ufficiali direttamente dalla libreria IFRA (PDF o Web Scraper).</p>
            </div>
          </div>
          
          <Link 
            href="/import/ifra"
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
          >
            Vai a Import IFRA
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {result && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
          result.success ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
        }`}>
          {result.success ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm font-medium">{result.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-border">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
             <Wind className="w-4 h-4" />
             <span className="text-xs font-bold uppercase tracking-widest">Odour Profiles</span>
          </div>
          <p className="text-sm text-foreground/60 leading-relaxed">Estraiamo automaticamente le descrizioni olfattive e le note di degustazione.</p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-amber-500">
             <Zap className="w-4 h-4" />
             <span className="text-xs font-bold uppercase tracking-widest">Multi-IFRA</span>
          </div>
          <p className="text-sm text-foreground/60 leading-relaxed">Supporto per multipli emendamenti IFRA con identificazione del più recente.</p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-foreground/40">
             <Database className="w-4 h-4" />
             <span className="text-xs font-bold uppercase tracking-widest">Technical Specs</span>
          </div>
          <p className="text-sm text-foreground/60 leading-relaxed">Codici di riferimento, numeri UN e conformità legislativa salvati automaticamente.</p>
        </div>
      </div>
    </div>
  );
}
