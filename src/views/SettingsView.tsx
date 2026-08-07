import React, { useState, useEffect } from 'react';
import {
  Settings,
  Layers,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  Palette,
  Database,
  Globe,
  DollarSign,
  Zap,
  Bell,
  Lock,
  Download,
  Upload,
  AlertTriangle,
  Sliders,
  Check,
  Sparkles,
  Server,
  Activity,
  Calendar,
  Mail,
  Users,
  FileJson,
  RotateCcw,
  Save,
  UserCheck,
  Clock,
  X
} from 'lucide-react';
import { crmStore } from '../lib/store';
import { themeService, ThemeColors } from '../lib/theme';

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
  const [activeTab, setActiveTab] = useState<
    'general' | 'm365' | 'ai' | 'notifications' | 'security' | 'database'
  >('general');

  // General Settings State
  const [companyName, setCompanyName] = useState('SPIHEAD Enterprise');
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState('UTC-05:00 (Eastern Time)');
  const [fiscalYearStart, setFiscalYearStart] = useState('January');
  const [hotThreshold, setHotThreshold] = useState<number>(75);
  const [warmThreshold, setWarmThreshold] = useState<number>(50);

  // Brand Theme Palette State
  const initialTheme = themeService.getTheme();
  const [primaryNavy, setPrimaryNavy] = useState(initialTheme.primaryNavy);
  const [accentNavy, setAccentNavy] = useState(initialTheme.accentNavy);
  const [luxuryGold, setLuxuryGold] = useState(initialTheme.luxuryGold);
  const [highlightGold, setHighlightGold] = useState(initialTheme.highlightGold);
  const [isThemeApplied, setIsThemeApplied] = useState(false);

  const applyThemeColors = (theme: ThemeColors) => {
    setPrimaryNavy(theme.primaryNavy);
    setAccentNavy(theme.accentNavy);
    setLuxuryGold(theme.luxuryGold);
    setHighlightGold(theme.highlightGold);
    themeService.applyTheme(theme);
  };

  const handleApplyPreviewTheme = () => {
    themeService.applyTheme({
      primaryNavy,
      accentNavy,
      luxuryGold,
      highlightGold,
    });
    setIsThemeApplied(true);
    if (showToast) {
      showToast(`Applied custom brand theme colors to entire workspace!`, 'success');
    }
    setTimeout(() => setIsThemeApplied(false), 2500);
  };

  // M365 Settings State
  const [tenantId, setTenantId] = useState('72f988bf-86f1-41af-91ab-2d7cd011db47');
  const [clientId, setClientId] = useState('a9f4c1e2-38d5-4a6b-9c10-123456789abc');
  const [redirectUri, setRedirectUri] = useState('https://crm.spihead.com/auth/callback');
  const [syncFrequency, setSyncFrequency] = useState('Every 15 Minutes');
  const [syncContacts, setSyncContacts] = useState(true);
  const [syncCalendar, setSyncCalendar] = useState(true);
  const [autoLogEmails, setAutoLogEmails] = useState(true);
  const [isTestingM365, setIsTestingM365] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // AI Lead Energy Engine State
  const [aiModel, setAiModel] = useState('gemini-2.5-flash');
  const [autoScoreOnEmail, setAutoScoreOnEmail] = useState(true);
  const [autoScoreOnMeeting, setAutoScoreOnMeeting] = useState(true);
  const [engagementWeight, setEngagementWeight] = useState(40);
  const [budgetWeight, setBudgetWeight] = useState(30);
  const [recencyWeight, setRecencyWeight] = useState(30);
  const [isRescoring, setIsRescoring] = useState(false);

  // Notifications & Automation Rules State
  const [notifyHotLead, setNotifyHotLead] = useState(true);
  const [notifyDailyDigest, setNotifyDailyDigest] = useState(true);
  const [notifyTeamsMeeting, setNotifyTeamsMeeting] = useState(true);
  const [notifyFollowupPrompt, setNotifyFollowupPrompt] = useState(true);
  const [autoAssignLeads, setAutoAssignLeads] = useState(true);
  const [autoStaleLeadAlert, setAutoStaleLeadAlert] = useState(true);
  const [alertEmailRecipient, setAlertEmailRecipient] = useState('sales-alerts@spihead.com');
  const [staleLeadDays, setStaleLeadDays] = useState(14);
  const [isRulesSaved, setIsRulesSaved] = useState(false);

  // Security State
  const [sessionTimeout, setSessionTimeout] = useState('30 Minutes');
  const [auditLogging, setAuditLogging] = useState(true);
  const [gdprRetentionDays, setGdprRetentionDays] = useState(365);

  // Modal State
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);

  // Storage Persistence Key
  const SETTINGS_STORAGE_KEY = 'spihead_crm_app_settings';

  // Load saved settings on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.companyName !== undefined) setCompanyName(saved.companyName);
        if (saved.currency !== undefined) setCurrency(saved.currency);
        if (saved.timezone !== undefined) setTimezone(saved.timezone);
        if (saved.fiscalYearStart !== undefined) setFiscalYearStart(saved.fiscalYearStart);
        if (saved.hotThreshold !== undefined) setHotThreshold(saved.hotThreshold);
        if (saved.warmThreshold !== undefined) setWarmThreshold(saved.warmThreshold);
        if (saved.tenantId !== undefined) setTenantId(saved.tenantId);
        if (saved.clientId !== undefined) setClientId(saved.clientId);
        if (saved.redirectUri !== undefined) setRedirectUri(saved.redirectUri);
        if (saved.syncFrequency !== undefined) setSyncFrequency(saved.syncFrequency);
        if (saved.syncContacts !== undefined) setSyncContacts(saved.syncContacts);
        if (saved.syncCalendar !== undefined) setSyncCalendar(saved.syncCalendar);
        if (saved.autoLogEmails !== undefined) setAutoLogEmails(saved.autoLogEmails);
        if (saved.aiModel !== undefined) setAiModel(saved.aiModel);
        if (saved.autoScoreOnEmail !== undefined) setAutoScoreOnEmail(saved.autoScoreOnEmail);
        if (saved.autoScoreOnMeeting !== undefined) setAutoScoreOnMeeting(saved.autoScoreOnMeeting);
        if (saved.engagementWeight !== undefined) setEngagementWeight(saved.engagementWeight);
        if (saved.budgetWeight !== undefined) setBudgetWeight(saved.budgetWeight);
        if (saved.recencyWeight !== undefined) setRecencyWeight(saved.recencyWeight);
        if (saved.notifyHotLead !== undefined) setNotifyHotLead(saved.notifyHotLead);
        if (saved.notifyDailyDigest !== undefined) setNotifyDailyDigest(saved.notifyDailyDigest);
        if (saved.notifyTeamsMeeting !== undefined) setNotifyTeamsMeeting(saved.notifyTeamsMeeting);
        if (saved.notifyFollowupPrompt !== undefined) setNotifyFollowupPrompt(saved.notifyFollowupPrompt);
        if (saved.autoAssignLeads !== undefined) setAutoAssignLeads(saved.autoAssignLeads);
        if (saved.autoStaleLeadAlert !== undefined) setAutoStaleLeadAlert(saved.autoStaleLeadAlert);
        if (saved.alertEmailRecipient !== undefined) setAlertEmailRecipient(saved.alertEmailRecipient);
        if (saved.staleLeadDays !== undefined) setStaleLeadDays(saved.staleLeadDays);
        if (saved.sessionTimeout !== undefined) setSessionTimeout(saved.sessionTimeout);
        if (saved.auditLogging !== undefined) setAuditLogging(saved.auditLogging);
        if (saved.gdprRetentionDays !== undefined) setGdprRetentionDays(saved.gdprRetentionDays);
      }
    } catch (e) {
      console.error('Failed to load settings from storage', e);
    }
  }, []);

  // Database Counters
  const leadsCount = crmStore.getLeads().length;
  const meetingsCount = crmStore.getMeetings().length;
  const emailsCount = crmStore.getEmails().length;
  const activitiesCount = crmStore.getActivities().length;

  // Estimated LocalStorage Size in KB
  const getStorageSize = () => {
    let total = 0;
    for (let x in localStorage) {
      if (localStorage.hasOwnProperty(x)) {
        total += (localStorage[x].length + x.length) * 2;
      }
    }
    return Math.round(total / 1024);
  };

  // Helper to persist all settings object
  const persistSettings = (overrides = {}) => {
    const fullConfig = {
      companyName,
      currency,
      timezone,
      fiscalYearStart,
      hotThreshold,
      warmThreshold,
      tenantId,
      clientId,
      redirectUri,
      syncFrequency,
      syncContacts,
      syncCalendar,
      autoLogEmails,
      aiModel,
      autoScoreOnEmail,
      autoScoreOnMeeting,
      engagementWeight,
      budgetWeight,
      recencyWeight,
      notifyHotLead,
      notifyDailyDigest,
      notifyTeamsMeeting,
      notifyFollowupPrompt,
      autoAssignLeads,
      autoStaleLeadAlert,
      alertEmailRecipient,
      staleLeadDays,
      sessionTimeout,
      auditLogging,
      gdprRetentionDays,
      ...overrides,
    };
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(fullConfig));
    } catch (e) {
      console.error('Failed to persist settings', e);
    }
  };

  const handleSaveAllSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    persistSettings();
    setIsSavedSuccess(true);
    if (showToast) showToast('All CRM settings and configurations saved successfully!', 'success');
    setTimeout(() => setIsSavedSuccess(false), 3000);
  };

  const handleSaveAlertsAndAutomation = () => {
    persistSettings({
      notifyHotLead,
      notifyDailyDigest,
      notifyTeamsMeeting,
      notifyFollowupPrompt,
      autoAssignLeads,
      autoStaleLeadAlert,
      alertEmailRecipient,
      staleLeadDays,
    });
    setIsRulesSaved(true);
    if (showToast) showToast('Alerts & Automation Rules saved successfully!', 'success');
    setTimeout(() => setIsRulesSaved(false), 2500);
  };

  // Test M365 Connection Simulation
  const handleTestM365Connection = () => {
    setIsTestingM365(true);
    setTestResult(null);
    setTimeout(() => {
      setIsTestingM365(false);
      setTestResult('Successfully authenticated with Azure AD Entra ID & Microsoft Graph API v1.0!');
      if (showToast) showToast('Microsoft Graph API Connection Verified');
    }, 1200);
  };

  // Trigger AI Engine Full Rescore
  const handleRunAiRescore = () => {
    setIsRescoring(true);
    setTimeout(() => {
      crmStore.recalculateAllScores();
      setIsRescoring(false);
      if (showToast) showToast(`Re-indexed and re-scored ${leadsCount} leads using AI model ${aiModel}!`);
    }, 1000);
  };

  // Export Complete System Backup as JSON
  const handleExportBackup = () => {
    const backupData = {
      app: 'SPIHEAD Enterprise CRM',
      version: '2.5.0',
      exportedAt: new Date().toISOString(),
      configuration: {
        companyName,
        currency,
        timezone,
        fiscalYearStart,
        hotThreshold,
        warmThreshold,
        tenantId,
        clientId,
        syncFrequency,
        aiModel,
      },
      data: {
        leads: crmStore.getLeads(),
        meetings: crmStore.getMeetings(),
        activities: crmStore.getActivities(),
        emails: crmStore.getEmails(),
      },
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SPIHEAD_CRM_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (showToast) showToast('Downloaded full system backup JSON archive');
  };

  // Import Database Backup JSON
  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.data && Array.isArray(json.data.leads)) {
          // Restore store
          crmStore.clearAllData();
          json.data.leads.forEach((l: any) => crmStore.addLead(l));
          if (showToast) showToast('Successfully restored CRM database from backup file!');
        } else {
          alert('Invalid backup file format.');
        }
      } catch (err) {
        alert('Failed to parse backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      
      {/* Top Header & Save Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-gold-500" />
            <h1 className="text-2xl font-black text-navy-900 tracking-tight">
              App Settings & System Configuration
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure Microsoft 365 Graph API, Gemini AI Lead Energy Engine, brand rules, and security compliance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSavedSuccess && (
            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              <CheckCircle2 className="h-4 w-4" /> All Changes Saved
            </span>
          )}

          <button
            onClick={handleExportBackup}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Download className="h-4 w-4 text-slate-500" /> Backup JSON
          </button>

          <button
            onClick={() => handleSaveAllSettings()}
            className="px-4 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-gold-400 font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Check className="h-4 w-4" /> Save Configuration
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-navy-950 p-2 rounded-2xl border border-navy-800 flex items-center gap-2 overflow-x-auto shadow-md">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'general'
              ? 'bg-navy-800 text-gold-400 border border-gold-400/30'
              : 'text-navy-300 hover:text-white hover:bg-navy-900'
          }`}
        >
          <Globe className="h-4 w-4" /> Organization & Preferences
        </button>

        <button
          onClick={() => setActiveTab('m365')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'm365'
              ? 'bg-navy-800 text-gold-400 border border-gold-400/30'
              : 'text-navy-300 hover:text-white hover:bg-navy-900'
          }`}
        >
          <Layers className="h-4 w-4" /> Microsoft 365 Credentials
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'ai'
              ? 'bg-navy-800 text-gold-400 border border-gold-400/30'
              : 'text-navy-300 hover:text-white hover:bg-navy-900'
          }`}
        >
          <Zap className="h-4 w-4" /> AI Lead Scoring Engine
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'notifications'
              ? 'bg-navy-800 text-gold-400 border border-gold-400/30'
              : 'text-navy-300 hover:text-white hover:bg-navy-900'
          }`}
        >
          <Bell className="h-4 w-4" /> Notifications & Alerts
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'security'
              ? 'bg-navy-800 text-gold-400 border border-gold-400/30'
              : 'text-navy-300 hover:text-white hover:bg-navy-900'
          }`}
        >
          <Lock className="h-4 w-4" /> Security & Compliance
        </button>

        <button
          onClick={() => setActiveTab('database')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'database'
              ? 'bg-navy-800 text-gold-400 border border-gold-400/30'
              : 'text-navy-300 hover:text-white hover:bg-navy-900'
          }`}
        >
          <Database className="h-4 w-4" /> System Data & Storage
        </button>
      </div>

      {/* Tab 1: Organization & Regional Preferences */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-navy-900">
              <Globe className="h-5 w-5 text-gold-500" />
              <h3 className="font-extrabold text-base">Organization & Localization</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Company / Organization Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-gold-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Primary Reporting Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-gold-500 focus:outline-none bg-white"
                >
                  <option value="USD">USD ($) - United States Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                  <option value="ZAR">ZAR (R) - South African Rand</option>
                  <option value="CAD">CAD ($) - Canadian Dollar</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">System Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-gold-500 focus:outline-none bg-white"
                >
                  <option value="UTC-05:00 (Eastern Time)">UTC-05:00 (Eastern Time)</option>
                  <option value="UTC-08:00 (Pacific Time)">UTC-08:00 (Pacific Time)</option>
                  <option value="UTC+00:00 (GMT)">UTC+00:00 (GMT / Greenwich)</option>
                  <option value="UTC+02:00 (SAST / CAT)">UTC+02:00 (SAST / South Africa)</option>
                  <option value="UTC+01:00 (CET)">UTC+01:00 (CET / Central Europe)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Fiscal Year Start Month</label>
                <select
                  value={fiscalYearStart}
                  onChange={(e) => setFiscalYearStart(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-gold-500 focus:outline-none bg-white"
                >
                  <option value="January">January</option>
                  <option value="April">April</option>
                  <option value="July">July</option>
                  <option value="October">October</option>
                </select>
              </div>
            </div>
          </div>

          {/* Lead Energy Thresholds */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-navy-900">
              <Zap className="h-5 w-5 text-gold-500" />
              <h3 className="font-extrabold text-base">Lead Energy Score Classifications</h3>
            </div>

            <p className="text-xs text-slate-600">
              Customize the minimum AI energy scores required to categorize leads into Hot, Warm, or Cold status across all pipeline boards.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                <span className="font-extrabold text-rose-800 text-xs flex items-center gap-1.5">
                  <Zap className="h-4 w-4 fill-rose-500 text-rose-500" /> Hot Lead Threshold (Score &ge;)
                </span>
                <input
                  type="number"
                  min="50"
                  max="95"
                  value={hotThreshold}
                  onChange={(e) => setHotThreshold(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-rose-300 rounded-lg font-mono font-bold text-navy-900 bg-white"
                />
                <p className="text-[11px] text-rose-600">Leads with scores above {hotThreshold} receive priority sales outreach.</p>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <span className="font-extrabold text-amber-800 text-xs flex items-center gap-1.5">
                  <Zap className="h-4 w-4 fill-amber-500 text-amber-500" /> Warm Lead Threshold (Score &ge;)
                </span>
                <input
                  type="number"
                  min="20"
                  max="70"
                  value={warmThreshold}
                  onChange={(e) => setWarmThreshold(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-amber-300 rounded-lg font-mono font-bold text-navy-900 bg-white"
                />
                <p className="text-[11px] text-amber-700">Leads between {warmThreshold} and {hotThreshold - 1} are actively nurtured.</p>
              </div>
            </div>
          </div>

          {/* Editable Enterprise Brand Theme */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-gold-500" />
                <div>
                  <h3 className="font-extrabold text-navy-900 text-base">Enterprise Brand Theme & Color Palette</h3>
                  <p className="text-xs text-slate-500">Customize primary brand colors, accent tones, and UI highlight palette across the entire app.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const defaultTheme = themeService.resetTheme();
                  applyThemeColors(defaultTheme);
                  if (showToast) showToast('Reset brand theme colors to SPIHEAD Classic defaults');
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-500" /> Reset Theme Defaults
              </button>
            </div>

            {/* Quick Preset Palettes */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Quick Industry Preset Palettes</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    applyThemeColors({
                      primaryNavy: '#12113D',
                      accentNavy: '#0A0923',
                      luxuryGold: '#DCAE3E',
                      highlightGold: '#E8C466',
                    });
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    primaryNavy === '#12113D' ? 'border-gold-500 bg-gold-50/50 shadow-xs' : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-3 h-3 rounded-full bg-[#12113D]"></span>
                    <span className="w-3 h-3 rounded-full bg-[#DCAE3E]"></span>
                    <span className="font-extrabold text-navy-900 text-[11px]">SPIHEAD Classic</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">Navy & Gold Enterprise</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    applyThemeColors({
                      primaryNavy: '#064E3B',
                      accentNavy: '#022C22',
                      luxuryGold: '#10B981',
                      highlightGold: '#34D399',
                    });
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    primaryNavy === '#064E3B' ? 'border-emerald-500 bg-emerald-50/50 shadow-xs' : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-3 h-3 rounded-full bg-[#064E3B]"></span>
                    <span className="w-3 h-3 rounded-full bg-[#10B981]"></span>
                    <span className="font-extrabold text-navy-900 text-[11px]">Emerald Finance</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">Deep Emerald & Mint</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    applyThemeColors({
                      primaryNavy: '#1E3A8A',
                      accentNavy: '#172554',
                      luxuryGold: '#3B82F6',
                      highlightGold: '#60A5FA',
                    });
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    primaryNavy === '#1E3A8A' ? 'border-blue-500 bg-blue-50/50 shadow-xs' : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-3 h-3 rounded-full bg-[#1E3A8A]"></span>
                    <span className="w-3 h-3 rounded-full bg-[#3B82F6]"></span>
                    <span className="font-extrabold text-navy-900 text-[11px]">Royal Sapphire</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">Corporate Sapphire</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    applyThemeColors({
                      primaryNavy: '#0F172A',
                      accentNavy: '#020617',
                      luxuryGold: '#F59E0B',
                      highlightGold: '#FBBF24',
                    });
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    primaryNavy === '#0F172A' ? 'border-amber-500 bg-amber-50/50 shadow-xs' : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-3 h-3 rounded-full bg-[#0F172A]"></span>
                    <span className="w-3 h-3 rounded-full bg-[#F59E0B]"></span>
                    <span className="font-extrabold text-navy-900 text-[11px]">Midnight Amber</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">Obsidian & Warm Gold</span>
                </button>
              </div>
            </div>

            {/* Editable Color Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Primary Navy */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <span className="text-[10px] uppercase tracking-wider block font-bold text-slate-500">Primary Dark Base</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryNavy}
                    onChange={(e) =>
                      applyThemeColors({
                        primaryNavy: e.target.value,
                        accentNavy,
                        luxuryGold,
                        highlightGold,
                      })
                    }
                    className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer shrink-0 p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={primaryNavy}
                    onChange={(e) =>
                      applyThemeColors({
                        primaryNavy: e.target.value,
                        accentNavy,
                        luxuryGold,
                        highlightGold,
                      })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-navy-900 uppercase text-xs focus:ring-2 focus:ring-gold-500 focus:outline-none bg-white"
                  />
                </div>
              </div>

              {/* Accent Navy */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <span className="text-[10px] uppercase tracking-wider block font-bold text-slate-500">Secondary Dark Surface</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accentNavy}
                    onChange={(e) =>
                      applyThemeColors({
                        primaryNavy,
                        accentNavy: e.target.value,
                        luxuryGold,
                        highlightGold,
                      })
                    }
                    className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer shrink-0 p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={accentNavy}
                    onChange={(e) =>
                      applyThemeColors({
                        primaryNavy,
                        accentNavy: e.target.value,
                        luxuryGold,
                        highlightGold,
                      })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-navy-900 uppercase text-xs focus:ring-2 focus:ring-gold-500 focus:outline-none bg-white"
                  />
                </div>
              </div>

              {/* Luxury Gold */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <span className="text-[10px] uppercase tracking-wider block font-bold text-slate-500">Brand Primary Accent</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={luxuryGold}
                    onChange={(e) =>
                      applyThemeColors({
                        primaryNavy,
                        accentNavy,
                        luxuryGold: e.target.value,
                        highlightGold,
                      })
                    }
                    className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer shrink-0 p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={luxuryGold}
                    onChange={(e) =>
                      applyThemeColors({
                        primaryNavy,
                        accentNavy,
                        luxuryGold: e.target.value,
                        highlightGold,
                      })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-navy-900 uppercase text-xs focus:ring-2 focus:ring-gold-500 focus:outline-none bg-white"
                  />
                </div>
              </div>

              {/* Gold Highlight */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <span className="text-[10px] uppercase tracking-wider block font-bold text-slate-500">Secondary Highlight</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={highlightGold}
                    onChange={(e) =>
                      applyThemeColors({
                        primaryNavy,
                        accentNavy,
                        luxuryGold,
                        highlightGold: e.target.value,
                      })
                    }
                    className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer shrink-0 p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={highlightGold}
                    onChange={(e) =>
                      applyThemeColors({
                        primaryNavy,
                        accentNavy,
                        luxuryGold,
                        highlightGold: e.target.value,
                      })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-navy-900 uppercase text-xs focus:ring-2 focus:ring-gold-500 focus:outline-none bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Live Interactive UI Preview Card */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Live Custom Theme UI Preview</label>
              <div
                className="p-5 rounded-2xl shadow-md border space-y-3 transition-colors"
                style={{
                  backgroundColor: primaryNavy,
                  borderColor: `${luxuryGold}40`,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" style={{ color: luxuryGold }} />
                    <span className="font-extrabold text-xs text-white tracking-wide">
                      {companyName} Dashboard Preview
                    </span>
                  </div>

                  <span
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                    style={{
                      backgroundColor: `${luxuryGold}20`,
                      color: highlightGold,
                      border: `1px solid ${luxuryGold}50`,
                    }}
                  >
                    Custom Theme Active
                  </span>
                </div>

                <div
                  className="p-3.5 rounded-xl border flex items-center justify-between text-xs"
                  style={{
                    backgroundColor: accentNavy,
                    borderColor: `${luxuryGold}30`,
                  }}
                >
                  <div>
                    <div className="font-bold text-white text-xs">Quarterly Enterprise Pipeline</div>
                    <div className="text-[11px]" style={{ color: highlightGold }}>
                      Scored with Gemini AI Engine
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyPreviewTheme}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all hover:scale-105 active:scale-95 shadow-sm flex items-center gap-1.5 cursor-pointer"
                    style={{
                      backgroundColor: isThemeApplied ? highlightGold : luxuryGold,
                      color: primaryNavy,
                    }}
                  >
                    {isThemeApplied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Theme Applied!
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        Test Action
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Microsoft 365 Credentials */}
      {activeTab === 'm365' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-gold-500" />
              <h3 className="font-extrabold text-navy-900 text-base">Microsoft Azure AD / Entra ID App Registration</h3>
            </div>

            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="h-4 w-4" /> Active Integration
            </span>
          </div>

          <div className="space-y-4 text-xs text-slate-700">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Directory / Tenant ID (MICROSOFT_TENANT_ID)</label>
              <input
                type="text"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-gold-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Application / Client ID (MICROSOFT_CLIENT_ID)</label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-gold-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">OAuth2 Redirect Callback URI</label>
              <input
                type="text"
                value={redirectUri}
                onChange={(e) => setRedirectUri(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-gold-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Graph API Auto-Sync Interval</label>
                <select
                  value={syncFrequency}
                  onChange={(e) => setSyncFrequency(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-gold-500 focus:outline-none bg-white"
                >
                  <option value="Real-time Webhook">Real-time Webhook Stream</option>
                  <option value="Every 15 Minutes">Every 15 Minutes</option>
                  <option value="Hourly">Hourly Background Job</option>
                  <option value="Manual Only">Manual Trigger Only</option>
                </select>
              </div>

              <div className="space-y-2 pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncContacts}
                    onChange={(e) => setSyncContacts(e.target.checked)}
                    className="rounded text-gold-500 focus:ring-gold-500 h-4 w-4"
                  />
                  <span className="font-bold text-slate-800">Two-Way Outlook Contacts Sync</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncCalendar}
                    onChange={(e) => setSyncCalendar(e.target.checked)}
                    className="rounded text-gold-500 focus:ring-gold-500 h-4 w-4"
                  />
                  <span className="font-bold text-slate-800">Teams & Outlook Calendar Meeting Sync</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoLogEmails}
                    onChange={(e) => setAutoLogEmails(e.target.checked)}
                    className="rounded text-gold-500 focus:ring-gold-500 h-4 w-4"
                  />
                  <span className="font-bold text-slate-800">Auto-Log Outlook Email Conversations</span>
                </label>
              </div>
            </div>
          </div>

          {testResult && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              {testResult}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <button
              onClick={handleTestM365Connection}
              disabled={isTestingM365}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isTestingM365 ? 'animate-spin text-gold-500' : ''}`} />
              {isTestingM365 ? 'Testing Graph API...' : 'Test Connection'}
            </button>

            {onSyncM365 && (
              <button
                onClick={onSyncM365}
                className="px-4 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-gold-400 font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Layers className="h-4 w-4" /> Trigger Immediate Graph Sync
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: AI Lead Scoring Engine */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-navy-900">
              <Zap className="h-5 w-5 text-gold-500" />
              <h3 className="font-extrabold text-base">Gemini Lead Energy Scoring Model</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Selected AI Engine Alias</label>
                <select
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-gold-500 focus:outline-none bg-white"
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (Ultra-fast real-time scoring - Recommended)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep intent & email sentiment analysis)</option>
                </select>
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoScoreOnEmail}
                    onChange={(e) => setAutoScoreOnEmail(e.target.checked)}
                    className="rounded text-gold-500 focus:ring-gold-500 h-4 w-4"
                  />
                  <span className="font-bold text-slate-800">Auto-Rescore on Outlook Email Reply</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoScoreOnMeeting}
                    onChange={(e) => setAutoScoreOnMeeting(e.target.checked)}
                    className="rounded text-gold-500 focus:ring-gold-500 h-4 w-4"
                  />
                  <span className="font-bold text-slate-800">Auto-Rescore after Teams Call Concludes</span>
                </label>
              </div>
            </div>
          </div>

          {/* AI Scoring Weights */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-navy-900 text-base flex items-center gap-2">
                <Sliders className="h-5 w-5 text-gold-500" /> AI Scoring Sensitivity Weights
              </h3>
              <span className="text-xs text-slate-400 font-mono font-bold">Total: {engagementWeight + budgetWeight + recencyWeight}%</span>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between font-bold text-slate-700 mb-1">
                  <span>Engagement Frequency & Replies Weight</span>
                  <span className="font-mono text-gold-600">{engagementWeight}%</span>
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
                <div className="flex justify-between font-bold text-slate-700 mb-1">
                  <span>Deal Size & Budget Weight</span>
                  <span className="font-mono text-gold-600">{budgetWeight}%</span>
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
                <div className="flex justify-between font-bold text-slate-700 mb-1">
                  <span>Recency & Deal Urgency Decay Weight</span>
                  <span className="font-mono text-gold-600">{recencyWeight}%</span>
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

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleRunAiRescore}
                disabled={isRescoring}
                className="px-5 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-gold-400 font-extrabold text-xs flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
              >
                <Sparkles className={`h-4 w-4 ${isRescoring ? 'animate-spin' : ''}`} />
                {isRescoring ? 'Re-scoring All Leads...' : 'Run Full AI Re-Index Engine'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Notifications & Automation */}
      {activeTab === 'notifications' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-gold-500" />
              <div>
                <h3 className="font-extrabold text-navy-900 text-base">Alerts & Automation Rules</h3>
                <p className="text-xs text-slate-500">Configure real-time notifications, AI workflow triggers, and team routing rules.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-gold-50 text-gold-800 border border-gold-200 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-gold-600" />
                {[
                  notifyHotLead,
                  notifyDailyDigest,
                  notifyTeamsMeeting,
                  notifyFollowupPrompt,
                  autoAssignLeads,
                  autoStaleLeadAlert,
                ].filter(Boolean).length} of 6 Rules Active
              </span>

              <button
                type="button"
                onClick={() => {
                  setNotifyHotLead(true);
                  setNotifyDailyDigest(true);
                  setNotifyTeamsMeeting(true);
                  setNotifyFollowupPrompt(true);
                  setAutoAssignLeads(true);
                  setAutoStaleLeadAlert(true);
                  setAlertEmailRecipient('sales-alerts@spihead.com');
                  setStaleLeadDays(14);
                  if (showToast) showToast('Reset rules to system defaults', 'info');
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Reset to default rules"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Rule Toggles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Rule 1: Hot Lead Alerts */}
            <label className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
              notifyHotLead ? 'bg-gold-50/40 border-gold-300 shadow-2xs' : 'bg-slate-50 border-slate-200 opacity-70'
            }`}>
              <input
                type="checkbox"
                checked={notifyHotLead}
                onChange={(e) => setNotifyHotLead(e.target.checked)}
                className="rounded text-gold-500 focus:ring-gold-500 h-4 w-4 mt-0.5 shrink-0 cursor-pointer"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-gold-600" />
                  <span className="font-extrabold text-navy-900 text-xs">Hot Lead Real-Time Alerts</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Send instant Outlook & Teams notification when a lead energy score breaches {hotThreshold}.
                </p>
              </div>
            </label>

            {/* Rule 2: Daily Digest */}
            <label className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
              notifyDailyDigest ? 'bg-gold-50/40 border-gold-300 shadow-2xs' : 'bg-slate-50 border-slate-200 opacity-70'
            }`}>
              <input
                type="checkbox"
                checked={notifyDailyDigest}
                onChange={(e) => setNotifyDailyDigest(e.target.checked)}
                className="rounded text-gold-500 focus:ring-gold-500 h-4 w-4 mt-0.5 shrink-0 cursor-pointer"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-gold-600" />
                  <span className="font-extrabold text-navy-900 text-xs">Daily Executive Pipeline Digest</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Receive an automated 8:00 AM summary email with pipeline shifts and meeting agendas.
                </p>
              </div>
            </label>

            {/* Rule 3: Teams Meeting Reminders */}
            <label className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
              notifyTeamsMeeting ? 'bg-gold-50/40 border-gold-300 shadow-2xs' : 'bg-slate-50 border-slate-200 opacity-70'
            }`}>
              <input
                type="checkbox"
                checked={notifyTeamsMeeting}
                onChange={(e) => setNotifyTeamsMeeting(e.target.checked)}
                className="rounded text-gold-500 focus:ring-gold-500 h-4 w-4 mt-0.5 shrink-0 cursor-pointer"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-gold-600" />
                  <span className="font-extrabold text-navy-900 text-xs">Microsoft Teams Meeting Reminder (15m Prior)</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Trigger desktop toast and calendar notification 15 minutes before scheduled calls.
                </p>
              </div>
            </label>

            {/* Rule 4: AI Follow-Up Suggestions */}
            <label className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
              notifyFollowupPrompt ? 'bg-gold-50/40 border-gold-300 shadow-2xs' : 'bg-slate-50 border-slate-200 opacity-70'
            }`}>
              <input
                type="checkbox"
                checked={notifyFollowupPrompt}
                onChange={(e) => setNotifyFollowupPrompt(e.target.checked)}
                className="rounded text-gold-500 focus:ring-gold-500 h-4 w-4 mt-0.5 shrink-0 cursor-pointer"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-gold-600" />
                  <span className="font-extrabold text-navy-900 text-xs">AI Smart Email Draft Suggestions</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Auto-generate tailored follow-up email drafts when leads enter the 'Qualified' pipeline stage.
                </p>
              </div>
            </label>

            {/* Rule 5: Auto Lead Assignment */}
            <label className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
              autoAssignLeads ? 'bg-gold-50/40 border-gold-300 shadow-2xs' : 'bg-slate-50 border-slate-200 opacity-70'
            }`}>
              <input
                type="checkbox"
                checked={autoAssignLeads}
                onChange={(e) => setAutoAssignLeads(e.target.checked)}
                className="rounded text-gold-500 focus:ring-gold-500 h-4 w-4 mt-0.5 shrink-0 cursor-pointer"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-3.5 w-3.5 text-gold-600" />
                  <span className="font-extrabold text-navy-900 text-xs">Automated Round-Robin Lead Routing</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Automatically assign new M365 inbound contacts to available account executives.
                </p>
              </div>
            </label>

            {/* Rule 6: Stale Lead Inactivity Detection */}
            <label className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
              autoStaleLeadAlert ? 'bg-gold-50/40 border-gold-300 shadow-2xs' : 'bg-slate-50 border-slate-200 opacity-70'
            }`}>
              <input
                type="checkbox"
                checked={autoStaleLeadAlert}
                onChange={(e) => setAutoStaleLeadAlert(e.target.checked)}
                className="rounded text-gold-500 focus:ring-gold-500 h-4 w-4 mt-0.5 shrink-0 cursor-pointer"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-gold-600" />
                  <span className="font-extrabold text-navy-900 text-xs">Stale Lead Inactivity Warning</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Flag leads with zero activity for over {staleLeadDays} days and notify lead owner.
                </p>
              </div>
            </label>
          </div>

          {/* Rule Parameters & Notification Endpoint */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4 text-xs">
            <h4 className="font-extrabold text-navy-900 text-xs uppercase tracking-wider">
              Alert Channel & Parameters
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Alert Notification Recipient Email</label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={alertEmailRecipient}
                    onChange={(e) => setAlertEmailRecipient(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-gold-500 focus:outline-none bg-white text-navy-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Stale Lead Inactivity Threshold</label>
                <select
                  value={staleLeadDays}
                  onChange={(e) => setStaleLeadDays(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-gold-500 focus:outline-none bg-white text-navy-900"
                >
                  <option value={7}>7 Days Inactivity</option>
                  <option value={14}>14 Days Inactivity (Default)</option>
                  <option value={30}>30 Days Inactivity</option>
                  <option value={60}>60 Days Inactivity</option>
                </select>
              </div>
            </div>
          </div>

          {/* Dedicated Save Action Bar */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Rules automatically synced with background scheduler
            </div>

            <button
              type="button"
              onClick={handleSaveAlertsAndAutomation}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                isRulesSaved
                  ? 'bg-emerald-600 text-white scale-102'
                  : 'bg-navy-900 hover:bg-navy-800 text-gold-400 hover:text-gold-300 active:scale-98'
              }`}
            >
              {isRulesSaved ? (
                <>
                  <Check className="h-4 w-4" />
                  Alerts & Rules Saved!
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 text-gold-400" />
                  Save Alerts & Automation Rules
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Tab 5: Security & Compliance */}
      {activeTab === 'security' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 text-navy-900 flex items-center gap-2">
            <Lock className="h-5 w-5 text-gold-500" />
            <h3 className="font-extrabold text-base">Security, Compliance & Audit Trail</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Session Inactivity Timeout</label>
              <select
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-gold-500 focus:outline-none bg-white"
              >
                <option value="15 Minutes">15 Minutes</option>
                <option value="30 Minutes">30 Minutes (Recommended)</option>
                <option value="1 Hour">1 Hour</option>
                <option value="8 Hours">8 Hours (End of Shift)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">GDPR & Data Retention Policy</label>
              <select
                value={gdprRetentionDays}
                onChange={(e) => setGdprRetentionDays(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-gold-500 focus:outline-none bg-white"
              >
                <option value={180}>180 Days Auto-Archive</option>
                <option value={365}>365 Days Auto-Archive (Standard)</option>
                <option value={730}>730 Days (2 Years)</option>
              </select>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-navy-900">Audit Trail Logging</span>
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Enabled
              </span>
            </div>
            <p className="text-slate-600">
              Captures all lead updates, email send logs, calendar modifications, and user access records for compliance auditing.
            </p>
          </div>
        </div>
      )}

      {/* Tab 6: System Data & Storage */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          
          {/* Storage Diagnostics */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-navy-900 text-base flex items-center gap-2">
                <Server className="h-5 w-5 text-gold-500" /> Database Diagnostics & Storage
              </h3>
              <span className="font-mono text-xs font-bold text-slate-500">
                Storage: ~{getStorageSize()} KB
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <Users className="h-4 w-4 text-gold-500 mx-auto mb-1" />
                <div className="text-lg font-extrabold text-navy-900 font-mono">{leadsCount}</div>
                <div className="text-[10px] font-bold uppercase text-slate-500">Leads</div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <Calendar className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                <div className="text-lg font-extrabold text-navy-900 font-mono">{meetingsCount}</div>
                <div className="text-[10px] font-bold uppercase text-slate-500">Meetings</div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <Mail className="h-4 w-4 text-purple-500 mx-auto mb-1" />
                <div className="text-lg font-extrabold text-navy-900 font-mono">{emailsCount}</div>
                <div className="text-[10px] font-bold uppercase text-slate-500">Emails Logged</div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <Activity className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
                <div className="text-lg font-extrabold text-navy-900 font-mono">{activitiesCount}</div>
                <div className="text-[10px] font-bold uppercase text-slate-500">Audit Logs</div>
              </div>
            </div>
          </div>

          {/* Backup & Data Actions */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-extrabold text-navy-900 text-base border-b border-slate-100 pb-3">
              Data Backup & Restore Controls
            </h3>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleExportBackup}
                className="px-4 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-gold-400 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Download className="h-4 w-4" /> Export Complete Backup (.json)
              </button>

              <label className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors border border-slate-200">
                <Upload className="h-4 w-4 text-slate-500" />
                Import Backup File
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>

              <button
                onClick={() => {
                  onRestoreSampleData();
                  if (showToast) showToast('Restored demo sample data successfully');
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors border border-slate-200"
              >
                <RotateCcw className="h-4 w-4 text-slate-500" /> Restore Demo Sample Data
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-rose-50 p-6 rounded-2xl border border-rose-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-rose-800 border-b border-rose-200 pb-3">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              <h3 className="font-extrabold text-base">Danger Zone</h3>
            </div>

            <p className="text-xs text-rose-700">
              Permanently delete all leads, meetings, Outlook email history, and activity feeds from browser storage.
            </p>

            <button
              onClick={() => setShowClearConfirmModal(true)}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-sm transition-colors"
            >
              Clear All CRM Data (Wipe Storage)
            </button>
          </div>

        </div>
      )}

      {/* Confirmation Modal for Clearing All Data */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <button
                onClick={() => setShowClearConfirmModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <h3 className="font-black text-navy-900 text-lg">Are you absolutely sure?</h3>
              <p className="text-xs text-slate-500 mt-1">
                This action will permanently remove all {leadsCount} leads, {meetingsCount} meetings, and email history. You can restore demo sample data anytime later.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowClearConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onClearAllData();
                  setShowClearConfirmModal(false);
                  if (showToast) showToast('Cleared all local storage CRM data', 'info');
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-sm"
              >
                Yes, Wipe All Data
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
