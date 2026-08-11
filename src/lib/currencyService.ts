import { CurrencyCode, CurrencyConfig, PlanTier, BillingInterval } from '../types/subscription';

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    flag: '🇺🇸',
    country: 'United States & Global',
    usdRate: 1.0,
    freelancerMonthly: 12,
    businessMonthly: 39,
    enterpriseMonthly: 99
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    flag: '🇪🇺',
    country: 'European Union',
    usdRate: 0.92,
    freelancerMonthly: 11,
    businessMonthly: 36,
    enterpriseMonthly: 89
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    flag: '🇬🇧',
    country: 'United Kingdom',
    usdRate: 0.79,
    freelancerMonthly: 9.5,
    businessMonthly: 31,
    enterpriseMonthly: 79
  },
  ZAR: {
    code: 'ZAR',
    symbol: 'R',
    name: 'South African Rand',
    flag: '🇿🇦',
    country: 'South Africa',
    usdRate: 18.5,
    freelancerMonthly: 180,
    businessMonthly: 590,
    enterpriseMonthly: 1490
  },
  AUD: {
    code: 'AUD',
    symbol: 'A$',
    name: 'Australian Dollar',
    flag: '🇦🇺',
    country: 'Australia',
    usdRate: 1.52,
    freelancerMonthly: 18,
    businessMonthly: 58,
    enterpriseMonthly: 149
  },
  CAD: {
    code: 'CAD',
    symbol: 'C$',
    name: 'Canadian Dollar',
    flag: '🇨🇦',
    country: 'Canada',
    usdRate: 1.36,
    freelancerMonthly: 16,
    businessMonthly: 52,
    enterpriseMonthly: 135
  },
  BRL: {
    code: 'BRL',
    symbol: 'R$',
    name: 'Brazilian Real',
    flag: '🇧🇷',
    country: 'Brazil & LatAm',
    usdRate: 5.4,
    freelancerMonthly: 49,
    businessMonthly: 169,
    enterpriseMonthly: 420
  },
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    flag: '🇮🇳',
    country: 'India & South Asia',
    usdRate: 83.5,
    freelancerMonthly: 499,
    businessMonthly: 1699,
    enterpriseMonthly: 4299
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen',
    flag: '🇯🇵',
    country: 'Japan',
    usdRate: 155.0,
    freelancerMonthly: 1800,
    businessMonthly: 5800,
    enterpriseMonthly: 14800
  },
  SGD: {
    code: 'SGD',
    symbol: 'S$',
    name: 'Singapore Dollar',
    flag: '🇸🇬',
    country: 'Singapore & SE Asia',
    usdRate: 1.35,
    freelancerMonthly: 16,
    businessMonthly: 52,
    enterpriseMonthly: 132
  }
};

class CurrencyService {
  private activeCurrency: CurrencyCode = 'USD';
  private listeners: (() => void)[] = [];

  constructor() {
    this.initLocationCurrency();
  }

  private initLocationCurrency() {
    try {
      const saved = localStorage.getItem('spihead_currency_code') as CurrencyCode;
      if (saved && CURRENCIES[saved]) {
        this.activeCurrency = saved;
        return;
      }

      // Auto-detect based on user timezone or locale
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      const locale = navigator.language || '';

      if (timeZone.includes('Johannesburg') || locale.includes('ZA')) {
        this.activeCurrency = 'ZAR';
      } else if (timeZone.includes('London') || timeZone.includes('Belfast') || locale.includes('GB')) {
        this.activeCurrency = 'GBP';
      } else if (timeZone.includes('Europe') || locale.includes('de') || locale.includes('fr') || locale.includes('es') || locale.includes('it')) {
        this.activeCurrency = 'EUR';
      } else if (timeZone.includes('Calcutta') || timeZone.includes('Kolkata') || locale.includes('IN')) {
        this.activeCurrency = 'INR';
      } else if (timeZone.includes('Sao_Paulo') || locale.includes('BR')) {
        this.activeCurrency = 'BRL';
      } else if (timeZone.includes('Tokyo') || locale.includes('JP')) {
        this.activeCurrency = 'JPY';
      } else if (timeZone.includes('Australia') || locale.includes('AU')) {
        this.activeCurrency = 'AUD';
      } else if (timeZone.includes('Toronto') || timeZone.includes('Vancouver') || locale.includes('CA')) {
        this.activeCurrency = 'CAD';
      } else if (timeZone.includes('Singapore') || locale.includes('SG')) {
        this.activeCurrency = 'SGD';
      } else {
        this.activeCurrency = 'USD';
      }
    } catch (e) {
      this.activeCurrency = 'USD';
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

  public getCurrencyCode(): CurrencyCode {
    return this.activeCurrency;
  }

  public getCurrencyConfig(): CurrencyConfig {
    return CURRENCIES[this.activeCurrency] || CURRENCIES.USD;
  }

  public setCurrency(code: CurrencyCode): void {
    if (CURRENCIES[code]) {
      this.activeCurrency = code;
      try {
        localStorage.setItem('spihead_currency_code', code);
      } catch (e) {
        console.error('Failed to persist currency preference:', e);
      }
      this.notify();
    }
  }

  public getPriceForPlan(planTier: PlanTier, interval: BillingInterval, discountPercent = 0): {
    monthlyPrice: number;
    billingPeriodTotal: number;
    formattedMonthly: string;
    formattedTotal: string;
    symbol: string;
    code: CurrencyCode;
  } {
    const config = this.getCurrencyConfig();
    let baseMonthly = 0;

    switch (planTier) {
      case 'freelancer':
        baseMonthly = config.freelancerMonthly;
        break;
      case 'business':
        baseMonthly = config.businessMonthly;
        break;
      case 'enterprise':
        baseMonthly = config.enterpriseMonthly;
        break;
    }

    // Annual billing gives 20% discount on base rate
    let effectiveMonthly = interval === 'annual' ? baseMonthly * 0.8 : baseMonthly;

    if (discountPercent > 0) {
      effectiveMonthly = effectiveMonthly * ((100 - discountPercent) / 100);
    }

    const periodTotal = interval === 'annual' ? effectiveMonthly * 12 : effectiveMonthly;

    // Formatting based on currency precision
    const isNoDecimal = ['JPY', 'INR', 'ZAR', 'BRL'].includes(config.code);
    const formatValue = (val: number) => {
      if (isNoDecimal) return Math.round(val).toLocaleString();
      return val.toFixed(val % 1 === 0 ? 0 : 2);
    };

    return {
      monthlyPrice: effectiveMonthly,
      billingPeriodTotal: periodTotal,
      formattedMonthly: `${config.symbol}${formatValue(effectiveMonthly)}`,
      formattedTotal: `${config.symbol}${formatValue(periodTotal)}`,
      symbol: config.symbol,
      code: config.code
    };
  }

  public formatCustomAmount(amountInUSD: number): string {
    const config = this.getCurrencyConfig();
    const converted = amountInUSD * config.usdRate;
    const isNoDecimal = ['JPY', 'INR'].includes(config.code);
    return `${config.symbol}${isNoDecimal ? Math.round(converted).toLocaleString() : converted.toFixed(2)}`;
  }
}

export const currencyService = new CurrencyService();
