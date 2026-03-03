import { supabase } from '../../shared/supabase.js';
import { logger } from '../../shared/logger.js';
import type { Niche } from '../../shared/types.js';

export async function createCycle(searchQueries: string[], promptVersion: string = 'v1'): Promise<string> {
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

export async function saveNiches(niches: Niche[]): Promise<number> {
  if (niches.length === 0) {
    logger.warn('No niches to save');
    return 0;
  }

  // Insert one-by-one to handle UNIQUE constraint on niche_name gracefully.
  // A batch insert would fail entirely if even one name collides.
  let savedCount = 0;
  for (const niche of niches) {
    const { error } = await supabase
      .from('niches')
      .insert(niche);

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

export async function fetchPastRejections(): Promise<string[]> {
  const { data, error } = await supabase
    .from('rejections')
    .select('niche_name')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    // Table may not have data yet — that's fine
    logger.warn('Could not fetch rejections', error.message);
    return [];
  }

  return (data ?? []).map(r => r.niche_name as string);
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
