"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Mail, Phone, Building2, Shield, Tag, Clock, Loader2, AlertTriangle, Send } from "lucide-react";
import Link from "next/link";

interface CaseDetail {
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
  situation?: string;
  debtAmountRange?: string;
  currentCompany?: string;
}

interface Note {
  id: string;
  authorName: string;
  noteBody: string;
  createdAt: string;
}

export default function CaseDetailPage() {
  const params = useParams();
  const caseId = params?.id as string;
  const [data, setData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);

  useEffect(() => {
    const fetchCase = async () => {
      setError(null);
      try {
        const res = await fetch(`/api/operator/cases?id=${caseId}`);
        const json = await res.json();
        if (res.ok && json.success && Array.isArray(json.cases)) {
          const found = json.cases.find((c: any) => c.id === caseId) || json.cases[0];
          setData(found || null);
        } else {
          setError(json.error || "Failed to load case");
        }
      } catch (err) {
        console.error("Failed to load case", err);
        setError("Failed to load case");
      } finally {
        setLoading(false);
      }
    };
    fetchCase();
  }, [caseId]);

  const updateCase = async (updates: { status?: string; priority?: string }) => {
    if (!caseId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/operator/cases?id=${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Update failed");
        return;
      }
      if (json.case) {
        setData((prev) => {
          const base = (prev || {}) as CaseDetail;
          return {
            ...base,
            ...json.case,
            organization: json.case.organization || base.organization || "Unassigned",
          };
        });
      }
    } catch (err) {
      console.error("Failed to update case", err);
      setError("Failed to update case");
    } finally {
      setSaving(false);
    }
  };

  const fetchNotes = async () => {
    if (!caseId) return;
    setNotesLoading(true);
    try {
      const res = await fetch(`/api/operator/cases/notes?caseId=${caseId}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setNotes(json.notes || []);
      }
    } catch (err) {
      console.error("Failed to load notes", err);
    } finally {
      setNotesLoading(false);
    }
  };

  useEffect(() => {
    if (data) {
      fetchNotes();
    }
  }, [data]);

  const submitNote = async () => {
    if (!caseId || !newNote.trim()) return;
    setSubmittingNote(true);
    try {
      const res = await fetch(`/api/operator/cases/notes?caseId=${caseId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteBody: newNote }),
      });
      const json = await res.json();
      if (res.ok && json.success && json.note) {
        setNotes((prev) => [json.note, ...prev]);
        setNewNote("");
      } else {
        setError(json.error || "Failed to post note");
      }
    } catch (err) {
      console.error("Failed to submit note", err);
      setError("Failed to post note");
    } finally {
      setSubmittingNote(false);
    }
  };

  const statusOptions = [
    { label: "New", value: "new" },
    { label: "Contacted", value: "contacted" },
    { label: "Qualified", value: "qualified" },
    { label: "Retained", value: "retained" },
    { label: "Closed", value: "closed" },
  ];

  const priorityOptions = [
    { label: "Normal", value: "normal" },
    { label: "Urgent", value: "urgent" },
  ];

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-zinc-400">
        <Loader2 size={16} className="animate-spin" /> Loading case…
      </div>
    );
  }
  if (!data) {
    return <div className="text-zinc-400">Case not found.</div>;
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex items-center gap-3 text-zinc-400 text-sm">
        <Link href="/operator" className="inline-flex items-center gap-2 text-orange-500 hover:text-white">
          <ArrowLeft size={16} /> Back to cases
        </Link>
        <span className="text-zinc-700">•</span>
        <span>CASE-{data.caseNumber}</span>
      </div>

      <div className="border border-zinc-800 bg-zinc-900 p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Case</p>
            <h1 className="text-3xl font-serif text-white">{data.firstName} {data.lastName}</h1>
            <p className="text-zinc-500 text-sm flex items-center gap-2 mt-2">
              <Mail size={14} className="text-orange-600" /> {data.email}
              <span className="text-zinc-700">•</span>
              <Phone size={14} className="text-orange-600" /> {data.phone}
            </p>
          </div>
          <div className="text-right text-sm text-zinc-400 space-y-1">
            <div className="flex items-center gap-2 justify-end"><Shield size={14} className="text-orange-600" /> {data.status}</div>
            <div className="flex items-center gap-2 justify-end"><Tag size={14} className="text-orange-600" /> {data.priority}</div>
            <div className="flex items-center gap-2 justify-end"><Building2 size={14} className="text-orange-600" /> {data.organization}</div>
            <div className="flex items-center gap-2 justify-end"><Clock size={14} className="text-orange-600" /> {new Date(data.createdAt).toLocaleString()}</div>
          </div>
        </div>
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-950/40 border border-red-900 px-3 py-2">
            <AlertTriangle size={14} /> {error}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-zinc-800 bg-zinc-950">
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Status</p>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  disabled={saving}
                  onClick={() => updateCase({ status: opt.value })}
                  className={`px-3 py-1 text-xs uppercase tracking-widest border transition-colors ${
                    data.status === opt.value
                      ? "bg-orange-600 text-white border-orange-500"
                      : "border-zinc-700 text-zinc-400 hover:text-white"
                  } ${saving ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4 border border-zinc-800 bg-zinc-950">
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Priority</p>
            <div className="flex gap-2">
              {priorityOptions.map((opt) => (
                <button
                  key={opt.value}
                  disabled={saving}
                  onClick={() => updateCase({ priority: opt.value })}
                  className={`px-3 py-1 text-xs uppercase tracking-widest border transition-colors ${
                    data.priority === opt.value
                      ? "bg-orange-600 text-white border-orange-500"
                      : "border-zinc-700 text-zinc-400 hover:text-white"
                  } ${saving ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-zinc-300">
          <div className="p-4 border border-zinc-800 bg-zinc-950">
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Situation</p>
            <p className="text-zinc-200">{data.situation || 'Not provided'}</p>
          </div>
          <div className="p-4 border border-zinc-800 bg-zinc-950">
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Debt Amount</p>
            <p className="text-zinc-200">{data.debtAmountRange || 'Not provided'}</p>
          </div>
          <div className="p-4 border border-zinc-800 bg-zinc-950">
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Current Company</p>
            <p className="text-zinc-200">{data.currentCompany || 'Not provided'}</p>
          </div>
        </div>
      </div>

      <div className="border border-zinc-800 bg-zinc-900 p-6">
        <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-3">Next Steps</p>
        <ul className="space-y-2 text-sm text-zinc-300 list-disc list-inside">
          <li>Call client to validate intake facts.</li>
          <li>Upload contract and program docs.</li>
          <li>Run compliance checklist for TSR violations.</li>
        </ul>
      </div>

      <div className="border border-zinc-800 bg-zinc-900 p-6 space-y-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Activity Log</p>
        <div className="space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note..."
              disabled={submittingNote}
              className="flex-1 bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm text-white rounded disabled:opacity-60"
            />
            <button
              onClick={submitNote}
              disabled={submittingNote || !newNote.trim()}
              className="inline-flex items-center gap-2 px-3 py-2 bg-orange-600 text-white text-sm uppercase tracking-widest hover:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {submittingNote ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
          {notesLoading ? (
            <div className="text-zinc-500 text-sm">Loading notes…</div>
          ) : notes.length === 0 ? (
            <div className="text-zinc-600 text-sm italic">No notes yet.</div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div key={note.id} className="border border-zinc-800 bg-zinc-950 p-3 rounded text-sm">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <p className="text-orange-400 font-semibold">{note.authorName}</p>
                    <p className="text-zinc-500 text-xs">{new Date(note.createdAt).toLocaleString()}</p>
                  </div>
                  <p className="text-zinc-300">{note.noteBody}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
