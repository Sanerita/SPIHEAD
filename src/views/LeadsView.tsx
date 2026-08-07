import React, { useState, useMemo } from 'react';
import { Lead, LeadStatus } from '../types/crm';
import { PipelineBoard } from '../components/PipelineBoard';
import { LeadsTable } from '../components/LeadsTable';
import { m365Service } from '../lib/m365Service';
import { 
  Plus, 
  Calendar, 
  Layers, 
  Download, 
  Kanban, 
  Table as TableIcon, 
  BatteryFull, 
  Flame, 
  Search,
  Zap,
  DollarSign,
  TrendingUp,
  Target,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

interface LeadsViewProps {
  leads: Lead[];
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
  onDeleteLead: (leadId: string) => void;
  onSelectLead: (leadId: string) => void;
  onOpenAddModal: () => void;
  onOpenScheduleModal: (lead?: Lead) => void;
  onOpenEmailModal: (lead: Lead) => void;
  onSyncAllM365: () => void;
}

export const LeadsView: React.FC<LeadsViewProps> = ({
  leads,
  onStatusChange,
  onDeleteLead,
  onSelectLead,
  onOpenAddModal,
  onOpenScheduleModal,
  onOpenEmailModal,
  onSyncAllM365,
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  // Pipeline Metric Calculations
  const metrics = useMemo(() => {
    const totalPipelineValue = leads.reduce((sum, l) => sum + (l.budget || 0), 0);
    const closedWonLeads = leads.filter((l) => l.status === 'Closed');
    const closedWonValue = closedWonLeads.reduce((sum, l) => sum + (l.budget || 0), 0);
    const winRate = leads.length > 0 ? Math.round((closedWonLeads.length / leads.length) * 100) : 0;
    const avgEnergyScore = leads.length > 0 ? Math.round(leads.reduce((sum, l) => sum + l.score, 0) / leads.length) : 0;
    const highEnergyCount = leads.filter((l) => l.score >= 80).length;

    return {
      totalPipelineValue,
      closedWonValue,
      winRate,
      avgEnergyScore,
      highEnergyCount,
    };
  }, [leads]);

  return (
    <div className="space-y-6">
      
      {/* Top Header & Quick Action Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-navy-900 tracking-tight flex items-center gap-2">
            Lead Pipeline & Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track lead warmth, energy scores, and pipeline progression integrated in real-time with Microsoft 365.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Toggle */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-navy-900 text-gold-400 shadow-xs'
                  : 'text-slate-600 hover:text-navy-900'
              }`}
            >
              <Kanban className="h-4 w-4" />
              Kanban Board
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-navy-900 text-gold-400 shadow-xs'
                  : 'text-slate-600 hover:text-navy-900'
              }`}
            >
              <TableIcon className="h-4 w-4" />
              Data Table
            </button>
          </div>

          <button
            onClick={onSyncAllM365}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-900 font-extrabold text-xs transition-colors cursor-pointer shadow-2xs"
          >
            <RefreshCw className="h-4 w-4 text-purple-700" />
            Sync M365
          </button>

          <button
            onClick={() => m365Service.exportToExcelCSV(leads)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            Excel Export
          </button>

          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-navy-950 font-black text-xs shadow-sm transition-transform active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Lead
          </button>
        </div>
      </div>

      {/* PIPELINE METRICS KPI OVERVIEW CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1: Total Pipeline Value */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-extrabold uppercase tracking-wider">
            <span>Total Pipeline Value</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-navy-900 font-mono">
            ${metrics.totalPipelineValue.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Across {leads.length} active opportunities
          </p>
        </div>

        {/* Metric 2: Closed Won Value */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-extrabold uppercase tracking-wider">
            <span>Closed Won Revenue</span>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-900 font-mono">
            ${metrics.closedWonValue.toLocaleString()}
          </div>
          <p className="text-[11px] text-emerald-700 font-bold">
            {metrics.winRate}% Conversion Win Rate
          </p>
        </div>

        {/* Metric 3: Avg AI Energy Score */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-extrabold uppercase tracking-wider">
            <span>Avg Lead Warmth</span>
            <BatteryFull className="h-4 w-4 text-gold-500" />
          </div>
          <div className="text-2xl font-black text-navy-900 flex items-center gap-1.5">
            <span>{metrics.avgEnergyScore}%</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
              AI Scored
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Calculated via response velocity
          </p>
        </div>

        {/* Metric 4: High Energy Leads */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-extrabold uppercase tracking-wider">
            <span>Hot Leads (80%+)</span>
            <Flame className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 font-mono">
            {metrics.highEnergyCount}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Ready for immediate closing
          </p>
        </div>
      </div>

      {/* Energy Warmth Legend Banner */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <BatteryFull className="h-4 w-4 text-emerald-600" />
          <span className="font-bold text-navy-900">AI Lead Energy Score Legend:</span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="font-semibold text-slate-700">High Energy (80-100%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span className="font-semibold text-slate-700">Medium Energy (50-79%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span className="font-semibold text-slate-700">Low Energy (0-49%)</span>
          </div>
        </div>

        <button
          onClick={onSyncAllM365}
          className="text-xs font-bold text-navy-900 hover:text-purple-700 underline flex items-center gap-1 cursor-pointer"
        >
          <Layers className="h-3.5 w-3.5 text-emerald-600 inline" />
          Sync All to Microsoft 365
        </button>
      </div>

      {/* View Content */}
      {viewMode === 'kanban' ? (
        <PipelineBoard
          leads={leads}
          onStatusChange={onStatusChange}
          onSelectLead={onSelectLead}
          onSendEmail={onOpenEmailModal}
          onScheduleMeeting={(lead) => onOpenScheduleModal(lead)}
        />
      ) : (
        <LeadsTable
          leads={leads}
          onStatusChange={onStatusChange}
          onDeleteLead={onDeleteLead}
          onSelectLead={onSelectLead}
          onSendEmail={onOpenEmailModal}
          onScheduleMeeting={(lead) => onOpenScheduleModal(lead)}
        />
      )}

    </div>
  );
};

