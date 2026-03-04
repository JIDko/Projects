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

function extractShortName(idea: string): string {
  const firstSentence = idea.split(/\.\s/)[0] ?? idea;
  return firstSentence.length > 80 ? firstSentence.slice(0, 80) : firstSentence;
}

/**
 * Build research queries for product specification.
 * Categories: UX patterns, pricing, tech feasibility, growth, onboarding.
 */
export function buildResearchQueries(
  idea: string,
  market: string,
  competitors: Array<{ name: string }>,
): Array<{ q: string; gl: string; hl: string }> {
  const year = new Date().getFullYear();
  const name = extractShortName(idea);

  const queries: Array<{ q: string; gl: string; hl: string }> = [
    // UX / Product Patterns
    { q: `${name} SaaS best UX patterns ${year}`, gl: 'us', hl: 'en' },
    { q: `${name} user onboarding flow best practices`, gl: 'us', hl: 'en' },

    // Pricing & Monetization
    { q: `${name} SaaS pricing page examples ${year}`, gl: 'us', hl: 'en' },
    { q: `${name} freemium vs trial conversion rates SaaS`, gl: 'us', hl: 'en' },

    // Technical Feasibility
    { q: `build ${name} tool solo developer tech stack ${year}`, gl: 'us', hl: 'en' },
    { q: `${name} API integrations available ${year}`, gl: 'us', hl: 'en' },

    // Growth & Acquisition
    { q: `${name} SEO content strategy organic growth`, gl: 'us', hl: 'en' },
    { q: `${name} product-led growth examples SaaS`, gl: 'us', hl: 'en' },

    // Success metrics
    { q: `${name} SaaS KPIs success metrics dashboard`, gl: 'us', hl: 'en' },

    // MVP patterns
    { q: `micro SaaS ${name} MVP features users love`, gl: 'us', hl: 'en' },
  ];

  // Add competitor-specific query if we have competitors
  if (competitors.length > 0) {
    const top = competitors.slice(0, 3).map(c => c.name).join(' vs ');
    queries.push({ q: `${top} features comparison ${year}`, gl: 'us', hl: 'en' });
  }

  // Market-specific if not English
  const isEnglishMarket = /global|english|us|uk|au|ca/i.test(market);
  if (!isEnglishMarket && market) {
    queries.push({ q: `${name} SaaS ${market} ${year}`, gl: 'us', hl: 'en' });
  }

  return queries;
}

/**
 * Run all search queries in parallel.
 */
export async function runSearches(
  queries: Array<{ q: string; gl: string; hl: string }>,
): Promise<SearchResult[]> {
  const results = await Promise.allSettled(
    queries.map(entry => searchSingle(entry.q, entry.gl, entry.hl)),
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
