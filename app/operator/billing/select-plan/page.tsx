'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Zap, Check, Loader } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyLimit: number;
  features: string[];
  isActive: boolean;
}

export default function SelectPlanPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [billingPeriod, setBillingPeriod] = useState<'month' | 'year'>('month');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/operator/billing/assigned-plans');
      const data = await response.json();

      if (data.success) {
        setPlans(data.plans);
      } else {
        setError(data.error || 'Failed to load plans');
      }
    } catch (err) {
      setError('Failed to load plans');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (plan: Plan) => {
    try {
      setSelectedPlan(plan.id);
      setSubscribing(true);
      setError('');

      // Create checkout session
      const response = await fetch('/api/operator/billing/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          billingPeriod,
        }),
      });

      const data = await response.json();

      if (data.success && data.sessionUrl) {
        // Redirect to Stripe Checkout
        window.location.href = data.sessionUrl;
      } else {
        setError(data.error || 'Failed to create checkout session');
        setSubscribing(false);
      }
    } catch (err) {
      setError('Failed to initiate checkout');
      setSubscribing(false);
      console.error(err);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const yearlySavings = (plan: Plan) => {
    const monthlyCost = plan.monthlyPrice * 12;
    const savings = monthlyCost - plan.yearlyPrice;
    return {
      amount: savings,
      percentage: Math.round((savings / monthlyCost) * 100),
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-slate-600">Loading subscription plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Choose Your Plan</h1>
          <p className="text-lg text-slate-600 mb-8">
            Select the perfect plan for your debt settlement practice
          </p>

          {/* Billing Period Toggle */}
          <div className="inline-flex items-center bg-white rounded-lg shadow-sm p-1 mb-8">
            <button
              onClick={() => setBillingPeriod('month')}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                billingPeriod === 'month'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('year')}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                billingPeriod === 'year'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Yearly
              <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded inline-block">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const savings = yearlySavings(plan);
            const price = billingPeriod === 'month' ? plan.monthlyPrice : plan.yearlyPrice;
            const isSelected = selectedPlan === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-xl shadow-lg transition-all duration-300 overflow-hidden hover:shadow-2xl ${
                  isSelected ? 'ring-2 ring-blue-600 transform scale-105' : ''
                }`}
              >
                {/* Popular Badge */}
                {plan.monthlyLimit === 50 && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-blue-500 text-white py-2 px-4 flex items-center justify-center gap-2">
                    <Zap className="w-4 h-4" />
                    <span className="font-semibold text-sm">Most Popular</span>
                  </div>
                )}

                <div className={`p-8 ${plan.monthlyLimit === 50 ? 'pt-16' : ''}`}>
                  {/* Plan Name & Description */}
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                  <p className="text-sm text-slate-600 mb-6">{plan.description}</p>

                  {/* Pricing */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-slate-900">
                        {formatPrice(price)}
                      </span>
                      <span className="text-slate-600">
                        /{billingPeriod === 'month' ? 'month' : 'year'}
                      </span>
                    </div>
                    {billingPeriod === 'year' && savings.amount > 0 && (
                      <p className="text-sm text-green-600 font-medium mt-2">
                        Save {formatPrice(savings.amount)} ({savings.percentage}%) vs monthly
                      </p>
                    )}
                  </div>

                  {/* Case Limit */}
                  <div className="mb-6 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-900 font-medium">
                      {plan.monthlyLimit} cases/month
                    </p>
                  </div>

                  {/* Select Button */}
                  <button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={subscribing && isSelected}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 mb-6 ${
                      isSelected && subscribing
                        ? 'bg-blue-600 text-white opacity-75 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                    }`}
                  >
                    {subscribing && isSelected ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Choose Plan
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Features */}
                  <div className="border-t pt-6">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-4">
                      Included Features
                    </p>
                    <ul className="space-y-3">
                      {plan.features && plan.features.length > 0 ? (
                        plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-slate-700">{feature}</span>
                          </li>
                        ))
                      ) : (
                        <li className="flex items-start gap-3">
                          <Check className="w-4 h-4 text-green-600 mt-0.5" />
                          <span className="text-sm text-slate-700">Full platform access</span>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
