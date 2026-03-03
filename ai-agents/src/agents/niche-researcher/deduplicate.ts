import { supabase } from '../../shared/supabase.js';
import { logger } from '../../shared/logger.js';
import type { NicheIdea } from './schemas.js';

export async function deduplicateNiches(niches: NicheIdea[]): Promise<NicheIdea[]> {
  const { data: existing, error } = await supabase
    .from('niches')
    .select('niche_name');

  if (error) {
    logger.error('Failed to fetch existing niches for dedup', error.message);
    // On error, proceed without dedup rather than losing all data
    return niches;
  }

  const existingNames = new Set(
    (existing ?? []).map(n => (n.niche_name as string).toLowerCase().trim())
  );

  const unique = niches.filter(n => !existingNames.has(n.niche_name.toLowerCase().trim()));

  logger.info(`Deduplication: ${niches.length} → ${unique.length} (removed ${niches.length - unique.length} duplicates)`);
  return unique;
}
