import { supabase } from '../../shared/supabase.js';
import { logger } from '../../shared/logger.js';
import type { Niche } from '../../shared/types.js';
import type { RawSignal } from './collect/types.js';
import type { NormalizedSignal, PainCluster } from './schemas.js';
import type { ScoredNiche } from './score.js';

// ─── Cycle management (unchanged) ───

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
      agent_name: 'niche-researcher',
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

export async function getCycleNumber(): Promise<number> {
  const { count, error } = await supabase
    .from('cycles')
    .select('*', { count: 'exact', head: true })
    .eq('agent_name', 'niche-researcher');

  if (error) {
    logger.warn('Could not get cycle count', error.message);
    return 0;
  }

  return (count ?? 0) + 1;
}

export async function fetchAgentConfig(agentName: string): Promise<{ system_prompt?: string; config?: Record<string, unknown> } | null> {
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

// ─── v2: Save signals ───

export async function saveSignals(
  signals: NormalizedSignal[],
  rawSignals: RawSignal[],
  cycleId: string,
): Promise<string[]> {
  if (signals.length === 0) return [];

  const ids: string[] = [];

  for (const signal of signals) {
    const rawSignal = rawSignals[signal.source_index];
    const { data, error } = await supabase
      .from('signals')
      .insert({
        cycle_id: cycleId,
        pain_description: signal.pain_description,
        who_has_pain: signal.who_has_pain,
        pain_intensity: signal.pain_intensity,
        willingness_to_pay: signal.willingness_to_pay,
        industry_vertical: signal.industry_vertical,
        existing_solutions: signal.existing_solutions,
        source_type: signal.source_type,
        source_url: signal.source_url ?? rawSignal?.source_url,
        source_metadata: rawSignal?.metadata ?? {},
        raw_text: signal.raw_text || rawSignal?.text,
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Failed to save signal', error.message);
    } else if (data) {
      ids.push(data.id as string);
    }
  }

  logger.info(`Saved ${ids.length}/${signals.length} signals to Supabase`);
  return ids;
}

// ─── v2: Save clusters ───

export async function saveClusters(
  clusters: PainCluster[],
  cycleId: string,
): Promise<Map<number, string>> {
  const indexToId = new Map<number, string>();

  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i]!;
    const { data, error } = await supabase
      .from('pain_clusters')
      .insert({
        cycle_id: cycleId,
        cluster_name: cluster.cluster_name,
        pain_summary: cluster.pain_summary,
        signal_count: cluster.signal_count,
        unique_source_count: cluster.unique_source_count,
        avg_pain_intensity: cluster.avg_pain_intensity,
        has_willingness_to_pay: cluster.has_willingness_to_pay,
        industry_vertical: cluster.industry_vertical,
        existing_solutions: cluster.existing_solutions,
      })
      .select('id')
      .single();

    if (error) {
      logger.error(`Failed to save cluster "${cluster.cluster_name}"`, error.message);
    } else if (data) {
      indexToId.set(i, data.id as string);
    }
  }

  logger.info(`Saved ${indexToId.size}/${clusters.length} clusters to Supabase`);
  return indexToId;
}

// ─── v2: Save niches with evidence fields ───

export async function saveNichesV2(
  niches: ScoredNiche[],
  cycleId: string,
  clusterIdMap: Map<number, string>,
  clusters: PainCluster[],
): Promise<number> {
  if (niches.length === 0) {
    logger.warn('No niches to save');
    return 0;
  }

  let savedCount = 0;

  for (const niche of niches) {
    const clusterId = clusterIdMap.get(niche.cluster_index);
    const cluster = clusters[niche.cluster_index];

    const row: Niche = {
      niche_name: niche.niche_name,
      description: niche.description,
      why_attractive: niche.why_attractive,
      margin_potential: niche.margin_potential,
      startup_capital: niche.startup_capital,
      time_to_revenue: niche.time_to_revenue,
      market_size: niche.market_size,
      market_growth: niche.market_growth,
      ai_automation_score: niche.ai_automation_score,
      competition_level: niche.competition_level,
      organic_traffic_potential: niche.organic_traffic_potential,
      confidence_level: niche.confidence_level,
      risk_flags: niche.risk_flags,
      sources: niche.sources,
      total_score: niche.total_score,
      cycle_id: cycleId,
      status: 'active',
      // v2 evidence fields from cluster
      evidence_summary: niche.evidence_summary,
      signal_count: cluster?.signal_count,
      unique_source_count: cluster?.unique_source_count,
      avg_pain_intensity: cluster?.avg_pain_intensity,
      existing_competitors: niche.existing_competitors,
      cluster_id: clusterId,
      sample_signals: niche.sample_signals,
    };

    const { error } = await supabase
      .from('niches')
      .insert(row);

    if (error) {
      if (error.code === '23505') {
        logger.warn(`Skipping duplicate niche: "${niche.niche_name}"`);
      } else {
        logger.error(`Failed to save niche "${niche.niche_name}"`, error.message);
      }
    } else {
      savedCount++;
    }
  }

  logger.info(`Saved ${savedCount}/${niches.length} niches to Supabase`);
  return savedCount;
}
