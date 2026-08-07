import React, { useState, useEffect } from 'react';
import { crmStore } from './lib/store';
import { m365Service } from './lib/m365Service';
import { Lead, Meeting, Activity, EmailMessage, M365Account, LeadStatus } from './types/crm';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { DashboardView } from './views/DashboardView';
import { LeadsView } from './views/LeadsView';
import { LeadDetailView } from './views/LeadDetailView';
import { CalendarView } from './views/CalendarView';
import { AnalyticsView } from './views/AnalyticsView';
import { M365HubView } from './views/M365HubView';
import { SettingsView } from './views/SettingsView';
import { ProfileView } from './views/ProfileView';

import { AddLeadModal } from './components/AddLeadModal';
import { ScheduleMeetingModal } from './components/ScheduleMeetingModal';
import { SendEmailModal } from './components/SendEmailModal';

import { CheckCircle2, AlertCircle, X, Sparkles } from 'lucide-react';

import { themeService } from './lib/theme';

export function App() {
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  // Store data states
  const [leads, setLeads] = useState<Lead[]>(crmStore.getLeads());
  const [meetings, setMeetings] = useState<Meeting[]>(crmStore.getMeetings());
  const [activities, setActivities] = useState<Activity[]>(crmStore.getActivities());
  const [emails, setEmails] = useState<EmailMessage[]>(crmStore.getEmails());
  const [m365Account, setM365Account] = useState<M365Account>(m365Service.getAccount());

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleLeadTarget, setScheduleLeadTarget] = useState<Lead | undefined>(undefined);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailLeadTarget, setEmailLeadTarget] = useState<Lead | undefined>(undefined);

  const handleOpenScheduleModal = (lead?: Lead) => {
    setScheduleLeadTarget(lead);
    setIsScheduleModalOpen(true);
  };

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Subscribe to store updates
  useEffect(() => {
    themeService.applyTheme(themeService.getTheme());
    const unsubscribe = crmStore.subscribe(() => {
      setLeads(crmStore.getLeads());
      setMeetings(crmStore.getMeetings());
      setActivities(crmStore.getActivities());
      setEmails(crmStore.getEmails());
      setM365Account(m365Service.getAccount());
    });
    return () => unsubscribe();
  }, []);

  const handleStatusChange = (leadId: string, newStatus: LeadStatus) => {
    crmStore.updateLeadStatus(leadId, newStatus);
    showToast(`Lead status updated to "${newStatus}"`);
  };

  const handleDeleteLead = (leadId: string) => {
    crmStore.deleteLead(leadId);
    if (selectedLeadId === leadId) setSelectedLeadId(null);
    showToast('Lead removed from pipeline', 'info');
  };

  const handleSelectLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    setCurrentView('lead-detail');
  };

  const handleAddLeadSubmit = (leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'score' | 'scoreBreakdown'>) => {
    const newLead = crmStore.addLead(leadData);
    showToast(`Added ${newLead.name}! AI Warmth Score: ${newLead.score}%`);
  };

  const handleScheduleMeetingSubmit = (meetingData: Omit<Meeting, 'id' | 'createdAt' | 'teamsJoinUrl'>) => {
    const newMtg = crmStore.addMeeting(meetingData);
    showToast(`Microsoft Teams Meeting "${newMtg.title}" scheduled!`);
  };

  const handleSendEmailSubmit = (emailData: Omit<EmailMessage, 'id' | 'sentAt' | 'status'>) => {
    const newEmail = crmStore.addEmail(emailData);
    showToast(`Outlook email sent to ${newEmail.leadEmail}!`);
  };

  const handleSyncAllM365 = () => {
    const result = crmStore.syncAllM365();
    showToast(`M365 Sync Complete: ${result.contacts} contacts & ${result.meetings} events updated.`);
  };

  const handleUpdateMeetingStatus = (meetingId: string, status: 'Scheduled' | 'Completed' | 'Cancelled') => {
    crmStore.updateMeetingStatus(meetingId, status);
    showToast(`Meeting status updated to "${status}"`);
  };

  const handleAddActivity = (type: Activity['type'], message: string, leadId?: string, leadName?: string) => {
    crmStore.addActivity({ type, message, leadId, leadName });
    showToast('Activity logged successfully');
  };

  const handleUpdateSalesTarget = (newTarget: number) => {
    const updated = { ...m365Account, salesTarget: newTarget };
    m365Service.saveAccount(updated);
    setM365Account(updated);
    showToast(`Sales quota target updated to $${newTarget.toLocaleString()}`);
  };

  const handleToggleM365Connect = () => {
    if (m365Account.isConnected) {
      const disc = m365Service.disconnectAccount();
      setM365Account(disc);
      showToast('Microsoft 365 disconnected', 'info');
    } else {
      const conn = m365Service.connectAccount();
      setM365Account(conn);
      showToast('Microsoft 365 connected successfully!');
    }
  };

  const handleClearAllData = () => {
    crmStore.clearAllData();
    setSelectedLeadId(null);
    showToast('All CRM data has been cleared', 'info');
  };

  const handleRestoreSampleData = () => {
    crmStore.restoreSampleData();
    showToast('Restored demo sample CRM data');
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <DashboardView
            leads={leads}
            meetings={meetings}
            activities={activities}
            m365Account={m365Account}
            onStatusChange={handleStatusChange}
            onDeleteLead={handleDeleteLead}
            onSelectLead={handleSelectLead}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onOpenScheduleModal={(lead) => handleOpenScheduleModal(lead)}
            onOpenEmailModal={(lead) => {
              setEmailLeadTarget(lead);
              setIsEmailModalOpen(true);
            }}
            onOpenM365Hub={() => setCurrentView('m365')}
            onSyncAllM365={handleSyncAllM365}
            onUpdateMeetingStatus={handleUpdateMeetingStatus}
            onAddActivity={handleAddActivity}
            onUpdateSalesTarget={handleUpdateSalesTarget}
          />
        );

      case 'leads':
        return (
          <LeadsView
            leads={leads}
            onStatusChange={handleStatusChange}
            onDeleteLead={handleDeleteLead}
            onSelectLead={handleSelectLead}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onOpenScheduleModal={(lead) => handleOpenScheduleModal(lead)}
            onOpenEmailModal={(lead) => {
              setEmailLeadTarget(lead);
              setIsEmailModalOpen(true);
            }}
            onSyncAllM365={handleSyncAllM365}
          />
        );

      case 'lead-detail':
        return (
          <LeadDetailView
            leadId={selectedLeadId || leads[0]?.id || ''}
            leads={leads}
            meetings={meetings}
            emails={emails}
            onBack={() => setCurrentView('leads')}
            onStatusChange={handleStatusChange}
            onOpenEmailModal={(lead) => {
              setEmailLeadTarget(lead);
              setIsEmailModalOpen(true);
            }}
            onOpenScheduleModal={(lead) => handleOpenScheduleModal(lead)}
          />
        );

      case 'calendar':
        return (
          <CalendarView
            meetings={meetings}
            leads={leads}
            m365Account={m365Account}
            showToast={showToast}
            onOpenScheduleModal={(lead) => handleOpenScheduleModal(lead)}
            onSyncM365Calendar={handleSyncAllM365}
            onSelectLead={handleSelectLead}
            onNavigate={(view) => setCurrentView(view)}
          />
        );

      case 'analytics':
        return (
          <AnalyticsView
            leads={leads}
            meetings={meetings}
            m365Account={m365Account}
            showToast={showToast}
            onNavigate={(view) => setCurrentView(view)}
          />
        );

      case 'm365':
        return (
          <M365HubView
            account={m365Account}
            leads={leads}
            meetings={meetings}
            onSyncAll={handleSyncAllM365}
            onToggleConnect={handleToggleM365Connect}
            showToast={showToast}
          />
        );

      case 'settings':
        return (
          <SettingsView
            onClearAllData={handleClearAllData}
            onRestoreSampleData={handleRestoreSampleData}
            showToast={showToast}
            onSyncM365={handleSyncAllM365}
          />
        );

      case 'profile':
        return (
          <ProfileView
            account={m365Account}
            leads={leads}
            meetings={meetings}
            onAccountUpdate={(updated) => setM365Account(updated)}
            onSyncM365={handleSyncAllM365}
            showToast={showToast}
          />
        );

      default:
        return (
          <DashboardView
            leads={leads}
            meetings={meetings}
            activities={activities}
            m365Account={m365Account}
            onStatusChange={handleStatusChange}
            onDeleteLead={handleDeleteLead}
            onSelectLead={handleSelectLead}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onOpenScheduleModal={(lead) => handleOpenScheduleModal(lead)}
            onOpenEmailModal={(lead) => {
              setEmailLeadTarget(lead);
              setIsEmailModalOpen(true);
            }}
            onOpenM365Hub={() => setCurrentView('m365')}
            onSyncAllM365={handleSyncAllM365}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row font-sans text-slate-900 antialiased selection:bg-gold-400 selection:text-navy-950">
      
      {/* Navigation Sidebar */}
      <Navbar
        currentView={currentView}
        setCurrentView={(view) => {
          if (view !== 'lead-detail') setSelectedLeadId(null);
          setCurrentView(view);
        }}
        onOpenM365Hub={() => setCurrentView('m365')}
        onSyncAllM365={handleSyncAllM365}
      />

      {/* Main View & Footer Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8">
          {renderCurrentView()}
        </main>

        <Footer />
      </div>

      {/* Toast Notification Alert Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-navy-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-gold-400/40 animate-bounce">
          <CheckCircle2 className="h-5 w-5 text-gold-400 shrink-0" />
          <span className="text-xs font-bold text-navy-100">{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 rounded hover:bg-navy-800 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Modals */}
      <AddLeadModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddLeadSubmit}
      />

      <ScheduleMeetingModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onSubmit={handleScheduleMeetingSubmit}
        leads={leads}
        preselectedLeadId={scheduleLeadTarget?.id}
      />

      <SendEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        onSubmit={handleSendEmailSubmit}
        lead={emailLeadTarget || leads[0]}
      />
    </div>
  );
}

export default App;
