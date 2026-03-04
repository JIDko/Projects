import { serpApiGet } from '../../shared/serpapi-client.js';
import { logger } from '../../shared/logger.js';

export interface SearchResult {
  query: string;
  snippets: string[];
}

async function searchSingle(query: string): Promise<SearchResult> {
  logger.info(`Searching: "${query}"`);

  const response = await serpApiGet({
    engine: 'google',
    q: query,
    num: 10,
  });

  const snippets: string[] = [];

  const organicResults = response['organic_results'] as Array<{
    title?: string;
    snippet?: string;
    link?: string;
  }> | undefined;

  if (organicResults) {
    for (const result of organicResults) {
      if (result.snippet) {
        const url = result.link ? ` [${result.link}]` : '';
        snippets.push(`${result.title ?? ''}: ${result.snippet}${url}`);
      }
    }
  }

  return { query, snippets };
}

/**
 * Build search queries for all 7 validation blocks based on idea and market.
 */
export function buildSearchQueries(idea: string, market: string): string[] {
  const year = new Date().getFullYear();
  const prev = year - 1;
  const geo = market !== 'global english-speaking' ? ` ${market}` : '';

  return [
    // Block 1: Market Demand
    `${idea} market size ${prev} ${year}${geo}`,
    `${idea} growth forecast CAGR${geo}`,
    // Block 2: Competition
    `best ${idea} tools software ${year}`,
    `${idea} startups funding ${prev} ${year}`,
    // Block 3: Monetization
    `${idea} SaaS pricing ${year}`,
    `${idea} revenue model profit margin`,
    // Block 4: AI Automation
    `AI ${idea} automation tools ${year}`,
    `${idea} automated artificial intelligence`,
    // Block 5: Organic Traffic
    `${idea} SEO keyword volume${geo}`,
    `${idea} content marketing success`,
    // Block 6: Unit Economics
    `${idea} startup cost launch budget`,
    `${idea} solo founder bootstrapped`,
    // Block 7: Risk
    `${idea} market risks challenges ${year}${geo}`,
    `${idea} regulation compliance${geo}`,
  ];
}

/**
 * Run all search queries in parallel.
 */
export async function runSearches(queries: string[]): Promise<SearchResult[]> {
  const results = await Promise.allSettled(queries.map(q => searchSingle(q)));

  const successful: SearchResult[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      successful.push(result.value);
    } else {
      logger.error(
        'Search query failed',
        result.reason instanceof Error ? result.reason.message : result.reason,
      );
    }
  }

  logger.info(`Search complete: ${successful.length}/${queries.length} queries succeeded`);
  return successful;
}

/**
 * Format search results into a text block for the LLM prompt.
 */
export function formatSearchContext(results: SearchResult[]): string {
  const parts: string[] = [];
  for (const r of results) {
    if (r.snippets.length === 0) continue;
    parts.push(`### Query: "${r.query}"\n${r.snippets.join('\n')}`);
  }
  return parts.join('\n\n');
}
