'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  ArrowRight, 
  ShieldCheck, 
  RefreshCw, 
  Check, 
  Calendar, 
  Clock, 
  FileText, 
  Landmark, 
  AlertTriangle, 
  UserCheck, 
  Gavel, 
  BookOpen, 
  Banknote, 
  ShieldAlert, 
  ArrowUpRight, 
  Lock 
} from 'lucide-react';
import { ConsultationBooking } from './ConsultationBooking';
import Link from 'next/link';

export const IntakeConfirmation = ({ 
  user, 
  shouldScan, 
  onScanComplete,
  bookingTime,
  onBook,
  calendarLinked,
  onRefreshUserData
}: { 
  user: any, 
  shouldScan: boolean,
  onScanComplete: () => void,
  bookingTime: string | null,
  onBook: (time: string, date?: string) => void,
  calendarLinked: boolean,
  onRefreshUserData?: () => void
}) => {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(shouldScan);
  const [isSyncing, setIsSyncing] = useState(false);
  const [localBookingTime, setLocalBookingTime] = useState(bookingTime);
  const [bookingDate, setBookingDate] = useState<string | null>(null);

  // Initialize booking date/time from user data if available
  useEffect(() => {
    if (user?.appointmentDate && user?.appointmentTime) {
      setBookingDate(user.appointmentDate);
      setLocalBookingTime(user.appointmentTime);
    } else if (bookingTime) {
      // If no appointment in user data but bookingTime is set, use it
      setLocalBookingTime(bookingTime);
    }
  }, [user, bookingTime]);

  useEffect(() => {
    if (shouldScan) {
      const timer = setTimeout(() => {
        setIsScanning(false);
        onScanComplete();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [shouldScan, onScanComplete]);

  const formatDateDisplay = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const handleBookingClick = (time: string, date?: string) => {
    if (calendarLinked) {
      setIsSyncing(true);
      setTimeout(() => {
        setIsSyncing(false);
        onBook(time);
        setLocalBookingTime(time);
        if (date) setBookingDate(date);
      }, 1500);
    } else {
      onBook(time);
      setLocalBookingTime(time);
      if (date) setBookingDate(date);
    }
  };

  if (isScanning) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 animate-fadeIn">
        <div className="relative mb-12">
          <div className="w-24 h-24 border-4 border-zinc-800 rounded-full border-t-orange-600 animate-spin"></div>
          <Search className="absolute inset-0 m-auto text-orange-600 w-8 h-8" />
        </div>
        <h2 className="text-3xl font-serif text-white mb-4 uppercase tracking-tighter">Analyzing Federal Violations...</h2>
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 h-2 rounded-full overflow-hidden">
          <div className="bg-orange-600 h-full animate-loading"></div>
        </div>
        <p className="mt-8 font-mono text-zinc-500 text-[10px] uppercase tracking-[0.2em]">
          Auditing TSR Compliance • Scanning Program Contracts • Flagging Illegal Upfront Fees
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 animate-slideUp">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 border-b border-zinc-800 pb-8 gap-6">
        <div>
          <div className="flex items-center gap-2 text-zinc-500 text-[10px] uppercase tracking-widest mb-2">
            <span>Intake Complete</span> <ArrowRight size={10} /> <span className="text-orange-600">Strategy Phase</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-serif text-white uppercase tracking-tighter">
            Priority File: <span className="text-orange-600">{user?.firstName} {user?.lastName?.charAt(0)}.</span>
          </h2>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 px-6 py-4 flex items-center gap-4">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <div className="font-mono text-xs uppercase tracking-tighter">
            <span className="text-zinc-500">Case ID:</span> <span className="text-white">CASE-{user?.caseNumber?.toString().padStart(4, '0') || '0001'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-12">
          <div className="bg-zinc-900 border border-zinc-700 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <ShieldCheck size={180} />
            </div>
            
            <div className="p-8 md:p-12 relative z-10">
              {isSyncing ? (
                <div className="flex flex-col items-center justify-center py-12 animate-fadeIn">
                  <RefreshCw className="text-orange-600 animate-spin mb-4" size={32} />
                  <h3 className="text-xl font-serif text-white uppercase tracking-widest">Syncing with Google Calendar...</h3>
                  <p className="text-zinc-500 text-xs mt-2 uppercase tracking-widest">Writing Event to Secure Server</p>
                </div>
              ) : localBookingTime ? (
                <div className="animate-fadeIn">
                  <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-500 px-4 py-1 text-[10px] font-bold uppercase tracking-widest mb-6">
                    <Check size={12} /> Appointment Confirmed
                  </div>
                  <h3 className="text-3xl md:text-4xl font-serif text-white mb-6 uppercase tracking-tight">Your Strategy Session is Locked.</h3>
                  <p className="text-zinc-400 text-lg mb-8 max-w-xl">
                    A Senior Consumer Protection Attorney will contact you via the phone number provided. Expect the call from an <span className="text-white font-bold underline">area code (202)</span> number.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 bg-zinc-950/50 border border-zinc-800">
                    <div className="flex items-center gap-4">
                      <Calendar className="text-orange-600" />
                      <div>
                        <p className="text-[10px] uppercase text-zinc-500 font-bold">Scheduled Date</p>
                        <p className="text-white font-serif">
                          {bookingDate || user?.appointmentDate 
                            ? formatDateDisplay(bookingDate || user.appointmentDate) 
                            : new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Clock className="text-orange-600" />
                      <div>
                        <p className="text-[10px] uppercase text-zinc-500 font-bold">Selected Time</p>
                        <p className="text-white font-serif">{localBookingTime || user?.appointmentTime || 'Not scheduled'}</p>
                      </div>
                    </div>
                  </div>
                  {calendarLinked && (
                    <div className="mt-6 flex items-center gap-2 text-zinc-600 text-[10px] uppercase font-bold tracking-widest">
                      <Check size={12} className="text-green-500" /> Calendar Invite Sent to your secure inbox
                    </div>
                  )}
                </div>
              ) : (
                <ConsultationBooking
                  caseId={user?.caseNumber || 'CASE-NEW'}
                  clientName={user?.firstName + ' ' + user?.lastName || 'Client'}
                  clientEmail={user?.email || ''}
                  onBookingComplete={async (booking) => {
                    // Wait a moment for database to update, then refresh user data
                    setTimeout(async () => {
                      // Refresh user data from database to get accurate appointment info
                      if (onRefreshUserData) {
                        await onRefreshUserData();
                      }
                      
                      // Use appointment data from user state (now refreshed from DB)
                      if (user?.appointmentTime && user?.appointmentDate) {
                        handleBookingClick(user.appointmentTime, user.appointmentDate);
                      } else {
                        // Fallback to booking data if DB doesn't have it yet
                        const slotStart = new Date(booking.slotStart);
                        const hour12 = slotStart.getHours() === 0 ? 12 : slotStart.getHours() > 12 ? slotStart.getHours() - 12 : slotStart.getHours();
                        const ampm = slotStart.getHours() >= 12 ? 'PM' : 'AM';
                        const time = `${hour12}:${String(slotStart.getMinutes()).padStart(2, '0')} ${ampm}`;
                        const date = booking.slotStart.split('T')[0];
                        handleBookingClick(time, date);
                      }
                    }, 1000);
                  }}
                />
              )}
            </div>
          </div>

          <section className="space-y-6">
            <h4 className="text-xl font-serif text-white border-l-4 border-orange-600 pl-4 uppercase tracking-tight">Pre-Call Action Plan</h4>
            <p className="text-zinc-400 text-sm">To ensure we can calculate your exact refund amount during our call, please have the following ready:</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { icon: FileText, title: "Program Contract", desc: "The agreement you signed with the debt settlement company." },
                { icon: Landmark, title: "Payment History", desc: "Access to your bank statements or 'Special Purpose Account' ledger." },
                { icon: AlertTriangle, title: "Summons/Notices", desc: "Any recent court documents or threatening letters from creditors." },
                { icon: UserCheck, title: "Spouse/Partner", desc: "If debts are joint, having them on the call is highly recommended." }
              ].map((item, i) => (
                <div key={i} className="p-6 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors">
                  <item.icon className="text-zinc-500 mb-4" size={24} />
                  <h5 className="text-white font-bold mb-1 text-sm">{item.title}</h5>
                  <p className="text-zinc-500 text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="p-10 bg-white text-zinc-950">
            <h4 className="text-2xl font-serif font-bold mb-8 uppercase tracking-tighter">Your Recovery Roadmap</h4>
            <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:bg-zinc-100 md:before:mx-auto md:before:translate-x-0">
              {[
                { step: "Phase 1", title: "Federal Audit", desc: "We review your contract for TSR and FDCPA violations." },
                { step: "Phase 2", title: "Fee Recovery", desc: "We demand the return of illegal upfront fees from the program." },
                { step: "Phase 3", title: "Asset Protection", desc: "Immediate legal intervention to stop wage garnishment." },
                { step: "Phase 4", title: "Final Discharge", desc: "Legal clearing of the debt through validation or bankruptcy." }
              ].map((item, i) => (
                <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-zinc-200 bg-white z-10 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                    <span className="text-[10px] font-black">{i + 1}</span>
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[45%] p-4 bg-zinc-50 rounded border border-zinc-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px] uppercase font-bold text-orange-600">{item.step}</span>
                    </div>
                    <h5 className="font-bold text-sm mb-1">{item.title}</h5>
                    <p className="text-[11px] text-zinc-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="bg-zinc-900 border border-zinc-800 p-8 text-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
              <Gavel size={100} />
            </div>
            <div className="w-24 h-24 bg-zinc-800 border-2 border-orange-600 rounded-full mx-auto mb-6 flex items-center justify-center relative">
              <UserCheck size={40} className="text-zinc-600" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-zinc-900"></div>
            </div>
            <h5 className="text-white font-serif text-xl mb-1">Marcus Stratton, Esq.</h5>
            <p className="text-orange-600 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">Senior Litigation Lead</p>
            <p className="text-zinc-500 text-xs leading-relaxed mb-6">
              "We don't just negotiate. We litigate. If they broke the law, we're going to get your money back."
            </p>
            <div className="flex justify-center gap-3">
              <div className="px-3 py-1 bg-zinc-950 text-[9px] text-zinc-400 font-bold border border-zinc-800">15+ YRS EXP</div>
              <div className="px-3 py-1 bg-zinc-950 text-[9px] text-zinc-400 font-bold border border-zinc-800">CONSUMER LAW</div>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest px-2">Essential Resources</p>
            
            <Link href="/violations-checklist" className="w-full text-left flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 hover:border-orange-600 transition-all group">
              <div className="flex items-center gap-4">
                <BookOpen size={20} className="text-zinc-500 group-hover:text-orange-600" />
                <div>
                  <h6 className="text-white text-sm font-bold">The Violation Checklist</h6>
                  <p className="text-zinc-600 text-[10px]">Learn how they break the law.</p>
                </div>
              </div>
              <ArrowUpRight size={16} className="text-zinc-700 group-hover:text-white" />
            </Link>

            <Link href="/refund-expectations" className="w-full text-left flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 hover:border-orange-600 transition-all group">
              <div className="flex items-center gap-4">
                <Banknote size={20} className="text-zinc-500 group-hover:text-orange-600" />
                <div>
                  <h6 className="text-white text-sm font-bold">Refund Expectations</h6>
                  <p className="text-zinc-600 text-[10px]">What can you really get back?</p>
                </div>
              </div>
              <ArrowUpRight size={16} className="text-zinc-700 group-hover:text-white" />
            </Link>

            <Link href="/bankruptcy-myths" className="w-full text-left flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 hover:border-orange-600 transition-all group">
              <div className="flex items-center gap-4">
                <ShieldAlert size={20} className="text-zinc-500 group-hover:text-orange-600" />
                <div>
                  <h6 className="text-white text-sm font-bold">Bankruptcy Myth-Busting</h6>
                  <p className="text-zinc-600 text-[10px]">The truth about your credit score.</p>
                </div>
              </div>
              <ArrowUpRight size={16} className="text-zinc-700 group-hover:text-white" />
            </Link>
          </div>

          <div className="p-6 border border-zinc-800 bg-zinc-950 flex flex-col items-center gap-4 opacity-50">
            <Lock size={32} className="text-zinc-600" />
            <p className="text-[10px] text-zinc-500 text-center uppercase tracking-widest leading-relaxed">
              Attorney-Client Privilege <br/> End-to-End Encrypted File Access
            </p>
          </div>
        </div>
      </div>
      
      <div className="mt-20 pt-8 border-t border-zinc-900 text-center">
        <Link href="/" className="text-zinc-700 text-[10px] uppercase font-bold hover:text-zinc-500 transition-colors tracking-[0.3em]">
          ← RE-EVALUATE DIFFERENT CASE
        </Link>
      </div>
    </div>
  );
};

