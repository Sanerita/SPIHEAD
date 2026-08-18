import React, { useState } from 'react';
import { Lead, LeadStatus, STANDARD_INDUSTRIES } from '../types/crm';
import { sanitizeInput, isValidEmail } from '../lib/authService';
import { X, UserPlus, Building2, Mail, Phone, DollarSign, Layers, Sparkles, AlertCircle } from 'lucide-react';

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'score' | 'scoreBreakdown'>) => void;
}

interface FormErrors {
  name?: string;
  email?: string;
  company?: string;
}

export const AddLeadModal: React.FC<AddLeadModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [budget, setBudget] = useState<number>(25000);
  const [status, setStatus] = useState<LeadStatus>('New');
  const [urgency, setUrgency] = useState(false);
  const [engagement, setEngagement] = useState<number>(3);
  const [notes, setNotes] = useState('');
  const [industry, setIndustry] = useState('Technology');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name || name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!email || !isValidEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!company || company.trim().length < 2) {
      newErrors.company = 'Company name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const sanitizedName = sanitizeInput(name.trim());
      const sanitizedEmail = sanitizeInput(email.trim().toLowerCase());
      const sanitizedCompany = sanitizeInput(company.trim());

      await onSubmit({
        name: sanitizedName,
        email: sanitizedEmail,
        phone: phone ? sanitizeInput(phone) : '',
        company: sanitizedCompany,
        budget: Number(budget),
        status,
        urgency,
        engagement: Number(engagement),
        replyCount: 1,
        notes: notes ? sanitizeInput(notes) : '',
        industry,
        m365Synced: true,
        tags: ['New Lead', industry],
      });

      // Reset form on success
      setName('');
      setEmail('');
      setPhone('');
      setCompany('');
      setBudget(25000);
      setStatus('New');
      setUrgency(false);
      setEngagement(3);
      setNotes('');
      setIndustry('Technology');
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Failed to submit lead:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setErrors({});
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden my-8">
        
        {/* Header */}
        <div className="bg-navy-900 text-white p-5 flex items-center justify-between border-b border-navy-700">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-navy-800 border border-gold-400/30">
              <UserPlus className="h-5 w-5 text-gold-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gold-400">Add New Lead</h3>
              <p className="text-xs text-navy-200">Automatically scores lead energy warmth</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-navy-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm text-slate-700" noValidate>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="lead-name" className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Full Name *
              </label>
              <div className="relative">
                <input
                  id="lead-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gold-400 focus:outline-none ${
                    errors.name ? 'border-red-500 focus:ring-red-400' : 'border-slate-200'
                  }`}
                />
                {errors.name && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3" />
                    <span>{errors.name}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="lead-company" className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Company Name *
              </label>
              <input
                id="lead-company"
                name="company"
                type="text"
                autoComplete="organization"
                required
                placeholder="Company Name"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gold-400 focus:outline-none ${
                  errors.company ? 'border-red-500 focus:ring-red-400' : 'border-slate-200'
                }`}
              />
              {errors.company && (
                <div className="flex items-center gap-1 mt-1 text-xs text-red-500">
                  <AlertCircle className="h-3 w-3" />
                  <span>{errors.company}</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="lead-email" className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Email Address *
              </label>
              <input
                id="lead-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="email@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gold-400 focus:outline-none ${
                  errors.email ? 'border-red-500 focus:ring-red-400' : 'border-slate-200'
                }`}
              />
              {errors.email && (
                <div className="flex items-center gap-1 mt-1 text-xs text-red-500">
                  <AlertCircle className="h-3 w-3" />
                  <span>{errors.email}</span>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="lead-phone" className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Phone Number
              </label>
              <input
                id="lead-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="lead-budget" className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Estimated Budget ($)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="lead-budget"
                  name="budget"
                  type="number"
                  min={0}
                  step={1000}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full pl-8 px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-gold-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="lead-status" className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Initial Pipeline Status
              </label>
              <select
                id="lead-status"
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as LeadStatus)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold-400 focus:outline-none bg-white"
              >
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Qualified">Qualified</option>
                <option value="Proposal">Proposal</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="lead-industry" className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Industry Sector
              </label>
              <input
                id="lead-industry"
                name="industry"
                type="text"
                list="standard-industries-list"
                placeholder="Select or type industry sector..."
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold-400 focus:outline-none"
              />
              <datalist id="standard-industries-list">
                {STANDARD_INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind} />
                ))}
              </datalist>
            </div>

            <div>
              <label htmlFor="lead-engagement" className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Engagement Rating (1 - 5)
              </label>
              <input
                id="lead-engagement"
                name="engagement"
                type="range"
                min={1}
                max={5}
                value={engagement}
                onChange={(e) => setEngagement(Number(e.target.value))}
                className="w-full accent-gold-500"
              />
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>1 (Cold)</span>
                <span className="font-bold text-navy-900">{engagement}/5</span>
                <span>5 (Hot)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="urgency"
              name="urgency"
              checked={urgency}
              onChange={(e) => setUrgency(e.target.checked)}
              className="rounded text-gold-500 focus:ring-gold-400 h-4 w-4"
            />
            <label htmlFor="urgency" className="text-xs font-medium text-slate-700 cursor-pointer">
              High Priority / Immediate buying timeframe
            </label>
          </div>

          <div>
            <label htmlFor="lead-notes" className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Lead Notes & Discovery Details
            </label>
            <textarea
              id="lead-notes"
              name="notes"
              rows={3}
              placeholder="Key pain points, software stack, Microsoft 365 requirements..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold-400 focus:outline-none resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Layers className="h-4 w-4 text-emerald-600" />
              <span>Syncs to Microsoft 365 Contacts</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg bg-gold-500 hover:bg-gold-400 text-navy-950 font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-navy-950 border-t-transparent"></span>
                    Adding...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Add Lead
                  </>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
