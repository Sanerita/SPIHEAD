import React, { useState, useEffect } from 'react';
import { Building2, Sparkles, CheckCircle2, Sliders, Layers, DollarSign, Globe, X, ArrowRight, Briefcase } from 'lucide-react';
import { STANDARD_INDUSTRIES } from '../types/crm';
import { companyService, INDUSTRY_PRESETS } from '../lib/companyService';
import { crmStore } from '../lib/store';

interface BusinessCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export const BusinessCustomizerModal: React.FC<BusinessCustomizerModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const currentProfile = companyService.getProfile();
  const [companyName, setCompanyName] = useState(currentProfile.companyName || '');
  const [industry, setIndustry] = useState(currentProfile.industry || 'Enterprise Software & SaaS');
  const [productsAndServices, setProductsAndServices] = useState(currentProfile.productsAndServices || '');
  const [targetAudience, setTargetAudience] = useState(currentProfile.targetAudience || '');
  const [leadTermSingular, setLeadTermSingular] = useState(currentProfile.leadTermSingular || 'Lead');
  const [leadTermPlural, setLeadTermPlural] = useState(currentProfile.leadTermPlural || 'Leads');
  const [currency, setCurrency] = useState(currentProfile.currency || 'USD');
  const [customStages, setCustomStages] = useState<string[]>(
    currentProfile.customPipelineStages || ['New Lead', 'Contacted', 'Qualified', 'Proposal', 'Closed']
  );
  const [isAdapting, setIsAdapting] = useState(false);

  // Sync state when industry changes
  useEffect(() => {
    const preset = INDUSTRY_PRESETS[industry];
    if (preset) {
      if (preset.productsAndServices) setProductsAndServices(preset.productsAndServices);
      if (preset.targetAudience) setTargetAudience(preset.targetAudience);
      if (preset.leadTermSingular) setLeadTermSingular(preset.leadTermSingular);
      if (preset.leadTermPlural) setLeadTermPlural(preset.leadTermPlural);
      if (preset.customPipelineStages) setCustomStages(preset.customPipelineStages);
    }
  }, [industry]);

  if (!isOpen) return null;

  const handleApplyAdaptation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;

    setIsAdapting(true);

    setTimeout(() => {
      // 1. Save company profile with custom settings
      companyService.saveProfile({
        companyName: companyName.trim(),
        industry,
        productsAndServices,
        targetAudience,
        leadTermSingular,
        leadTermPlural,
        currency,
        customPipelineStages: customStages
      });

      // 2. Adapt store pipeline data
      crmStore.adaptToCompanyProfile(industry, companyName.trim());

      setIsAdapting(false);
      if (onSuccess) {
        onSuccess(`Workspace fully adapted for ${companyName.trim()} (${industry})!`);
      }
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-navy-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-2xl w-full p-6 md:p-8 relative space-y-6">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gold-500/10 border border-gold-500/20 rounded-2xl text-gold-600">
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-gold-100 text-gold-800 text-[10px] font-black uppercase tracking-wider">
                Multi-Industry Adaptation Engine
              </span>
            </div>
            <h2 className="text-2xl font-black text-navy-900 tracking-tight mt-0.5">
              Cater Workspace to Your Exact Business
            </h2>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Configure your organization profile below. The Gemini AI scoring engine, pipeline deal stages, email templates, and automated recommendations will dynamically tailor themselves to your exact product offerings and target buyers.
        </p>

        <form action="#" onSubmit={handleApplyAdaptation} className="space-y-5">
          {/* Company Name & Industry Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="biz-company" className="block text-xs font-bold text-navy-900 mb-1">
                Company / Organization Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="biz-company"
                name="companyName"
                type="text"
                autoComplete="organization"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Apex BioPharma / SolarTech Inc."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 outline-none font-medium"
              />
            </div>

            <div>
              <label htmlFor="biz-industry" className="block text-xs font-bold text-navy-900 mb-1">
                Primary Industry & Sector
              </label>
              <select
                id="biz-industry"
                name="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 outline-none font-medium bg-white"
              >
                {STANDARD_INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Products/Services & Target Audience */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="biz-products" className="block text-xs font-bold text-navy-900 mb-1">
                Core Products / Services Offering
              </label>
              <input
                id="biz-products"
                name="productsAndServices"
                type="text"
                value={productsAndServices}
                onChange={(e) => setProductsAndServices(e.target.value)}
                placeholder="e.g. 5MW Solar Arrays, Clinical Imaging Software"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 outline-none font-medium"
              />
            </div>

            <div>
              <label htmlFor="biz-target" className="block text-xs font-bold text-navy-900 mb-1">
                Ideal Customer Profile / Buyers
              </label>
              <input
                id="biz-target"
                name="targetAudience"
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g. Chief Medical Officers, Facility Managers"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 outline-none font-medium"
              />
            </div>
          </div>

          {/* Terminology & Currency */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-navy-900 flex items-center gap-1.5 uppercase tracking-wider">
              <Sliders className="h-3.5 w-3.5 text-gold-600" /> Custom Business Terminology & Currency
            </h4>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="biz-term-singular" className="block text-[11px] font-bold text-slate-600 mb-1">
                  Singular Term
                </label>
                <input
                  id="biz-term-singular"
                  name="leadTermSingular"
                  type="text"
                  value={leadTermSingular}
                  onChange={(e) => setLeadTermSingular(e.target.value)}
                  placeholder="e.g. Client, Property"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold"
                />
              </div>

              <div>
                <label htmlFor="biz-term-plural" className="block text-[11px] font-bold text-slate-600 mb-1">
                  Plural Term
                </label>
                <input
                  id="biz-term-plural"
                  name="leadTermPlural"
                  type="text"
                  value={leadTermPlural}
                  onChange={(e) => setLeadTermPlural(e.target.value)}
                  placeholder="e.g. Clients, Properties"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold"
                />
              </div>

              <div>
                <label htmlFor="biz-currency" className="block text-[11px] font-bold text-slate-600 mb-1">
                  Preferred Currency
                </label>
                <select
                  id="biz-currency"
                  name="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="ZAR">ZAR (R)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="AUD">AUD ($)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="AED">AED</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors"
            >
              Skip for Now
            </button>

            <button
              type="submit"
              disabled={isAdapting}
              className="px-6 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-gold-400 font-black text-xs flex items-center gap-2 shadow-lg transition-all"
            >
              {isAdapting ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin text-gold-400" />
                  Adapting AI & Pipeline...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-gold-400" />
                  Adapt Workspace to My Business
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
