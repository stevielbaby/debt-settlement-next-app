'use client';

import React from 'react';
import { ArrowLeft, Banknote, Landmark, Calculator, Receipt, TrendingUp, History, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Breadcrumb } from './Breadcrumb';

export const RefundExpectations = ({ onBack }: { onBack?: () => void }) => {
  const router = useRouter();
  
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 pt-24 pb-20 animate-fadeIn">
      <div className="max-w-4xl mx-auto px-4">
        <Breadcrumb items={[
          { label: 'Services', href: '/#services' },
          { label: 'Debt Settlement Refund' }
        ]} />
        
        <button onClick={handleBack} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-12 group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] uppercase font-bold tracking-[0.2em]">Return to Strategy Dashboard</span>
        </button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 border-b border-zinc-800 pb-12">
          <div>
            <div className="inline-flex items-center gap-2 text-orange-600 font-bold uppercase tracking-widest text-[10px] mb-4">
              <Banknote size={14} /> Financial Recovery Portal
            </div>
            <h1 className="text-5xl md:text-7xl font-serif text-white">Refund Expectations</h1>
          </div>
          <p className="text-zinc-500 text-sm max-w-xs md:text-right">
            Recovering your "wasted" funds is our primary mission. Learn how we calculate your potential claim.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
           <div className="p-6 bg-zinc-900 border border-zinc-800">
              <Calculator className="text-zinc-600 mb-4" />
              <h4 className="text-white font-bold text-sm mb-1">Fee Recovery</h4>
              <p className="text-zinc-500 text-xs">Aims for 100% of all administrative, setup, and monthly maintenance fees paid.</p>
           </div>
           <div className="p-6 bg-zinc-900 border border-zinc-800">
              <TrendingUp className="text-zinc-600 mb-4" />
              <h4 className="text-white font-bold text-sm mb-1">Statutory Damages</h4>
              <p className="text-zinc-500 text-xs">TCPA and FDCPA violations can add $500–$1,500 per illegal contact attempt.</p>
           </div>
           <div className="p-6 bg-zinc-900 border border-zinc-800">
              <History className="text-zinc-600 mb-4" />
              <h4 className="text-white font-bold text-sm mb-1">Escrow Release</h4>
              <p className="text-zinc-500 text-xs">Immediate clawback of any unspent funds sitting in your program's trust account.</p>
           </div>
        </div>

        <div className="bg-white text-zinc-950 p-10 mb-12 relative">
           <div className="absolute top-0 right-0 p-8 opacity-5">
              <Receipt size={100} />
           </div>
           <h3 className="text-2xl font-serif font-bold mb-6 italic">Typical Case Example</h3>
           <div className="space-y-4 font-mono text-sm border-t border-zinc-200 pt-6">
              <div className="flex justify-between items-center text-zinc-500">
                 <span>Program Admin Fees (24 months)</span>
                 <span>$4,800.00</span>
              </div>
              <div className="flex justify-between items-center text-zinc-500">
                 <span>Setup & Compliance Fees</span>
                 <span>$1,500.00</span>
              </div>
              <div className="flex justify-between items-center text-zinc-500">
                 <span>Estimated Unspent Escrow</span>
                 <span>$2,200.00</span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t-2 border-black font-black text-lg">
                 <span>TOTAL POTENTIAL RECOVERY</span>
                 <span className="text-orange-600">$8,500.00</span>
              </div>
           </div>
           <div className="mt-8 p-4 bg-orange-50 text-[10px] text-zinc-600 leading-relaxed uppercase font-bold tracking-widest flex items-start gap-3">
              <Info className="shrink-0 text-orange-600" size={16} />
              <span>Figures above are illustrative. Every contract is unique. We will run your actual numbers during your strategy session.</span>
           </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-8 text-center">
           <h3 className="text-xl font-serif text-white mb-4">Don't Walk Away From Your Own Money</h3>
           <p className="text-zinc-400 text-sm mb-8 max-w-xl mx-auto">
             Most people assume they "lost" their money once it left their bank. If they violated the TSR, that money is legally yours to reclaim. 
           </p>
           <button onClick={() => router.push('/case-review')} className="bg-orange-600 text-white px-10 py-4 text-xs font-black uppercase tracking-widest hover:bg-white hover:text-orange-600 transition-all shadow-xl">
              I'm Ready For My Audit
           </button>
        </div>
      </div>
    </div>
  );
};

