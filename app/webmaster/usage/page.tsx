'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle, TrendingUp, Activity } from 'lucide-react';

interface UsageMetric {
  organization_name: string;
  metric_name: string;
  current_month_count: number;
  monthly_limit: number;
  usage_percentage: number;
}

interface UsageStats {
  totalRequests: number;
  activeOrgs: number;
  orgsNearLimit: number;
  orgsOverLimit: number;
  topConsumers: Array<{
    organization_name: string;
    total_usage: number;
  }>;
}

export default function UsagePage() {
  const [metrics, setMetrics] = useState<UsageMetric[]>([]);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'ok' | 'warning' | 'critical'>('all');

  useEffect(() => {
    fetchUsageData();
  }, []);

  const fetchUsageData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/webmaster/usage');
      const data = await response.json();
      if (data.success) {
        setMetrics(data.metrics);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMetrics = metrics.filter((m) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'ok') return m.usage_percentage < 70;
    if (filterStatus === 'warning') return m.usage_percentage >= 70 && m.usage_percentage < 90;
    if (filterStatus === 'critical') return m.usage_percentage >= 90;
    return true;
  });

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
          <h2 className="text-4xl font-serif font-bold text-white uppercase tracking-tight">Usage Metrics</h2>
          <p className="text-zinc-500 text-sm mt-2">Monitor organization usage and limits</p>
        </div>
        <button
          onClick={fetchUsageData}
          className="flex items-center gap-2 px-4 py-2 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 text-xs font-bold uppercase tracking-widest transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-500">
          <RefreshCw className="animate-spin mr-2" size={20} />
          Loading usage metrics...
        </div>
      ) : stats ? (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Total Requests</p>
                  <p className="text-4xl font-serif font-bold text-white mt-2">{stats.totalRequests.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-blue-900/30 rounded flex items-center justify-center">
                  <Activity className="text-blue-500" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Active Orgs</p>
                  <p className="text-4xl font-serif font-bold text-white mt-2">{stats.activeOrgs}</p>
                </div>
                <div className="w-12 h-12 bg-green-900/30 rounded flex items-center justify-center">
                  <TrendingUp className="text-green-500" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Near Limit</p>
                  <p className="text-4xl font-serif font-bold text-orange-500 mt-2">{stats.orgsNearLimit}</p>
                </div>
                <div className="w-12 h-12 bg-orange-900/30 rounded flex items-center justify-center">
                  <AlertTriangle className="text-orange-500" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Over Limit</p>
                  <p className="text-4xl font-serif font-bold text-red-500 mt-2">{stats.orgsOverLimit}</p>
                </div>
                <div className="w-12 h-12 bg-red-900/30 rounded flex items-center justify-center">
                  <AlertTriangle className="text-red-500" size={24} />
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            {(['all', 'ok', 'warning', 'critical'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-widest transition-colors ${
                  filterStatus === status
                    ? status === 'all'
                      ? 'bg-zinc-700 text-white'
                      : status === 'ok'
                      ? 'bg-green-900 text-green-500'
                      : status === 'warning'
                      ? 'bg-orange-900 text-orange-500'
                      : 'bg-red-900 text-red-500'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {status === 'all' && 'All'}
                {status === 'ok' && 'Healthy'}
                {status === 'warning' && 'Warning'}
                {status === 'critical' && 'Critical'}
              </button>
            ))}
          </div>

          {/* Usage Table */}
          <div className="overflow-x-auto border border-zinc-800">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-zinc-500">Organization</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-zinc-500">Metric</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-zinc-500">Usage</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-zinc-500">Progress</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-zinc-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredMetrics.map((metric, idx) => (
                  <tr key={idx} className="border-b border-zinc-800 hover:bg-zinc-900/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-white">{metric.organization_name}</td>
                    <td className="px-6 py-4 text-sm text-zinc-300 capitalize">{metric.metric_name.replace('_', ' ')}</td>
                    <td className="px-6 py-4 text-sm text-white font-bold">
                      {metric.current_month_count} / {metric.monthly_limit}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="w-32 h-2 bg-zinc-800 rounded overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              metric.usage_percentage >= 90
                                ? 'bg-red-500'
                                : metric.usage_percentage >= 70
                                ? 'bg-orange-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(metric.usage_percentage, 100)}%` }}
                          />
                        </div>
                        <div className="text-xs text-zinc-500">{metric.usage_percentage.toFixed(1)}%</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-widest inline-block ${getStatusColor(metric.usage_percentage)}`}>
                        {getStatusLabel(metric.usage_percentage)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Top Consumers */}
          {stats.topConsumers.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-serif font-bold text-white uppercase tracking-tight">Top Consumers</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.topConsumers.map((consumer, idx) => (
                  <div key={idx} className="bg-zinc-900 border border-zinc-800 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-white">{consumer.organization_name}</p>
                        <p className="text-2xl font-serif font-bold text-orange-600 mt-2">{consumer.total_usage}</p>
                        <p className="text-zinc-500 text-xs mt-1">total usage this month</p>
                      </div>
                      <TrendingUp className="text-orange-500" size={32} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 p-12 text-center text-red-400">
          Failed to load usage metrics. Please try again.
        </div>
      )}
    </div>
  );
}
