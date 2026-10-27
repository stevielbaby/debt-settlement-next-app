'use client';

import React, { useState } from 'react';
import { Mail } from 'lucide-react';

export function InviteOperatorForm({ organizationId }: { organizationId?: string }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const sendInvite = async () => {
    setSending(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/invites/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          organizationId,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Could not send the invite.');
        return;
      }
      setMessage(`Access code sent to ${email}.`);
      setEmail('');
      setName('');
    } catch {
      setError('Could not send the invite.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Mail className="text-orange-600" size={16} />
        <p className="text-white text-sm font-bold">Email the access code</p>
      </div>
      <p className="text-zinc-400 text-sm">
        The new user gets the firm access code and a link to create their account.
      </p>
      <input
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Name"
        className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 text-sm"
        disabled={sending}
      />
      <input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="new.user@firm.com"
        className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 text-sm"
        disabled={sending}
      />
      {message && <p className="text-green-500 text-sm">{message}</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="button"
        onClick={sendInvite}
        disabled={sending || !email.trim()}
        className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-zinc-700 text-white text-xs font-bold uppercase tracking-widest"
      >
        {sending ? 'Sending...' : 'Send access code'}
      </button>
    </div>
  );
}
