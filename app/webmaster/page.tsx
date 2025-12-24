'use client';

import React, { useEffect, useState } from 'react';
import { Users, TrendingUp, AlertCircle, DollarSign, Database, RefreshCw } from 'lucide-react';
import Link from 'next/link';
// import WebmasterNotifications from '@/components/WebmasterNotifications';

interface DashboardMetrics {
  totalOrganizations: number;
  activeSubscriptions: number;
  monthlyRecurringRevenue: number;
  organizationsNearLimit: number;
  totalAPIRequests: number;
  totalStorageGB: number;
}

export default function WebmasterDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/webmaster/dashboard');
      const data = await response.json();
      if (data.success) {
        setMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-serif font-bold text-white uppercase tracking-tight">Dashboard</h2>
          <p className="text-zinc-500 text-sm mt-2">System-wide metrics and overview</p>
        </div>
        <button
          onClick={fetchMetrics}
          className="flex items-center gap-2 px-4 py-2 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 text-xs font-bold uppercase tracking-widest transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Metrics Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-500">
          <RefreshCw className="animate-spin mr-2" size={20} />
          Loading metrics...
        </div>
      ) : metrics ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Total Organizations */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4 hover:border-zinc-700 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Total Organizations</p>
                <p className="text-4xl font-serif font-bold text-white mt-2">{metrics.totalOrganizations}</p>
              </div>
              <div className="w-12 h-12 bg-blue-900/30 rounded flex items-center justify-center">
                <Users className="text-blue-500" size={24} />
              </div>
            </div>
            <Link
              href="/webmaster/organizations"
              className="text-orange-500 hover:text-orange-400 text-xs font-bold uppercase tracking-widest"
            >
              View All →
            </Link>
          </div>

          {/* Active Subscriptions */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4 hover:border-zinc-700 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Active Subscriptions</p>
                <p className="text-4xl font-serif font-bold text-white mt-2">{metrics.activeSubscriptions}</p>
              </div>
              <div className="w-12 h-12 bg-green-900/30 rounded flex items-center justify-center">
                <TrendingUp className="text-green-500" size={24} />
              </div>
            </div>
          </div>

          {/* Monthly Recurring Revenue */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4 hover:border-zinc-700 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Monthly Revenue</p>
                <p className="text-4xl font-serif font-bold text-white mt-2">${metrics.monthlyRecurringRevenue.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-green-900/30 rounded flex items-center justify-center">
                <DollarSign className="text-green-500" size={24} />
              </div>
            </div>
          </div>

          {/* Organizations Near Limit */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4 hover:border-zinc-700 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Near Limit (90%+)</p>
                <p className="text-4xl font-serif font-bold text-white mt-2">{metrics.organizationsNearLimit}</p>
              </div>
              <div className="w-12 h-12 bg-orange-900/30 rounded flex items-center justify-center">
                <AlertCircle className="text-orange-500" size={24} />
              </div>
            </div>
            <Link
              href="/webmaster/usage"
              className="text-orange-500 hover:text-orange-400 text-xs font-bold uppercase tracking-widest"
            >
              View Usage →
            </Link>
          </div>

          {/* Total API Requests */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4 hover:border-zinc-700 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">API Requests (Month)</p>
                <p className="text-4xl font-serif font-bold text-white mt-2">{metrics.totalAPIRequests.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-purple-900/30 rounded flex items-center justify-center">
                <Database className="text-purple-500" size={24} />
              </div>
            </div>
          </div>

          {/* Total Storage */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4 hover:border-zinc-700 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Total Storage Used</p>
                <p className="text-4xl font-serif font-bold text-white mt-2">{metrics.totalStorageGB.toFixed(1)} GB</p>
              </div>
              <div className="w-12 h-12 bg-cyan-900/30 rounded flex items-center justify-center">
                <Database className="text-cyan-500" size={24} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 p-12 text-center text-red-400">
          Failed to load metrics. Please try again.
        </div>
      )}

      {/* Quick Actions */}
      <div className="border-t border-zinc-800 pt-8">
        <h3 className="text-xl font-serif font-bold text-white uppercase tracking-tight mb-6">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/webmaster/organizations"
            className="bg-zinc-900 border border-zinc-800 p-6 hover:border-orange-600 hover:bg-zinc-900/50 transition-all text-center"
          >
            <Users className="text-orange-600 mx-auto mb-3" size={24} />
            <div className="font-bold uppercase tracking-widest text-sm">Manage Organizations</div>
            <p className="text-zinc-500 text-xs mt-2">Add, edit, or manage client firms</p>
          </Link>
          <Link
            href="/webmaster/subscriptions"
            className="bg-zinc-900 border border-zinc-800 p-6 hover:border-orange-600 hover:bg-zinc-900/50 transition-all text-center"
          >
            <CreditCard className="text-orange-600 mx-auto mb-3" size={24} />
            <div className="font-bold uppercase tracking-widest text-sm">Manage Subscriptions</div>
            <p className="text-zinc-500 text-xs mt-2">Assign and upgrade plans</p>
          </Link>
          <Link
            href="/webmaster/billing"
            className="bg-zinc-900 border border-zinc-800 p-6 hover:border-orange-600 hover:bg-zinc-900/50 transition-all text-center"
          >
            <DollarSign className="text-orange-600 mx-auto mb-3" size={24} />
            <div className="font-bold uppercase tracking-widest text-sm">View Billing</div>
            <p className="text-zinc-500 text-xs mt-2">Revenue, invoices, and payments</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

// Icon component
function CreditCard({ className, size }: { className?: string; size?: number }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
      <path d="M1 10h22"></path>
    </svg>
  );
}
