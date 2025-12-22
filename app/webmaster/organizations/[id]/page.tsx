'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Organization {
  id: string;
  name: string;
  email: string;
  subscription_status: string;
  plan_name: string;
  monthly_limit: number;
  current_usage: number;
  created_at: string;
  contact_name?: string;
  phone?: string;
  address?: string;
}

interface User {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

interface InviteCodeData {
  inviteCode: string;
  inviteLink: string;
}

export default function OrganizationDetail() {
  const router = useRouter();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteCode, setInviteCode] = useState<string>('');
  const [inviteLink, setInviteLink] = useState<string>('');
  const [loadingInviteCode, setLoadingInviteCode] = useState(false);
  const [inviteCodeError, setInviteCodeError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  const routeParams = useParams();
  const orgId = Array.isArray(routeParams?.id)
    ? routeParams.id[0]
    : (routeParams?.id as string | undefined);

  useEffect(() => {
    if (!orgId) return;
    fetchOrganization(orgId);
    fetchInviteCode(orgId);
  }, [orgId]);

  const fetchOrganization = async (id: string) => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/webmaster/organizations/${id}`);
      const data = await response.json();
      if (data.success) {
        setOrganization(data.organization);
        setUsers(data.users || []);
      } else {
        setError(data.error || 'Failed to load organization');
      }
    } catch (err) {
      setError('Failed to load organization');
    } finally {
      setLoading(false);
    }
  };

  const fetchInviteCode = async (id: string) => {
    try {
      setLoadingInviteCode(true);
      setInviteCodeError('');
      const response = await fetch(`/api/webmaster/organizations/${id}/invite-code`);
      const data = await response.json();
      if (data.success) {
        setInviteCode(data.inviteCode || '');
        setInviteLink(data.inviteLink || '');
      } else {
        setInviteCodeError(data.error || 'Failed to load invite code');
      }
    } catch (err) {
      setInviteCodeError('Failed to load invite code');
    } finally {
      setLoadingInviteCode(false);
    }
  };

  const handleGenerateNewCode = async () => {
    if (!orgId) return;
    try {
      setLoadingInviteCode(true);
      setInviteCodeError('');
      const response = await fetch(`/api/webmaster/organizations/${orgId}/invite-code`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        setInviteCode(data.inviteCode);
        setInviteLink(data.inviteLink);
      } else {
        setInviteCodeError(data.error || 'Failed to generate invite code');
      }
    } catch (err) {
      setInviteCodeError('Failed to generate invite code');
    } finally {
      setLoadingInviteCode(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      setInviteCodeError('Failed to copy code to clipboard');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-zinc-500">
        <RefreshCw className="animate-spin mr-2" size={20} />
        Loading organization...
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="space-y-4">
        <Link href="/webmaster/organizations" className="flex items-center gap-2 text-orange-600 hover:text-orange-400 text-sm font-bold uppercase tracking-widest">
          <ArrowLeft size={16} />
          Back to Organizations
        </Link>
        <div className="bg-zinc-900 border border-red-900 p-6 text-red-400">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={20} />
            <span className="font-bold">Error</span>
          </div>
          {error}
        </div>
      </div>
    );
  }

  const usagePercentage = (organization.current_usage / organization.monthly_limit) * 100;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/webmaster/organizations" className="flex items-center justify-center w-10 h-10 border border-zinc-700 hover:border-orange-600 rounded transition-colors">
            <ArrowLeft size={18} className="text-zinc-400" />
          </Link>
          <div>
            <h2 className="text-4xl font-serif font-bold text-white uppercase tracking-tight">{organization.name}</h2>
            <p className="text-zinc-500 text-sm mt-2">{organization.email}</p>
          </div>
        </div>
        <Link
          href={`/webmaster/organizations/${organization.id}/edit`}
          className="px-4 py-2 bg-orange-600 text-white hover:bg-orange-700 text-xs font-bold uppercase tracking-widest transition-all"
        >
          Edit Organization
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Organization Info */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4">
            <h3 className="text-lg font-serif font-bold text-white uppercase tracking-tight">Organization Details</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-2">Organization ID</p>
                <p className="font-mono text-sm text-white">{organization.id}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-2">Created</p>
                <p className="text-sm text-white">{new Date(organization.created_at).toLocaleDateString()}</p>
              </div>
              {organization.contact_name && (
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-2">Contact Name</p>
                  <p className="text-sm text-white">{organization.contact_name}</p>
                </div>
              )}
              {organization.phone && (
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-2">Phone</p>
                  <p className="text-sm text-white">{organization.phone}</p>
                </div>
              )}
            </div>
          </div>

          {/* Subscription Info */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4">
            <h3 className="text-lg font-serif font-bold text-white uppercase tracking-tight">Subscription</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-2">Plan</p>
                <p className="text-white font-bold">{organization.plan_name || 'No Plan'}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-2">Status</p>
                <span
                  className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-widest inline-block ${
                    organization.subscription_status === 'active'
                      ? 'text-green-500 bg-green-900/20'
                      : organization.subscription_status === 'trialing'
                      ? 'text-blue-500 bg-blue-900/20'
                      : organization.subscription_status === 'past_due'
                      ? 'text-orange-500 bg-orange-900/20'
                      : 'text-red-500 bg-red-900/20'
                  }`}
                >
                  {organization.subscription_status}
                </span>
              </div>
            </div>
          </div>

