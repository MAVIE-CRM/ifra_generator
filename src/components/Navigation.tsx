'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Beaker, Database, FileUp, List, Home } from 'lucide-react';

const navItems = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Materials', href: '/materials', icon: Database },
  { name: 'Fragrances', href: '/fragrances', icon: Beaker },
  { name: 'Import', href: '/import', icon: FileUp },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg">
            <Beaker className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-gradient">IFRA_GENERATOR</span>
        </Link>
        
        <div className="flex items-center gap-8">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-accent ${
                  isActive ? 'text-accent' : 'text-foreground/70'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
