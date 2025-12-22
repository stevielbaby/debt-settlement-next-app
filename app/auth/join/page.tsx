'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Scale, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get('code');
  const formRef = useRef<HTMLFormElement>(null);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [validatingCode, setValidatingCode] = useState(false);
  const [codeValid, setCodeValid] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [linkedOrganization, setLinkedOrganization] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Validate invite code on mount
  useEffect(() => {
    if (inviteCode) {
      validateInviteCode(inviteCode);
    }
  }, [inviteCode]);

  const validateInviteCode = async (code: string) => {
    try {
      setValidatingCode(true);
      setCodeError('');
      const response = await fetch(`/api/auth/validate-invite-code?code=${encodeURIComponent(code)}`);
      const data = await response.json();

      if (data.valid) {
        setCodeValid(true);
        if (data.organization) {
          setLinkedOrganization(data.organization);
          setOrganizationName(data.organization.name);
        }
      } else {
        setCodeError(data.error || 'Invalid or expired invite code');
        setCodeValid(false);
      }
    } catch (err) {
      setCodeError('Failed to validate invite code');
      setCodeValid(false);
    } finally {
      setValidatingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!inviteCode && !organizationName) {
      setError('Organization name is required when not using an invite code');
      return;
    }

    setLoading(true);

    try {
      // Create account
      const signupResponse = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          role: 'operator',
          inviteCode: inviteCode || undefined,
          organizationName: !inviteCode ? organizationName : undefined,
        }),
      });

      const signupData = await signupResponse.json();

      if (!signupResponse.ok) {
        setError(signupData.error || 'Failed to create account');
        setLoading(false);
        return;
      }

      // Sign in automatically
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.ok) {
        // Redirect to operator dashboard
        router.push('/operator');
      } else {
        setError('Account created but login failed. Please sign in manually.');
        router.push('/auth/signin');
      }
    } catch (err) {
      setError('Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-600 rounded mb-4">
            <Scale size={24} className="text-white" />
          </div>
          <h1 className="text-4xl font-serif font-bold text-white uppercase tracking-tight mb-2">
            Join
          </h1>
          <p className="text-zinc-400">Create your operator account</p>
        </div>

        {/* Invite Code Status */}
        {validatingCode && (
          <div className="mb-6 bg-zinc-900 border border-zinc-800 p-4 rounded flex items-center gap-2 text-zinc-400">
            <RefreshCw size={16} className="animate-spin" />
            Validating invite code...
          </div>
        )}

        {inviteCode && codeError && (
          <div className="mb-6 bg-red-900/20 border border-red-800 p-4 rounded flex items-start gap-3">
            <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-400 text-sm font-bold mb-1">Invalid Invite Code</p>
              <p className="text-red-300 text-xs">{codeError}</p>
            </div>
          </div>
        )}

        {inviteCode && codeValid && linkedOrganization && (
          <div className="mb-6 bg-green-900/20 border border-green-800 p-4 rounded">
            <p className="text-green-400 text-sm font-bold mb-1">✓ Valid Invite Code</p>
            <p className="text-green-300 text-xs">
              You're joining <strong>{linkedOrganization.name}</strong>
            </p>
          </div>
        )}

        {/* Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-900/20 border border-red-800 p-3 rounded">
              <p className="text-red-400 text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </p>
            </div>
          )}

          {/* Email Field */}
          <div>
            <label className="block text-zinc-400 text-xs uppercase tracking-widest font-bold mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@company.com"
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-600 transition-colors"
              disabled={loading}
            />
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-zinc-400 text-xs uppercase tracking-widest font-bold mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-600 transition-colors"
              disabled={loading}
            />
            <p className="text-xs text-zinc-500 mt-1">Minimum 8 characters</p>
          </div>

          {/* Confirm Password Field */}
          <div>
            <label className="block text-zinc-400 text-xs uppercase tracking-widest font-bold mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-600 transition-colors"
              disabled={loading}
            />
          </div>

          {/* Organization Name (conditionally shown) */}
          {!inviteCode && (
            <div>
              <label className="block text-zinc-400 text-xs uppercase tracking-widest font-bold mb-2">
                Organization Name
              </label>
              <input
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Your Law Firm"
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-600 transition-colors"
                disabled={loading}
              />
              <p className="text-xs text-zinc-500 mt-1">
                You'll be able to link this to an existing organization later
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || validatingCode || (!!inviteCode && !codeValid)}
            className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-600/50 text-white font-bold uppercase tracking-widest transition-colors mt-6"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <RefreshCw size={16} className="animate-spin" />
                Creating Account...
              </span>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-zinc-500 text-sm">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-orange-600 hover:text-orange-400 font-bold">
              Sign In
            </Link>
          </p>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-zinc-900 border border-zinc-800 p-4 rounded text-xs text-zinc-400 space-y-2">
          <p className="font-bold text-white">About This Page</p>
          <p>
            {inviteCode
              ? 'You were invited to join an organization. Complete your account to get started.'
              : 'Create an account as an operator. You can link to an organization later using an invite code.'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>}>
      <JoinContent />
    </Suspense>
  );
}
