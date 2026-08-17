import React, { useState, useMemo } from 'react';
import { Lead, LeadStatus, Meeting, M365Account } from '../types/crm';
import { m365Service } from '../lib/m365Service';
import { crmStore } from '../lib/store';
import {
  BarChart3,
  TrendingUp,
  Flame,
  DollarSign,
  PieChart as PieIcon,
  Sparkles,
  Download,
  Filter,
  Layers,
  ArrowUpRight,
  Zap,
  Sliders,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Mail,
  Video,
  ChevronRight,
  Target,
  RefreshCw,
  Search,
  Copy,
  Check,
  Building,
  Award,
  HelpCircle,
  Clock,
  ShieldCheck,
  FileText
} from 'lucide-react';

interface AnalyticsViewProps {
  leads: Lead[];
  meetings?: Meeting[];
  m365Account?: M365Account;
  showToast?: (text: string, type?: 'success' | 'info') => void;
  onNavigate?: (view: string) => void;
}

// Default stage win probabilities
const STAGE_WIN_PROBABILITIES: Record<LeadStatus, number> = {
  New: 0.1,
  Contacted: 0.25,
  Qualified: 0.5,
  Proposal: 0.75,
  Closed: 1.0,
};

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  leads,
  meetings = [],
  m365Account,
  showToast,
  onNavigate,
}) => {
  // Global Filters State
  const [selectedIndustry, setSelectedIndustry] = useState<string>('All');
  const [selectedWarmthTier, setSelectedWarmthTier] = useState<string>('All');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('All Time');
  const [selectedFunnelStage, setSelectedFunnelStage] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<'budget' | 'score' | 'name' | 'weighted'>('weighted');

  // Scenario Simulator State
  const [winProbBoost, setWinProbBoost] = useState<number>(10); // +10% boost
  const [dealSizeMultiplier, setDealSizeMultiplier] = useState<number>(1.1); // 1.1x multiplier
  const [simActiveTab, setSimActiveTab] = useState<'funnel' | 'insights' | 'drilldown'>('funnel');

  const [copiedLeadId, setCopiedLeadId] = useState<string | null>(null);

  // Extract list of unique industries
  const availableIndustries = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.industry) set.add(l.industry);
    });
    return Array.from(set).sort();
  }, [leads]);

  // Filtered Leads Calculation
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      // Industry filter
      if (selectedIndustry !== 'All' && l.industry !== selectedIndustry) {
        return false;
      }
      // Warmth tier filter
      if (selectedWarmthTier === 'hot' && l.score < 75) return false;
      if (selectedWarmthTier === 'warm' && (l.score < 50 || l.score >= 75)) return false;
      if (selectedWarmthTier === 'cold' && l.score >= 50) return false;

      // Funnel Stage filter
      if (selectedFunnelStage !== 'All' && l.status !== selectedFunnelStage) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = l.name.toLowerCase().includes(q);
        const matchCompany = l.company.toLowerCase().includes(q);
        const matchIndustry = (l.industry || '').toLowerCase().includes(q);
        if (!matchName && !matchCompany && !matchIndustry) return false;
      }

      return true;
    });
  }, [leads, selectedIndustry, selectedWarmthTier, selectedFunnelStage, searchQuery]);

  // Key KPI Aggregations
  const totalLeadsCount = filteredLeads.length;
  const grossPipelineValue = filteredLeads.reduce((sum, l) => sum + (l.budget || 0), 0);
  
  const weightedExpectedRevenue = filteredLeads.reduce((sum, l) => {
    const prob = STAGE_WIN_PROBABILITIES[l.status] || 0.1;
    return sum + (l.budget || 0) * prob;
  }, 0);

  const avgEnergyScore =
    totalLeadsCount > 0
      ? Math.round(filteredLeads.reduce((sum, l) => sum + l.score, 0) / totalLeadsCount)
      : 0;

  const hotLeads = filteredLeads.filter((l) => l.score >= 75);
  const warmLeads = filteredLeads.filter((l) => l.score >= 50 && l.score < 75);
  const coldLeads = filteredLeads.filter((l) => l.score < 50);

  const hotLeadsValue = hotLeads.reduce((sum, l) => sum + (l.budget || 0), 0);
  const warmLeadsValue = warmLeads.reduce((sum, l) => sum + (l.budget || 0), 0);
  const coldLeadsValue = coldLeads.reduce((sum, l) => sum + (l.budget || 0), 0);

  const closedLeads = filteredLeads.filter((l) => l.status === 'Closed');
  const closedRevenue = closedLeads.reduce((sum, l) => sum + (l.budget || 0), 0);
  const winRatePercentage = totalLeadsCount > 0 ? Math.round((closedLeads.length / totalLeadsCount) * 100) : 0;
  const avgDealSize = totalLeadsCount > 0 ? Math.round(grossPipelineValue / totalLeadsCount) : 0;

  // Pipeline Stage Funnel Breakdown
  const statuses: LeadStatus[] = ['New', 'Contacted', 'Qualified', 'Proposal', 'Closed'];
  const pipelineBreakdown = useMemo(() => {
    return statuses.map((st, idx) => {
      const list = filteredLeads.filter((l) => l.status === st);
      const stageBudget = list.reduce((sum, l) => sum + (l.budget || 0), 0);
      const defaultProb = STAGE_WIN_PROBABILITIES[st];
      const stageWeighted = stageBudget * defaultProb;
      const pctOfTotal = grossPipelineValue > 0 ? Math.round((stageBudget / grossPipelineValue) * 100) : 0;

      // Calculate conversion velocity drop to next stage
      const nextStage = statuses[idx + 1];
      const nextCount = nextStage ? filteredLeads.filter((l) => l.status === nextStage).length : 0;
      const conversionRate = list.length > 0 && nextStage ? Math.round((nextCount / list.length) * 100) : 100;

      return {
        status: st,
        count: list.length,
        totalBudget: stageBudget,
        winProbability: defaultProb,
        weightedValue: stageWeighted,
        pctOfTotal,
        conversionRate,
      };
    });
  }, [filteredLeads, grossPipelineValue]);

  // Industry Revenue Concentration
  const industryBreakdown = useMemo(() => {
    const map: Record<string, { count: number; totalBudget: number; avgScore: number; scoreSum: number }> = {};
    filteredLeads.forEach((l) => {
      const ind = l.industry || 'General Industry';
      if (!map[ind]) {
        map[ind] = { count: 0, totalBudget: 0, avgScore: 0, scoreSum: 0 };
      }
      map[ind].count += 1;
      map[ind].totalBudget += l.budget || 0;
      map[ind].scoreSum += l.score || 0;
    });

    return Object.entries(map)
      .map(([industry, data]) => ({
        industry,
        count: data.count,
        totalBudget: data.totalBudget,
        avgScore: Math.round(data.scoreSum / (data.count || 1)),
        pctOfTotal: grossPipelineValue > 0 ? Math.round((data.totalBudget / grossPipelineValue) * 100) : 0,
      }))
      .sort((a, b) => b.totalBudget - a.totalBudget);
  }, [filteredLeads, grossPipelineValue]);

  // Scenario Simulator Outputs
  const simulatedResults = useMemo(() => {
    const boostDecimal = winProbBoost / 100;
    const simExpectedRev = filteredLeads.reduce((sum, l) => {
      const baseProb = STAGE_WIN_PROBABILITIES[l.status] || 0.1;
      const simProb = Math.min(1.0, baseProb + boostDecimal);
      const simBudget = (l.budget || 0) * dealSizeMultiplier;
      return sum + simBudget * simProb;
    }, 0);

    const varianceUSD = simExpectedRev - weightedExpectedRevenue;
    const variancePct = weightedExpectedRevenue > 0 ? Math.round((varianceUSD / weightedExpectedRevenue) * 100) : 0;

    return {
      simExpectedRev: Math.round(simExpectedRev),
      varianceUSD: Math.round(varianceUSD),
      variancePct,
    };
  }, [filteredLeads, winProbBoost, dealSizeMultiplier, weightedExpectedRevenue]);

  // Sorted Leads for Drill-down
  const sortedLeads = useMemo(() => {
    return [...filteredLeads].sort((a, b) => {
      if (sortField === 'budget') return b.budget - a.budget;
      if (sortField === 'score') return b.score - a.score;
      if (sortField === 'name') return a.name.localeCompare(b.name);
      // default weighted
      const probA = STAGE_WIN_PROBABILITIES[a.status] || 0.1;
      const probB = STAGE_WIN_PROBABILITIES[b.status] || 0.1;
      return b.budget * probB - a.budget * probA;
    });
  }, [filteredLeads, sortField]);

  // Trigger Toast Notification
  const triggerToast = (msg: string, type: 'success' | 'info' = 'success') => {
    if (showToast) showToast(msg, type);
  };

  // Copy Lead Summary
  const handleCopyLead = (lead: Lead) => {
    const summary = `${lead.name} (${lead.company}) - Status: ${lead.status} | Budget: $${lead.budget.toLocaleString()} | Energy Score: ${lead.score}% | Industry: ${lead.industry || 'N/A'}`;
    navigator.clipboard.writeText(summary);
    setCopiedLeadId(lead.id);
    setTimeout(() => setCopiedLeadId(null), 2000);
    triggerToast(`Copied ${lead.name} deal metrics to clipboard!`, 'info');
  };

  // Download Comprehensive Executive Analytics Report (.txt)
  const handleDownloadExecutiveReport = () => {
    const accountName = m365Account?.displayName || 'Sanelisiwe Sileku';
    const tenantName = m365Account?.tenantName || 'SPIHEAD Enterprise Tenant';
    const now = new Date().toLocaleString();

    const reportContent = `===================================================================
SPIHEAD CRM & MICROSOFT 365 SUITE - EXECUTIVE PIPELINE REPORT
Generated On: ${now}
Prepared By: ${accountName} (${tenantName})
===================================================================

1. EXECUTIVE KPI SUMMARY
-------------------------------------------------------------------
Total Active Leads: ${totalLeadsCount}
Gross Pipeline Value: $${grossPipelineValue.toLocaleString()} USD
Probability-Weighted Forecast: $${Math.round(weightedExpectedRevenue).toLocaleString()} USD
Average AI Lead Energy Score: ${avgEnergyScore}% (Warmth Index)
Average Deal Size: $${avgDealSize.toLocaleString()} USD
Win Rate (Closed / Total): ${winRatePercentage}% ($${closedRevenue.toLocaleString()} Closed Value)

2. LEAD WARMTH & ENERGY TIER BREAKDOWN
-------------------------------------------------------------------
- Hot Leads (Score >= 75%): ${hotLeads.length} Deals | $${hotLeadsValue.toLocaleString()} USD (${grossPipelineValue > 0 ? Math.round((hotLeadsValue / grossPipelineValue) * 100) : 0}% of Total)
- Warm Leads (Score 50-74%): ${warmLeads.length} Deals | $${warmLeadsValue.toLocaleString()} USD
- Cold Leads (Score < 50%): ${coldLeads.length} Deals | $${coldLeadsValue.toLocaleString()} USD

3. STAGE-BY-STAGE PIPELINE FUNNEL
-------------------------------------------------------------------
${pipelineBreakdown
  .map(
    (p) =>
      `• ${p.status.padEnd(10)}: ${p.count.toString().padStart(2)} Deals | Gross: $${p.totalBudget.toLocaleString().padStart(10)} USD | Win Prob: ${Math.round(p.winProbability * 100)}% | Weighted: $${Math.round(p.weightedValue).toLocaleString()} USD`
  )
  .join('\n')}

4. REVENUE CONCENTRATION BY INDUSTRY / SECTOR
-------------------------------------------------------------------
${industryBreakdown
  .map(
    (ind) =>
      `• ${ind.industry.padEnd(20)}: ${ind.count.toString().padStart(2)} Deals | Total: $${ind.totalBudget.toLocaleString().padStart(10)} USD (${ind.pctOfTotal}%) | Avg Energy: ${ind.avgScore}%`
  )
  .join('\n')}

5. AI SCENARIO SIMULATION FORECAST (+${winProbBoost}% Win Rate, ${dealSizeMultiplier}x Deal Size)
-------------------------------------------------------------------
Baseline Weighted Forecast : $${Math.round(weightedExpectedRevenue).toLocaleString()} USD
Simulated Projected Forecast: $${simulatedResults.simExpectedRev.toLocaleString()} USD
Net Forecast Uplift Variance : +$${simulatedResults.varianceUSD.toLocaleString()} USD (+${simulatedResults.variancePct}%)

6. ACTIVE DEALS LIST SUMMARY
-------------------------------------------------------------------
${sortedLeads
  .slice(0, 15)
  .map(
    (l) =>
      `- ${l.name.padEnd(20)} | ${l.company.padEnd(18)} | Stage: ${l.status.padEnd(10)} | Budget: $${l.budget.toLocaleString().padStart(8)} | Score: ${l.score}%`
  )
  .join('\n')}

===================================================================
End of SPIHEAD Executive Report - Sync'd with M365 Exchange & Graph API
`;

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SPIHEAD_CRM_Executive_Report_${new Date().toISOString().slice(0, 10)}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    triggerToast('Downloaded Executive Analytics Summary Report!');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header Controls */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-gold-500" />
              <h1 className="text-2xl font-black text-navy-900 tracking-tight">
                CRM Analytics & Pipeline Insights
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gold-100 text-gold-800 border border-gold-300">
                AI Powered
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Real-time revenue forecast, AI lead energy distribution, conversion funnels, and M365 Microsoft Graph exports.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                crmStore.resetToDefaultData();
                triggerToast('Reloaded all 19 sample deals across 15+ industry sectors!');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-extrabold text-xs cursor-pointer transition-all"
              title="Reset and load all 19 sample pipeline leads across 15+ industry sectors"
            >
              <RefreshCw className="h-4 w-4 text-amber-600" />
              Reload 15+ Industry Deals
            </button>

            <button
              type="button"
              onClick={handleDownloadExecutiveReport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-navy-900 font-extrabold text-xs cursor-pointer transition-all"
            >
              <FileText className="h-4 w-4 text-slate-700" />
              Download Report (.txt)
            </button>

            <button
              type="button"
              onClick={() => {
                m365Service.exportPowerBiDataset(filteredLeads, meetings, m365Account || m365Service.getAccount());
                triggerToast('Exported Power BI JSON Dataset!');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-extrabold text-xs cursor-pointer transition-all"
            >
              <Layers className="h-4 w-4 text-indigo-600" />
              Power BI Dataset
            </button>

            <button
              type="button"
              onClick={() => {
                m365Service.exportToExcelCSV(filteredLeads);
                triggerToast(`Exported ${filteredLeads.length} leads to Excel CSV file!`);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-gold-400 font-extrabold text-xs shadow-xs cursor-pointer transition-transform active:scale-95"
            >
              <Download className="h-4 w-4 text-gold-400" />
              Export Excel CSV
            </button>
          </div>
        </div>

        {/* Global Interactive Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1">
          {/* Industry Filter */}
          <div>
            <label htmlFor="analytics-industry-filter" className="block font-extrabold text-slate-700 mb-1 flex items-center gap-1">
              <Building className="h-3.5 w-3.5 text-slate-400" />
              Industry Sector
            </label>
            <select
              id="analytics-industry-filter"
              name="selectedIndustry"
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-slate-50 text-navy-900 focus:ring-2 focus:ring-gold-500 focus:outline-none"
            >
              <option value="All">All Industry Sectors ({leads.length})</option>
              {availableIndustries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>

          {/* Warmth Tier Filter */}
          <div>
            <label htmlFor="analytics-warmth-filter" className="block font-extrabold text-slate-700 mb-1 flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-amber-500" />
              AI Warmth Score Tier
            </label>
            <select
              id="analytics-warmth-filter"
              name="selectedWarmthTier"
              value={selectedWarmthTier}
              onChange={(e) => setSelectedWarmthTier(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-slate-50 text-navy-900 focus:ring-2 focus:ring-gold-500 focus:outline-none"
            >
              <option value="All">All Warmth Tiers</option>
              <option value="hot">🔥 Hot Leads (Score &ge; 75%)</option>
              <option value="warm">⚡ Warm Leads (Score 50-74%)</option>
              <option value="cold">❄️ Cold Leads (Score &lt; 50%)</option>
            </select>
          </div>

          {/* Funnel Stage Filter */}
          <div>
            <label htmlFor="analytics-funnel-filter" className="block font-extrabold text-slate-700 mb-1 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5 text-blue-500" />
              Funnel Stage
            </label>
            <select
              id="analytics-funnel-filter"
              name="selectedFunnelStage"
              value={selectedFunnelStage}
              onChange={(e) => setSelectedFunnelStage(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-slate-50 text-navy-900 focus:ring-2 focus:ring-gold-500 focus:outline-none"
            >
              <option value="All">All Pipeline Stages</option>
              {statuses.map((st) => (
                <option key={st} value={st}>
                  {st} Stage
                </option>
              ))}
            </select>
          </div>

          {/* Timeframe */}
          <div>
            <label htmlFor="analytics-timeframe-filter" className="block font-extrabold text-slate-700 mb-1 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-teal-500" />
              Time Horizon
            </label>
            <select
              id="analytics-timeframe-filter"
              name="selectedTimeframe"
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-slate-50 text-navy-900 focus:ring-2 focus:ring-gold-500 focus:outline-none"
            >
              <option value="All Time">All Time (Full Pipeline)</option>
              <option value="Q3 2026">Q3 2026 Active Pipeline</option>
              <option value="YTD 2026">Year-to-Date (2026)</option>
              <option value="90 Days">Next 90 Days Closing Window</option>
            </select>
          </div>
        </div>
      </div>

      {/* Top 4 Key Metric Executive KPI Band */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Gross Pipeline Budget */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Gross Pipeline Budget</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-navy-900 font-mono">
            ${grossPipelineValue.toLocaleString()}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>{totalLeadsCount} Active Pipeline Deals</span>
            <span className="text-blue-700 font-extrabold bg-blue-50 px-2 py-0.5 rounded">100% Gross</span>
          </div>
        </div>

        {/* Metric 2: Weighted Expected Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Weighted Forecast</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-navy-900 font-mono">
            ${Math.round(weightedExpectedRevenue).toLocaleString()}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Win Probability Adjusted</span>
            <span className="text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded">
              {grossPipelineValue > 0 ? Math.round((weightedExpectedRevenue / grossPipelineValue) * 100) : 0}% Realizable
            </span>
          </div>
        </div>

        {/* Metric 3: Average Lead Energy Score */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Average AI Lead Warmth</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-navy-900 font-mono flex items-center gap-2">
            {avgEnergyScore}%
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold font-sans ${
                avgEnergyScore >= 75
                  ? 'bg-amber-100 text-amber-800'
                  : avgEnergyScore >= 50
                  ? 'bg-teal-100 text-teal-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {avgEnergyScore >= 75 ? '🔥 Hot' : avgEnergyScore >= 50 ? '⚡ Warm' : '❄️ Cold'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>High Warmth Deals: {hotLeads.length}</span>
            <span className="font-bold text-amber-700 font-mono">${hotLeadsValue.toLocaleString()}</span>
          </div>
        </div>

        {/* Metric 4: Closed Revenue & Win Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Win Rate & Avg Deal</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-navy-900 font-mono">
            {winRatePercentage}%
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Avg Deal: ${avgDealSize.toLocaleString()}</span>
            <span className="text-purple-700 font-extrabold bg-purple-50 px-2 py-0.5 rounded">
              ${closedRevenue.toLocaleString()} Won
            </span>
          </div>
        </div>
      </div>

      {/* Main Analysis Grid: Stage Funnel & Revenue Scenario Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Pipeline Stage Funnel Breakdown */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-navy-900 text-base flex items-center gap-2">
                <Target className="h-5 w-5 text-gold-500" />
                Pipeline Stage Conversion Funnel & Probability Matrix
              </h3>
              <p className="text-xs text-slate-500">
                Stage distribution, win likelihood percentages, and probability-weighted expected revenue.
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <span className="h-2 w-2 rounded-full bg-navy-900"></span>
              Gross Value
              <span className="h-2 w-2 rounded-full bg-gold-400 ml-2"></span>
              Weighted Forecast
            </div>
          </div>

          <div className="space-y-5">
            {pipelineBreakdown.map((stage) => {
              const isSelected = selectedFunnelStage === stage.status;
              return (
                <div
                  key={stage.status}
                  onClick={() => setSelectedFunnelStage(isSelected ? 'All' : stage.status)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white border-navy-800 shadow-md ring-2 ring-gold-400'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-navy-900'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-black text-sm px-2.5 py-1 rounded-lg ${
                          isSelected ? 'bg-gold-500 text-navy-950' : 'bg-navy-900 text-gold-400'
                        }`}
                      >
                        {stage.status}
                      </span>
                      <span className="font-bold opacity-80">
                        {stage.count} {stage.count === 1 ? 'Lead' : 'Leads'} ({stage.pctOfTotal}% of Pipeline)
                      </span>
                    </div>

                    <div className="flex items-center gap-4 font-mono font-bold text-xs">
                      <div>
                        <span className="text-[10px] opacity-60 block uppercase">Gross Value</span>
                        <span>${stage.totalBudget.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] opacity-60 block uppercase">Win Likelihood</span>
                        <span className="text-gold-400 font-extrabold">
                          {Math.round(stage.winProbability * 100)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] opacity-60 block uppercase">Weighted Forecast</span>
                        <span className={isSelected ? 'text-emerald-400' : 'text-emerald-600'}>
                          ${Math.round(stage.weightedValue).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Visual Dual Funnel Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-200/60 rounded-full h-3 overflow-hidden p-0.5 border border-slate-300/30 flex">
                      <div
                        className="h-full bg-navy-900 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(stage.pctOfTotal, 3)}%` }}
                      />
                      <div
                        className="h-full bg-gold-400 rounded-full transition-all duration-500 -ml-1"
                        style={{
                          width: `${Math.max(stage.pctOfTotal * stage.winProbability, 2)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: AI Revenue Scenario Simulator */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sliders className="h-5 w-5 text-gold-500" />
              <div>
                <h3 className="font-extrabold text-navy-900 text-base">
                  Interactive Revenue Simulator
                </h3>
                <p className="text-[11px] text-slate-500">
                  Model win rate shifts & average deal size multipliers in real-time.
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-4 text-xs">
              {/* Control 1: Win Rate Shift */}
              <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <label htmlFor="sim-winprob-boost" className="flex justify-between font-bold text-navy-900 cursor-pointer">
                  <span>Win Probability Delta Boost</span>
                  <span className="font-mono text-gold-600">+{winProbBoost}%</span>
                </label>
                <input
                  id="sim-winprob-boost"
                  name="winProbBoost"
                  type="range"
                  min="0"
                  max="30"
                  step="5"
                  value={winProbBoost}
                  onChange={(e) => setWinProbBoost(Number(e.target.value))}
                  className="w-full accent-gold-500 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">
                  Simulates improved conversion from M365 email nurture & Teams demos.
                </p>
              </div>

              {/* Control 2: Deal Size Multiplier */}
              <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <label htmlFor="sim-dealsize-multiplier" className="flex justify-between font-bold text-navy-900 cursor-pointer">
                  <span>Average Deal Upside Multiplier</span>
                  <span className="font-mono text-indigo-600">{dealSizeMultiplier}x</span>
                </label>
                <input
                  id="sim-dealsize-multiplier"
                  name="dealSizeMultiplier"
                  type="range"
                  min="0.8"
                  max="1.5"
                  step="0.05"
                  value={dealSizeMultiplier}
                  onChange={(e) => setDealSizeMultiplier(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">
                  Simulates upselling add-on Azure cloud services or M365 seat licenses.
                </p>
              </div>
            </div>

            {/* Simulator Output Comparison */}
            <div className="p-4 bg-navy-950 text-white rounded-2xl border border-navy-800 space-y-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-gold-400 block font-bold">
                Simulated Forecast Comparison
              </span>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Baseline Expected:</span>
                  <span className="font-mono">${Math.round(weightedExpectedRevenue).toLocaleString()}</span>
                </div>

                <div className="flex justify-between text-base font-black text-white">
                  <span>Simulated Forecast:</span>
                  <span className="font-mono text-emerald-400">${simulatedResults.simExpectedRev.toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-navy-800 flex justify-between items-center text-xs font-bold">
                <span className="text-gold-400">Net Forecast Uplift:</span>
                <span className="font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-800">
                  +${simulatedResults.varianceUSD.toLocaleString()} (+{simulatedResults.variancePct}%)
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadExecutiveReport}
            className="w-full py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-gold-400 font-extrabold text-xs shadow-sm cursor-pointer flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download Full Simulation & Pipeline Report
          </button>
        </div>
      </div>

      {/* Secondary Row: Visual Charts (Lead Warmth Donut & Industry Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: SVG Lead Warmth Energy Donut & Tier Stats */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <PieIcon className="h-5 w-5 text-amber-500" />
              <h3 className="font-extrabold text-navy-900 text-base">
                AI Lead Energy Score Distribution
              </h3>
            </div>
            <span className="text-xs font-bold font-mono text-slate-500">
              Avg Score: {avgEnergyScore}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {/* Hot Tier */}
            <div
              onClick={() => setSelectedWarmthTier(selectedWarmthTier === 'hot' ? 'All' : 'hot')}
              className={`p-4 rounded-xl border text-center space-y-1 cursor-pointer transition-all ${
                selectedWarmthTier === 'hot'
                  ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-500'
                  : 'bg-amber-50/60 border-amber-200 hover:bg-amber-100/80'
              }`}
            >
              <span className="text-xs font-black text-amber-900 flex items-center justify-center gap-1">
                <Flame className="h-4 w-4 text-amber-600" />
                Hot (&ge;75%)
              </span>
              <div className="text-2xl font-black text-amber-950 font-mono">{hotLeads.length} Deals</div>
              <span className="text-[11px] font-mono text-amber-800 font-bold block">
                ${hotLeadsValue.toLocaleString()}
              </span>
            </div>

            {/* Warm Tier */}
            <div
              onClick={() => setSelectedWarmthTier(selectedWarmthTier === 'warm' ? 'All' : 'warm')}
              className={`p-4 rounded-xl border text-center space-y-1 cursor-pointer transition-all ${
                selectedWarmthTier === 'warm'
                  ? 'bg-teal-100 border-teal-400 ring-2 ring-teal-500'
                  : 'bg-teal-50/60 border-teal-200 hover:bg-teal-100/80'
              }`}
            >
              <span className="text-xs font-black text-teal-900 flex items-center justify-center gap-1">
                <Zap className="h-4 w-4 text-teal-600" />
                Warm (50-74%)
              </span>
              <div className="text-2xl font-black text-teal-950 font-mono">{warmLeads.length} Deals</div>
              <span className="text-[11px] font-mono text-teal-800 font-bold block">
                ${warmLeadsValue.toLocaleString()}
              </span>
            </div>

            {/* Cold Tier */}
            <div
              onClick={() => setSelectedWarmthTier(selectedWarmthTier === 'cold' ? 'All' : 'cold')}
              className={`p-4 rounded-xl border text-center space-y-1 cursor-pointer transition-all ${
                selectedWarmthTier === 'cold'
                  ? 'bg-slate-200 border-slate-400 ring-2 ring-slate-500'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span className="text-xs font-black text-slate-700 flex items-center justify-center gap-1">
                <Clock className="h-4 w-4 text-slate-500" />
                Cold (&lt;50%)
              </span>
              <div className="text-2xl font-black text-slate-900 font-mono">{coldLeads.length} Deals</div>
              <span className="text-[11px] font-mono text-slate-600 font-bold block">
                ${coldLeadsValue.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Chart 2: Industry Revenue Concentration Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-indigo-600" />
              <h3 className="font-extrabold text-navy-900 text-base">
                Revenue Concentration by Sector
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500">
              {industryBreakdown.length} Sectors Represented
            </span>
          </div>

          <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
            {industryBreakdown.map((ind) => (
              <div
                key={ind.industry}
                onClick={() => setSelectedIndustry(selectedIndustry === ind.industry ? 'All' : ind.industry)}
                className="space-y-1 cursor-pointer group"
              >
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-navy-900 group-hover:text-indigo-600 transition-colors">
                    {ind.industry} ({ind.count} {ind.count === 1 ? 'deal' : 'deals'})
                  </span>
                  <span className="font-mono text-slate-700">
                    ${ind.totalBudget.toLocaleString()} ({ind.pctOfTotal}%)
                  </span>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500 group-hover:bg-indigo-500"
                    style={{ width: `${Math.max(ind.pctOfTotal, 4)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Pipeline Insights & Recommendations Center */}
      <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 text-white p-6 rounded-2xl border border-navy-800 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-navy-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-gold-400" />
            <h3 className="font-black text-gold-400 text-base">
              SPIHEAD Strategic Pipeline Recommendations
            </h3>
          </div>
          <span className="text-xs font-mono text-navy-300">Updated in Real-Time</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Insight 1: Proposal Stage Focus */}
          <div className="p-4 bg-navy-900/80 rounded-xl border border-navy-700 space-y-2 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="font-bold text-gold-400 flex items-center gap-1 text-[11px]">
                <CheckCircle2 className="h-3.5 w-3.5 text-gold-400" />
                Proposal Stage Bottleneck
              </span>
              <p className="text-slate-300 leading-relaxed">
                You have {pipelineBreakdown.find((p) => p.status === 'Proposal')?.count || 0} deals in Proposal stage totaling $
                {(pipelineBreakdown.find((p) => p.status === 'Proposal')?.totalBudget || 0).toLocaleString()}. Schedule a Teams video review to accelerate closing.
              </p>
            </div>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('m365')}
                className="inline-flex items-center gap-1 font-bold text-gold-400 hover:text-gold-300 pt-1 cursor-pointer"
              >
                Schedule Teams Review <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Insight 2: High Energy Quick Win */}
          <div className="p-4 bg-navy-900/80 rounded-xl border border-navy-700 space-y-2 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="font-bold text-emerald-400 flex items-center gap-1 text-[11px]">
                <Flame className="h-3.5 w-3.5 text-emerald-400" />
                High Warmth Opportunities ({hotLeads.length})
              </span>
              <p className="text-slate-300 leading-relaxed">
                Leads with score &ge; 75% represent ${hotLeadsValue.toLocaleString()} in revenue. Send an automated Outlook proposal brief.
              </p>
            </div>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('m365')}
                className="inline-flex items-center gap-1 font-bold text-emerald-400 hover:text-emerald-300 pt-1 cursor-pointer"
              >
                Dispatch Outlook Email <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Insight 3: Microsoft 365 Sync Health */}
          <div className="p-4 bg-navy-900/80 rounded-xl border border-navy-700 space-y-2 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="font-bold text-purple-400 flex items-center gap-1 text-[11px]">
                <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
                Graph API Sync Status
              </span>
              <p className="text-slate-300 leading-relaxed">
                Tenant: {m365Account?.tenantName || 'SPIHEAD Enterprise'}. All contacts, Outlook emails, and Teams meetings are actively synchronized.
              </p>
            </div>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('m365')}
                className="inline-flex items-center gap-1 font-bold text-purple-400 hover:text-purple-300 pt-1 cursor-pointer"
              >
                View M365 Suite Hub <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filtered Lead Deals Drill-down Data Grid */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-navy-900 text-base">
              Active Sales Pipeline Deals ({sortedLeads.length})
            </h3>
            <p className="text-xs text-slate-500">
              Interactive deal table sorted by probability-weighted revenue forecast.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Box */}
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="analytics-search-deals"
                name="searchQuery"
                aria-label="Search deals or company"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search deals, company..."
                className="pl-9 pr-3 py-1.5 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-gold-500 focus:outline-none bg-slate-50 text-navy-900 w-48 sm:w-64"
              />
            </div>

            {/* Sort Dropdown */}
            <select
              id="analytics-sort-field"
              name="sortField"
              aria-label="Sort deals"
              value={sortField}
              onChange={(e) => setSortField(e.target.value as any)}
              className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold bg-slate-50 text-navy-900 focus:ring-2 focus:ring-gold-500 focus:outline-none"
            >
              <option value="weighted">Sort: Weighted Value</option>
              <option value="budget">Sort: Budget ($)</option>
              <option value="score">Sort: Energy Score (%)</option>
              <option value="name">Sort: Company Name</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase font-extrabold text-[10px] tracking-wider">
                <th className="py-3 px-3">Lead & Company</th>
                <th className="py-3 px-3">Stage</th>
                <th className="py-3 px-3 text-right">Gross Budget</th>
                <th className="py-3 px-3 text-center">Win Likelihood</th>
                <th className="py-3 px-3 text-right">Weighted Value</th>
                <th className="py-3 px-3 text-center">AI Warmth Score</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {sortedLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                    No leads match the current filter criteria.
                  </td>
                </tr>
              ) : (
                sortedLeads.map((lead) => {
                  const prob = STAGE_WIN_PROBABILITIES[lead.status] || 0.1;
                  const weightedVal = (lead.budget || 0) * prob;
                  const isCopied = copiedLeadId === lead.id;

                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-navy-900 text-xs">{lead.name}</div>
                        <div className="text-slate-500 text-[11px] flex items-center gap-1.5">
                          <span>{lead.company}</span>
                          {lead.industry && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-bold">
                              {lead.industry}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                            lead.status === 'Closed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : lead.status === 'Proposal'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : lead.status === 'Qualified'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {lead.status}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-navy-900">
                        ${lead.budget.toLocaleString()}
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-bold text-gold-600">
                        {Math.round(prob * 100)}%
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                        ${Math.round(weightedVal).toLocaleString()}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center gap-1 font-mono font-extrabold text-xs px-2 py-0.5 rounded-md bg-slate-100 text-navy-900">
                          <Flame
                            className={`h-3.5 w-3.5 ${
                              lead.score >= 75
                                ? 'text-amber-500'
                                : lead.score >= 50
                                ? 'text-teal-500'
                                : 'text-slate-400'
                            }`}
                          />
                          {lead.score}%
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleCopyLead(lead)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                          title="Copy Deal Metrics"
                        >
                          {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

