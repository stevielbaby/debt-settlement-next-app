'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Database, Search, Calendar, Mail, Phone, FileText, RefreshCw, Clock, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Lead {
  id: number;
  case_number?: number;
  first_name: string;
  last_name: string;
  situation: string;
  debt_amount: string;
  current_company: string;
  email: string;
  phone: string;
  created_at: string;
  appointment_date?: string;
  appointment_time?: string;
  appointment_slot_start?: string;
  appointment_slot_end?: string;
}

export const SubmissionsReview = ({ onBack }: { onBack?: () => void }) => {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = async () => {
    try {
      console.log('Fetching leads...');
      setLoading(true);
      const response = await fetch('/api/leads');
      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response data:', result);

      if (response.ok && result.success) {
        setLeads(result.leads);
      } else {
        throw new Error(result.error || 'Failed to fetch submissions');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAppointmentDate = (dateString: string | undefined) => {
    if (!dateString) return null;
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push('/admin');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 pt-24 pb-20 animate-fadeIn">
      <div className="max-w-7xl mx-auto px-4">
        <button onClick={handleBack} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-12 group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] uppercase font-bold tracking-[0.2em]">Return to Admin</span>
        </button>

        <div className="mb-12 border-b border-zinc-800 pb-12">
          <div className="inline-flex items-center gap-2 text-orange-600 font-bold uppercase tracking-widest text-[10px] mb-4">
            <Database size={14} /> INTERNAL SYSTEMS / SECURE
          </div>
          <h1 className="text-4xl md:text-6xl font-serif text-white uppercase tracking-tighter">Case Submissions</h1>
          <p className="text-zinc-500 text-sm mt-4">
            Review and manage all client intake submissions. Each entry represents a potential case requiring legal evaluation.
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 overflow-hidden">
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="text-orange-600" size={20} />
              <h2 className="text-white font-bold uppercase tracking-widest text-xs">All Submissions</h2>
              <span className="text-zinc-500 text-xs">({leads.length} total)</span>
            </div>
            <button
              onClick={fetchLeads}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-zinc-800 text-zinc-500 text-[10px] font-bold uppercase tracking-widest hover:text-white hover:border-zinc-600 transition-all"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="animate-spin text-orange-600 mx-auto mb-4" size={32} />
              <p className="text-zinc-500 text-sm">Loading submissions...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-red-500 text-sm mb-4">Error: {error}</p>
              <button
                onClick={fetchLeads}
                className="px-4 py-2 bg-orange-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-orange-500 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : leads.length === 0 ? (
            <div className="p-12 text-center">
              <Database className="text-zinc-600 mx-auto mb-4" size={48} />
              <p className="text-zinc-500 text-sm">No submissions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-950/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500">Case #</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500">Client</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500">Situation</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500">Debt Amount</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500">Contact</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500">Appointment</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-t border-zinc-800 hover:bg-zinc-950/30 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono text-white text-xs">CASE-{lead.case_number?.toString().padStart(4, '0') || lead.id.toString().padStart(4, '0')}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-white font-bold text-sm">{lead.first_name} {lead.last_name}</div>
                          {lead.current_company && (
                            <div className="text-zinc-500 text-xs">{lead.current_company}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-zinc-300 text-xs">{lead.situation}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-orange-600 font-bold text-xs">{lead.debt_amount || 'Not specified'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-zinc-300 text-xs">
                            <Mail size={12} />
                            {lead.email}
                          </div>
                          {lead.phone && (
                            <div className="flex items-center gap-2 text-zinc-300 text-xs">
                              <Phone size={12} />
                              {lead.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {lead.appointment_date && lead.appointment_time ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-green-500 text-xs font-bold">
                              <CheckCircle2 size={12} />
                              Scheduled
                            </div>
                            <div className="flex items-center gap-2 text-zinc-300 text-xs">
                              <Calendar size={12} />
                              {formatAppointmentDate(lead.appointment_date)}
                            </div>
                            <div className="flex items-center gap-2 text-zinc-300 text-xs">
                              <Clock size={12} />
                              {lead.appointment_time}
                            </div>
                          </div>
                        ) : (
                          <span className="text-zinc-600 text-xs italic">Not scheduled</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-zinc-500 text-xs">
                          <Calendar size={12} />
                          {formatDate(lead.created_at)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-8 flex items-center gap-2 text-zinc-600 text-[9px] uppercase tracking-tighter">
          <Database size={12} /> Data is fetched from the secure database. All submissions are confidential and protected.
        </div>
      </div>
    </div>
  );
};

