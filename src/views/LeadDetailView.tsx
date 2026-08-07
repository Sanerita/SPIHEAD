import React from 'react';
import { Lead, Meeting, EmailMessage, LeadStatus } from '../types/crm';
import { LeadEnergyGauge } from '../components/LeadEnergyGauge';
import { generateAIAssessmentText } from '../lib/aiScoringEngine';
import { 
  ArrowLeft, 
  Building2, 
  Mail, 
  Phone, 
  DollarSign, 
  Calendar, 
  Send, 
  Layers, 
  Video, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  ExternalLink,
  ShieldCheck,
  Tag
} from 'lucide-react';

interface LeadDetailViewProps {
  leadId: string;
  leads: Lead[];
  meetings: Meeting[];
  emails: EmailMessage[];
  onBack: () => void;
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
  onOpenEmailModal: (lead: Lead) => void;
  onOpenScheduleModal: (lead: Lead) => void;
}

export const LeadDetailView: React.FC<LeadDetailViewProps> = ({
  leadId,
  leads,
  meetings,
  emails,
  onBack,
  onStatusChange,
  onOpenEmailModal,
  onOpenScheduleModal,
}) => {
  const lead = leads.find((l) => l.id === leadId);

  if (!lead) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-slate-600 font-semibold">Lead record not found.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-lg bg-navy-900 text-gold-400 font-bold text-xs"
        >
          Return to Leads
        </button>
      </div>
    );
  }

  const leadMeetings = meetings.filter((m) => m.leadId === lead.id || m.leadEmail === lead.email);
  const leadEmails = emails.filter((e) => e.leadId === lead.id || e.leadEmail === lead.email);
  const aiRecommendation = generateAIAssessmentText(lead);

  const statuses: LeadStatus[] = ['New', 'Contacted', 'Qualified', 'Proposal', 'Closed'];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-navy-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Leads Pipeline
      </button>

      {/* Main Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black text-navy-900">{lead.name}</h1>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-navy-900 text-gold-400">
              {lead.company}
            </span>
            {lead.m365Synced && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                M365 Synced
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1">
              <Mail className="h-3.5 w-3.5 text-slate-400" /> {lead.email}
            </span>
            {lead.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-slate-400" /> {lead.phone}
              </span>
            )}
            <span className="flex items-center gap-1 font-mono font-bold text-navy-900">
              <DollarSign className="h-3.5 w-3.5 text-emerald-600" /> ${lead.budget.toLocaleString()} Budget
            </span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onOpenEmailModal(lead)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-gold-400 font-bold text-xs shadow-xs"
          >
            <Send className="h-4 w-4" />
            Send Outlook Email
          </button>
          <button
            onClick={() => onOpenScheduleModal(lead)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs"
          >
            <Video className="h-4 w-4" />
            Schedule Teams Call
          </button>
        </div>
      </div>

      {/* Grid: 2 Cols Left, 1 Col Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: AI Energy Analysis & Pipeline Status */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* AI Energy Score Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-navy-900 text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-gold-500" />
                AI Lead Energy Score Breakdown
              </h3>
              <span className="text-xs font-mono font-bold text-slate-500">Zero-Cost Algorithm</span>
            </div>

            <LeadEnergyGauge score={lead.score} breakdown={lead.scoreBreakdown} showBreakdown={true} />

            {/* AI Next Best Action Card */}
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="h-4 w-4 text-amber-600" />
                AI Recommended Action
              </div>
              <p className="text-xs text-amber-900 leading-relaxed font-medium">
                {aiRecommendation}
              </p>
            </div>
          </div>

          {/* Microsoft 365 Outlook Email Log */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-teal-600" />
                <h3 className="font-extrabold text-navy-900 text-base">Outlook Email Interactions</h3>
              </div>
              <button
                onClick={() => onOpenEmailModal(lead)}
                className="text-xs font-bold text-teal-700 hover:text-teal-900"
              >
                + New Email
              </button>
            </div>

            <div className="space-y-3">
              {leadEmails.length > 0 ? (
                leadEmails.map((email) => (
                  <div key={email.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-navy-900">{email.subject}</h4>
                      <span className="text-[11px] font-mono text-slate-400">
                        {new Date(email.sentAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 whitespace-pre-wrap font-sans">
                      {email.body}
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px] text-slate-400">
                      <span>Via Microsoft Graph Outlook API</span>
                      <span className="text-emerald-600 font-medium">Sent & Synced</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-xs text-slate-400 py-6">
                  No Outlook emails sent yet. Click "Send Outlook Email" to contact lead.
                </p>
              )}
            </div>
          </div>

          {/* Microsoft Teams Meetings Log */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-purple-600" />
                <h3 className="font-extrabold text-navy-900 text-base">Scheduled Teams Meetings</h3>
              </div>
              <button
                onClick={() => onOpenScheduleModal(lead)}
                className="text-xs font-bold text-purple-700 hover:text-purple-900"
              >
                + Schedule Call
              </button>
            </div>

            <div className="space-y-3">
              {leadMeetings.length > 0 ? (
                leadMeetings.map((mtg) => (
                  <div key={mtg.id} className="p-4 rounded-xl border border-purple-100 bg-purple-50/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-navy-900">{mtg.title}</h4>
                      <span className="text-xs font-mono font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md">
                        {mtg.date} at {mtg.time}
                      </span>
                    </div>
                    {mtg.notes && <p className="text-xs text-slate-600">{mtg.notes}</p>}
                    {mtg.teamsJoinUrl && (
                      <div className="pt-2 flex justify-end">
                        <a
                          href={mtg.teamsJoinUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 text-white font-bold text-xs hover:bg-purple-700"
                        >
                          Join Microsoft Teams Meeting <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-center text-xs text-slate-400 py-6">
                  No Teams meetings scheduled for this lead.
                </p>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Pipeline Status & Lead Details */}
        <div className="space-y-6">
          
          {/* Status Change Selector */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h4 className="font-bold text-navy-900 text-sm">Update Pipeline Stage</h4>
            <div className="space-y-2">
              {statuses.map((st) => (
                <button
                  key={st}
                  onClick={() => onStatusChange(lead.id, st)}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-colors flex items-center justify-between ${
                    lead.status === st
                      ? 'bg-navy-900 text-gold-400 border border-gold-400/40'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{st}</span>
                  {lead.status === st && <CheckCircle2 className="h-4 w-4 text-gold-400" />}
                </button>
              ))}
            </div>
          </div>

          {/* Lead Information Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="font-bold text-navy-900 text-sm border-b border-slate-100 pb-2">
              Lead Specifications
            </h4>
            
            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Industry:</span>
                <span className="font-semibold text-slate-800">{lead.industry || 'Technology'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Engagement Level:</span>
                <span className="font-semibold text-slate-800">{lead.engagement}/5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Buying Urgency:</span>
                <span className="font-semibold text-slate-800">{lead.urgency ? 'High' : 'Standard'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Email Reply Count:</span>
                <span className="font-semibold text-slate-800">{lead.replyCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Added On:</span>
                <span className="font-mono text-slate-700">
                  {new Date(lead.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {lead.tags && lead.tags.length > 0 && (
              <div className="pt-3 border-t border-slate-100">
                <span className="text-[11px] font-semibold text-slate-400 block mb-1.5 uppercase">Tags</span>
                <div className="flex flex-wrap gap-1.5">
                  {lead.tags.map((t, idx) => (
                    <span key={idx} className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-[11px] font-medium border border-slate-200">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h4 className="font-bold text-navy-900 text-sm border-b border-slate-100 pb-2">
              Discovery Notes
            </h4>
            <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
              {lead.notes || 'No discovery notes recorded yet.'}
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
