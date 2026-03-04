import { logger } from '../../shared/logger.js';
import { buildResearchQueries, runSearches, formatSearchContext } from './search.js';

export interface ResearchOutput {
  searchContext: string;
  queriesUsed: string[];
  totalSearches: number;
}

export async function runResearch(
  idea: string,
  market: string,
  competitors: Array<{ name: string }>,
): Promise<ResearchOutput> {
  logger.info('[Research] Building product research queries...');

  const queries = buildResearchQueries(idea, market, competitors);
  const queriesUsed = queries.map(q => q.q);

  logger.info(`[Research] Running ${queries.length} searches...`);
  const results = await runSearches(queries);
  const searchContext = formatSearchContext(results);

  logger.info(`[Research] Complete: ${results.length}/${queries.length} succeeded`);

  return {
    searchContext,
    queriesUsed,
    totalSearches: queries.length,
  };
}
