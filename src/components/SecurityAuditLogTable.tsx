import React, { useState } from 'react';
import { ShieldCheck, Search, Download, Trash2, ShieldAlert, AlertTriangle, Info, Lock, Key, Filter, CheckCircle2 } from 'lucide-react';
import { SecurityAuditLog, UserRole } from '../types/crm';
import { authService } from '../lib/authService';

interface SecurityAuditLogTableProps {
  logs: SecurityAuditLog[];
  onClearLogs?: () => void;
}

export const SecurityAuditLogTable: React.FC<SecurityAuditLogTableProps> = ({ logs, onClearLogs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSeverity = selectedSeverity === 'all' || log.severity.toLowerCase() === selectedSeverity.toLowerCase();
    const matchesCategory = selectedCategory === 'all' || log.category.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesSeverity && matchesCategory;
  });

  const getSeverityBadge = (severity: SecurityAuditLog['severity']) => {
    switch (severity) {
      case 'Critical':
        return 'bg-red-950/90 text-red-300 border-red-500/50';
      case 'High':
        return 'bg-amber-950/90 text-amber-300 border-amber-500/50';
      case 'Medium':
        return 'bg-yellow-950/90 text-yellow-300 border-yellow-500/50';
      case 'Low':
        return 'bg-blue-950/90 text-blue-300 border-blue-500/50';
      default:
        return 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50';
    }
  };

  const handleExportLogsCSV = () => {
    const headers = ['Timestamp', 'Severity', 'Category', 'Action', 'User Email', 'Role', 'IP Address', 'Details'];
    const rows = filteredLogs.map((l) => [
      l.timestamp,
      l.severity,
      l.category,
      `"${l.action.replace(/"/g, '""')}"`,
      l.userEmail,
      l.userRole,
      l.ipAddress,
      `"${(l.details || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `spihead_security_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5 md:p-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-navy-950 text-gold-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-navy-900 text-base flex items-center gap-2">
              Security Audit Trail & Compliance Log
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-navy-100 text-navy-800">
                {logs.length} Events Logged
              </span>
            </h3>
            <p className="text-xs text-slate-500">Real-time immutable logging for user actions, M365 tokens, and data access</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportLogsCSV}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" /> Export Audit CSV
          </button>

          {onClearLogs && (
            <button
              onClick={onClearLogs}
              className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear Logs
            </button>
          )}
        </div>
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search action, email, or IP..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-gold-500 focus:outline-none"
          />
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        {/* Severity Filter */}
        <div>
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-gold-500 focus:outline-none bg-white"
          >
            <option value="all">All Severity Levels</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="info">Info</option>
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-gold-500 focus:outline-none bg-white"
          >
            <option value="all">All Event Categories</option>
            <option value="authentication">Authentication</option>
            <option value="m365 oauth">M365 OAuth</option>
            <option value="data access">Data Access</option>
            <option value="system config">System Config</option>
            <option value="security alert">Security Alert</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase text-slate-600 tracking-wider">
            <tr>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Severity</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Action Event</th>
              <th className="py-3 px-4">User & Role</th>
              <th className="py-3 px-4">IP Address</th>
              <th className="py-3 px-4">Technical Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No security audit events match the selected criteria.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${getSeverityBadge(log.severity)}`}>
                      {log.severity}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-navy-900">{log.category}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{log.action}</td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{log.userEmail}</div>
                    <span className="text-[10px] text-slate-500 font-mono">[{log.userRole}]</span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">{log.ipAddress}</td>
                  <td className="py-3 px-4 text-slate-600 text-[11px] max-w-xs truncate" title={log.details}>
                    {log.details || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
