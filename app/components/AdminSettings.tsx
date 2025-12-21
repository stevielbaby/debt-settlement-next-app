'use client';

import React from 'react';
import { ArrowLeft, Calendar, ShieldCheck, Database, Lock, FileText, Settings, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export const AdminSettings = ({ onBack, onNavigate, onLogout }: { onBack?: () => void, onNavigate?: (view: string) => void, onLogout?: () => void }) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push('/');
    }
  };

  const handleNavigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      router.push(`/admin/${path}`);
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 pt-24 pb-20 animate-fadeIn">
      <div className="max-w-3xl mx-auto px-4">
        <button onClick={handleBack} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-12 group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] uppercase font-bold tracking-[0.2em]">Return to Public Site</span>
        </button>

        <div className="mb-12 border-b border-zinc-800 pb-12">
          <div className="inline-flex items-center gap-2 text-orange-600 font-bold uppercase tracking-widest text-[10px] mb-4">
            <Lock size={14} /> INTERNAL SYSTEMS / SECURE
          </div>
          <h1 className="text-4xl md:text-6xl font-serif text-white uppercase tracking-tighter">System Integration</h1>
          <p className="text-zinc-500 text-sm mt-4">
            Configure the backend connection between the Stratton client portal and the firm's Google Workspace resources.
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-8 space-y-4">
          <div className="flex items-center gap-3">
            <Calendar className="text-orange-600" size={20} />
            <h2 className="text-white font-bold uppercase tracking-widest text-xs">Calendar Integration</h2>
          </div>
          <p className="text-zinc-500 text-sm leading-relaxed">
            Calendar connectivity and credentials are managed by the setup wizard below. The legacy Google Calendar API (v3) form was removed because it is no longer used by the backend. Launch the wizard to review or update the active connection.
          </p>
          <div className="flex items-center gap-2 text-zinc-600 text-[9px] uppercase tracking-tighter">
            <ShieldCheck size={12} /> Settings are stored securely; use the wizard to change scopes or target calendars.
          </div>
        </div>

        <div className="mt-12 space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Calendar className="text-orange-600" size={20} />
                <h2 className="text-white font-bold uppercase tracking-widest text-xs">Google Calendar Scheduling</h2>
              </div>
            </div>
            <button
              onClick={() => handleNavigate('setup-wizard')}
              className="w-full bg-green-600 text-white font-black uppercase tracking-widest py-3 hover:bg-green-500 transition-all flex items-center justify-center gap-2 mb-3"
            >
              <Settings size={16} />
              Initial Setup Wizard
            </button>
            <button
              onClick={() => handleNavigate('calendar-settings')}
              className="w-full bg-blue-600 text-white font-black uppercase tracking-widest py-3 hover:bg-blue-500 transition-all flex items-center justify-center gap-2"
            >
              <Calendar size={16} />
              Configure Calendar & Availability
            </button>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Database className="text-orange-600" size={20} />
                <h2 className="text-white font-bold uppercase tracking-widest text-xs">Case Management</h2>
              </div>
            </div>
            <button
              onClick={() => handleNavigate('submissions')}
              className="w-full bg-orange-600 text-white font-black uppercase tracking-widest py-4 hover:bg-orange-500 transition-all flex items-center justify-center gap-2"
            >
              <FileText size={16} />
              Review All Submissions
            </button>
            <button
              onClick={handleLogout}
              className="w-full mt-4 border border-zinc-600 text-zinc-400 hover:text-white hover:border-zinc-400 font-bold uppercase tracking-widest py-3 transition-all flex items-center justify-center gap-2"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

