import { logger } from '../../shared/logger.js';
import type { ProductSpec } from './parse.js';

export interface ScoreBreakdown {
  vision_clarity: number;
  audience_definition: number;
  feature_completeness: number;
  ux_coherence: number;
  monetization_viability: number;
  gtm_actionability: number;
  success_measurability: number;
}

export interface ValidationResult {
  totalScore: number;
  breakdown: ScoreBreakdown;
  readiness: 'READY' | 'NEEDS_REVIEW' | 'INCOMPLETE';
}

function scoreVision(spec: ProductSpec): number {
  let score = 0;
  if (spec.vision.product_name) score += 3;
  if (spec.vision.one_liner) score += 3;
  if (spec.vision.problem_statement) score += 3;
  if (spec.vision.solution_approach) score += 3;
  if (spec.vision.north_star_metric) score += 3;
  return Math.min(score, 15);
}

function scoreAudience(spec: ProductSpec): number {
  let score = 0;
  const p = spec.audience.primary_persona;
  if (p.name && p.role) score += 3;
  if (p.pain_points.length >= 2) score += 3;
  if (p.goals.length >= 1) score += 2;
  if (p.current_solutions.length >= 1) score += 2;
  const t = spec.audience.tam_sam_som;
  if (t.tam && t.sam && t.som) score += 3;
  if (spec.audience.secondary_personas.length >= 1) score += 2;
  return Math.min(score, 15);
}

function scoreFeatures(spec: ProductSpec): number {
  let score = 0;
  const mvp = spec.features.mvp_features;
  score += Math.min(mvp.length, 5) * 2; // max 10
  if (spec.features.explicitly_excluded.length >= 1) score += 3;
  if (spec.features.v2_features.length >= 1) score += 2;
  return Math.min(score, 15);
}

function scoreUxCoherence(spec: ProductSpec): number {
  let score = 0;
  if (spec.user_flows.onboarding_flow.length >= 3) score += 4;
  else if (spec.user_flows.onboarding_flow.length >= 1) score += 2;
  if (spec.user_flows.core_loop) score += 4;
  if (spec.user_flows.aha_moment) score += 4;
  if (spec.user_flows.retention_hooks.length >= 1) score += 3;
  return Math.min(score, 15);
}

function scoreMonetization(spec: ProductSpec): number {
  let score = 0;
  if (spec.monetization.model) score += 3;
  score += Math.min(spec.monetization.pricing_tiers.length, 3) * 2; // max 6
  if (spec.monetization.revenue_projections.month_6) score += 2;
  if (spec.monetization.competitor_pricing_context) score += 2;
  if (spec.monetization.revenue_projections.assumptions.length >= 1) score += 2;
  return Math.min(score, 15);
}

function scoreGtm(spec: ProductSpec): number {
  let score = 0;
  if (spec.gtm.launch_strategy) score += 3;
  score += Math.min(spec.gtm.channels.length, 3) * 2; // max 6
  if (spec.gtm.first_100_users) score += 3;
  if (spec.gtm.content_strategy) score += 2;
  if (spec.gtm.partnerships.length >= 1) score += 1;
  return Math.min(score, 15);
}

function scoreSuccessCriteria(spec: ProductSpec): number {
  let score = 0;
  if (spec.success_criteria.week_1.length >= 1) score += 2;
  if (spec.success_criteria.month_1.length >= 1) score += 3;
  if (spec.success_criteria.month_3.length >= 1) score += 3;
  if (spec.success_criteria.kill_criteria.length >= 1) score += 2;
  return Math.min(score, 10);
}

export function scoreProductSpec(spec: ProductSpec): ValidationResult {
  const breakdown: ScoreBreakdown = {
    vision_clarity: scoreVision(spec),
    audience_definition: scoreAudience(spec),
    feature_completeness: scoreFeatures(spec),
    ux_coherence: scoreUxCoherence(spec),
    monetization_viability: scoreMonetization(spec),
    gtm_actionability: scoreGtm(spec),
    success_measurability: scoreSuccessCriteria(spec),
  };

  const totalScore = Object.values(breakdown).reduce((sum, v) => sum + v, 0);

  const readiness: 'READY' | 'NEEDS_REVIEW' | 'INCOMPLETE' =
    totalScore >= 75 ? 'READY' :
    totalScore >= 50 ? 'NEEDS_REVIEW' :
    'INCOMPLETE';

  logger.info(`[Validate] Score: ${totalScore}/100, readiness: ${readiness}`);
  logger.info(`[Validate] Breakdown:`, breakdown);

  return { totalScore, breakdown, readiness };
}
