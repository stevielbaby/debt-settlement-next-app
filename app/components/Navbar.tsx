'use client';

import React, { useState, useEffect } from 'react';
import { Scale, Menu, X, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

export const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMenuClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setIsOpen(false);
    if (pathname === '/') {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else {
      router.push(`/#${id}`);
    }
  };

  const handleCaseReviewClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsOpen(false);
    router.push('/case-review');
  };
  
  return (
    <nav className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 border-b ${scrolled ? 'bg-zinc-950/90 backdrop-blur-md border-zinc-800 py-2' : 'bg-transparent border-transparent py-6'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex-shrink-0 flex items-center gap-3 group">
            <div className="w-10 h-10 bg-white flex items-center justify-center group-hover:bg-orange-600 transition-colors">
              <Scale className="w-6 h-6 text-zinc-950 group-hover:text-white" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-serif font-bold text-xl tracking-tight text-white leading-none">STRATTON</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">Legal Defense</span>
            </div>
          </Link>
          
          <div className="hidden md:flex items-center space-x-12">
            <button onClick={(e) => handleMenuClick(e, 'violations')} className="text-xs font-semibold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">Violations</button>
            <button onClick={(e) => handleMenuClick(e, 'recovery')} className="text-xs font-semibold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">Recovery Process</button>
            
            {/* Services Dropdown */}
            <div 
              className="relative group"
              onMouseEnter={() => setServicesOpen(true)}
              onMouseLeave={() => setServicesOpen(false)}
            >
              <button 
                className="flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-zinc-400 group-hover:text-white transition-colors"
              >
                Services
                <ChevronDown size={14} className={`transition-transform ${servicesOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {servicesOpen && (
                <div className="absolute top-full left-0 mt-0 w-56 bg-zinc-900 border border-zinc-800 shadow-xl z-50">
                  <Link
                    href="/refund-expectations"
                    className="block w-full text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors border-b border-zinc-800"
                  >
                    Debt Settlement Refund
                  </Link>
                  <Link
                    href="/bankruptcy-myths"
                    className="block w-full text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    Bankruptcy
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">24/7 Intake Line</span>
              <span className="font-mono text-white font-bold tracking-tight">1-800-555-0199</span>
            </div>
            <Link 
              href="/admin"
              className="border border-zinc-600 text-zinc-400 hover:text-white hover:border-zinc-400 px-4 py-2 font-bold uppercase tracking-wider text-xs transition-all"
            >
              Admin
            </Link>
            <button 
              onClick={handleCaseReviewClick} 
              className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 font-bold uppercase tracking-wider text-xs transition-all hover:scale-105 shadow-[0_0_20px_rgba(234,88,12,0.3)]"
            >
              Case Review
            </button>
          </div>

          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="text-white p-2">
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-zinc-900 border-b border-zinc-800 px-4 py-8 flex flex-col space-y-6">
          <button onClick={(e) => handleMenuClick(e, 'violations')} className="text-left text-xl font-serif text-white">Violations</button>
          <button onClick={(e) => handleMenuClick(e, 'recovery')} className="text-left text-xl font-serif text-white">Recovery Process</button>
          
          {/* Mobile Services Dropdown */}
          <div>
            <button 
              onClick={() => setServicesOpen(!servicesOpen)}
              className="flex items-center gap-1 text-left text-xl font-serif text-white w-full justify-between"
            >
              Services
              <ChevronDown size={18} className={`transition-transform ${servicesOpen ? 'rotate-180' : ''}`} />
            </button>
            {servicesOpen && (
              <div className="mt-4 space-y-3 pl-4 border-l border-zinc-700">
                <Link
                  href="/refund-expectations"
                  className="block text-zinc-400 hover:text-white transition-colors text-sm font-semibold"
                  onClick={() => setIsOpen(false)}
                >
                  Debt Settlement Refund
                </Link>
                <Link
                  href="/bankruptcy-myths"
                  className="block text-zinc-400 hover:text-white transition-colors text-sm font-semibold"
                  onClick={() => setIsOpen(false)}
                >
                  Bankruptcy
                </Link>
              </div>
            )}
          </div>
          
          <button onClick={handleCaseReviewClick} className="bg-orange-600 text-white px-6 py-4 text-center font-bold uppercase tracking-wider">
            Start Evaluation
          </button>
        </div>
      )}
    </nav>
  );
};

