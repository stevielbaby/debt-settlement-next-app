'use client';

import React, { useEffect, useState } from 'react';
import { Users, TrendingUp, AlertCircle, DollarSign, Database, RefreshCw, Clock, CreditCard } from 'lucide-react';
import Link from 'next/link';

// Updated interfaces for honest API
interface AvailableMetrics {
  totalOrganizations: number;
  [key: string]: number; // Allow additional computable metrics
}

interface UnavailableMetric {
  name: string;
  reason: string;
  requiredModels: string[];
  phase: string;
}

interface DashboardResponse {
  success: boolean;
  metrics: AvailableMetrics;
  unavailableMetrics: UnavailableMetric[];
}

interface MetricCardConfig {
  key: string;
  title: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  iconColor: string;
  bgColor: string;
  link?: {
    href: string;
    text: string;
  };
  formatter?: (value: number) => string;
}

export default function WebmasterDashboard() {
  const [response, setResponse] = useState<DashboardResponse | null>(null);
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
        setResponse(data);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if a metric is available
  const isMetricAvailable = (metricKey: string): boolean => {
    return !!(response?.metrics && metricKey in response.metrics);
  };

  // Get unavailable metric info
  const getUnavailableMetric = (metricKey: string): UnavailableMetric | undefined => {
    return response?.unavailableMetrics.find(m => m.name === metricKey);
  };

  // Metric card configurations
  const metricCards: MetricCardConfig[] = [
    {
      key: 'totalOrganizations',
      title: 'Total Organizations',
      icon: Users,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-900/30',
      link: { href: '/webmaster/organizations', text: 'View All →' },
    },
    {
      key: 'activeSubscriptions',
      title: 'Active Subscriptions',
      icon: TrendingUp,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-900/30',
    },
    {
      key: 'monthlyRecurringRevenue',
      title: 'Monthly Revenue',
      icon: DollarSign,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-900/30',
      formatter: (value) => `$${value.toLocaleString()}`,
    },
    {
      key: 'organizationsNearLimit',
      title: 'Near Limit (90%+)',
      icon: AlertCircle,
      iconColor: 'text-orange-500',
      bgColor: 'bg-orange-900/30',
      link: { href: '/webmaster/usage', text: 'View Usage →' },
    },
    {
      key: 'totalAPIRequests',
      title: 'API Requests (Month)',
      icon: Database,
      iconColor: 'text-purple-500',
      bgColor: 'bg-purple-900/30',
      formatter: (value) => value.toLocaleString(),
    },
    {
      key: 'totalStorageGB',
      title: 'Total Storage Used',
      icon: Database,
      iconColor: 'text-cyan-500',
      bgColor: 'bg-cyan-900/30',
      formatter: (value) => `${value.toFixed(1)} GB`,
    },
  ];

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
      ) : response ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {metricCards.map((config) => {
            const Icon = config.icon;
            const isAvailable = isMetricAvailable(config.key);
            const unavailableInfo = getUnavailableMetric(config.key);
            const value = isAvailable ? response.metrics[config.key] : null;

            return (
              <div key={config.key} className="bg-zinc-900 border border-zinc-800 p-6 space-y-4 hover:border-zinc-700 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">{config.title}</p>
                    {isAvailable ? (
                      <p className="text-4xl font-serif font-bold text-white mt-2">
                        {config.formatter ? config.formatter(value!) : value}
                      </p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-zinc-400" />
                          <p className="text-zinc-400 text-sm">Coming Soon</p>
                        </div>
                        <p className="text-zinc-600 text-xs">
                          Phase {unavailableInfo?.phase}: {unavailableInfo?.reason}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className={`w-12 h-12 rounded flex items-center justify-center ${config.bgColor}`}>
                    <Icon className={config.iconColor} size={24} />
                  </div>
                </div>
                {config.link && isAvailable && (
                  <Link
                    href={config.link.href}
                    className="text-orange-500 hover:text-orange-400 text-xs font-bold uppercase tracking-widest"
                  >
                    {config.link.text}
                  </Link>
                )}
                {config.link && !isAvailable && (
                  <div className="text-zinc-600 text-xs">
                    Available in Phase {unavailableInfo?.phase}
                  </div>
                )}
              </div>
            );
          })}
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
