import React from 'react';
import Link from 'next/link';
import { Settings, Users, CreditCard, BarChart3, LogOut } from 'lucide-react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function WebmasterLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // Check if user is webmaster
  // @ts-ignore - Extended session properties from auth.d.ts
  if (!session?.user || session.user.role !== 'webmaster') {
    redirect('/auth/signin');
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 selection:bg-orange-600 selection:text-white">
      {/* Webmaster Sidebar */}
      <aside className="fixed left-0 top-0 w-64 h-screen bg-zinc-900 border-r border-zinc-800 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 flex items-center justify-center">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-serif font-bold text-lg text-white">STRATTON</div>
              <div className="text-[8px] uppercase tracking-[0.2em] text-zinc-500">Webmaster</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-6 space-y-2">
          <Link
            href="/webmaster"
            className="flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-all"
          >
            <BarChart3 size={16} />
            Dashboard
          </Link>
          <Link
            href="/webmaster/organizations"
            className="flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-all"
          >
            <Users size={16} />
            Organizations
          </Link>
          <Link
            href="/webmaster/billing"
            className="flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-all"
          >
            <CreditCard size={16} />
            Billing & Operations
          </Link>
          <Link
            href="/webmaster/usage"
            className="flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-all"
          >
            <BarChart3 size={16} />
            Usage Metrics
          </Link>
        </nav>

        {/* Logout */}
        <div className="p-6 border-t border-zinc-800">
          <Link
            href="/auth/signin"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase tracking-widest text-xs rounded transition-all"
          >
            <LogOut size={14} />
            Sign Out
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 min-h-screen bg-zinc-950">
        {/* Top Bar */}
        <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="px-8 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-serif font-bold text-white">Webmaster Control</h1>
              <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Multi-Tenant Management</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
