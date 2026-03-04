import { supabase } from '../../shared/supabase.js';
import { logger } from '../../shared/logger.js';
import type { ScoredNiche } from './score.js';

export async function deduplicateNiches(niches: ScoredNiche[]): Promise<ScoredNiche[]> {
  logger.info(`=== Step 6a: DEDUPLICATE (${niches.length} niches) ===`);

  // 1. Intra-batch dedup: if two niches have the same name, keep higher score
  const intraSeen = new Map<string, ScoredNiche>();
  for (const niche of niches) {
    const key = niche.niche_name.toLowerCase().trim();
    const existing = intraSeen.get(key);
    if (!existing || niche.total_score > existing.total_score) {
      intraSeen.set(key, niche);
    }
  }
  const afterIntra = Array.from(intraSeen.values());
  if (afterIntra.length < niches.length) {
    logger.info(`Intra-batch dedup: removed ${niches.length - afterIntra.length} duplicates`);
  }

  // 2. DB dedup: check against existing niches
  const { data: existing, error } = await supabase
    .from('niches')
    .select('niche_name');

  if (error) {
    logger.error('Failed to fetch existing niches for dedup', error.message);
    return afterIntra;
  }

  const existingNames = new Set(
    (existing ?? []).map(n => (n.niche_name as string).toLowerCase().trim()),
  );

  const unique = afterIntra.filter(n => !existingNames.has(n.niche_name.toLowerCase().trim()));

  const dbRemoved = afterIntra.length - unique.length;
  if (dbRemoved > 0) {
    logger.info(`DB dedup: removed ${dbRemoved} already existing niches`);
  }

  logger.info(`Deduplication total: ${niches.length} → ${unique.length}`);
  return unique;
}
