'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, CreditCard, AlertCircle, CheckCircle, Plus, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SubscriptionInfo {
  planName: string;
  status: string;
  amount: number;
  billingPeriod?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  daysUntilRenewal: number;
  caseLimit: number;
  currentUsage: number;
  usagePercentage: number;
}

interface InvoiceInfo {
  id: string;
  amount: number;
  status: string;
  date: string;
  dueDate?: string;
  paidDate?: string;
}

export default function OperatorPaymentsPage() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [invoices, setInvoices] = useState<InvoiceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPaymentInfo();
  }, []);

  const fetchPaymentInfo = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/operator/payments');
      const data = await response.json();
      
      if (data.success) {
        setSubscription(data.subscription);
        setInvoices(data.invoices || []);
      } else {
        setError(data.error || 'Failed to load payment information');
      }
    } catch (err) {
      setError('Failed to load payment information');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-500 bg-green-900/20';
      case 'trialing':
        return 'text-blue-500 bg-blue-900/20';
      case 'past_due':
        return 'text-orange-500 bg-orange-900/20';
      case 'canceled':
        return 'text-red-500 bg-red-900/20';
      default:
        return 'text-zinc-500 bg-zinc-900/20';
    }
  };

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-500 bg-green-900/20';
      case 'pending':
        return 'text-yellow-500 bg-yellow-900/20';
      case 'overdue':
        return 'text-red-500 bg-red-900/20';
      default:
        return 'text-zinc-500 bg-zinc-900/20';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-serif font-bold text-white uppercase tracking-tight">Billing & Payments</h2>
          <p className="text-zinc-500 text-sm mt-2">Subscription and invoice management</p>
        </div>
        <button
          onClick={fetchPaymentInfo}
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

      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-500">
          <RefreshCw className="animate-spin mr-2" size={20} />
          Loading payment information...
        </div>
      ) : subscription ? (
        <>
          {/* Subscription Card */}
          <div className="bg-zinc-900 border border-zinc-800 p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-serif font-bold text-white uppercase tracking-tight">
                  {subscription.planName}
                </h3>
                <p className="text-zinc-500 text-sm mt-2">Current subscription plan</p>
              </div>
              <span
                className={`px-4 py-2 rounded text-sm font-bold uppercase tracking-widest ${getStatusColor(subscription.status)}`}
              >
                {subscription.status.replace('_', ' ')}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-zinc-800 pt-6">
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-2">Monthly Cost</p>
                <p className="text-3xl font-serif font-bold text-white">
                  ${subscription.amount}
                  <span className="text-sm font-normal text-zinc-400">
                    /{subscription.billingPeriod === 'year' ? 'year' : 'month'}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-2">Billing Period</p>
                <p className="text-lg font-serif font-bold text-white capitalize">
                  {subscription.billingPeriod === 'year' ? 'Yearly' : 'Monthly'}
                </p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-2">Case Limit</p>
                <p className="text-3xl font-serif font-bold text-white">{subscription.caseLimit}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-2">Current Usage</p>
                <p className={`text-3xl font-serif font-bold ${
                  subscription.usagePercentage >= 90
                    ? 'text-red-500'
                    : subscription.usagePercentage >= 70
                    ? 'text-orange-500'
                    : 'text-green-500'
                }`}>
                  {subscription.currentUsage}
                </p>
              </div>
            </div>

            {/* Usage Bar */}
            <div className="border-t border-zinc-800 pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-400">Monthly Usage</span>
                <span className={`font-bold ${
                  subscription.usagePercentage >= 90
                    ? 'text-red-500'
                    : subscription.usagePercentage >= 70
                    ? 'text-orange-500'
                    : 'text-green-500'
                }`}>
                  {subscription.usagePercentage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-3 bg-zinc-800 rounded overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    subscription.usagePercentage >= 90
                      ? 'bg-red-500'
                      : subscription.usagePercentage >= 70
                      ? 'bg-orange-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(subscription.usagePercentage, 100)}%` }}
                />
              </div>
              {subscription.usagePercentage >= 90 && (
                <p className="text-red-400 text-xs mt-2 font-bold">
                  ⚠️ Approaching usage limit. Contact your administrator for plan upgrade.
                </p>
              )}
            </div>

            {/* Period Info */}
            <div className="grid grid-cols-2 gap-4 border-t border-zinc-800 pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest">Period Start</p>
                  <p className="text-white font-semibold mt-1">
                    {new Date(subscription.currentPeriodStart).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CreditCard size={20} className="text-orange-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest">Renews On</p>
                  <p className="text-white font-semibold mt-1">
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Invoices Section */}
          {invoices.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-serif font-bold text-white uppercase tracking-tight">Recent Invoices</h3>
              <div className="overflow-x-auto border border-zinc-800">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/50">
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-zinc-500">
                        Invoice
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-zinc-500">
                        Amount
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-zinc-500">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-zinc-500">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b border-zinc-800 hover:bg-zinc-900/30 transition-colors">
                        <td className="px-6 py-4 text-sm font-mono text-zinc-300">{invoice.id}</td>
                        <td className="px-6 py-4 text-sm font-bold text-white">${invoice.amount.toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-widest inline-block ${getInvoiceStatusColor(
                              invoice.status
                            )}`}
                          >
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-400">
                          {new Date(invoice.date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Help Section */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4">
            <h3 className="text-lg font-serif font-bold text-white uppercase tracking-tight">Need Help?</h3>
            <p className="text-zinc-400 text-sm">
              If you have questions about your subscription or need to upgrade your plan, please contact our support team or
              reach out to your account administrator.
            </p>
            <button className="px-4 py-2 bg-orange-600 text-white hover:bg-orange-700 text-xs font-bold uppercase tracking-widest transition-all">
              Contact Support
            </button>
          </div>
        </>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 p-12 text-center space-y-6">
          <div className="space-y-2">
            <p className="text-zinc-300 text-lg font-semibold">No subscription found</p>
            <p className="text-zinc-500">Subscribe to a plan to start using the platform.</p>
          </div>
          <button
            onClick={() => router.push('/operator/billing/select-plan')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 font-bold uppercase tracking-widest transition-all rounded"
          >
            <Plus size={18} />
            Choose a Plan
            <ArrowRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
