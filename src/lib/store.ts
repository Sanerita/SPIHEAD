import { Lead, Meeting, Activity, EmailMessage, M365Account, LeadStatus } from '../types/crm';
import { calculateLeadEnergyScore } from './aiScoringEngine';
import { m365Service } from './m365Service';
import { companyService } from './companyService';
import { apiClient } from './apiClient';

const INITIAL_LEADS: Lead[] = [];

const INITIAL_MEETINGS: Meeting[] = [];

const INITIAL_ACTIVITIES: Activity[] = [];

const INITIAL_EMAILS: EmailMessage[] = [];

export class CRMStore {
  private leads: Lead[] = [];
  private meetings: Meeting[] = [];
  private activities: Activity[] = [];
  private emails: EmailMessage[] = [];
  private listeners: (() => void)[] = [];

  constructor() {
    this.loadFromStorage();
    this.syncFromBackend();
  }

  public async syncFromBackend() {
    try {
      const data = await apiClient.get('/api/leads', { silent: true });
      if (data && data.success && Array.isArray(data.leads) && data.leads.length > 0) {
        const loadedLeads: Lead[] = data.leads.map((l: any) => ({
          id: l.id,
          name: l.name,
          email: l.email || '',
          phone: l.phone || '',
          company: l.company || '',
          budget: l.budget || 0,
          status: (l.status as LeadStatus) || 'New',
          score: l.score || 50,
          urgency: !!l.urgency,
          engagement: l.engagement || 1,
          replyCount: l.replyCount || 0,
          notes: l.notes || '',
          industry: l.industry || 'Technology',
          tags: typeof l.tags === 'string' ? JSON.parse(l.tags || '[]') : (Array.isArray(l.tags) ? l.tags : []),
          createdAt: l.createdAt || new Date().toISOString(),
          updatedAt: l.updatedAt || new Date().toISOString(),
          lastContact: l.updatedAt || null,
          m365Synced: true,
        }));
        this.leads = loadedLeads;
        this.saveLeads();
        this.notify();
      }
    } catch (err) {
      console.warn("Could not sync leads from backend:", err);
    }
  }

  private loadFromStorage() {
    const isCleanedForProd = localStorage.getItem('spihead_prod_clean_v10');
    if (!isCleanedForProd) {
      localStorage.setItem('spihead_prod_clean_v10', 'true');
      localStorage.removeItem('spihead_crm_leads');
      localStorage.removeItem('albatross_crm_leads');
      localStorage.removeItem('spihead_crm_meetings');
      localStorage.removeItem('albatross_crm_meetings');
      localStorage.removeItem('spihead_crm_activities');
      localStorage.removeItem('albatross_crm_activities');
      localStorage.removeItem('spihead_crm_emails');
      localStorage.removeItem('albatross_crm_emails');
      this.clearAllData();
      return;
    }

    const savedLeads = localStorage.getItem('spihead_crm_leads') || localStorage.getItem('albatross_crm_leads');
    const savedMeetings = localStorage.getItem('spihead_crm_meetings') || localStorage.getItem('albatross_crm_meetings');
    const savedActivities = localStorage.getItem('spihead_crm_activities') || localStorage.getItem('albatross_crm_activities');
    const savedEmails = localStorage.getItem('spihead_crm_emails') || localStorage.getItem('albatross_crm_emails');

    if (savedLeads !== null) {
      try {
        const parsed = JSON.parse(savedLeads);
        this.leads = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        this.leads = [];
      }
    } else {
      this.leads = [];
    }
    this.saveLeads();

    if (savedMeetings !== null) {
      try {
        const parsed = JSON.parse(savedMeetings);
        this.meetings = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        this.meetings = [];
      }
    } else {
      this.meetings = [];
    }
    this.saveMeetings();

    if (savedActivities !== null) {
      try {
        const parsed = JSON.parse(savedActivities);
        this.activities = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        this.activities = [];
      }
    } else {
      this.activities = [];
    }
    this.saveActivities();

    if (savedEmails !== null) {
      try {
        const parsed = JSON.parse(savedEmails);
        this.emails = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        this.emails = [];
      }
    } else {
      this.emails = [];
    }
    this.saveEmails();
  }

  private saveLeads() { localStorage.setItem('spihead_crm_leads', JSON.stringify(this.leads)); }
  private saveMeetings() { localStorage.setItem('spihead_crm_meetings', JSON.stringify(this.meetings)); }
  private saveActivities() { localStorage.setItem('spihead_crm_activities', JSON.stringify(this.activities)); }
  private saveEmails() { localStorage.setItem('spihead_crm_emails', JSON.stringify(this.emails)); }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  getLeads(): Lead[] { return [...this.leads]; }
  getMeetings(): Meeting[] { return [...this.meetings]; }
  getActivities(): Activity[] { return [...this.activities]; }
  getEmails(): EmailMessage[] { return [...this.emails]; }

  getLeadById(id: string): Lead | undefined {
    return this.leads.find((l) => l.id === id);
  }

