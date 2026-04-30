'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function NewMaterialPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    cas: '',
    supplier: '',
    sourceUrl: '',
    sdsUrl: '',
    notes: '',
    category: '4', // Default
    limit: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Payload minimale: la normalizzazione URL avviene nel backend
    const payload = {
      name: formData.name,
      cas: formData.cas,
      supplier: formData.supplier,
      sourceUrl: formData.sourceUrl,
      notes: formData.notes,
      documents: formData.sdsUrl ? [{ type: 'SDS', url: formData.sdsUrl, name: 'Safety Data Sheet' }] : [],
      ifraLimits: formData.limit ? [{ category: formData.category, limit: parseFloat(formData.limit) }] : [],
    };

    console.log("Payload:", payload);

    try {
      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => router.push('/materials'), 1500);
      } else {
        // Mostra l'errore reale restituito dall'API
        setError(data.error || 'Errore durante il salvataggio');
      }
    } catch (err: any) {
      console.error("Submit Error:", err);
      setError(err.message || 'Errore di connessione al server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <Link href="/materials" className="flex items-center gap-2 text-foreground/60 hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Torna ai Materiali
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-gradient">Nuova Materia Prima</h1>
      </div>

      <form onSubmit={handleSubmit} className="luxury-card p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold uppercase tracking-wider text-foreground/60">Nome Materiale *</label>
            <input
              name="name"
              required
              placeholder="es. AMBRO"
              className="w-full px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
              value={formData.name}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold uppercase tracking-wider text-foreground/60">Numero CAS</label>
            <input
              name="cas"
              placeholder="es. 106-24-1"
              className="w-full px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
              value={formData.cas}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold uppercase tracking-wider text-foreground/60">Fornitore</label>
            <input
              name="supplier"
              placeholder="Opzionale"
              className="w-full px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
              value={formData.supplier}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold uppercase tracking-wider text-foreground/60">URL Sorgente</label>
            <input
              name="sourceUrl"
              type="text"
              placeholder="Opzionale"
              className="w-full px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
              value={formData.sourceUrl}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold uppercase tracking-wider text-foreground/60">URL SDS</label>
          <input
            name="sdsUrl"
            type="text"
            placeholder="Opzionale"
            className="w-full px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
            value={formData.sdsUrl}
            onChange={handleChange}
          />
        </div>

        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Limite IFRA Manuale</h3>
          <div className="grid grid-cols-2 gap-4">
            <select 
              name="category"
              className="px-4 py-2 rounded-xl border border-border bg-card text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              value={formData.category}
              onChange={handleChange}
            >
              <option value="1">Cat 1: Lip Products</option>
              <option value="2">Cat 2: Deodorants</option>
              <option value="3">Cat 3: Eye Products</option>
              <option value="4">Cat 4: Fine Fragrance</option>
              <option value="5A">Cat 5A: Body Lotions</option>
              <option value="12">Cat 12: Candles</option>
            </select>
            <input
              name="limit"
              type="number"
              step="0.001"
              placeholder="Limite % (opz.)"
              className="px-4 py-2 rounded-xl border border-border bg-card text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              value={formData.limit}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold uppercase tracking-wider text-foreground/60">Note</label>
          <textarea
            name="notes"
            className="w-full px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none h-24 resize-none"
            value={formData.notes}
            onChange={handleChange}
          />
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">Materiale salvato correttamente! Reindirizzamento...</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || success}
          className="w-full bg-primary text-white py-4 rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Salva Materiale
        </button>
      </form>
    </div>
  );
}
