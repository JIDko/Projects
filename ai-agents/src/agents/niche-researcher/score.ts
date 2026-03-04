import { logger } from '../../shared/logger.js';
import type { NicheV2, PainCluster } from './schemas.js';

export interface ScoredNiche extends NicheV2 {
  total_score: number;
  evidence_score: number;
  business_score: number;
}

// ─── Evidence normalization (50% of total) ───

// signal_count: 2 = 0, 20+ = 100
function normalizeSignalCount(count: number): number {
  return Math.min(100, Math.max(0, ((count - 2) / 18) * 100));
}

// unique_sources: 1 = 0, 5+ = 100
function normalizeUniqueSources(count: number): number {
  return Math.min(100, Math.max(0, ((count - 1) / 4) * 100));
}

// avg_pain_intensity: 1 = 0, 5 = 100
function normalizePainIntensity(intensity: number): number {
  return ((intensity - 1) / 4) * 100;
}

// willingness_to_pay: boolean → 0 or 100
function normalizeWTP(hasWTP: boolean): number {
  return hasWTP ? 100 : 0;
}

// ─── Business normalization (50% of total) ───

// margin: 20% = 0, 95% = 100
function normalizeMargin(margin: number): number {
  return Math.min(100, Math.max(0, ((margin - 20) / 75) * 100));
}

// growth: 0% = 0, 50% = 100
function normalizeGrowth(growth: number): number {
  return Math.min(100, Math.max(0, (growth / 50) * 100));
}

// market_size: $100M = 0, $50B = 100 (log scale)
function normalizeMarketSize(marketSize: number): number {
  const minLog = Math.log10(100_000_000);     // 8.0
  const maxLog = Math.log10(50_000_000_000);  // 10.7
  const val = Math.log10(Math.max(marketSize, 100_000_000));
  return Math.min(100, Math.max(0, ((val - minLog) / (maxLog - minLog)) * 100));
}

// startup_capital: $0 = 100, $20K+ = 0 (inverse)
function normalizeCapital(capital: number): number {
  return Math.max(0, Math.min(100, ((20_000 - capital) / 20_000) * 100));
}

// time_to_revenue: 0 days = 100, 365+ days = 0 (inverse)
function normalizeTimeToRevenue(days: number): number {
  return Math.max(0, Math.min(100, ((365 - days) / 365) * 100));
}

// competition: low = 100, medium = 50, high = 0
function normalizeCompetition(level: 'low' | 'medium' | 'high'): number {
  return { low: 100, medium: 50, high: 0 }[level];
}

// organic_traffic: high = 100, medium = 50, low = 0
function normalizeOrganic(level: 'low' | 'medium' | 'high'): number {
  return { low: 0, medium: 50, high: 100 }[level];
}

// risk: 100 = no flags, -15 per flag
function normalizeRisk(flags: string[]): number {
  return Math.max(0, 100 - flags.length * 15);
}

// ─── Weights ───

const EVIDENCE_WEIGHTS = {
  signal_count: 0.30,
  unique_sources: 0.25,
  pain_intensity: 0.25,
  wtp: 0.20,
};

const BUSINESS_WEIGHTS = {
  margin: 0.20,
  growth: 0.20,
  market_size: 0.15,
  competition: 0.10,
  capital: 0.10,
  time_to_revenue: 0.10,
  risk: 0.10,
  organic: 0.05,
};

export function scoreNiches(
  niches: NicheV2[],
  clusters: PainCluster[],
): ScoredNiche[] {
  logger.info(`=== Step 5: SCORE & RANK (${niches.length} niches) ===`);

  const scored = niches.map(niche => {
    const cluster = clusters[niche.cluster_index];

    // Evidence sub-score
    const evidenceScore = Math.round(
      normalizeSignalCount(cluster?.signal_count ?? 0) * EVIDENCE_WEIGHTS.signal_count +
      normalizeUniqueSources(cluster?.unique_source_count ?? 0) * EVIDENCE_WEIGHTS.unique_sources +
      normalizePainIntensity(cluster?.avg_pain_intensity ?? 1) * EVIDENCE_WEIGHTS.pain_intensity +
      normalizeWTP(cluster?.has_willingness_to_pay ?? false) * EVIDENCE_WEIGHTS.wtp,
    );

    // Business sub-score
    const businessScore = Math.round(
      normalizeMargin(niche.margin_potential) * BUSINESS_WEIGHTS.margin +
      normalizeGrowth(niche.market_growth) * BUSINESS_WEIGHTS.growth +
      normalizeMarketSize(niche.market_size) * BUSINESS_WEIGHTS.market_size +
      normalizeCompetition(niche.competition_level) * BUSINESS_WEIGHTS.competition +
      normalizeCapital(niche.startup_capital) * BUSINESS_WEIGHTS.capital +
      normalizeTimeToRevenue(niche.time_to_revenue) * BUSINESS_WEIGHTS.time_to_revenue +
      normalizeRisk(niche.risk_flags) * BUSINESS_WEIGHTS.risk +
      normalizeOrganic(niche.organic_traffic_potential) * BUSINESS_WEIGHTS.organic,
    );

    // Total: 50/50 blend
    const totalScore = Math.round(evidenceScore * 0.5 + businessScore * 0.5);

    return {
      ...niche,
      total_score: totalScore,
      evidence_score: evidenceScore,
      business_score: businessScore,
    };
  });

  // Sort by total_score descending
  scored.sort((a, b) => b.total_score - a.total_score);

  for (const n of scored) {
    logger.info(
      `  [${n.total_score}] ${n.niche_name} (evidence: ${n.evidence_score}, business: ${n.business_score})`,
    );
  }

  return scored;
}
