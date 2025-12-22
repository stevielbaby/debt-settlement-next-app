'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, Check, X } from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  monthly_limit: number;
  features: string[];
  is_active: boolean;
}

interface Subscription {
  id: string;
  organization_id: string;
  organization_name: string;
  plan_id: string;
  plan_name: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
}

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'plans' | 'subscriptions'>('plans');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansRes, subsRes] = await Promise.all([
        fetch('/api/webmaster/plans'),
        fetch('/api/webmaster/subscriptions'),
      ]);

      const plansData = await plansRes.json();
      const subsData = await subsRes.json();

      if (plansData.success) setPlans(plansData.plans);
      if (subsData.success) setSubscriptions(subsData.subscriptions);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-serif font-bold text-white uppercase tracking-tight">Subscriptions</h2>
          <p className="text-zinc-500 text-sm mt-2">Manage plans and organization subscriptions</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 text-xs font-bold uppercase tracking-widest transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('plans')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${
            activeTab === 'plans'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Subscription Plans
        </button>
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${
            activeTab === 'subscriptions'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Organization Subscriptions
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-500">
          <RefreshCw className="animate-spin mr-2" size={20} />
          Loading...
        </div>
      ) : activeTab === 'plans' ? (
        // Plans Grid
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`border p-6 space-y-4 ${
                plan.is_active
                  ? 'bg-zinc-900 border-zinc-800 hover:border-orange-600'
                  : 'bg-zinc-900/50 border-zinc-800/50 opacity-60'
              } transition-all`}
            >
              <div>
                <h3 className="text-lg font-serif font-bold text-white uppercase tracking-tight">{plan.name}</h3>
                <p className="text-zinc-500 text-xs mt-1">{plan.description}</p>
              </div>

              <div className="border-t border-zinc-800 pt-4">
                <div className="text-3xl font-serif font-bold text-white">
                  ${plan.price}
                  <span className="text-sm text-zinc-500 ml-2">/month</span>
                </div>
                <div className="text-zinc-400 text-sm mt-2">{plan.monthly_limit} cases/month</div>
              </div>

              <div className="border-t border-zinc-800 pt-4 space-y-2">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-zinc-300">
                    <Check size={16} className="text-green-500 flex-shrink-0" />
                    {feature}
                  </div>
                ))}
              </div>

              {!plan.is_active && <div className="text-red-500 text-xs font-bold uppercase tracking-widest">Inactive</div>}
            </div>
          ))}
        </div>
      ) : (
        // Subscriptions List
        <div className="overflow-x-auto border border-zinc-800">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-zinc-500">Organization</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-zinc-500">Plan</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-zinc-500">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-zinc-500">Current Period</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="border-b border-zinc-800 hover:bg-zinc-900/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-white">{sub.organization_name}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-white">{sub.plan_name}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-widest inline-block ${
                        sub.status === 'active'
                          ? 'text-green-500 bg-green-900/20'
                          : sub.status === 'trialing'
                          ? 'text-blue-500 bg-blue-900/20'
                          : 'text-red-500 bg-red-900/20'
                      }`}
                    >
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-400">
                    {new Date(sub.current_period_start).toLocaleDateString()} -{' '}
                    {new Date(sub.current_period_end).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
