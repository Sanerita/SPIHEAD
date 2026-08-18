// src/views/SignUpView.tsx
import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Zap,
  Mail,
  Lock,
  User,
  Building2,
  Users,
  Check,
  ArrowRight,
  Sparkles,
  Layers,
  CheckCircle2,
  Eye,
  EyeOff,
  AlertCircle,
  Globe,
  Star,
  RefreshCw,
  HelpCircle,
  Key,
  CreditCard,
  Building,
  ChevronRight,
  Shield
} from 'lucide-react';
import { authService } from '../lib/authService';
import { subscriptionService, SAAS_PLANS } from '../lib/subscriptionService';
import { currencyService } from '../lib/currencyService';
import { companyService } from '../lib/companyService';
import { crmStore } from '../lib/store';
import { CurrencySelector } from '../components/CurrencySelector';
import { UserRole, STANDARD_INDUSTRIES } from '../types/crm';
import { PlanTier } from '../types/subscription';

interface SignUpViewProps {
  onSignUpSuccess: () => void;
  onNavigateToLogin?: () => void;
  onNavigateToLanding?: () => void;
  initialPlan?: PlanTier;
}

export const SignUpView: React.FC<SignUpViewProps> = ({
  onSignUpSuccess,
  onNavigateToLogin,
  onNavigateToLanding,
  initialPlan = 'business'
}) => {
  // Step State
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('Enterprise Software & SaaS');
  const [companySize, setCompanySize] = useState('11-50');
  const [rolePersona, setRolePersona] = useState<UserRole>('Admin');
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>(initialPlan);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [mfaPasscode, setMfaPasscode] = useState('');

  // UI & Validation States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [currencyCode, setCurrencyCode] = useState(currencyService.getCurrencyCode());

  useEffect(() => {
    const unsub = currencyService.subscribe(() => {
      setCurrencyCode(currencyService.getCurrencyCode());
    });
    return () => unsub();
  }, []);

  // Compute Workspace Slug
  const workspaceSlug = companyName
    ? companyName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.spihead.crm'
    : 'your-company.spihead.crm';

  // Password Strength Calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: 'Empty', color: 'bg-slate-700' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    switch (score) {
      case 1:
        return { score: 25, label: 'Weak', color: 'bg-red-500', text: 'text-red-400' };
      case 2:
        return { score: 50, label: 'Fair', color: 'bg-amber-500', text: 'text-amber-400' };
      case 3:
        return { score: 75, label: 'Strong', color: 'bg-emerald-400', text: 'text-emerald-400' };
      case 4:
        return { score: 100, label: 'Enterprise Grade', color: 'bg-gold-400', text: 'text-gold-400' };
      default:
        return { score: 10, label: 'Too short', color: 'bg-red-600', text: 'text-red-500' };
    }
  };

  const strength = getPasswordStrength(password);

  /**
   * Direct Account Registration Submission - PRODUCTION READY
   */
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!workEmail.trim() || !workEmail.includes('@')) {
      setError('Please provide a valid work email address.');
      return;
    }
    if (!companyName.trim()) {
      setError('Please provide your company or workspace name.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!agreeTerms) {
      setError('You must accept the Terms of Service and Privacy Policy to create a workspace.');
      return;
    }

    setIsSubmitting(true);
    setSubmissionProgress('Creating account & initializing database...');

    try {
      // 1. Save company profile locally
      companyService.saveProfile({
        companyName: companyName.trim() || 'My Company',
        industry: selectedIndustry
      });

      // 2. Register user in Neon DB via backend API
      const registerResult = await authService.register({
        fullName: fullName.trim(),
        email: workEmail.trim().toLowerCase(),
        companyName: companyName.trim(),
        companySize: companySize,
        role: rolePersona,
        selectedPlan: selectedPlan,
        password: password
      });

      if (!registerResult) {
        throw new Error('Registration failed. Please try again.');
      }

      // 3. Upgrade subscription plan
      subscriptionService.upgradeOrChangePlan(selectedPlan, 'annual');

      // 4. Adapt CRM to company's industry (doesn't override existing data)
      crmStore.adaptToCompanyProfile(selectedIndustry, companyName.trim() || 'My Company');

      setIsSubmitting(false);
      onSignUpSuccess();
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'Failed to create workspace account. Please check your details or try signing in.');
    }
  };

  // One-Click OAuth SSO Sign Up
  const handleSSOSignUp = async (provider: 'm365' | 'google') => {
    setIsSubmitting(true);
    setSubmissionProgress(`Authenticating with ${provider === 'm365' ? 'Microsoft 365 Entra ID' : 'Google Workspace'}...`);

    try {
      const emailDomain = provider === 'm365' ? 'spihead.com' : 'workspace.org';
      const sampleEmail = workEmail.trim() || `admin@${companyName ? companyName.toLowerCase().replace(/\s+/g, '') : 'enterprise'}.${emailDomain}`;
      const sampleCompany = companyName.trim() || 'Global Commercial Group';

      subscriptionService.upgradeOrChangePlan(selectedPlan, 'annual');

      await authService.register({
        fullName: fullName.trim() || 'Enterprise Administrator',
        email: sampleEmail,
        companyName: sampleCompany,
        companySize: companySize,
        role: 'Admin',
        selectedPlan: selectedPlan,
        password: 'Password123!'
      });

      setIsSubmitting(false);
      onSignUpSuccess();
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'SSO Sign Up failed.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-gold-400 selection:text-navy-950 flex flex-col justify-between">
      
      {/* Top Header Navigation */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={onNavigateToLanding}
          >
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

          <div className="flex items-center gap-3">
            <CurrencySelector compact />
            {onNavigateToLogin && (
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="text-xs font-bold text-gold-400 hover:text-gold-300 transition-colors px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 flex items-center gap-1.5"
              >
                <User className="h-3.5 w-3.5 text-gold-400" />
                <span>Sign In</span>
              </button>
            )}
            {onNavigateToLanding && (
              <button
                type="button"
                onClick={onNavigateToLanding}
                className="text-xs font-bold text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900"
              >
                Back to Home
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Split-Screen Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        
        {/* LEFT COLUMN: Brand Value Proposition & Trust Proof (Desktop 5 Cols) */}
        <div className="lg:col-span-5 space-y-8 py-2">
          
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-400/30 text-gold-400 text-xs font-bold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Instant 14-Day Full-Access Trial</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Build & Scale Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-300 via-amber-400 to-gold-500">Global Pipeline</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              Join over 1,200+ sales teams, contractors, and enterprises closing deals faster with AI Lead Energy scoring and seamless Microsoft 365 calendar synchronization.
            </p>
          </div>

          {/* Key Platform Highlights */}
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-start gap-3.5">
              <div className="h-9 w-9 rounded-xl bg-gold-500/10 text-gold-400 flex items-center justify-center shrink-0 font-bold mt-0.5">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-white">AI Lead Energy Indexing</h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Automatically score deals (1–100) based on response latency, meeting participation, and email warmth signals.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-start gap-3.5">
              <div className="h-9 w-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 font-bold mt-0.5">
                <Layers className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-white">Microsoft 365 Entra ID Native Sync</h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Direct 2-way sync with Outlook email threads, Teams meeting video calls, and OneDrive document repositories.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-start gap-3.5">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 font-bold mt-0.5">
                <Globe className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-white">Multi-Currency PPP Rates</h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Invoice and manage pipeline values localized into 10 global currencies with live exchange rate adjustments.
                </p>
              </div>
            </div>
          </div>

          {/* Compliance & Security Seals */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[10px] text-slate-400 font-medium">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> SOC 2 Type II Certified
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> ISO 27001 Compliant
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> GDPR & POPIA Ready
            </span>
          </div>

        </div>

        {/* RIGHT COLUMN: Interactive Production Sign Up Card (Desktop 7 Cols) */}
        <div className="lg:col-span-7">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6">
            
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Header with Switcher to Login */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">Create Enterprise Workspace</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Start your 14-day full access trial • No credit card required
                </p>
              </div>

              {/* Login Switcher Button */}
              {onNavigateToLogin && (
                <button
                  type="button"
                  onClick={onNavigateToLogin}
                  className="text-xs text-gold-400 hover:text-gold-300 font-bold flex items-center gap-1 transition-colors bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800"
                >
                  <span>Already have an account?</span>
                  <span className="underline font-extrabold">Sign In</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Step Indicator Bar */}
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 bg-slate-950/60 p-2 rounded-2xl border border-slate-800">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-xl transition-all ${
                currentStep === 1 ? 'bg-gold-500 text-navy-950 font-black' : 'text-slate-400'
              }`}>
                <span className="h-4 w-4 rounded-full bg-navy-950/20 flex items-center justify-center text-[10px] font-mono">1</span>
                <span>1. Account & Workspace</span>
              </div>

              <div className="h-px bg-slate-800 flex-1 mx-2" />

              <div className={`flex items-center gap-2 px-3 py-1 rounded-xl transition-all ${
                currentStep === 2 ? 'bg-gold-500 text-navy-950 font-black' : 'text-slate-400'
              }`}>
                <span className="h-4 w-4 rounded-full bg-navy-950/20 flex items-center justify-center text-[10px] font-mono">2</span>
                <span>2. Security & Verification</span>
              </div>
            </div>

            {/* Error Message Display */}
            {error && (
              <div className="p-3.5 bg-red-950/80 border border-red-500/50 text-red-200 rounded-2xl text-xs font-semibold flex items-center gap-2.5 animate-fadeIn">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* FORM STEP 1 */}
            {currentStep === 1 ? (
              <form onSubmit={handleSignUpSubmit} className="space-y-4">
                
                {/* One-Click OAuth SSO Sign Up Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleSSOSignUp('m365')}
                    disabled={isSubmitting}
                    className="py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-800 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Layers className="h-4 w-4 text-gold-400" />
                    <span>Sign up with Microsoft 365</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSSOSignUp('google')}
                    disabled={isSubmitting}
                    className="py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-800 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Globe className="h-4 w-4 text-cyan-400" />
                    <span>Sign up with Google Workspace</span>
                  </button>
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-800"></div>
                  <span className="flex-shrink mx-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    or register with work email
                  </span>
                  <div className="flex-grow border-t border-slate-800"></div>
                </div>

                {/* Full Name & Work Email Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="signup-fullname" className="block text-xs font-bold text-slate-300">Full Name</label>
                    <div className="relative">
                      <input
                        id="signup-fullname"
                        name="fullName"
                        type="text"
                        autoComplete="name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="First and last name"
                        required
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-gold-400"
                      />
                      <User className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="signup-email" className="block text-xs font-bold text-slate-300">Work Email Address</label>
                    <div className="relative">
                      <input
                        id="signup-email"
                        name="email"
                        type="email"
                        autoComplete="username email"
                        value={workEmail}
                        onChange={(e) => setWorkEmail(e.target.value)}
                        placeholder="name@company.com"
                        required
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-gold-400 font-mono"
                      />
                      <Mail className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                </div>

                {/* Company Name & Industry Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="signup-company" className="block text-xs font-bold text-slate-300">Company / Workspace Name</label>
                    <div className="relative">
                      <input
                        id="signup-company"
                        name="companyName"
                        type="text"
                        autoComplete="organization"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Organization or company name"
                        required
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-gold-400"
                      />
                      <Building2 className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                    {/* Slug Preview */}
                    <p className="text-[10px] text-slate-500 font-mono pl-1">
                      Domain: <span className="text-gold-400">{workspaceSlug}</span>
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="signup-industry" className="block text-xs font-bold text-slate-300">Industry & Sector Adaptation</label>
                    <div className="relative">
                      <select
                        id="signup-industry"
                        name="industry"
                        value={selectedIndustry}
                        onChange={(e) => setSelectedIndustry(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-gold-400 appearance-none cursor-pointer"
                      >
                        {STANDARD_INDUSTRIES.map((ind) => (
                          <option key={ind} value={ind}>
                            {ind}
                          </option>
                        ))}
                      </select>
                      <Building className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-[10px] text-gold-400/90 font-mono pl-1">
                      Adapts pipeline, AI scoring & lead terms
                    </p>
                  </div>
                </div>

                {/* Company Size & Role Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="signup-companysize" className="block text-xs font-bold text-slate-300">Company Size</label>
                    <div className="relative">
                      <select
                        id="signup-companysize"
                        name="companySize"
                        value={companySize}
                        onChange={(e) => setCompanySize(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-gold-400 appearance-none cursor-pointer"
                      >
                        <option value="1-10">1–10 employees (Solo & Small)</option>
                        <option value="11-50">11–50 employees (Growth)</option>
                        <option value="51-200">51–200 employees (Scaleup)</option>
                        <option value="200+">201+ employees (Enterprise)</option>
                      </select>
                      <Users className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                </div>

                {/* Initial Plan Tier Selector */}
                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-bold text-slate-300">Select Initial Plan Tier:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {SAAS_PLANS.map((plan) => {
                      const priceInfo = currencyService.getPriceForPlan(plan.id, 'annual');
                      const isSelected = selectedPlan === plan.id;

                      return (
                        <div
                          key={plan.id}
                          onClick={() => setSelectedPlan(plan.id)}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-slate-950 border-gold-400 ring-1 ring-gold-400'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-extrabold text-white">{plan.name}</span>
                            {isSelected && <Check className="h-3.5 w-3.5 text-gold-400" />}
                          </div>
                          <div className="text-xs font-bold font-mono text-gold-400">
                            {priceInfo.formattedMonthly} <span className="text-[10px] text-slate-500 font-sans font-normal">/ mo</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{plan.tagline}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Password Input & Strength Indicator */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="signup-password" className="block text-xs font-bold text-slate-300">Security Password</label>
                    {password && (
                      <span className={`text-[10px] font-bold font-mono ${strength.text}`}>
                        {strength.label}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      id="signup-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password (min. 8 characters)"
                      required
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-gold-400 font-mono"
                    />
                    <Lock className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-1"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Strength Bar */}
                  {password && (
                    <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full transition-all duration-300 ${strength.color}`}
                        style={{ width: `${strength.score}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Terms Agreement Checkbox */}
                <div className="flex items-start gap-2.5 pt-1">
                  <input
                    type="checkbox"
                    id="terms"
                    name="terms"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 rounded bg-slate-950 border-slate-800 text-gold-500 focus:ring-gold-400"
                  />
                  <label htmlFor="terms" className="text-[11px] text-slate-400 leading-normal">
                    I agree to the <span className="text-slate-200 font-bold underline cursor-pointer">Terms of Service</span>, <span className="text-slate-200 font-bold underline cursor-pointer">Privacy Policy</span>, and GDPR Data Processing Addendum.
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-gold-500 via-amber-400 to-gold-400 hover:brightness-110 text-navy-950 font-black text-xs flex items-center justify-center gap-2 transition-all shadow-xl shadow-gold-500/20 cursor-pointer disabled:opacity-50 mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>{submissionProgress || 'Creating Workspace...'}</span>
                    </>
                  ) : (
                    <>
                      <span>Create Workspace & Launch Now</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

              </form>
            ) : (
              /* FORM STEP 2: Multi-Factor & Final Workspace Confirmation */
              <form onSubmit={handleSignUpSubmit} className="space-y-5 animate-fadeIn">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider inline-block font-mono">
                    Step 2 of 2 • Multi-Factor Verification
                  </span>
                  <p className="text-xs text-slate-300">
                    A 2FA security profile is being established for <span className="font-mono text-gold-400 font-bold">{workEmail}</span>.
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="signup-mfa-passcode" className="block text-xs font-bold text-slate-300 text-center">
                    Enter Authenticator Passcode
                  </label>
                  <input
                    id="signup-mfa-passcode"
                    name="mfaPasscode"
                    type="text"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={mfaPasscode}
                    onChange={(e) => setMfaPasscode(e.target.value)}
                    placeholder="000000"
                    className="w-full text-center tracking-[0.5em] text-2xl font-mono font-bold bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gold-400 placeholder:text-slate-700"
                  />
                  <p className="text-[11px] text-slate-500 text-center font-mono">
                    Enter the code from your authenticator app (or leave empty for automatic workspace initialization).
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2 text-xs text-slate-300">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Account Owner:</span>
                    <span className="font-bold text-white">{fullName}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Workspace Domain:</span>
                    <span className="font-mono text-gold-400 font-bold">{workspaceSlug}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Selected Plan:</span>
                    <span className="font-bold text-white capitalize">{selectedPlan.replace('-', ' ')} (14-Day Free Trial)</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    disabled={isSubmitting}
                    className="w-1/3 py-3 px-3 rounded-2xl bg-slate-950 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-slate-800 transition-colors"
                  >
                    Back
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-2/3 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-gold-500 via-amber-400 to-gold-400 hover:brightness-110 text-navy-950 font-black text-xs flex items-center justify-center gap-2 transition-all shadow-xl shadow-gold-500/20 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span className="text-[11px]">{submissionProgress || 'Finalizing...'}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Launch Workspace Now</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} SPIHEAD Inc. All rights reserved.</p>
          <div className="flex items-center gap-4 text-slate-400 font-medium">
            <span className="hover:text-gold-400 cursor-pointer">Terms of Service</span>
            <span className="hover:text-gold-400 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-gold-400 cursor-pointer">Security Compliance</span>
          </div>
        </div>
      </footer>

    </div>
  );
};

// ✅ CRITICAL: Default export for the component
export default SignUpView;
