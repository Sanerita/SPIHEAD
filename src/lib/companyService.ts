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
    productsAndServices: '',
    targetAudience: '',
    valueProposition: '',
    leadTermSingular: 'Lead',
    leadTermPlural: 'Leads',
    customPipelineStages: ['New Lead', 'Contacted', 'Qualified', 'Proposal', 'Closed'],
    aiTone: 'Professional & Executive',
    sampleLeads: []
  },
  'CleanTech & Renewable Energy': {
    productsAndServices: '',
    targetAudience: '',
    valueProposition: '',
    leadTermSingular: 'Energy Prospect',
    leadTermPlural: 'Energy Projects',
    customPipelineStages: ['Initial Inquiry', 'Site Audit', 'Engineering Proposal', 'PPA Underwriting', 'Contract Signed'],
    aiTone: 'Consultative & Technical',
    sampleLeads: []
  },
  'Healthcare & Life Sciences': {
    productsAndServices: '',
    targetAudience: '',
    valueProposition: '',
    leadTermSingular: 'Clinical Account',
    leadTermPlural: 'Clinical Accounts',
    customPipelineStages: ['Inbound Inquiry', 'HIPAA Review', 'Clinical Trial / Demo', 'Procurement Board', 'Active Account'],
    aiTone: 'Consultative & Technical',
    sampleLeads: []
  },
  'Real Estate & PropTech': {
    productsAndServices: '',
    targetAudience: '',
    valueProposition: '',
    leadTermSingular: 'Property Deal',
    leadTermPlural: 'Property Deals',
    customPipelineStages: ['New Prospect', 'Property Tour', 'Letter of Intent (LOI)', 'Under Contract', 'Closed Escrow'],
    aiTone: 'Relationship-Focused',
    sampleLeads: []
  },
  'Financial Services & FinTech': {
    productsAndServices: '',
    targetAudience: '',
    valueProposition: '',
    leadTermSingular: 'Institutional Client',
    leadTermPlural: 'Institutional Clients',
    customPipelineStages: ['Inquiry', 'KYC / Due Diligence', 'Term Sheet', 'Compliance Approval', 'Onboarded'],
    aiTone: 'Direct & High-Velocity',
    sampleLeads: []
  },
  'Digital Marketing & Agencies': {
    productsAndServices: '',
    targetAudience: '',
    valueProposition: '',
    leadTermSingular: 'Brand Client',
    leadTermPlural: 'Brand Clients',
    customPipelineStages: ['Lead Received', 'Audit Call', 'Strategy Pitch', 'Contract Review', 'Campaign Launch'],
    aiTone: 'Persuasive & Value-Driven',
    sampleLeads: []
  }
};

const DEFAULT_PROFILE: CompanyBusinessProfile = {
  companyName: '',
  industry: 'General Business',
  productsAndServices: '',
  targetAudience: '',
  valueProposition: '',
  currency: 'USD',
  currencySymbol: '$',
  leadTermSingular: 'Lead',
  leadTermPlural: 'Leads',
  customPipelineStages: ['New', 'Contacted', 'Qualified', 'Proposal', 'Closed'],
  aiTone: 'Professional & Executive',
  autoAdaptedForIndustry: false,
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
    const cleanCompany = companyName || this.profile.companyName || '';

    let updated: Partial<CompanyBusinessProfile> = {
      companyName: cleanCompany,
      industry: industry,
      autoAdaptedForIndustry: true
    };

    if (preset) {
      updated = {
        ...updated,
        productsAndServices: preset.productsAndServices || '',
        targetAudience: preset.targetAudience || '',
        valueProposition: preset.valueProposition || '',
        leadTermSingular: preset.leadTermSingular,
        leadTermPlural: preset.leadTermPlural,
        customPipelineStages: preset.customPipelineStages,
        aiTone: preset.aiTone
      };
    } else {
      // General default for custom industries
      updated = {
        ...updated,
        productsAndServices: '',
        targetAudience: '',
        valueProposition: '',
        leadTermSingular: 'Client / Lead',
        leadTermPlural: 'Clients & Opportunities',
        customPipelineStages: ['New Inquiry', 'Discovery', 'Qualified', 'Proposal', 'Closed Won'],
        aiTone: 'Professional & Executive'
      };
    }

    return this.saveProfile(updated);
  }

  public getSampleLeadsForIndustry(_industry: string): any[] {
    return [];
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
