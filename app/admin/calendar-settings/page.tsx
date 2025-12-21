'use client';

import React from 'react';
import { Navbar } from '@/app/components/Navbar';
import { UrgentBanner } from '@/app/components/UrgentBanner';
import { AdminCalendarSettings } from '@/app/components/AdminCalendarSettings';
import { useRouter } from 'next/navigation';

export default function CalendarSettingsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 selection:bg-orange-600 selection:text-white overflow-x-hidden">
      <UrgentBanner />
      <Navbar />
      <div className="pt-32 pb-20">
        <AdminCalendarSettings onBack={() => router.push('/admin')} />
      </div>
    </div>
  );
}

