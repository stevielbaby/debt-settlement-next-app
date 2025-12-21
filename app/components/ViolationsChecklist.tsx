'use client';

import React from 'react';
import { ArrowLeft, CheckCircle2, ShieldAlert, FileText, Scale, Gavel, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export const ViolationsChecklist = ({ onBack }: { onBack?: () => void }) => {
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
        <button onClick={handleBack} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-12 group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] uppercase font-bold tracking-[0.2em]">Return to Strategy Dashboard</span>
        </button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 border-b border-zinc-800 pb-12">
          <div>
            <div className="inline-flex items-center gap-2 text-orange-600 font-bold uppercase tracking-widest text-[10px] mb-4">
              <ShieldAlert size={14} /> Compliance Audit Evidence
            </div>
            <h1 className="text-5xl md:text-7xl font-serif text-white">The Violation Checklist</h1>
          </div>
          <p className="text-zinc-500 text-sm max-w-xs md:text-right">
            Federal law strictly regulates how debt programs operate. If your program checked any of these boxes, they likely owe you a full refund.
          </p>
        </div>

        <div className="space-y-6">
          {[
            {
              id: "TSR-310.4",
              title: "Upfront Fee Collection",
              law: "Telemarketing Sales Rule (TSR)",
              desc: "Did the company take a fee (setup fee, first payment) before actually settling at least one of your debts? This is a 'per se' violation of federal law.",
              impact: "Entitlement to a 100% refund of all fees paid to the program."
            },
            {
              id: "FDCPA-807",
              title: "Misleading Legal Protection",
              law: "Fair Debt Collection Practices Act",
              desc: "Did they claim their program 'stops all collection calls' or 'prevents lawsuits'? Unless they are a law firm appearing in your case, this is deceptive misrepresentation.",
              impact: "Basis for a deceptive trade practices claim and statutory damages."
            },
            {
              id: "UDAAP",
              title: "Inflated Savings Estimates",
              law: "Dodd-Frank Act (UDAAP)",
              desc: "Did they show you a 'savings' amount that didn't include their high fees or the tax liability you would owe on forgiven debt?",
              impact: "Evidence of unfair and deceptive practices."
            }
          ].map((item, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 p-8 hover:border-orange-600/50 transition-all group">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="shrink-0 flex flex-col items-center gap-2">
                   <div className="w-12 h-12 bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-orange-600 transition-colors">
                      <FileText size={20} />
                   </div>
                   <span className="font-mono text-[9px] text-zinc-700 font-bold">{item.id}</span>
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <h3 className="text-xl font-serif text-white">{item.title}</h3>
                    <span className="bg-zinc-800 text-zinc-500 text-[9px] font-black px-2 py-0.5 uppercase tracking-widest">{item.law}</span>
                  </div>
                  <p className="text-zinc-400 text-sm leading-relaxed mb-6">{item.desc}</p>
                  
                  <div className="bg-orange-600/5 border-l-2 border-orange-600 p-4">
                     <p className="text-[10px] uppercase font-black text-orange-600 tracking-widest mb-1">Legal Impact</p>
                     <p className="text-white text-xs font-medium italic">"{item.impact}"</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 p-10 bg-white text-zinc-950 relative overflow-hidden">
           <Gavel size={120} className="absolute -bottom-8 -right-8 opacity-5 text-zinc-950" />
           <div className="relative z-10">
              <h3 className="text-2xl font-serif font-bold mb-4">Evidence Collection is Critical</h3>
              <p className="text-sm leading-relaxed mb-8 max-w-2xl text-zinc-600">
                The settlement industry relies on your silence. By documenting these violations now, you move from a "victim" to a "plaintiff." During our call, we will perform a deep audit of your specific contract to verify these flags.
              </p>
              <button onClick={handleBack} className="bg-zinc-950 text-white px-8 py-4 text-xs font-black uppercase tracking-widest hover:bg-orange-600 transition-colors inline-flex items-center gap-2">
                Back to Dashboard <Scale size={14} />
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

