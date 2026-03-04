import { supabase } from '../../shared/supabase.js';
import { logger } from '../../shared/logger.js';
import type { CompetitorProfile, SynthesisResult } from './parse.js';

export async function createCycle(searchQueries: string[], promptVersion: string = 'v1'): Promise<string> {
  // If the web UI pre-created a cycle, reuse it
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
      agent_name: 'competitive-intel',
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

export async function fetchValidation(
  validationId: string,
): Promise<{
  id: string;
  idea: string;
  market: string;
  verdict: string;
  total_score: number;
  report: {
    blocks: Array<{
      name: string;
      score: number;
      max_score: number;
      status: string;
      analysis: string;
      key_findings: string[];
      sources: string[];
      data_gaps: string[];
    }>;
    strategic_recommendations?: Record<string, unknown>;
  };
} | null> {
  const { data, error } = await supabase
    .from('validations')
    .select('id, idea, market, verdict, total_score, report')
    .eq('id', validationId)
    .single();

  if (error || !data) {
    logger.warn('Could not fetch validation', error?.message);
    return null;
  }

  // Runtime shape check — report is JSONB, could be anything
  const record = data as Record<string, unknown>;
  const report = record.report as Record<string, unknown> | undefined;
  if (!report || !Array.isArray(report.blocks)) {
    logger.warn('Validation report has unexpected shape — missing blocks array');
    return null;
  }

  return {
    id: record.id as string,
    idea: record.idea as string,
    market: record.market as string,
    verdict: record.verdict as string,
    total_score: record.total_score as number,
    report: report as {
      blocks: Array<{
        name: string; score: number; max_score: number; status: string;
        analysis: string; key_findings: string[]; sources: string[]; data_gaps: string[];
      }>;
      strategic_recommendations?: Record<string, unknown>;
    },
  };
}

export async function saveCompetitiveAnalysis(params: {
  validationId: string;
  idea: string;
  market: string;
  competitors: CompetitorProfile[];
  synthesis: SynthesisResult;
  totalSearches: number;
  searchQueries: string[];
  tokensUsed: { input: number; output: number };
  modelUsed: string;
  cycleId: string;
}): Promise<string> {
  const { data, error } = await supabase
    .from('competitive_analyses')
    .insert({
      validation_id: params.validationId,
      idea: params.idea,
      market: params.market,
      competitors: params.competitors,
      synthesis: params.synthesis,
      total_searches: params.totalSearches,
      model_used: params.modelUsed,
      tokens_used: params.tokensUsed,
      searches_performed: params.searchQueries,
      cycle_id: params.cycleId,
      status: 'active',
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to save competitive analysis: ${error?.message ?? 'no data returned'}`);
  }

  return data.id as string;
}
