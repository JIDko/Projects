import { getJson } from 'serpapi';
import { config } from '../../shared/config.js';
import { logger } from '../../shared/logger.js';

export interface SearchResult {
  query: string;
  snippets: string[];
}

async function searchSingle(query: string): Promise<SearchResult> {
  logger.info(`Searching: "${query}"`);

  const response = await getJson({
    api_key: config.serpapi.apiKey,
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
 * Build discovery queries to find competitors for the idea.
 */
export function buildDiscoveryQueries(idea: string, market: string, competitorHints?: string[]): string[] {
  const year = new Date().getFullYear();
  const geo = market !== 'global english-speaking' ? ` ${market}` : '';

  const queries = [
    `best ${idea} tools software ${year}`,
    `top ${idea} competitors comparison ${year}`,
    `${idea} alternatives ${year}${geo}`,
    `${idea} market leaders${geo}`,
    `${idea} vs comparison review ${year}`,
  ];

  // If we have hints from the validation report, add a targeted query
  if (competitorHints && competitorHints.length > 0) {
    const top = competitorHints.slice(0, 3).join(' vs ');
    queries.push(`${top} comparison ${year}`);
  }

  return queries;
}

/**
 * Build deep-dive queries for a single competitor.
 */
export function buildDeepDiveQueries(competitorName: string, idea: string, market: string): string[] {
  const year = new Date().getFullYear();
  const geo = market !== 'global english-speaking' ? ` ${market}` : '';

  return [
    `${competitorName} features product review ${year}`,
    `${competitorName} pricing plans ${year}`,
    `${competitorName} target audience customers`,
    `${competitorName} reviews complaints ${year}`,
    `${competitorName} marketing strategy growth`,
    `${competitorName} technology stack`,
    `${competitorName} strengths weaknesses analysis`,
    `${competitorName} vs ${idea} alternatives comparison${geo}`,
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

  if (queries.length > 0 && successful.length < queries.length * 0.5) {
    logger.warn(`High failure rate: ${successful.length}/${queries.length} — results may be incomplete`);
  }

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
