import { STANDARD_INDUSTRIES } from '../types/crm';

export interface CompanyBusinessProfile {
  companyName: string;
  industry: string;
  productsAndServices: string;
  targetAudience: string;
  valueProposition: string;
  currency: string;
  currencySymbol: string;
  leadTermSingular: string;
  leadTermPlural: string;
  customPipelineStages: string[];
  aiTone: 'Professional & Executive' | 'Consultative & Technical' | 'Direct & High-Velocity' | 'Relationship-Focused' | 'Persuasive & Value-Driven';
  autoAdaptedForIndustry: boolean;
  updatedAt: string;
}

export const INDUSTRY_PRESETS: Record<string, Partial<CompanyBusinessProfile> & { sampleLeads: any[] }> = {
  'Enterprise Software & SaaS': {
    productsAndServices: 'Cloud CRM, Automated AI Workflows, M365 Integration & Pipeline Analytics',
    targetAudience: 'Chief Technology Officers, VPs of Sales, Enterprise Directors',
    valueProposition: 'Accelerate deal velocity and automate pipeline intelligence with AI',
    leadTermSingular: 'Lead',
    leadTermPlural: 'Leads',
    customPipelineStages: ['New Lead', 'Contacted', 'Qualified', 'Proposal', 'Closed'],
    aiTone: 'Professional & Executive',
    sampleLeads: [
      {
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
        industry: 'Enterprise Software & SaaS',
        tags: ['Enterprise', 'High Budget', 'M365 Priority']
      },
      {
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
        industry: 'Enterprise Software & SaaS',
        tags: ['Proposal Sent', 'Teams Demo']
      },
      {
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
        industry: 'Enterprise Software & SaaS',
        tags: ['Closed Won', 'Key Client']
      }
    ]
  },
  'CleanTech & Renewable Energy': {
    productsAndServices: 'Commercial Solar Arrays, Microgrid Energy Storage & Carbon Accounting Systems',
    targetAudience: 'Chief Sustainability Officers, Commercial Facility Managers, Municipal Energy Directors',
    valueProposition: 'Slash carbon emissions and operational energy overhead with high-efficiency renewable microgrids',
    leadTermSingular: 'Energy Prospect',
    leadTermPlural: 'Energy Projects',
    customPipelineStages: ['Initial Inquiry', 'Site Audit', 'Engineering Proposal', 'PPA Underwriting', 'Contract Signed'],
    aiTone: 'Consultative & Technical',
    sampleLeads: [
      {
        name: 'Dr. Maya Lin',
        email: 'm.lin@greengridpower.com',
        phone: '+1 (555) 345-6789',
        company: 'GreenGrid Renewable Energy',
        budget: 450000,
        status: 'Proposal',
        score: 91,
        urgency: true,
        engagement: 5,
        replyCount: 5,
        notes: 'Requesting 2.5MW commercial solar microgrid proposal with battery storage backup for logistics hub.',
        industry: 'CleanTech & Renewable Energy',
        tags: ['PPA Priority', '2.5MW Grid', 'High Score']
      },
      {
        name: 'Julian Thorne',
        email: 'j.thorne@solardynamics.org',
        phone: '+1 (555) 890-1234',
        company: 'Solar Dynamics Commercial',
        budget: 280000,
        status: 'Site Audit',
        score: 84,
        urgency: true,
        engagement: 4,
        replyCount: 3,
        notes: 'Completed structural roof evaluation. Preparing 15-year PPA financial return model.',
        industry: 'CleanTech & Renewable Energy',
        tags: ['Commercial Roof', 'Audit Complete']
      },
      {
        name: 'Victoria Cross',
        email: 'v.cross@ecowatt.com',
        phone: '+1 (555) 678-9012',
        company: 'EcoWatt Energy Systems',
        budget: 620000,
        status: 'Contract Signed',
        score: 98,
        urgency: false,
        engagement: 5,
        replyCount: 7,
        notes: 'Signed 5MW industrial solar agreement. Interconnection filing with local utility completed.',
        industry: 'CleanTech & Renewable Energy',
        tags: ['5MW Industrial', 'Utility Interconnect']
      }
    ]
  },
  'Healthcare & Life Sciences': {
    productsAndServices: 'HIPAA-Compliant Diagnostic Hardware, Medical AI Imaging & Clinical Workflow Software',
    targetAudience: 'Hospital Chief Medical Officers, Clinical Operations Directors, Practice Administrators',
    valueProposition: 'Optimize patient care outcomes and streamline clinical compliance with intelligent health tech',
    leadTermSingular: 'Clinical Account',
    leadTermPlural: 'Clinical Accounts',
    customPipelineStages: ['Inbound Inquiry', 'HIPAA Review', 'Clinical Trial / Demo', 'Procurement Board', 'Active Account'],
    aiTone: 'Consultative & Technical',
    sampleLeads: [
      {
        name: 'Rachel Adams',
        email: 'radams@horizonhealth.org',
        phone: '+1 (555) 321-7890',
        company: 'Horizon Healthcare Network',
        budget: 210000,
        status: 'Clinical Trial / Demo',
        score: 87,
        urgency: true,
        engagement: 5,
        replyCount: 4,
        notes: 'Evaluating HIPAA-compliant AI triage platform across 14 regional outpatient centers.',
        industry: 'Healthcare & Life Sciences',
        tags: ['HIPAA Compliant', 'Hospital Network']
      },
      {
        name: 'Dr. Arthur Pendelton',
        email: 'a.pendelton@apexmed.org',
        phone: '+1 (555) 987-6543',
        company: 'Apex Medical Specialists',
        budget: 140000,
        status: 'Procurement Board',
        score: 89,
        urgency: true,
        engagement: 4,
        replyCount: 3,
        notes: 'Board review scheduled for Friday. BAA agreement and security review passed.',
        industry: 'Healthcare & Life Sciences',
        tags: ['BAA Executed', 'Board Approval']
      }
    ]
  },
  'Real Estate & PropTech': {
    productsAndServices: 'Commercial Real Estate Brokerage, Asset Portfolio Management & High-Yield Listings',
    targetAudience: 'Real Estate Investors, Property Developers, High-Net-Worth Buyers',
    valueProposition: 'Maximize ROI and unlock prime commercial & residential real estate portfolios',
    leadTermSingular: 'Property Deal',
    leadTermPlural: 'Property Deals',
    customPipelineStages: ['New Prospect', 'Property Tour', 'Letter of Intent (LOI)', 'Under Contract', 'Closed Escrow'],
    aiTone: 'Relationship-Focused',
    sampleLeads: [
      {
        name: 'Harrison Forde',
        email: 'h.forde@sterlingestates.com',
        phone: '+1 (555) 456-7890',
        company: 'Sterling Capital Holdings',
        budget: 2500000,
        status: 'Letter of Intent (LOI)',
        score: 94,
        urgency: true,
        engagement: 5,
        replyCount: 6,
        notes: 'Submitted LOI for 48-unit multi-family apartment complex. Proof of funds verified.',
        industry: 'Real Estate & PropTech',
        tags: ['Multi-Family', '2.5M LOI', 'Escrow Ready']
      },
      {
        name: 'Claire Kensington',
        email: 'claire@kensingtondev.com',
        phone: '+1 (555) 789-0123',
        company: 'Kensington Property Group',
        budget: 1800000,
        status: 'Property Tour',
        score: 81,
        urgency: false,
        engagement: 4,
        replyCount: 3,
        notes: 'Completed tour of downtown Class-A office tower. Interested in 1031 tax exchange options.',
        industry: 'Real Estate & PropTech',
        tags: ['Class-A Office', '1031 Exchange']
      }
    ]
  },
  'Financial Services & FinTech': {
    productsAndServices: 'Automated Wealth Management, Automated KYC/AML Risk Engine & Payment Solutions',
    targetAudience: 'VPs of Finance, Portfolio Managers, Chief Risk Officers',
    valueProposition: 'Elevate capital efficiency and automate regulatory compliance with bank-grade financial tech',
    leadTermSingular: 'Institutional Client',
    leadTermPlural: 'Institutional Clients',
    customPipelineStages: ['Inquiry', 'KYC / Due Diligence', 'Term Sheet', 'Compliance Approval', 'Onboarded'],
    aiTone: 'Direct & High-Velocity',
    sampleLeads: [
      {
        name: 'Alexander Sterling',
        email: 'asterling@summitcap.com',
        phone: '+1 (555) 901-2345',
        company: 'Summit Capital Partners',
        budget: 750000,
        status: 'Term Sheet',
        score: 92,
        urgency: true,
        engagement: 5,
        replyCount: 5,
        notes: 'Managing Director reviewing term sheet for automated wealth portfolio rebalancing API.',
        industry: 'Financial Services & FinTech',
        tags: ['Term Sheet', 'Private Equity', 'High Value']
      },
      {
        name: 'David Chen',
        email: 'david.chen@apexinn.com',
        phone: '+1 (555) 678-5432',
        company: 'Apex Innovations',
        budget: 180000,
        status: 'KYC / Due Diligence',
        score: 74,
        urgency: false,
        engagement: 3,
        replyCount: 2,
        notes: 'Submitted anti-money-laundering compliance documentation. Pending risk committee signoff.',
        industry: 'Financial Services & FinTech',
        tags: ['FinTech', 'KYC Review']
      }
    ]
  },
  'Digital Marketing & Agencies': {
    productsAndServices: 'Performance Marketing, Full-Funnel SEO & Social Paid Media Management',
    targetAudience: 'Chief Marketing Officers, Brand Directors, E-Commerce Founders',
    valueProposition: 'Scale ROAS and drive predictable customer acquisition through data-driven performance campaigns',
    leadTermSingular: 'Brand Client',
    leadTermPlural: 'Brand Clients',
    customPipelineStages: ['Lead Received', 'Audit Call', 'Strategy Pitch', 'Contract Review', 'Campaign Launch'],
    aiTone: 'Persuasive & Value-Driven',
    sampleLeads: [
      {
        name: 'Marcus Vance',
        email: 'm.vance@vertexdigital.io',
        phone: '+1 (555) 876-1234',
        company: 'Vertex Digital Agency',
        budget: 60000,
        status: 'Strategy Pitch',
        score: 86,
        urgency: true,
        engagement: 4,
        replyCount: 4,
        notes: 'Presented Q3 performance marketing pitch deck. Target: 4.5x ROAS across paid media channels.',
        industry: 'Digital Marketing & Agencies',
        tags: ['Performance Pitch', '4.5x ROAS']
      }
    ]
  }
};

