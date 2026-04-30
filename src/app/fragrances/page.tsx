'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Beaker, Plus, ChevronRight, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function FragrancesPage() {
  const [fragrances, setFragrances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/fragrances')
      .then(res => res.json())
      .then(data => {
        setFragrances(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient">Fragrance Formulas</h1>
          <p className="text-foreground/60 mt-2">View and manage your perfume creations and their IFRA compliance status.</p>
        </div>
        <Link href="/fragrances/new" className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-medium hover:bg-primary/90 transition-all shadow-md shadow-primary/20">
          <Plus className="w-4 h-4" />
          New Formula
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {fragrances.map((fragrance) => (
            <Link 
              key={fragrance.id} 
              href={`/fragrances/${fragrance.id}`}
              className="luxury-card p-6 flex items-center justify-between group"
            >
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Beaker className="text-accent w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{fragrance.name}</h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-sm text-foreground/40">{fragrance.items.length} Ingredients</span>
                    <span className="text-sm text-foreground/40">•</span>
                    <span className="text-sm text-foreground/40">Updated {new Date(fragrance.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-8">
                {/* Status indicators (mocked for list view) */}
                <div className="hidden md:flex items-center gap-4">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-xs font-bold uppercase tracking-wider">
                    <CheckCircle2 className="w-3 h-3" />
                    IFRA Compliant
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-foreground/20 group-hover:text-primary transition-colors" />
              </div>
            </Link>
          ))}
          
          {fragrances.length === 0 && (
            <div className="py-20 text-center luxury-card bg-card/50">
              <Beaker className="w-12 h-12 text-foreground/20 mx-auto mb-4" />
              <h3 className="text-lg font-medium">No formulas found</h3>
              <p className="text-foreground/60 mb-6">Start by creating your first fragrance formula.</p>
              <Link href="/fragrances/new" className="inline-flex items-center gap-2 text-primary font-bold hover:underline">
                Create New Formula <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
