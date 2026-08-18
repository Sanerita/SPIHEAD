import { SubscriptionPlan, UserSubscription, Invoice, PlanTier, BillingInterval } from '../types/subscription';
import { currencyService } from './currencyService';

export const SAAS_PLANS: SubscriptionPlan[] = [
  {
    id: 'freelancer',
    name: 'Freelancer & Solo',
    tagline: 'Ideal for independent consultants, solo founders, and freelance operators.',
    badge: 'Affordable Entry',
    basePriceUSDMonthly: 12,
    basePriceUSDAnnual: 9.60,
    maxSeats: 1,
    aiCreditsMonthly: 150,
    integrationsTier: 'Standard Sync',
    idealFor: 'Independent consultants, sales contractors, solo agency owners',
    features: [
      '1 Workspace Seat',
      'Unlimited Leads & Deals Pipeline',
      'AI Lead Energy Scoring (150 AI Credits/mo)',
      'Calendar & Email Meeting Sync',
      'Smart Cold Email Templates & Tracking',
      'Local Data Storage & Standard Backup',
      'Mobile-Friendly Touch Console'
    ],
    limitations: [
      'Multi-user seat management disabled',
      'Shared team calendars disabled'
    ]
  },
  {
    id: 'business',
    name: 'Small Business & Growth',
    tagline: 'Powering growing agencies, boutiques, and sales teams up to 10 seats.',
    badge: 'Most Popular',
    recommended: true,
    basePriceUSDMonthly: 39,
    basePriceUSDAnnual: 31.20,
    maxSeats: 10,
    aiCreditsMonthly: 1000,
    integrationsTier: 'Advanced Two-Way',
    idealFor: 'Boutique agencies, SMB sales teams, professional services firms',
    features: [
      'Up to 10 Team Seats & Role Assignments',
      'Two-Way Calendar & Email Sync',
      'Advanced AI Lead Energy & Auto-Enrichment',
      '1,000 AI Lead Scoring Credits / month',
      'Shared Team Deal Pipeline & Stage Metrics',
      'Role-Based Access Control (RBAC)',
      'Custom Brand Themes & Accent Styling',
      'Automated Meeting Follow-Up Emails'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise Organization',
    tagline: 'Scalable corporate sales infrastructure with dedicated tenant SSO.',
    badge: 'Maximum Power',
    basePriceUSDMonthly: 99,
    basePriceUSDAnnual: 79.20,
    maxSeats: 'Unlimited',
    aiCreditsMonthly: 'Unlimited',
    integrationsTier: 'Enterprise SSO & API',
    idealFor: 'Mid-market companies, enterprise sales orgs, multi-team divisions',
    features: [
      'Unlimited Team Seats & Sub-Departments',
      'Enterprise Identity & SSO Support',
      'Unlimited AI Lead Energy Engine Computations',
      'AES-256 Encryption & Real-time Audit Trail',
      'Custom AI Lead Energy Model Fine-Tuning',
      'Dedicated Customer Success Manager',
      '24/7 Priority SLA & Phone Support',
      'Custom Data Retention & GDPR Auto-Archive'
    ]
  }
];

const DEFAULT_SUBSCRIPTION: UserSubscription = {
  planId: 'business',
  billingInterval: 'annual',
  currency: 'USD',
  status: 'active',
  trialEndsAt: new Date(Date.now() + 86400000 * 14).toISOString(),
  nextBillingDate: new Date(Date.now() + 86400000 * 30).toISOString(),
  seatsCount: 5,
  aiCreditsRemaining: 850,
  paymentMethod: {
    brand: 'Visa',
    last4: '4242',
    expiry: '12/28'
  }
};

const DEFAULT_INVOICES: Invoice[] = [
  {
    id: 'inv_spi_9021',
    date: new Date(Date.now() - 86400000 * 30).toISOString(),
    amountFormatted: '$374.40',
    planName: 'Small Business & Growth (Annual)',
    currency: 'USD',
    status: 'paid',
    pdfUrl: '#'
  },
  {
    id: 'inv_spi_8812',
    date: new Date(Date.now() - 86400000 * 395).toISOString(),
    amountFormatted: '$374.40',
    planName: 'Small Business & Growth (Annual)',
    currency: 'USD',
    status: 'paid',
    pdfUrl: '#'
  }
];

class SubscriptionService {
  private subscription: UserSubscription = DEFAULT_SUBSCRIPTION;
  private invoices: Invoice[] = DEFAULT_INVOICES;
  private listeners: (() => void)[] = [];

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      const savedSub = localStorage.getItem('spihead_subscription_plan');
      const savedInvoices = localStorage.getItem('spihead_subscription_invoices');

      if (savedSub) {
        this.subscription = JSON.parse(savedSub);
      } else {
        this.subscription = { ...DEFAULT_SUBSCRIPTION };
      }

      if (savedInvoices) {
        this.invoices = JSON.parse(savedInvoices);
      } else {
        this.invoices = [...DEFAULT_INVOICES];
      }
    } catch (e) {
      this.subscription = { ...DEFAULT_SUBSCRIPTION };
      this.invoices = [...DEFAULT_INVOICES];
    }
  }

  private saveState() {
    try {
      localStorage.setItem('spihead_subscription_plan', JSON.stringify(this.subscription));
      localStorage.setItem('spihead_subscription_invoices', JSON.stringify(this.invoices));
    } catch (e) {
      console.error('Failed to save subscription state:', e);
    }
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

  public getSubscription(): UserSubscription {
    return { ...this.subscription };
  }

  public getInvoices(): Invoice[] {
    return [...this.invoices];
  }

  public getPlanById(planTier: PlanTier): SubscriptionPlan {
    return SAAS_PLANS.find((p) => p.id === planTier) || SAAS_PLANS[1];
  }

  public getCurrentPlan(): SubscriptionPlan {
    return this.getPlanById(this.subscription.planId);
  }

  public getCapabilities() {
    const plan = this.getCurrentPlan();
    const isFreelancer = plan.id === 'freelancer';
    const isBusiness = plan.id === 'business';
    const isEnterprise = plan.id === 'enterprise';

    return {
      planId: plan.id,
      planName: plan.name,
      maxSeats: plan.maxSeats,
      currentSeats: this.subscription.seatsCount,
      aiCreditsRemaining: isEnterprise ? ('Unlimited' as const) : this.subscription.aiCreditsRemaining,
      maxAiCreditsMonthly: plan.aiCreditsMonthly,
      hasMultiUserSeats: !isFreelancer,
      hasSharedCalendar: !isFreelancer,
      hasCustomBranding: isBusiness || isEnterprise,
      hasEnterpriseSSO: isEnterprise,
      hasAiModelFineTuning: isEnterprise,
      hasAuditRetention: isEnterprise,
      hasDedicatedCSM: isEnterprise,
      hasPrioritySLA: isEnterprise,
    };
  }

  public hasFeature(featureKey: 'multi_user' | 'custom_branding' | 'sso' | 'ai_finetuning' | 'audit_archive' | 'csm'): boolean {
    const caps = this.getCapabilities();
    switch (featureKey) {
      case 'multi_user':
        return caps.hasMultiUserSeats;
      case 'custom_branding':
        return caps.hasCustomBranding;
      case 'sso':
        return caps.hasEnterpriseSSO;
      case 'ai_finetuning':
        return caps.hasAiModelFineTuning;
      case 'audit_archive':
        return caps.hasAuditRetention;
      case 'csm':
        return caps.hasDedicatedCSM;
      default:
        return false;
    }
  }

  public canAddSeat(requestedNewCount?: number): { allowed: boolean; maxSeats: number | 'Unlimited'; message?: string } {
    const plan = this.getCurrentPlan();
    const targetCount = requestedNewCount ?? (this.subscription.seatsCount + 1);

    if (plan.maxSeats === 'Unlimited') {
      return { allowed: true, maxSeats: 'Unlimited' };
    }

    if (targetCount > plan.maxSeats) {
      return {
        allowed: false,
        maxSeats: plan.maxSeats,
        message: `Your current ${plan.name} plan is limited to max ${plan.maxSeats} seat${plan.maxSeats === 1 ? '' : 's'}. Upgrade your plan to add more team seats.`
      };
    }

    return { allowed: true, maxSeats: plan.maxSeats };
  }

  public setSeatsCount(count: number): boolean {
    const check = this.canAddSeat(count);
    if (!check.allowed) return false;

    this.subscription.seatsCount = count;
    this.saveState();
    this.notify();
    return true;
  }

  public consumeAiCredit(amount: number = 1): { success: boolean; remaining: number | 'Unlimited'; message?: string } {
    const plan = this.getCurrentPlan();
    if (plan.id === 'enterprise' || plan.aiCreditsMonthly === 'Unlimited') {
      return { success: true, remaining: 'Unlimited' };
    }

    if (this.subscription.aiCreditsRemaining < amount) {
      return {
        success: false,
        remaining: this.subscription.aiCreditsRemaining,
        message: `AI Lead Energy Credits Depleted (${this.subscription.aiCreditsRemaining} remaining). Upgrade to Small Business or Enterprise for additional monthly AI credits.`
      };
    }

    this.subscription.aiCreditsRemaining = Math.max(0, this.subscription.aiCreditsRemaining - amount);
    this.saveState();
    this.notify();
    return { success: true, remaining: this.subscription.aiCreditsRemaining };
  }

  public getCSMDetails() {
    if (this.subscription.planId !== 'enterprise') return null;
    return {
      name: 'Enterprise Success Specialist',
      title: 'Senior Enterprise Success Lead',
      email: 's.jenkins@spihead.com',
      phone: '+1 (800) 555-SPIHEAD (ext. 901)',
      sla: '15-Minute Guaranteed Response SLA (24/7)',
      dedicatedTenant: 'spihead-corp-ent-092.azure.net'
    };
  }

  public upgradeOrChangePlan(
    planTier: PlanTier,
    billingInterval: BillingInterval,
    promoCode?: string,
    paymentDetails?: { brand: string; last4: string; expiry: string }
  ): boolean {
    const plan = this.getPlanById(planTier);
    let discountPercent = 0;

    if (promoCode && promoCode.trim().toUpperCase() === 'LAUNCH50') {
      discountPercent = 50;
    } else if (promoCode && promoCode.trim().toUpperCase() === 'FREELANCE20') {
      discountPercent = 20;
    }

    const priceInfo = currencyService.getPriceForPlan(planTier, billingInterval, discountPercent);

    let newSeatsCount = this.subscription.seatsCount;
    if (plan.maxSeats !== 'Unlimited') {
      newSeatsCount = Math.min(this.subscription.seatsCount, plan.maxSeats);
      if (newSeatsCount < 1) newSeatsCount = 1;
    } else if (newSeatsCount < 15) {
      newSeatsCount = 15;
    }

    let initialCredits = 150;
    if (planTier === 'business') initialCredits = 1000;
    if (planTier === 'enterprise') initialCredits = 999999;

    this.subscription = {
      ...this.subscription,
      planId: planTier,
      billingInterval,
      currency: currencyService.getCurrencyCode(),
      status: 'active',
      nextBillingDate: new Date(Date.now() + (billingInterval === 'annual' ? 86400000 * 365 : 86400000 * 30)).toISOString(),
      aiCreditsRemaining: initialCredits,
      seatsCount: newSeatsCount,
      paymentMethod: paymentDetails || this.subscription.paymentMethod || { brand: 'Visa', last4: '8812', expiry: '09/29' },
      promoCodeApplied: promoCode || undefined,
      discountPercentage: discountPercent || undefined
    };

    // Generate new invoice record
    const newInvoice: Invoice = {
      id: 'inv_spi_' + Math.floor(1000 + Math.random() * 9000),
      date: new Date().toISOString(),
      amountFormatted: priceInfo.formattedTotal,
      planName: `${plan.name} (${billingInterval === 'annual' ? 'Annual' : 'Monthly'})`,
      currency: priceInfo.code,
      status: 'paid',
      pdfUrl: '#'
    };

    this.invoices = [newInvoice, ...this.invoices];
    this.saveState();
    this.notify();
    return true;
  }

  public cancelSubscription(): void {
    this.subscription.status = 'canceled';
    this.saveState();
    this.notify();
  }

  public reactivateSubscription(): void {
    this.subscription.status = 'active';
    this.saveState();
    this.notify();
  }

  public applyPromoCode(code: string): { valid: boolean; discountPercent: number; message: string } {
    if (code.trim().toUpperCase() === 'LAUNCH50') {
      return { valid: true, discountPercent: 50, message: '🎉 Promo Code LAUNCH50 applied! 50% discount on first year!' };
    }
    if (code.trim().toUpperCase() === 'FREELANCE20') {
      return { valid: true, discountPercent: 20, message: '🎉 Promo Code FREELANCE20 applied! 20% off all plans!' };
    }
    return { valid: false, discountPercent: 0, message: 'Invalid or expired promotional discount code.' };
  }
}

export const subscriptionService = new SubscriptionService();
