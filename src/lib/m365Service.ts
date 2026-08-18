import { Lead, Meeting, M365Account, EmailMessage } from '../types/crm';

const DEFAULT_M365_ACCOUNT: M365Account = {
  isConnected: true,
  displayName: 'Sanelisiwe Sileku',
  userPrincipalName: 'sanelisiwe.sileku@spihead.onmicrosoft.com',
  email: 'sanelisiwe.sileku@gmail.com',
  tenantId: '72f988bf-86f1-41af-91ab-2d7cd011db47',
  tenantName: 'SPIHEAD M365 Enterprise Tenant',
  subscriptionType: 'Microsoft 365 Business Premium',
  syncedContactsCount: 0,
  syncedEmailsCount: 0,
  syncedEventsCount: 0,
  lastSyncedAt: new Date().toISOString(),
  scopes: [
    'openid',
    'profile',
    'email',
    'offline_access',
    'User.Read',
    'Mail.ReadWrite',
    'Mail.Send',
    'Calendars.ReadWrite',
    'Contacts.Read',
    'Contacts.ReadWrite',
    'OnlineMeetings.ReadWrite',
  ],
  jobTitle: 'Senior Enterprise Executive',
  companyName: 'SPIHEAD Enterprise',
  department: 'Global Sales Operations',
  phoneNumber: '+1 (555) 019-2831',
  salesTarget: 500000,
  currency: 'USD',
  territory: 'Global Enterprise',
  bio: 'Enterprise Account Executive managing key client relationships, cloud migration strategy, and Microsoft 365 ecosystem integrations.',
};

