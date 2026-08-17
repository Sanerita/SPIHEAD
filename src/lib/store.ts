import { Lead, Meeting, Activity, EmailMessage, M365Account, LeadStatus } from '../types/crm';
import { calculateLeadEnergyScore } from './aiScoringEngine';
import { m365Service } from './m365Service';
import { companyService } from './companyService';
import { apiClient } from './apiClient';

const INITIAL_LEADS: Lead[] = [
  {
    id: 'lead-001',
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@techcorp.com',
    phone: '+1 (555) 234-8901',
    company: 'TechCorp Solutions',
    budget: 85000,
    status: 'Qualified',
    score: 88,
    urgency: true,
    engagement: 5,
    replyCount: 4,
    notes: 'Key decision maker for enterprise cloud migration. Requested Microsoft 365 Outlook integration review.',
    createdAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    lastContact: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    m365Synced: true,
    m365ContactId: 'm365-contact-001',
    industry: 'Enterprise Software & SaaS',
    tags: ['Enterprise', 'High Budget', 'M365 Priority'],
  },
  {
    id: 'lead-002',
    name: 'Marcus Vance',
    email: 'm.vance@vertexdigital.io',
    phone: '+1 (555) 876-1234',
    company: 'Vertex Digital Agency',
    budget: 45000,
    status: 'Proposal',
    score: 82,
    urgency: true,
    engagement: 4,
    replyCount: 3,
    notes: 'Reviewed initial proposal deck. Interested in automated lead energy tracking and Teams calendar scheduling.',
    createdAt: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    lastContact: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    m365Synced: true,
    m365ContactId: 'm365-contact-002',
    industry: 'Digital Marketing & Agencies',
    tags: ['Proposal Sent', 'Teams Demo'],
  },
  {
    id: 'lead-003',
    name: 'Elena Rostova',
    email: 'elena@acmeglobal.com',
    phone: '+1 (555) 432-9876',
    company: 'Acme Global Logistics',
    budget: 120000,
    status: 'Closed',
    score: 95,
    urgency: true,
    engagement: 5,
    replyCount: 6,
    notes: 'Closed annual software license agreement! Integrated with Microsoft 365 suite.',
    createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    lastContact: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    m365Synced: true,
    m365ContactId: 'm365-contact-003',
    industry: 'Supply Chain & Logistics',
    tags: ['Closed Won', 'Key Client'],
  },
  {
    id: 'lead-004',
    name: 'David Chen',
    email: 'david.chen@apexinn.com',
    phone: '+1 (555) 678-5432',
    company: 'Apex Innovations',
    budget: 28000,
    status: 'Contacted',
    score: 64,
    urgency: false,
    engagement: 3,
    replyCount: 2,
    notes: 'Sent follow-up Outlook email with product overview brochure.',
    createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    lastContact: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    m365Synced: true,
    m365ContactId: 'm365-contact-004',
    industry: 'Financial Services & FinTech',
    tags: ['Nurture', 'FinTech'],
  },
  {
    id: 'lead-005',
    name: 'Rachel Adams',
    email: 'radams@horizonhealth.org',
    phone: '+1 (555) 321-7890',
    company: 'Horizon Healthcare',
    budget: 65000,
    status: 'New',
    score: 55,
    urgency: false,
    engagement: 2,
    replyCount: 1,
    notes: 'Inbound lead via website form inquiry regarding HIPAA compliant CRM capabilities.',
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    lastContact: null,
    m365Synced: false,
    industry: 'Healthcare & Life Sciences',
    tags: ['New Lead', 'Inbound'],
  },
  {
    id: 'lead-006',
    name: 'Alexander Sterling',
    email: 'asterling@summitcap.com',
    phone: '+1 (555) 901-2345',
    company: 'Summit Capital Partners',
    budget: 150000,
    status: 'Contacted',
    score: 76,
    urgency: true,
    engagement: 4,
    replyCount: 2,
    notes: 'Managing Director interested in pipeline forecasting & M365 Outlook calendar sync.',
    createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    lastContact: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    m365Synced: true,
    industry: 'Venture Capital & Private Equity',
    tags: ['High Value', 'Finance'],
  },
  {
    id: 'lead-007',
    name: 'Dr. Maya Lin',
    email: 'm.lin@greengridpower.com',
    phone: '+1 (555) 345-6789',
    company: 'GreenGrid Renewable Energy',
    budget: 110000,
    status: 'Proposal',
    score: 89,
    urgency: true,
    engagement: 5,
    replyCount: 4,
    notes: 'Chief Sustainability Officer looking for grid analytics integration and Teams executive reporting.',
    createdAt: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    lastContact: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    m365Synced: true,
    industry: 'CleanTech & Renewable Energy',
    tags: ['ESG', 'Renewables', 'High Score'],
  },
  {
    id: 'lead-008',
    name: 'Dr. Julian Vance',
    email: 'j.vance@biogenixlabs.com',
    phone: '+1 (555) 890-1234',
    company: 'BioGenix Pharmaceuticals',
    budget: 175000,
    status: 'Qualified',
    score: 91,
    urgency: true,
    engagement: 5,
    replyCount: 5,
    notes: 'VP Clinical Research evaluating automated compliance workflows and M365 OneDrive attachments.',
    createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    lastContact: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
    m365Synced: true,
    industry: 'BioTech & Pharmaceuticals',
    tags: ['Pharma', 'Clinical', 'Enterprise'],
  },
  {
    id: 'lead-009',
    name: 'Olivia Thorne',
    email: 'othorne@omniretail.com',
    phone: '+1 (555) 567-8901',
    company: 'OmniRetail Global',
    budget: 95000,
    status: 'Contacted',
    score: 72,
    urgency: false,
    engagement: 3,
    replyCount: 2,
    notes: 'VP E-Commerce scaling omnichannel CRM & Outlook email notifications.',
    createdAt: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    lastContact: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    m365Synced: true,
    industry: 'Retail & E-Commerce',
    tags: ['Retail', 'Omnichannel'],
  },
  {
    id: 'lead-010',
    name: 'Col. Arthur Pendelton',
    email: 'art.pendelton@aerospacedynamics.com',
    phone: '+1 (555) 678-9012',
    company: 'AeroSpace Dynamics',
    budget: 210000,
    status: 'Proposal',
    score: 94,
    urgency: true,
    engagement: 5,
    replyCount: 6,
    notes: 'Director of Avionics Procurement evaluating FedRAMP & Microsoft 365 GCC High compliance.',
    createdAt: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    lastContact: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    m365Synced: true,
    industry: 'Aerospace & Defense',
    tags: ['Defense', 'GCC High', 'Top Budget'],
  },
  {
    id: 'lead-011',
    name: 'Samantha Wright',
    email: 'swright@urbanstonerealty.com',
    phone: '+1 (555) 789-0123',
    company: 'UrbanStone Realty Group',
    budget: 55000,
    status: 'New',
    score: 48,
    urgency: false,
    engagement: 2,
    replyCount: 1,
    notes: 'Inquiry regarding commercial property portfolio CRM & Teams calendar booking for site tours.',
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    lastContact: null,
    m365Synced: false,
    industry: 'Real Estate & PropTech',
    tags: ['PropTech', 'Commercial'],
  },
  {
    id: 'lead-012',
    name: 'Prof. Michael Zhang',
    email: 'm.zhang@nexusedutech.edu',
    phone: '+1 (555) 890-2345',
    company: 'Nexus Education Tech',
    budget: 40000,
    status: 'Qualified',
    score: 68,
    urgency: false,
    engagement: 3,
    replyCount: 3,
    notes: 'Dean of Information Technology seeking student recruitment tracking and Outlook email sync.',
    createdAt: new Date(Date.now() - 9 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    lastContact: new Date(Date.now() - 40 * 3600 * 1000).toISOString(),
    m365Synced: true,
    industry: 'Education & EdTech',
    tags: ['HigherEd', 'University'],
  },
  {
    id: 'lead-013',
    name: 'Carlos Mendez',
    email: 'cmendez@velodrive.io',
    phone: '+1 (555) 901-3456',
    company: 'VeloDrive Motors',
    budget: 135000,
    status: 'Contacted',
    score: 79,
    urgency: true,
    engagement: 4,
    replyCount: 3,
    notes: 'EV fleet management director requiring real-time telematics CRM integration.',
    createdAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    lastContact: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    m365Synced: true,
    industry: 'Automotive & Autonomous Mobility',
    tags: ['EV', 'Autonomous', 'Mobility'],
  },
  {
    id: 'lead-014',
    name: 'Chloe Bennett',
    email: 'chloe@pixelwavestudios.com',
    phone: '+1 (555) 012-3456',
    company: 'PixelWave Interactive Studios',
    budget: 70000,
    status: 'Proposal',
    score: 84,
    urgency: true,
    engagement: 4,
    replyCount: 4,
    notes: 'Game development studio head reviewing licensing deals & Teams production calendar.',
    createdAt: new Date(Date.now() - 11 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    lastContact: new Date(Date.now() - 16 * 3600 * 1000).toISOString(),
    m365Synced: true,
    industry: 'Media, Gaming & Entertainment',
    tags: ['Gaming', 'Media'],
  },
  {
    id: 'lead-015',
    name: 'Vikram Patel',
    email: 'v.patel@telconetglobal.net',
    phone: '+1 (555) 123-4567',
    company: 'TelcoNet Global Networks',
    budget: 160000,
    status: 'Qualified',
    score: 87,
    urgency: true,
    engagement: 5,
    replyCount: 4,
    notes: '5G Infrastructure director evaluating enterprise account management & M365 Exchange sync.',
    createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    lastContact: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    m365Synced: true,
    industry: 'Telecommunications & 5G',
    tags: ['5G', 'Telecom', 'High Budget'],
  },
  {
    id: 'lead-016',
    name: 'Isabelle Laurent',
    email: 'ilaurent@grandazurehotels.com',
    phone: '+1 (555) 234-5678',
    company: 'Grand Azure Luxury Resorts',
    budget: 80000,
    status: 'Contacted',
    score: 66,
    urgency: false,
    engagement: 3,
    replyCount: 2,
    notes: 'Director of Corporate Hospitality seeking VIP guest tracking & Teams event planning integration.',
    createdAt: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    lastContact: new Date(Date.now() - 50 * 3600 * 1000).toISOString(),
    m365Synced: true,
    industry: 'Hospitality & Tourism',
    tags: ['Hospitality', 'VIP'],
  },
  {
    id: 'lead-017',
    name: 'Gareth Thorne',
    email: 'gthorne@apexbuilders.com',
    phone: '+1 (555) 345-7890',
    company: 'Apex Commercial Construction',
    budget: 125000,
    status: 'Proposal',
    score: 85,
    urgency: true,
    engagement: 4,
    replyCount: 3,
    notes: 'Chief Operating Officer evaluating contractor management and M365 Outlook project scheduling.',
    createdAt: new Date(Date.now() - 13 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    lastContact: new Date(Date.now() - 15 * 3600 * 1000).toISOString(),
    m365Synced: true,
    industry: 'Construction & Architecture',
    tags: ['Commercial', 'Construction'],
  },
  {
    id: 'lead-018',
    name: 'Victoria Vance, Esq.',
    email: 'vvance@sterlinglaw.com',
    phone: '+1 (555) 456-8901',
    company: 'Sterling & Vance LLP',
    budget: 90000,
    status: 'Closed',
    score: 93,
    urgency: true,
    engagement: 5,
    replyCount: 5,
    notes: 'Managing Partner onboarded 40 legal staff to Microsoft 365 integrated CRM.',
    createdAt: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
    lastContact: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
    m365Synced: true,
    industry: 'Legal & Professional Services',
    tags: ['Legal', 'Closed Won'],
  },
  {
    id: 'lead-019',
    name: 'Hans Gruber',
    email: 'hgruber@roboticsauto.de',
    phone: '+1 (555) 567-9012',
    company: 'Robotics Automation Systems',
    budget: 140000,
    status: 'Qualified',
    score: 86,
    urgency: true,
    engagement: 4,
    replyCount: 4,
    notes: 'VP Industrial Automation interested in IoT telemetry dashboards and Teams field engineer scheduling.',
    createdAt: new Date(Date.now() - 11 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    lastContact: new Date(Date.now() - 22 * 3600 * 1000).toISOString(),
    m365Synced: true,
    industry: 'Manufacturing & Automation',
    tags: ['Robotics', 'Automation', 'Industry 4.0'],
  }
];

const INITIAL_MEETINGS: Meeting[] = [
  {
    id: 'meeting-001',
    leadId: 'lead-001',
    leadName: 'Sarah Jenkins (TechCorp)',
    leadEmail: 'sarah.jenkins@techcorp.com',
    title: 'Microsoft 365 CRM Integration Review',
    date: new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10),
    time: '10:00',
    durationMinutes: 45,
    location: 'Microsoft Teams Meeting',
    isTeamsMeeting: true,
    teamsJoinUrl: m365Service.generateTeamsMeetingUrl('meeting-001', 'Microsoft 365 CRM Review'),
    m365Synced: true,
    status: 'Scheduled',
    notes: 'Demonstrate lead energy scoring and M365 contact synchronization.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'meeting-002',
    leadId: 'lead-002',
    leadName: 'Marcus Vance (Vertex Digital)',
    leadEmail: 'm.vance@vertexdigital.io',
    title: 'Final Proposal & Contract Discussion',
    date: new Date(Date.now() + 48 * 3600 * 1000).toISOString().slice(0, 10),
    time: '14:30',
    durationMinutes: 30,
    location: 'Microsoft Teams Call',
    isTeamsMeeting: true,
    teamsJoinUrl: m365Service.generateTeamsMeetingUrl('meeting-002', 'Proposal Review'),
    m365Synced: true,
    status: 'Scheduled',
    notes: 'Finalize pricing tier and implementation timeline.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'meeting-003',
    leadId: 'lead-006',
    leadName: 'Alexander Sterling (Summit Capital)',
    leadEmail: 'asterling@summitcap.com',
    title: 'Executive Sales Pipeline Walkthrough',
    date: new Date(Date.now() + 72 * 3600 * 1000).toISOString().slice(0, 10),
    time: '11:00',
    durationMinutes: 60,
    location: 'Microsoft Teams Video',
    isTeamsMeeting: true,
    teamsJoinUrl: m365Service.generateTeamsMeetingUrl('meeting-003', 'Pipeline Walkthrough'),
    m365Synced: true,
    status: 'Scheduled',
    notes: 'Walkthrough of SPIHEAD energy analytics & M365 Excel exports.',
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_ACTIVITIES: Activity[] = [
  {
    id: 'act-001',
    type: 'm365_synced',
    message: 'Synchronized 14 contacts with Microsoft 365 Outlook People',
    timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    user: { name: 'Sanelisiwe Sileku' },
  },
  {
    id: 'act-002',
    type: 'meeting_scheduled',
    message: 'Scheduled Microsoft Teams meeting with Sarah Jenkins (TechCorp)',
    timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    user: { name: 'Sanelisiwe Sileku' },
  },
  {
    id: 'act-003',
    type: 'email_sent',
    message: 'Sent Outlook email proposal follow-up to Marcus Vance',
    timestamp: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
    user: { name: 'Sanelisiwe Sileku' },
  },
  {
    id: 'act-004',
    type: 'status_changed',
    message: 'Moved Acme Global Logistics from Proposal to Closed Won 🎉',
    timestamp: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
    user: { name: 'Sanelisiwe Sileku' },
  },
  {
    id: 'act-005',
    type: 'lead_added',
    message: 'Added new lead Rachel Adams (Horizon Healthcare)',
    timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    user: { name: 'Sanelisiwe Sileku' },
  },
];

const INITIAL_EMAILS: EmailMessage[] = [
  {
    id: 'email-001',
    leadId: 'lead-001',
    leadName: 'Sarah Jenkins',
    leadEmail: 'sarah.jenkins@techcorp.com',
    subject: 'SPIHEAD CRM & Microsoft 365 Architecture Brief',
    body: 'Hi Sarah,\n\nFollowing up on our call regarding your enterprise CRM requirements. Our platform seamlessly connects with your existing Microsoft 365 subscription, including Outlook Email, Teams meetings, and Calendar sync.\n\nLooking forward to our upcoming Teams demo!\n\nBest regards,\nSanelisiwe Sileku',
    sentAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    m365MessageId: 'm365-msg-101',
    status: 'sent',
    templateUsed: 'Microsoft 365 Architecture Brief',
  },
  {
    id: 'email-002',
    leadId: 'lead-002',
    leadName: 'Marcus Vance',
    leadEmail: 'm.vance@vertexdigital.io',
    subject: 'Custom Proposal - Vertex Digital & SPIHEAD',
    body: 'Hi Marcus,\n\nAttached is the proposal for Vertex Digital. We have included automated AI lead scoring and full M365 Outlook sync capabilities.\n\nLet us know if you would like any adjustments before our call!\n\nBest,\nSanelisiwe Sileku',
    sentAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    m365MessageId: 'm365-msg-102',
    status: 'sent',
    templateUsed: 'Proposal Follow-Up',
  },
];

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
    const isCleanedForProd = localStorage.getItem('spihead_prod_cleaned_v2');
    if (!isCleanedForProd) {
      localStorage.setItem('spihead_prod_cleaned_v2', 'true');
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
