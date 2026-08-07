export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Closed';

export const STANDARD_INDUSTRIES = [
  'Aerospace & Defense',
  'Automotive & Autonomous Mobility',
  'BioTech & Pharmaceuticals',
  'CleanTech & Renewable Energy',
  'Construction & Architecture',
  'Digital Marketing & Agencies',
  'Education & EdTech',
  'Enterprise Software & SaaS',
  'Financial Services & FinTech',
  'Healthcare & Life Sciences',
  'Hospitality & Tourism',
  'Legal & Professional Services',
  'Manufacturing & Automation',
  'Media, Gaming & Entertainment',
  'Real Estate & PropTech',
  'Retail & E-Commerce',
  'Supply Chain & Logistics',
  'Telecommunications & 5G',
  'Venture Capital & Private Equity'
] as const;

export type IndustrySector = (typeof STANDARD_INDUSTRIES)[number] | string;

export interface ScoreComponentBreakdown {
  budgetScore: number;
  engagementScore: number;
  urgencyScore: number;
  replyScore: number;
  m365ActivityScore: number;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company: string;
  budget: number;
  status: LeadStatus;
  score: number; // Lead Energy score (0 - 100)
  urgency: boolean;
  engagement: number; // 1-5 scale
  replyCount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  lastContact: string | null;
  m365Synced?: boolean;
  m365ContactId?: string;
  tags?: string[];
  ownerName?: string;
  industry?: string;
  scoreBreakdown?: ScoreComponentBreakdown;
}

export interface Meeting {
  id: string;
  leadId: string;
  leadName: string;
  leadEmail?: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  durationMinutes: number;
  location?: string;
  isTeamsMeeting: boolean;
  teamsJoinUrl?: string;
  m365EventId?: string;
  m365Synced?: boolean;
  notes?: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  createdAt: string;
}

export interface Activity {
  id: string;
  type: 'lead_added' | 'status_changed' | 'meeting_scheduled' | 'email_sent' | 'm365_synced' | 'note_added' | 'score_updated';
  message: string;
  timestamp: string;
  user: {
    name: string;
    avatar?: string;
    email?: string;
  };
  leadId?: string;
  leadName?: string;
}

export interface EmailMessage {
  id: string;
  leadId: string;
  leadName: string;
  leadEmail: string;
  subject: string;
  body: string;
  sentAt: string;
  m365MessageId?: string;
  status: 'sent' | 'draft' | 'failed';
  templateUsed?: string;
}

export interface M365Account {
  isConnected: boolean;
  displayName: string;
  userPrincipalName: string;
  email: string;
  tenantId: string;
  tenantName: string;
  subscriptionType: string;
  syncedContactsCount: number;
  syncedEmailsCount: number;
  syncedEventsCount: number;
  lastSyncedAt: string | null;
  scopes: string[];
  jobTitle?: string;
  companyName?: string;
  department?: string;
  phoneNumber?: string;
  salesTarget?: number;
  currency?: string;
  territory?: string;
  bio?: string;
  avatarUrl?: string;
}
