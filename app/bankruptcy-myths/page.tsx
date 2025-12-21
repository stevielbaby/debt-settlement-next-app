'use client';

import React from 'react';
import { Navbar } from '@/app/components/Navbar';
import { UrgentBanner } from '@/app/components/UrgentBanner';
import { BankruptcyMyths } from '@/app/components/BankruptcyMyths';
import { useRouter } from 'next/navigation';

export default function BankruptcyMythsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 selection:bg-orange-600 selection:text-white overflow-x-hidden">
      <UrgentBanner />
      <Navbar />
      <div className="pt-32 pb-20">
        <BankruptcyMyths onBack={() => router.back()} />
      </div>
    </div>
  );
}

