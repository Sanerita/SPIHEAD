import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  ShieldCheck, 
  Trophy, 
  Target, 
  Layers, 
  Edit3, 
  Save, 
  CheckCircle2, 
  Lock, 
  Key, 
  RefreshCw, 
  Download, 
  Globe, 
  DollarSign, 
  Briefcase, 
  FileText, 
  Check, 
  AlertCircle, 
  X,
  PieChart,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import { M365Account, Lead, Meeting } from '../types/crm';
import { m365Service } from '../lib/m365Service';

interface ProfileViewProps {
  account: M365Account;
  leads?: Lead[];
  meetings?: Meeting[];
  onAccountUpdate?: (updated: M365Account) => void;
  onSyncM365?: () => void;
  showToast?: (message: string, type?: 'success' | 'info') => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  account,
  leads = [],
  meetings = [],
  onAccountUpdate,
  onSyncM365,
  showToast,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'security' | 'm365'>('overview');

  // Form state
  const [displayName, setDisplayName] = useState(account.displayName || 'Sanelisiwe Sileku');
  const [email, setEmail] = useState(account.email || 'sanelisiwe.sileku@gmail.com');
  const [userPrincipalName, setUserPrincipalName] = useState(
    account.userPrincipalName || 'sanelisiwe.sileku@spihead.onmicrosoft.com'
  );
  const [jobTitle, setJobTitle] = useState(account.jobTitle || 'Senior Enterprise Executive');
  const [companyName, setCompanyName] = useState(account.companyName || 'SPIHEAD Enterprise');
  const [department, setDepartment] = useState(account.department || 'Global Sales Operations');
  const [phoneNumber, setPhoneNumber] = useState(account.phoneNumber || '+1 (555) 019-2831');
  const [salesTarget, setSalesTarget] = useState<number>(account.salesTarget || 500000);
  const [currency, setCurrency] = useState(account.currency || 'USD');
  const [territory, setTerritory] = useState(account.territory || 'Global Enterprise');
  const [bio, setBio] = useState(
    account.bio ||
      'Enterprise Account Executive managing key client relationships, cloud migration strategy, and Microsoft 365 ecosystem integrations.'
  );

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Get user initials
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'SS';

  // Live Performance Calculations based on actual leads data
  const totalLeadsCount = leads.length;
  const closedLeads = leads.filter((l) => l.status === 'Closed');
  const closedRevenue = closedLeads.reduce((sum, l) => sum + (l.budget || 0), 0);
  const activePipelineValue = leads
    .filter((l) => l.status !== 'Closed')
    .reduce((sum, l) => sum + (l.budget || 0), 0);
  const targetNumber = Number(salesTarget) || 500000;
  const quotaPercentage = Math.min(100, Math.round((closedRevenue / targetNumber) * 100));
  const winRate = totalLeadsCount > 0 ? Math.round((closedLeads.length / totalLeadsCount) * 100) : 0;
  const avgDealSize =
    closedLeads.length > 0 ? Math.round(closedRevenue / closedLeads.length) : 0;

  // Handle Save Profile Form
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedAccount: M365Account = {
      ...account,
      displayName,
      email,
      userPrincipalName,
      jobTitle,
      companyName,
      department,
      phoneNumber,
      salesTarget: Number(salesTarget),
      currency,
      territory,
      bio,
    };

