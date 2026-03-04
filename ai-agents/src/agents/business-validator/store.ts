import { supabase } from '../../shared/supabase.js';
import { logger } from '../../shared/logger.js';
import type { ValidationReport } from './parse.js';

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
      agent_name: 'business-validator',
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

export async function fetchNiche(
  nicheId: string,
): Promise<{ niche_name: string; description: string; why_attractive: string } | null> {
  const { data, error } = await supabase
    .from('niches')
    .select('niche_name, description, why_attractive')
    .eq('id', nicheId)
    .single();

  if (error || !data) {
    logger.warn('Could not fetch niche', error?.message);
    return null;
  }

  return data as { niche_name: string; description: string; why_attractive: string };
}

export async function saveValidation(params: {
  nicheId?: string;
  idea: string;
  market: string;
  report: ValidationReport;
  searchCount: number;
  searchQueries: string[];
  tokensUsed: { input: number; output: number };
  modelUsed: string;
  cycleId: string;
}): Promise<string> {
  const { report, nicheId, idea, market, searchQueries, tokensUsed, modelUsed, cycleId } = params;

  const { data, error } = await supabase
    .from('validations')
    .insert({
      niche_id: nicheId ?? null,
      idea,
      market,
      verdict: report.executive_summary.verdict,
      total_score: report.executive_summary.total_score,
      confidence_level: report.meta.confidence_level,
      opportunity_headline: report.executive_summary.opportunity_headline,
      critical_insight: report.executive_summary.critical_insight,
      report: {
        blocks: report.blocks,
        strategic_recommendations: report.strategic_recommendations,
      },
      searches_performed: searchQueries,
      model_used: modelUsed,
      tokens_used: tokensUsed,
      cycle_id: cycleId,
      status: 'active',
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to save validation: ${error?.message ?? 'no data returned'}`);
  }

  return data.id as string;
}

export async function fetchAgentConfig(
  agentName: string,
): Promise<{ system_prompt?: string; config?: Record<string, unknown> } | null> {
  const { data, error } = await supabase
    .from('agent_configs')
    .select('system_prompt, config')
    .eq('agent_name', agentName)
    .single();

  if (error || !data) {
    logger.warn('Could not fetch agent config from DB, using defaults', error?.message);
    return null;
  }

  return data as { system_prompt?: string; config?: Record<string, unknown> };
}