const DEFAULT_PROFILE: CompanyBusinessProfile = {
  companyName: 'SPIHEAD Enterprise',
  industry: 'Enterprise Software & SaaS',
  productsAndServices: 'Enterprise Cloud CRM, AI Lead Energy Analytics & M365 Ecosystem',
  targetAudience: 'CTOs, VPs of Sales, Operations Executives',
  valueProposition: 'Drive revenue growth and automate lead qualification with real-time AI scoring and M365 integration.',
  currency: 'USD',
  currencySymbol: '$',
  leadTermSingular: 'Lead',
  leadTermPlural: 'Leads',
  customPipelineStages: ['New', 'Contacted', 'Qualified', 'Proposal', 'Closed'],
  aiTone: 'Professional & Executive',
  autoAdaptedForIndustry: true,
  updatedAt: new Date().toISOString()
};

class CompanyService {
  private profile: CompanyBusinessProfile;
  private listeners: (() => void)[] = [];

  constructor() {
    this.profile = this.loadProfile();
  }

  private loadProfile(): CompanyBusinessProfile {
    try {
      const saved = localStorage.getItem('spihead_company_profile');
      if (saved) {
        return { ...DEFAULT_PROFILE, ...JSON.parse(saved) };
      }
    } catch (e) {
      // fallback
    }
    return { ...DEFAULT_PROFILE };
  }

