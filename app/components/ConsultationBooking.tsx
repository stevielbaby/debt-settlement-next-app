'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Slot {
  start: string;
  end: string;
  display: string;
  available: boolean;
}

interface DayAvailability {
  date: string;
  slots: Slot[];
  availableCount: number;
}

export const ConsultationBooking = ({ 
  caseId, 
  clientName, 
  clientEmail,
  onBookingComplete 
}: { 
  caseId: string; 
  clientName: string;
  clientEmail: string;
  onBookingComplete?: (booking: any) => void;
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableDays, setAvailableDays] = useState<DayAvailability[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [connectedStatus, setConnectedStatus] = useState<{ connected: boolean; isLoading: boolean }>({
    connected: false,
    isLoading: true
  });

  // Check if Google Calendar is connected
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('/api/calendar/connection-status');
        const data = await response.json();
        setConnectedStatus({
          connected: data.connected,
          isLoading: false
        });
      } catch (err) {
        console.error('Error checking calendar connection:', err);
        setConnectedStatus({
          connected: false,
          isLoading: false
        });
      }
    };

    checkConnection();
  }, []);

  // Format date for display
  const formatDateDisplay = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Check if it's today or tomorrow
    if (dateString === today.toISOString().split('T')[0]) {
      return 'Today';
    } else if (dateString === tomorrow.toISOString().split('T')[0]) {
      return 'Tomorrow';
    } else {
      const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
      return date.toLocaleDateString('en-US', options);
    }
  };

  // Auto-load available dates when connected
  useEffect(() => {
    if (!connectedStatus.connected) {
      setAvailableDays([]);
      return;
    }

    const fetchAvailableDays = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await fetch('/api/calendar/availability-multi?days=14');
        const data = await response.json();

        if (!response.ok) {
          let errorMsg = data.message || data.error || 'Failed to load availability';
          
          if (response.status === 404) {
            errorMsg = 'Calendar is not configured. Please contact support.';
          } else if (response.status === 401) {
            errorMsg = 'Calendar connection expired. Please contact support to reconnect.';
          } else if (response.status === 503) {
            errorMsg = 'Calendar service temporarily unavailable. Please try again in a moment.';
          }
          
          setError(errorMsg);
          setAvailableDays([]);
          return;
        }

        setAvailableDays(data.availability || []);
      } catch (err) {
        console.error('Error fetching availability:', err);
        setError('Unable to load available dates. Please check your connection and try again.');
        setAvailableDays([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailableDays();
  }, [connectedStatus.connected]);

  // Update slots when date is selected
  useEffect(() => {
    if (selectedDate && availableDays.length > 0) {
      const dayData = availableDays.find(d => d.date === selectedDate);
      if (dayData) {
        setSlots(dayData.slots);
        setSelectedSlot(null);
      } else {
        setSlots([]);
      }
    } else {
      setSlots([]);
    }
  }, [selectedDate, availableDays]);

  const handleBookSlot = async () => {
    if (!selectedSlot) return;

    const slot = slots.find(s => s.display === selectedSlot);
    if (!slot) return;

    setIsBooking(true);
    setError('');

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          clientName,
          clientEmail,
          slotStart: slot.start,
          slotEnd: slot.end,
          notes: `Priority consultation for ${caseId}`
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Provide user-friendly error messages
        let errorMsg = data.message || data.error || 'Booking failed';
        
        if (response.status === 409) {
          errorMsg = 'This slot was just booked. Please select another time.';
          // Refresh availability
          setSelectedDate('');
          setTimeout(() => setSelectedDate(selectedDate), 100);
        } else if (response.status === 401) {
          errorMsg = 'Calendar connection expired. Please contact support to reconnect.';
        } else if (response.status === 404) {
          errorMsg = 'Calendar is not configured. Please contact support.';
        } else if (response.status === 503) {
          errorMsg = 'Calendar service temporarily unavailable. Please try again in a moment.';
        }
        
        setError(errorMsg);
        return;
      }

      setBookingConfirmed(true);
      onBookingComplete?.(data.booking);
    } catch (err) {
      console.error('Error booking slot:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsBooking(false);
    }
  };

  if (connectedStatus.isLoading) {
    return (
      <div className="p-8 bg-zinc-900 border border-zinc-800 text-center">
        <div className="w-4 h-4 border-2 border-zinc-700 border-t-orange-600 rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-zinc-400 text-sm">Checking calendar connection...</p>
      </div>
    );
  }

  if (!connectedStatus.connected) {
    return (
      <div className="p-8 bg-zinc-900 border border-yellow-800 text-center rounded">
        <AlertCircle className="text-yellow-600 mx-auto mb-3" size={28} />
        <p className="text-yellow-600 font-bold mb-1">Scheduling Unavailable</p>
        <p className="text-zinc-400 text-sm">Scheduling is temporarily unavailable—please call the intake line:</p>
        <p className="text-white font-bold text-lg mt-3">1-800-555-0199</p>
      </div>
    );
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  if (bookingConfirmed) {
    const formattedDate = formatDate(selectedDate);
    return (
      <div className="p-8 bg-zinc-900 border border-green-800 text-center rounded">
        <CheckCircle2 className="text-green-500 mx-auto mb-3" size={32} />
        <h3 className="text-white font-bold text-lg mb-2">Appointment Confirmed!</h3>
        <p className="text-zinc-400 text-sm mb-4">
          Calendar invite has been sent to your email. We look forward to your consultation.
        </p>
        <p className="text-zinc-500 text-xs">
          <span className="font-bold">Date:</span> {formattedDate} at {selectedSlot}
        </p>
      </div>
    );
  }

  const availableCount = slots.filter(s => s.available).length;

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 border border-red-500/20 p-3">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="p-8 bg-zinc-950 border border-zinc-800 text-center">
          <div className="w-6 h-6 border-2 border-zinc-700 border-t-orange-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-zinc-400 text-sm">Loading available dates...</p>
        </div>
      ) : availableDays.length === 0 ? (
        <div className="p-6 bg-zinc-950 border border-zinc-800 text-center">
          <p className="text-zinc-400 text-sm">No available dates found. Please try again later.</p>
        </div>
      ) : (
        <>
          {!selectedDate ? (
            <div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-4">
                <Calendar size={14} className="inline mr-2" />
                Select a Date
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {availableDays.map((day) => (
                  <button
                    key={day.date}
                    onClick={() => setSelectedDate(day.date)}
                    className="p-4 bg-zinc-950 border border-zinc-800 hover:border-orange-600 transition-all text-left group"
                  >
                    <div className="font-bold text-white text-sm mb-1">{formatDateDisplay(day.date)}</div>
                    <div className="text-zinc-500 text-xs">{day.availableCount} available</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div>
                <button
                  onClick={() => {
                    setSelectedDate('');
                    setSelectedSlot(null);
                  }}
                  className="text-zinc-500 hover:text-white text-xs mb-4 flex items-center gap-2"
                >
                  ← Back to dates
                </button>
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-3">
                  <Clock size={14} className="inline mr-2" />
                  {formatDateDisplay(selectedDate)} - Select Time ({availableCount} available)
                </label>

                {slots.length === 0 ? (
                  <div className="p-6 bg-zinc-950 border border-zinc-800 text-center">
                    <p className="text-zinc-400 text-sm">No slots available for this date.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {slots.map((slot) => (
                      <button
                        key={slot.display}
                        onClick={() => setSelectedSlot(slot.available ? slot.display : null)}
                        disabled={!slot.available}
                        className={`py-4 px-3 font-bold text-xs transition-all border ${
                          slot.available
                            ? selectedSlot === slot.display
                              ? 'border-orange-600 bg-orange-600/10 text-orange-400'
                              : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-orange-600 hover:text-white'
                            : 'border-zinc-700 bg-zinc-900 text-zinc-600 cursor-not-allowed opacity-50'
                        }`}
                      >
                        {slot.display}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {selectedSlot && (
        <button
          onClick={handleBookSlot}
          disabled={isBooking}
          className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-700 text-white font-black uppercase tracking-widest py-4 transition-all flex items-center justify-center gap-2"
        >
          {isBooking ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              CONFIRMING APPOINTMENT...
            </>
          ) : (
            <>
              <CheckCircle2 size={16} />
              CONFIRM {selectedSlot} APPOINTMENT
            </>
          )}
        </button>
      )}

      <p className="text-zinc-500 text-xs italic">
        *Time slots are limited. This session is critical to stopping collection lawsuits.
      </p>
    </div>
  );
};

