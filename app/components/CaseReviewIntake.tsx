'use client';

import React, { useState } from 'react';
import { ArrowLeft, ShieldCheck, Lock, Scale, AlertCircle, CheckCircle2, FileText, Landmark, Gavel, UserPlus, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Helper function to convert debt amount text to number
const convertDebtAmountToNumber = (debtAmountText: string): number | undefined => {
  if (!debtAmountText) return undefined;

  switch (debtAmountText) {
    case '$5,000 - $15,000':
      return 10000; // Midpoint of range
    case '$15,000 - $30,000':
      return 22500; // Midpoint of range
    case '$30,000 - $50,000':
      return 40000; // Midpoint of range
    case 'Over $50,000':
      return 60000; // Representative value for over $50k
    default:
      // Try to parse if it's already a number string
      const parsed = parseInt(debtAmountText.replace(/[$,]/g, ''));
      return isNaN(parsed) ? undefined : parsed;
  }
};

export const CaseReviewIntake = ({ onComplete, onBack }: { onComplete: (data: any) => void, onBack?: () => void }) => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    situation: 'Settlement Program Failure',
    debtAmount: '$5,000 - $15,000',
    currentCompany: '',
    email: '',
    phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      // Call the new intake submit API
      const response = await fetch('/api/intake/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadType: 'DEBT_SETTLEMENT', // Default for this form
          contact: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
          },
          intakePayload: {
            situation: formData.situation,
            debtAmount: formData.debtAmount,
            currentCompany: formData.currentCompany,
            // Add any other form data as needed
          },
          debtAmount: convertDebtAmountToNumber(formData.debtAmount),
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('Lead submitted successfully');
        setSubmitSuccess(true);

        // Generate sequential case number (temporary until DB persistence is fixed)
        const lastCaseNumber = parseInt(localStorage.getItem('lastCaseNumber') || '0');
        const nextCaseNumber = (lastCaseNumber + 1).toString().padStart(4, '0');
        localStorage.setItem('lastCaseNumber', nextCaseNumber);

        onComplete({
          ...formData,
          caseNumber: nextCaseNumber,
          leadId: result.leadId,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone
        });
      } else {
        // Handle specific error types
        const errorMessage = result.error?.message || 'Submission failed';
        if (result.error?.code === 'VALIDATION_ERROR') {
          setSubmitError('Please check your information and try again. All fields are required.');
        } else if (result.error?.code === 'DUPLICATE_INTAKE') {
          setSubmitError('We already have your information on file. Our team will contact you soon.');
        } else {
          setSubmitError(errorMessage);
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error submitting lead:', error);
      // Error is already set above, don't show alert
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 pt-24 pb-20 animate-fadeIn">
      {/* Background elements */}
      <div className="fixed inset-0 pointer-events-none opacity-20 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-orange-600/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-zinc-800/20 blur-[120px] rounded-full"></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <button onClick={handleBack} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-8 group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] uppercase font-bold tracking-[0.2em]">Exit to Public Site</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          
          {/* Left: The Marketing "Value" Column */}
          <div className="lg:col-span-5 space-y-12">
            <div>
              <div className="inline-flex items-center gap-2 text-orange-600 font-bold uppercase tracking-widest text-[10px] mb-4">
                <ShieldCheck size={14} /> SECURE INTAKE PORTAL
              </div>
              <h1 className="text-5xl md:text-6xl font-serif text-white uppercase leading-[0.9] tracking-tighter mb-6">
                PRELIMINARY <br/><span className="text-orange-600">VIOLATION AUDIT</span>
              </h1>
              <p className="text-zinc-400 text-lg leading-relaxed border-l border-zinc-800 pl-6">
                This is more than a contact form. This is a formal legal intake used to identify specific state and federal violations against your current debt program.
              </p>
            </div>

            <div className="space-y-6">
              {[
                { icon: Scale, title: "Conflict of Interest Check", desc: "We verify that we do not represent your creditors before proceeding." },
                { icon: Landmark, title: "Asset Protection Review", desc: "Determine if your primary residence and wages are currently at risk." },
                { icon: AlertCircle, title: "TSR Compliance Scan", desc: "Scan for illegal front-loaded fees taken by your settlement program." }
              ].map((item, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-sm border border-transparent hover:border-zinc-800 hover:bg-zinc-900/50 transition-all">
                  <div className="w-10 h-10 bg-zinc-900 flex items-center justify-center text-orange-600 shrink-0">
                    <item.icon size={20} />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm mb-1 uppercase tracking-tight">{item.title}</h4>
                    <p className="text-zinc-500 text-xs leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 bg-zinc-900/30 border border-zinc-800/50 backdrop-blur-sm">
              <div className="flex items-center gap-4 mb-4">
                <Lock className="text-zinc-600" size={20} />
                <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-500">Attorney-Client Privilege</span>
              </div>
              <p className="text-[11px] text-zinc-600 italic leading-relaxed">
                Information submitted through this portal is protected by attorney-client privilege. Your data is encrypted and will not be shared with third parties or your creditors.
              </p>
            </div>
          </div>

          {/* Right: The Formal Form */}
          <div className="lg:col-span-7">
            <div className="bg-zinc-900 border border-zinc-700 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-orange-600"></div>
              
              <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">First Legal Name</label>
                    <input 
                      type="text" 
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-3 focus:border-orange-600 focus:outline-none transition-all placeholder:text-zinc-800"
                      placeholder="e.g. John"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Last Legal Name</label>
                    <input 
                      type="text" 
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-3 focus:border-orange-600 focus:outline-none transition-all placeholder:text-zinc-800"
                      placeholder="e.g. Smith"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Contact Method (Secure Line)</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                      type="tel" 
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-3 focus:border-orange-600 focus:outline-none transition-all placeholder:text-zinc-800"
                      placeholder="Phone Number"
                    />
                    <input 
                      type="email" 
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-3 focus:border-orange-600 focus:outline-none transition-all placeholder:text-zinc-800"
                      placeholder="Email Address"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Total Estimated Debt</label>
                    <select 
                      value={formData.debtAmount}
                      onChange={(e) => setFormData({...formData, debtAmount: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-3 focus:border-orange-600 focus:outline-none appearance-none"
                    >
                      <option>$5,000 - $15,000</option>
                      <option>$15,000 - $30,000</option>
                      <option>$30,000 - $50,000</option>
                      <option>Over $50,000</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Primary Hardship</label>
                    <select 
                      value={formData.situation}
                      onChange={(e) => setFormData({...formData, situation: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-3 focus:border-orange-600 focus:outline-none appearance-none"
                    >
                      <option>Settlement Program Failure</option>
                      <option>Active Creditor Lawsuit</option>
                      <option>Wage Garnishment / Levy</option>
                      <option>Medical / Job Loss Hardship</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Current Program Company (If Applicable)</label>
                  <input 
                    type="text" 
                    value={formData.currentCompany}
                    onChange={(e) => setFormData({...formData, currentCompany: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-3 focus:border-orange-600 focus:outline-none transition-all placeholder:text-zinc-800"
                    placeholder="e.g. National Debt Relief, Freedom, etc."
                  />
                  <p className="text-[9px] text-zinc-600 uppercase tracking-tighter">Required for conflict check and fee audit.</p>
                </div>

                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-white text-black font-black uppercase tracking-widest py-5 hover:bg-orange-600 hover:text-white transition-all duration-300 flex items-center justify-center gap-4 group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        ANALYZING CASE...
                      </>
                    ) : submitSuccess ? (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        CASE SUBMITTED
                      </>
                    ) : (
                      <>
                        INITIATE LEGAL AUDIT <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>

                  {submitError && (
                    <div className="flex items-center gap-2 text-red-400 text-sm mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center gap-8 pt-8 border-t border-zinc-800/50">
                   <div className="flex items-center gap-2 opacity-40">
                      <Lock size={12} />
                      <span className="text-[9px] font-bold uppercase tracking-widest">SSL Secure</span>
                   </div>
                   <div className="flex items-center gap-2 opacity-40">
                      <UserPlus size={12} />
                      <span className="text-[9px] font-bold uppercase tracking-widest">Confidential Intake</span>
                   </div>
                   <div className="flex items-center gap-2 opacity-40">
                      <Gavel size={12} />
                      <span className="text-[9px] font-bold uppercase tracking-widest">Legal Counsel</span>
                   </div>
                </div>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

