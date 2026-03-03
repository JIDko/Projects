import { logger } from '../../shared/logger.js';
import type { NicheIdea } from './schemas.js';

export interface FilteredNiche extends NicheIdea {
  risk_flags: string[];
  passed: boolean;
  rejection_reasons: string[];
}

// Only 4 hard filters — absolute dealbreakers that cannot be scored around.
// Everything else (capital, revenue speed, AI automation, margin, etc.)
// moves into the scoring system as soft factors.
const HARD_FILTERS: Array<{ name: string; test: (n: NicheIdea) => boolean }> = [
  { name: 'not_digital_only',    test: n => n.is_digital_only },
  { name: 'not_white_market',    test: n => n.is_white_market },
  { name: 'not_english_market',  test: n => n.english_speaking_market },
  { name: 'declining_market',    test: n => n.market_growth >= 5 },
];

function detectRiskFlags(n: NicheIdea): string[] {
  const flags: string[] = [];
  const lowerText = `${n.description} ${n.niche_name} ${n.why_attractive}`.toLowerCase();

  // Platform dependency
  const platformTerms = ['shopify', 'amazon', 'etsy', 'instagram', 'tiktok', 'youtube', 'facebook', 'twitter', 'x.com'];
  if (platformTerms.some(term => lowerText.includes(term))) {
    flags.push('PLATFORM_DEPENDENCY');
  }

  // Legal/regulatory risk — only flag truly regulated industries,
  // not niches that serve those industries (e.g. "legal tech" is fine)
  const regulatedTerms = ['medical device', 'health insurance', 'financial advisor', 'investment advice',
    'crypto trading', 'gambling', 'cannabis', 'pharmaceutical', 'prescription'];
  if (regulatedTerms.some(term => lowerText.includes(term))) {
    flags.push('LEGAL_REGULATORY_RISK');
  }

  // Dominated by big tech
  if (n.dominated_by_giants) {
    flags.push('DOMINATED_BY_GIANTS');
  }

  // High seasonality
  if (n.high_seasonality) {
    flags.push('HIGH_SEASONALITY');
  }

  return flags;
}

export function applyFilters(niches: NicheIdea[]): FilteredNiche[] {
  const results: FilteredNiche[] = [];

  for (const niche of niches) {
    const rejections: string[] = [];

    for (const filter of HARD_FILTERS) {
      if (!filter.test(niche)) {
        rejections.push(filter.name);
      }
    }

    const riskFlags = detectRiskFlags(niche);
    const passed = rejections.length === 0;

    results.push({
      ...niche,
      risk_flags: riskFlags,
      passed,
      rejection_reasons: rejections,
    });
  }

  const passCount = results.filter(r => r.passed).length;
  const failCount = results.length - passCount;
  logger.info(`Filtering: ${niches.length} → ${passCount} passed (${failCount} rejected)`);

  if (failCount > 0) {
    const counts: Record<string, number> = {};
    for (const r of results) {
      for (const reason of r.rejection_reasons) {
        counts[reason] = (counts[reason] ?? 0) + 1;
      }
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    logger.info('Filter rejection breakdown:');
    for (const [name, count] of sorted) {
      logger.info(`  ${name}: ${count}/${niches.length} rejected`);
    }
  }

  return results;
}
