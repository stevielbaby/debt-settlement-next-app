'use client';

import React from 'react';
import { Navbar } from '@/app/components/Navbar';
import { UrgentBanner } from '@/app/components/UrgentBanner';
import { CaseReviewIntake } from '@/app/components/CaseReviewIntake';
import { useRouter } from 'next/navigation';

export default function CaseReviewPage() {
  const router = useRouter();

  const handleComplete = (data: any) => {
    router.push(`/dashboard?caseNumber=${data.caseNumber}`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 selection:bg-orange-600 selection:text-white overflow-x-hidden">
      <UrgentBanner />
      <Navbar />
      <div className="pt-32 pb-20">
        <CaseReviewIntake onComplete={handleComplete} onBack={() => router.push('/')} />
      </div>
    </div>
  );
}

