'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldAlert, 
  Gavel, 
  Check, 
  ArrowRight, 
  Siren,
  Banknote,
  FileSearch,
  Landmark,
  Phone,
  Lock,
  Shield,
  Server
} from 'lucide-react';
import { Navbar } from '@/app/components/Navbar';
import { UrgentBanner } from '@/app/components/UrgentBanner';
import { EvaluationForm } from '@/app/components/EvaluationForm';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  const handleFormSubmit = (data: any) => {
    setUser(data);
    router.push(`/dashboard?caseNumber=${data.caseNumber}`);
  };

  const navigateToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 selection:bg-orange-600 selection:text-white overflow-x-hidden">
      <UrgentBanner />
      <Navbar />

      <div className="animate-fadeIn">
        <header className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 border-b border-zinc-800">
          <div className="absolute inset-0 z-0">
            <div className="absolute top-20 right-0 w-1/2 h-full bg-gradient-to-l from-zinc-900 to-transparent opacity-50"></div>
            <div className="absolute inset-0" style={{backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '100px 100px'}}></div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
              <div className="lg:col-span-8">
                <div className="inline-flex items-center gap-2 border border-orange-600/30 bg-orange-600/10 px-4 py-2 mb-8">
                  <Siren className="w-4 h-4 text-orange-500 animate-pulse" />
                  <span className="text-orange-500 text-xs font-bold uppercase tracking-widest">Predatory Practice Alert</span>
                </div>
                
                <h1 className="text-5xl sm:text-7xl lg:text-8xl font-serif font-medium leading-[0.9] text-white mb-8 tracking-tighter uppercase">
                  SETTLEMENT <br />
                  <span className="text-outline font-bold">FAILED?</span> <br />
                  <span className="text-orange-600">GET IT BACK.</span>
                </h1>
                
                <div className="space-y-8 max-w-2xl">
                  <p className="text-lg md:text-xl text-zinc-400 leading-relaxed border-l-2 border-orange-600 pl-6">
                    Predatory debt settlement companies break federal laws, overpromise results, and take your money. We are a litigating law firm that initiates federal clawbacks, legally validates your debt, and clears your record.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12 text-sm">
                    <div className="flex items-start gap-3">
                      <Check className="text-orange-600 mt-1 shrink-0" size={16} />
                      <p className="text-zinc-500"><span className="text-white font-bold">TSR Violation Audit:</span> We scan your contract for illegal upfront fees that entitle you to a 100% refund.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="text-orange-600 mt-1 shrink-0" size={16} />
                      <p className="text-zinc-500"><span className="text-white font-bold">Litigation Defense:</span> Immediate legal intervention to stop default judgments and pending lawsuits.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="text-orange-600 mt-1 shrink-0" size={16} />
                      <p className="text-zinc-500"><span className="text-white font-bold">Federal Clawback:</span> We force companies to return administrative and "setup" fees taken in violation of law.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="text-orange-600 mt-1 shrink-0" size={16} />
                      <p className="text-zinc-500"><span className="text-white font-bold">Asset Protection:</span> Stop wage garnishment and bank levies before they compromise your livelihood.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full border border-zinc-700 flex items-center justify-center text-zinc-500">
                      <Banknote size={20} />
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold leading-tight">
                      RECOVER <br/>FEE WASTE
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full border border-zinc-700 flex items-center justify-center text-zinc-500">
                      <ShieldAlert size={20} />
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold leading-tight">
                      LEGAL <br/>VALIDATION
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full border border-zinc-700 flex items-center justify-center text-zinc-500">
                      <Gavel size={20} />
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold leading-tight">
                      COURT <br/>DEFENSE
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full border border-zinc-700 flex items-center justify-center text-zinc-500">
                      <Landmark size={20} />
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold leading-tight">
                      ASSET <br/>SHIELD
                    </div>
                  </div>
                </div>
              </div>
              
              <div id="evaluation-anchor" className="hidden lg:block lg:col-span-4 relative">
                <div className="absolute -top-12 -left-12 w-24 h-24 border-t-2 border-l-2 border-orange-600 opacity-50"></div>
                <EvaluationForm onComplete={handleFormSubmit} />
                <div className="absolute -bottom-12 -right-12 w-24 h-24 border-b-2 border-r-2 border-orange-600 opacity-50"></div>
              </div>
            </div>
          </div>
        </header>

        <section id="evaluation" className="lg:hidden py-12 px-4 bg-zinc-900 border-b border-zinc-800 scroll-mt-32">
          <EvaluationForm onComplete={handleFormSubmit} />
        </section>

        <section id="violations" className="py-24 bg-white text-zinc-950 relative scroll-mt-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
              <div>
                <h2 className="text-6xl font-serif leading-none mb-8 uppercase">THEY BROKE <br/> THE LAW.</h2>
                <p className="text-xl font-medium leading-relaxed mb-6">
                  Debt settlement companies are sales floors, not law firms. They often violate strict federal regulations to get your business. <span className="bg-black text-white px-1">We hold them accountable.</span>
                </p>
                <p className="text-zinc-600 leading-relaxed mb-8">
                  Many programs charge illegal upfront fees or "setup costs" before saving you a dime. They mislead you about legal protection they cannot provide. If you've been paying into a program with no results, you may be entitled to a full refund.
                </p>
                <button onClick={() => navigateToSection('evaluation-anchor')} className="inline-flex items-center gap-2 text-orange-600 font-bold uppercase tracking-widest text-sm hover:gap-4 transition-all">
                  Review My Violations <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { title: "Deceptive Promises", desc: "They promised they could stop lawsuits. Only a law firm or a court order can do that. They lied." },
                  { title: "Front-Loaded Fees", desc: "Taking fees before settling a debt is often a violation of the Telemarketing Sales Rule (TSR)." },
                  { title: "Misrepresentation", desc: "They inflated your savings estimates while hiding the tax consequences of settled debt." },
                  { title: "Negligence", desc: "While you paid them, they let creditors sue you, leading to default judgments and garnishment." }
                ].map((item, i) => (
                  <div key={i} className="border-l-4 border-zinc-950 pl-6 py-2">
                    <h4 className="font-bold text-lg mb-1">{item.title}</h4>
                    <p className="text-zinc-600 text-sm">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="recovery" className="py-24 border-t border-zinc-800 scroll-mt-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 border-b border-zinc-800 pb-8">
              <h2 className="text-4xl md:text-5xl font-serif text-white uppercase tracking-tighter">THE RECOVERY <br/> STRATEGY</h2>
              <p className="text-zinc-500 text-sm max-w-sm mt-6 md:mt-0 text-right">
                We are comprehensive. We don't just "fix credit." We use the full weight of the legal system to recover your money and reset your life.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
              <div className="bg-zinc-900 p-10 hover:bg-zinc-800 transition-colors group cursor-default">
                <div className="flex justify-between items-start mb-6">
                  <Banknote className="w-10 h-10 text-zinc-600 group-hover:text-orange-500 transition-colors" />
                  <span className="text-zinc-700 font-black text-4xl opacity-50">01</span>
                </div>
                <h3 className="text-2xl font-serif text-white mb-4">Recover Your Money</h3>
                <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                  First, we audit your contract. If the settlement company violated consumer protection laws, we demand a return of fees paid. We get your money back.
                </p>
              </div>

              <div className="bg-zinc-900 p-10 hover:bg-zinc-800 transition-colors group cursor-default border-l border-r border-zinc-950 md:border-zinc-800">
                <div className="flex justify-between items-start mb-6">
                  <FileSearch className="w-10 h-10 text-zinc-600 group-hover:text-orange-500 transition-colors" />
                  <span className="text-zinc-700 font-black text-4xl opacity-50">02</span>
                </div>
                <h3 className="text-2xl font-serif text-white mb-4">Legal Debt Validation</h3>
                <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                  We launch a legal attack on the debts. We demand proof of ownership. If a creditor cannot validate the debt legally, it must be removed.
                </p>
              </div>

              <div className="bg-zinc-900 p-10 hover:bg-zinc-800 transition-colors group cursor-default">
                <div className="flex justify-between items-start mb-6">
                  <Landmark className="w-10 h-10 text-zinc-600 group-hover:text-orange-500 transition-colors" />
                  <span className="text-zinc-700 font-black text-4xl opacity-50">03</span>
                </div>
                <h3 className="text-2xl font-serif text-white mb-4">Strategic Bankruptcy</h3>
                <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                  If debts are valid, we use the most powerful tool: Bankruptcy. It wipes the slate clean and stops all collections instantly by federal court order.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="bankruptcy" className="py-24 bg-zinc-900 border-t border-zinc-800 scroll-mt-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                  are not optional for creditors. When used correctly, it can eliminate or restructure debt, stop compounding penalties,
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
                    { icon: Shield, title: "Creates a Clear Credit Recovery Path", desc: "Many clients see measurable credit improvement within 12–24 months due to reduced utilization, resolved defaults, and the elimination of high-risk debt markers." }
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

        <footer className="bg-orange-600 text-white py-24 text-center">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-5xl md:text-7xl font-serif font-bold mb-8 tracking-tighter uppercase">STOP THE SCAM. RECOVER YOUR MONEY.</h2>
            <button onClick={() => navigateToSection('evaluation-anchor')} className="bg-white text-orange-600 px-12 py-5 font-black uppercase tracking-widest text-lg hover:bg-zinc-950 hover:text-white transition-all shadow-2xl">
              Start Recovery Review
            </button>
            <div className="mt-16 text-[10px] uppercase tracking-widest opacity-60 flex flex-col items-center gap-4">
              <span>Stratton Defense Law Firm • 1200 Legal Plaza, Washington DC</span>
              <Link href="/auth/signin?callbackUrl=/operator" className="text-white/40 hover:text-white transition-colors text-[9px] font-semibold">
                Staff Login
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