export const m365Service = {
  getAccount(): M365Account {
    const stored = localStorage.getItem('spihead_m365_account');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_M365_ACCOUNT, ...parsed };
      } catch (e) {
        console.error('Failed to parse stored M365 account:', e);
      }
    }
    return DEFAULT_M365_ACCOUNT;
  },

  saveAccount(account: M365Account): void {
    localStorage.setItem('spihead_m365_account', JSON.stringify(account));
  },

  disconnectAccount(): M365Account {
    const disconnected: M365Account = {
      ...DEFAULT_M365_ACCOUNT,
      isConnected: false,
      lastSyncedAt: null,
    };
    this.saveAccount(disconnected);
    return disconnected;
  },

  connectAccount(): M365Account {
    const connected: M365Account = {
      ...DEFAULT_M365_ACCOUNT,
      isConnected: true,
      lastSyncedAt: new Date().toISOString(),
    };
    this.saveAccount(connected);
    return connected;
  },

  generateTeamsMeetingUrl(meetingId: string, title: string): string {
    const encodedTitle = encodeURIComponent(title);
    return `https://teams.microsoft.com/l/meetup-join/19%3ameeting_${meetingId}%40thread.v2/0?context=%7b%22Tid%22%3a%2272f988bf-86f1-41af-91ab-2d7cd011db47%22%2c%22Oid%22%3a%22m365-${encodedTitle}%22%7d`;
  },

  async sendOutlookEmail(
    lead: Lead,
    subject: string,
    body: string,
    templateUsed?: string
  ): Promise<EmailMessage> {
    // Simulates calling Microsoft Graph API POST /me/sendMail
    const emailMessage: EmailMessage = {
      id: `m365_msg_${Date.now()}`,
      leadId: lead.id,
      leadName: lead.name,
      leadEmail: lead.email,
      subject,
      body,
      sentAt: new Date().toISOString(),
      m365MessageId: `AQMkADQxM2U1AAAA==`,
      status: 'sent',
      templateUsed,
    };

    // Update synced counter
    const account = this.getAccount();
    if (account.isConnected) {
      account.syncedEmailsCount += 1;
      account.lastSyncedAt = new Date().toISOString();
      this.saveAccount(account);
    }

    return emailMessage;
  },

  async syncContactsToM365(leads: Lead[]): Promise<{ count: number; timestamp: string }> {
    const account = this.getAccount();
    const count = leads.length;
    account.syncedContactsCount = count;
    account.lastSyncedAt = new Date().toISOString();
    this.saveAccount(account);
    return { count, timestamp: account.lastSyncedAt };
  },

  async syncMeetingsToCalendar(meetings: Meeting[]): Promise<{ count: number; timestamp: string }> {
    const account = this.getAccount();
    const count = meetings.length;
    account.syncedEventsCount = count;
    account.lastSyncedAt = new Date().toISOString();
    this.saveAccount(account);
    return { count, timestamp: account.lastSyncedAt };
  },

  getSampleDirectoryContacts(): {
    name: string;
    email: string;
    company: string;
    phone: string;
    industry: string;
    budget: number;
    jobTitle: string;
  }[] {
    return [];
  },

  generateProposalDocument(lead: Lead): void {
    const content = `================================================================================
SPIHEAD ENTERPRISE CRM - EXECUTIVE PROPOSAL
MICROSOFT 365 SUITE INTEGRATION AGREEMENT
================================================================================

CLIENT INFORMATION
--------------------------------------------------------------------------------
Lead Name      : ${lead.name}
Company        : ${lead.company}
Email Address  : ${lead.email}
Industry       : ${lead.industry || 'Enterprise'}
Estimated Budget: $${lead.budget.toLocaleString()} USD
AI Energy Score: ${lead.score}% Warmth Rating
Date Generated : ${new Date().toLocaleDateString('en-US', { dateStyle: 'full' })}

EXECUTIVE SUMMARY
--------------------------------------------------------------------------------
This proposal outlines the deployment of SPIHEAD Enterprise CRM integrated
natively with ${lead.company}'s Microsoft 365 tenant environment. 

1. SCOPE OF SERVICES
   - Microsoft Graph API Bi-directional Synchronization
   - Outlook Mail & Calendar Integration
   - Microsoft Teams Automated Meeting Scheduler & Call Join Links
   - Gemini AI Lead Energy Scoring & Analytics Pipeline
   - OneDrive & SharePoint Executive Document Storage

2. INVESTMENT & COMMERCIAL TERMS
   - Total Allocated Budget: $${lead.budget.toLocaleString()} USD
   - Implementation Period: 14 Business Days
   - Service Level Agreement (SLA): 99.9% Uptime SLA with 24/7 Enterprise Support

3. SECURITY & COMPLIANCE
   - OAuth 2.0 / OpenID Connect Authentication
   - Azure Active Directory Tenant Validation
   - Role-Based Access Controls (RBAC) & GDPR Data Retention

--------------------------------------------------------------------------------
Authorized Signature: ___________________________  Date: _______________
Sanelisiwe Sileku, Senior Enterprise Executive, SPIHEAD Solutions
================================================================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Proposal_${lead.company.replace(/\s+/g, '_')}_SPIHEAD.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  exportToExcelCSV(leads: Lead[], selectedFields?: string[]): void {
    const allHeadersMap: Record<string, (l: Lead) => string> = {
      'ID': (l) => l.id,
      'Name': (l) => `"${l.name}"`,
      'Company': (l) => `"${l.company}"`,
      'Email': (l) => `"${l.email}"`,
      'Phone': (l) => `"${l.phone || ''}"`,
      'Budget ($)': (l) => l.budget.toString(),
      'Status': (l) => l.status,
      'AI Energy Score (%)': (l) => l.score.toString(),
      'Urgency': (l) => (l.urgency ? 'High' : 'Standard'),
      'Industry': (l) => `"${l.industry || 'N/A'}"`,
      'M365 Synced': (l) => (l.m365Synced ? 'Synced' : 'Pending'),
      'Last Contact': (l) => (l.lastContact ? new Date(l.lastContact).toLocaleDateString() : 'Never'),
    };

    const keysToUse = selectedFields && selectedFields.length > 0 ? selectedFields : Object.keys(allHeadersMap);

    const headersLine = keysToUse.join(',');
    const rowsLines = leads.map((l) =>
      keysToUse.map((k) => (allHeadersMap[k] ? allHeadersMap[k](l) : '')).join(',')
    );

    const csvContent = [headersLine, ...rowsLines].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SPIHEAD_M365_Leads_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  exportPowerBiDataset(leads: Lead[], meetings: Meeting[], account: M365Account): void {
    const dataset = {
      metadata: {
        exportedAt: new Date().toISOString(),
        tenantName: account.tenantName,
        tenantId: account.tenantId,
        source: 'SPIHEAD CRM - Microsoft Graph Service',
      },
      summary: {
        totalLeadsCount: leads.length,
        totalPipelineValueUSD: leads.reduce((acc, l) => acc + l.budget, 0),
        averageWarmthScorePercent: Math.round(leads.reduce((acc, l) => acc + l.score, 0) / (leads.length || 1)),
        scheduledMeetingsCount: meetings.length,
      },
      leads: leads.map((l) => ({
        id: l.id,
        name: l.name,
        company: l.company,
        email: l.email,
        budgetUSD: l.budget,
        pipelineStatus: l.status,
        aiWarmthScorePercent: l.score,
        urgencyFlag: l.urgency,
        industry: l.industry || 'General',
        m365Synced: l.m365Synced || false,
        lastContactTimestamp: l.lastContact,
      })),
      meetings: meetings.map((m) => ({
        id: m.id,
        title: m.title,
        leadName: m.leadName,
        date: m.date,
        time: m.time,
        isTeamsMeeting: m.isTeamsMeeting,
        teamsJoinUrl: m.teamsJoinUrl,
        status: m.status,
      })),
    };

    const jsonString = JSON.stringify(dataset, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SPIHEAD_PowerBI_Dataset_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  simulateGraphApiRequest(endpoint: string, leads: Lead[], meetings: Meeting[], account: M365Account) {
    const latencyMs = Math.floor(Math.random() * 35) + 12;
    let data: any = {};

    switch (endpoint) {
      case 'GET /v1.0/me':
        data = {
          '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users/$entity',
          id: 'usr_m365_99812a',
          displayName: account.displayName,
          givenName: account.displayName.split(' ')[0],
          surname: account.displayName.split(' ')[1] || '',
          mail: account.email,
          userPrincipalName: account.userPrincipalName,
          jobTitle: account.jobTitle,
          department: account.department,
          officeLocation: 'Suite 400 - Global HQ',
          preferredLanguage: 'en-US',
        };
        break;

      case 'GET /v1.0/me/contacts':
        data = {
          '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users(\'me\')/contacts',
          '@odata.count': leads.length,
          value: leads.map((l) => ({
            id: l.m365ContactId || `cnt_${l.id}`,
            displayName: l.name,
            companyName: l.company,
            emailAddresses: [{ address: l.email, name: l.name }],
            businessPhones: [l.phone || '+1 (555) 000-0000'],
            jobTitle: l.industry ? `${l.industry} Executive` : 'Executive',
          })),
        };
        break;

      case 'GET /v1.0/me/messages':
        data = {
          '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users(\'me\')/messages',
          value: leads.length > 0 ? [
            {
              id: 'msg_001',
              subject: `Re: Enterprise Proposal for ${leads[0].company || leads[0].name}`,
              receivedDateTime: new Date(Date.now() - 3600 * 1000).toISOString(),
              sender: { emailAddress: { name: leads[0].name, address: leads[0].email } },
              isRead: true,
              bodyPreview: `Thank you for sending the updated details. Ready for our upcoming call.`,
            }
          ] : [],
        };
        break;

      case 'POST /v1.0/me/sendMail':
        data = {
          status: 202,
          statusText: 'Accepted',
          message: 'Email queued successfully in Microsoft Graph Exchange online queue.',
          m365TrackingId: `m365_graph_send_${Date.now()}`,
          clientRequestId: `req_${Math.random().toString(36).substring(2, 9)}`,
        };
        break;

      case 'GET /v1.0/me/events':
        data = {
          '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users(\'me\')/events',
          value: meetings.map((m) => ({
            id: m.id,
            subject: m.title,
            start: { dateTime: `${m.date}T${m.time}:00`, timeZone: 'UTC' },
            isOnlineMeeting: m.isTeamsMeeting,
            onlineMeetingUrl: m.teamsJoinUrl,
            attendees: [{ emailAddress: { address: m.leadEmail, name: m.leadName } }],
          })),
        };
        break;

      case 'GET /v1.0/me/drive/root/children':
        data = {
          '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#drive/root/children',
          value: [
            {
              name: 'Enterprise_CRM_Security_Audit.pdf',
              size: 1420900,
              webUrl: 'https://spihead-my.sharepoint.com/documents/Security_Audit.pdf',
              lastModifiedDateTime: new Date(Date.now() - 172800 * 1000).toISOString(),
            },
          ],
        };
        break;

      default:
        data = { status: 200, message: 'Microsoft Graph Endpoint queried' };
    }

    return {
      endpoint,
      status: 200,
      statusText: 'OK',
      latencyMs,
      timestamp: new Date().toISOString(),
      responseBody: data,
    };
  },
};

