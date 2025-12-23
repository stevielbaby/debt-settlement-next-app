'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, AlertCircle, Loader, ArrowRight } from 'lucide-react';

export default function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [subscription, setSubscription] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      setError('No session ID provided');
      return;
    }

    confirmSubscription();
  }, [sessionId]);

  const confirmSubscription = async () => {
    try {
      const response = await fetch('/api/operator/billing/confirm-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkoutSessionId: sessionId }),
      });

      const data = await response.json();

      if (data.success) {
        setSubscription(data.subscription);
        setStatus('success');
      } else {
        setStatus('error');
        setError(data.error || 'Failed to confirm subscription');
      }
    } catch (err) {
      setStatus('error');
      setError('Failed to confirm subscription');
      console.error(err);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-slate-600">Confirming your subscription...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Oops!</h1>
            <p className="text-slate-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/operator/billing/select-plan')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-all"
            >
              Back to Plans
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Success!</h1>
            <p className="text-slate-600">
              Your subscription has been activated
            </p>
          </div>

          {subscription && (
            <div className="bg-slate-50 rounded-lg p-6 mb-6 space-y-4">
              <div>
                <p className="text-sm text-slate-600 font-medium">Plan</p>
                <p className="text-lg font-bold text-slate-900">{subscription.planName}</p>
              </div>
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium">Amount</p>
                  <p className="text-lg font-bold text-slate-900">
                    ${subscription.amount.toFixed(2)}
                    <span className="text-sm text-slate-600 font-normal">
                      /{subscription.billingPeriod === 'month' ? 'month' : 'year'}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600 font-medium">Next Billing</p>
                  <p className="text-lg font-bold text-slate-900">
                    {subscription.daysUntilRenewal} days
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm text-slate-600 font-medium mb-1">Renewal Date</p>
                <p className="text-slate-900">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={() => router.push('/operator/payments')}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
          >
            View Subscription Details
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-xs text-slate-500 text-center mt-4">
            A confirmation email has been sent to your organization email
          </p>
        </div>
      </div>
    </div>
  );
}
