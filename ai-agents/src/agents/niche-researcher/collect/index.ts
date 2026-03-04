import { logger } from '../../../shared/logger.js';
import { collectRedditSignals } from './reddit.js';
import { collectSearchSignals } from './search.js';
import { collectTrendsSignals } from './trends.js';
import type { RawSignal } from './types.js';

export type { RawSignal } from './types.js';

export async function collectAllSignals(cycleNumber: number): Promise<RawSignal[]> {
  logger.info('=== Step 1: COLLECT SIGNALS ===');

  const [redditSignals, searchSignals, trendsSignals] = await Promise.all([
    collectRedditSignals(cycleNumber),
    collectSearchSignals(cycleNumber),
    collectTrendsSignals(cycleNumber),
  ]);

  const all = [...redditSignals, ...searchSignals, ...trendsSignals];

  logger.info(
    `Total raw signals: ${all.length} ` +
    `(Reddit: ${redditSignals.length}, Google: ${searchSignals.length}, Trends: ${trendsSignals.length})`,
  );

  if (all.length === 0) {
    throw new Error('All data sources returned 0 signals — nothing to analyze');
  }

  return all;
}