  addLead(leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'score' | 'scoreBreakdown'>): Lead {
    const { score, breakdown } = calculateLeadEnergyScore(leadData);
    const newLead: Lead = {
      ...leadData,
      id: `lead-${Date.now()}`,
      score,
      scoreBreakdown: breakdown,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastContact: leadData.status === 'Contacted' ? new Date().toISOString() : null,
      m365Synced: true,
    };

    this.leads.unshift(newLead);
    this.saveLeads();

    // Persist to Neon Postgres backend
    apiClient.post('/api/leads', newLead, {
      customErrorToast: 'Failed to save lead to backend server'
    }).catch(err => console.warn('Lead DB persist error:', err));

    this.addActivity({
      type: 'lead_added',
      message: `Added new lead: ${newLead.name} (${newLead.company})`,
      leadId: newLead.id,
      leadName: newLead.name,
    });

    this.notify();
    return newLead;
  }

  updateLead(id: string, updates: Partial<Lead>): Lead | undefined {
    const index = this.leads.findIndex((l) => l.id === id);
    if (index === -1) return undefined;

    const current = this.leads[index];
    const merged = { ...current, ...updates, updatedAt: new Date().toISOString() };
    const { score, breakdown } = calculateLeadEnergyScore(merged);
    
    this.leads[index] = {
      ...merged,
      score,
      scoreBreakdown: breakdown,
    };

    this.saveLeads();
    this.notify();

    apiClient.put(`/api/leads/${id}`, updates, {
      customErrorToast: `Failed to update lead (${id}) on backend server`
    }).catch(err => console.warn('Lead DB update error:', err));

    return this.leads[index];
  }

  updateLeadStatus(id: string, newStatus: LeadStatus): Lead | undefined {
    const lead = this.getLeadById(id);
    if (!lead) return undefined;

    const updated = this.updateLead(id, {
      status: newStatus,
      lastContact: new Date().toISOString(),
    });

    this.addActivity({
      type: 'status_changed',
      message: `Updated status for ${lead.name} (${lead.company}) to "${newStatus}"`,
      leadId: lead.id,
      leadName: lead.name,
    });

    return updated;
  }

  deleteLead(id: string): void {
    const lead = this.getLeadById(id);
    this.leads = this.leads.filter((l) => l.id !== id);
    this.saveLeads();

    apiClient.delete(`/api/leads/${id}`, {
      customErrorToast: `Failed to delete lead from backend server`
    }).catch(err => console.warn('Lead DB delete error:', err));

    if (lead) {
      this.addActivity({
        type: 'status_changed',
        message: `Deleted lead: ${lead.name} (${lead.company})`,
      });
    }

    this.notify();
  }

  addMeeting(meetingData: Omit<Meeting, 'id' | 'createdAt' | 'teamsJoinUrl'>): Meeting {
    const meetingId = `meeting-${Date.now()}`;
    const teamsJoinUrl = meetingData.isTeamsMeeting
      ? m365Service.generateTeamsMeetingUrl(meetingId, meetingData.title)
      : undefined;

    const newMeeting: Meeting = {
      ...meetingData,
      id: meetingId,
      teamsJoinUrl,
      m365Synced: true,
      createdAt: new Date().toISOString(),
    };

    this.meetings.unshift(newMeeting);
    this.saveMeetings();

    // Update lead contact time
    if (meetingData.leadId) {
      this.updateLead(meetingData.leadId, { lastContact: new Date().toISOString() });
    }

    this.addActivity({
      type: 'meeting_scheduled',
      message: `Scheduled Microsoft Teams meeting: "${newMeeting.title}" with ${newMeeting.leadName}`,
      leadId: newMeeting.leadId,
      leadName: newMeeting.leadName,
    });

    this.notify();
    return newMeeting;
  }

  updateMeeting(id: string, updates: Partial<Meeting>): Meeting | undefined {
    const idx = this.meetings.findIndex((m) => m.id === id);
    if (idx === -1) return undefined;

    const current = this.meetings[idx];
    const updated = { ...current, ...updates };
    this.meetings[idx] = updated;
    this.saveMeetings();

    this.addActivity({
      type: 'meeting_scheduled',
      message: `Updated Microsoft Teams meeting: "${updated.title}"`,
      leadId: updated.leadId,
      leadName: updated.leadName,
    });

    this.notify();
    return updated;
  }

  updateMeetingStatus(id: string, status: 'Scheduled' | 'Completed' | 'Cancelled'): Meeting | undefined {
    const mtg = this.meetings.find((m) => m.id === id);
    if (!mtg) return undefined;

    const updated = this.updateMeeting(id, { status });
    if (status === 'Completed' && mtg.leadId) {
      // Boost engagement for lead
      const lead = this.getLeadById(mtg.leadId);
      if (lead) {
        this.updateLead(mtg.leadId, {
          engagement: Math.min(5, (lead.engagement || 3) + 1),
          lastContact: new Date().toISOString(),
        });
      }
    }
    return updated;
  }

  cancelMeeting(id: string): void {
    const mtg = this.meetings.find((m) => m.id === id);
    if (mtg) {
      this.updateMeetingStatus(id, 'Cancelled');
    }
  }

