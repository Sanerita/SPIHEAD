import React, { useState } from 'react';
import { Lead, LeadStatus } from '../types/crm';
import { LeadEnergyGauge } from './LeadEnergyGauge';
import confetti from 'canvas-confetti';
import { 
  Building2, 
  Mail, 
  Calendar, 
  DollarSign, 
  Send, 
  Eye, 
  Flame, 
  Layers, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  GripVertical
} from 'lucide-react';

interface PipelineBoardProps {
  leads: Lead[];
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
  onSelectLead: (leadId: string) => void;
  onSendEmail: (lead: Lead) => void;
  onScheduleMeeting: (lead: Lead) => void;
}

export const PipelineBoard: React.FC<PipelineBoardProps> = ({
  leads,
  onStatusChange,
  onSelectLead,
  onSendEmail,
  onScheduleMeeting,
}) => {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [activeDragOverCol, setActiveDragOverCol] = useState<LeadStatus | null>(null);

  const columns: { id: LeadStatus; label: string; bgHeader: string; borderHeader: string }[] = [
    { id: 'New', label: 'New Leads', bgHeader: 'bg-blue-50/80 text-blue-900', borderHeader: 'border-blue-200' },
    { id: 'Contacted', label: 'Contacted', bgHeader: 'bg-amber-50/80 text-amber-900', borderHeader: 'border-amber-200' },
    { id: 'Qualified', label: 'Qualified', bgHeader: 'bg-teal-50/80 text-teal-900', borderHeader: 'border-teal-200' },
    { id: 'Proposal', label: 'Proposal Sent', bgHeader: 'bg-purple-50/80 text-purple-900', borderHeader: 'border-purple-200' },
    { id: 'Closed', label: 'Closed Won 🎉', bgHeader: 'bg-emerald-50/80 text-emerald-900', borderHeader: 'border-emerald-300' },
  ];

  const handleAdvanceStatus = (lead: Lead, direction: 'next' | 'prev') => {
    const statuses: LeadStatus[] = ['New', 'Contacted', 'Qualified', 'Proposal', 'Closed'];
    const currIdx = statuses.indexOf(lead.status);
    const targetIdx = direction === 'next' ? currIdx + 1 : currIdx - 1;

    if (targetIdx >= 0 && targetIdx < statuses.length) {
      const nextStatus = statuses[targetIdx];
      onStatusChange(lead.id, nextStatus);

      if (nextStatus === 'Closed') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedLeadId(leadId);
  };

  const handleDragEnd = () => {
    setDraggedLeadId(null);
    setActiveDragOverCol(null);
  };

  const handleDragOver = (e: React.DragEvent, colId: LeadStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (activeDragOverCol !== colId) {
      setActiveDragOverCol(colId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, colId: LeadStatus) => {
    e.preventDefault();
    if (activeDragOverCol === colId) {
      setActiveDragOverCol(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetStatus: LeadStatus) => {
    e.preventDefault();
    setActiveDragOverCol(null);
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (leadId) {
      const targetLead = leads.find((l) => l.id === leadId);
      if (targetLead && targetLead.status !== targetStatus) {
        onStatusChange(leadId, targetStatus);
        if (targetStatus === 'Closed') {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
          });
        }
      }
    }
    setDraggedLeadId(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start overflow-x-auto pb-4">
      {columns.map((col) => {
        const columnLeads = leads.filter((l) => l.status === col.id);
        const columnTotalValue = columnLeads.reduce((sum, l) => sum + (l.budget || 0), 0);
        const isColumnDragOver = activeDragOverCol === col.id;

        return (
          <div
            key={col.id}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={(e) => handleDragLeave(e, col.id)}
            onDrop={(e) => handleDrop(e, col.id)}
            className={`rounded-xl p-3 min-w-[260px] flex flex-col space-y-3 transition-all duration-200 border ${
              isColumnDragOver
                ? 'bg-purple-100/90 border-purple-500 ring-2 ring-purple-400 shadow-md'
                : 'bg-slate-100/80 border-slate-200/80'
            }`}
          >
            {/* Column Header */}
            <div className={`p-3 rounded-lg border ${col.bgHeader} ${col.borderHeader} flex flex-col space-y-1`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm tracking-tight">{col.label}</span>
                <span className="bg-white/80 px-2 py-0.5 rounded-full text-xs font-extrabold shadow-xs">
                  {columnLeads.length}
                </span>
              </div>
              <div className="text-xs font-mono text-slate-600 font-semibold">
                ${columnTotalValue.toLocaleString()} pipeline
              </div>
            </div>

            {/* Lead Cards List */}
            <div className="space-y-3 min-h-[420px]">
              {columnLeads.length > 0 ? (
                columnLeads.map((lead) => {
                  const isBeingDragged = draggedLeadId === lead.id;

                  return (
                    <div
                      key={lead.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onSelectLead(lead.id)}
                      className={`bg-white p-4 rounded-xl border shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing space-y-3 group hover:border-purple-400 ${
                        isBeingDragged ? 'opacity-40 scale-95 border-purple-500' : 'border-slate-200'
                      }`}
                    >
                      {/* Header: Name, Drag Indicator & Company */}
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <GripVertical className="h-3.5 w-3.5 text-slate-300 group-hover:text-purple-500 cursor-grab" />
                            <h4 className="font-bold text-navy-900 group-hover:text-purple-900 transition-colors text-sm">
                              {lead.name}
                            </h4>
                          </div>
                          {lead.m365Synced && (
                            <span title="Synced with M365 Outlook" className="text-emerald-600">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-1 pl-5">
                          <Building2 className="h-3 w-3 text-slate-400" />
                          {lead.company}
                        </p>
                      </div>

                      {/* Industry Tag if present */}
                      {lead.industry && (
                        <div className="pl-5">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold inline-block border border-slate-200">
                            {lead.industry}
                          </span>
                        </div>
                      )}

                      {/* Budget & AI Energy Score */}
                      <div className="flex items-center justify-between border-t border-b border-slate-100 py-2">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                            Budget
                          </span>
                          <span className="font-mono font-bold text-xs text-navy-900">
                            ${lead.budget.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                            Energy Warmth
                          </span>
                          <LeadEnergyGauge score={lead.score} size="sm" />
                        </div>
                      </div>

                      {/* Actions & Stage Navigation */}
                      <div className="flex items-center justify-between text-xs pt-1" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onSendEmail(lead)}
                            title="Send M365 Outlook Email"
                            className="p-1 rounded text-slate-500 hover:text-navy-900 hover:bg-slate-100 cursor-pointer"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => onScheduleMeeting(lead)}
                            title="Schedule Teams Meeting"
                            className="p-1 rounded text-slate-500 hover:text-purple-700 hover:bg-purple-50 cursor-pointer"
                          >
                            <Calendar className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => onSelectLead(lead.id)}
                            title="View Lead Profile"
                            className="p-1 rounded text-slate-500 hover:text-gold-600 hover:bg-amber-50 cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Stage Advancement Controls */}
                        <div className="flex items-center gap-1">
                          {lead.status !== 'New' && (
                            <button
                              onClick={() => handleAdvanceStatus(lead, 'prev')}
                              title="Move Back"
                              className="p-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {lead.status !== 'Closed' && (
                            <button
                              onClick={() => handleAdvanceStatus(lead, 'next')}
                              title="Move Forward"
                              className="p-1 rounded bg-navy-900 text-gold-400 hover:bg-navy-800 font-bold cursor-pointer"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-32 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-xs text-slate-400 font-medium">
                  {isColumnDragOver ? 'Drop lead here!' : `No leads in ${col.label}`}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

