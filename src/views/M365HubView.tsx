import React, { useState } from 'react';
import { M365Account, Lead, Meeting } from '../types/crm';
import { m365Service } from '../lib/m365Service';
import { crmStore } from '../lib/store';
import {
  Layers,
  CheckCircle2,
  Mail,
  Video,
  Users,
  Calendar,
  Download,
  RefreshCw,
  ShieldCheck,
  Building,
  FileText,
  Terminal,
  Send,
  Plus,
  ExternalLink,
  Zap,
  Sparkles,
  Clock,
  HardDrive,
  BarChart3,
  MessageSquare,
  Copy,
  Check,
  X,
  AlertCircle
} from 'lucide-react';

interface M365HubViewProps {
  account: M365Account;
  leads: Lead[];
  meetings: Meeting[];
  onSyncAll: () => void;
  onToggleConnect: () => void;
  showToast?: (text: string, type?: 'success' | 'info') => void;
}

export const M365HubView: React.FC<M365HubViewProps> = ({
  account,
  leads,
  meetings,
  onSyncAll,
  onToggleConnect,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'outlook' | 'teams' | 'contacts' | 'onedrive' | 'excel' | 'explorer'
  >('overview');

  const [syncing, setSyncing] = useState(false);

  // Tab 2: Outlook Mail State
  const [selectedLeadForMail, setSelectedLeadForMail] = useState<string>(leads[0]?.id || '');
  const [emailSubject, setEmailSubject] = useState<string>('SPIHEAD Enterprise CRM & Microsoft 365 Brief');
  const [emailTemplate, setEmailTemplate] = useState<string>('architecture');
  const [emailBody, setEmailBody] = useState<string>(
    `Hi Sarah,\n\nFollowing up on our discussion regarding your enterprise CRM requirements. Our platform seamlessly connects with your existing Microsoft 365 tenant, automating Outlook emails, Teams video calls, and calendar scheduling.\n\nLet me know if you would like to schedule a 15-minute Teams demo!\n\nBest regards,\n${account.displayName}`
  );
  const [isSendingMail, setIsSendingMail] = useState(false);

  // Tab 3: Teams Meeting State
  const [teamsTitle, setTeamsTitle] = useState('Executive Sales Strategy & M365 Demo');
  const [teamsLeadId, setTeamsLeadId] = useState(leads[0]?.id || '');
  const [teamsDate, setTeamsDate] = useState(
    new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10)
  );
  const [teamsTime, setTeamsTime] = useState('14:00');
  const [teamsDuration, setTeamsDuration] = useState(30);
  const [webhookMessage, setWebhookMessage] = useState('🎉 Deal Milestone: Requested CRM Security Review');
  const [isSendingWebhook, setIsSendingWebhook] = useState(false);

  // Tab 4: Contacts State
  const sampleDirectory = m365Service.getSampleDirectoryContacts();
  const [importedDirectoryEmails, setImportedDirectoryEmails] = useState<string[]>([]);

  // Tab 5: Excel Custom Exporter State
  const [excelFields, setExcelFields] = useState<string[]>([
    'Name',
    'Company',
    'Email',
    'Budget ($)',
    'Status',
    'AI Energy Score (%)',
    'Urgency',
    'M365 Synced',
  ]);

  // Tab 6: Graph Explorer State
  const [graphEndpoint, setGraphEndpoint] = useState<string>('GET /v1.0/me');
  const [graphResponse, setGraphResponse] = useState<any>(
    m365Service.simulateGraphApiRequest('GET /v1.0/me', leads, meetings, account)
  );
  const [isCopiedJson, setIsCopiedJson] = useState(false);

  // Quick Toast Helper
  const triggerToast = (msg: string, type: 'success' | 'info' = 'success') => {
    if (showToast) {
      showToast(msg, type);
    }
  };

  const handleManualSync = () => {
    setSyncing(true);
    setTimeout(() => {
      onSyncAll();
      setSyncing(false);
      triggerToast('Microsoft Graph API sync completed successfully!');
    }, 800);
  };

  // Handle Outlook Email Template Change
  const handleTemplateChange = (templateKey: string) => {
    setEmailTemplate(templateKey);
    const lead = leads.find((l) => l.id === selectedLeadForMail) || leads[0];
    const name = lead ? lead.name.split(' ')[0] : 'there';
    const company = lead ? lead.company : 'your team';

    switch (templateKey) {
      case 'architecture':
        setEmailSubject(`Microsoft 365 Architecture Brief - ${company}`);
        setEmailBody(
          `Hi ${name},\n\nAttached is our technical architecture brief outlining how SPIHEAD integrates with ${company}'s Microsoft 365 tenant (Azure AD, Graph API, and Outlook Mail).\n\nLooking forward to reviewing this on our upcoming call!\n\nBest regards,\n${account.displayName}`
        );
        break;
      case 'proposal':
        setEmailSubject(`Executive Proposal & SLA Terms - ${company}`);
        setEmailBody(
          `Hi ${name},\n\nWe have generated the official executive proposal deck and service agreement for ${company}. It includes full M365 directory sync and automated lead energy tracking.\n\nPlease let us know if you have any questions!\n\nBest regards,\n${account.displayName}`
        );
        break;
      case 'review':
        setEmailSubject(`Quarterly Pipeline & Strategy Review - ${company}`);
        setEmailBody(
          `Hi ${name},\n\nI would like to schedule a quick 15-minute Microsoft Teams catch-up to review our enterprise pipeline roadmap for Q3/Q4.\n\nBest regards,\n${account.displayName}`
        );
        break;
      default:
        break;
    }
  };

  // Send Email
  const handleSendOutlookMail = (e: React.FormEvent) => {
    e.preventDefault();
    const lead = leads.find((l) => l.id === selectedLeadForMail) || leads[0];
    if (!lead) return;

    setIsSendingMail(true);
    setTimeout(async () => {
      await m365Service.sendOutlookEmail(lead, emailSubject, emailBody, emailTemplate);
      crmStore.addEmail({
        leadId: lead.id,
        leadName: lead.name,
        leadEmail: lead.email,
        subject: emailSubject,
        body: emailBody,
        templateUsed: emailTemplate,
      });
      setIsSendingMail(false);
      triggerToast(`Outlook email sent to ${lead.email} via Microsoft Graph!`);
    }, 600);
  };

  // Schedule Teams Meeting
  const handleCreateTeamsMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    const lead = leads.find((l) => l.id === teamsLeadId) || leads[0];
    const leadName = lead ? `${lead.name} (${lead.company})` : 'Executive Partner';
    const leadEmail = lead ? lead.email : account.email;

    const newMeeting = crmStore.addMeeting({
      leadId: lead?.id || 'lead-custom',
      leadName,
      leadEmail,
      title: teamsTitle,
      date: teamsDate,
      time: teamsTime,
      durationMinutes: Number(teamsDuration),
      location: 'Microsoft Teams Call',
      isTeamsMeeting: true,
      status: 'Scheduled',
      notes: 'Scheduled via Microsoft 365 Suite Hub',
    });

    triggerToast(`Microsoft Teams Call "${newMeeting.title}" created & sync'd with Calendar!`);
  };

  // Import Sample Directory Contact
  const handleImportDirectoryContact = (dirContact: ReturnType<typeof m365Service.getSampleDirectoryContacts>[0]) => {
    const newLead = crmStore.addLead({
      name: dirContact.name,
      email: dirContact.email,
      phone: dirContact.phone,
      company: dirContact.company,
      budget: dirContact.budget,
      status: 'New',
      urgency: true,
      engagement: 4,
      replyCount: 0,
      industry: dirContact.industry,
      notes: `Imported directly from Microsoft 365 Outlook People Directory. (${dirContact.jobTitle})`,
      lastContact: null,
      m365Synced: true,
      tags: ['M365 Directory', 'Inbound'],
    });

    setImportedDirectoryEmails((prev) => [...prev, dirContact.email]);
    triggerToast(`Imported ${newLead.name} into CRM from M365 Outlook People Directory!`);
  };

  // Execute Graph Explorer Query
  const handleRunGraphQuery = (ep: string) => {
    setGraphEndpoint(ep);
    const res = m365Service.simulateGraphApiRequest(ep, leads, meetings, account);
    setGraphResponse(res);
  };

  // Copy Graph Response JSON
  const handleCopyGraphJson = () => {
    navigator.clipboard.writeText(JSON.stringify(graphResponse, null, 2));
    setIsCopiedJson(true);
    setTimeout(() => setIsCopiedJson(false), 2000);
    triggerToast('Graph response payload copied to clipboard!', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-navy-900 text-white p-6 rounded-2xl border border-navy-700 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Layers className="h-6 w-6 text-gold-400" />
            <h1 className="text-2xl font-black text-gold-400">Microsoft 365 Suite Hub</h1>
          </div>
          <p className="text-xs text-navy-200">
            Native Graph API endpoints for Outlook Mail, Teams Calls, Outlook Contacts, OneDrive, and Excel Reports.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleManualSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-navy-950 font-extrabold text-xs shadow-sm transition-transform active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing Graph API...' : 'Sync All M365 Data'}
          </button>
        </div>
      </div>

      {/* Account Status Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-navy-900 text-gold-400 border border-gold-400/30 flex items-center justify-center font-black text-base shadow-sm">
              M365
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-navy-900 text-base">{account.displayName}</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-navy-100 text-navy-800">
                  {account.jobTitle || 'Enterprise Executive'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono">{account.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                account.isConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {account.isConnected ? 'Connected & Active' : 'Disconnected'}
            </span>

            <button
              type="button"
              onClick={() => {
                onToggleConnect();
                triggerToast(account.isConnected ? 'Disconnected Microsoft 365' : 'Connected Microsoft 365');
              }}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              {account.isConnected ? 'Disconnect' : 'Connect Account'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs pt-2">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-400 uppercase font-bold text-[10px] block">Tenant Organization</span>
            <span className="font-bold text-navy-900 block truncate">{account.tenantName}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-400 uppercase font-bold text-[10px] block">Subscription Tier</span>
            <span className="font-bold text-navy-900 block">{account.subscriptionType}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-400 uppercase font-bold text-[10px] block">Synced Contacts</span>
            <span className="font-bold font-mono text-navy-900 text-sm block">{leads.length} Contacts</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-400 uppercase font-bold text-[10px] block">Last Graph Sync</span>
            <span className="font-mono text-slate-700 block">
              {account.lastSyncedAt ? new Date(account.lastSyncedAt).toLocaleTimeString() : 'Just now'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200 text-xs font-bold scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-navy-900 text-gold-400 shadow-sm'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Suite Architecture
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('outlook')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
            activeTab === 'outlook'
              ? 'bg-navy-900 text-gold-400 shadow-sm'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <Mail className="h-4 w-4 text-teal-500" />
          Outlook Mail
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('teams')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
            activeTab === 'teams'
              ? 'bg-navy-900 text-gold-400 shadow-sm'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <Video className="h-4 w-4 text-purple-500" />
          Microsoft Teams
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('contacts')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
            activeTab === 'contacts'
              ? 'bg-navy-900 text-gold-400 shadow-sm'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <Users className="h-4 w-4 text-indigo-500" />
          Outlook People
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('onedrive')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
            activeTab === 'onedrive'
              ? 'bg-navy-900 text-gold-400 shadow-sm'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <HardDrive className="h-4 w-4 text-blue-500" />
          OneDrive & Proposals
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('excel')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
            activeTab === 'excel'
              ? 'bg-navy-900 text-gold-400 shadow-sm'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <Download className="h-4 w-4 text-emerald-500" />
          Excel & Power BI
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('explorer')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
            activeTab === 'explorer'
              ? 'bg-navy-900 text-gold-400 shadow-sm'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <Terminal className="h-4 w-4 text-gold-500" />
          Graph Explorer
        </button>
      </div>

      {/* TAB 1: OVERVIEW & SUITE HEALTH */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-navy-900 text-sm">Outlook Mail API</h4>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      200 OK
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-slate-400">/me/sendMail</span>
              </div>
              <p className="text-xs text-slate-500">
                Sends tracked messages to leads directly via Microsoft Exchange online.
              </p>
              <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="text-slate-400">Total Sent:</span>
                <span className="font-mono font-bold text-navy-900">{account.syncedEmailsCount} Messages</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-purple-50 text-purple-700">
                    <Video className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-navy-900 text-sm">Microsoft Teams Meetings</h4>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      200 OK
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-slate-400">/me/events</span>
              </div>
              <p className="text-xs text-slate-500">
                Generates instant Microsoft Teams join URLs and schedules calendar invitations.
              </p>
              <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="text-slate-400">Scheduled:</span>
                <span className="font-mono font-bold text-navy-900">{meetings.length} Meetings</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-navy-900 text-sm">Outlook People Directory</h4>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      200 OK
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-slate-400">/me/contacts</span>
              </div>
              <p className="text-xs text-slate-500">
                Bi-directional sync between CRM leads and Outlook contact records.
              </p>
              <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="text-slate-400">Active Contacts:</span>
                <span className="font-mono font-bold text-navy-900">{leads.length} Contacts</span>
              </div>
            </div>
          </div>

          {/* Active OAuth Scopes */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <ShieldCheck className="h-5 w-5 text-gold-500" />
              <h3 className="font-extrabold text-navy-900 text-base">Active Microsoft Graph OAuth Permissions</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {account.scopes.map((sc) => (
                <div
                  key={sc}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1"
                >
                  <span className="text-[11px] font-mono font-extrabold text-navy-900 block truncate">{sc}</span>
                  <span className="text-[10px] font-bold text-emerald-600 block">Granted</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OUTLOOK MAIL */}
      {activeTab === 'outlook' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-teal-600" />
                <h3 className="font-extrabold text-navy-900 text-base">Outlook Direct Mail Dispatch</h3>
              </div>
              <span className="text-xs font-mono bg-teal-50 text-teal-800 px-2.5 py-1 rounded-full border border-teal-200 font-bold">
                POST /v1.0/me/sendMail
              </span>
            </div>

            <form action="#" onSubmit={handleSendOutlookMail} className="space-y-4 text-xs">
              <div>
                <label htmlFor="m365-target-lead" className="block font-bold text-slate-700 mb-1">Select Target Lead</label>
                <select
                  id="m365-target-lead"
                  name="selectedLeadForMail"
                  value={selectedLeadForMail}
                  onChange={(e) => setSelectedLeadForMail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-gold-500 focus:outline-none bg-white text-navy-900"
                >
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} — {l.company} ({l.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="m365-template" className="block font-bold text-slate-700 mb-1">Select Email Template</label>
                  <select
                    id="m365-template"
                    name="emailTemplate"
                    value={emailTemplate}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-gold-500 focus:outline-none bg-white text-navy-900"
                  >
                    <option value="architecture">M365 Architecture Brief</option>
                    <option value="proposal">Executive Proposal & SLA Deck</option>
                    <option value="review">Quarterly Strategy Review Request</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="m365-subject" className="block font-bold text-slate-700 mb-1">Email Subject Line</label>
                  <input
                    id="m365-subject"
                    name="emailSubject"
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-gold-500 focus:outline-none bg-white text-navy-900"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="m365-body" className="block font-bold text-slate-700 mb-1">Email Body Content</label>
                <textarea
                  id="m365-body"
                  name="emailBody"
                  rows={6}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  required
                  className="w-full p-3 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-gold-500 focus:outline-none bg-slate-50 text-navy-900"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isSendingMail}
                className="w-full py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-gold-400 font-extrabold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                {isSendingMail ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-gold-400" />
                    Sending via Microsoft Graph...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 text-gold-400" />
                    Dispatch Outlook Mail Message
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-extrabold text-navy-900 text-sm border-b border-slate-100 pb-2">
              Recent Sent Messages
            </h3>
            <div className="space-y-3">
              {crmStore.getEmails().slice(0, 5).map((m) => (
                <div key={m.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between items-center font-bold text-navy-900">
                    <span>{m.leadName}</span>
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Sent</span>
                  </div>
                  <p className="text-slate-600 font-medium truncate">{m.subject}</p>
                  <span className="text-[10px] text-slate-400 font-mono block">
                    {new Date(m.sentAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MICROSOFT TEAMS */}
      {activeTab === 'teams' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Teams Scheduler */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Video className="h-5 w-5 text-purple-600" />
              <h3 className="font-extrabold text-navy-900 text-base">Schedule Microsoft Teams Meeting</h3>
            </div>

            <form action="#" onSubmit={handleCreateTeamsMeeting} className="space-y-4 text-xs">
              <div>
                <label htmlFor="teams-title" className="block font-bold text-slate-700 mb-1">Meeting Title</label>
                <input
                  id="teams-title"
                  name="teamsTitle"
                  type="text"
                  value={teamsTitle}
                  onChange={(e) => setTeamsTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-gold-500 focus:outline-none bg-white text-navy-900"
                />
              </div>

              <div>
                <label htmlFor="teams-lead" className="block font-bold text-slate-700 mb-1">Lead Attendee</label>
                <select
                  id="teams-lead"
                  name="teamsLeadId"
                  value={teamsLeadId}
                  onChange={(e) => setTeamsLeadId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-gold-500 focus:outline-none bg-white text-navy-900"
                >
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.company})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="teams-date" className="block font-bold text-slate-700 mb-1">Date</label>
                  <input
                    id="teams-date"
                    name="teamsDate"
                    type="date"
                    value={teamsDate}
                    onChange={(e) => setTeamsDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-gold-500 focus:outline-none bg-white text-navy-900"
                  />
                </div>
                <div>
                  <label htmlFor="teams-time" className="block font-bold text-slate-700 mb-1">Time</label>
                  <input
                    id="teams-time"
                    name="teamsTime"
                    type="time"
                    value={teamsTime}
                    onChange={(e) => setTeamsTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-gold-500 focus:outline-none bg-white text-navy-900"
                  />
                </div>
                <div>
                  <label htmlFor="teams-duration" className="block font-bold text-slate-700 mb-1">Duration</label>
                  <select
                    id="teams-duration"
                    name="teamsDuration"
                    value={teamsDuration}
                    onChange={(e) => setTeamsDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-gold-500 focus:outline-none bg-white text-navy-900"
                  >
                    <option value={15}>15 Min</option>
                    <option value={30}>30 Min</option>
                    <option value={45}>45 Min</option>
                    <option value={60}>60 Min</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <Video className="h-4 w-4" />
                Generate Teams Join Link & Calendar Sync
              </button>
            </form>
          </div>

          {/* Teams Scheduled List & Channel Simulator */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-extrabold text-navy-900 text-sm border-b border-slate-100 pb-2">
                Scheduled Teams Calls ({meetings.length})
              </h3>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {meetings.map((m) => (
                  <div key={m.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-navy-900">{m.title}</h4>
                        <span className="text-slate-500 font-medium">{m.leadName}</span>
                      </div>
                      <span className="font-mono text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-bold">
                        {m.date} @ {m.time}
                      </span>
                    </div>

                    {m.teamsJoinUrl && (
                      <a
                        href={m.teamsJoinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px]"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Join Teams Meeting
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Teams Webhook Simulator */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-extrabold text-navy-900 text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-purple-600" />
                Send Teams Channel Notification Ping
              </h3>
              <label htmlFor="teams-webhook-msg" className="sr-only">Teams Channel Message</label>
              <input
                id="teams-webhook-msg"
                name="webhookMessage"
                aria-label="Teams Channel Notification Message"
                type="text"
                value={webhookMessage}
                onChange={(e) => setWebhookMessage(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-xs focus:ring-2 focus:ring-gold-500 focus:outline-none bg-white text-navy-900"
              />
              <button
                type="button"
                onClick={() => {
                  setIsSendingWebhook(true);
                  setTimeout(() => {
                    setIsSendingWebhook(false);
                    triggerToast('Ping posted to #enterprise-sales Teams Channel!');
                  }, 500);
                }}
                disabled={isSendingWebhook}
                className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
              >
                {isSendingWebhook ? 'Posting to Teams...' : 'Post Message to #enterprise-sales Channel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: OUTLOOK CONTACTS / PEOPLE */}
      {activeTab === 'contacts' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-navy-900 text-base flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-600" />
                  Microsoft 365 Directory & People Contacts
                </h3>
                <p className="text-xs text-slate-500">
                  Import contacts directly from Microsoft 365 organization directory into SPIHEAD CRM.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  m365Service.syncContactsToM365(leads);
                  triggerToast(`Synced all ${leads.length} contacts with Microsoft 365!`);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                Push All CRM Leads to Outlook People
              </button>
            </div>

            <h4 className="font-extrabold text-navy-900 text-xs uppercase tracking-wider">
              Available M365 Directory Contacts
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {sampleDirectory.map((dc) => {
                const isImported = importedDirectoryEmails.includes(dc.email);
                return (
                  <div
                    key={dc.email}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 flex flex-col justify-between text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex justify-between items-start">
                        <span className="font-extrabold text-navy-900 text-sm block">{dc.name}</span>
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          M365 Directory
                        </span>
                      </div>
                      <span className="text-slate-500 font-medium block">{dc.company}</span>
                      <span className="text-slate-400 text-[11px] font-mono block">{dc.email}</span>
                      <div className="pt-2 flex justify-between text-[11px]">
                        <span className="text-slate-500">Target Budget:</span>
                        <span className="font-bold text-navy-900 font-mono">${dc.budget.toLocaleString()}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isImported}
                      onClick={() => handleImportDirectoryContact(dc)}
                      className={`w-full py-2 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                        isImported
                          ? 'bg-emerald-100 text-emerald-800 cursor-not-allowed'
                          : 'bg-navy-900 hover:bg-navy-800 text-gold-400'
                      }`}
                    >
                      {isImported ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-600" />
                          Imported to CRM
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 text-gold-400" />
                          Import into CRM Leads
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ONEDRIVE & PROPOSALS */}
      {activeTab === 'onedrive' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileText className="h-5 w-5 text-blue-600" />
              <h3 className="font-extrabold text-navy-900 text-base">Generate Executive Proposal Document</h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Generate an official Word/Text proposal file formatted for Microsoft 365 tenant procurement and SLA validation.
            </p>

            <div className="space-y-3">
              {leads.map((lead) => (
                <div key={lead.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-extrabold text-navy-900 block">{lead.name} ({lead.company})</span>
                    <span className="text-slate-500 font-mono">${lead.budget.toLocaleString()} USD Budget</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      m365Service.generateProposalDocument(lead);
                      triggerToast(`Downloaded proposal document for ${lead.company}!`);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download Proposal
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-navy-900 text-base flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-blue-600" />
                OneDrive Cloud Attachments Storage
              </h3>
              <span className="text-xs font-mono text-slate-400">24.5 GB / 1.0 TB Used</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <div>
                    <span className="font-bold text-navy-900 block">Enterprise_CRM_Security_Audit.docx</span>
                    <span className="text-slate-400 font-mono text-[10px]">245.8 KB • SharePoint Sync</span>
                  </div>
                </div>
                <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[10px]">Active</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-rose-600" />
                  <div>
                    <span className="font-bold text-navy-900 block">SPIHEAD_M365_Security_Audit.pdf</span>
                    <span className="text-slate-400 font-mono text-[10px]">1.42 MB • Azure KeyVault Signed</span>
                  </div>
                </div>
                <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[10px]">Verified</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: EXCEL & POWER BI */}
      {activeTab === 'excel' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Download className="h-5 w-5 text-emerald-600" />
              <h3 className="font-extrabold text-navy-900 text-base">Custom Microsoft Excel CSV Builder</h3>
            </div>

            <p className="text-xs text-slate-500">
              Select specific fields to export to Microsoft Excel for executive reporting and pivot table analysis.
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                'ID',
                'Name',
                'Company',
                'Email',
                'Phone',
                'Budget ($)',
                'Status',
                'AI Energy Score (%)',
                'Urgency',
                'Industry',
                'M365 Synced',
                'Last Contact',
              ].map((f) => {
                const fieldSlug = f.toLowerCase().replace(/[^a-z0-9]/g, '-');
                return (
                  <label key={f} htmlFor={`excel-field-${fieldSlug}`} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
                    <input
                      id={`excel-field-${fieldSlug}`}
                      name={`excelField-${fieldSlug}`}
                      type="checkbox"
                      checked={excelFields.includes(f)}
                      onChange={(e) => {
                        if (e.target.checked) setExcelFields([...excelFields, f]);
                        else setExcelFields(excelFields.filter((x) => x !== f));
                      }}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-bold text-navy-900">{f}</span>
                  </label>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                m365Service.exportToExcelCSV(leads, excelFields);
                triggerToast(`Exported ${leads.length} leads to Excel CSV file!`);
              }}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm cursor-pointer"
            >
              Download Excel Spreadsheet (.csv)
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <BarChart3 className="h-5 w-5 text-gold-500" />
              <h3 className="font-extrabold text-navy-900 text-base">Power BI Desktop Dataset Exporter</h3>
            </div>

            <p className="text-xs text-slate-500">
              Export live JSON data structure optimized for Power BI Desktop data modeling and dashboard visualizations.
            </p>

            <div className="p-4 bg-slate-900 text-gold-400 rounded-xl font-mono text-[11px] space-y-1">
              <div>// Power BI Schema Metadata</div>
              <div>{`{ "totalLeads": ${leads.length}, "pipelineUSD": $${leads.reduce((a, c) => a + c.budget, 0).toLocaleString()} }`}</div>
            </div>

            <button
              type="button"
              onClick={() => {
                m365Service.exportPowerBiDataset(leads, meetings, account);
                triggerToast('Downloaded Power BI JSON Dataset!');
              }}
              className="w-full py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-gold-400 font-extrabold text-xs shadow-sm cursor-pointer"
            >
              Export Power BI Dataset (.json)
            </button>
          </div>
        </div>
      )}

      {/* TAB 7: GRAPH EXPLORER */}
      {activeTab === 'explorer' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-gold-500" />
              <h3 className="font-extrabold text-navy-900 text-base">Microsoft Graph REST API Explorer</h3>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-bold">
                Latency: {graphResponse.latencyMs} ms
              </span>
              <button
                type="button"
                onClick={handleCopyGraphJson}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
              >
                {isCopiedJson ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {isCopiedJson ? 'Copied' : 'Copy Payload'}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {[
              'GET /v1.0/me',
              'GET /v1.0/me/contacts',
              'GET /v1.0/me/messages',
              'POST /v1.0/me/sendMail',
              'GET /v1.0/me/events',
              'GET /v1.0/me/drive/root/children',
            ].map((ep) => (
              <button
                key={ep}
                type="button"
                onClick={() => handleRunGraphQuery(ep)}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                  graphEndpoint === ep
                    ? 'bg-navy-900 text-gold-400 shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {ep}
              </button>
            ))}
          </div>

          <div className="relative bg-slate-950 p-4 rounded-xl border border-slate-800 text-emerald-400 font-mono text-xs overflow-x-auto max-h-96 shadow-inner">
            <pre>{JSON.stringify(graphResponse.responseBody, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
