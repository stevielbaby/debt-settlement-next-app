'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { bookingEmbedUrl, type BookingProvider } from '@/app/lib/booking-link';

export const ConsultationBooking = ({
  clientName,
  clientEmail,
}: {
  caseId: string;
  clientName: string;
  clientEmail: string;
  onBookingComplete?: (booking: { slotStart: string }) => void;
}) => {
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [url, setUrl] = useState<string | null>(null);
  const [provider, setProvider] = useState<BookingProvider | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/bookings/link');
        const data = await response.json();
        if (data.url && data.provider) {
          setUrl(data.url);
          setProvider(data.provider);
          setStatus('ready');
          return;
        }
      } catch (error) {
        console.error('Error loading booking link:', error);
      }
      setStatus('missing');
    };

    load();
  }, []);

  const embedUrl = useMemo(() => {
    if (!url || !provider) return null;
    const name = clientName.trim();
    return bookingEmbedUrl(
      { url, provider },
      {
        name: name && name !== 'undefined undefined' ? name : undefined,
        email: clientEmail || undefined,
      }
    );
  }, [url, provider, clientName, clientEmail]);

  if (status === 'loading') {
    return (
      <div className="p-8 bg-zinc-900 border border-zinc-800 text-center">
        <div className="w-4 h-4 border-2 border-zinc-700 border-t-orange-600 rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-zinc-400 text-sm">Loading the scheduler...</p>
      </div>
    );
  }

  if (status === 'missing' || !embedUrl) {
    return (
      <div className="p-8 bg-zinc-900 border border-yellow-800 text-center rounded">
        <AlertCircle className="text-yellow-600 mx-auto mb-3" size={28} />
        <p className="text-yellow-600 font-bold mb-1">Scheduling Unavailable</p>
        <p className="text-zinc-400 text-sm">
          The firm has not added a booking link yet. Call the intake line:
        </p>
        <p className="text-white font-bold text-lg mt-3">1-800-555-0199</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <iframe
        title="Book a consultation"
        src={embedUrl}
        className="w-full h-[720px] bg-white border border-zinc-800"
      />
      <p className="text-zinc-500 text-xs italic">
        Choose a time that works for you. A calendar invite is sent as soon as the booking is confirmed.
      </p>
    </div>
  );
};
