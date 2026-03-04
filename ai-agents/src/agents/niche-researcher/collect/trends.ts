import { serpApiGet } from '../../../shared/serpapi-client.js';
import { logger } from '../../../shared/logger.js';
import type { RawSignal } from './types.js';

const TREND_SEED_KEYWORDS = [
  'SaaS', 'field service software', 'automation', 'no-code',
  'online business', 'digital product', 'compliance software',
  'micro SaaS', 'remote work tool', 'vertical SaaS',
  'workflow automation', 'creator economy',
  'small business software', 'trade business management',
  'property management software', 'scheduling software',
];

async function fetchTrendingQueries(keyword: string): Promise<RawSignal[]> {
  const response = await serpApiGet({
    engine: 'google_trends',
    q: keyword,
    data_type: 'RELATED_QUERIES',
    geo: 'US',
  });

  const signals: RawSignal[] = [];

  const relatedQueries = (response as Record<string, unknown>)['related_queries'] as {
    rising?: Array<{ query?: string; value?: number | string }>;
    top?: Array<{ query?: string; value?: number }>;
  } | undefined;

  // Rising queries — breakout/surging terms
  if (relatedQueries?.rising) {
    for (const item of relatedQueries.rising.slice(0, 8)) {
      if (item.query) {
        const growth = item.value ? ` (${item.value}% growth)` : '';
        signals.push({
          text: `[Google Trends] Rising query for "${keyword}": ${item.query}${growth}`,
          source_type: 'google_trends',
          metadata: {
            seed_keyword: keyword,
            query: item.query,
            growth_percent: item.value,
            query_type: 'rising',
          },
        });
      }
    }
  }

  // Top queries — stable popular terms
  if (relatedQueries?.top) {
    for (const item of relatedQueries.top.slice(0, 4)) {
      if (item.query) {
        signals.push({
          text: `[Google Trends] Top query for "${keyword}": ${item.query}`,
          source_type: 'google_trends',
          metadata: {
            seed_keyword: keyword,
            query: item.query,
            query_type: 'top',
          },
        });
      }
    }
  }

  return signals;
}

export async function collectTrendsSignals(cycleNumber: number): Promise<RawSignal[]> {
  logger.info('--- Collecting Google Trends signals ---');

  // Pick 3 seed keywords per cycle
  const offset = (cycleNumber * 3) % TREND_SEED_KEYWORDS.length;
  const seeds: string[] = [];
  for (let i = 0; i < 3; i++) {
    seeds.push(TREND_SEED_KEYWORDS[(offset + i) % TREND_SEED_KEYWORDS.length]!);
  }

  logger.info(`Google Trends seeds: ${seeds.join(', ')}`);

  const results = await Promise.allSettled(
    seeds.map(seed => fetchTrendingQueries(seed)),
  );

  const signals: RawSignal[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      signals.push(...result.value);
    } else {
      logger.warn(`Trends query failed: ${result.reason instanceof Error ? result.reason.message : result.reason}`);
    }
  }

  logger.info(`Google Trends: collected ${signals.length} raw signals from ${seeds.length} seeds`);
  return signals;
}
