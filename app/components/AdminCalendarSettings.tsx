'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Lock, Calendar, RotateCcw, Trash2, Plus, Check, AlertCircle } from 'lucide-react';

interface TimeSlot {
  hour: number;
  minute: number;
}

function AdminCalendarSettingsContent({ onBack }: { onBack: () => void }) {
  const searchParams = useSearchParams();
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    accountEmail?: string;
    connectedAt?: string;
  }>({ connected: false });
  const [calendars, setCalendars] = useState<any[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState('');
  const [timezone, setTimezone] = useState('America/Phoenix');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [slotTemplate, setSlotTemplate] = useState<TimeSlot[]>([
    { hour: 9, minute: 0 },
    { hour: 11, minute: 30 },
    { hour: 14, minute: 0 },
    { hour: 16, minute: 45 }
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load settings on mount and check for OAuth callback status
  useEffect(() => {
    const loadStatus = async () => {
      try {
        const response = await fetch('/api/calendar/connection-status');
        const data = await response.json();
        setConnectionStatus(data);

        if (data.settings) {
          setSelectedCalendar(data.settings.calendarId);
          setTimezone(data.settings.timezone);
          setDurationMinutes(data.settings.durationMinutes);
          setSlotTemplate(data.settings.slotTemplate);
        }

        // Automatically load calendars if connected
        if (data.connected) {
          const calendarResponse = await fetch('/api/calendar/list');
          const calendarData = await calendarResponse.json();
          if (calendarResponse.ok && calendarData.calendars) {
            setCalendars(calendarData.calendars);
          }
        }

        // Check for OAuth callback status/error
        const status = searchParams.get('status');
        const errorParam = searchParams.get('error');
        
        if (status === 'connected') {
          setSuccess('Google Calendar connected successfully!');
          setError('');
          // Automatically load calendars after successful connection
          const calendarResponse = await fetch('/api/calendar/list');
          const calendarData = await calendarResponse.json();
          if (calendarResponse.ok && calendarData.calendars) {
            setCalendars(calendarData.calendars);
          }
          // Clear URL params
          window.history.replaceState({}, '', window.location.pathname);
        } else if (errorParam) {
          const errorMessages: Record<string, string> = {
            'missing_code': 'OAuth authorization was cancelled or incomplete.',
            'token_exchange_failed': 'Failed to exchange authorization code. Please try again.',
            'user_info_failed': 'Failed to retrieve Google account information.',
            'credentials_not_configured': 'Google credentials are not configured. Please complete the setup wizard first.',
            'oauth_failed': 'OAuth connection failed. Please try again.'
          };
          setError(errorMessages[errorParam] || 'OAuth connection failed. Please try again.');
          setSuccess('');
          // Clear URL params
          window.history.replaceState({}, '', window.location.pathname);
        }
      } catch (err) {
        console.error('Error loading status:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadStatus();
  }, [searchParams]);

  const handleConnectGoogle = () => {
    // Redirect to OAuth start endpoint
    window.location.href = '/api/auth/google/start';
  };

  const handleLoadCalendars = async () => {
    setIsLoadingCalendars(true);
    setError('');

    try {
      const response = await fetch('/api/calendar/list');
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to load calendars');
        return;
      }

      setCalendars(data.calendars);
      setSuccess('Calendars loaded successfully!');
    } catch (err) {
      console.error('Error loading calendars:', err);
      setError('Failed to load calendars');
    } finally {
      setIsLoadingCalendars(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!selectedCalendar) {
      setError('Please select a calendar');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/calendar/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendarId: selectedCalendar,
          timezone,
          durationMinutes,
          slotTemplate
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to save settings');
        return;
      }

      setSuccess('Calendar settings saved successfully!');
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure? This will disconnect your Google Calendar.')) return;

    setError('');

    try {
      const response = await fetch('/api/auth/google/disconnect', {
        method: 'POST'
      });

      if (!response.ok) {
        setError('Failed to disconnect');
        return;
      }

      setConnectionStatus({ connected: false });
      setCalendars([]);
      setSelectedCalendar('');
      setSuccess('Google Calendar disconnected');
    } catch (err) {
      console.error('Error disconnecting:', err);
      setError('Failed to disconnect');
    }
  };

  const addTimeSlot = () => {
    setSlotTemplate([...slotTemplate, { hour: 9, minute: 0 }]);
  };

  const removeTimeSlot = (index: number) => {
    if (slotTemplate.length > 1) {
      setSlotTemplate(slotTemplate.filter((_, i) => i !== index));
    }
  };

  const updateTimeSlot = (index: number, hour: number, minute: number) => {
    const updated = [...slotTemplate];
    updated[index] = { hour, minute };
    setSlotTemplate(updated);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 pt-24 pb-20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-zinc-700 border-t-orange-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-zinc-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 pt-24 pb-20">
      <div className="max-w-2xl mx-auto px-4">
        <button onClick={onBack} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-12 group hover:gap-3">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] uppercase font-bold tracking-[0.2em]">Back to Settings</span>
        </button>

        <div className="bg-zinc-900 border border-zinc-800 p-8 space-y-8">
          <div>
            <h1 className="text-4xl font-serif text-white mb-2">Google Calendar Settings</h1>
            <p className="text-zinc-400">Configure your Google Calendar for client scheduling</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 border border-red-500/20 p-3">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-green-500 text-sm bg-green-500/10 border border-green-500/20 p-3">
              <Check size={16} />
              {success}
            </div>
          )}

          {/* Connection Status */}
          <div className="border border-zinc-800 p-6 rounded">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Connection Status</h2>
              {connectionStatus.connected && (
                <span className="inline-block px-3 py-1 bg-green-900 text-green-300 text-xs font-bold rounded">
                  ✓ Connected
                </span>
              )}
              {!connectionStatus.connected && (
                <span className="inline-block px-3 py-1 bg-zinc-800 text-zinc-400 text-xs font-bold rounded">
                  ✗ Not Connected
                </span>
              )}
            </div>

            {connectionStatus.connected && connectionStatus.accountEmail && (
              <div className="space-y-2 mb-4">
                <p className="text-zinc-400 text-sm">
                  <span className="font-bold">Email:</span> {connectionStatus.accountEmail}
                </p>
                <p className="text-zinc-500 text-xs">
                  <span className="font-bold">Connected:</span> {connectionStatus.connectedAt ? new Date(connectionStatus.connectedAt).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              {!connectionStatus.connected ? (
                <button
                  onClick={handleConnectGoogle}
                  className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold uppercase tracking-widest py-3 transition-all text-sm"
                >
                  Connect Google Calendar
                </button>
              ) : (
                <>
                  <button
                    onClick={handleLoadCalendars}
                    disabled={isLoadingCalendars}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 text-white font-bold uppercase tracking-widest py-3 transition-all text-sm"
                  >
                    {isLoadingCalendars ? 'Loading...' : 'Reload Calendars'}
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="flex-1 bg-red-900 hover:bg-red-800 text-white font-bold uppercase tracking-widest py-3 transition-all text-sm"
                  >
                    Disconnect
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Calendar Selection */}
          {connectionStatus.connected && (
            <>
              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Select Calendar</label>
                <select
                  value={selectedCalendar}
                  onChange={(e) => setSelectedCalendar(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-3 focus:border-orange-600 focus:outline-none appearance-none"
                >
                  <option value="">-- Choose a calendar --</option>
                  {calendars.map(cal => (
                    <option key={cal.id} value={cal.id}>
                      {cal.summary} {cal.primary ? '(Primary)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Timezone */}
              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-3 focus:border-orange-600 focus:outline-none appearance-none"
                >
                  <option>America/Phoenix</option>
                  <option>America/Denver</option>
                  <option>America/Chicago</option>
                  <option>America/New_York</option>
                  <option>America/Los_Angeles</option>
                  <option>UTC</option>
                </select>
              </div>

              {/* Duration */}
              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Meeting Duration (minutes)</label>
                <input
                  type="number"
                  min="15"
                  max="180"
                  step="15"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-3 focus:border-orange-600 focus:outline-none"
                />
              </div>

              {/* Time Slots */}
              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Available Time Slots</label>
                <div className="space-y-2">
                  {slotTemplate.map((slot, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={String(slot.hour).padStart(2, '0')}
                        onChange={(e) => updateTimeSlot(idx, parseInt(e.target.value), slot.minute)}
                        placeholder="HH"
                        className="w-16 bg-zinc-950 border border-zinc-800 text-white px-2 py-2 focus:border-orange-600 focus:outline-none text-center font-mono"
                      />
                      <span className="text-white">:</span>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        step="15"
                        value={String(slot.minute).padStart(2, '0')}
                        onChange={(e) => updateTimeSlot(idx, slot.hour, parseInt(e.target.value))}
                        placeholder="MM"
                        className="w-16 bg-zinc-950 border border-zinc-800 text-white px-2 py-2 focus:border-orange-600 focus:outline-none text-center font-mono"
                      />
                      <button
                        onClick={() => removeTimeSlot(idx)}
                        disabled={slotTemplate.length === 1}
                        className="p-2 text-red-500 hover:text-red-400 disabled:text-zinc-600 disabled:cursor-not-allowed transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addTimeSlot}
                  className="w-full flex items-center justify-center gap-2 py-2 border border-zinc-800 text-zinc-400 hover:text-white hover:border-orange-600 transition-colors text-sm"
                >
                  <Plus size={16} />
                  Add Time Slot
                </button>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveSettings}
                disabled={isSaving || !selectedCalendar}
                className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-700 text-white font-black uppercase tracking-widest py-4 transition-all flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Save Calendar Settings
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export const AdminCalendarSettings = ({ onBack }: { onBack: () => void }) => {
  return (
    <Suspense fallback={<div className="bg-zinc-900 p-8">Loading...</div>}>
      <AdminCalendarSettingsContent onBack={onBack} />
    </Suspense>
  );
};