  public getProfile(): CompanyBusinessProfile {
    return { ...this.profile };
  }

  public saveProfile(newProfile: Partial<CompanyBusinessProfile>): CompanyBusinessProfile {
    // Determine currency symbol based on currency
    let symbol = '$';
    const curr = newProfile.currency || this.profile.currency;
    switch (curr) {
      case 'EUR': symbol = '€'; break;
      case 'GBP': symbol = '£'; break;
      case 'ZAR': symbol = 'R'; break;
      case 'CAD': symbol = 'C$'; break;
      case 'AUD': symbol = 'A$'; break;
      case 'JPY': symbol = '¥'; break;
      case 'INR': symbol = '₹'; break;
      case 'AED': symbol = 'AED '; break;
      default: symbol = '$'; break;
    }

    this.profile = {
      ...this.profile,
      ...newProfile,
      currencySymbol: symbol,
      updatedAt: new Date().toISOString()
    };

    try {
      localStorage.setItem('spihead_company_profile', JSON.stringify(this.profile));
    } catch (e) {
      console.warn('Could not save company profile to localStorage:', e);
    }

    this.notify();
    return this.getProfile();
  }

  public adaptToIndustry(industry: string, companyName?: string): CompanyBusinessProfile {
    const preset = INDUSTRY_PRESETS[industry];
    const cleanCompany = companyName || this.profile.companyName || 'My Company';

    let updated: Partial<CompanyBusinessProfile> = {
      companyName: cleanCompany,
      industry: industry,
      autoAdaptedForIndustry: true
    };

    if (preset) {
      updated = {
        ...updated,
        productsAndServices: preset.productsAndServices,
        targetAudience: preset.targetAudience,
        valueProposition: preset.valueProposition,
        leadTermSingular: preset.leadTermSingular,
        leadTermPlural: preset.leadTermPlural,
        customPipelineStages: preset.customPipelineStages,
        aiTone: preset.aiTone
      };
    } else {
      // General default for custom industries
      updated = {
        ...updated,
        productsAndServices: `${industry} Products & Advisory Services`,
        targetAudience: `Decision Makers & Clients in ${industry}`,
        valueProposition: `Delivering high-value ${industry} solutions with exceptional ROI`,
        leadTermSingular: 'Client / Lead',
        leadTermPlural: 'Clients & Opportunities',
        customPipelineStages: ['New Inquiry', 'Discovery', 'Qualified', 'Proposal', 'Closed Won'],
        aiTone: 'Professional & Executive'
      };
    }

    return this.saveProfile(updated);
  }

