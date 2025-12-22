'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Mail, User, Phone, MapPin, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function EditOrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contact_name: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    params.then(p => {
      setId(p.id);
      fetchOrganization(p.id);
    });
  }, []);

  const fetchOrganization = async (orgId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/webmaster/organizations/${orgId}`);
      const data = await response.json();

      if (data.success) {
        setFormData({
          name: data.organization.name || '',
          email: data.organization.email || '',
          contact_name: data.organization.contact_name || '',
          phone: data.organization.phone || '',
          address: data.organization.address || '',
        });
      } else {
        setError('Organization not found');
      }
    } catch (err) {
      console.error('Fetch organization error:', err);
      setError('Failed to load organization');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const response = await fetch(`/api/webmaster/organizations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/webmaster/organizations/${id}`);
        router.refresh();
      } else {
        setError(data.error || 'Failed to update organization');
      }
    } catch (err) {
      console.error('Update organization error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="animate-spin text-zinc-500 mr-2" size={20} />
        <span className="text-zinc-500">Loading organization...</span>
      </div>
    );
  }

  if (error && !formData.name) {
    return (
      <div className="space-y-6">
        <Link
          href="/webmaster/organizations"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm"
        >
          <ArrowLeft size={16} />
          Back to Organizations
        </Link>
        <div className="bg-red-900/20 border border-red-800 p-8 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/webmaster/organizations/${id}`}
          className="p-2 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-all"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h2 className="text-4xl font-serif font-bold text-white uppercase tracking-tight">
            Edit Organization
          </h2>
          <p className="text-zinc-500 text-sm mt-2">Update organization information</p>
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
            disabled={saving}
            className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-3 font-bold uppercase tracking-wider text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <Link
            href={`/webmaster/organizations/${id}`}
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
