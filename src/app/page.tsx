import Link from 'next/link';
import { Beaker, Database, FileUp, ShieldCheck, Zap, BarChart3 } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-20 py-10 animate-in fade-in duration-1000">
      {/* Hero Section */}
      <section className="text-center space-y-8 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 text-primary text-xs font-bold uppercase tracking-widest animate-bounce">
          <Zap className="w-3 h-3" />
          Powered by IFRA Standards Library
        </div>
        <h1 className="text-6xl md:text-7xl font-black tracking-tight leading-[1.1]">
          Perfume Formulation <br />
          <span className="text-gradient">Redefined for Safety.</span>
        </h1>
        <p className="text-xl text-foreground/60 max-w-2xl mx-auto leading-relaxed">
          Manage your materials, import documentation instantly, and calculate IFRA compliance with surgical precision. 
          The ultimate companion for the modern perfumer.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link href="/fragrances/new" className="w-full sm:w-auto bg-primary text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 hover:scale-105 active:scale-95">
            Start New Formula
          </Link>
          <Link href="/import" className="w-full sm:w-auto bg-card border border-border px-8 py-4 rounded-2xl font-bold text-lg hover:bg-foreground/5 transition-all hover:scale-105 active:scale-95">
            Import Materials
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="luxury-card p-8 space-y-4 group">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500">
            <ShieldCheck className="w-6 h-6 text-emerald-500 group-hover:text-white" />
          </div>
          <h3 className="text-xl font-bold">IFRA Compliance</h3>
          <p className="text-foreground/60 text-sm leading-relaxed">
            Real-time calculation of maximum fragrance usage across all 12 categories. Instantly see limiting components.
          </p>
        </div>

        <div className="luxury-card p-8 space-y-4 group">
          <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all duration-500">
            <Database className="w-6 h-6 text-amber-500 group-hover:text-white" />
          </div>
          <h3 className="text-xl font-bold">Material Intelligence</h3>
          <p className="text-foreground/60 text-sm leading-relaxed">
            Centralized database for your ingredients. Store SDS, CAS numbers, and IFRA certificates in one sleek place.
          </p>
        </div>

        <div className="luxury-card p-8 space-y-4 group">
          <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all duration-500">
            <BarChart3 className="w-6 h-6 text-blue-500 group-hover:text-white" />
          </div>
          <h3 className="text-xl font-bold">Smart Import</h3>
          <p className="text-foreground/60 text-sm leading-relaxed">
            Import data from Fraterworks URLs or bulk upload CSV/Excel files. We do the heavy lifting of data entry.
          </p>
        </div>
      </section>

      {/* Stats/Social Proof (Mocked for Aesthetics) */}
      <section className="luxury-card p-12 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/10 overflow-hidden relative">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12 text-center md:text-left">
          <div className="space-y-4 max-w-md">
            <h2 className="text-3xl font-bold">Precision matters in perfumery.</h2>
            <p className="text-foreground/60 leading-relaxed">
              Our calculation engine ensures you stay within regulatory limits while pushing the boundaries of your creativity.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-1">
              <div className="text-4xl font-black text-primary">100%</div>
              <div className="text-xs font-bold uppercase tracking-widest text-foreground/40">Accuracy</div>
            </div>
            <div className="space-y-1">
              <div className="text-4xl font-black text-accent">Real-time</div>
              <div className="text-xs font-bold uppercase tracking-widest text-foreground/40">Feedback</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}