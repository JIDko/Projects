import { serpApiGet } from '../../../shared/serpapi-client.js';
import { logger } from '../../../shared/logger.js';
import type { RawSignal } from './types.js';

// Pain-detection focused queries — find complaints, gaps, manual processes
const SEARCH_QUERIES = [
  // Software gaps & complaints
  'worst rated business software G2 2025',
  'most complained about CRM ERP software',
  'Capterra lowest rated software categories 2025',
  'software nobody likes but everyone uses small business',
  '"switched from" "because" site:reddit.com small business',
  // Industries stuck on manual processes
  'industries still using paper forms 2026',
  'manual processes costing small businesses money',
  'businesses that need better software 2026',
  'industries underserved by technology',
  'small business owners frustrated with tools 2026',
  // Field service & trades pain
  'field service management complaints scheduling',
  'HVAC plumbing software frustrations owner',
  'property management software problems landlord',
  'veterinary practice management complaints',
  'commercial cleaning business management software gap',
  // Niche industry opportunities
  'funeral home software options limited',
  'marina management software complaints',
  'laundry business management digital tools',
  'self storage management software problems',
  'trucking dispatch software small company',
  // Market signals
  'micro SaaS profitable niche examples 2026',
  'bootstrapped SaaS reaching $10k MRR 2026',
  'underserved small business software markets',
];

function pickQueries(count: number, cycleNumber: number): string[] {
  const offset = (cycleNumber * count) % SEARCH_QUERIES.length;
  const picked: string[] = [];
  for (let i = 0; i < count; i++) {
    picked.push(SEARCH_QUERIES[(offset + i) % SEARCH_QUERIES.length]!);
  }
  return picked;
}

async function searchSingle(query: string): Promise<RawSignal[]> {
  logger.info(`Searching Google: "${query}"`);

  const response = await serpApiGet({
    engine: 'google',
    q: query,
    num: 10,
  });

  const signals: RawSignal[] = [];

  const organicResults = response['organic_results'] as Array<{
    title?: string; snippet?: string; link?: string;
  }> | undefined;

  if (organicResults) {
    for (const result of organicResults) {
      if (result.snippet) {
        signals.push({
          text: `${result.title ?? ''}: ${result.snippet}`,
          source_type: 'google_search',
          source_url: result.link,
          metadata: { query, title: result.title ?? '' },
        });
      }
    }
  }

  const relatedSearches = response['related_searches'] as Array<{ query?: string }> | undefined;
  if (relatedSearches) {
    for (const related of relatedSearches) {
      if (related.query) {
        signals.push({
          text: `Related search: ${related.query}`,
          source_type: 'google_search',
          metadata: { query, related_query: related.query },
        });
      }
    }
  }

  return signals;
}

export async function collectSearchSignals(cycleNumber: number): Promise<RawSignal[]> {
  logger.info('--- Collecting Google Search signals ---');

  const queries = pickQueries(6, cycleNumber);
  logger.info(`Google Search queries: ${queries.join(', ')}`);

  const results = await Promise.allSettled(
    queries.map(q => searchSingle(q)),
  );

  const signals: RawSignal[] = [];
  let succeeded = 0;

  for (const result of results) {
    if (result.status === 'fulfilled') {
      signals.push(...result.value);
      succeeded++;
    } else {
      logger.error('Search query failed', result.reason instanceof Error ? result.reason.message : result.reason);
    }
  }

  if (queries.length > 0 && succeeded < queries.length * 0.5) {
    logger.warn(`High SerpAPI failure rate: ${succeeded}/${queries.length} succeeded`);
  }

  logger.info(`Google Search: collected ${signals.length} raw signals from ${succeeded}/${queries.length} queries`);
  return signals;
}
