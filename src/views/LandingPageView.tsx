import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  BarChart3,
  Calendar,
  Lock,
  Globe,
  Check,
  Building2,
  UserCheck,
  Clock,
  TrendingUp,
  HelpCircle,
  Play,
  ChevronRight,
  CreditCard,
  Kanban,
  Users,
  Search,
  Activity,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { currencyService } from '../lib/currencyService';
import { subscriptionService, SAAS_PLANS } from '../lib/subscriptionService';
import { CurrencySelector } from '../components/CurrencySelector';
import { PlanTier, BillingInterval } from '../types/subscription';

interface LandingPageViewProps {
  onEnterApp: () => void;
  onOpenPricing: (planTier?: PlanTier) => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onEnterApp,
  onOpenPricing
}) => {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('annual');
  const [currencyCode, setCurrencyCode] = useState(currencyService.getCurrencyCode());
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  useEffect(() => {
    const unsub = currencyService.subscribe(() => {
      setCurrencyCode(currencyService.getCurrencyCode());
    });
    return () => unsub();
  }, []);

  const faqs = [
    {
      q: 'Which plan is best suited for my organization?',
      a: 'The Freelancer plan is built for solo consultants and contractors. The Small Business plan supports teams up to 10 with shared pipelines and role-based permissions. Enterprise is designed for larger teams needing custom seats, enterprise SSO, and dedicated SLAs.'
    },
    {
      q: 'How does localized currency pricing work?',
      a: 'SPIHEAD automatically detects your regional location and converts prices to your local currency (USD, EUR, GBP, ZAR, BRL, INR, JPY, AUD, CAD, SGD) using Purchasing Power Parity (PPP) rates.'
    },
    {
      q: 'Is there a free trial before subscribing?',
      a: 'Yes, every new account includes an instant 14-day full-access trial with 100 AI Lead Energy scoring credits. No credit card is required to start.'
    },
    {
      q: 'Can I upgrade, downgrade, or cancel anytime?',
      a: 'Yes. You can manage your plan, billing interval, seat allocation, or cancel your subscription directly from the Billing & Subscription Settings page at any time.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-gold-400 selection:text-navy-950">
      
      {/* 1. Header Navigation */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={onEnterApp}>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-gold-500 to-amber-300 flex items-center justify-center text-navy-950 font-black shadow-md shadow-gold-500/20">
              <Zap className="h-5 w-5 fill-navy-950 text-navy-950" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl text-white tracking-tight">SPIHEAD</span>
              <span className="px-1.5 py-0.5 bg-slate-800 text-slate-300 font-mono text-[10px] font-bold rounded border border-slate-700">
                CRM
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-300">
            <a href="#features" className="hover:text-gold-400 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-gold-400 transition-colors">Pricing</a>
            <a href="#security" className="hover:text-gold-400 transition-colors">Security</a>
            <a href="#faq" className="hover:text-gold-400 transition-colors">FAQ</a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <CurrencySelector compact />

            <button
              type="button"
              onClick={onEnterApp}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold transition-all border border-slate-800 cursor-pointer hidden sm:flex items-center gap-1.5"
            >
              <Play className="h-3.5 w-3.5 text-gold-400" />
              Live Workspace
            </button>

            <button
              type="button"
              onClick={() => onOpenPricing()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-gold-500 via-amber-400 to-gold-400 text-navy-950 font-black text-xs hover:brightness-110 transition-all shadow-md shadow-gold-500/20 cursor-pointer flex items-center gap-1.5"
            >
              Get Started
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-gold-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          


          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight max-w-4xl mx-auto mb-6">
            Close Deals Faster with <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-300 via-amber-400 to-gold-500">AI Lead Energy</span> & Pipeline Intelligence
          </h1>

          {/* Subtitle */}
          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto mb-8 font-normal leading-relaxed">
            The modern CRM platform designed for freelancers, small businesses, and enterprise teams. Streamline lead scoring, pipeline management, and multi-currency billing.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <button
              type="button"
              onClick={() => onOpenPricing()}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-gold-500 via-amber-400 to-gold-400 text-navy-950 font-black text-xs hover:brightness-110 transition-all shadow-xl shadow-gold-500/20 cursor-pointer flex items-center justify-center gap-2"
            >
              <Zap className="h-4 w-4 fill-navy-950" />
              Start 14-Day Free Trial
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={onEnterApp}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all border border-slate-800 cursor-pointer flex items-center justify-center gap-2"
            >
              <Play className="h-4 w-4 text-gold-400" />
              Explore Live Demo
            </button>
          </div>

          {/* Trust Guarantees */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium mb-12">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" /> No Credit Card Required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Instant 14-Day Trial
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Local Purchasing Power Rates
            </span>
          </div>

          {/* Product UI Preview Window */}
          <div className="rounded-2xl p-2 bg-slate-900 border border-slate-800 shadow-2xl max-w-5xl mx-auto overflow-hidden">
            <div className="px-4 py-2 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs text-slate-400 mb-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-700 inline-block" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-700 inline-block" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-700 inline-block" />
                <span className="ml-2 font-mono text-[11px] text-slate-500">app.spihead.com/workspace</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/20">
                AI Pipeline Live
              </span>
            </div>

            {/* Dashboard Mock Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 text-left">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>Lead Velocity Score</span>
                  <Sparkles className="h-3.5 w-3.5 text-gold-400" />
                </div>
                <div className="text-2xl font-black text-white">92 / 100</div>
                <p className="text-[10px] text-emerald-400 font-medium">⚡ High Conversion Intent</p>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>Pipeline Value</span>
                  <BarChart3 className="h-3.5 w-3.5 text-blue-400" />
                </div>
                <div className="text-2xl font-black text-white">
                  {currencyService.formatCustomAmount(248500)}
                </div>
                <p className="text-[10px] text-slate-400 font-medium">18 Active Opportunities</p>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>Scheduled Demos</span>
                  <Calendar className="h-3.5 w-3.5 text-purple-400" />
                </div>
                <div className="text-2xl font-black text-white">8 Meetings</div>
                <p className="text-[10px] text-purple-300 font-medium">Synced Across Calendar</p>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>Workspace Tier</span>
                  <ShieldCheck className="h-3.5 w-3.5 text-gold-400" />
                </div>
                <div className="text-xl font-black text-gold-400">Small Business</div>
                <p className="text-[10px] text-slate-400 font-medium">5 Team Seats • Active</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 3. Core Capabilities Section */}
      <section id="features" className="py-20 bg-slate-900/50 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-gold-400">Platform Features</h2>
            <p className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Everything Needed to Manage Leads & Grow Revenue
            </p>
            <p className="text-xs sm:text-sm text-slate-400">
              Integrated CRM tools designed to streamline sales workflows without technical friction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-3">
              <div className="h-10 w-10 rounded-xl bg-gold-500/10 text-gold-400 flex items-center justify-center font-bold">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-base font-extrabold text-white">AI Lead Energy Scoring</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Real-time lead engagement velocity scoring (1–100) powered by activity frequency, meeting attendance, and response speed to prioritize hot prospects.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                <Kanban className="h-5 w-5" />
              </div>
              <h3 className="text-base font-extrabold text-white">Visual Pipeline Kanban</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Drag-and-drop deals across customizable stages (New Lead, Proposal, Negotiation, Closed), filter by owner or status, and track total pipeline value.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-3">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="text-base font-extrabold text-white">Microsoft 365 Integration</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Direct 2-way sync with Microsoft 365, syncing Outlook email threads, Teams meeting schedules, OneDrive attachments, and Excel reports.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                <Calendar className="h-5 w-5" />
              </div>
              <h3 className="text-base font-extrabold text-white">Calendar & Teams Scheduler</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Schedule client demos with instant Microsoft Teams meeting link generation, attendee status tracking, calendar sync, and meeting notes.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-extrabold text-white">Revenue & Funnel Analytics</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Comprehensive sales reporting with deal conversion velocity charts, win/loss ratios, lead source performance attribution, and pipeline forecasting.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-3">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                <Globe className="h-5 w-5" />
              </div>
              <h3 className="text-base font-extrabold text-white">Localized Multi-Currency</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automatic multi-currency conversion supporting 10 global currencies (USD, EUR, GBP, ZAR, BRL, INR, JPY) with regional PPP rate adjustments.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-3">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-extrabold text-white">RBAC & Security Lock</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Role-based access control (Super Admin, Manager, Representative), active session lock, TLS encryption, and automated security audit logging.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <h3 className="text-base font-extrabold text-white">CSV, Excel & PDF Exports</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                One-click export of pipeline directories and financial reports to CSV, native Excel (.xlsx), and official downloadable tax receipt PDFs.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 4. Production Pricing Section */}
      <section id="pricing" className="py-20 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-gold-400">Subscription Plans</h2>
            <p className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Transparent, Localized Pricing
            </p>
            <p className="text-slate-400 text-xs sm:text-sm">
              Select the plan that aligns with your operational scale. Cancel or change plans at any time.
            </p>

            {/* Billing Interval & Currency Switcher Controls */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <div className="inline-flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setBillingInterval('monthly')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    billingInterval === 'monthly'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Monthly Billing
                </button>
                <button
                  type="button"
                  onClick={() => setBillingInterval('annual')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    billingInterval === 'annual'
                      ? 'bg-gold-500 text-navy-950 font-black'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Annual Billing
                  <span className="px-1.5 py-0.5 bg-navy-950/40 text-gold-300 rounded text-[10px] font-mono font-bold">
                    Save 20%
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Currency:</span>
                <CurrencySelector />
              </div>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {SAAS_PLANS.map((plan) => {
              const priceInfo = currencyService.getPriceForPlan(plan.id, billingInterval);

              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl p-6 sm:p-8 flex flex-col justify-between transition-all relative ${
                    plan.recommended
                      ? 'bg-slate-900 border-2 border-gold-500/80 shadow-2xl shadow-gold-500/10'
                      : 'bg-slate-900/80 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {plan.badge && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-extrabold font-mono tracking-wider border ${
                      plan.recommended
                        ? 'bg-gold-500 text-navy-950 border-gold-400'
                        : 'bg-slate-800 text-gold-400 border-slate-700'
                    }`}>
                      {plan.badge}
                    </div>
                  )}

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-extrabold text-white">{plan.name}</h3>
                      <p className="text-xs text-slate-400 mt-1">{plan.tagline}</p>
                    </div>

                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-white font-mono">
                          {priceInfo.formattedMonthly}
                        </span>
                        <span className="text-slate-400 text-xs font-bold">/ user / month</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {billingInterval === 'annual'
                          ? `Billed annually at ${priceInfo.formattedTotal} / year`
                          : 'Billed monthly, cancel anytime'}
                      </p>
                    </div>

                    <div className="space-y-3 pt-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Included Features:
                      </p>
                      <ul className="space-y-2.5 text-xs text-slate-300 font-medium">
                        {plan.features.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-gold-400 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-8 mt-6 border-t border-slate-800 space-y-2">
                    <button
                      type="button"
                      onClick={() => onOpenPricing(plan.id)}
                      className={`w-full py-3 px-4 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        plan.recommended
                          ? 'bg-gradient-to-r from-gold-500 via-amber-400 to-gold-400 text-navy-950 hover:brightness-110 shadow-md shadow-gold-500/20'
                          : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                      }`}
                    >
                      Subscribe to {plan.name}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    <p className="text-[10px] text-center text-slate-500 font-medium">
                      14-day free trial • Instant activation
                    </p>
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 5. Security Summary Section */}
      <section id="security" className="py-16 bg-slate-900/40 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-gold-400" />
                <h3 className="text-lg font-extrabold text-white">Enterprise-Grade Security & Isolation</h3>
              </div>
              <p className="text-xs text-slate-400 max-w-2xl">
                AES-256 data encryption at rest, TLS 1.3 protocol encryption in transit, session timeouts, and audit trail retention.
              </p>
            </div>
            <button
              type="button"
              onClick={onEnterApp}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-gold-400 font-bold text-xs border border-slate-700 transition-all cursor-pointer shrink-0"
            >
              Open Application Workspace
            </button>
          </div>
        </div>
      </section>

      {/* 6. FAQ Accordion Section */}
      <section id="faq" className="py-16 bg-slate-950 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 space-y-2">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-gold-400">Questions & Answers</h2>
            <p className="text-2xl font-black text-white">Frequently Asked Questions</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full px-6 py-4 text-left font-bold text-xs sm:text-sm text-white flex items-center justify-between gap-4 cursor-pointer hover:text-gold-400"
                  >
                    <span>{faq.q}</span>
                    <ChevronRight className={`h-4 w-4 text-gold-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-4 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="py-10 bg-slate-950 border-t border-slate-800 text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-gold-400" />
            <span className="font-bold text-white">SPIHEAD CRM</span>
            <span>© {new Date().getFullYear()} All rights reserved.</span>
          </div>

          <div className="flex items-center gap-4 font-medium text-slate-400">
            <a href="#features" className="hover:text-gold-400">Features</a>
            <a href="#pricing" className="hover:text-gold-400">Pricing</a>
            <a href="#security" className="hover:text-gold-400">Security</a>
            <button onClick={onEnterApp} className="hover:text-gold-400 cursor-pointer">Workspace</button>
          </div>
        </div>
      </footer>

    </div>
  );
};