  addEmail(emailData: Omit<EmailMessage, 'id' | 'sentAt' | 'status'>): EmailMessage {
    const newEmail: EmailMessage = {
      ...emailData,
      id: `email-${Date.now()}`,
      sentAt: new Date().toISOString(),
      status: 'sent',
      m365MessageId: `m365-msg-${Date.now()}`,
    };

    this.emails.unshift(newEmail);
    this.saveEmails();

    // Update lead contact time and reply count
    const lead = this.getLeadById(emailData.leadId);
    if (lead) {
      this.updateLead(emailData.leadId, {
        lastContact: new Date().toISOString(),
        replyCount: (lead.replyCount || 0) + 1,
      });
    }

    this.addActivity({
      type: 'email_sent',
      message: `Sent Microsoft 365 Outlook email to ${emailData.leadName}: "${emailData.subject}"`,
      leadId: emailData.leadId,
      leadName: emailData.leadName,
    });

    this.notify();
    return newEmail;
  }

  addActivity(act: Omit<Activity, 'id' | 'timestamp' | 'user'>): void {
    const newActivity: Activity = {
      ...act,
      id: `act-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: { name: 'Sanelisiwe Sileku' },
    };

    this.activities.unshift(newActivity);
    if (this.activities.length > 50) this.activities = this.activities.slice(0, 50);
    this.saveActivities();
    this.notify();
  }

  syncAllM365(): { contacts: number; meetings: number } {
    m365Service.syncContactsToM365(this.leads);
    m365Service.syncMeetingsToCalendar(this.meetings);

    // Mark all leads as synced
    this.leads = this.leads.map((l) => ({ ...l, m365Synced: true }));
    this.saveLeads();

    this.addActivity({
      type: 'm365_synced',
      message: `Full Microsoft 365 Sync completed. Synced ${this.leads.length} leads and ${this.meetings.length} events with Outlook & Teams.`,
    });

    this.notify();
    return { contacts: this.leads.length, meetings: this.meetings.length };
  }

  clearAllData(): void {
    this.leads = [];
    this.meetings = [];
    this.activities = [];
    this.emails = [];
    this.saveLeads();
    this.saveMeetings();
    this.saveActivities();
    this.saveEmails();

    // Reset M365 account counters to 0
    const account = m365Service.getAccount();
    account.syncedContactsCount = 0;
    account.syncedEmailsCount = 0;
    account.syncedEventsCount = 0;
    m365Service.saveAccount(account);

    this.notify();
  }

  restoreSampleData(): void {
    this.leads = INITIAL_LEADS;
    this.meetings = INITIAL_MEETINGS;
    this.activities = INITIAL_ACTIVITIES;
    this.emails = INITIAL_EMAILS;
    this.saveLeads();
    this.saveMeetings();
    this.saveActivities();
    this.saveEmails();

    // Restore M365 account counters to match sample counts
    const account = m365Service.getAccount();
    account.syncedContactsCount = INITIAL_LEADS.length;
    account.syncedEmailsCount = INITIAL_EMAILS.length;
    account.syncedEventsCount = INITIAL_MEETINGS.length;
    m365Service.saveAccount(account);

    this.notify();
  }

  adaptToCompanyProfile(industry: string, companyName?: string): void {
    const profile = companyService.adaptToIndustry(industry, companyName);
    const sampleLeads = companyService.getSampleLeadsForIndustry(industry);

    if (sampleLeads && sampleLeads.length > 0) {
      const formattedLeads: Lead[] = sampleLeads.map((sl, idx) => ({
        id: `lead-ind-${Date.now()}-${idx}`,
        name: sl.name,
        email: sl.email,
        phone: sl.phone,
        company: sl.company,
        budget: sl.budget,
        status: sl.status,
        score: sl.score || 85,
        urgency: sl.urgency || false,
        engagement: sl.engagement || 4,
        replyCount: sl.replyCount || 3,
        notes: sl.notes,
        createdAt: new Date(Date.now() - idx * 24 * 3600 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        lastContact: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        m365Synced: true,
        industry: sl.industry || profile.industry,
        tags: sl.tags || [profile.industry, 'Customized']
      }));

      this.leads = formattedLeads;
      this.saveLeads();
    }

    this.addActivity({
      type: 'status_changed',
      message: `Workspace adapted to ${profile.companyName}'s exact business (${profile.industry}). Custom terminology: "${profile.leadTermSingular}/${profile.leadTermPlural}" with ${profile.customPipelineStages.length} deal stages.`
    });

    this.notify();
  }

  recalculateAllScores(): void {
    this.leads = this.leads.map((lead) => {
      const result = calculateLeadEnergyScore(lead);
      return {
        ...lead,
        score: result.score,
        scoreBreakdown: result.breakdown,
        updatedAt: new Date().toISOString(),
      };
    });
    this.saveLeads();
    this.addActivity({
      type: 'score_updated',
      message: `Gemini AI Engine re-indexed and re-calculated lead energy scores for ${this.leads.length} leads.`,
    });
    this.notify();
  }

  resetToDefaultData(): void {
    this.clearAllData();
  }
}

export const crmStore = new CRMStore();
