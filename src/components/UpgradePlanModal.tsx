import React, { useState } from 'react';
import { X, Check, Zap, Sparkles, ShieldCheck, CreditCard, ArrowRight } from 'lucide-react';
import { subscriptionService, SAAS_PLANS } from '../lib/subscriptionService';
import { currencyService } from '../lib/currencyService';
import { PlanTier, BillingInterval } from '../types/subscription';

interface UpgradePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast?: (message: string, type?: 'success' | 'info') => void;
  reasonText?: string;
  defaultPlan?: PlanTier;
}

export const UpgradePlanModal: React.FC<UpgradePlanModalProps> = ({
  isOpen,
  onClose,
  showToast,
  reasonText,
  defaultPlan = 'business',
}) => {
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>(defaultPlan);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('annual');
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromoMsg, setAppliedPromoMsg] = useState<{ valid: boolean; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleApplyPromo = () => {
    if (!promoCode.trim()) return;
    const res = subscriptionService.applyPromoCode(promoCode);
    setAppliedPromoMsg({ valid: res.valid, text: res.message });
  };

  const handleConfirmUpgrade = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const discount = appliedPromoMsg?.valid ? (promoCode.toUpperCase() === 'LAUNCH50' ? 50 : 20) : 0;
      subscriptionService.upgradeOrChangePlan(
        selectedPlan,
        billingInterval,
        appliedPromoMsg?.valid ? promoCode : undefined
      );

      const planObj = subscriptionService.getPlanById(selectedPlan);
      if (showToast) {
        showToast(`Successfully upgraded to ${planObj.name}! All feature capabilities unlocked.`, 'success');
      }
      setIsProcessing(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="p-6 sm:p-8 bg-slate-950/90 border-b border-slate-800 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-gold-500/10 text-gold-400 font-mono text-[10px] font-extrabold uppercase border border-gold-500/20">
                Workspace Scaling & Plan Management
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Upgrade Your SPIHEAD Workspace Plan
            </h2>
            <p className="text-xs text-slate-400">
              {reasonText || 'Unlock additional team seats, AI Lead Energy Credits, two-way sync, and Enterprise SSO.'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Billing Interval Toggle */}
          <div className="flex items-center justify-center gap-3">
            <span className={`text-xs font-extrabold ${billingInterval === 'monthly' ? 'text-white' : 'text-slate-400'}`}>
              Monthly Billing
            </span>
            <button
              type="button"
              onClick={() => setBillingInterval(billingInterval === 'annual' ? 'monthly' : 'annual')}
              className="relative w-14 h-7 rounded-full bg-slate-800 border border-slate-700 p-1 transition-colors cursor-pointer"
            >
              <div
                className={`w-5 h-5 rounded-full bg-gold-400 shadow-md transform transition-transform ${
                  billingInterval === 'annual' ? 'translate-x-7 bg-gold-400' : 'translate-x-0 bg-slate-300'
                }`}
              />
            </button>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-extrabold ${billingInterval === 'annual' ? 'text-gold-400' : 'text-slate-400'}`}>
                Annual Billing
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-[10px] border border-emerald-500/30">
                SAVE 20%
              </span>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {SAAS_PLANS.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              const priceInfo = currencyService.getPriceForPlan(
                plan.id,
                billingInterval,
                appliedPromoMsg?.valid ? (promoCode.toUpperCase() === 'LAUNCH50' ? 50 : 20) : 0
              );

              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative ${
                    isSelected
                      ? 'bg-slate-900 border-gold-400 shadow-xl ring-2 ring-gold-400/20 scale-[1.02]'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-90 hover:opacity-100'
                  }`}
                >
                  {plan.recommended && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gold-500 text-slate-950 font-black text-[10px] tracking-wider uppercase shadow-md">
                      {plan.badge}
                    </span>
                  )}

                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-extrabold text-white">{plan.name}</h3>
                      <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${isSelected ? 'bg-gold-400 border-gold-400 text-slate-950' : 'border-slate-700'}`}>
                        {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{plan.tagline}</p>

                    <div className="my-4 pt-3 border-t border-slate-800">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-white">{priceInfo.formattedMonthly}</span>
                        <span className="text-xs text-slate-400 font-medium">/ user / mo</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Billed {billingInterval}: {priceInfo.formattedTotal}
                      </p>
                    </div>

                    <ul className="space-y-2 text-xs text-slate-300 my-4">
                      {plan.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-2 text-[11px]">
                          <Check className="h-3.5 w-3.5 text-gold-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlan(plan.id);
                    }}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-colors mt-2 cursor-pointer ${
                      isSelected
                        ? 'bg-gold-400 text-slate-950 hover:bg-gold-300'
                        : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {isSelected ? 'Selected Plan' : 'Select Plan'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Promo Code Entry */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Zap className="h-4 w-4 text-gold-400" />
              <span className="text-xs font-bold text-slate-300">Have a Promo Discount Code?</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Try LAUNCH50 or FREELANCE20"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 uppercase tracking-wider focus:outline-none focus:border-gold-400"
              />
              <button
                type="button"
                onClick={handleApplyPromo}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-gold-400 text-xs font-extrabold transition-colors cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>

          {appliedPromoMsg && (
            <p className={`text-xs font-bold text-center ${appliedPromoMsg.valid ? 'text-emerald-400' : 'text-rose-400'}`}>
              {appliedPromoMsg.text}
            </p>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-6 bg-slate-950/90 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Instant activation. Cancel or adjust plan anytime.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmUpgrade}
              disabled={isProcessing}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gold-400 hover:bg-gold-300 text-slate-950 font-black text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <span>Activating Plan...</span>
              ) : (
                <>
                  <span>Confirm Plan Activation</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
