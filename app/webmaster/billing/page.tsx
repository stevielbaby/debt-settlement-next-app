'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, CreditCard, Database, Users, FileText, Info, DollarSign, TrendingUp } from 'lucide-react';
import { BillingResponseSchema, BillingResponse, BillingMetrics, Subscription, Invoice, UsageMetric, UsageResponseSchema, UsageResponse } from '@/lib/schemas';

// Removed duplicate interfaces - now imported from schemas

export default function BillingPage() {
  const [billingMetrics, setBillingMetrics] = useState<BillingMetrics | null>(null);
  const [usageMetrics, setUsageMetrics] = useState<UsageMetric[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState<Subscription | null>(null);
  const [cancelType, setCancelType] = useState<'immediate' | 'end_of_period'>('end_of_period');

  useEffect(() => {
    // Add a small delay to ensure session is established
    const timer = setTimeout(() => {
      console.log('🚀 Initial fetchData call');
      fetchData();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Debug subscriptions state changes
  useEffect(() => {
    console.log('🔄 Subscriptions state changed:', subscriptions);
    console.log('🔄 Subscriptions length:', subscriptions.length);
  }, [subscriptions]);

  useEffect(() => {
    // #region agent log - billing page data update
    fetch('http://127.0.0.1:7242/ingest/1b3163b7-f1ae-4e91-bf21-62593b0c9267', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'app/webmaster/billing/page.tsx:data-update',
        message: 'Billing page received data update',
        data: {
          subscriptionsCount: subscriptions.length,
          firstSubscription: subscriptions[0] ? {
            id: subscriptions[0].id,
            organization_name: subscriptions[0].organization_name,
            plan_name: subscriptions[0].plan_name,
            status: subscriptions[0].status
          } : null,
          metrics: {
            totalRevenue: billingMetrics?.totalRevenue || 0,
            monthlyRecurringRevenue: billingMetrics?.monthlyRecurringRevenue || 0,
            activeSubscriptions: billingMetrics?.activeSubscriptions || 0
          }
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'frontend-debug',
        hypothesisId: 'FE1,FE2,FE3'
      })
    }).catch(() => {});
    // #endregion
    }, [subscriptions, billingMetrics]);

  const fetchData = async () => {
    try {
      console.log('🔄 Starting fetchData...');
      setLoading(true);

      // Fetch billing data (may return honest zeros)
      let billingData: BillingResponse | null = null;
      try {
        console.log('🔍 Fetching billing data...');
        const billingResponse = await fetch('/api/webmaster/billing', {
          credentials: 'include'
        });
        console.log('📡 Billing response status:', billingResponse.status);
        console.log('📡 Billing response ok:', billingResponse.ok);

        if (!billingResponse.ok) {
          console.error('❌ Billing API returned error status:', billingResponse.status);
          const errorText = await billingResponse.text();
          console.error('❌ Billing API error response:', errorText);
          return;
        }

        const rawBillingData = await billingResponse.json();

        console.log('📦 Billing API raw response:', rawBillingData);
        console.log('✅ Billing API success:', rawBillingData?.success);
        console.log('📊 Billing API subscriptions:', rawBillingData?.subscriptions);
        console.log('🔢 Billing API subscriptions length:', rawBillingData?.subscriptions?.length);

        // Validate billing response with Zod (with fallback)
        try {
          billingData = BillingResponseSchema.parse(rawBillingData);
          console.log('✅ Zod validation passed');
        } catch (zodError) {
          console.warn('⚠️ Billing Zod validation failed, using raw data:', zodError);
          billingData = rawBillingData as BillingResponse;
          console.log('🔄 Using raw data fallback');
        }
      } catch (billingError) {
        console.error('❌ Failed to fetch billing data:', billingError);
      }

      // Fetch usage data (real metrics from database)
      let usageData: any = null;
      try {
        const usageResponse = await fetch('/api/webmaster/usage', {
          credentials: 'include'
        });
        const rawUsageData = await usageResponse.json();

        // Validate usage response with Zod (with fallback)
        try {
          usageData = UsageResponseSchema.parse(rawUsageData);
        } catch (usageZodError) {
          console.warn('Usage Zod validation failed, using raw data:', usageZodError);
          usageData = rawUsageData;
        }
      } catch (usageError) {
        console.error('Failed to fetch usage data:', usageError);
      }

      // Set billing data if available
      if (billingData?.success) {
        console.log('💾 Setting subscriptions state:', billingData.subscriptions);
        console.log('💾 Subscriptions array:', billingData.subscriptions || []);
        setBillingMetrics(billingData.metrics);
        setInvoices(billingData.invoices || []);
        setSubscriptions(billingData.subscriptions || []);
      } else {
        console.error('❌ Billing data not successful:', billingData);
        console.error('❌ Billing data success value:', billingData?.success);
      }

      // Set usage data if available
      if (usageData?.success) {
        setUsageMetrics(usageData.metrics || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-500 bg-red-900/20';
    if (percentage >= 70) return 'text-orange-500 bg-orange-900/20';
    return 'text-green-500 bg-green-900/20';
  };

  const getStatusLabel = (percentage: number) => {
    if (percentage >= 90) return 'Critical';
    if (percentage >= 70) return 'Warning';
    return 'Healthy';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-serif font-bold text-white uppercase tracking-tight">Business Operations Hub</h2>
          <p className="text-zinc-500 text-sm mt-2">Single-tenant billing and usage management</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 text-xs font-bold uppercase tracking-widest transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-500">
          <RefreshCw className="animate-spin mr-2" size={20} />
          Loading business data...
        </div>
      ) : (
        <>
          {/* Revenue Overview Section */}
          {billingMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-zinc-900 border border-zinc-800 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="text-green-500" size={20} />
                  <p className="text-zinc-400 text-sm uppercase tracking-widest font-bold">Monthly Revenue</p>
                </div>
                <p className="text-3xl font-serif font-bold text-white">
                  ${billingMetrics.monthlyRecurringRevenue.toFixed(2)}
                </p>
                <p className="text-xs text-zinc-500 mt-1">Recurring revenue</p>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="text-blue-500" size={20} />
                  <p className="text-zinc-400 text-sm uppercase tracking-widest font-bold">Total Revenue</p>
                </div>
                <p className="text-3xl font-serif font-bold text-white">
                  ${billingMetrics.totalRevenue.toFixed(2)}
                </p>
                <p className="text-xs text-zinc-500 mt-1">All time paid</p>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="text-orange-500" size={20} />
                  <p className="text-zinc-400 text-sm uppercase tracking-widest font-bold">Avg Contract Value</p>
                </div>
                <p className="text-3xl font-serif font-bold text-white">
                  ${billingMetrics.averageContractValue.toFixed(2)}
                </p>
                <p className="text-xs text-zinc-500 mt-1">Per subscription</p>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="text-red-500" size={20} />
                  <p className="text-zinc-400 text-sm uppercase tracking-widest font-bold">Churn Rate</p>
                </div>
                <p className="text-3xl font-serif font-bold text-white">
                  {billingMetrics.churnRate.toFixed(1)}%
                </p>
                <p className="text-xs text-zinc-500 mt-1">This month</p>
              </div>
            </div>
          )}

          {/* Subscription Status Section */}
          <div className="bg-zinc-900 border border-zinc-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="text-zinc-500" size={24} />
              <h3 className="text-lg font-semibold text-white">Active Subscriptions</h3>
            </div>

            {(() => {
              console.log('🎯 Rendering subscriptions check');
              console.log('📊 Current subscriptions state:', subscriptions);
              console.log('🔢 Subscriptions length:', subscriptions.length);
              console.log('❓ Length > 0 check:', subscriptions.length > 0);
              return subscriptions.length > 0;
            })() ? (
              <div key={`subs-${subscriptions.length}-${Date.now()}`} className="space-y-4">
                {subscriptions.map((subscription) => (
                  <div key={subscription.id} className="bg-zinc-800 p-4 rounded border border-zinc-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-white">{subscription.organization_name}</h4>
                        <p className="text-sm text-zinc-400">{subscription.plan_name}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-white">${subscription.amount}/month</div>
                        <div className={`text-xs px-2 py-1 rounded uppercase tracking-widest ${
                          subscription.status === 'active'
                            ? 'bg-green-900/20 text-green-500'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {subscription.status}
                        </div>
                      </div>
                    </div>

                    {subscription.current_period_end && (
                      <div className="mt-3 text-xs text-zinc-500">
                        <p>Renews: {new Date(subscription.current_period_end).toLocaleDateString()}</p>
                        {subscription.cancel_at_period_end && (
                          <p className="text-orange-400">⚠️ Cancelled - ends at period end</p>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 mt-4">
                      {!subscription.cancel_at_period_end && (
                        <button
                          onClick={() => {
                            setShowCancelDialog(subscription);
                            setCancelType('end_of_period');
                          }}
                          className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                          disabled={cancelLoading === subscription.stripeSubscriptionId}
                        >
                          Cancel at Period End
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          if (confirm(`Are you sure you want to cancel this subscription immediately? The organization will lose access right away.`)) {
                            try {
                              setCancelLoading(subscription.stripeSubscriptionId);
                              const response = await fetch('/api/webmaster/billing/cancel', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  subscriptionId: subscription.stripeSubscriptionId,
                                  cancelType: 'immediate'
                                })
                              });

                              const data = await response.json();

                              if (data.success) {
                                fetchData(); // Refresh data
                              } else {
                                alert(`Error: ${data.error || 'Failed to cancel subscription'}`);
                              }
                            } catch (error) {
                              console.error('Cancel error:', error);
                              alert('Failed to cancel subscription. Please try again.');
                            } finally {
                              setCancelLoading(null);
                            }
                          }
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                        disabled={cancelLoading === subscription.stripeSubscriptionId}
                      >
                        {cancelLoading === subscription.stripeSubscriptionId ? 'Cancelling...' : 'Cancel Immediately'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="mx-auto text-zinc-600 mb-4" size={48} />
                <p className="text-zinc-400">No active subscriptions</p>
                <p className="text-sm text-zinc-500 mt-2">
                  Organizations can subscribe to plans through the operator dashboard
                </p>
              </div>
            )}
          </div>

          {/* Usage & Limits Section */}
          {usageMetrics.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-xl font-serif font-bold text-white uppercase tracking-tight">Usage & Limits</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {usageMetrics.map((metric, idx) => (
                  <div key={idx} className="bg-zinc-900 border border-zinc-800 p-6 space-y-4 hover:border-zinc-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold capitalize">
                          {metric.metric_name.replace('_', ' ')}
                        </p>
                        <p className="text-3xl font-serif font-bold text-white mt-2">
                          {metric.current_month_count.toLocaleString()}
                        </p>
                        <p className="text-zinc-400 text-sm mt-1">
                          of {metric.monthly_limit.toLocaleString()} limit
                        </p>
                      </div>
                      <div className={`w-12 h-12 rounded flex items-center justify-center ${
                        metric.usage_percentage >= 90 ? 'bg-red-900/30' :
                        metric.usage_percentage >= 70 ? 'bg-orange-900/30' : 'bg-green-900/30'
                      }`}>
                        {metric.metric_name === 'cases' && <FileText className={
                          metric.usage_percentage >= 90 ? 'text-red-500' :
                          metric.usage_percentage >= 70 ? 'text-orange-500' : 'text-green-500'
                        } size={24} />}
                        {metric.metric_name === 'documents' && <Database className={
                          metric.usage_percentage >= 90 ? 'text-red-500' :
                          metric.usage_percentage >= 70 ? 'text-orange-500' : 'text-green-500'
                        } size={24} />}
                        {metric.metric_name === 'storage_mb' && <Database className={
                          metric.usage_percentage >= 90 ? 'text-red-500' :
                          metric.usage_percentage >= 70 ? 'text-orange-500' : 'text-green-500'
                        } size={24} />}
                        {metric.metric_name === 'users' && <Users className={
                          metric.usage_percentage >= 90 ? 'text-red-500' :
                          metric.usage_percentage >= 70 ? 'text-orange-500' : 'text-green-500'
                        } size={24} />}
                        {metric.metric_name === 'leads' && <TrendingUp className={
                          metric.usage_percentage >= 90 ? 'text-red-500' :
                          metric.usage_percentage >= 70 ? 'text-orange-500' : 'text-green-500'
                        } size={24} />}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="w-full h-2 bg-zinc-800 rounded overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            metric.usage_percentage >= 90 ? 'bg-red-500' :
                            metric.usage_percentage >= 70 ? 'bg-orange-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(metric.usage_percentage, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`text-xs font-bold uppercase tracking-widest ${getStatusColor(metric.usage_percentage)}`}>
                          {getStatusLabel(metric.usage_percentage)}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {metric.usage_percentage.toFixed(1)}% used
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Revenue Overview Section */}
          <div className="space-y-6">
            <h3 className="text-xl font-serif font-bold text-white uppercase tracking-tight">Revenue Overview</h3>

            {billingMetrics ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Total Revenue */}
                <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Total Revenue</p>
                      <p className="text-4xl font-serif font-bold text-zinc-400 mt-2">
                        ${billingMetrics.totalRevenue.toLocaleString()}
                      </p>
                      <p className="text-zinc-600 text-xs mt-1">
                        Revenue tracking begins when billing is enabled
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-zinc-900/50 rounded flex items-center justify-center">
                      <DollarSign className="text-zinc-500" size={24} />
                    </div>
                  </div>
                </div>

                {/* Monthly Recurring Revenue */}
                <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Monthly Recurring Revenue</p>
                      <p className="text-4xl font-serif font-bold text-zinc-400 mt-2">
                        ${billingMetrics.monthlyRecurringRevenue.toLocaleString()}
                      </p>
                      <p className="text-zinc-600 text-xs mt-1">
                        MRR tracking begins when subscriptions are enabled
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-zinc-900/50 rounded flex items-center justify-center">
                      <TrendingUp className="text-zinc-500" size={24} />
                    </div>
                  </div>
                </div>

                {/* Average Contract Value */}
                <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Average Contract Value</p>
                      <p className="text-4xl font-serif font-bold text-zinc-400 mt-2">
                        ${billingMetrics.averageContractValue.toLocaleString()}
                      </p>
                      <p className="text-zinc-600 text-xs mt-1">
                        ACV calculation begins when billing is enabled
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-zinc-900/50 rounded flex items-center justify-center">
                      <DollarSign className="text-zinc-500" size={24} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 p-8 text-center">
                <DollarSign className="text-zinc-500 mx-auto mb-4" size={32} />
                <p className="text-zinc-500">Revenue metrics are not available</p>
                <p className="text-zinc-600 text-sm mt-2">
                  Billing infrastructure is not yet implemented for this deployment
                </p>
              </div>
            )}
          </div>

          {/* Invoice Management Section */}
          <div className="space-y-4">
            <h3 className="text-xl font-serif font-bold text-white uppercase tracking-tight">Invoice Management</h3>

            {invoices.length > 0 ? (
              <div className="overflow-x-auto border border-zinc-800">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/50">
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-zinc-500">Organization</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-zinc-500">Amount</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-zinc-500">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-zinc-500">Issue Date</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-zinc-500">Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b border-zinc-800 hover:bg-zinc-900/30 transition-colors">
                        <td className="px-6 py-4 text-sm font-semibold text-white">{invoice.organization_name}</td>
                        <td className="px-6 py-4 text-sm text-white font-bold">${invoice.amount.toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-widest inline-block ${
                              invoice.status === 'paid'
                                ? 'text-green-500 bg-green-900/20'
                                : invoice.status === 'pending'
                                ? 'text-yellow-500 bg-yellow-900/20'
                                : 'text-red-500 bg-red-900/20'
                            }`}
                          >
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-400">{new Date(invoice.issue_date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-sm text-zinc-400">{new Date(invoice.due_date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 p-8 text-center">
                <CreditCard className="text-zinc-500 mx-auto mb-4" size={32} />
                <p className="text-zinc-500">No invoices available</p>
                <p className="text-zinc-600 text-sm mt-2">
                  Invoice generation begins when billing is enabled for this deployment
                </p>
              </div>
            )}
          </div>

          {/* Future Capability Disclosure */}
          <div className="border-t border-zinc-800 pt-8">
            <div className="bg-zinc-900/50 border border-zinc-800 p-4">
              <div className="flex items-center gap-3 mb-2">
                <Info className="text-zinc-400" size={20} />
                <p className="text-sm font-semibold text-zinc-400">Architecture Note</p>
              </div>
              <p className="text-sm text-zinc-400">
                This dashboard is designed to support multi-organization billing management
                when deployed as a centralized admin control plane.
              </p>
            </div>
          </div>
        </>
      )}

      {/* Cancel Subscription Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-2">Cancel Subscription</h3>
            <p className="text-zinc-300 mb-1">{showCancelDialog.organization_name}</p>
            <p className="text-zinc-400 text-sm mb-6">{showCancelDialog.plan_name} - ${showCancelDialog.amount}/month</p>

            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="cancelType"
                  value="end_of_period"
                  checked={cancelType === 'end_of_period'}
                  onChange={(e) => setCancelType(e.target.value as 'end_of_period')}
                  className="text-orange-500"
                />
                <div>
                  <p className="text-white font-medium">Cancel at period end</p>
                  <p className="text-zinc-400 text-sm">Organization keeps access until {showCancelDialog.current_period_end ? new Date(showCancelDialog.current_period_end).toLocaleDateString() : 'billing period ends'}</p>
                </div>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="cancelType"
                  value="immediate"
                  checked={cancelType === 'immediate'}
                  onChange={(e) => setCancelType(e.target.value as 'immediate')}
                  className="text-orange-500"
                />
                <div>
                  <p className="text-white font-medium">Cancel immediately</p>
                  <p className="text-zinc-400 text-sm">Organization loses access right away</p>
                </div>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={async () => {
                  try {
                    setCancelLoading(showCancelDialog.stripeSubscriptionId);
                    const response = await fetch('/api/webmaster/billing/cancel', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        subscriptionId: showCancelDialog.stripeSubscriptionId,
                        cancelType
                      })
                    });

                    const data = await response.json();

                    if (data.success) {
                      setShowCancelDialog(null);
                      fetchData(); // Refresh data
                    } else {
                      alert(`Error: ${data.error || 'Failed to cancel subscription'}`);
                    }
                  } catch (error) {
                    console.error('Cancel error:', error);
                    alert('Failed to cancel subscription. Please try again.');
                  } finally {
                    setCancelLoading(null);
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors flex-1"
                disabled={cancelLoading === showCancelDialog.id}
              >
                {cancelLoading === showCancelDialog.id ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
              <button
                onClick={() => setShowCancelDialog(null)}
                className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
              >
                Keep Subscription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}