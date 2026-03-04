import { serpApiGet } from '../../shared/serpapi-client.js';
import { logger } from '../../shared/logger.js';

export interface SearchResult {
  query: string;
  snippets: string[];
}

async function searchSingle(query: string, gl = 'us', hl = 'en'): Promise<SearchResult> {
  logger.info(`Searching [${gl}/${hl}]: "${query}"`);

  const response = await serpApiGet({
    engine: 'google',
    q: query,
    num: 10,
    gl,
    hl,
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
 * Extract a short name from the full idea text.
 * The `idea` field often contains a long description; we only need the title
 * (everything before the first period that is followed by a space or end).
 */
function extractShortName(idea: string): string {
  const firstSentence = idea.split(/\.\s/)[0] ?? idea;
  // Cap at 80 chars to keep search queries reasonable
  return firstSentence.length > 80 ? firstSentence.slice(0, 80) : firstSentence;
}

/**
 * Build discovery queries to find competitors for the idea.
 * Priority: US/EU market first, then market-specific queries last.
 * Each query has { q, gl, hl } for SerpAPI geo-targeting.
 */
export function buildDiscoveryQueries(
  idea: string, market: string, competitorHints?: string[],
): Array<{ q: string; gl: string; hl: string }> {
  const year = new Date().getFullYear();
  const name = extractShortName(idea);

  // --- Priority 1: US/global English market (always first) ---
  const queries: Array<{ q: string; gl: string; hl: string }> = [
    { q: `best ${name} tools software ${year}`, gl: 'us', hl: 'en' },
    { q: `top ${name} competitors comparison ${year}`, gl: 'us', hl: 'en' },
    { q: `${name} alternatives ${year}`, gl: 'us', hl: 'en' },
    { q: `${name} market leaders SaaS`, gl: 'us', hl: 'en' },
    { q: `${name} vs comparison review ${year}`, gl: 'us', hl: 'en' },
  ];

  // --- Priority 2: EU market ---
  queries.push(
    { q: `${name} software Europe ${year}`, gl: 'uk', hl: 'en' },
    { q: `${name} competitors UK Europe ${year}`, gl: 'uk', hl: 'en' },
  );

  // Hints from the validation report
  if (competitorHints && competitorHints.length > 0) {
    const top = competitorHints.slice(0, 3).join(' vs ');
    queries.push({ q: `${top} comparison ${year}`, gl: 'us', hl: 'en' });
  }

  // --- Priority 3: Market-specific (if not already English-speaking) ---
  const isEnglishMarket = /global|english|us|uk|au|ca/i.test(market);
  if (!isEnglishMarket && market) {
    queries.push(
      { q: `${name} ${market} ${year}`, gl: 'us', hl: 'en' },
      { q: `лучшие ${name} сервисы ${year}`, gl: 'ru', hl: 'ru' },
    );
  }

  return queries;
}

/**
 * Build deep-dive queries for a single competitor.
 * All deep-dive queries are in English (US) since competitor names are typically global.
 */
export function buildDeepDiveQueries(
  competitorName: string, idea: string, _market: string,
): Array<{ q: string; gl: string; hl: string }> {
  const year = new Date().getFullYear();

  return [
    { q: `${competitorName} features product review ${year}`, gl: 'us', hl: 'en' },
    { q: `${competitorName} pricing plans ${year}`, gl: 'us', hl: 'en' },
    { q: `${competitorName} target audience customers`, gl: 'us', hl: 'en' },
    { q: `${competitorName} reviews complaints ${year}`, gl: 'us', hl: 'en' },
    { q: `${competitorName} marketing strategy growth`, gl: 'us', hl: 'en' },
    { q: `${competitorName} technology stack`, gl: 'us', hl: 'en' },
    { q: `${competitorName} strengths weaknesses analysis`, gl: 'us', hl: 'en' },
    { q: `${competitorName} vs ${extractShortName(idea)} alternatives comparison`, gl: 'us', hl: 'en' },
  ];
}

/**
 * Run all search queries in parallel.
 * Accepts either plain strings (defaults to US/en) or objects with { q, gl, hl }.
 */
export async function runSearches(
  queries: Array<string | { q: string; gl: string; hl: string }>,
): Promise<SearchResult[]> {
  const results = await Promise.allSettled(
    queries.map(entry => {
      if (typeof entry === 'string') return searchSingle(entry);
      return searchSingle(entry.q, entry.gl, entry.hl);
    }),
  );

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