    m365Service.saveAccount(updatedAccount);
    if (onAccountUpdate) onAccountUpdate(updatedAccount);
    setIsEditing(false);
    if (showToast) showToast('Profile details updated successfully!');
  };

  // Handle Password Update
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    // Simulate password change success
    setPasswordSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    if (showToast) showToast('Security password updated successfully!');
  };

  // Export User Profile & Sales Data to Excel (.csv)
  const handleExportExcel = () => {
    const csvRows = [
      ['SPIHEAD EXECUTIVE PROFILE & PERFORMANCE SUMMARY'],
      ['Generated At', new Date().toLocaleString()],
      [],
      ['USER & ORGANIZATIONAL DETAILS'],
      ['Display Name', displayName],
      ['Email', email],
      ['User Principal Name', userPrincipalName],
      ['Job Title', jobTitle],
      ['Company', companyName],
      ['Department', department],
      ['Phone', phoneNumber],
      ['Territory', territory],
      ['Bio', bio.replace(/\n/g, ' ')],
      [],
      ['QUARTERLY PERFORMANCE & METRICS'],
      ['Quarterly Target ($)', targetNumber],
      ['Closed Won Revenue ($)', closedRevenue],
      ['Active Pipeline Value ($)', activePipelineValue],
      ['Quota Achievement (%)', `${quotaPercentage}%`],
      ['Total Opportunities Handled', totalLeadsCount],
      ['Closed Won Deals', closedLeads.length],
      ['Win Rate (%)', `${winRate}%`],
      ['Average Deal Size ($)', avgDealSize],
      [],
      ['MICROSOFT 365 TENANT STATUS'],
      ['Tenant Name', account.tenantName],
      ['Tenant ID', account.tenantId],
      ['Subscription', account.subscriptionType],
      ['Connection Status', account.isConnected ? 'Connected' : 'Offline'],
      ['Last Synced', account.lastSyncedAt ? new Date(account.lastSyncedAt).toLocaleString() : 'Never'],
      [],
      ['PIPELINE LEADS BREAKDOWN'],
      ['Lead Name', 'Company', 'Status', 'Budget ($)', 'Score', 'Owner Email'],
      ...leads.map((l) => [
        `"${l.name.replace(/"/g, '""')}"`,
        `"${l.company.replace(/"/g, '""')}"`,
        l.status,
        l.budget || 0,
        l.score || 0,
        l.email,
      ]),
    ];

    const csvContent = csvRows.map((e) => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Executive_Summary_${displayName.replace(/\s+/g, '_')}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (showToast) showToast('Exported executive summary to Excel (.csv)');
  };

  // Export User Profile & Sales Data to Printable PDF Report
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      if (showToast) showToast('Please allow popups to open PDF export', 'info');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Executive Profile Summary - ${displayName}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; color: #0F172A; line-height: 1.5; }
            .header { border-bottom: 2px solid #D97706; padding-bottom: 15px; margin-bottom: 25px; }
            .title { font-size: 24px; font-weight: 800; color: #0F172A; margin: 0; }
            .subtitle { font-size: 13px; color: #475569; margin-top: 4px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
            .card { border: 1px solid #E2E8F0; padding: 15px; border-radius: 10px; background: #F8FAFC; }
            .card h3 { margin-top: 0; font-size: 12px; color: #B45309; text-transform: uppercase; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px; }
            .metric-big { font-size: 26px; font-weight: 800; color: #0F172A; font-family: monospace; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
            th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #E2E8F0; }
            th { background: #0F172A; color: #F59E0B; font-weight: 700; }
            .footer { margin-top: 40px; font-size: 10px; color: #94A3B8; text-align: center; border-top: 1px solid #E2E8F0; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${displayName}</div>
            <div class="subtitle">${jobTitle} • ${companyName} (${department})</div>
            <div class="subtitle">Email: ${email} | Phone: ${phoneNumber} | Territory: ${territory}</div>
          </div>

          <div class="grid">
            <div class="card">
              <h3>Quarterly Sales Quota</h3>
              <div class="metric-big">$${closedRevenue.toLocaleString()} / $${targetNumber.toLocaleString()}</div>
              <p style="margin: 5px 0 0 0; font-size: 12px;">Quota Progress: <strong>${quotaPercentage}% Achieved</strong></p>
            </div>

            <div class="card">
              <h3>Sales Performance</h3>
              <div class="metric-big">${winRate}% Win Rate</div>
              <p style="margin: 5px 0 0 0; font-size: 12px;">Closed Won Deals: <strong>${closedLeads.length}</strong> | Avg Deal: <strong>$${avgDealSize.toLocaleString()}</strong></p>
            </div>
          </div>

          <div class="card" style="margin-bottom: 25px;">
            <h3>Executive Bio</h3>
            <p style="margin: 0; font-size: 12px; color: #334155;">${bio}</p>
          </div>

          <div class="card" style="margin-bottom: 25px;">
            <h3>Microsoft 365 Connected Tenant</h3>
            <p style="margin: 0; font-size: 12px;">
              <strong>Tenant Name:</strong> ${account.tenantName} | 
              <strong>Subscription:</strong> ${account.subscriptionType} | 
              <strong>Status:</strong> ${account.isConnected ? 'Connected' : 'Offline'}
            </p>
          </div>

          <h3>Active Pipeline Overview (${leads.length} Leads)</h3>
          <table>
            <thead>
              <tr>
                <th>Lead Name</th>
                <th>Company</th>
                <th>Status</th>
                <th>Budget</th>
                <th>Energy Score</th>
              </tr>
            </thead>
            <tbody>
              ${leads
                .map(
                  (l) => `
                <tr>
                  <td><strong>${l.name}</strong></td>
                  <td>${l.company}</td>
                  <td>${l.status}</td>
                  <td>$${(l.budget || 0).toLocaleString()}</td>
                  <td>${l.score || 0}/100</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>

          <div class="footer">
            SPIHEAD Executive CRM Report • Generated on ${new Date().toLocaleString()}
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    if (showToast) showToast('Opened PDF print preview dialog');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      
      {/* Top Banner & Header Profile Card */}
      <div className="bg-navy-900 text-white rounded-2xl border border-navy-700 shadow-lg overflow-hidden relative">
        <div className="h-28 bg-gradient-to-r from-navy-950 via-navy-900 to-navy-800 p-6 flex justify-end items-start border-b border-navy-800/80">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-3.5 py-1.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-navy-950 font-extrabold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Edit3 className="h-3.5 w-3.5" />
              {isEditing ? 'Cancel Edit' : 'Edit Profile'}
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 rounded-xl bg-navy-800 hover:bg-navy-700 text-emerald-400 border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5 transition-colors"
              title="Export Executive Summary to Microsoft Excel (.csv)"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
              Excel (.csv)
            </button>

            <button
              onClick={handleExportPDF}
              className="px-3.5 py-1.5 rounded-xl bg-navy-800 hover:bg-navy-700 text-gold-300 border border-gold-500/30 font-bold text-xs flex items-center gap-1.5 transition-colors"
              title="Export or Print PDF Executive Report"
            >
              <Printer className="h-3.5 w-3.5 text-gold-400" />
              PDF Report
            </button>
          </div>
        </div>

        <div className="px-6 pb-6 pt-0 relative flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-10">
          {/* Avatar Initials */}
          <div className="h-24 w-24 rounded-2xl bg-gold-500 text-navy-950 flex items-center justify-center font-extrabold text-3xl shadow-xl border-4 border-navy-900 shrink-0">
            {initials}
          </div>

          <div className="space-y-1 text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <h1 className="text-2xl font-black text-gold-400 tracking-tight">{displayName}</h1>
              <span className="px-3 py-0.5 rounded-full text-xs font-extrabold bg-navy-800 text-gold-300 border border-gold-400/30 shadow-xs">
                {jobTitle}
              </span>
            </div>

            <p className="text-xs text-navy-200 font-mono tracking-wide">{userPrincipalName}</p>

            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-navy-300">
              <span className="flex items-center gap-1.5">
                <Building className="h-4 w-4 text-gold-400" /> {companyName} • {department}
              </span>
              <span className="flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-blue-400" /> {territory}
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" /> {account.subscriptionType}
              </span>
            </div>
          </div>
        </div>

        {/* View Tabs Bar */}
        <div className="bg-navy-950 px-6 py-2.5 border-t border-navy-800 flex items-center gap-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-navy-800 text-gold-400 border border-gold-400/30'
                : 'text-navy-300 hover:text-white hover:bg-navy-900'
            }`}
          >
            <User className="h-3.5 w-3.5" /> Profile Overview & Metrics
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'security'
                ? 'bg-navy-800 text-gold-400 border border-gold-400/30'
                : 'text-navy-300 hover:text-white hover:bg-navy-900'
            }`}
          >
            <Lock className="h-3.5 w-3.5" /> Security & Passwords
          </button>

          <button
            onClick={() => setActiveTab('m365')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'm365'
                ? 'bg-navy-800 text-gold-400 border border-gold-400/30'
                : 'text-navy-300 hover:text-white hover:bg-navy-900'
            }`}
          >
            <Layers className="h-3.5 w-3.5" /> Microsoft 365 Account
          </button>
        </div>
      </div>

      {/* Edit Mode Inline Drawer/Form */}
      {isEditing && (
        <form onSubmit={handleSaveProfile} className="bg-white p-6 rounded-2xl border border-gold-300/80 shadow-md space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-navy-900">
            <h3 className="font-black text-lg flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-gold-500" /> Edit Executive Profile & Sales Quota
            </h3>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Display Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-gold-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Work Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-gold-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">User Principal Name (M365)</label>
              <input
                type="text"
                required
                value={userPrincipalName}
                onChange={(e) => setUserPrincipalName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono text-slate-600 focus:ring-2 focus:ring-gold-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Job Title</label>
              <input
                type="text"
                required
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-gold-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Company / Organization</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-gold-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-gold-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-gold-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Quarterly Quota Target ($)</label>
              <input
                type="number"
                min="0"
                step="1000"
                value={salesTarget}
                onChange={(e) => setSalesTarget(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-gold-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Sales Territory / Region</label>
              <input
                type="text"
                value={territory}
                onChange={(e) => setTerritory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-gold-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Professional Bio / Executive Summary</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-gold-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-gold-400 font-extrabold text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Save className="h-4 w-4" /> Save Profile Details
            </button>
          </div>
        </form>
      )}

      {/* Main Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          
          {/* Live Sales Target & Metrics Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Quota Achievement Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 relative overflow-hidden">
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-500">
                <span>Quarterly Sales Quota</span>
                <Target className="h-4 w-4 text-gold-500" />
              </div>

              <div>
                <div className="text-3xl font-extrabold text-navy-900 font-mono">
                  ${closedRevenue.toLocaleString()} <span className="text-xs font-normal text-slate-400">/ ${targetNumber.toLocaleString()}</span>
                </div>
                <div className="mt-2 w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="bg-gold-500 h-full transition-all duration-500"
                    style={{ width: `${quotaPercentage}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-600 font-medium">
                <span>{quotaPercentage}% Achieved</span>
                <span>${Math.max(0, targetNumber - closedRevenue).toLocaleString()} Remaining</span>
              </div>
            </div>

            {/* Closed Deals & Win Rate */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-500">
                <span>Win Rate & Closed Deals</span>
                <Trophy className="h-4 w-4 text-emerald-600" />
              </div>

              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-extrabold text-navy-900 font-mono">{winRate}%</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {closedLeads.length} Closed Won
                </span>
              </div>

              <p className="text-xs text-slate-500">
                Average Deal Size: <strong className="font-mono text-slate-800">${avgDealSize.toLocaleString()}</strong>
              </p>
            </div>

            {/* Active Pipeline Under Management */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-500">
                <span>Active Pipeline Value</span>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </div>

              <div className="text-3xl font-extrabold text-navy-900 font-mono">
                ${activePipelineValue.toLocaleString()}
              </div>

              <p className="text-xs text-slate-500">
                Across {totalLeadsCount - closedLeads.length} open sales opportunities.
              </p>
            </div>

          </div>

          {/* User Details & Executive Bio Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Bio & Professional Summary */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-extrabold text-navy-900 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
                <FileText className="h-5 w-5 text-gold-500" /> Professional Summary
              </h3>

              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {bio}
              </p>

              <div className="pt-2 grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Phone</span>
                  <span className="font-bold text-navy-900 font-mono">{phoneNumber}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Email</span>
                  <span className="font-bold text-navy-900 font-mono truncate block">{email}</span>
                </div>
              </div>
            </div>

            {/* Account & Microsoft 365 Overview */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-navy-900 text-base flex items-center gap-2">
                  <Layers className="h-5 w-5 text-purple-600" /> Microsoft 365 Tenant Overview
                </h3>

                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  account.isConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {account.isConnected ? 'Connected' : 'Offline'}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Tenant Name</span>
                  <span className="font-bold text-navy-900">{account.tenantName}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Tenant ID</span>
                  <span className="font-mono text-slate-700 text-[11px]">{account.tenantId}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Subscription Tier</span>
                  <span className="font-bold text-navy-900">{account.subscriptionType}</span>
                </div>

                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Last Graph Synchronization</span>
                  <span className="font-mono text-slate-700">
                    {account.lastSyncedAt ? new Date(account.lastSyncedAt).toLocaleString() : 'Never'}
                  </span>
                </div>
              </div>

              {onSyncM365 && (
                <button
                  onClick={onSyncM365}
                  className="w-full mt-2 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-gold-400 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Trigger Graph API Sync Now
                </button>
              )}
            </div>

          </div>

        </div>
      )}

      {/* Security & Passwords Tab */}
      {activeTab === 'security' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 text-navy-900 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-gold-500" />
            <div>
              <h3 className="font-extrabold text-base">Security & Authentication Settings</h3>
              <p className="text-xs text-slate-500">Manage account password, multi-factor authentication, and security tokens.</p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="max-w-lg space-y-4">
            {passwordError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                Password changed successfully!
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Current Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 pl-9 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-gold-500 focus:outline-none"
                />
                <Key className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full px-3 py-2 pl-9 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-gold-500 focus:outline-none"
                />
                <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2 pl-9 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-gold-500 focus:outline-none"
                />
                <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-gold-400 font-extrabold text-xs flex items-center gap-2 shadow-xs transition-colors"
            >
              <ShieldCheck className="h-4 w-4" /> Update Security Credentials
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-2">
            <h4 className="font-bold text-navy-900">Microsoft Entra ID (Azure AD) MFA Status</h4>
            <p className="text-slate-600">
              Enforced via organizational policy. OAuth2 token refresh frequency: <strong className="font-mono text-slate-800">Every 60 minutes</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Microsoft 365 Tab */}
      {activeTab === 'm365' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-navy-900 text-base">Microsoft 365 Connected Scopes</h3>
              <p className="text-xs text-slate-500">Active Graph API permissions granted for user account.</p>
            </div>

            <button
              onClick={() => {
                if (account.isConnected) {
                  const disc = m365Service.disconnectAccount();
                  if (onAccountUpdate) onAccountUpdate(disc);
                  if (showToast) showToast('Disconnected Microsoft 365 account', 'info');
                } else {
                  const conn = m365Service.connectAccount();
                  if (onAccountUpdate) onAccountUpdate(conn);
                  if (showToast) showToast('Connected Microsoft 365 account');
                }
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
                account.isConnected
                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              {account.isConnected ? 'Disconnect M365 Account' : 'Connect M365 Account'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {account.scopes.map((scope) => (
              <div key={scope} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="font-mono text-xs font-bold text-slate-800">{scope}</span>
              </div>
            ))}
          </div>

          <div className="p-4 bg-navy-950 text-white rounded-xl space-y-2 text-xs font-mono">
            <div className="text-gold-400 font-bold uppercase tracking-wider">M365 Live Sync Statistics</div>
            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="p-2 bg-navy-900 rounded-lg border border-navy-800">
                <div className="text-slate-400 text-[10px]">Synced Contacts</div>
                <div className="text-lg font-bold text-white">{account.syncedContactsCount}</div>
              </div>
              <div className="p-2 bg-navy-900 rounded-lg border border-navy-800">
                <div className="text-slate-400 text-[10px]">Outlook Emails</div>
                <div className="text-lg font-bold text-white">{account.syncedEmailsCount}</div>
              </div>
              <div className="p-2 bg-navy-900 rounded-lg border border-navy-800">
                <div className="text-slate-400 text-[10px]">Teams Calendar</div>
                <div className="text-lg font-bold text-white">{account.syncedEventsCount}</div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
