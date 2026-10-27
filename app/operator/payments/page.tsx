'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Check, CreditCard, FileText, RefreshCw, Settings, ShieldCheck } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  features: string[];
}

interface SubscriptionInfo {
  planId: string;
  planName: string;
  description: string;
  status: string;
  amount: number;
  billingPeriod?: string;
  currentPeriodEnd: string | null;
  daysUntilRenewal: number | null;
  cancelAtPeriodEnd: boolean;
}

const defaultFeatures = [
  'Site hosting',
  'Ongoing maintenance',
  'Intake, case queue, and scheduling stay online',
];

export default function OperatorPaymentsPage() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subscribingId, setSubscribingId] = useState<string | null>(null);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [showCancelAlert, setShowCancelAlert] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const [paymentResponse, planResponse] = await Promise.all([
        fetch('/api/operator/payments'),
        fetch('/api/operator/billing/assigned-plans'),
      ]);
      const paymentData = await paymentResponse.json();
      const planData = await planResponse.json();

      if (!paymentResponse.ok || !paymentData.success) {
        setError(paymentData.error || 'Failed to load billing');
        return;
      }
      if (!planResponse.ok || !planData.success) {
        setError(planData.error || 'Failed to load plans');
        return;
      }

      setSubscription(paymentData.subscription);
      setPlans(planData.plans || []);
    } catch {
      setError('Failed to load billing');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const subscribe = async (planId: string) => {
    try {
      setSubscribingId(planId);
      setError('');
      const response = await fetch('/api/operator/billing/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, billingPeriod: 'month' }),
      });
      const data = await response.json();
      if (!response.ok || !data.sessionUrl) {
        setError(data.error || 'Could not start checkout');
        setSubscribingId(null);
        return;
      }
      window.location.href = data.sessionUrl;
    } catch {
      setError('Could not start checkout');
      setSubscribingId(null);
    }
  };

  const switchPlan = async (planId: string) => {
    try {
      setSwitchingId(planId);
      setError('');
      const response = await fetch('/api/operator/billing/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.error || 'Could not switch plans');
        return;
      }
      await load();
    } catch {
      setError('Could not switch plans');
    } finally {
      setSwitchingId(null);
    }
  };

  const changeCancellation = async (action: 'cancel' | 'resume') => {
    try {
      setCanceling(true);
      setError('');
      const response = await fetch('/api/operator/billing/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.error || 'Could not update the subscription');
        return;
      }
      setShowCancelAlert(false);
      await load();
    } catch {
      setError('Could not update the subscription');
    } finally {
      setCanceling(false);
    }
  };

  const periodLabel = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
    : '—';

  return (
    <div className="space-y-10 animate-fadeIn">
      <div className="flex gap-4 border-b border-zinc-800 overflow-x-auto">
        <Link href="/operator" className="px-6 py-4 text-sm font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors border-b-2 border-transparent hover:border-zinc-700 flex items-center gap-2 whitespace-nowrap">
          <ShieldCheck size={16} />
          Case Queue
        </Link>
        <Link href="/operator/submissions" className="px-6 py-4 text-sm font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors border-b-2 border-transparent hover:border-zinc-700 flex items-center gap-2 whitespace-nowrap">
          <FileText size={16} />
          Submissions
        </Link>
        <button className="px-6 py-4 text-sm font-bold uppercase tracking-wider text-orange-600 border-b-2 border-orange-600 flex items-center gap-2 whitespace-nowrap">
          <CreditCard size={16} />
          Billing & Payments
        </button>
        <Link href="/operator/settings" className="px-6 py-4 text-sm font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors border-b-2 border-transparent hover:border-zinc-700 flex items-center gap-2 whitespace-nowrap">
          <Settings size={16} />
          Settings
        </Link>
      </div>

      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-zinc-800 pb-8">
        <div>
          <div className="inline-flex items-center gap-2 text-orange-600 text-[10px] font-bold uppercase tracking-[0.2em] mb-3">
            <CreditCard size={14} /> Site subscription
          </div>
          <h1 className="text-4xl md:text-5xl font-serif text-white uppercase tracking-tight">Billing & Payments</h1>
          <p className="text-zinc-500 mt-3 max-w-2xl">
            Choose a monthly plan. This payment covers hosting and maintenance of your site.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 text-xs font-bold uppercase tracking-widest transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </header>

      {error && (
        <div className="bg-red-900/20 border border-red-800 p-6 flex items-start gap-3">
          <AlertCircle className="text-red-500 shrink-0 mt-1" size={20} />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-500">
          <RefreshCw className="animate-spin mr-2" size={20} />
          Loading billing...
        </div>
      ) : subscription ? (
        <>
        <div className="bg-zinc-900 border border-zinc-800 p-8 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-serif text-white uppercase tracking-tight">{subscription.planName}</h2>
              <p className="text-zinc-500 text-sm mt-2">{subscription.description}</p>
            </div>
            <span className={`px-4 py-2 text-sm font-bold uppercase tracking-widest ${subscription.cancelAtPeriodEnd ? 'text-orange-400 bg-orange-900/20' : 'text-green-500 bg-green-900/20'}`}>
              {subscription.cancelAtPeriodEnd ? 'Cancels' : subscription.status.replace('_', ' ')}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-zinc-800 pt-6">
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-2">Monthly cost</p>
              <p className="text-3xl font-serif text-white">${subscription.amount}<span className="text-sm text-zinc-400">/month</span></p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-2">
                {subscription.cancelAtPeriodEnd ? 'Active through' : 'Renews'}
              </p>
              <p className="text-lg font-serif text-white">{periodLabel}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-2">Days left</p>
              <p className="text-lg font-serif text-white">{subscription.daysUntilRenewal ?? '—'}</p>
            </div>
          </div>
          <div className="border-t border-zinc-800 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-zinc-400 text-sm">
              {subscription.cancelAtPeriodEnd
                ? `This plan will not renew. The site stays active through ${periodLabel}.`
                : 'Cancel any time. You will not be charged again, and the site stays active through the date already paid.'}
            </p>
            {subscription.cancelAtPeriodEnd ? (
              <button
                type="button"
                onClick={() => changeCancellation('resume')}
                disabled={canceling}
                className="border border-zinc-600 text-white font-bold uppercase tracking-widest px-6 py-3 text-sm hover:border-zinc-400 disabled:text-zinc-500"
              >
                {canceling ? 'Updating...' : 'Keep this plan'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowCancelAlert(true)}
                disabled={canceling}
                className="border border-red-800 text-red-400 font-bold uppercase tracking-widest px-6 py-3 text-sm hover:bg-red-950 disabled:text-zinc-500"
              >
                {canceling ? 'Canceling...' : 'Cancel subscription'}
              </button>
            )}
          </div>
        </div>
        {plans.some((plan) => plan.id !== subscription.planId) && (
          <div className="space-y-4">
            <h3 className="text-xl font-serif text-white uppercase tracking-tight">Other plans</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {plans.filter((plan) => plan.id !== subscription.planId).map((plan) => {
                const features = plan.features.length > 0 ? plan.features : defaultFeatures;
                return (
                  <div key={plan.id} className="bg-zinc-900 border border-zinc-800 p-8 space-y-6">
                    <div>
                      <h2 className="text-2xl font-serif text-white uppercase tracking-tight">{plan.name}</h2>
                      <p className="text-zinc-500 text-sm mt-2">{plan.description}</p>
                    </div>
                    <p className="text-4xl font-serif text-white">
                      ${plan.monthlyPrice}
                      <span className="text-base text-zinc-400">/month</span>
                    </p>
                    <ul className="space-y-3">
                      {features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3 text-sm text-zinc-300">
                          <Check size={16} className="text-orange-600 mt-0.5 shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <p className="text-zinc-500 text-sm">The new price starts on the next renewal. Nothing is charged today.</p>
                    <button
                      type="button"
                      onClick={() => switchPlan(plan.id)}
                      disabled={switchingId === plan.id}
                      className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-700 text-white font-bold uppercase tracking-widest py-4 transition-all"
                    >
                      {switchingId === plan.id ? 'Switching...' : `Switch to $${plan.monthlyPrice}/month`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plans.length === 0 && (
            <div className="bg-zinc-900 border border-zinc-800 p-8 text-zinc-400">
              No plans are available yet.
            </div>
          )}
          {plans.map((plan) => {
            const features = plan.features.length > 0 ? plan.features : defaultFeatures;
            return (
              <div key={plan.id} className="bg-zinc-900 border border-zinc-800 p-8 space-y-6">
                <div>
                  <h2 className="text-2xl font-serif text-white uppercase tracking-tight">{plan.name}</h2>
                  <p className="text-zinc-500 text-sm mt-2">{plan.description}</p>
                </div>
                <p className="text-4xl font-serif text-white">
                  ${plan.monthlyPrice}
                  <span className="text-base text-zinc-400">/month</span>
                </p>
                <ul className="space-y-3">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-zinc-300">
                      <Check size={16} className="text-orange-600 mt-0.5 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => subscribe(plan.id)}
                  disabled={subscribingId === plan.id}
                  className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-700 text-white font-bold uppercase tracking-widest py-4 transition-all"
                >
                  {subscribingId === plan.id ? 'Opening checkout...' : 'Pay monthly'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showCancelAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 p-8 space-y-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-orange-600 shrink-0 mt-1" size={22} />
              <div>
                <h2 className="text-2xl font-serif text-white uppercase tracking-tight">Cancel subscription</h2>
                <p className="text-zinc-400 text-sm mt-3 leading-relaxed">
                  You will not be charged again. The site stays active through {periodLabel}.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setShowCancelAlert(false)}
                disabled={canceling}
                className="flex-1 border border-zinc-600 text-white font-bold uppercase tracking-widest py-3 text-sm hover:border-zinc-400"
              >
                Keep plan
              </button>
              <button
                type="button"
                onClick={() => changeCancellation('cancel')}
                disabled={canceling}
                className="flex-1 bg-red-700 hover:bg-red-600 disabled:bg-zinc-700 text-white font-bold uppercase tracking-widest py-3 text-sm"
              >
                {canceling ? 'Canceling...' : 'Cancel plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
