'use client';


import React, { useState, useEffect } from 'react';
import { ArrowRight, Check, AlertCircle, Copy, ExternalLink, Lock, Settings } from 'lucide-react';

export const SetupWizard = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep] = useState<'welcome' | 'google-creds' | 'google-guide' | 'test' | 'complete'> ('welcome');
  const [formData, setFormData] = useState({
    clientId: '',
    clientSecret: '',
    encryptionKey: '',
    adminPassword: '',
  });
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const generateEncryptionKey = () => {
    const key = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    handleInputChange('encryptionKey', key);
  };

  const testOAuthConfig = async () => {
    if (!formData.clientId || !formData.clientSecret) {
      setTestMessage('Please fill in Client ID and Client Secret');
      setTestStatus('error');
      return;
    }

    setTestStatus('testing');
    setTestMessage('Testing configuration...');

    try {
      // Use redirect: 'manual' to not follow redirects and avoid CORS issues
      const response = await fetch('/api/auth/google/start', {
        method: 'GET',
        headers: {
          'X-Google-Client-Id': formData.clientId,
          'X-Google-Client-Secret': formData.clientSecret,
        },
        redirect: 'manual' as RequestRedirect
      });

      // A 302 or 307 indicates a successful redirect to Google OAuth (valid config)
      if (response.status === 302 || response.status === 307) {
        setTestStatus('success');
        setTestMessage('✓ Google OAuth configuration is valid!');
      } else if (response.status === 500) {
        const data = await response.json();
        setTestStatus('error');
        setTestMessage(`Error: ${data.error || 'Invalid credentials'}`);
      } else {
        setTestStatus('error');
        setTestMessage(`Unexpected response: ${response.status}. Please check your credentials.`);
      }
    } catch (err) {
      setTestStatus('error');
      setTestMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const saveConfiguration = async () => {
    if (!formData.clientId || !formData.clientSecret || !formData.encryptionKey || !formData.adminPassword) {
      setTestMessage('Please fill in all required fields');
      setTestStatus('error');
      return;
    }

    setTestStatus('testing');
    setTestMessage('Saving configuration...');

    try {
      // Validate format
      if (formData.clientId.length < 20) {
        throw new Error('Client ID looks too short');
      }
      if (formData.clientSecret.length < 20) {
        throw new Error('Client Secret looks too short');
      }
      if (formData.encryptionKey.length < 32) {
        throw new Error('Encryption key must be at least 32 characters');
      }
      if (formData.adminPassword.length < 6) {
        throw new Error('Admin password must be at least 6 characters');
      }

      // Call backend to save config
      const response = await fetch('/api/setup/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: formData.clientId,
          clientSecret: formData.clientSecret,
          encryptionKey: formData.encryptionKey,
          adminPassword: formData.adminPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save configuration');
      }

      setTestStatus('success');
      setTestMessage('Configuration saved successfully!');
      setTimeout(() => {
        setStep('complete');
      }, 1500);
    } catch (err) {
      setTestStatus('error');
      setTestMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 pt-12 pb-20">
      <div className="max-w-2xl mx-auto px-4">
        {/* Step Indicator */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className={`flex items-center gap-3 pb-3 border-b-2 ${step === 'welcome' ? 'border-orange-600' : 'border-zinc-800'}`}>
              <Settings size={20} className={step === 'welcome' ? 'text-orange-600' : 'text-zinc-600'} />
              <span className={`text-sm font-bold uppercase tracking-wider ${step === 'welcome' ? 'text-white' : 'text-zinc-600'}`}>Welcome</span>
            </div>
            <div className={`flex items-center gap-3 pb-3 border-b-2 ${['google-guide', 'google-creds', 'test', 'complete'].includes(step) ? 'border-orange-600' : 'border-zinc-800'}`}>
              <Lock size={20} className={['google-guide', 'google-creds', 'test', 'complete'].includes(step) ? 'text-orange-600' : 'text-zinc-600'} />
              <span className={`text-sm font-bold uppercase tracking-wider ${['google-guide', 'google-creds', 'test', 'complete'].includes(step) ? 'text-white' : 'text-zinc-600'}`}>Setup</span>
            </div>
            <div className={`flex items-center gap-3 pb-3 border-b-2 ${step === 'complete' ? 'border-green-600' : 'border-zinc-800'}`}>
              <Check size={20} className={step === 'complete' ? 'text-green-600' : 'text-zinc-600'} />
              <span className={`text-sm font-bold uppercase tracking-wider ${step === 'complete' ? 'text-green-600' : 'text-zinc-600'}`}>Complete</span>
            </div>
          </div>
        </div>

        {/* Welcome Screen */}
        {step === 'welcome' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-5xl font-serif text-white mb-4">Welcome to Setup</h1>
              <p className="text-zinc-400 text-lg">
                This wizard will configure your Google Calendar integration in just a few minutes.
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-8 space-y-6">
              <div className="space-y-3">
                <h3 className="text-white font-bold text-lg">What You'll Need:</h3>
                <ul className="space-y-2 text-zinc-400">
                  <li className="flex items-start gap-3">
                    <span className="text-orange-600 font-bold mt-1">1.</span>
                    <span>A Google Cloud account (free)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-orange-600 font-bold mt-1">2.</span>
                    <span>Google OAuth 2.0 Client ID & Secret</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-orange-600 font-bold mt-1">3.</span>
                    <span>5-10 minutes of your time</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => setStep('google-guide')}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black uppercase tracking-widest py-4 transition-all flex items-center justify-center gap-2"
              >
                Get Started
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Google Setup Guide */}
        {step === 'google-guide' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-serif text-white mb-2">Get Google Credentials</h1>
              <p className="text-zinc-400">Follow these steps to create your OAuth 2.0 credentials</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-8 space-y-8">
              {/* Step 1 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-600 text-white font-bold flex items-center justify-center text-sm">1</div>
                  <h3 className="text-white font-bold">Visit Google Cloud Console</h3>
                </div>
                <div className="ml-11 space-y-2">
                  <a
                    href="https://console.cloud.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300"
                  >
                    Open Google Cloud Console
                    <ExternalLink size={16} />
                  </a>
                  <p className="text-zinc-500 text-sm">Create a new project or use an existing one</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-600 text-white font-bold flex items-center justify-center text-sm">2</div>
                  <h3 className="text-white font-bold">Enable Google Calendar API</h3>
                </div>
                <div className="ml-11 space-y-2 text-zinc-400 text-sm">
                  <p>• Search for "Google Calendar API"</p>
                  <p>• Click the result and press "Enable"</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-600 text-white font-bold flex items-center justify-center text-sm">3</div>
                  <h3 className="text-white font-bold">Create OAuth 2.0 Credentials</h3>
                </div>
                <div className="ml-11 space-y-2 text-zinc-400 text-sm">
                  <p>• Go to "APIs & Services" → "Credentials"</p>
                  <p>• Click "Create Credentials" → "OAuth 2.0 Client ID"</p>
                  <p>• Choose "Web Application"</p>
                  <p>• Add this Authorized redirect URI:</p>
                  <div className="bg-zinc-950 border border-zinc-700 p-3 rounded font-mono text-xs text-blue-400 flex items-center justify-between mt-2">
                    <span>http://localhost:3000/api/auth/google/callback</span>
                    <button
                      onClick={() => copyToClipboard('http://localhost:3000/api/auth/google/callback', 'redirect-uri')}
                      className="text-zinc-500 hover:text-white"
                    >
                      {copied === 'redirect-uri' ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-600 text-white font-bold flex items-center justify-center text-sm">4</div>
                  <h3 className="text-white font-bold">Copy Your Credentials</h3>
                </div>
                <div className="ml-11 space-y-2 text-zinc-400 text-sm">
                  <p>• Click "Create"</p>
                  <p>• Copy your <span className="text-orange-400 font-bold">Client ID</span> and <span className="text-orange-400 font-bold">Client Secret</span></p>
                  <p>• Keep them safe - you'll need them next</p>
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-6 flex gap-3">
                <button
                  onClick={() => setStep('welcome')}
                  className="flex-1 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 font-bold uppercase tracking-widest py-3 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('google-creds')}
                  className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold uppercase tracking-widest py-3 transition-all flex items-center justify-center gap-2"
                >
                  I Have My Credentials
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Google Credentials Entry */}
        {step === 'google-creds' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-serif text-white mb-2">Enter Your Credentials</h1>
              <p className="text-zinc-400">Paste the credentials you copied from Google Cloud</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-8 space-y-6">
              {/* Client ID */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Google Client ID</label>
                <input
                  type="text"
                  value={formData.clientId}
                  onChange={(e) => handleInputChange('clientId', e.target.value)}
                  placeholder="xxx.apps.googleusercontent.com"
                  className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-3 focus:border-orange-600 focus:outline-none transition-colors font-mono text-sm"
                />
              </div>

              {/* Client Secret */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Google Client Secret</label>
                <input
                  type="password"
                  value={formData.clientSecret}
                  onChange={(e) => handleInputChange('clientSecret', e.target.value)}
                  placeholder="••••••••••••••••••••"
                  className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-3 focus:border-orange-600 focus:outline-none transition-colors font-mono text-sm"
                />
              </div>

              {/* Encryption Key */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Encryption Key (32+ chars)</label>
                  <button
                    onClick={generateEncryptionKey}
                    className="text-orange-600 hover:text-orange-500 text-xs font-bold uppercase"
                  >
                    Generate
                  </button>
                </div>
                <input
                  type="text"
                  value={formData.encryptionKey}
                  onChange={(e) => handleInputChange('encryptionKey', e.target.value)}
                  placeholder="Auto-generated or paste your own"
                  className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-3 focus:border-orange-600 focus:outline-none transition-colors font-mono text-xs"
                />
                <p className="text-zinc-600 text-xs">Used to encrypt Google tokens in database</p>
              </div>

              {/* Admin Password */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Admin Password</label>
                <input
                  type="password"
                  value={formData.adminPassword}
                  onChange={(e) => handleInputChange('adminPassword', e.target.value)}
                  placeholder="Create a secure password"
                  className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-3 focus:border-orange-600 focus:outline-none transition-colors"
                />
              </div>

              {/* Test Status */}
              {testStatus !== 'idle' && (
                <div className={`flex items-center gap-2 text-sm p-3 rounded ${
                  testStatus === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/30' :
                  testStatus === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/30' :
                  'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                }`}>
                  {testStatus === 'testing' && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>}
                  {testStatus === 'success' && <Check size={16} />}
                  {testStatus === 'error' && <AlertCircle size={16} />}
                  <span>{testMessage}</span>
                </div>
              )}

              <div className="border-t border-zinc-800 pt-6 flex gap-3">
                <button
                  onClick={() => setStep('google-guide')}
                  className="flex-1 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 font-bold uppercase tracking-widest py-3 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={testOAuthConfig}
                  disabled={testStatus === 'testing'}
                  className="flex-1 border border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white disabled:opacity-50 font-bold uppercase tracking-widest py-3 transition-all"
                >
                  Test Configuration
                </button>
                <button
                  onClick={saveConfiguration}
                  disabled={testStatus === 'testing'}
                  className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold uppercase tracking-widest py-3 transition-all flex items-center justify-center gap-2"
                >
                  Save & Continue
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Complete */}
        {step === 'complete' && (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-900 rounded-full flex items-center justify-center">
                <Check className="text-green-400" size={32} />
              </div>
              <h1 className="text-5xl font-serif text-white">Setup Complete!</h1>
              <p className="text-zinc-400 text-lg">Your Google Calendar integration is configured</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-8 space-y-6">
              <div className="space-y-3">
                <h3 className="text-white font-bold">Next Steps:</h3>
                <ol className="space-y-2 text-zinc-400 text-sm">
                  <li className="flex items-start gap-3">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Click "Configure Calendar & Availability" in admin settings</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Click "Connect Google Calendar"</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Select your primary calendar</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Click "Save Calendar Settings"</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Test a booking from the client intake form</span>
                  </li>
                </ol>
              </div>

              <button
                onClick={onComplete}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black uppercase tracking-widest py-4 transition-all"
              >
                Go to Admin Panel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
