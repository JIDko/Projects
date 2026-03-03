import { getJson } from 'serpapi';
import { config } from '../../shared/config.js';
import { logger } from '../../shared/logger.js';
import type { SearchResult } from './search.js';

const TREND_SEED_KEYWORDS = [
  'SaaS', 'field service software', 'automation', 'no-code',
  'online business', 'digital product', 'compliance software',
  'micro SaaS', 'remote work tool', 'vertical SaaS',
  'workflow automation', 'creator economy',
  'small business software', 'trade business management',
  'property management software', 'scheduling software',
];

async function fetchTrendingQueries(keyword: string): Promise<SearchResult> {
  const response = await getJson({
    api_key: config.serpapi.apiKey,
    engine: 'google_trends',
    q: keyword,
    data_type: 'RELATED_QUERIES',
    geo: 'US',
  });

  const snippets: string[] = [];

  const relatedQueries = (response as Record<string, unknown>)['related_queries'] as {
    rising?: Array<{ query?: string; value?: number | string }>;
    top?: Array<{ query?: string; value?: number }>;
  } | undefined;

  // Rising queries — breakout/surging terms, the real gold
  if (relatedQueries?.rising) {
    for (const item of relatedQueries.rising.slice(0, 8)) {
      if (item.query) {
        const growth = item.value ? ` (${item.value}% growth)` : '';
        snippets.push(`[Google Trends] Rising query for "${keyword}": ${item.query}${growth}`);
      }
    }
  }

  // Top queries — stable popular terms, less valuable but context
  if (relatedQueries?.top) {
    for (const item of relatedQueries.top.slice(0, 4)) {
      if (item.query) {
        snippets.push(`[Google Trends] Top query for "${keyword}": ${item.query}`);
      }
    }
  }

  return { query: `Google Trends: "${keyword}"`, snippets };
}

export async function searchTrendsGoogle(cycleNumber: number): Promise<SearchResult[]> {
  logger.info('--- Step 1c: Fetching Google Trends rising queries ---');

  // Pick 3 seed keywords per cycle
  const offset = (cycleNumber * 3) % TREND_SEED_KEYWORDS.length;
  const seeds: string[] = [];
  for (let i = 0; i < 3; i++) {
    seeds.push(TREND_SEED_KEYWORDS[(offset + i) % TREND_SEED_KEYWORDS.length]!);
  }

  logger.info(`Google Trends seeds: ${seeds.join(', ')}`);

  const results = await Promise.allSettled(
    seeds.map(seed => fetchTrendingQueries(seed))
  );

  const successful: SearchResult[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.snippets.length > 0) {
      successful.push(result.value);
    } else if (result.status === 'rejected') {
      logger.warn(`Trends query failed: ${result.reason instanceof Error ? result.reason.message : result.reason}`);
    }
  }

  const totalSnippets = successful.reduce((s, r) => s + r.snippets.length, 0);
  logger.info(`Google Trends: collected ${totalSnippets} snippets from ${successful.length} seeds`);
  return successful;
}
