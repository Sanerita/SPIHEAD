import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  Zap, 
  Clock, 
  CheckCircle2, 
  Send, 
  Copy, 
  RefreshCw, 
  AlertTriangle,
  Lightbulb,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { Lead, Activity, EmailMessage, Meeting, NextBestActionRecommendation } from '../types/crm';
import { geminiService } from '../lib/geminiService';

interface NextBestActionCardProps {
  lead: Lead;
  activities?: Activity[];
  emails?: EmailMessage[];
  meetings?: Meeting[];
  onOpenEmailModal?: (lead: Lead, initialSubject?: string, initialBody?: string) => void;
  onOpenScheduleModal?: (lead: Lead) => void;
  compact?: boolean;
}

export const NextBestActionCard: React.FC<NextBestActionCardProps> = ({
  lead,
  activities = [],
  emails = [],
  meetings = [],
  onOpenEmailModal,
  onOpenScheduleModal,
  compact = false,
}) => {
  const [recommendation, setRecommendation] = useState<NextBestActionRecommendation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchRecommendation = async () => {
    setLoading(true);
    try {
      const rec = await geminiService.fetchNextBestAction(lead, activities, emails, meetings);
      setRecommendation(rec);
    } catch (err) {
      console.error('Failed to load Next Best Action:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendation();
  }, [lead.id, lead.score, lead.status]);

  const handleCopyMessage = () => {
    if (recommendation?.suggestedMessage) {
      navigator.clipboard.writeText(recommendation.suggestedMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency?.toLowerCase()) {
      case 'immediate':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'today':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'this week':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-navy-950 via-navy-900 to-indigo-950 p-5 rounded-2xl text-white shadow-lg border border-navy-700 animate-pulse space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-40 bg-navy-800 rounded-md"></div>
          <div className="h-6 w-20 bg-navy-800 rounded-full"></div>
        </div>
        <div className="h-6 w-3/4 bg-navy-800 rounded-md"></div>
        <div className="h-12 w-full bg-navy-800/60 rounded-xl"></div>
      </div>
    );
  }

  if (!recommendation) return null;

  return (
    <div className="bg-gradient-to-br from-navy-950 via-navy-900 to-slate-900 rounded-2xl p-5 md:p-6 text-white shadow-xl border border-navy-700/80 relative overflow-hidden space-y-4">
      {/* Background Subtle Accent Glow */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-gold-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-navy-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gold-400/10 text-gold-400 border border-gold-400/20">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-gold-400 flex items-center gap-1.5">
              Gemini Next Best Action Engine
            </h3>
            <p className="text-[10px] text-navy-300 font-medium">Real-time Lead Assessment & Conversion Strategy</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Urgency Badge */}
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${getUrgencyBadge(recommendation.urgency)}`}>
            {recommendation.urgency}
          </span>

          {/* AI Confidence Score */}
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
            <Zap className="h-3 w-3 text-emerald-400" />
            {recommendation.confidenceScore}% Confidence
          </span>

          {/* Refresh Action */}
          <button
            onClick={fetchRecommendation}
            className="p-1 rounded-lg text-navy-300 hover:text-white hover:bg-navy-800 transition-colors"
            title="Re-run Gemini AI Analysis"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main Recommendation Title */}
      <div className="space-y-1.5">
        <div className="inline-block px-2 py-0.5 rounded-md bg-navy-800 text-[10px] font-extrabold text-navy-200 border border-navy-700 uppercase tracking-wider">
          {recommendation.category}
        </div>
        <h4 className="text-base md:text-lg font-black text-white leading-snug tracking-tight">
          {recommendation.actionTitle}
        </h4>
      </div>

      {/* Rationale Explanation */}
      <p className="text-xs text-navy-200 leading-relaxed bg-navy-950/60 p-3 rounded-xl border border-navy-800/80">
        <span className="font-bold text-gold-300">Why now: </span>
        {recommendation.rationale}
      </p>

      {/* CRM Triggers Detected */}
      {recommendation.keyTriggers && recommendation.keyTriggers.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-navy-300 uppercase tracking-wider">Detected Signals:</span>
          <div className="flex flex-wrap gap-1.5">
            {recommendation.keyTriggers.map((trigger, idx) => (
              <span 
                key={idx} 
                className="px-2 py-0.5 rounded-md bg-navy-800/90 text-[10px] font-medium text-slate-300 border border-navy-700/60 flex items-center gap-1"
              >
                <CheckCircle2 className="h-3 w-3 text-gold-400 shrink-0" />
                {trigger}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actionable Script / Email Draft */}
      {recommendation.suggestedMessage && (
        <div className="space-y-2 pt-2 border-t border-navy-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-navy-300 uppercase tracking-wider flex items-center gap-1">
              <Lightbulb className="h-3 w-3 text-gold-400" />
              Suggested Pitch / Outreach Script:
            </span>
            <button
              onClick={handleCopyMessage}
              className="text-[10px] font-bold text-gold-400 hover:text-gold-300 flex items-center gap-1 bg-navy-800 px-2 py-1 rounded-md border border-navy-700 transition-colors"
            >
              <Copy className="h-3 w-3" />
              {copied ? 'Copied!' : 'Copy Script'}
            </button>
          </div>

          <div className="p-3 rounded-xl bg-navy-950/90 border border-navy-800 text-xs font-sans italic text-slate-200 leading-relaxed">
            "{recommendation.suggestedMessage}"
          </div>
        </div>
      )}

      {/* Quick Action Trigger Buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        {onOpenEmailModal && (
          <button
            onClick={() => onOpenEmailModal(lead, recommendation.actionTitle, recommendation.suggestedMessage)}
            className="flex-1 py-2 px-3 rounded-xl bg-gold-400 hover:bg-gold-300 text-navy-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Execute via Outlook Email</span>
          </button>
        )}

        {onOpenScheduleModal && (
          <button
            onClick={() => onOpenScheduleModal(lead)}
            className="py-2 px-3 rounded-xl bg-navy-800 hover:bg-navy-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-navy-700 transition-all cursor-pointer"
          >
            <span>Schedule Teams Meeting</span>
          </button>
        )}
      </div>
    </div>
  );
};
