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

  const organicResults = response['organic_results'] as Array<{ title?: string; snippet?: string; link?: string }> | undefined;
  if (organicResults) {
    for (const result of organicResults) {
      if (result.snippet) {
        const url = result.link ? ` [${result.link}]` : '';
        snippets.push(`${result.title ?? ''}: ${result.snippet}${url}`);
      }
    }
  }

  const relatedSearches = response['related_searches'] as Array<{ query?: string }> | undefined;
  if (relatedSearches) {
    for (const related of relatedSearches) {
      if (related.query) {
        snippets.push(`Related trend: ${related.query}`);
      }
    }
  }

  logger.info(`Found ${snippets.length} snippets for "${query}"`);
  return { query, snippets };
}

export async function searchTrends(queries: string[]): Promise<SearchResult[]> {
  // Run all queries in parallel for speed
  const results = await Promise.allSettled(
    queries.map(q => searchSingle(q))
  );

  const successful: SearchResult[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      successful.push(result.value);
    } else {
      logger.error('Search query failed', result.reason instanceof Error ? result.reason.message : result.reason);
    }
  }

  logger.info(`Search complete: ${successful.length}/${queries.length} queries succeeded`);
  return successful;
}
