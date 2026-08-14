import React, { useState, useEffect } from 'react';
import { Lead, EmailMessage } from '../types/crm';
import { m365Service } from '../lib/m365Service';
import { sanitizeInput } from '../lib/authService';
import { X, Send, Mail, Layers, Sparkles, CheckCircle2 } from 'lucide-react';

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (emailData: Omit<EmailMessage, 'id' | 'sentAt' | 'status'>) => void;
  lead?: Lead;
}

export const SendEmailModal: React.FC<SendEmailModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  lead,
}) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [template, setTemplate] = useState('Standard Follow-Up');

  useEffect(() => {
    if (isOpen && lead) {
      const accountName = m365Service.getAccount().displayName || 'Sanelisiwe Sileku';
      setSubject(`SPIHEAD Enterprise CRM & Microsoft 365 Follow-Up - ${lead.company}`);
      setBody(
        `Hi ${lead.name.split(' ')[0]},\n\nFollowing up on our discussions regarding ${lead.company}'s requirements. We're excited to demonstrate our Microsoft 365 integrated CRM platform with automated AI lead energy tracking.\n\nWould you have 15 minutes this week for a brief Microsoft Teams call?\n\nBest regards,\n${accountName}\nSPIHEAD Sales Team`
      );
      setTemplate('Standard Follow-Up');
    }
  }, [isOpen, lead]);

  if (!isOpen || !lead) return null;

  const currentAccountName = m365Service.getAccount().displayName || 'Sanelisiwe Sileku';

  const templates = [
    {
      name: 'Standard Follow-Up',
      subject: `SPIHEAD Enterprise CRM & Microsoft 365 Follow-Up - ${lead.company}`,
      body: `Hi ${lead.name.split(' ')[0]},\n\nFollowing up on our discussions regarding ${lead.company}'s requirements. We're excited to demonstrate our Microsoft 365 integrated CRM platform with automated AI lead energy tracking.\n\nWould you have 15 minutes this week for a brief Microsoft Teams call?\n\nBest regards,\n${currentAccountName}`,
    },
    {
      name: 'Proposal & Pricing Brief',
      subject: `Executive Proposal for ${lead.company} - SPIHEAD CRM`,
      body: `Hi ${lead.name.split(' ')[0]},\n\nI have prepared our customized enterprise proposal for ${lead.company} (Budget target: $${lead.budget.toLocaleString()}).\n\nOur solution includes full Microsoft 365 Outlook email logging, Teams call scheduling, and zero-cost AI scoring.\n\nPlease review the details and let me know your thoughts.\n\nBest regards,\n${currentAccountName}`,
    },
    {
      name: 'Re-Engagement Touchpoint',
      subject: `Checking in on ${lead.company}'s software initiatives`,
      body: `Hi ${lead.name.split(' ')[0]},\n\nI wanted to quickly check in to see how things are progressing at ${lead.company}. We've recently updated our Microsoft 365 integration suite, enabling automated contact sync and Outlook workflow triggers.\n\nLet me know if you would like a updated 10-minute preview!\n\nBest,\nSanelisiwe Sileku`,
    },
  ];

  const handleApplyTemplate = (tplName: string) => {
    setTemplate(tplName);
    const found = templates.find((t) => t.name === tplName);
    if (found) {
      setSubject(found.subject);
      setBody(found.body);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !body) return;

    const cleanSubject = sanitizeInput(subject);
    const cleanBody = sanitizeInput(body);

    await m365Service.sendOutlookEmail(lead, cleanSubject, cleanBody, template);

    onSubmit({
      leadId: lead.id,
      leadName: lead.name,
      leadEmail: lead.email,
      subject: cleanSubject,
      body: cleanBody,
      templateUsed: template,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden my-8">
        {/* Header */}
        <div className="bg-navy-900 text-white p-5 flex items-center justify-between border-b border-navy-700">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-teal-950 border border-teal-500/30">
              <Mail className="h-5 w-5 text-teal-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gold-400">Send Microsoft 365 Email</h3>
              <p className="text-xs text-navy-200">Dispatched via Outlook Graph API to {lead.email}</p>
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
        <form action="#" onSubmit={handleSubmit} className="p-6 space-y-4 text-sm text-slate-700">
          
          {/* Recipient Details */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 block font-semibold uppercase">Recipient</span>
              <span className="font-bold text-navy-900">{lead.name} ({lead.company})</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block font-semibold uppercase">Email</span>
              <span className="font-mono text-slate-700">{lead.email}</span>
            </div>
          </div>

          {/* Email Template Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Select M365 Email Template
            </label>
            <div className="flex flex-wrap gap-2">
              {templates.map((tpl) => (
                <button
                  type="button"
                  key={tpl.name}
                  onClick={() => handleApplyTemplate(tpl.name)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    template === tpl.name
                      ? 'bg-navy-900 text-gold-400 border-gold-400 font-bold'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {tpl.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="email-subject" className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Subject Line *
            </label>
            <input
              id="email-subject"
              name="subject"
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold-400 focus:outline-none font-medium"
            />
          </div>

          <div>
            <label htmlFor="email-body" className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Email Body *
            </label>
            <textarea
              id="email-body"
              name="body"
              rows={6}
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold-400 focus:outline-none font-sans"
            />
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Layers className="h-4 w-4 text-emerald-600" />
              <span>Logged to M365 Sent Items</span>
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
                className="px-5 py-2 rounded-lg bg-gold-500 hover:bg-gold-400 text-navy-950 font-bold shadow-sm flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                Send via Outlook
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
