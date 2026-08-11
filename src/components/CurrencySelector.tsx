import React, { useState, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { currencyService, CURRENCIES } from '../lib/currencyService';
import { CurrencyCode } from '../types/subscription';

interface CurrencySelectorProps {
  className?: string;
  compact?: boolean;
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({ className = '', compact = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCode, setActiveCode] = useState<CurrencyCode>(currencyService.getCurrencyCode());

  useEffect(() => {
    const unsub = currencyService.subscribe(() => {
      setActiveCode(currencyService.getCurrencyCode());
    });
    return () => unsub();
  }, []);

  const currentConfig = CURRENCIES[activeCode] || CURRENCIES.USD;

  const handleSelect = (code: CurrencyCode) => {
    currencyService.setCurrency(code);
    setActiveCode(code);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-xl transition-all cursor-pointer font-bold border ${
          compact
            ? 'px-2.5 py-1 text-xs bg-navy-900 hover:bg-navy-800 text-gold-400 border-navy-700'
            : 'px-3 py-1.5 text-xs bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-2xs'
        }`}
        title="Change Pricing Currency by Location"
      >
        <span className="text-base leading-none">{currentConfig.flag}</span>
        <span className="font-mono font-extrabold">{currentConfig.code} ({currentConfig.symbol})</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white shadow-2xl border border-slate-200 z-50 overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Globe className="h-3 w-3" /> Select Location / Currency
              </span>
              <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-bold">
                Auto-Detected
              </span>
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
              {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => {
                const item = CURRENCIES[code];
                const isSelected = code === activeCode;

                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleSelect(code)}
                    className={`w-full px-3 py-2 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer ${
                      isSelected ? 'bg-gold-50/60 font-bold text-navy-950' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg leading-none shrink-0">{item.flag}</span>
                      <div className="truncate">
                        <div className="text-xs font-extrabold flex items-center gap-1.5">
                          <span className="font-mono">{item.code}</span>
                          <span className="text-slate-400 font-normal">({item.symbol})</span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate">{item.country}</p>
                      </div>
                    </div>

                    {isSelected && <Check className="h-4 w-4 text-gold-600 shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="p-2 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500 text-center">
              💡 Prices automatically convert to local PPP market purchasing rates.
            </div>
          </div>
        </>
      )}
    </div>
  );
};
