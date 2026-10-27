'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, FileText, Settings, Building2, Calendar, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function OperatorSettingsPage() {
  const router = useRouter();
  const [bookingUrl, setBookingUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/bookings/link');
      const data = await response.json();
      if (data.url) {
        setBookingUrl(data.url);
        setSavedUrl(data.url);
        setProvider(data.provider);
      }
    };
    load().catch(() => setError('Could not load the current booking link.'));
  }, []);

  const saveLink = async () => {
    setIsSaving(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/bookings/link', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: bookingUrl }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Could not save that link.');
        return;
      }
      setSavedUrl(data.url);
      setProvider(data.provider);
      setBookingUrl(data.url);
      setMessage('Booking link saved. Clients will see this scheduler on their dashboard.');
    } catch {
      setError('Could not save that link.');
    } finally {
      setIsSaving(false);
    }
  };

  const removeLink = async () => {
    setIsSaving(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/bookings/link', { method: 'DELETE' });
      if (!response.ok) {
        setError('Could not remove the booking link.');
        return;
      }
      setSavedUrl(null);
      setProvider(null);
      setBookingUrl('');
      setMessage('Booking link removed. The client dashboard will show the phone number until you add a new one.');
    } catch {
      setError('Could not remove the booking link.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  return (
    <div className="space-y-10 animate-fadeIn">
      {/* Navigation Tabs */}
      <div className="flex gap-4 border-b border-zinc-800">
        <Link
          href="/operator"
          className="px-6 py-4 text-sm font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors border-b-2 border-transparent hover:border-zinc-700 flex items-center gap-2"
        >
          <ShieldCheck size={16} />
          Case Queue
        </Link>
        <Link
          href="/operator/submissions"
          className="px-6 py-4 text-sm font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors border-b-2 border-transparent hover:border-zinc-700 flex items-center gap-2"
        >
          <FileText size={16} />
          Submissions
        </Link>
        <button className="px-6 py-4 text-sm font-bold uppercase tracking-wider text-orange-600 border-b-2 border-orange-600 flex items-center gap-2">
          <Settings size={16} />
          Settings
        </button>
      </div>

      {/* Header */}
      <header className="border-b border-zinc-800 pb-8">
        <div className="inline-flex items-center gap-2 text-orange-600 text-[10px] font-bold uppercase tracking-[0.2em] mb-3">
          <Settings size={14} /> Operator Settings
        </div>
        <h1 className="text-4xl md:text-5xl font-serif text-white uppercase tracking-tight">Organization Settings</h1>
        <p className="text-zinc-500 mt-3 max-w-2xl">
          Manage your firm profile and integration preferences.
        </p>
      </header>

      {/* Organization Profile */}
      <div className="bg-zinc-900 border border-zinc-800 p-8 space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="text-orange-600" size={20} />
          <h2 className="text-white font-bold uppercase tracking-widest text-xs">Organization Profile</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Firm Name</div>
            <div className="text-white">Test Operator Firm</div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Contact Email</div>
            <div className="text-white">operator@test.com</div>
          </div>
        </div>
      </div>

      {/* Calendar Integration */}
      <div className="bg-zinc-900 border border-zinc-800 p-8 space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="text-orange-600" size={20} />
          <h2 className="text-white font-bold uppercase tracking-widest text-xs">Calendar Integration</h2>
        </div>
        <p className="text-zinc-500 text-sm leading-relaxed">
          Create a free event in Calendly or Cal.com, connect the firm Google calendar there, then paste the event link here.
        </p>
        <ol className="text-zinc-400 text-sm space-y-2 list-decimal pl-5">
          <li>Sign up at calendly.com or cal.com with the firm Google account.</li>
          <li>Connect that Google calendar when the site asks.</li>
          <li>Create one consultation event and copy its link.</li>
          <li>Paste the link below and save.</li>
        </ol>
        <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500">Booking link</label>
        <input
          value={bookingUrl}
          onChange={(event) => setBookingUrl(event.target.value)}
          placeholder="https://cal.com/your-firm/consultation"
          className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 text-sm"
        />
        {savedUrl && (
          <p className="text-zinc-400 text-sm">
            Saved {provider} link: <a className="text-orange-500 underline" href={savedUrl} target="_blank" rel="noreferrer">{savedUrl}</a>
          </p>
        )}
        {message && <p className="text-green-500 text-sm">{message}</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={saveLink}
            disabled={isSaving || !bookingUrl.trim()}
            className="inline-flex items-center justify-center gap-2 bg-orange-600 text-white font-bold uppercase tracking-widest px-6 py-3 text-sm hover:bg-orange-500 transition-all disabled:bg-zinc-700"
          >
            {isSaving ? 'Saving...' : 'Save booking link'}
          </button>
          {savedUrl && (
            <button
              type="button"
              onClick={removeLink}
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 border border-zinc-600 text-zinc-300 font-bold uppercase tracking-widest px-6 py-3 text-sm hover:text-white hover:border-zinc-400 transition-all"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Account Actions */}
      <div className="bg-zinc-900 border border-zinc-800 p-8 space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="text-orange-600" size={20} />
          <h2 className="text-white font-bold uppercase tracking-widest text-xs">Account</h2>
        </div>
        <button
          onClick={handleLogout}
          className="w-full border border-zinc-600 text-zinc-400 hover:text-white hover:border-zinc-400 font-bold uppercase tracking-widest py-3 transition-all flex items-center justify-center gap-2"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
