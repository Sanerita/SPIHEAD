// src/views/SettingsView.tsx
import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  Globe,
  Bell,
  Lock,
  Database,
  Zap,
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
  Upload,
  X,
  Key,
  Unlink,
  Link as LinkIcon,
  AlertCircle,
  Users,
  Mail,
  Calendar,
  Activity,
  Palette,
  RotateCcw,
  UserCheck,
  Clock,
  DollarSign,
  Briefcase
} from 'lucide-react';
import { crmStore } from '../lib/store';
import { themeService, ThemeColors } from '../lib/theme';
import { m365Service } from '../lib/m365Service';
import { authService } from '../lib/authService';
import { companyService } from '../lib/companyService';
import { SecurityAuditLogTable } from '../components/SecurityAuditLogTable';
import { M365Account, UserRole, STANDARD_INDUSTRIES } from '../types/crm';

interface SettingsViewProps {
  onClearAllData: () => void;
  onRestoreSampleData: () => void;
  showToast?: (message: string, type?: 'success' | 'info') => void;
  onSyncM365?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onClearAllData,
  onRestoreSampleData,
  showToast,
  onSyncM365,
}) => {
  // Tab State
  const [activeTab, setActiveTab] = useState<'general' | 'integrations' | 'ai' | 'notifications' | 'security' | 'data'>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ===== GENERAL SETTINGS =====
  const companyProf = companyService.getProfile();
  const [companyName, setCompanyName] = useState(companyProf.companyName || '');
  const [industry, setIndustry] = useState(companyProf.industry || 'Enterprise Software & SaaS');
  const [currency, setCurrency] = useState(companyProf.currency || 'USD');
  const [timezone, setTimezone] = useState('UTC-05:00 (Eastern Time)');

  // ===== BRAND THEME =====
  const initialTheme = themeService.getTheme();
  const [primaryColor, setPrimaryColor] = useState(initialTheme.primaryNavy);
  const [accentColor, setAccentColor] = useState(initialTheme.luxuryGold);

  // ===== INTEGRATIONS =====
  const [m365Account, setM365Account] = useState<M365Account>(() => m365Service.getAccount());
  const [isConnecting, setIsConnecting] = useState(false);

  // ===== AI SETTINGS =====
  const [aiModel, setAiModel] = useState('gemini-2.5-flash');
  const [autoScore, setAutoScore] = useState(true);
  const [engagementWeight, setEngagementWeight] = useState(40);
  const [budgetWeight, setBudgetWeight] = useState(30);
  const [recencyWeight, setRecencyWeight] = useState(30);
  const [isRescoring, setIsRescoring] = useState(false);

  // ===== NOTIFICATIONS =====
  const [notifyHotLead, setNotifyHotLead] = useState(true);
  const [notifyDailyDigest, setNotifyDailyDigest] = useState(true);
  const [notifyMeeting, setNotifyMeeting] = useState(true);
  const [alertEmail, setAlertEmail] = useState('');

  // ===== SECURITY =====
  const [secSettings, setSecSettings] = useState(() => authService.getSecuritySettings());
  const [auditLogs, setAuditLogs] = useState(() => authService.getAuditLogs());
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());

  // ===== DATA =====
  const [showClearModal, setShowClearModal] = useState(false);
  const leadsCount = crmStore.getLeads().length;
  const meetingsCount = crmStore.getMeetings().length;
  const emailsCount = crmStore.getEmails().length;

  // Load saved settings
  useEffect(() => {
    const saved = localStorage.getItem('spihead_crm_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.alertEmail) setAlertEmail(parsed.alertEmail);
      } catch (e) { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    const unsub = authService.subscribe(() => {
      setSecSettings(authService.getSecuritySettings());
      setAuditLogs(authService.getAuditLogs());
      setCurrentUser(authService.getCurrentUser());
    });
    return () => unsub();
  }, []);

  // ===== HANDLERS =====

  const handleSaveGeneral = () => {
    setIsSaving(true);
    companyService.saveProfile({ companyName, industry, currency });
    localStorage.setItem('spihead_crm_settings', JSON.stringify({ alertEmail, companyName, currency, timezone }));
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      if (showToast) showToast('Settings saved successfully!', 'success');
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 500);
  };

  const handleApplyTheme = () => {
    themeService.applyTheme({
      primaryNavy: primaryColor,
      accentNavy: '#0A0923',
      luxuryGold: accentColor,
      highlightGold: accentColor,
    });
    if (showToast) showToast('Theme applied successfully!', 'success');
  };

  const handleConnectM365 = () => {
    setIsConnecting(true);
    window.location.href = '/api/auth/oauth/url?provider=microsoft';
  };

  const handleDisconnectM365 = () => {
    const disconnected = m365Service.disconnectAccount();
    setM365Account(disconnected);
    if (showToast) showToast('Microsoft 365 disconnected', 'info');
  };

  const handleRunAiRescore = () => {
    setIsRescoring(true);
    setTimeout(() => {
      crmStore.recalculateAllScores();
      setIsRescoring(false);
      if (showToast) showToast(`Re-scored ${leadsCount} leads!`, 'success');
    }, 1000);
  };

  const handleExportData = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      leads: crmStore.getLeads(),
      meetings: crmStore.getMeetings(),
      activities: crmStore.getActivities(),
      emails: crmStore.getEmails(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `spihead_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    if (showToast) showToast('Data exported successfully!', 'success');
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.leads && Array.isArray(data.leads)) {
          crmStore.clearAllData();
          data.leads.forEach((l: any) => {
            crmStore.addLead({
              name: l.name || 'Imported Lead',
              email: l.email || 'imported@example.com',
              phone: l.phone || '',
              company: l.company || 'Imported Company',
              budget: l.budget || 0,
              status: l.status || 'New',
              urgency: l.urgency || false,
              engagement: l.engagement || 3,
              replyCount: l.replyCount || 0,
              notes: l.notes || '',
              industry: l.industry || 'Technology',
              m365Synced: false,
              tags: l.tags || [],
            });
          });
          if (showToast) showToast('Data imported successfully!', 'success');
        }
      } catch (err) {
        if (showToast) showToast('Invalid backup file', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const userRole = currentUser?.authRole || currentUser?.role || 'User';
  const isAdmin = userRole === 'Owner' || userRole === 'Admin';

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4">
        <div className="bg-white rounded-2xl border border-rose-200 shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-rose-600" />
          </div>
          <h2 className="text-xl font-bold text-navy-900 mb-2">Access Restricted</h2>
          <p className="text-sm text-slate-600">You need Admin or Owner permissions to access settings.</p>
        </div>
      </div>
    );
  }

  // Tabs configuration
  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'integrations', label: 'Integrations', icon: LinkIcon },
    { id: 'ai', label: 'AI Engine', icon: Zap },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: ShieldCheck },
    { id: 'data', label: 'Data', icon: Database },
  ] as const;

  return (
    <div className="max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2">
              <Settings className="h-6 w-6 text-gold-500" />
              Settings
            </h1>
            <p className="text-sm text-slate-500 mt-1">Manage your workspace configuration and preferences.</p>
          </div>
          <button
            onClick={handleSaveGeneral}
            disabled={isSaving}
            className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-gold-400 font-bold text-sm rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {saveSuccess ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Saved
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-white text-navy-900 shadow-sm'
                  : 'text-slate-600 hover:text-navy-900 hover:bg-white/50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ===== TAB: GENERAL ===== */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* Company Profile */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-navy-900 flex items-center gap-2 mb-4">
              <Building2 className="h-5 w-5 text-gold-500" />
              Company Profile
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-500 focus:outline-none"
                  placeholder="Your Company Name"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Industry</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-500 focus:outline-none bg-white"
                >
                  {STANDARD_INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-500 focus:outline-none bg-white"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="ZAR">ZAR (R)</option>
                  <option value="CAD">CAD ($)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-500 focus:outline-none bg-white"
                >
                  <option value="UTC-05:00 (Eastern Time)">Eastern Time (UTC-5)</option>
                  <option value="UTC-08:00 (Pacific Time)">Pacific Time (UTC-8)</option>
                  <option value="UTC+00:00 (GMT)">GMT (UTC+0)</option>
                  <option value="UTC+02:00 (SAST)">South Africa (UTC+2)</option>
                  <option value="UTC+01:00 (CET)">Central Europe (UTC+1)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Brand Theme */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-navy-900 flex items-center gap-2 mb-4">
              <Palette className="h-5 w-5 text-gold-500" />
              Brand Theme
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Primary Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-gold-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Accent Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-gold-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <button
                  onClick={handleApplyTheme}
                  className="w-full px-4 py-2 bg-gold-500 hover:bg-gold-400 text-navy-950 font-bold text-sm rounded-xl transition-colors"
                >
                  Apply Theme
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== TAB: INTEGRATIONS ===== */}
      {activeTab === 'integrations' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-navy-900 flex items-center gap-2 mb-4">
            <LinkIcon className="h-5 w-5 text-gold-500" />
            Microsoft 365 Integration
          </h2>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${m365Account.isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className="font-semibold text-navy-900">
                  {m365Account.isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              {m365Account.isConnected && (
                <p className="text-sm text-slate-600 mt-1">
                  {m365Account.userPrincipalName || 'Connected account'}
                </p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                {m365Account.isConnected 
                  ? `Last synced: ${m365Account.lastSyncedAt ? new Date(m365Account.lastSyncedAt).toLocaleString() : 'Never'}`
                  : 'Connect your Microsoft 365 account for email sync, calendar, and contacts'}
              </p>
            </div>
            {m365Account.isConnected ? (
              <button
                onClick={handleDisconnectM365}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm rounded-xl transition-colors flex items-center gap-2"
              >
                <Unlink className="h-4 w-4" />
                Disconnect
              </button>
            ) : (
              <button
                onClick={handleConnectM365}
                disabled={isConnecting}
                className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-gold-400 font-bold text-sm rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <LinkIcon className="h-4 w-4" />
                {isConnecting ? 'Connecting...' : 'Connect'}
              </button>
            )}
          </div>

          {m365Account.isConnected && (
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <Users className="h-5 w-5 text-slate-400 mx-auto mb-1" />
                <div className="text-xl font-bold text-navy-900">{m365Account.syncedContactsCount}</div>
                <div className="text-xs text-slate-500">Contacts</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <Mail className="h-5 w-5 text-slate-400 mx-auto mb-1" />
                <div className="text-xl font-bold text-navy-900">{m365Account.syncedEmailsCount}</div>
                <div className="text-xs text-slate-500">Emails</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <Calendar className="h-5 w-5 text-slate-400 mx-auto mb-1" />
                <div className="text-xl font-bold text-navy-900">{m365Account.syncedEventsCount}</div>
                <div className="text-xs text-slate-500">Events</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== TAB: AI ENGINE ===== */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-navy-900 flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-gold-500" />
              AI Lead Scoring Engine
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">AI Model</label>
                <select
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-500 focus:outline-none bg-white"
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Analysis)</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoScore}
                    onChange={(e) => setAutoScore(e.target.checked)}
                    className="rounded text-gold-500 focus:ring-gold-500 h-4 w-4"
                  />
                  <span className="text-sm font-medium text-slate-700">Auto-score leads on new activity</span>
                </label>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="flex justify-between text-sm font-medium text-slate-700 mb-1">
                  <span>Engagement Weight</span>
                  <span className="text-gold-600">{engagementWeight}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="70"
                  value={engagementWeight}
                  onChange={(e) => setEngagementWeight(Number(e.target.value))}
                  className="w-full accent-gold-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-sm font-medium text-slate-700 mb-1">
                  <span>Budget Weight</span>
                  <span className="text-gold-600">{budgetWeight}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="70"
                  value={budgetWeight}
                  onChange={(e) => setBudgetWeight(Number(e.target.value))}
                  className="w-full accent-gold-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-sm font-medium text-slate-700 mb-1">
                  <span>Recency Weight</span>
                  <span className="text-gold-600">{recencyWeight}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="70"
                  value={recencyWeight}
                  onChange={(e) => setRecencyWeight(Number(e.target.value))}
                  className="w-full accent-gold-500"
                />
              </div>
            </div>

            <button
              onClick={handleRunAiRescore}
              disabled={isRescoring}
              className="mt-4 px-4 py-2 bg-navy-900 hover:bg-navy-800 text-gold-400 font-bold text-sm rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRescoring ? 'animate-spin' : ''}`} />
              {isRescoring ? 'Re-scoring...' : 'Re-score All Leads'}
            </button>
          </div>
        </div>
      )}

      {/* ===== TAB: NOTIFICATIONS ===== */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-navy-900 flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-gold-500" />
            Notification Preferences
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <div className="font-semibold text-navy-900 text-sm">Hot Lead Alerts</div>
                <p className="text-xs text-slate-500">Get notified when a lead score exceeds 75%</p>
              </div>
              <input
                type="checkbox"
                checked={notifyHotLead}
                onChange={(e) => setNotifyHotLead(e.target.checked)}
                className="rounded text-gold-500 focus:ring-gold-500 h-4 w-4"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <div className="font-semibold text-navy-900 text-sm">Daily Digest</div>
                <p className="text-xs text-slate-500">Receive daily summary of pipeline activity</p>
              </div>
              <input
                type="checkbox"
                checked={notifyDailyDigest}
                onChange={(e) => setNotifyDailyDigest(e.target.checked)}
                className="rounded text-gold-500 focus:ring-gold-500 h-4 w-4"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <div className="font-semibold text-navy-900 text-sm">Meeting Reminders</div>
                <p className="text-xs text-slate-500">Reminders 15 minutes before scheduled calls</p>
              </div>
              <input
                type="checkbox"
                checked={notifyMeeting}
                onChange={(e) => setNotifyMeeting(e.target.checked)}
                className="rounded text-gold-500 focus:ring-gold-500 h-4 w-4"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Alert Email</label>
              <input
                type="email"
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
                placeholder="alerts@yourcompany.com"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* ===== TAB: SECURITY ===== */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-navy-900 flex items-center gap-2 mb-4">
              <ShieldCheck className="h-5 w-5 text-gold-500" />
              Security Settings
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <div className="font-semibold text-navy-900 text-sm">Multi-Factor Authentication</div>
                  <p className="text-xs text-slate-500">Require MFA for all users</p>
                </div>
                <input
                  type="checkbox"
                  checked={secSettings.mfaRequired}
                  onChange={(e) => {
                    authService.updateSecuritySettings({ mfaRequired: e.target.checked });
                    if (showToast) showToast(`MFA ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
                  }}
                  className="rounded text-gold-500 focus:ring-gold-500 h-4 w-4"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <div className="font-semibold text-navy-900 text-sm">Data Masking</div>
                  <p className="text-xs text-slate-500">Mask sensitive data for non-admin users</p>
                </div>
                <input
                  type="checkbox"
                  checked={secSettings.dataMaskingEnabled}
                  onChange={(e) => {
                    authService.updateSecuritySettings({ dataMaskingEnabled: e.target.checked });
                    if (showToast) showToast(`Data masking ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
                  }}
                  className="rounded text-gold-500 focus:ring-gold-500 h-4 w-4"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <div className="font-semibold text-navy-900 text-sm">Auto-Lock Sessions</div>
                  <p className="text-xs text-slate-500">Lock inactive sessions after timeout</p>
                </div>
                <input
                  type="checkbox"
                  checked={secSettings.autoLockOnInactivity}
                  onChange={(e) => {
                    authService.updateSecuritySettings({ autoLockOnInactivity: e.target.checked });
                    if (showToast) showToast(`Auto-lock ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
                  }}
                  className="rounded text-gold-500 focus:ring-gold-500 h-4 w-4"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Session Timeout (minutes)</label>
                <select
                  value={secSettings.sessionTimeoutMinutes}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    authService.updateSecuritySettings({ sessionTimeoutMinutes: val });
                    if (showToast) showToast(`Timeout set to ${val} minutes`, 'info');
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-500 focus:outline-none bg-white"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={480}>8 hours</option>
                </select>
              </div>
            </div>
          </div>

          <SecurityAuditLogTable
            logs={auditLogs}
            onClearLogs={() => {
              authService.clearAuditLogs();
              if (showToast) showToast('Audit logs cleared', 'info');
            }}
          />
        </div>
      )}

      {/* ===== TAB: DATA ===== */}
      {activeTab === 'data' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-navy-900 flex items-center gap-2 mb-4">
              <Database className="h-5 w-5 text-gold-500" />
              Data Management
            </h2>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <Users className="h-5 w-5 text-slate-400 mx-auto mb-1" />
                <div className="text-xl font-bold text-navy-900">{leadsCount}</div>
                <div className="text-xs text-slate-500">Leads</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <Calendar className="h-5 w-5 text-slate-400 mx-auto mb-1" />
                <div className="text-xl font-bold text-navy-900">{meetingsCount}</div>
                <div className="text-xs text-slate-500">Meetings</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <Mail className="h-5 w-5 text-slate-400 mx-auto mb-1" />
                <div className="text-xl font-bold text-navy-900">{emailsCount}</div>
                <div className="text-xs text-slate-500">Emails</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleExportData}
                className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-gold-400 font-bold text-sm rounded-xl flex items-center gap-2 transition-colors"
              >
                <Download className="h-4 w-4" />
                Export Data
              </button>

              <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl flex items-center gap-2 cursor-pointer transition-colors border border-slate-200">
                <Upload className="h-4 w-4 text-slate-500" />
                Import Data
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                />
              </label>

              <button
                onClick={() => {
                  onRestoreSampleData();
                  if (showToast) showToast('Sample data restored', 'info');
                }}
                className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-sm rounded-xl flex items-center gap-2 transition-colors border border-amber-200"
              >
                <RotateCcw className="h-4 w-4" />
                Load Samples
              </button>

              <button
                onClick={() => setShowClearModal(true)}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-sm rounded-xl flex items-center gap-2 transition-colors"
              >
                <AlertTriangle className="h-4 w-4" />
                Clear All Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Data Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-rose-100 rounded-xl text-rose-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-navy-900">Clear All Data?</h3>
                <p className="text-sm text-slate-500 mt-1">
                  This will permanently delete all {leadsCount} leads, {meetingsCount} meetings, and email history.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onClearAllData();
                  setShowClearModal(false);
                  if (showToast) showToast('All data cleared', 'info');
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl transition-colors"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
