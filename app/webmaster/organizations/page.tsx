'use client';

import React, { useEffect, useState } from 'react';
import { Info, RefreshCw, Building, Shield } from 'lucide-react';
import { OrganizationsResponseSchema, OrganizationsResponse } from '@/lib/schemas';

export default function OrganizationsPage() {
  const [response, setResponse] = useState<OrganizationsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    // #region agent log - organizations page data update
    fetch('http://127.0.0.1:7242/ingest/1b3163b7-f1ae-4e91-bf21-62593b0c9267', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'app/webmaster/organizations/page.tsx:data-update',
        message: 'Organizations page received data update',
        data: {
          organizationsCount: response?.organizations?.length || 0,
          firstOrg: response?.organizations?.[0] ? {
            id: response.organizations[0].id,
            name: response.organizations[0].name,
            subscription_status: response.organizations[0].subscription_status,
            plan_name: response.organizations[0].plan_name
          } : null
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'frontend-debug',
        hypothesisId: 'FE1,FE2,FE3'
      })
    }).catch(() => {});
    // #endregion
  }, [response]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/webmaster/organizations');
      const rawData = await response.json();

      // #region agent log - organizations API response
      fetch('http://127.0.0.1:7242/ingest/1b3163b7-f1ae-4e91-bf21-62593b0c9267', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'app/webmaster/organizations/page.tsx:api-response',
          message: 'Organizations API response received',
          data: {
            success: rawData.success,
            organizationsCount: rawData.organizations?.length || 0,
            firstOrg: rawData.organizations?.[0] ? {
              id: rawData.organizations[0].id,
              subscription_status: rawData.organizations[0].subscription_status,
              plan_name: rawData.organizations[0].plan_name
            } : null
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'frontend-debug',
          hypothesisId: 'FE1,FE2'
        })
      }).catch(() => {});
      // #endregion

      // Validate response with Zod (with fallback)
      let validatedData: OrganizationsResponse;
      try {
        validatedData = OrganizationsResponseSchema.parse(rawData);

        // #region agent log - zod validation success
        fetch('http://127.0.0.1:7242/ingest/1b3163b7-f1ae-4e91-bf21-62593b0c9267', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'app/webmaster/organizations/page.tsx:zod-validation',
            message: 'Zod validation successful',
            data: {
              validatedOrganizationsCount: validatedData.organizations?.length || 0,
              firstValidatedOrg: validatedData.organizations?.[0] ? {
                id: validatedData.organizations[0].id,
                subscription_status: validatedData.organizations[0].subscription_status,
                plan_name: validatedData.organizations[0].plan_name
              } : null
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'zod-test',
            hypothesisId: 'FE3,FE4'
          })
        }).catch(() => {});
        // #endregion
      } catch (zodError) {
        console.warn('Zod validation failed, using raw data:', zodError);
        // #region agent log - zod validation failed
        fetch('http://127.0.0.1:7242/ingest/1b3163b7-f1ae-4e91-bf21-62593b0c9267', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'app/webmaster/organizations/page.tsx:zod-validation-failed',
            message: 'Zod validation failed, using raw data',
            data: {
              error: zodError instanceof Error ? zodError.message : String(zodError),
              rawDataKeys: Object.keys(rawData)
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'zod-test',
            hypothesisId: 'FE3,FE4'
          })
        }).catch(() => {});
        // #endregion

        // Fallback: use raw data if Zod validation fails
        validatedData = rawData as OrganizationsResponse;
      }

      if (validatedData.success) {
        setResponse(validatedData);
      } else {
        console.error('API returned success: false', validatedData);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('Failed to fetch or validate organizations:', error.message);
      } else {
        console.error('Zod validation failed:', error);
      }
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
