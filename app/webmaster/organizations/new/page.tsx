'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Mail, User, Phone, MapPin } from 'lucide-react';
import Link from 'next/link';

export default function NewOrganizationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contact_name: '',
    phone: '',
    address: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/webmaster/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/webmaster/organizations');
        router.refresh();
      } else {
        setError(data.error || 'Failed to create organization');
      }
    } catch (err) {
      console.error('Create organization error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/webmaster/organizations"
          className="p-2 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-all"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h2 className="text-4xl font-serif font-bold text-white uppercase tracking-tight">
            Create Organization
          </h2>
          <p className="text-zinc-500 text-sm mt-2">Add a new law firm to the platform</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {error && (
          <div className="bg-red-900/20 border border-red-800 p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Organization Name */}
        <div>
          <label htmlFor="name" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
            <Building2 size={14} />
            Firm Name *
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={formData.name}
            onChange={handleChange}
            className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 focus:outline-none focus:border-orange-600 transition-colors"
            placeholder="Woods Legal Services"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
            <Mail size={14} />
            Email Address *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 focus:outline-none focus:border-orange-600 transition-colors"
            placeholder="contact@woodslegal.com"
          />
          <p className="text-zinc-600 text-xs mt-1">Must be unique across all organizations</p>
        </div>

        {/* Contact Name */}
        <div>
          <label htmlFor="contact_name" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
            <User size={14} />
            Contact Name
          </label>
          <input
            id="contact_name"
            name="contact_name"
            type="text"
            value={formData.contact_name}
            onChange={handleChange}
            className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 focus:outline-none focus:border-orange-600 transition-colors"
            placeholder="John Smith"
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
            <Phone size={14} />
            Phone Number
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 focus:outline-none focus:border-orange-600 transition-colors"
            placeholder="(555) 123-4567"
          />
        </div>

        {/* Address */}
        <div>
          <label htmlFor="address" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
            <MapPin size={14} />
            Address
          </label>
          <textarea
            id="address"
            name="address"
            rows={3}
            value={formData.address}
            onChange={handleChange}
            className="w-full bg-zinc-950 border border-zinc-700 text-white px-4 py-3 focus:outline-none focus:border-orange-600 transition-colors resize-none"
            placeholder="123 Main St, Suite 100&#10;Los Angeles, CA 90001"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-3 font-bold uppercase tracking-wider text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Organization'}
          </button>
          <Link
            href="/webmaster/organizations"
            className="px-8 py-3 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 font-bold uppercase tracking-wider text-xs transition-all"
          >
            Cancel
          </Link>
        </div>

        <p className="text-zinc-600 text-xs">
          * Required fields
        </p>
      </form>
    </div>
  );
}