          {/* Invite Code Section */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4">
            <h3 className="text-lg font-serif font-bold text-white uppercase tracking-tight">Operator Invitation</h3>
            {inviteCodeError && (
              <div className="bg-red-900/20 border border-red-800 p-3 rounded text-red-400 text-sm">
                {inviteCodeError}
              </div>
            )}
            {loadingInviteCode ? (
              <div className="flex items-center justify-center py-8 text-zinc-500">
                <RefreshCw className="animate-spin mr-2" size={16} />
                Loading invite code...
              </div>
            ) : inviteCode ? (
              <div className="space-y-4">
                <p className="text-zinc-400 text-sm">
                  Share this code with operators to let them join your organization.
                </p>
                <div className="bg-zinc-800 border border-zinc-700 p-4 rounded space-y-3">
                  <div>
                    <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-2">Invite Code</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-zinc-900 border border-zinc-600 p-3 rounded font-mono text-lg font-bold text-orange-500">
                        {inviteCode}
                      </code>
                      <button
                        onClick={handleCopyCode}
                        className={`px-3 py-2 rounded text-xs font-bold uppercase tracking-widest transition-all ${
                          copySuccess
                            ? 'bg-green-600 text-white'
                            : 'bg-zinc-700 text-white hover:bg-zinc-600'
                        }`}
                      >
                        {copySuccess ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-2">Invite Link</p>
                    <p className="text-xs text-zinc-400 break-all bg-zinc-900 p-2 rounded border border-zinc-700">
                      {inviteLink}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleGenerateNewCode}
                  disabled={loadingInviteCode}
                  className="w-full px-4 py-2 border border-zinc-700 text-white hover:border-orange-600 text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
                >
                  Generate New Code
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-zinc-400 text-sm">No invite code generated yet.</p>
                <button
                  onClick={handleGenerateNewCode}
                  disabled={loadingInviteCode}
                  className="w-full px-4 py-2 bg-orange-600 text-white hover:bg-orange-700 text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
                >
                  Generate Invite Code
                </button>
              </div>
            )}
          </div>

          {/* Usage Info */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4">
            <h3 className="text-lg font-serif font-bold text-white uppercase tracking-tight">Usage This Month</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Cases Created</span>
                <span className={`font-bold ${usagePercentage >= 90 ? 'text-red-500' : usagePercentage >= 70 ? 'text-orange-500' : 'text-green-500'}`}>
                  {organization.current_usage} / {organization.monthly_limit}
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-800 rounded overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    usagePercentage >= 90 ? 'bg-red-500' : usagePercentage >= 70 ? 'bg-orange-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                />
              </div>
              <div className="text-xs text-zinc-500">
                {usagePercentage.toFixed(1)}% usage
                {usagePercentage >= 90 && (
                  <div className="mt-2 text-orange-500 font-bold">⚠️ Organization is near usage limit</div>
                )}
              </div>
            </div>
          </div>

          {/* Users */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4">
            <h3 className="text-lg font-serif font-bold text-white uppercase tracking-tight">Organization Users</h3>
            {users.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left py-2 px-2 text-zinc-500 text-xs uppercase tracking-widest font-bold">Email</th>
                      <th className="text-left py-2 px-2 text-zinc-500 text-xs uppercase tracking-widest font-bold">Role</th>
                      <th className="text-left py-2 px-2 text-zinc-500 text-xs uppercase tracking-widest font-bold">Added</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-zinc-800 hover:bg-zinc-800/30">
                        <td className="py-3 px-2 text-white">{user.email}</td>
                        <td className="py-3 px-2 text-zinc-300 capitalize">{user.role}</td>
                        <td className="py-3 px-2 text-zinc-500 text-xs">{new Date(user.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-zinc-500 text-sm">No users found for this organization</p>
            )}
          </div>
        </div>

        {/* Right Column - Quick Actions */}
        <div className="space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4">
            <h3 className="text-sm font-serif font-bold text-white uppercase tracking-tight">Quick Actions</h3>
            <Link
              href={`/webmaster/organizations/${organization.id}/edit`}
              className="block w-full px-4 py-2 bg-orange-600 text-white hover:bg-orange-700 text-xs font-bold uppercase tracking-widest text-center transition-all"
            >
              Edit Details
            </Link>
            <Link
              href={`/webmaster/subscriptions?org=${organization.id}`}
              className="block w-full px-4 py-2 border border-zinc-700 text-white hover:border-orange-600 text-xs font-bold uppercase tracking-widest text-center transition-all"
            >
              Manage Subscription
            </Link>
            <button className="block w-full px-4 py-2 border border-red-900 text-red-400 hover:bg-red-900/20 text-xs font-bold uppercase tracking-widest transition-all">
              Suspend Organization
            </button>
          </div>

          {/* Support Info */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-3">
            <h3 className="text-sm font-serif font-bold text-white uppercase tracking-tight">Support</h3>
            <p className="text-xs text-zinc-500">
              For issues with this organization, contact support or use the management tools above.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
