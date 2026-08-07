import React from 'react';
import { Flame, Zap, Snowflake, Info } from 'lucide-react';
import { getEnergyLabel } from '../lib/aiScoringEngine';
import { ScoreComponentBreakdown } from '../types/crm';

interface LeadEnergyGaugeProps {
  score: number;
  breakdown?: ScoreComponentBreakdown;
  size?: 'sm' | 'md' | 'lg';
  showBreakdown?: boolean;
}

export const LeadEnergyGauge: React.FC<LeadEnergyGaugeProps> = ({
  score,
  breakdown,
  size = 'md',
  showBreakdown = false,
}) => {
  const info = getEnergyLabel(score);

  const getBarColor = (val: number) => {
    if (val >= 80) return 'bg-gradient-to-r from-emerald-500 to-teal-400';
    if (val >= 50) return 'bg-gradient-to-r from-amber-500 to-gold-400';
    return 'bg-gradient-to-r from-rose-500 to-pink-500';
  };

  const getIcon = () => {
    if (score >= 80) return <Flame className="h-4 w-4 text-emerald-600 inline" />;
    if (score >= 50) return <Zap className="h-4 w-4 text-amber-600 inline" />;
    return <Snowflake className="h-4 w-4 text-rose-600 inline" />;
  };

  if (size === 'sm') {
    return (
      <div className="flex items-center gap-2">
        <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getBarColor(score)}`}
            style={{ width: `${Math.min(Math.max(score, 5), 100)}%` }}
          />
        </div>
        <span className="text-xs font-bold text-slate-700 min-w-[28px]">{score}%</span>
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-4 border ${info.bgClass} ${info.borderClass} space-y-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getIcon()}
          <span className={`font-bold text-sm ${info.colorClass}`}>{info.label}</span>
        </div>
        <span className={`text-xl font-extrabold font-mono ${info.colorClass}`}>{score}%</span>
      </div>

      {/* Main energy bar */}
      <div className="w-full bg-white/80 rounded-full h-3 overflow-hidden border border-slate-200 p-0.5 shadow-inner">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getBarColor(score)}`}
          style={{ width: `${Math.min(Math.max(score, 5), 100)}%` }}
        />
      </div>

      {/* Score breakdown if requested */}
      {showBreakdown && breakdown && (
        <div className="pt-2 border-t border-slate-200/60 text-xs text-slate-600 space-y-1.5">
          <div className="flex justify-between items-center">
            <span>Budget Depth</span>
            <span className="font-semibold text-slate-800">+{breakdown.budgetScore} pts</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Engagement Level</span>
            <span className="font-semibold text-slate-800">+{breakdown.engagementScore} pts</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Urgency Factor</span>
            <span className="font-semibold text-slate-800">+{breakdown.urgencyScore} pts</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Communication Velocity</span>
            <span className="font-semibold text-slate-800">+{breakdown.replyScore} pts</span>
          </div>
          <div className="flex justify-between items-center">
            <span>M365 Integration Bonus</span>
            <span className="font-semibold text-slate-800">+{breakdown.m365ActivityScore} pts</span>
          </div>
        </div>
      )}
    </div>
  );
};
