import { supabase } from '../../shared/supabase.js';
import { logger } from '../../shared/logger.js';

export interface ValidatedPain {
  id: string;
  pain_name: string;
  description: string;
  mention_count: number;
  avg_urgency: number;
  total_score: number;
  industries: string[];
  suggested_solutions: string[];
}

export async function fetchValidatedPains(
  threshold: number = 5,
  limit: number = 20,
): Promise<ValidatedPain[]> {
  const { data, error } = await supabase
    .from('pain_points')
    .select('id, pain_name, description, mention_count, avg_urgency, total_score, industries, suggested_solutions')
    .eq('status', 'active')
    .gte('mention_count', threshold)
    .order('total_score', { ascending: false })
    .limit(limit);

  if (error) {
    logger.warn('Could not fetch validated pains', error.message);
    return [];
  }

  logger.info(`Found ${(data ?? []).length} validated pains (threshold: ${threshold}+ mentions)`);
  return (data ?? []) as ValidatedPain[];
}

export function buildPainSignalsContext(pains: ValidatedPain[]): string {
  if (pains.length === 0) return '';

  const painList = pains
    .map((p, i) =>
      `${i + 1}. "${p.pain_name}" (${p.mention_count} упоминаний, score: ${p.total_score}, urgency: ${p.avg_urgency}/10)
   ${p.description}
   Industries: ${p.industries.join(', ')}
   Existing solution ideas: ${p.suggested_solutions.slice(0, 3).join('; ')}`)
    .join('\n\n');

  return `
## VALIDATED MARKET PAINS (from Pain Hunter agent)
These are REAL consumer pains confirmed across multiple Reddit/forum sources over multiple research cycles.
Each has been mentioned by real users many times. These are HIGH-PRIORITY market signals.

For each validated pain, try to generate at least 1 niche idea that DIRECTLY solves it.
These pain-inspired niches should be among your best ideas since they address proven demand.

${painList}`;
}
