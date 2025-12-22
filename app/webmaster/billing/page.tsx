'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, TrendingUp, DollarSign, Calendar } from 'lucide-react';

interface BillingMetrics {
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  averageContractValue: number;
  churnRate: number;
  paymentsProcessed: number;
  paymentsOverdue: number;
}

interface Invoice {
  id: string;
  organization_name: string;
  amount: number;
  status: string;
  issue_date: string;
  due_date: string;
  paid_date?: string;
}

export default function BillingPage() {
  const [metrics, setMetrics] = useState<BillingMetrics | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/webmaster/billing');
      const data = await response.json();
      if (data.success) {
        setMetrics(data.metrics);
        setInvoices(data.invoices || []);
      }
    } catch (error) {
      console.error('Failed to fetch billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-serif font-bold text-white uppercase tracking-tight">Billing Dashboard</h2>
          <p className="text-zinc-500 text-sm mt-2">Revenue, invoices, and payment tracking</p>
        </div>
        <button
          onClick={fetchBillingData}
          className="flex items-center gap-2 px-4 py-2 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 text-xs font-bold uppercase tracking-widest transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-500">
          <RefreshCw className="animate-spin mr-2" size={20} />
          Loading billing data...
        </div>
      ) : metrics ? (
        <>
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Total Revenue */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4 hover:border-zinc-700 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Total Revenue</p>
                  <p className="text-4xl font-serif font-bold text-white mt-2">${metrics.totalRevenue.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-green-900/30 rounded flex items-center justify-center">
                  <DollarSign className="text-green-500" size={24} />
                </div>
              </div>
            </div>

            {/* Monthly Recurring Revenue */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4 hover:border-zinc-700 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">MRR</p>
                  <p className="text-4xl font-serif font-bold text-white mt-2">${metrics.monthlyRecurringRevenue.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-blue-900/30 rounded flex items-center justify-center">
                  <TrendingUp className="text-blue-500" size={24} />
                </div>
              </div>
            </div>

            {/* Average Contract Value */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4 hover:border-zinc-700 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">ACV</p>
                  <p className="text-4xl font-serif font-bold text-white mt-2">${metrics.averageContractValue.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-purple-900/30 rounded flex items-center justify-center">
                  <DollarSign className="text-purple-500" size={24} />
                </div>
              </div>
            </div>

            {/* Churn Rate */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4 hover:border-zinc-700 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Churn Rate</p>
                  <p className="text-4xl font-serif font-bold text-white mt-2">{metrics.churnRate.toFixed(1)}%</p>
                </div>
                <div className="w-12 h-12 bg-orange-900/30 rounded flex items-center justify-center">
                  <TrendingUp className="text-orange-500" size={24} />
                </div>
              </div>
            </div>

            {/* Payments Processed */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4 hover:border-zinc-700 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Payments Processed</p>
                  <p className="text-4xl font-serif font-bold text-white mt-2">{metrics.paymentsProcessed}</p>
                </div>
                <div className="w-12 h-12 bg-green-900/30 rounded flex items-center justify-center">
                  <Calendar className="text-green-500" size={24} />
                </div>
              </div>
            </div>

            {/* Payments Overdue */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4 hover:border-zinc-700 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Payments Overdue</p>
                  <p className={`text-4xl font-serif font-bold mt-2 ${metrics.paymentsOverdue > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {metrics.paymentsOverdue}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded flex items-center justify-center ${metrics.paymentsOverdue > 0 ? 'bg-red-900/30' : 'bg-green-900/30'}`}>
                  <DollarSign className={metrics.paymentsOverdue > 0 ? 'text-red-500' : 'text-green-500'} size={24} />
                </div>
              </div>
            </div>
          </div>

          {/* Invoices */}
          <div className="space-y-4">
            <h3 className="text-xl font-serif font-bold text-white uppercase tracking-tight">Recent Invoices</h3>
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
              <div className="bg-zinc-900 border border-zinc-800 p-8 text-center text-zinc-500">
                No invoices found
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 p-12 text-center text-red-400">
          Failed to load billing data. Please try again.
        </div>
      )}
    </div>
  );
}
