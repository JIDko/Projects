import { supabase } from '../../shared/supabase.js';
import { logger } from '../../shared/logger.js';
import type { ProductSpec } from './parse.js';

/* ─── Cycle Management ─── */

export async function createCycle(searchQueries: string[], promptVersion: string = 'v1'): Promise<string> {
  const preCycleId = process.env.CYCLE_ID;
  if (preCycleId) {
    await supabase.from('cycles').update({
      search_queries_used: searchQueries,
      prompt_version: promptVersion,
    }).eq('id', preCycleId);
    return preCycleId;
  }

  const { data, error } = await supabase
    .from('cycles')
    .insert({
      agent_name: 'product-architect',
      started_at: new Date().toISOString(),
      status: 'running',
      niches_generated: 0,
      niches_after_dedup: 0,
      niches_after_filter: 0,
      niches_saved: 0,
      search_queries_used: searchQueries,
      prompt_version: promptVersion,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create cycle: ${error?.message ?? 'no data returned'}`);
  }
  return data.id as string;
}

export async function updateCycle(
  cycleId: string,
  updates: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from('cycles')
    .update(updates)
    .eq('id', cycleId);

  if (error) {
    logger.error('Failed to update cycle', error.message);
  }
}

/* ─── Chain Fetching ─── */

export interface ChainData {
  analysis: {
    id: string;
    idea: string;
    market: string;
    validation_id: string;
    competitors: Array<{ name: string; [key: string]: unknown }>;
    synthesis: Record<string, unknown>;
  };
  validation: {
    id: string;
    niche_id: string | null;
    verdict: string;
    total_score: number;
    confidence_level: string;
    report: Record<string, unknown>;
  };
  niche: {
    id: string;
    niche_name: string;
    description: string;
    why_attractive: string;
    total_score: number;
    competition_level: string;
    market_size: number;
    market_growth: number;
    risk_flags: string[];
    evidence_summary: string;
  } | null;
}

export async function fetchChain(competitiveAnalysisId: string): Promise<ChainData> {
  // 1. Fetch competitive_analysis
  const { data: ca, error: caErr } = await supabase
    .from('competitive_analyses')
    .select('id, idea, market, validation_id, competitors, synthesis')
    .eq('id', competitiveAnalysisId)
    .single();

  if (caErr || !ca) {
    throw new Error(`Competitive analysis ${competitiveAnalysisId} not found: ${caErr?.message}`);
  }

  // 2. Fetch validation
  const { data: val, error: valErr } = await supabase
    .from('validations')
    .select('id, niche_id, verdict, total_score, confidence_level, report')
    .eq('id', ca.validation_id)
    .single();

  if (valErr || !val) {
    throw new Error(`Validation ${ca.validation_id} not found: ${valErr?.message}`);
  }

  // 3. Fetch niche (optional)
  let niche: ChainData['niche'] = null;
  if (val.niche_id) {
    const { data: n } = await supabase
      .from('niches')
      .select('id, niche_name, description, why_attractive, total_score, competition_level, market_size, market_growth, risk_flags, evidence_summary')
      .eq('id', val.niche_id)
      .single();

    if (n) {
      niche = n as ChainData['niche'];
    }
  }

  return {
    analysis: {
      id: ca.id,
      idea: ca.idea,
      market: ca.market,
      validation_id: ca.validation_id,
      competitors: ca.competitors as ChainData['analysis']['competitors'],
      synthesis: ca.synthesis as Record<string, unknown>,
    },
    validation: {
      id: val.id,
      niche_id: val.niche_id,
      verdict: val.verdict,
      total_score: val.total_score,
      confidence_level: val.confidence_level,
      report: val.report as Record<string, unknown>,
    },
    niche,
  };
}

/* ─── Save Product Spec ─── */

export async function saveProductSpec(params: {
  competitiveAnalysisId: string;
  idea: string;
  market: string;
  spec: ProductSpec;
  totalScore: number;
  scoreBreakdown: Record<string, number>;
  readiness: string;
  totalSearches: number;
  searchQueries: string[];
  tokensUsed: { input: number; output: number };
  modelUsed: string;
  cycleId: string;
}): Promise<string> {
  const { data, error } = await supabase
    .from('product_specs')
    .insert({
      competitive_analysis_id: params.competitiveAnalysisId,
      idea: params.idea,
      market: params.market,
      vision: params.spec.vision,
      audience: params.spec.audience,
      features: params.spec.features,
      user_flows: params.spec.user_flows,
      information_architecture: params.spec.information_architecture,
      monetization: params.spec.monetization,
      gtm: params.spec.gtm,
      success_criteria: params.spec.success_criteria,
      total_score: params.totalScore,
      score_breakdown: params.scoreBreakdown,
      readiness: params.readiness,
      total_searches: params.totalSearches,
      searches_performed: params.searchQueries,
      tokens_used: params.tokensUsed,
      model_used: params.modelUsed,
      cycle_id: params.cycleId,
      status: 'active',
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to save product spec: ${error?.message ?? 'no data returned'}`);
  }

  return data.id as string;
}