  public getSampleLeadsForIndustry(industry: string): any[] {
    const preset = INDUSTRY_PRESETS[industry];
    if (preset && preset.sampleLeads && preset.sampleLeads.length > 0) {
      return preset.sampleLeads;
    }
    // Generic fallback leads
    return [
      {
        name: 'Jordan Miller',
        email: 'j.miller@enterprise.org',
        phone: '+1 (555) 234-9900',
        company: 'Global Enterprises Inc.',
        budget: 95000,
        status: 'New Inquiry',
        score: 82,
        urgency: true,
        engagement: 4,
        replyCount: 2,
        notes: `Inquired regarding ${industry} customized services and implementation timeline.`,
        industry: industry,
        tags: ['New Prospect', 'Inbound']
      },
      {
        name: 'Samantha Reed',
        email: 's.reed@vanguardgroup.io',
        phone: '+1 (555) 888-3344',
        company: 'Vanguard Group',
        budget: 150000,
        status: 'Proposal',
        score: 91,
        urgency: true,
        engagement: 5,
        replyCount: 5,
        notes: `High buyer signal. Reviewing custom contract for ${industry} solutions.`,
        industry: industry,
        tags: ['High Value', 'Proposal Sent']
      }
    ];
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }
}

export const companyService = new CompanyService();
