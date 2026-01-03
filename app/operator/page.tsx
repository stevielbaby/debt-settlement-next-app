"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Search, Filter, AlertTriangle, ArrowRight, Clock, Building2, User, Tag, FileText, Settings, CreditCard } from "lucide-react";
import Link from "next/link";
import { extractErrorMessage } from "@/lib/error-utils";

interface CaseItem {
  id: string;
  caseNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  priority: string;
  organization: string;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  new: "bg-zinc-800 text-zinc-200",
  contacted: "bg-blue-900/40 text-blue-200 border border-blue-800",
  qualified: "bg-emerald-900/40 text-emerald-200 border border-emerald-800",
  retained: "bg-orange-900/40 text-orange-200 border border-orange-800",
  closed: "bg-zinc-800 text-zinc-400",
};

const priorityColors: Record<string, string> = {
  urgent: "text-red-400",
  normal: "text-zinc-400",
};

export default function OperatorCasesPage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const res = await fetch("/api/operator/cases");
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.cases)) {
          setCases(data.cases);
        } else {
          // Extract human-readable message from API error response
          setError(extractErrorMessage(data.error) || "Failed to load cases");
        }
      } catch (err) {
        console.error("Failed to fetch cases", err);
        setError("Failed to load cases");
      } finally {
        setLoading(false);
      }
    };
    fetchCases();
  }, []);

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      const matchesQuery = `${c.caseNumber} ${c.firstName} ${c.lastName} ${c.email}`
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchesStatus = statusFilter ? c.status === statusFilter : true;
      return matchesQuery && matchesStatus;
    });
  }, [cases, query, statusFilter]);

  return (
    <div className="space-y-10 animate-fadeIn">
      {/* Navigation Tabs */}
      <div className="flex gap-4 border-b border-zinc-800 overflow-x-auto">
        <button
          className="px-6 py-4 text-sm font-bold uppercase tracking-wider text-orange-600 border-b-2 border-orange-600 flex items-center gap-2 whitespace-nowrap"
        >
          <ShieldCheck size={16} />
          Case Queue
        </button>
        <Link
          href="/operator/submissions"
          className="px-6 py-4 text-sm font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors border-b-2 border-transparent hover:border-zinc-700 flex items-center gap-2 whitespace-nowrap"
        >
          <FileText size={16} />
          Submissions
        </Link>
        <Link
          href="/operator/payments"
          className="px-6 py-4 text-sm font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors border-b-2 border-transparent hover:border-zinc-700 flex items-center gap-2 whitespace-nowrap"
        >
          <CreditCard size={16} />
          Billing & Payments
        </Link>
        <Link
          href="/operator/settings"
          className="px-6 py-4 text-sm font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors border-b-2 border-transparent hover:border-zinc-700 flex items-center gap-2 whitespace-nowrap"
        >
          <Settings size={16} />
          Settings
        </Link>
      </div>

      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 border-b border-zinc-800 pb-8">
        <div>
          <div className="inline-flex items-center gap-2 text-orange-600 text-[10px] font-bold uppercase tracking-[0.2em] mb-3">
            <ShieldCheck size={14} /> Operator Command
          </div>
          <h1 className="text-4xl md:text-5xl font-serif text-white uppercase tracking-tight">Case Queue</h1>
          <p className="text-zinc-500 mt-3 max-w-2xl">
            Triage incoming intakes, adjust status and priority, and prepare for attorney review.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            { label: "All", value: null },
            { label: "New", value: "new" },
            { label: "Contacted", value: "contacted" },
            { label: "Qualified", value: "qualified" },
            { label: "Retained", value: "retained" },
            { label: "Closed", value: "closed" },
          ].map((f) => (
            <button
              key={f.label}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1 text-xs uppercase tracking-widest border border-zinc-700 transition-colors ${
                statusFilter === f.value ? "bg-orange-600 text-white border-orange-500" : "text-zinc-400 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        <div className="flex-1 flex items-center gap-3 bg-zinc-900 border border-zinc-800 px-4 py-3">
          <Search className="text-zinc-500" size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by case number, name, email"
            className="bg-transparent outline-none text-sm text-white flex-1"
          />
        </div>
        <div className="inline-flex items-center gap-2 text-zinc-500 text-xs uppercase tracking-widest">
          <Filter size={14} /> {filtered.length} results
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-500">Loading cases…</div>
      ) : error ? (
        <div className="border border-red-900 bg-red-950/40 p-8 flex flex-col gap-3 text-center text-red-200">
          <p className="text-white font-semibold">Could not load cases</p>
          <p className="text-red-200 text-sm">
            {extractErrorMessage(error)}
          </p>
          <p className="text-zinc-500 text-xs">Ensure you are signed in as an operator or webmaster.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-zinc-800 bg-zinc-900 p-8 flex flex-col gap-3 text-center">
          <AlertTriangle className="mx-auto text-orange-600" />
          <p className="text-white font-semibold">No cases found</p>
          <p className="text-zinc-500 text-sm">Try adjusting filters or check that intakes are flowing into the system.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filtered.map((c) => (
            <div key={c.id} className="border border-zinc-800 bg-zinc-900 p-6 flex flex-col gap-4 hover:border-orange-700 transition-colors">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Case</div>
                  <div className="text-xl font-serif text-white">CASE-{c.caseNumber}</div>
                  <div className="text-zinc-400 text-sm flex items-center gap-2">
                    <User size={14} className="text-orange-600" /> {c.firstName} {c.lastName}
                  </div>
                  <div className="text-zinc-500 text-xs">{c.email} • {c.phone}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-[11px] px-2 py-1 uppercase tracking-widest ${statusColors[c.status] || 'bg-zinc-800 text-zinc-200'}`}>
                    {c.status}
                  </span>
                  <span className={`text-[11px] uppercase tracking-widest flex items-center gap-1 ${priorityColors[c.priority] || 'text-zinc-400'}`}>
                    <Tag size={12} /> {c.priority}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-zinc-500">
                <div className="flex items-center gap-1"><Clock size={12} className="text-orange-600" /> {new Date(c.createdAt).toLocaleDateString()}</div>
                <div className="flex items-center gap-1"><Building2 size={12} className="text-orange-600" /> {c.organization}</div>
              </div>
              <div className="flex justify-between items-center pt-2">
                <div className="text-[11px] uppercase tracking-widest text-zinc-500">View / Update</div>
                <a
                  className="inline-flex items-center gap-2 text-orange-500 text-sm font-semibold hover:text-white"
                  href={`/operator/cases/${c.id}`}
                >
                  Open Case <ArrowRight size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
