import React from 'react';
import Link from 'next/link';
import { Scale, LogOut, User } from 'lucide-react';

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 selection:bg-orange-600 selection:text-white">
      {/* Operator Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/operator" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-white flex items-center justify-center group-hover:bg-orange-600 transition-colors">
              <Scale className="w-6 h-6 text-zinc-950 group-hover:text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-bold text-xl tracking-tight text-white leading-none">STRATTON</span>
              <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-500">Operator Dashboard</span>
            </div>
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-zinc-500 text-xs">
              <User size={14} />
              <span>Operator Account</span>
            </div>
            <Link
              href="/auth/signin"
              className="flex items-center gap-2 px-4 py-2 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 text-xs font-bold uppercase tracking-widest transition-all"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign Out</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
}
