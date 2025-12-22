'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = () => {
    switch (error) {
      case 'CredentialsSignin':
        return 'Invalid email or password. Please try again.';
      case 'AccessDenied':
        return 'You do not have permission to access this resource.';
      default:
        return 'An authentication error occurred. Please try again.';
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="grain" />
      
      <div className="max-w-md w-full relative z-10">
        <div className="bg-zinc-900 border border-red-800 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-900/20 border border-red-800 mb-6">
            <AlertTriangle className="text-red-500" size={32} />
          </div>
          
          <h1 className="text-2xl font-serif text-white mb-4">Authentication Error</h1>
          <p className="text-zinc-400 mb-8">{getErrorMessage()}</p>
          
          <Link
            href="/auth/signin"
            className="inline-block bg-orange-600 hover:bg-orange-500 text-white px-8 py-3 font-bold uppercase tracking-wider text-xs transition-all"
          >
            Return to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
