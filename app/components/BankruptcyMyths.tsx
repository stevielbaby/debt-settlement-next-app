'use client';

import React from 'react';
import { ArrowLeft, Scale, ShieldCheck, Zap, AlertTriangle, Landmark, CheckCircle2, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export const BankruptcyMyths = ({ onBack }: { onBack?: () => void }) => {
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
              <Landmark size={14} /> Federal Debt Protection
            </div>
            <h1 className="text-5xl md:text-7xl font-serif text-white">The Truth About BK</h1>
          </div>
          <p className="text-zinc-500 text-sm max-w-xs md:text-right">
            Bankruptcy is a constitutional right. Don't let debt settlement sales scripts scare you away from a fresh start.
          </p>
        </div>

        <div className="space-y-4 mb-16">
          {[
            {
              myth: "Bankruptcy destroys your credit for 10 years.",
              truth: "Actually, most people see their scores jump 50–100 points within months of discharge because their 'Debt-to-Income' ratio is reset to zero. You can often buy a house just 2 years after filing.",
              icon: Zap
            },
            {
              myth: "I will lose my house and my car.",
              truth: "State 'Exemptions' allow most people to keep their primary residence and vehicles. Chapter 7 and 13 were designed to protect your assets, not leave you homeless.",
              icon: ShieldCheck
            },
            {
              myth: "Settlement is 'more honorable' than bankruptcy.",
              truth: "Creditors don't care about honor; they care about math. Settlement keeps you in debt for years. Bankruptcy is a legal order that forces them to stop immediately.",
              icon: Scale
            }
          ].map((item, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 overflow-hidden">
               <div className="flex">
                  <div className="w-16 bg-zinc-800/50 flex flex-col items-center justify-center border-r border-zinc-800 shrink-0">
                     <item.icon className="text-orange-600 opacity-50" size={24} />
                  </div>
                  <div className="p-8">
                     <div className="flex items-center gap-2 text-red-500 text-[10px] font-black uppercase tracking-widest mb-2">
                        <XCircle size={12} /> The Myth
                     </div>
                     <p className="text-white font-serif text-lg mb-6 line-through decoration-zinc-700 decoration-2">{item.myth}</p>
                     
                     <div className="flex items-center gap-2 text-green-500 text-[10px] font-black uppercase tracking-widest mb-2">
                        <CheckCircle2 size={12} /> The Reality
                     </div>
                     <p className="text-zinc-400 text-sm leading-relaxed">{item.truth}</p>
                  </div>
               </div>
            </div>
          ))}
        </div>

        <div className="bg-orange-600 p-12 text-white">
           <div className="flex items-start gap-8 flex-col md:flex-row">
              <AlertTriangle size={48} className="shrink-0" />
              <div>
                 <h3 className="text-3xl font-serif font-bold mb-4">Warning: Settlement Can Lead to Lawsuits</h3>
                 <p className="text-sm leading-relaxed mb-8 font-medium">
                    Debt settlement programs have no power to stop a lawsuit. Bankruptcy triggers a 'Federal Automatic Stay.' This means all lawsuits, calls, and garnishments stop the second we file.
                 </p>
                 <button onClick={handleBack} className="bg-zinc-950 text-white px-10 py-4 text-xs font-black uppercase tracking-widest hover:bg-white hover:text-zinc-950 transition-all">
                    Discuss My Options
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

