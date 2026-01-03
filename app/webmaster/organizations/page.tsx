'use client';

import React, { useEffect, useState } from 'react';
import { Info, RefreshCw, Users, Building, Shield } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  email: string;
  type?: 'PRIMARY' | 'CLIENT' | 'PARTNER';
  isSingleton?: boolean;
  status: string;
  subscription_status?: string;
  plan_name?: string;
  createdAt?: string;
}

interface OrganizationsResponse {
  success: boolean;
  mode: 'single-tenant' | 'multi-tenant';
  organizations: Organization[];
  capabilities: {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canProvision: boolean;
  };
  message?: string;
}

export default function OrganizationsPage() {
  const [response, setResponse] = useState<OrganizationsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/webmaster/organizations');
      const data = await response.json();
      if (data.success) {
        setResponse(data);
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const isSingleTenant = response?.mode === 'single-tenant';
  const canManageOrgs = response?.capabilities?.canCreate || false;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-serif font-bold text-white uppercase tracking-tight">
            Organization Management
          </h2>
          <p className="text-zinc-500 text-sm mt-2">
            {isSingleTenant ? 'Single-tenant deployment • No additional organizations can be created' : 'Manage all client organizations'}
          </p>
        </div>
        <button
          onClick={fetchOrganizations}
          className="flex items-center gap-2 px-4 py-2 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 text-xs font-bold uppercase tracking-widest transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Mode Indicator - Single Tenant */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-500">
          <RefreshCw className="animate-spin mr-2" size={20} />
          Loading organizations...
        </div>
      ) : isSingleTenant ? (
        <>
          <div className="bg-zinc-900 border border-zinc-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Info className="text-blue-500" size={24} />
              <h3 className="text-lg font-semibold text-white">Single-Tenant Mode</h3>
            </div>
            <p className="text-zinc-400 mb-4">
              This deployment is configured for single-tenant operation with the primary organization
              shown below. Multi-organization support will be available when this dashboard is
              expanded into a centralized admin control plane.
            </p>

            {/* Singleton Organization Display */}
            {response?.organizations?.[0] && (
              <div className="bg-zinc-800 p-4 rounded">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-white flex items-center gap-2">
                      <Building size={16} className="text-zinc-400" />
                      {response.organizations[0].name}
                    </h4>
                    <p className="text-sm text-zinc-400">{response.organizations[0].email}</p>
                    <p className="text-xs text-zinc-500 mt-1">Primary Organization • ID: {response.organizations[0].id}</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Subscription: {
                        response.organizations[0].subscription_status === 'active'
                          ? 'Active'
                          : 'Firm has not chosen a plan yet'
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {response.organizations[0].subscription_status === 'active' ? (
                      <>
                        <Shield size={16} className="text-green-500" />
                        <span className="px-3 py-1 bg-green-900/20 text-green-500 text-xs font-bold uppercase tracking-widest rounded">
                          Active
                        </span>
                      </>
                    ) : (
                      <>
                        <Shield size={16} className="text-zinc-400" />
                        <span className="px-3 py-1 bg-zinc-800/50 text-zinc-400 text-xs font-bold uppercase tracking-widest rounded">
                          Trial
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Future Capabilities (Disabled) */}
          <div className="border-t border-zinc-800 pt-8">
            <h3 className="text-xl font-serif font-bold text-white uppercase tracking-tight mb-6">
              Future Capabilities
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: "Add Organizations", desc: "Provision new client firms", disabled: true },
                { title: "Cross-Org Analytics", desc: "System-wide usage metrics", disabled: true },
                { title: "User Provisioning", desc: "Bulk user management", disabled: true }
              ].map(item => (
                <div key={item.title} className="bg-zinc-900/50 border border-zinc-800 p-4 opacity-60">
                  <h4 className="font-semibold text-zinc-500">{item.title}</h4>
                  <p className="text-sm text-zinc-600 mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Multi-tenant mode UI would go here when implemented */
        <div className="bg-zinc-900 border border-zinc-800 p-12 text-center">
          <p className="text-zinc-500">Multi-tenant organization management not yet implemented</p>
        </div>
      )}

      {/* Deployment Info */}
      {response && (
        <div className="border-t border-zinc-800 pt-8">
          <div className="bg-zinc-900/50 border border-zinc-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">
                  <span className="font-semibold">Deployment Mode:</span> {response.mode}
                </p>
                {response.message && (
                  <p className="text-xs text-zinc-500 mt-1">{response.message}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-zinc-400">
                  <span className="font-semibold">Organizations:</span> {response.organizations?.length || 0}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Management: {canManageOrgs ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
