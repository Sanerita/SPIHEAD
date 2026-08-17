import React, { useState, useMemo } from 'react';
import { Lead, Meeting, Activity, LeadStatus, M365Account } from '../types/crm';
import { StatsCards } from '../components/StatsCards';
import { LeadsTable } from '../components/LeadsTable';
import { PipelineBoard } from '../components/PipelineBoard';
import { RecentActivity } from '../components/RecentActivity';
import { NextBestActionCard } from '../components/NextBestActionCard';
import { m365Service } from '../lib/m365Service';
import { 
  Plus, 
  Calendar, 
  Send, 
  Layers, 
  Download, 
  Video, 
  Flame, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  Zap,
  Target,
  TrendingUp,
  DollarSign,
  Filter,
  Table as TableIcon,
  LayoutGrid,
  ArrowRight,
  Check,
  X,
  FileText,
  Phone,
  Award,
  BarChart3,
  Edit3,
  Eye,
  RefreshCw
} from 'lucide-react';

interface DashboardViewProps {
  leads: Lead[];
  meetings: Meeting[];
  activities: Activity[];
  m365Account: M365Account;
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
  onDeleteLead: (leadId: string) => void;
  onSelectLead: (leadId: string) => void;
  onOpenAddModal: () => void;
  onOpenScheduleModal: (lead?: Lead) => void;
  onOpenEmailModal: (lead: Lead) => void;
  onOpenM365Hub: () => void;
  onSyncAllM365: () => void;
  onUpdateMeetingStatus?: (meetingId: string, status: 'Scheduled' | 'Completed' | 'Cancelled') => void;
  onAddActivity?: (type: Activity['type'], message: string, leadId?: string, leadName?: string) => void;
  onUpdateSalesTarget?: (newTarget: number) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  leads,
  meetings,
  activities,
  m365Account,
  onStatusChange,
  onDeleteLead,
  onSelectLead,
  onOpenAddModal,
  onOpenScheduleModal,
  onOpenEmailModal,
  onOpenM365Hub,
  onSyncAllM365,
  onUpdateMeetingStatus,
  onAddActivity,
  onUpdateSalesTarget,
}) => {
  // View mode toggle: Table vs Kanban Board
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  
  // Dashboard timeframe filter
  const [timeframe, setTimeframe] = useState<'all' | 'month' | 'quarter' | 'ytd'>('all');

  // Stage filter overlay from funnel click
  const [selectedStage, setSelectedStage] = useState<'all' | LeadStatus>('all');

  // Edit Quota Modal State
  const [isEditQuotaOpen, setIsEditQuotaOpen] = useState(false);
  const [quotaInput, setQuotaInput] = useState<number>(m365Account.salesTarget || 500000);

  // Quick Log Activity Modal State
  const [isLogActivityOpen, setIsLogActivityOpen] = useState(false);
  const [logType, setLogType] = useState<Activity['type']>('note_added');
  const [logLeadId, setLogLeadId] = useState<string>(leads[0]?.id || '');
  const [logMessage, setLogMessage] = useState<string>('');

  // Filter leads based on timeframe
  const filteredLeadsByTime = useMemo(() => {
    const now = new Date();
    return leads.filter((lead) => {
      if (timeframe === 'all') return true;
      const created = new Date(lead.createdAt);
      if (timeframe === 'month') {
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
      }
      if (timeframe === 'quarter') {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const leadQuarter = Math.floor(created.getMonth() / 3);
        return currentQuarter === leadQuarter && created.getFullYear() === now.getFullYear();
      }
      if (timeframe === 'ytd') {
        return created.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [leads, timeframe]);

  // Stage filtered list for table/board view
  const displayLeads = useMemo(() => {
    if (selectedStage === 'all') return filteredLeadsByTime;
    return filteredLeadsByTime.filter((l) => l.status === selectedStage);
  }, [filteredLeadsByTime, selectedStage]);

  // Sales Quota & Revenue Calculations
  const quotaTarget = m365Account.salesTarget || 500000;
  const closedWonLeads = leads.filter((l) => l.status === 'Closed');
  const closedRevenue = closedWonLeads.reduce((sum, l) => sum + (l.budget || 0), 0);
  const activePipelineValue = leads.filter((l) => l.status !== 'Closed').reduce((sum, l) => sum + (l.budget || 0), 0);
  const quotaPercent = Math.min(100, Math.round((closedRevenue / quotaTarget) * 100));
  const remainingQuota = Math.max(0, quotaTarget - closedRevenue);

  // Overall KPI stats
  const stats = {
    totalLeads: filteredLeadsByTime.length,
    hotLeads: filteredLeadsByTime.filter((l) => l.score >= 75).length,
    meetingsScheduled: meetings.filter((m) => m.status === 'Scheduled').length,
    totalValue: filteredLeadsByTime.reduce((sum, l) => sum + (l.budget || 0), 0),
    conversionRate:
      filteredLeadsByTime.length > 0
        ? Math.round((filteredLeadsByTime.filter((l) => l.status === 'Closed').length / filteredLeadsByTime.length) * 100)
        : 0,
    m365SyncedCount: filteredLeadsByTime.filter((l) => l.m365Synced).length,
  };

  // Funnel breakdown calculation
  const stageFunnel = useMemo(() => {
    const stages: LeadStatus[] = ['New', 'Contacted', 'Qualified', 'Proposal', 'Closed'];
    const totalCount = filteredLeadsByTime.length || 1;
    return stages.map((st) => {
      const stageLeads = filteredLeadsByTime.filter((l) => l.status === st);
      const stageValue = stageLeads.reduce((sum, l) => sum + (l.budget || 0), 0);
      const count = stageLeads.length;
      const pct = Math.round((count / totalCount) * 100);
      return { stage: st, count, stageValue, pct };
    });
  }, [filteredLeadsByTime]);

  // Hot leads requiring priority attention
  const hotLeads = useMemo(() => {
    return leads.filter((l) => l.score >= 75 && l.status !== 'Closed').slice(0, 3);
  }, [leads]);

  // Upcoming meetings
  const upcomingMeetings = meetings.filter((m) => m.status === 'Scheduled').slice(0, 4);

  // Next stage advancement helper
  const handleAdvanceStage = (lead: Lead) => {
    const sequence: LeadStatus[] = ['New', 'Contacted', 'Qualified', 'Proposal', 'Closed'];
    const currentIdx = sequence.indexOf(lead.status);
    if (currentIdx < sequence.length - 1) {
      const nextStage = sequence[currentIdx + 1];
      onStatusChange(lead.id, nextStage);
    }
  };

  // Handle Save Quota
  const handleSaveQuota = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateSalesTarget && quotaInput > 0) {
      onUpdateSalesTarget(quotaInput);
    }
    setIsEditQuotaOpen(false);
  };

  // Handle Save Activity Log
  const handleSaveActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logMessage.trim()) return;
    const targetLead = leads.find((l) => l.id === logLeadId);
    if (onAddActivity) {
      onAddActivity(logType, logMessage, logLeadId, targetLead?.name || 'Client');
    }
    setLogMessage('');
    setIsLogActivityOpen(false);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-navy-900 text-white p-6 rounded-2xl shadow-md border border-navy-700 relative overflow-hidden">
        {/* Decorative blur element */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-2xl font-black text-gold-400">Sales Executive Dashboard</span>
            <span className="bg-navy-800 text-gold-300 border border-gold-400/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 text-gold-400" /> Real-Time Pipeline Engine
            </span>
          </div>
          <p className="text-xs sm:text-sm text-navy-200">
            Real-time sales warmth analytics, Microsoft 365 Outlook & Teams activity tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 z-10">
          {/* Timeframe Selector */}
          <div className="flex items-center bg-navy-950 p-1 rounded-xl border border-navy-700 text-xs">
            {(['all', 'month', 'quarter', 'ytd'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  timeframe === tf
                    ? 'bg-gold-500 text-navy-950 shadow-xs'
                    : 'text-navy-300 hover:text-white'
                }`}
              >
                {tf === 'all' && 'All Time'}
                {tf === 'month' && 'This Month'}
                {tf === 'quarter' && 'This Qtr'}
                {tf === 'ytd' && 'YTD'}
              </button>
            ))}
          </div>

          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-navy-950 font-bold text-xs sm:text-sm shadow-sm transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Lead
          </button>

          <button
            onClick={() => setIsLogActivityOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-navy-800 hover:bg-navy-700 text-white border border-navy-600 font-semibold text-xs sm:text-sm transition-all cursor-pointer"
          >
            <Edit3 className="h-4 w-4 text-gold-400" />
            Log Activity
          </button>

          <button
            onClick={() => m365Service.exportToExcelCSV(leads)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-navy-800 hover:bg-navy-700 text-white border border-navy-600 font-medium text-xs sm:text-sm transition-all cursor-pointer"
            title="Export Excel CSV"
          >
            <Download className="h-4 w-4 text-emerald-400" />
            Excel
          </button>
        </div>
      </div>

      {/* Sales Quota & Revenue Progress Bar Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gold-50 text-gold-700 border border-gold-200">
              <Target className="h-5 w-5 text-gold-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-navy-900 text-base">Sales Target Quota Progress</h3>
                <span className="text-xs bg-slate-100 text-navy-800 font-bold px-2 py-0.5 rounded-md border border-slate-200">
                  Target: ${quotaTarget.toLocaleString()} USD
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Track closed deals against executive revenue targets.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setQuotaInput(quotaTarget);
                setIsEditQuotaOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-navy-900 font-bold text-xs border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 className="h-3.5 w-3.5 text-navy-700" />
              Adjust Target
            </button>
          </div>
        </div>

        {/* Quota Metric Summary Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Closed Won Revenue</span>
            <span className="text-lg font-black text-emerald-600 font-mono">${closedRevenue.toLocaleString()}</span>
            <span className="text-[10px] text-slate-400 block">{closedWonLeads.length} Deals Closed</span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Active Pipeline</span>
            <span className="text-lg font-black text-navy-900 font-mono">${activePipelineValue.toLocaleString()}</span>
            <span className="text-[10px] text-slate-400 block">{leads.length - closedWonLeads.length} Open Deals</span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Remaining Quota</span>
            <span className="text-lg font-black text-slate-700 font-mono">${remainingQuota.toLocaleString()}</span>
            <span className="text-[10px] text-slate-400 block">Needed to hit target</span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Quota Attainment</span>
            <span className="text-lg font-black text-gold-600 font-mono">{quotaPercent}%</span>
            <span className="text-[10px] text-emerald-600 font-bold block">
              {quotaPercent >= 100 ? '🎉 Target Achieved!' : `${100 - quotaPercent}% to Goal`}
            </span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs font-bold text-slate-600">
            <span>Progress ($0)</span>
            <span className="text-gold-600 font-black">{quotaPercent}% Attained</span>
            <span>Target (${quotaTarget.toLocaleString()})</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3.5 p-0.5 border border-slate-200 overflow-hidden relative">
            <div
              className="h-full rounded-full bg-gradient-to-r from-navy-800 via-gold-500 to-emerald-500 transition-all duration-500 shadow-sm"
              style={{ width: `${quotaPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* KPI Stats Cards Component */}
      <StatsCards stats={stats} />

      {/* Pipeline Funnel Stage Breakdown Strip */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-purple-600" />
            <h4 className="font-extrabold text-navy-900 text-sm">Pipeline Stage Funnel Breakdown</h4>
          </div>
          {selectedStage !== 'all' && (
            <button
              onClick={() => setSelectedStage('all')}
              className="text-xs text-purple-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              Reset Stage Filter ({selectedStage}) <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {stageFunnel.map((stg) => {
            const isSelected = selectedStage === stg.stage;
            return (
              <button
                key={stg.stage}
                onClick={() => setSelectedStage(isSelected ? 'all' : stg.stage)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-300 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-navy-900">{stg.stage}</span>
                  <span className="text-[10px] font-extrabold bg-white px-2 py-0.5 rounded-full border border-slate-200 font-mono">
                    {stg.count}
                  </span>
                </div>
                <div className="text-xs font-mono font-black text-navy-900">${stg.stageValue.toLocaleString()}</div>
                <div className="text-[10px] text-slate-500 font-medium">{stg.pct}% of total volume</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Featured AI Next Best Action Engine Recommendation */}
      {hotLeads.length > 0 && (
        <NextBestActionCard
          lead={hotLeads[0]}
          activities={activities}
          emails={[]}
          meetings={meetings}
          onOpenEmailModal={onOpenEmailModal}
          onOpenScheduleModal={onOpenScheduleModal}
        />
      )}

      {/* Hot Energy Leads Urgent Action Strip */}
      {hotLeads.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 p-5 rounded-2xl border border-amber-300/60 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-amber-500 animate-pulse" />
              <h4 className="font-extrabold text-navy-900 text-sm sm:text-base">
                Hot Energy Leads — Urgent Follow-Up Required
              </h4>
            </div>
            <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
              {hotLeads.length} Hot Actionable Leads
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {hotLeads.map((lead) => (
              <div
                key={lead.id}
                className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs hover:shadow-md transition-shadow space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h5 className="font-bold text-navy-900 text-sm hover:text-purple-700 cursor-pointer" onClick={() => onSelectLead(lead.id)}>
                        {lead.name}
                      </h5>
                      <p className="text-xs text-slate-500">{lead.company}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-mono font-black text-xs">
                      🔥 {lead.score}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 italic pt-1 border-t border-slate-100">
                    "{lead.notes || 'High budget priority lead.'}"
                  </p>
                </div>

                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
                  <button
                    onClick={() => onOpenEmailModal(lead)}
                    className="flex-1 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold flex items-center justify-center gap-1 border border-purple-200 cursor-pointer"
                    title="Send Email"
                  >
                    <Send className="h-3.5 w-3.5" /> Email
                  </button>

                  <button
                    onClick={() => onOpenScheduleModal(lead)}
                    className="flex-1 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold flex items-center justify-center gap-1 border border-teal-200 cursor-pointer"
                    title="Schedule Call"
                  >
                    <Calendar className="h-3.5 w-3.5" /> Call
                  </button>

                  <button
                    onClick={() => handleAdvanceStage(lead)}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-navy-900 border border-slate-200 cursor-pointer"
                    title="Advance Stage"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Pipeline Main Table or Kanban Board */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            {/* Header Toolbar: Title & View Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-navy-900 text-lg flex items-center gap-2">
                  Lead Energy Pipeline
                  <span className="text-xs font-normal text-slate-500 font-mono">
                    ({displayLeads.length} {selectedStage !== 'all' ? selectedStage : ''} Leads)
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Calculates warmth score, budget capacity, and Outlook interaction signals.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* View Mode Toggle Switch */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      viewMode === 'table'
                        ? 'bg-white text-navy-900 shadow-xs'
                        : 'text-slate-500 hover:text-navy-900'
                    }`}
                  >
                    <TableIcon className="h-3.5 w-3.5" /> Table
                  </button>
                  <button
                    onClick={() => setViewMode('kanban')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      viewMode === 'kanban'
                        ? 'bg-white text-navy-900 shadow-xs'
                        : 'text-slate-500 hover:text-navy-900'
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" /> Kanban Board
                  </button>
                </div>

                <button
                  onClick={onSyncAllM365}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  <Layers className="h-3.5 w-3.5" />
                  Sync M365
                </button>
              </div>
            </div>

            {/* Render View Mode */}
            {viewMode === 'table' ? (
              <LeadsTable
                leads={displayLeads}
                onStatusChange={onStatusChange}
                onDeleteLead={onDeleteLead}
                onSelectLead={onSelectLead}
                onSendEmail={onOpenEmailModal}
                onScheduleMeeting={(lead) => onOpenScheduleModal(lead)}
              />
            ) : (
              <PipelineBoard
                leads={displayLeads}
                onStatusChange={onStatusChange}
                onSelectLead={onSelectLead}
                onSendEmail={onOpenEmailModal}
                onScheduleMeeting={(lead) => onOpenScheduleModal(lead)}
              />
            )}
          </div>
        </div>

        {/* Right 1 Column: Upcoming Meetings, M365 Hub Status & Recent Activity */}
        <div className="space-y-6">
          
          {/* Upcoming Microsoft Teams Meetings Widget */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                  <Video className="h-4 w-4" />
                </div>
                <h4 className="font-bold text-navy-900 text-base">Microsoft Teams Meetings</h4>
              </div>
              <button
                onClick={() => onOpenScheduleModal()}
                className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
              >
                + Schedule
              </button>
            </div>

            <div className="space-y-3">
              {upcomingMeetings.length > 0 ? (
                upcomingMeetings.map((mtg) => (
                  <div
                    key={mtg.id}
                    className="p-3.5 rounded-xl border border-purple-100 bg-purple-50/40 hover:bg-purple-50 transition-colors space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h5 className="font-bold text-navy-900 text-xs">{mtg.title}</h5>
                        <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                          {mtg.leadName}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                        {mtg.time}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1.5 border-t border-purple-100">
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(mtg.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {mtg.teamsJoinUrl && (
                          <a
                            href={mtg.teamsJoinUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 hover:text-purple-900 bg-white px-2 py-1 rounded-md border border-purple-200 shadow-2xs"
                          >
                            Join Teams <ExternalLink className="h-3 w-3" />
                          </a>
                        )}

                        {onUpdateMeetingStatus && (
                          <button
                            onClick={() => onUpdateMeetingStatus(mtg.id, 'Completed')}
                            className="p-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 cursor-pointer"
                            title="Mark Completed"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-xs text-slate-400 py-4">No upcoming meetings scheduled.</p>
              )}
            </div>
          </div>

          {/* Microsoft 365 Integration Suite Summary */}
          <div className="bg-gradient-to-br from-navy-900 to-navy-800 text-white p-5 rounded-2xl border border-navy-700 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-gold-400" />
                <span className="font-bold text-sm text-gold-400">Microsoft 365 Integration</span>
              </div>
              <span className="text-[11px] bg-emerald-900/80 text-emerald-300 px-2.5 py-0.5 rounded-full font-mono font-bold border border-emerald-500/30">
                Connected
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-navy-200">
              <div className="flex justify-between">
                <span>Outlook Email Messages:</span>
                <span className="font-mono text-white font-bold">{m365Account.syncedEmailsCount} Synced</span>
              </div>
              <div className="flex justify-between">
                <span>Directory Contacts:</span>
                <span className="font-mono text-white font-bold">{m365Account.syncedContactsCount} Active</span>
              </div>
              <div className="flex justify-between">
                <span>Teams Calendar Events:</span>
                <span className="font-mono text-white font-bold">{m365Account.syncedEventsCount} Scheduled</span>
              </div>
            </div>

            <button
              onClick={onOpenM365Hub}
              className="w-full mt-2 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-navy-950 font-bold text-xs transition-colors shadow-sm cursor-pointer"
            >
              Open Microsoft 365 Hub
            </button>
          </div>

          {/* Recent Sales Activity Feed Widget */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-navy-900 text-base">
                Recent Sales Activity
              </h4>
              <button
                onClick={() => setIsLogActivityOpen(true)}
                className="text-xs font-bold text-navy-700 hover:text-purple-700 cursor-pointer"
              >
                + Log Note
              </button>
            </div>
            <RecentActivity activities={activities} />
          </div>

        </div>

      </div>

      {/* MODAL 1: Adjust Sales Quota Target Modal */}
      {isEditQuotaOpen && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-gold-500" />
                <h3 className="font-bold text-lg text-navy-900">Adjust Sales Quota Target</h3>
              </div>
              <button onClick={() => setIsEditQuotaOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuota} className="space-y-4">
              <div>
                <label htmlFor="dashboard-quota-input" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Target Revenue Goal ($ USD)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                  <input
                    id="dashboard-quota-input"
                    name="quotaInput"
                    type="number"
                    min="10000"
                    step="50000"
                    value={quotaInput}
                    onChange={(e) => setQuotaInput(Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 font-bold text-base text-navy-900"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Updates attainment progress bar across executive dashboards in real time.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditQuotaOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-navy-950 text-xs font-extrabold"
                >
                  Save Quota Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Quick Log Sales Activity Modal */}
      {isLogActivityOpen && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                <h3 className="font-bold text-lg text-navy-900">Log Sales Activity</h3>
              </div>
              <button onClick={() => setIsLogActivityOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveActivity} className="space-y-4">
              <div>
                <label htmlFor="log-lead-id" className="block text-xs font-bold text-slate-700 uppercase mb-1">Select Lead / Account</label>
                <select
                  id="log-lead-id"
                  name="logLeadId"
                  value={logLeadId}
                  onChange={(e) => setLogLeadId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-sm text-navy-900"
                >
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} — {l.company} (${l.budget.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="log-type" className="block text-xs font-bold text-slate-700 uppercase mb-1">Activity Type</label>
                <select
                  id="log-type"
                  name="logType"
                  value={logType}
                  onChange={(e) => setLogType(e.target.value as Activity['type'])}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-sm text-navy-900"
                >
                  <option value="note_added">📝 Internal Sales Note</option>
                  <option value="email_sent">✉️ Customer Email Sent</option>
                  <option value="meeting_scheduled">📞 Phone Call / Meeting Held</option>
                  <option value="status_changed">⚡ Stage / Status Change</option>
                </select>
              </div>

              <div>
                <label htmlFor="log-message" className="block text-xs font-bold text-slate-700 uppercase mb-1">Activity Summary / Note</label>
                <textarea
                  id="log-message"
                  name="logMessage"
                  rows={3}
                  value={logMessage}
                  onChange={(e) => setLogMessage(e.target.value)}
                  placeholder="E.g., Held 15 min discovery call regarding Microsoft 365 integration requirements..."
                  className="w-full p-3 border border-slate-300 rounded-xl font-medium text-sm text-navy-900 focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLogActivityOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold"
                >
                  Log Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
