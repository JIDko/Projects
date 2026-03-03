import { logger } from '../../shared/logger.js';
import type { FilteredNiche } from './filter.js';

export type WeightsConfig = Record<string, number>;

const DEFAULT_WEIGHTS: WeightsConfig = {
  margin: 0.15,
  growth: 0.25,
  ai_automation: 0.05,
  market_size: 0.10,
  risk: 0.10,
  startup_capital: 0.10,
  time_to_revenue: 0.10,
  competition: 0.05,
  organic_traffic: 0.05,
  license_free: 0.05,
};

let activeWeights: WeightsConfig = { ...DEFAULT_WEIGHTS };

export function setWeights(weights: WeightsConfig) {
  activeWeights = { ...DEFAULT_WEIGHTS, ...weights };
  logger.info('Using scoring weights from DB config');
}

// Normalize margin to 0-100 within realistic digital business range.
// 20% = 0, 95% = 100. Outside bounds gets clamped.
function normalizeMargin(margin: number): number {
  const min = 20;
  const max = 95;
  return Math.min(100, Math.max(0, ((margin - min) / (max - min)) * 100));
}

// Normalize growth to 0-100 within realistic range.
// 0% = 0, 50% = 100. Digital markets rarely grow >50%/year sustainably.
function normalizeGrowth(growth: number): number {
  return Math.min(100, Math.max(0, (growth / 50) * 100));
}

// Normalize market size to 0-100 using log scale.
// $100M = 0, $50B = 100
function normalizeMarketSize(marketSize: number): number {
  const minLog = Math.log10(100_000_000);     // 8.0
  const maxLog = Math.log10(50_000_000_000);  // 10.7
  const val = Math.log10(Math.max(marketSize, 100_000_000));
  return Math.min(100, Math.max(0, ((val - minLog) / (maxLog - minLog)) * 100));
}

// Risk score: 100 = no risk flags, -15 per flag
function computeRiskScore(riskFlags: string[]): number {
  return Math.max(0, 100 - riskFlags.length * 15);
}

// Startup capital: $0 = 100, $20K+ = 0 (inverse linear)
function normalizeCapital(capital: number): number {
  return Math.max(0, Math.min(100, ((20_000 - capital) / 20_000) * 100));
}

// Time to revenue: 0 days = 100, 365+ days = 0 (inverse linear)
function normalizeTimeToRevenue(days: number): number {
  return Math.max(0, Math.min(100, ((365 - days) / 365) * 100));
}

// Competition: low = 100, medium = 50, high = 0
function normalizeCompetition(level: 'low' | 'medium' | 'high'): number {
  const map = { low: 100, medium: 50, high: 0 };
  return map[level];
}

// Organic traffic potential: high = 100, medium = 50, low = 0
function normalizeOrganic(level: 'low' | 'medium' | 'high'): number {
  const map = { low: 0, medium: 50, high: 100 };
  return map[level];
}

export function scoreNiches(niches: FilteredNiche[]): Array<FilteredNiche & { total_score: number }> {
  return niches.map(niche => {
    const margin = normalizeMargin(niche.margin_potential);
    const growth = normalizeGrowth(niche.market_growth);
    const aiAuto = niche.ai_automation_score;
    const marketSize = normalizeMarketSize(niche.market_size);
    const risk = computeRiskScore(niche.risk_flags);
    const capital = normalizeCapital(niche.startup_capital);
    const timeRev = normalizeTimeToRevenue(niche.time_to_revenue);
    const competition = normalizeCompetition(niche.competition_level);
    const organic = normalizeOrganic(niche.organic_traffic_potential);
    const licenseFree = niche.requires_license ? 0 : 100;

    const w = (key: string) => activeWeights[key] ?? 0;

    const total_score = Math.round(
      margin * w('margin') +
      growth * w('growth') +
      aiAuto * w('ai_automation') +
      marketSize * w('market_size') +
      risk * w('risk') +
      capital * w('startup_capital') +
      timeRev * w('time_to_revenue') +
      competition * w('competition') +
      organic * w('organic_traffic') +
      licenseFree * w('license_free')
    );

    return { ...niche, total_score };
  });
}
