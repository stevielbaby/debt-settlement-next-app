'use client';

import React from 'react';
import { ArrowLeft, Scale, ShieldCheck, Zap, AlertTriangle, Landmark, CheckCircle2, XCircle, Phone, Lock, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Breadcrumb } from './Breadcrumb';

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
        <Breadcrumb items={[
          { label: 'Services', href: '/#services' },
          { label: 'Bankruptcy' }
        ]} />
        
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
              truth: "Many clients report meaningful score improvement within months of discharge as their debt-to-income ratio resets. Some have qualified for mortgage financing as soon as 2 years after filing, depending on lender programs and individual financial circumstances. Results vary.",
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
                     <p className="text-orange-600 font-serif text-lg mb-6 italic">"<span className="text-zinc-200 font-semibold">{item.myth}</span>"</p>
                     
                     <div className="flex items-center gap-2 text-green-500 text-[10px] font-black uppercase tracking-widest mb-2">
                        <CheckCircle2 size={12} /> The Reality
                     </div>
                     <p className="text-zinc-400 text-sm leading-relaxed">{item.truth}</p>
                  </div>
               </div>
            </div>
          ))}
        </div>

        {/* Bankruptcy Section from Home Page */}
        <section className="py-24 bg-zinc-900 border-t border-zinc-800 -mx-4 px-4 md:-mx-6 md:px-6 mb-12">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-orange-600 text-sm font-bold uppercase tracking-widest mb-4">The Ultimate Tool</h2>
                <h3 className="text-4xl md:text-5xl font-serif text-white mb-6 uppercase tracking-tighter">
                  BANKRUPTCY IS A <br/> LEGAL SHIELD.
                </h3>
                <p className="text-zinc-400 leading-relaxed mb-6">
                  Bankruptcy is not a financial failure — it is a federally protected legal strategy designed to stop financial harm,
                  reset leverage, and create a controlled path forward. For many individuals and business owners, it is the fastest,
                  most predictable, and most enforceable way to regain financial stability and rebuild long-term credit health.
                </p>
                <p className="text-zinc-400 leading-relaxed mb-6">
                  Unlike debt settlement or informal negotiations, bankruptcy operates under federal court authority, meaning outcomes
                  are not optional for creditors. When used appropriately, it can discharge or restructure qualifying debts, stop compounding penalties,
                  and prevent irreversible financial damage such as wage garnishment, bank levies, or foreclosure.
                </p>
              </div>
              <div className="bg-zinc-950 p-8 border border-zinc-800">
                <h4 className="text-white font-serif text-xl mb-6">The Power of the Automatic Stay</h4>
                <div className="space-y-4">
                  {[
                    { icon: Phone, title: "Stops Calls Instantly", desc: "The moment a bankruptcy case is filed, federal law immediately prohibits creditors, collection agencies, and attorneys from contacting you directly." },
                    { icon: Shield, title: "Halts Lawsuits & Garnishments", desc: "Active lawsuits, wage garnishments, bank levies, repossessions, and foreclosure actions must stop immediately upon filing — without negotiation or delay." },
                    { icon: Lock, title: "Freezes Debt Growth", desc: "Interest, penalties, late fees, and collection costs are paused, preventing balances from continuing to spiral out of control." },
                    { icon: Shield, title: "Supports a Credit Recovery Path", desc: "Many clients see measurable credit improvement within 12–24 months due to reduced utilization, resolved defaults, and the elimination of high-risk debt markers. Individual results vary." }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-12 h-12 bg-zinc-900 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <h5 className="text-white font-bold">{item.title}</h5>
                        <p className="text-xs text-zinc-500 mt-1">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="bg-orange-600 p-12 text-white">
           <div className="flex items-start gap-8 flex-col md:flex-row">
              <AlertTriangle size={48} className="shrink-0" />
              <div>
                 <h3 className="text-3xl font-serif font-bold mb-4">Warning: Settlement Can Lead to Lawsuits</h3>
                 <p className="text-sm leading-relaxed mb-8 font-medium">
                    Debt settlement programs lack the legal authority to stop a lawsuit. A bankruptcy filing triggers a Federal Automatic Stay — a federal court order requiring all lawsuits, collection calls, and garnishments to stop upon proper filing and notice.
                 </p>
                 <button onClick={() => router.push('/case-review')} className="bg-zinc-950 text-white px-10 py-4 text-xs font-black uppercase tracking-widest hover:bg-white hover:text-zinc-950 transition-all">
                    Discuss My Options
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

