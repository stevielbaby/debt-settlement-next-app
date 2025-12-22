'use client';

import React, { useState, useRef, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Scale, Lock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function SignInContent() {
  const isDev = process.env.NODE_ENV !== 'production';
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const formRef = useRef<HTMLFormElement>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoSubmitting, setAutoSubmitting] = useState(false);

  React.useEffect(() => {
    // Auto-submit when button sets both fields
    if (autoSubmitting && email && password && formRef.current) {
      setAutoSubmitting(false);
      formRef.current.requestSubmit();
    }
  }, [autoSubmitting, email, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email || !password) {
        setError('Email and password are required');
        setLoading(false);
        return;
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      console.log('SignIn result:', result);

      if (result?.error) {
        setError('Invalid email or password');
        setLoading(false);
      } else if (result?.ok) {
        // If no callback URL specified, redirect based on user role
        if (!callbackUrl || callbackUrl === '/') {
          // Fetch the user's role to determine redirect
          try {
            const response = await fetch('/api/auth/user-role');
            const data = await response.json();
            if (data.role === 'webmaster') {
              router.push('/webmaster');
            } else if (data.role === 'operator') {
              router.push('/operator');
            } else {
              router.push('/dashboard');
            }
          } catch {
            router.push(callbackUrl || '/');
          }
        } else {
          router.push(callbackUrl);
        }
        router.refresh();
      } else {
        setError('Authentication failed');
        setLoading(false);
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="grain" />
      
      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Logo/Branding */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-3 group mb-8">
            <div className="w-12 h-12 bg-white flex items-center justify-center group-hover:bg-orange-600 transition-colors">
              <Scale className="w-7 h-7 text-zinc-950 group-hover:text-white" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-serif font-bold text-2xl tracking-tight text-white leading-none">STRATTON</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">Legal Defense</span>
            </div>
          </Link>
          
          <div className="inline-flex items-center gap-2 text-orange-600 font-bold uppercase tracking-widest text-[10px] mb-4">
            <Lock size={14} /> Secure Portal Access
          </div>
          
          <h1 className="text-3xl font-serif text-white mb-2">System Login</h1>
          <p className="text-zinc-400 text-sm">Attorney and administrative access only</p>
        </div>

        {/* Sign In Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 p-8 space-y-6">
          {error && (
            <div className="bg-red-900/20 border border-red-800 p-4 flex items-start gap-3">
              <AlertCircle className="text-red-500 shrink-0" size={20} />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 focus:outline-none focus:border-orange-600 transition-colors"
              placeholder="attorney@lawfirm.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 focus:outline-none focus:border-orange-600 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white px-6 py-4 font-bold uppercase tracking-wider text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Authenticating...' : 'Access System'}
          </button>

          {isDev && (
            <div className="space-y-3 mt-6 pt-6 border-t border-zinc-800">
              <p className="text-zinc-500 text-xs uppercase tracking-widest">Quick Start (Dev)</p>
              <button
                type="button"
                onClick={() => {
                  setAutoSubmitting(true);
                  setEmail('admin@woodslegal.com');
                  setPassword('webmaster123');
                }}
                className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white px-4 py-2 font-bold uppercase tracking-wider text-xs transition-all border border-orange-500"
              >
                🔧 Webmaster Dashboard
              </button>
              <button
                type="button"
                onClick={() => {
                  setAutoSubmitting(true);
                  setEmail('operator@woodslegal.com');
                  setPassword('operator123');
                }}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 font-bold uppercase tracking-wider text-xs transition-all border border-zinc-700 hover:border-orange-600"
              >
                📋 Try Operator Account
              </button>
              <p className="text-[10px] text-zinc-600 text-center mt-2">Auto-fills and submits</p>
            </div>
          )}
        </form>

        <div className="text-center">
          <Link href="/" className="text-zinc-500 hover:text-white text-xs uppercase tracking-widest transition-colors">
            ← Return to Public Site
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <SignInContent />
    </Suspense>
  );
}
