'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Edit2, Archive, CheckCircle, AlertCircle, Clock, Mail, Phone, DollarSign, Calendar, FileText } from 'lucide-react';
import { useParams } from 'next/navigation';

interface LeadDetail {
  id: string;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'ARCHIVED';
  type: 'DEBT_SETTLEMENT' | 'BANKRUPTCY';
  email: string;
  fullName: string | null;
  phone: string | null;
  debtAmount: number | null;
  createdAt: string;
  updatedAt: string;

  intakePayload: {
    version: number;
    data: any;
  } | null;

  submissions: Array<{
    id: string;
    createdAt: string;
    payloadVersion: number;
  }>;

  canConvert: boolean;
  conversionBlockReason?: string;

  relatedCases: Array<{
    id: string;
    caseNumber: number;
    status: string;
    createdAt: string;
  }>;
}

export default function LeadDetailPage() {
  const params = useParams();
  const leadId = params.leadId as string;

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchLeadDetail();
  }, [leadId]);

  const fetchLeadDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/operator/leads/${leadId}`);
      const data = await response.json();

      if (data.success) {
        setLead(data.lead);
      }
    } catch (error) {
      console.error('Failed to fetch lead detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStatus = async (newStatus: LeadDetail['status']) => {
    if (!lead) return;

    try {
      setUpdating(true);
      const response = await fetch(`/api/operator/leads/${leadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (data.success) {
        setLead(prev => prev ? { ...prev, status: newStatus, updatedAt: data.lead.updatedAt } : null);
      } else {
        alert(`Error: ${data.error.message}`);
      }
    } catch (error) {
      console.error('Failed to update lead status:', error);
      alert('Failed to update lead status');
    } finally {
      setUpdating(false);
    }
  };

  const convertToCase = async () => {
    if (!lead?.canConvert) return;

    try {
      setUpdating(true);
      const response = await fetch(`/api/operator/leads/${leadId}/convert-to-case`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to the new case
        window.location.href = `/operator/cases/${data.caseId}`;
      } else {
        alert(`Error: ${data.error.message}`);
      }
    } catch (error) {
      console.error('Failed to convert lead to case:', error);
      alert('Failed to convert lead to case');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusConfig = (status: LeadDetail['status']) => {
    switch (status) {
      case 'NEW':
        return { color: 'text-blue-500 bg-blue-900/20', canEdit: true, canConvert: true };
      case 'CONTACTED':
        return { color: 'text-yellow-500 bg-yellow-900/20', canEdit: true, canConvert: true };
      case 'QUALIFIED':
        return { color: 'text-green-500 bg-green-900/20', canEdit: true, canConvert: true };
      case 'CONVERTED':
        return { color: 'text-gray-500 bg-gray-900/20', canEdit: false, canConvert: false };
      case 'ARCHIVED':
        return { color: 'text-red-500 bg-red-900/20', canEdit: false, canConvert: false };
      default:
        return { color: 'text-zinc-500 bg-zinc-900/20', canEdit: false, canConvert: false };
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'Not specified';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        <span className="ml-3 text-zinc-500">Loading lead details...</span>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href="/operator"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-12 text-center">
          <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
          <h2 className="text-xl font-semibold text-white mb-2">Lead Not Found</h2>
          <p className="text-zinc-400">The requested lead could not be found or you don't have permission to view it.</p>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(lead.status);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/operator"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
      </div>

      {/* Lead Header */}
      <div className="bg-zinc-900 border border-zinc-800 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-serif font-bold text-white mb-2">
              {lead.fullName || 'Unknown Name'}
            </h1>
            <div className="flex items-center gap-4 text-sm text-zinc-400">
              <span className="flex items-center gap-1">
                <Mail size={14} />
                {lead.email}
              </span>
              {lead.phone && (
                <span className="flex items-center gap-1">
                  <Phone size={14} />
                  {lead.phone}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${statusConfig.color}`}>
              {lead.status}
            </span>

            {statusConfig.canEdit && (
              <div className="flex gap-2">
                {lead.status !== 'CONTACTED' && (
                  <button
                    onClick={() => updateLeadStatus('CONTACTED')}
                    disabled={updating}
                    className="px-3 py-1 bg-yellow-600 text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-yellow-700 transition-colors disabled:opacity-50"
                  >
                    Mark Contacted
                  </button>
                )}
                {lead.status !== 'QUALIFIED' && lead.status !== 'CONVERTED' && (
                  <button
                    onClick={() => updateLeadStatus('QUALIFIED')}
                    disabled={updating}
                    className="px-3 py-1 bg-green-600 text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    Mark Qualified
                  </button>
                )}
                {lead.status !== 'ARCHIVED' && lead.status !== 'CONVERTED' && (
                  <button
                    onClick={() => updateLeadStatus('ARCHIVED')}
                    disabled={updating}
                    className="px-3 py-1 bg-red-600 text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    Archive
                  </button>
                )}
              </div>
            )}

            {lead.canConvert && (
              <button
                onClick={convertToCase}
                disabled={updating}
                className="px-4 py-2 bg-orange-600 text-white text-sm font-bold uppercase tracking-widest rounded hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                Convert to Case
              </button>
            )}
          </div>
        </div>

        {/* Lead Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-800 p-4 rounded">
            <div className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-1">Type</div>
            <div className="text-white capitalize">{lead.type.replace('_', ' ')}</div>
          </div>

          <div className="bg-zinc-800 p-4 rounded">
            <div className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-1">Debt Amount</div>
            <div className="text-white flex items-center gap-1">
              <DollarSign size={14} />
              {formatCurrency(lead.debtAmount)}
            </div>
          </div>

          <div className="bg-zinc-800 p-4 rounded">
            <div className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-1">Created</div>
            <div className="text-white flex items-center gap-1">
              <Calendar size={14} />
              {new Date(lead.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Conversion Block Reason */}
        {!lead.canConvert && lead.conversionBlockReason && (
          <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle size={16} />
              <span className="text-sm">
                {lead.conversionBlockReason === 'already_converted' && 'This lead has already been converted to a case.'}
                {lead.conversionBlockReason === 'active_case_exists' && 'An active case already exists for this email address.'}
                {lead.conversionBlockReason === 'invalid_status' && 'Lead status must be NEW, CONTACTED, or QUALIFIED to convert.'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Intake Details */}
      {lead.intakePayload && (
        <div className="bg-zinc-900 border border-zinc-800 p-6">
          <h2 className="text-xl font-serif font-bold text-white mb-4 flex items-center gap-2">
            <FileText size={20} />
            Intake Details
          </h2>

          <div className="bg-zinc-800 p-4 rounded">
            <pre className="text-sm text-zinc-300 whitespace-pre-wrap overflow-x-auto">
              {JSON.stringify(lead.intakePayload.data, null, 2)}
            </pre>
          </div>

          <div className="mt-4 text-xs text-zinc-500">
            Version {lead.intakePayload.version} • Submitted {new Date(lead.submissions[0]?.createdAt || lead.createdAt).toLocaleString()}
          </div>
        </div>
      )}

      {/* Related Cases */}
      {lead.relatedCases.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 p-6">
          <h2 className="text-xl font-serif font-bold text-white mb-4">Related Cases</h2>

          <div className="space-y-3">
            {lead.relatedCases.map(caseInfo => (
              <div key={caseInfo.id} className="bg-zinc-800 p-4 rounded">
                <div className="flex items-center justify-between">
                  <div>
                    <Link
                      href={`/operator/cases/${caseInfo.id}`}
                      className="text-orange-400 hover:text-orange-300 font-semibold"
                    >
                      Case #{caseInfo.caseNumber}
                    </Link>
                    <div className="text-sm text-zinc-400 mt-1">
                      Created {new Date(caseInfo.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-widest ${
                    caseInfo.status === 'ACTIVE'
                      ? 'text-green-500 bg-green-900/20'
                      : 'text-zinc-500 bg-zinc-900/20'
                  }`}>
                    {caseInfo.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submission History */}
      {lead.submissions.length > 1 && (
        <div className="bg-zinc-900 border border-zinc-800 p-6">
          <h2 className="text-xl font-serif font-bold text-white mb-4">Submission History</h2>

          <div className="space-y-3">
            {lead.submissions.map((submission, index) => (
              <div key={submission.id} className="bg-zinc-800 p-3 rounded flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-zinc-400" />
                  <span className="text-zinc-300">
                    Version {submission.payloadVersion}
                    {index === 0 && ' (Latest)'}
                  </span>
                </div>
                <span className="text-xs text-zinc-500">
                  {new Date(submission.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

