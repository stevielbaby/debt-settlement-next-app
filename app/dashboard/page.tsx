'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/app/components/Navbar';
import { UrgentBanner } from '@/app/components/UrgentBanner';
import { PriorityDashboard } from '@/app/components/PriorityDashboard';

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [shouldScan, setShouldScan] = useState(true);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [bookingTime, setBookingTime] = useState<string | null>(null);
  const [calendarLinked, setCalendarLinked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      const caseNumber = searchParams.get('caseNumber');
      if (caseNumber) {
        try {
          const response = await fetch(`/api/leads/${caseNumber}`);
          const result = await response.json();
          
          if (result.success && result.lead) {
            setUser({
              caseNumber: result.lead.caseNumber,
              firstName: result.lead.firstName,
              lastName: result.lead.lastName,
              email: result.lead.email,
              phone: result.lead.phone,
              situation: result.lead.situation,
              debtAmount: result.lead.debtAmount,
              currentCompany: result.lead.currentCompany,
              appointmentDate: result.lead.appointmentDate,
              appointmentTime: result.lead.appointmentTime,
              appointmentSlotStart: result.lead.appointmentSlotStart,
              appointmentSlotEnd: result.lead.appointmentSlotEnd
            });
            
            // If appointment exists, set booking time
            if (result.lead.appointmentTime) {
              setBookingTime(result.lead.appointmentTime);
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    const checkCalendarStatus = async () => {
      try {
        const response = await fetch('/api/calendar/connection-status');
        const data = await response.json();
        
        // Calendar is linked if connected AND settings are configured
        const isLinked = data.connected && data.settings && data.settings.calendarId;
        setCalendarLinked(isLinked);
      } catch (error) {
        console.error('Error checking calendar status:', error);
        setCalendarLinked(false);
      }
    };

    fetchUserData();
    checkCalendarStatus();
  }, [searchParams]);

  const markScanComplete = () => {
    setHasAnalyzed(true);
  };

  const handleBook = async (time: string, date?: string) => {
    setBookingTime(time);
    if (date) {
      // Store date in user state if provided
      setUser((prev: any) => ({ ...prev, appointmentDate: date, appointmentTime: time }));
    }
  };

  // Function to refresh user data from database
  const refreshUserData = async () => {
    const caseNumber = searchParams.get('caseNumber');
    if (caseNumber) {
      try {
        const response = await fetch(`/api/leads/${caseNumber}`);
        const result = await response.json();
        
        if (result.success && result.lead) {
          setUser({
            caseNumber: result.lead.caseNumber,
            firstName: result.lead.firstName,
            lastName: result.lead.lastName,
            email: result.lead.email,
            phone: result.lead.phone,
            situation: result.lead.situation,
            debtAmount: result.lead.debtAmount,
            currentCompany: result.lead.currentCompany,
            appointmentDate: result.lead.appointmentDate,
            appointmentTime: result.lead.appointmentTime,
            appointmentSlotStart: result.lead.appointmentSlotStart,
            appointmentSlotEnd: result.lead.appointmentSlotEnd
          });
          
          // Update booking time from database if available
          if (result.lead.appointmentTime) {
            setBookingTime(result.lead.appointmentTime);
          }
        }
      } catch (error) {
        console.error('Error refreshing user data:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-500 text-sm">Loading your case...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 selection:bg-orange-600 selection:text-white overflow-x-hidden">
      <UrgentBanner />
      <Navbar />
      <PriorityDashboard 
        user={user} 
        shouldScan={shouldScan}
        onScanComplete={markScanComplete}
        bookingTime={bookingTime}
        onBook={handleBook}
        calendarLinked={calendarLinked}
        onRefreshUserData={refreshUserData}
      />
    </div>
  );
}

