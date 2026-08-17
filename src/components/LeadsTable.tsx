import React, { useState, useMemo } from 'react';
import { Lead, LeadStatus } from '../types/crm';
import { LeadEnergyGauge } from './LeadEnergyGauge';
import { m365Service } from '../lib/m365Service';
import { 
  Building2, 
  Mail, 
  Calendar, 
  MoreHorizontal, 
  Trash2, 
  ArrowUpDown, 
  Layers, 
  CheckCircle2, 
  Send, 
  Eye, 
  Plus, 
  Search,
  Filter,
  Flame,
  Clock,
  Download,
  CheckSquare,
  Square,
  Edit2
} from 'lucide-react';

interface LeadsTableProps {
  leads: Lead[];
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
  onDeleteLead: (leadId: string) => void;
  onSelectLead: (leadId: string) => void;
  onSendEmail: (lead: Lead) => void;
  onScheduleMeeting: (lead: Lead) => void;
}

export const LeadsTable: React.FC<LeadsTableProps> = ({
  leads,
  onStatusChange,
  onDeleteLead,
  onSelectLead,
  onSendEmail,
  onScheduleMeeting,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [industryFilter, setIndustryFilter] = useState<string>('all');
  const [energyFilter, setEnergyFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<keyof Lead>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Bulk selection state
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  const statuses: LeadStatus[] = ['New', 'Contacted', 'Qualified', 'Proposal', 'Closed'];

  // Extract unique industries for filter dropdown
  const industries = useMemo(() => {
    const list = Array.from(new Set(leads.map((l) => l.industry).filter(Boolean)));
    return list.sort();
  }, [leads]);

  const getStatusBadge = (status: LeadStatus) => {
    switch (status) {
      case 'New':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Contacted':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Qualified':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'Proposal':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Closed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
    }
  };

  const handleSort = (field: keyof Lead) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredLeads = useMemo(() => {
    return leads
      .filter((lead) => {
        // Search Filter
        const matchesSearch =
          lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (lead.industry || '').toLowerCase().includes(searchTerm.toLowerCase());

        // Status Filter
        const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;

        // Industry Filter
        const matchesIndustry = industryFilter === 'all' || lead.industry === industryFilter;

        // Energy Warmth Filter
        let matchesEnergy = true;
        if (energyFilter === 'high') matchesEnergy = lead.score >= 80;
        if (energyFilter === 'medium') matchesEnergy = lead.score >= 50 && lead.score < 80;
        if (energyFilter === 'low') matchesEnergy = lead.score < 50;

        return matchesSearch && matchesStatus && matchesIndustry && matchesEnergy;
      })
      .sort((a, b) => {
        const valA = a[sortField] ?? '';
        const valB = b[sortField] ?? '';
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [leads, searchTerm, statusFilter, industryFilter, energyFilter, sortField, sortOrder]);

  // Bulk Selection Handlers
  const handleSelectAll = () => {
    if (selectedLeadIds.length === filteredLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map((l) => l.id));
    }
  };

  const handleToggleSelectRow = (leadId: string) => {
    if (selectedLeadIds.includes(leadId)) {
      setSelectedLeadIds((prev) => prev.filter((id) => id !== leadId));
    } else {
      setSelectedLeadIds((prev) => [...prev, leadId]);
    }
  };

  // Bulk Status Change
  const handleBulkStatusChange = (newStatus: LeadStatus) => {
    selectedLeadIds.forEach((id) => onStatusChange(id, newStatus));
    setSelectedLeadIds([]);
  };

  // Bulk Delete
  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedLeadIds.length} lead(s)?`)) {
      selectedLeadIds.forEach((id) => onDeleteLead(id));
      setSelectedLeadIds([]);
    }
  };

  // Bulk Export CSV
  const handleBulkExport = () => {
    const selectedLeads = leads.filter((l) => selectedLeadIds.includes(l.id));
    m365Service.exportToExcelCSV(selectedLeads.length > 0 ? selectedLeads : filteredLeads);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Controls Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <label htmlFor="leads-search-input" className="sr-only">Search leads</label>
            <input
              id="leads-search-input"
              name="searchTerm"
              aria-label="Search leads by name, company, email, or industry"
              type="text"
              placeholder="Search leads by name, company, email, or industry..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Status Filter */}
            <label htmlFor="leads-status-filter" className="sr-only">Filter by stage status</label>
            <select
              id="leads-status-filter"
              name="statusFilter"
              aria-label="Filter by stage status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-bold text-navy-900 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="all">All Stages ({leads.length})</option>
              {statuses.map((st) => (
                <option key={st} value={st}>
                  {st} ({leads.filter((l) => l.status === st).length})
                </option>
              ))}
            </select>

            {/* Industry Filter */}
            {industries.length > 0 && (
              <>
                <label htmlFor="leads-industry-filter" className="sr-only">Filter by industry</label>
                <select
                  id="leads-industry-filter"
                  name="industryFilter"
                  aria-label="Filter by industry"
                  value={industryFilter}
                  onChange={(e) => setIndustryFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-bold text-navy-900 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                >
                  <option value="all">All Industries</option>
                  {industries.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </>
            )}

            {/* AI Energy Score Filter */}
            <label htmlFor="leads-energy-filter" className="sr-only">Filter by energy score</label>
            <select
              id="leads-energy-filter"
              name="energyFilter"
              aria-label="Filter by energy score"
              value={energyFilter}
              onChange={(e) => setEnergyFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-bold text-navy-900 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="all">All Energy Scores</option>
              <option value="high">🟢 High Energy (80%+)</option>
              <option value="medium">🟡 Medium Energy (50-79%)</option>
              <option value="low">🔴 Low Energy (&lt;50%)</option>
            </select>
          </div>
        </div>

        {/* Bulk Action Bar (Visible when rows are selected) */}
        {selectedLeadIds.length > 0 && (
          <div className="bg-purple-950 text-white p-3 rounded-xl border border-purple-800 flex flex-wrap items-center justify-between gap-3 animate-fadeIn text-xs">
            <div className="flex items-center gap-2 font-extrabold text-gold-400">
              <CheckSquare className="h-4 w-4" />
              <span>{selectedLeadIds.length} lead(s) selected</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-300 font-semibold">Bulk Move:</span>
              {statuses.map((st) => (
                <button
                  key={st}
                  onClick={() => handleBulkStatusChange(st)}
                  className="px-2.5 py-1 rounded bg-purple-900 hover:bg-purple-800 text-white font-bold border border-purple-700 cursor-pointer"
                >
                  {st}
                </button>
              ))}

              <button
                onClick={handleBulkExport}
                className="px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold flex items-center gap-1 cursor-pointer ml-2"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </button>

              <button
                onClick={handleBulkDelete}
                className="px-3 py-1 rounded bg-red-700 hover:bg-red-600 text-white font-bold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Leads Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
              <tr>
                <th className="py-3.5 px-4 w-10 text-center">
                  <label htmlFor="select-all-leads-checkbox" className="sr-only">Select all leads</label>
                  <input
                    id="select-all-leads-checkbox"
                    name="selectAllLeads"
                    aria-label="Select all leads"
                    type="checkbox"
                    checked={
                      filteredLeads.length > 0 && selectedLeadIds.length === filteredLeads.length
                    }
                    onChange={handleSelectAll}
                    className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4 cursor-pointer"
                  />
                </th>
                <th
                  className="py-3.5 px-4 cursor-pointer hover:text-navy-900"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Lead Name <ArrowUpDown className="h-3 w-3 inline text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Company & Industry</th>
                <th
                  className="py-3.5 px-4 cursor-pointer hover:text-navy-900"
                  onClick={() => handleSort('budget')}
                >
                  <div className="flex items-center gap-1">
                    Budget ($) <ArrowUpDown className="h-3 w-3 inline text-slate-400" />
                  </div>
                </th>
                <th
                  className="py-3.5 px-4 cursor-pointer hover:text-navy-900"
                  onClick={() => handleSort('score')}
                >
                  <div className="flex items-center gap-1">
                    AI Energy Score <ArrowUpDown className="h-3 w-3 inline text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Status Stage</th>
                <th className="py-3.5 px-4">M365 Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => {
                  const isSelected = selectedLeadIds.includes(lead.id);

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => onSelectLead(lead.id)}
                      className={`hover:bg-purple-50/40 transition-colors cursor-pointer group ${
                        isSelected ? 'bg-purple-50/80 font-medium' : ''
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <label htmlFor={`select-lead-${lead.id}`} className="sr-only">Select lead {lead.name}</label>
                        <input
                          id={`select-lead-${lead.id}`}
                          name={`selectLead-${lead.id}`}
                          aria-label={`Select lead ${lead.name}`}
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(lead.id)}
                          className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4 cursor-pointer"
                        />
                      </td>

                      {/* Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-navy-900 group-hover:text-purple-900 transition-colors">
                          {lead.name}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Mail className="h-3 w-3 text-slate-400" />
                          {lead.email}
                        </div>
                      </td>

                      {/* Company & Industry */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          {lead.company}
                        </div>
                        {lead.industry && (
                          <span className="text-[11px] text-purple-700 font-semibold block mt-0.5">
                            {lead.industry}
                          </span>
                        )}
                      </td>

                      {/* Budget */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        ${lead.budget.toLocaleString()}
                      </td>

                      {/* AI Energy Score */}
                      <td className="py-3.5 px-4">
                        <LeadEnergyGauge score={lead.score} size="sm" />
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(
                            lead.status
                          )}`}
                        >
                          {lead.status}
                        </span>
                      </td>

                      {/* M365 Sync Badge */}
                      <td className="py-3.5 px-4">
                        {lead.m365Synced ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            M365 Synced
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
                            Local Only
                          </span>
                        )}
                      </td>

                      {/* Actions dropdown & buttons */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onSendEmail(lead)}
                            title="Send M365 Outlook Email"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-navy-900 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onScheduleMeeting(lead)}
                            title="Schedule M365 Teams Meeting"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer"
                          >
                            <Calendar className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onSelectLead(lead.id)}
                            title="View Lead Details"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-gold-600 hover:bg-amber-50 transition-colors cursor-pointer"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <div className="relative inline-block text-left">
                            <button
                              onClick={() =>
                                setActiveMenuId(activeMenuId === lead.id ? null : lead.id)
                              }
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>

                            {activeMenuId === lead.id && (
                              <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-xl shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-slate-100 z-30 p-1">
                                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase">
                                  Change Status
                                </div>
                                <div className="py-1">
                                  {statuses.map((st) => (
                                    <button
                                      key={st}
                                      onClick={() => {
                                        onStatusChange(lead.id, st);
                                        setActiveMenuId(null);
                                      }}
                                      className={`w-full text-left px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer ${
                                        lead.status === st
                                          ? 'bg-navy-900 text-gold-400 font-bold'
                                          : 'hover:bg-slate-100 text-slate-700'
                                      }`}
                                    >
                                      Mark as {st}
                                    </button>
                                  ))}
                                </div>
                                <div className="py-1">
                                  <button
                                    onClick={() => {
                                      onDeleteLead(lead.id);
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-md flex items-center gap-2 cursor-pointer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete Lead
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="max-w-xs mx-auto space-y-2">
                      <p className="font-semibold text-slate-700">No leads match your filter</p>
                      <p className="text-xs">Try resetting search parameters or adding a new lead.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

