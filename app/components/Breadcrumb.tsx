'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export const Breadcrumb = ({ items }: BreadcrumbProps) => {
  return (
    <nav className="flex items-center gap-2 mb-12 text-sm">
      <Link 
        href="/" 
        className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors group"
      >
        <Home size={14} />
        <span className="text-[10px] uppercase font-bold tracking-[0.2em]">Home</span>
      </Link>
      
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight size={14} className="text-zinc-700" />
          {item.href ? (
            <Link 
              href={item.href}
              className="text-zinc-500 hover:text-white transition-colors text-[10px] uppercase font-bold tracking-[0.2em]"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-zinc-400 text-[10px] uppercase font-bold tracking-[0.2em]">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
