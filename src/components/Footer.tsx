import React from 'react';
import { Layers, CheckCircle2, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-navy-900 border-t border-navy-800 text-navy-200 py-8 px-4 sm:px-6 lg:px-8 mt-12">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-xl font-black text-white">
              SPI<span style={{ color: 'var(--brand-luxury-gold, #DCAE3E)' }} className="transition-colors duration-300">HEAD</span> <span className="text-navy-300 font-bold text-sm ml-1">CRM</span>
            </span>
            <p className="text-xs text-navy-300">Modern CRM with Microsoft 365 Integration & AI Lead Scoring</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-navy-300">
          <div className="flex items-center gap-1.5 bg-navy-800 px-3 py-1.5 rounded-full border border-navy-700">
            <Layers className="h-3.5 w-3.5 text-gold-400" />
            <span>Microsoft 365 Outlook & Teams Synced</span>
          </div>
          <div className="flex items-center gap-1.5 bg-navy-800 px-3 py-1.5 rounded-full border border-navy-700">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Zero Paid API Dependencies Active</span>
          </div>
        </div>

        <div className="text-xs text-navy-400 text-center md:text-right">
          © {new Date().getFullYear()} SPIHEAD CRM. All rights reserved.
        </div>
      </div>
    </footer>
  );
};
