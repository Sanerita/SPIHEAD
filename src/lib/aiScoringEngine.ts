import { Lead, ScoreComponentBreakdown } from '../types/crm';

/**
 * Local Zero-Cost Intelligent Lead Energy AI Scoring Engine
 * Replaces expensive external paid APIs with a deterministic, multi-factor scoring model.
 */
export function calculateLeadEnergyScore(lead: Partial<Lead>): { score: number; breakdown: ScoreComponentBreakdown } {
  const budget = lead.budget || 0;
  const engagement = lead.engagement || 1;
  const urgency = !!lead.urgency;
  const replyCount = lead.replyCount || 0;
  const isM365Synced = !!lead.m365Synced;

  // 1. Budget Score (Up to 35 points)
  let budgetScore = 0;
  if (budget >= 100000) budgetScore = 35;
  else if (budget >= 50000) budgetScore = 30;
  else if (budget >= 25000) budgetScore = 24;
  else if (budget >= 10000) budgetScore = 18;
  else if (budget >= 5000) budgetScore = 12;
  else if (budget > 0) budgetScore = 6;

  // 2. Engagement Rating (Up to 25 points, scale 1-5)
  const engagementScore = Math.min(Math.round((engagement / 5) * 25), 25);

  // 3. Urgency Signal (Up to 20 points)
  const urgencyScore = urgency ? 20 : 0;

  // 4. Communication & Email Reply Velocity (Up to 12 points)
  const replyScore = Math.min(replyCount * 4, 12);

  // 5. Microsoft 365 Sync Bonus (Up to 8 points)
  const m365ActivityScore = isM365Synced ? 8 : 2;

  const totalRawScore = budgetScore + engagementScore + urgencyScore + replyScore + m365ActivityScore;
  const score = Math.min(Math.max(totalRawScore, 5), 100);

  return {
    score,
    breakdown: {
      budgetScore,
      engagementScore,
      urgencyScore,
      replyScore,
      m365ActivityScore,
    },
  };
}

export function getEnergyLabel(score: number): { label: string; colorClass: string; bgClass: string; borderClass: string } {
  if (score >= 80) {
    return {
      label: 'High Energy 🔥',
      colorClass: 'text-emerald-600',
      bgClass: 'bg-emerald-50',
      borderClass: 'border-emerald-200',
    };
  }
  if (score >= 50) {
    return {
      label: 'Medium Energy ⚡',
      colorClass: 'text-amber-600',
      bgClass: 'bg-amber-50',
      borderClass: 'border-amber-200',
    };
  }
  return {
    label: 'Low Energy ❄️',
    colorClass: 'text-rose-600',
    bgClass: 'bg-rose-50',
    borderClass: 'border-rose-200',
  };
}

export function generateAIAssessmentText(lead: Lead): string {
  const { score } = calculateLeadEnergyScore(lead);
  if (score >= 80) {
    return `High conversion probability. ${lead.name} at ${lead.company} exhibits strong buying signals with a $${lead.budget.toLocaleString()} budget and active engagement. Recommended action: Schedule a closing call via Microsoft Teams.`;
  }
  if (score >= 50) {
    return `Nurture candidate. ${lead.name} shows interest but may require follow-up. Send an Outlook email with product pricing details and case studies.`;
  }
  return `Early stage lead. Additional discovery needed to quantify timeline and budget requirements.`;
}
