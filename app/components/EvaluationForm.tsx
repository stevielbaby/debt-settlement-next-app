'use client';

import React, { useState } from 'react';
import { Scale, ArrowRight, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Helper function to convert debt amount text to number
const convertDebtAmountToNumber = (debtAmountText: string): number | undefined => {
  if (!debtAmountText) return undefined;

  switch (debtAmountText) {
    case 'Under $5,000':
      return 2500; // Representative value for under $5k
    case '$5,000 - $15,000':
      return 10000; // Midpoint of range
    case 'Over $15,000':
      return 20000; // Representative value for over $15k
    default:
      // Try to parse if it's already a number string
      const parsed = parseInt(debtAmountText.replace(/[$,]/g, ''));
      return isNaN(parsed) ? undefined : parsed;
  }
};

export const EvaluationForm = ({ onComplete }: { onComplete: (data: any) => void }) => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    situation: 'Program failed / I am unhappy',
    debtAmount: '',
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
          leadType: 'BANKRUPTCY', // This form is for bankruptcy
          contact: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
          },
          intakePayload: {
            situation: formData.situation,
            debtAmount: formData.debtAmount,
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

  return (
    <div className="bg-zinc-900 border border-zinc-700 p-8 relative overflow-hidden group hover:border-orange-600/50 transition-colors duration-500">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Scale size={120} />
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-red-500 font-mono text-xs uppercase tracking-widest">Confidential Review</span>
        </div>
        
        <h3 className="text-3xl font-serif text-white mb-2">Legal Evaluation</h3>
        <p className="text-zinc-400 text-sm mb-8">
          Tell us about your situation. We review your case to identify violations, potential refunds, and legal exit strategies.
        </p>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">First Name</label>
              <input 
                type="text" 
                required
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-3 focus:border-orange-600 focus:outline-none transition-colors" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Last Name</label>
              <input 
                type="text" 
                required
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-3 focus:border-orange-600 focus:outline-none transition-colors" 
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Current Situation</label>
            <select 
              value={formData.situation}
              onChange={(e) => setFormData({...formData, situation: e.target.value})}
              className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-3 focus:border-orange-600 focus:outline-none appearance-none"
            >
              <option>I want a refund from a Debt Program</option>
              <option>Program failed / I am unhappy</option>
              <option>I have received a Court Summons</option>
              <option>Considering Bankruptcy</option>
              <option>Wages are being Garnished</option>
              <option>Other / Not Sure</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Debt Amount</label>
            <select 
              required
              value={formData.debtAmount}
              onChange={(e) => setFormData({...formData, debtAmount: e.target.value})}
              className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-3 focus:border-orange-600 focus:outline-none appearance-none"
            >
              <option value="">Select amount</option>
              <option>Under $5,000</option>
              <option>$5,000 - $15,000</option>
              <option>Over $15,000</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Phone</label>
              <input 
                type="tel" 
                required
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-3 focus:border-orange-600 focus:outline-none transition-colors" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Email</label>
              <input 
                type="email" 
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-3 focus:border-orange-600 focus:outline-none transition-colors" 
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-white text-black font-black uppercase tracking-widest py-4 hover:bg-orange-600 hover:text-white transition-all duration-300 flex items-center justify-center gap-2 group mt-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing Case...
              </>
            ) : submitSuccess ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Case Submitted
              </>
            ) : (
              <>
                Analyze Case <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          {submitError && (
            <div className="flex items-center gap-2 text-red-400 text-sm mt-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <p className="text-[10px] text-zinc-600 text-center leading-relaxed max-w-xs mx-auto pt-2">
            Clicking submits your info for legal evaluation. No attorney-client relationship is formed until a retainer is signed.
          </p>
        </form>
      </div>
    </div>
  );
};

