'use client';

import React from 'react';
import { SubmissionsReview } from '@/app/components/SubmissionsReview';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, FileText, Settings } from 'lucide-react';

export default function OperatorSubmissionsPage() {
  const router = useRouter();

  return (
    <div className="space-y-10 animate-fadeIn">
      {/* Navigation Tabs */}
      <div className="flex gap-4 border-b border-zinc-800">
        <Link
          href="/operator"
          className="px-6 py-4 text-sm font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors border-b-2 border-transparent hover:border-zinc-700"
        >
          <span className="flex items-center gap-2">
            <ShieldCheck size={16} />
            Case Queue
          </span>
        </Link>
        <button
          className="px-6 py-4 text-sm font-bold uppercase tracking-wider text-orange-600 border-b-2 border-orange-600"
        >
          <span className="flex items-center gap-2">
            <FileText size={16} />
            Submissions
          </span>
        </button>
        <Link
          href="/operator/settings"
          className="px-6 py-4 text-sm font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors border-b-2 border-transparent hover:border-zinc-700"
        >
          <span className="flex items-center gap-2">
            <Settings size={16} />
            Settings
          </span>
        </Link>
      </div>

      <SubmissionsReview onBack={() => router.push('/operator')} />
    </div>
  );
}
