export type PlanTier = 'freelancer' | 'business' | 'enterprise';
export type BillingInterval = 'monthly' | 'annual';

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'ZAR' | 'AUD' | 'CAD' | 'BRL' | 'INR' | 'JPY' | 'SGD';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  flag: string;
  country: string;
  usdRate: number; // 1 USD = rate in target currency
  freelancerMonthly: number;
  businessMonthly: number;
  enterpriseMonthly: number;
}

export interface SubscriptionPlan {
  id: PlanTier;
  name: string;
  tagline: string;
  badge?: string;
  recommended?: boolean;
  basePriceUSDMonthly: number;
  basePriceUSDAnnual: number;
  maxSeats: number | 'Unlimited';
  aiCreditsMonthly: number | 'Unlimited';
  integrationsTier: 'Standard Sync' | 'Advanced Two-Way' | 'Enterprise SSO & API';
  features: string[];
  limitations?: string[];
  idealFor: string;
}

export interface UserSubscription {
  planId: PlanTier;
  billingInterval: BillingInterval;
  currency: CurrencyCode;
  status: 'active' | 'trialing' | 'canceled' | 'past_due';
  trialEndsAt: string;
  nextBillingDate: string;
  seatsCount: number;
  aiCreditsRemaining: number;
  paymentMethod?: {
    brand: string;
    last4: string;
    expiry: string;
  };
  promoCodeApplied?: string;
  discountPercentage?: number;
}

export interface Invoice {
  id: string;
  date: string;
  amountFormatted: string;
  planName: string;
  currency: CurrencyCode;
  status: 'paid' | 'pending' | 'failed';
  pdfUrl?: string;
}
