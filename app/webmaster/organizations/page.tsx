'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit2, Eye, RefreshCw } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  email: string;
  subscription_status: string;
  plan_name: string;
  monthly_limit: number;
  current_usage: number;
  created_at: string;
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [filteredOrgs, setFilteredOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    const filtered = organizations.filter(
      (org) =>
        org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredOrgs(filtered);
  }, [searchTerm, organizations]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/webmaster/organizations');
      const data = await response.json();
      if (data.success) {
        setOrganizations(data.organizations);
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
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

  const getUsageColor = (usage: number, limit: number) => {
    const percentage = (usage / limit) * 100;
    if (percentage >= 90) return 'text-red-500';
    if (percentage >= 70) return 'text-orange-500';
    return 'text-green-500';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-serif font-bold text-white uppercase tracking-tight">Organizations</h2>
          <p className="text-zinc-500 text-sm mt-2">Manage all client organizations</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchOrganizations}
            className="flex items-center gap-2 px-4 py-2 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 text-xs font-bold uppercase tracking-widest transition-all"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <Link
            href="/webmaster/organizations/new"
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white hover:bg-orange-700 text-xs font-bold uppercase tracking-widest transition-all"
          >
            <Plus size={16} />
            New Organization
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:border-orange-600 focus:outline-none transition-colors"
        />
      </div>

      {/* Organizations Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-500">
          <RefreshCw className="animate-spin mr-2" size={20} />
          Loading organizations...
        </div>
      ) : filteredOrgs.length > 0 ? (
        <div className="overflow-x-auto border border-zinc-800">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-zinc-500">Organization</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-zinc-500">Email</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-zinc-500">Plan</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-zinc-500">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-zinc-500">Usage</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-zinc-500">Created</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-widest text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrgs.map((org) => {
                const usagePercentage = (org.current_usage / org.monthly_limit) * 100;
                return (
                  <tr key={org.id} className="border-b border-zinc-800 hover:bg-zinc-900/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{org.name}</div>
                      <div className="text-xs text-zinc-500 mt-1">ID: {org.id}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-300">{org.email}</td>
                    <td className="px-6 py-4 text-sm text-white font-medium">{org.plan_name || 'No Plan'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-widest ${getStatusColor(org.subscription_status)}`}>
                        {org.subscription_status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className={`text-sm font-bold ${getUsageColor(org.current_usage, org.monthly_limit)}`}>
                          {org.current_usage} / {org.monthly_limit}
                        </div>
                        <div className="w-24 h-1 bg-zinc-800 rounded overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              usagePercentage >= 90
                                ? 'bg-red-500'
                                : usagePercentage >= 70
                                ? 'bg-orange-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-400">
                      {new Date(org.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/webmaster/organizations/${org.id}`}
                          className="p-2 hover:bg-zinc-800 rounded transition-colors"
                          title="View details"
                        >
                          <Eye size={16} className="text-zinc-400 hover:text-white" />
                        </Link>
                        <Link
                          href={`/webmaster/organizations/${org.id}/edit`}
                          className="p-2 hover:bg-zinc-800 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} className="text-zinc-400 hover:text-orange-500" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 p-12 text-center">
          <p className="text-zinc-500 mb-4">No organizations found</p>
          <Link
            href="/webmaster/organizations/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white hover:bg-orange-700 text-xs font-bold uppercase tracking-widest transition-all"
          >
            <Plus size={16} />
            Create First Organization
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-zinc-800 pt-8">
        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <div className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Total Organizations</div>
          <div className="text-3xl font-serif font-bold text-white mt-2">{organizations.length}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <div className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Active Subscriptions</div>
          <div className="text-3xl font-serif font-bold text-white mt-2">
            {organizations.filter((o) => o.subscription_status === 'active').length}
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <div className="text-zinc-500 text-xs uppercase tracking-widest font-bold">At Risk (90%+ usage)</div>
          <div className="text-3xl font-serif font-bold text-orange-500 mt-2">
            {organizations.filter((o) => (o.current_usage / o.monthly_limit) * 100 >= 90).length}
          </div>
        </div>
      </div>
    </div>
  );
}
