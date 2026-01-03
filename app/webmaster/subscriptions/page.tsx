'use client';

import React, { useEffect, useState } from 'react';
import { CreditCard, Users, Plus, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: string;
  priceDisplay: string;
}

interface Organization {
  id: string;
  name: string;
  email: string;
  type: string;
  status: string;
  subscriptions_status: string;
  plan_name: string;
  monthly_limit: number;
  current_usage: number;
}

interface Subscription {
  id: string;
  organizationId: string;
  organizationName: string;
  planName: string; // Will be resolved from Stripe data
  status: string;
  amount: number; // Will be resolved from Stripe data
  interval: string; // Will be resolved from Stripe data
  currentPeriodStart: string;
  currentPeriodEnd: string;
  stripeSubscriptionId: string;
  createdAt: string;
}

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch plans, organizations, and subscriptions in parallel
      const [plansRes, orgsRes, subsRes] = await Promise.all([
        fetch('/api/webmaster/plans'),
        fetch('/api/webmaster/organizations'),
        fetch('/api/webmaster/subscriptions')
      ]);

      const [plansData, orgsData, subsData] = await Promise.all([
        plansRes.json(),
        orgsRes.json(),
        subsRes.json()
      ]);

      console.log('Plans API response:', plansData);
      console.log('Plans found:', plansData.plans?.length || 0);

      if (plansData.success) setPlans(plansData.plans);
      if (orgsData.success) setOrganizations(orgsData.organizations);
      if (subsData.success) setSubscriptions(subsData.subscriptions);

    } catch (err) {
      setError('Failed to load subscription data');
      console.error('Error fetching subscription data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPlan = async () => {
    if (!selectedOrg || !selectedPlan) return;

    try {
      setAssigning(true);
      const response = await fetch('/api/webmaster/subscriptions/assign-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: selectedOrg.id,
          priceId: selectedPlan.id // Now using Stripe price ID directly
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('Subscription assigned successfully!');
        setShowAssignModal(false);
        setSelectedOrg(null);
        setSelectedPlan(null);
        fetchData(); // Refresh data
      } else {
        alert(`Failed to assign subscription: ${data.error?.message || 'Unknown error'}`);
      }
    } catch (err) {
      alert('Network error occurred. Please try again.');
      console.error('Error assigning plan:', err);
    } finally {
      setAssigning(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'text-green-500 bg-green-900/20';
      case 'trialing': return 'text-blue-500 bg-blue-900/20';
      case 'past_due': return 'text-orange-500 bg-orange-900/20';
      case 'canceled': return 'text-red-500 bg-red-900/20';
      default: return 'text-zinc-500 bg-zinc-900/20';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-zinc-500">
        <RefreshCw className="animate-spin mr-2" size={20} />
        Loading subscription data...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-serif font-bold text-white uppercase tracking-tight">
            Subscription Management
          </h2>
          <p className="text-zinc-500 text-sm mt-2">
            Assign plans to organizations and manage subscriptions
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 text-xs font-bold uppercase tracking-widest transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800 p-6 flex items-start gap-3">
          <AlertCircle className="text-red-500 shrink-0 mt-1" size={20} />
          <div>
            <p className="text-red-400 font-bold">Error</p>
            <p className="text-red-300 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Plans Section */}
      <div className="space-y-4">
        <h3 className="text-xl font-serif font-bold text-white uppercase tracking-tight">
          Available Plans
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map(plan => (
            <div key={plan.id} className="bg-zinc-900 border border-zinc-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-bold text-white">{plan.name}</h4>
                  <p className="text-zinc-500 text-sm">{plan.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">{plan.priceDisplay}</div>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedPlan(plan);
                  setShowAssignModal(true);
                }}
                className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold uppercase tracking-widest transition-all"
              >
                Assign to Organization
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Current Subscriptions */}
      <div className="space-y-4">
        <h3 className="text-xl font-serif font-bold text-white uppercase tracking-tight">
          Active Subscriptions
        </h3>
        {subscriptions.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 p-8 text-center text-zinc-500">
            No active subscriptions yet. Assign a plan to get started.
          </div>
        ) : (
          <div className="space-y-4">
            {subscriptions.map(sub => (
              <div key={sub.id} className="bg-zinc-900 border border-zinc-800 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white">{sub.organizationName}</h4>
                    <p className="text-zinc-500 text-sm">Stripe Subscription • {sub.stripeSubscriptionId}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-widest ${getStatusColor(sub.status)}`}>
                      {sub.status}
                    </span>
                    <p className="text-zinc-500 text-xs mt-1">
                      Since {new Date(sub.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assign Plan Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 p-8 max-w-md w-full mx-4">
            <h3 className="text-xl font-serif font-bold text-white uppercase tracking-tight mb-6">
              Assign Subscription
            </h3>

            {selectedPlan && (
              <div className="mb-6">
                <h4 className="font-bold text-white mb-2">Selected Plan</h4>
                <div className="bg-zinc-800 p-4 rounded">
                  <div className="font-bold text-white">{selectedPlan.name}</div>
                  <div className="text-zinc-400 text-sm">{selectedPlan.priceDisplay}</div>
                </div>
              </div>
            )}

            <div className="mb-6">
              <h4 className="font-bold text-white mb-2">Select Organization</h4>
              <select
                value={selectedOrg?.id || ''}
                onChange={(e) => {
                  const org = organizations.find(o => o.id === e.target.value);
                  setSelectedOrg(org || null);
                }}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-white rounded"
              >
                <option value="">Choose an organization...</option>
                {organizations
                  .filter(org => org.subscriptions_status === 'inactive' || org.subscriptions_status === null)
                  .map(org => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 px-4 py-2 border border-zinc-700 text-zinc-400 hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignPlan}
                disabled={!selectedOrg || assigning}
                className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-bold uppercase tracking-widest transition-all"
              >
                {assigning ? 'Assigning...' : 'Assign Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}