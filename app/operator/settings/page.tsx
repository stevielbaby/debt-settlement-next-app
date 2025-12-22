'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, FileText, Settings, Building2, Calendar, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function OperatorSettingsPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  return (
    <div className="space-y-10 animate-fadeIn">
      {/* Navigation Tabs */}
      <div className="flex gap-4 border-b border-zinc-800">
        <Link
          href="/operator"
          className="px-6 py-4 text-sm font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors border-b-2 border-transparent hover:border-zinc-700 flex items-center gap-2"
        >
          <ShieldCheck size={16} />
          Case Queue
        </Link>
        <Link
          href="/operator/submissions"
          className="px-6 py-4 text-sm font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors border-b-2 border-transparent hover:border-zinc-700 flex items-center gap-2"
        >
          <FileText size={16} />
          Submissions
        </Link>
        <button className="px-6 py-4 text-sm font-bold uppercase tracking-wider text-orange-600 border-b-2 border-orange-600 flex items-center gap-2">
          <Settings size={16} />
          Settings
        </button>
      </div>

      {/* Header */}
      <header className="border-b border-zinc-800 pb-8">
        <div className="inline-flex items-center gap-2 text-orange-600 text-[10px] font-bold uppercase tracking-[0.2em] mb-3">
          <Settings size={14} /> Operator Settings
        </div>
        <h1 className="text-4xl md:text-5xl font-serif text-white uppercase tracking-tight">Organization Settings</h1>
        <p className="text-zinc-500 mt-3 max-w-2xl">
          Manage your firm profile and integration preferences.
        </p>
      </header>

      {/* Organization Profile */}
      <div className="bg-zinc-900 border border-zinc-800 p-8 space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="text-orange-600" size={20} />
          <h2 className="text-white font-bold uppercase tracking-widest text-xs">Organization Profile</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Firm Name</div>
            <div className="text-white">Test Operator Firm</div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Contact Email</div>
            <div className="text-white">operator@test.com</div>
          </div>
        </div>
      </div>

      {/* Calendar Integration */}
      <div className="bg-zinc-900 border border-zinc-800 p-8 space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="text-orange-600" size={20} />
          <h2 className="text-white font-bold uppercase tracking-widest text-xs">Calendar Integration</h2>
        </div>
        <p className="text-zinc-500 text-sm leading-relaxed">
          Configure availability and scheduling if your firm uses the integrated calendar system.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/admin/setup-wizard"
            className="inline-flex items-center justify-center gap-2 bg-green-600 text-white font-bold uppercase tracking-widest px-6 py-3 text-sm hover:bg-green-500 transition-all"
          >
            Setup Wizard
          </Link>
          <Link
            href="/admin/calendar-settings"
            className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white font-bold uppercase tracking-widest px-6 py-3 text-sm hover:bg-blue-500 transition-all"
          >
            Configure Calendar
          </Link>
        </div>
        <p className="text-zinc-600 text-[10px] uppercase tracking-widest mt-4">
          Contact your Webmaster if you need additional permissions.
        </p>
      </div>

      {/* Account Actions */}
      <div className="bg-zinc-900 border border-zinc-800 p-8 space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="text-orange-600" size={20} />
          <h2 className="text-white font-bold uppercase tracking-widest text-xs">Account</h2>
        </div>
        <button
          onClick={handleLogout}
          className="w-full border border-zinc-600 text-zinc-400 hover:text-white hover:border-zinc-400 font-bold uppercase tracking-widest py-3 transition-all flex items-center justify-center gap-2"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
