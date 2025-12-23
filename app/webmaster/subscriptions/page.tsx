'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, Check, X, Plus, XCircle } from 'lucide-react';

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
  cancel_at_period_end: boolean;
  current_period_start: string;
  current_period_end: string;
}

interface Organization {
  id: string;
  name: string;
}

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'plans' | 'subscriptions'>('plans');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelingSubId, setCancelingSubId] = useState<string | null>(null);
  const [cancelImmediate, setCancelImmediate] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [successType, setSuccessType] = useState<'cancel_immediate' | 'cancel_delayed' | 'cleanup'>('cancel_immediate');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansRes, subsRes, orgsRes] = await Promise.all([
        fetch('/api/webmaster/plans'),
        fetch('/api/webmaster/subscriptions'),
        fetch('/api/webmaster/organizations'),
      ]);

      const plansData = await plansRes.json();
      const subsData = await subsRes.json();
      const orgsData = await orgsRes.json();

      if (plansData.success) setPlans(plansData.plans);
      if (subsData.success) setSubscriptions(subsData.subscriptions);
      if (orgsData.success) setOrganizations(orgsData.organizations);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (confirmText !== 'CANCEL') {
      setCancelError('Please type CANCEL to confirm');
      return;
    }

    if (!cancelingSubId) {
      setCancelError('No subscription selected');
      return;
    }

    try {
      setCanceling(true);
      setCancelError('');
      
      const response = await fetch('/api/webmaster/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: cancelingSubId,
          immediate: cancelImmediate,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Close modal
        setShowCancelModal(false);
        setCancelingSubId(null);
        setCancelImmediate(false);
        setConfirmText('');
        
        // Show custom success notification
        if (data.note) {
          setSuccessType('cleanup');
          setSuccessMessage('✅ Subscription cleaned up (orphaned from Stripe)');
        } else if (cancelImmediate) {
          setSuccessType('cancel_immediate');
          setSuccessMessage('✅ Subscription canceled immediately');
        } else {
          setSuccessType('cancel_delayed');
          setSuccessMessage('✅ Subscription scheduled for cancellation at end of billing period');
        }
        setShowSuccessNotification(true);
        
        // Auto-dismiss after 4 seconds
        setTimeout(() => {
          setShowSuccessNotification(false);
        }, 4000);
        
        // Refresh data to show updated status
        setTimeout(() => {
          fetchData();
        }, 500);
      } else {
        setCancelError(data.error || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Cancel subscription error:', error);
      setCancelError('An error occurred. Please try again.');
    } finally {
      setCanceling(false);
    }
  };

  const handleAssignPlan = async () => {
    if (!selectedOrg || !selectedPlan) {
      setAssignError('Please select both an organization and a plan');
      return;
    }

    try {
      setAssigning(true);
      setAssignError('');
      
      const response = await fetch('/api/webmaster/subscriptions/assign-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: selectedOrg,
          planId: selectedPlan,
        }),
      });

      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error('Non-JSON response:', { status: response.status, text });
        setAssignError(`Server error: ${response.status} - ${text.slice(0, 200)}`);
        setAssigning(false);
        return;
      }

      if (data.success) {
        setShowAssignModal(false);
        setSelectedOrg('');
        setSelectedPlan('');
        fetchData(); // Refresh data
      } else {
        setAssignError(data.error || 'Failed to assign plan');
      }
    } catch (error) {
      console.error('Assign plan error:', error);
      setAssignError('An error occurred. Please try again.');
    } finally {
      setAssigning(false);
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
        <div className="flex gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 text-xs font-bold uppercase tracking-widest transition-all"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowAssignModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white hover:bg-orange-700 text-xs font-bold uppercase tracking-widest transition-all"
          >
            <Plus size={16} />
            Assign Plan
          </button>
        </div>
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
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-zinc-500">Actions</th>
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
                        sub.status === 'active' && !sub.cancel_at_period_end
                          ? 'text-green-500 bg-green-900/20'
                          : sub.status === 'active' && sub.cancel_at_period_end
                          ? 'text-yellow-500 bg-yellow-900/20'
                          : sub.status === 'trialing'
                          ? 'text-blue-500 bg-blue-900/20'
                          : 'text-red-500 bg-red-900/20'
                      }`}
                    >
                      {sub.status === 'active' && sub.cancel_at_period_end ? 'Canceling...' : sub.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-400">
                    {new Date(sub.current_period_start).toLocaleDateString()} -{' '}
                    {new Date(sub.current_period_end).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => {
                        setCancelingSubId(sub.id);
                        setShowCancelModal(true);
                        setCancelError('');
                        setConfirmText('');
                        setCancelImmediate(false);
                      }}
                      disabled={sub.status === 'canceled' || sub.cancel_at_period_end === true}
                      className="flex items-center gap-2 px-3 py-1.5 border border-red-700 text-red-500 hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-widest transition-all"
                    >
                      <XCircle size={14} />
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign Plan Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 max-w-md w-full p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-serif font-bold text-white uppercase tracking-tight">
                Assign Subscription Plan
              </h3>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setAssignError('');
                  setSelectedOrg('');
                  setSelectedPlan('');
                }}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {assignError && (
              <div className="bg-red-900/20 border border-red-800 p-4 text-red-400 text-sm">
                {assignError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
                Organization *
              </label>
              <select
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 focus:outline-none focus:border-orange-600 transition-colors"
              >
                <option value="">Select organization</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
                Plan *
              </label>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 focus:outline-none focus:border-orange-600 transition-colors"
              >
                <option value="">Select plan</option>
                {plans.filter(p => p.is_active).map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - ${plan.price}/mo ({plan.monthly_limit} cases)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <button
                onClick={handleAssignPlan}
                disabled={assigning}
                className="flex-1 bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 font-bold uppercase tracking-wider text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assigning ? 'Assigning...' : 'Assign Plan'}
              </button>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setAssignError('');
                  setSelectedOrg('');
                  setSelectedPlan('');
                }}
                className="px-6 py-3 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 font-bold uppercase tracking-wider text-xs transition-all"
              >
                Cancel
              </button>
            </div>

            <p className="text-zinc-600 text-xs">
              This will create a Stripe subscription and link it to the organization.
            </p>
          </div>
        </div>
      )}

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 max-w-md w-full p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-serif font-bold text-white uppercase tracking-tight">
                Cancel Subscription
              </h3>
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelError('');
                  setCancelingSubId(null);
                  setConfirmText('');
                  setCancelImmediate(false);
                }}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="bg-red-900/20 border border-red-800 p-4 space-y-2">
              <div className="flex items-start gap-2">
                <XCircle className="text-red-500 shrink-0" size={20} />
                <div>
                  <p className="text-red-400 text-sm font-bold">Warning: This action cannot be undone</p>
                  <p className="text-red-400/80 text-xs mt-1">
                    Canceling this subscription will affect the organization's access to the platform.
                  </p>
                </div>
              </div>
            </div>

            {cancelError && (
              <div className="bg-red-900/20 border border-red-800 p-4 text-red-400 text-sm">
                {cancelError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
                Cancellation Type
              </label>
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="cancelType"
                    checked={!cancelImmediate}
                    onChange={() => setCancelImmediate(false)}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-white font-semibold text-sm">Cancel at period end (Recommended)</div>
                    <div className="text-zinc-500 text-xs mt-1">
                      Organization retains access until the end of current billing period
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="cancelType"
                    checked={cancelImmediate}
                    onChange={() => setCancelImmediate(true)}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-white font-semibold text-sm">Cancel immediately</div>
                    <div className="text-zinc-500 text-xs mt-1">
                      Organization loses access immediately (no refund)
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
                Type CANCEL to confirm *
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type CANCEL"
                className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 focus:outline-none focus:border-red-600 transition-colors font-mono"
              />
              {confirmText && confirmText !== 'CANCEL' && (
                <p className="text-red-500 text-xs mt-2">Must type exactly: CANCEL</p>
              )}
            </div>

            <div className="flex items-center gap-4 pt-4">
              <button
                onClick={handleCancelSubscription}
                disabled={canceling || confirmText !== 'CANCEL'}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white px-6 py-3 font-bold uppercase tracking-wider text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {canceling ? 'Canceling...' : 'Confirm Cancellation'}
              </button>
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelError('');
                  setCancelingSubId(null);
                  setConfirmText('');
                  setCancelImmediate(false);
                }}
                className="px-6 py-3 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 font-bold uppercase tracking-wider text-xs transition-all"
              >
                Cancel
              </button>
            </div>

            <p className="text-zinc-600 text-xs">
              Note: Refunds are handled separately and not processed automatically.
            </p>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {showSuccessNotification && (
        <div className="fixed inset-0 flex items-end justify-end z-50 pointer-events-none p-6">
          <div className="bg-green-900/95 border border-green-700 rounded p-6 max-w-md space-y-4 shadow-2xl pointer-events-auto animate-in fade-in slide-in-from-bottom-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-green-800/50 rounded-full flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-green-300 font-bold uppercase tracking-widest text-sm">
                  Success
                </p>
                <p className="text-green-100 text-sm mt-1">
                  {successMessage}
                </p>
                {successType === 'cleanup' && (
                  <p className="text-green-200/70 text-xs mt-2 italic">
                    This subscription did not exist in your Stripe account. Database record has been cleaned up.
                  </p>
                )}
                {successType === 'cancel_delayed' && (
                  <p className="text-green-200/70 text-xs mt-2 italic">
                    The organization will retain access until the end of the current billing period.
                  </p>
                )}
                {successType === 'cancel_immediate' && (
                  <p className="text-green-200/70 text-xs mt-2 italic">
                    Access has been revoked immediately.
                  </p>
                )}
              </div>
            </div>
            <div className="h-1 bg-green-700/30 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 animate-pulse" style={{ animation: 'shrink 4s linear forwards' }} />
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-in-from-bottom-5 {
          from { transform: translateY(20px); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
