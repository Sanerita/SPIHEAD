import React from 'react';
import { Users, Flame, Calendar, DollarSign, Layers, ArrowUpRight } from 'lucide-react';

interface StatsCardsProps {
  stats: {
    totalLeads: number;
    hotLeads: number;
    meetingsScheduled: number;
    totalValue: number;
    conversionRate: number;
    m365SyncedCount?: number;
  };
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const cards = [
    {
      title: 'Total Pipeline Leads',
      value: stats.totalLeads,
      formattedValue: stats.totalLeads.toString(),
      subtext: `${stats.conversionRate}% conversion rate`,
      icon: Users,
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Hot Energy Leads',
      value: stats.hotLeads,
      formattedValue: `${stats.hotLeads} Leads`,
      subtext: 'Score > 75% warmth',
      icon: Flame,
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      iconColor: 'text-amber-500',
    },
    {
      title: 'Upcoming Meetings',
      value: stats.meetingsScheduled,
      formattedValue: stats.meetingsScheduled.toString(),
      subtext: 'Synced with Teams',
      icon: Calendar,
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      iconColor: 'text-purple-600',
    },
    {
      title: 'Pipeline Revenue',
      value: stats.totalValue,
      formattedValue: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(stats.totalValue),
      subtext: 'Total lead budget',
      icon: DollarSign,
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      iconColor: 'text-emerald-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {card.title}
              </span>
              <div className={`p-2.5 rounded-lg border ${card.badgeColor}`}>
                <Icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
            </div>

            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-tight">
                {card.formattedValue}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500 inline" />
                <span>{card.subtext}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
