import React, { useState } from 'react';
import { Lead, LeadStatus, STANDARD_INDUSTRIES } from '../types/crm';
import { sanitizeInput } from '../lib/authService';
import { X, UserPlus, Building2, Mail, Phone, DollarSign, Layers, Sparkles } from 'lucide-react';

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'score' | 'scoreBreakdown'>) => void;
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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !company) return;

    onSubmit({
      name: sanitizeInput(name),
      email: sanitizeInput(email),
      phone: sanitizeInput(phone),
      company: sanitizeInput(company),
      budget: Number(budget),
      status,
      urgency,
      engagement: Number(engagement),
      replyCount: 1,
      notes: sanitizeInput(notes),
      industry,
      m365Synced: true,
      tags: ['New Lead', industry],
    });

    // Reset form
    setName('');
    setEmail('');
    setPhone('');
    setCompany('');
    setBudget(25000);
    setStatus('New');
    setNotes('');
    onClose();
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
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-navy-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm text-slate-700">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Full Name *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                required
                placeholder="Company Name"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="email@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Estimated Budget ($)
              </label>
              <input
                type="number"
                min={0}
                step={1000}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-gold-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Initial Pipeline Status
              </label>
              <select
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
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Industry Sector
              </label>
              <input
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
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Engagement Rating (1 - 5)
              </label>
              <input
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
              checked={urgency}
              onChange={(e) => setUrgency(e.target.checked)}
              className="rounded text-gold-500 focus:ring-gold-400 h-4 w-4"
            />
            <label htmlFor="urgency" className="text-xs font-medium text-slate-700 cursor-pointer">
              High Priority / Immediate buying timeframe
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Lead Notes & Discovery Details
            </label>
            <textarea
              rows={3}
              placeholder="Key pain points, software stack, Microsoft 365 requirements..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold-400 focus:outline-none"
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
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-gold-500 hover:bg-gold-400 text-navy-950 font-bold shadow-sm"
              >
                Add Lead
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
