import { logger } from '../../shared/logger.js';
import type { SearchResult } from './search.js';

const SUBREDDITS = [
  // Tech/startup communities
  'SaaS', 'Entrepreneur', 'startups', 'microsaas',
  'indiehackers', 'digitalnomad', 'smallbusiness', 'sidehustle',
  // Trade and field service communities
  'HVAC', 'plumbing', 'Truckers', 'lawncare',
  'propertymanagement', 'RealEstate', 'restaurateur',
  // Professional communities
  'veterinary', 'dentistry', 'Accounting', 'LegalAdvice',
];

const REDDIT_SEARCH_TERMS = [
  'struggling with', 'I wish there was', 'pain point',
  'anyone built', 'looking for a tool', 'frustrating',
  'no good solution', 'willing to pay for',
  'what software do you use', 'better way to manage',
  'tired of spreadsheets', 'still using paper',
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface RedditPost {
  title: string;
  selftext: string;
  score: number;
  num_comments: number;
  subreddit: string;
  permalink: string;
}

async function fetchSubredditPosts(
  subreddit: string,
  searchTerm: string,
): Promise<RedditPost[]> {
  const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(searchTerm)}&restrict_sr=1&sort=top&t=month&limit=5`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'NicheResearcherBot/1.0' },
  });

  if (!response.ok) {
    logger.warn(`Reddit fetch failed: ${response.status} for r/${subreddit} "${searchTerm}"`);
    return [];
  }

  const json = await response.json();
  const children = (json as { data?: { children?: Array<{ data: RedditPost }> } })?.data?.children ?? [];

  return children
    .map(c => c.data)
    .filter(p => p.score >= 5 && p.num_comments >= 3);
}

async function fetchTopComments(permalink: string): Promise<string[]> {
  const url = `https://www.reddit.com${permalink}.json?limit=5&sort=top`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'NicheResearcherBot/1.0' },
  });

  if (!response.ok) return [];

  const json = await response.json() as Array<{ data?: { children?: Array<{ data?: { body?: string } }> } }>;
  const commentListing = json?.[1]?.data?.children ?? [];

  return commentListing
    .slice(0, 3)
    .map(c => c.data?.body ?? '')
    .filter(body => body.length > 20 && body.length < 500);
}

export async function searchReddit(cycleNumber: number): Promise<SearchResult[]> {
  logger.info('--- Step 1b: Searching Reddit for pain points ---');

  // Pick 4 subreddits and 2 search terms per cycle for variety
  const subOffset = (cycleNumber * 4) % SUBREDDITS.length;
  const termOffset = (cycleNumber * 2) % REDDIT_SEARCH_TERMS.length;

  const subs: string[] = [];
  for (let i = 0; i < 4; i++) {
    subs.push(SUBREDDITS[(subOffset + i) % SUBREDDITS.length]!);
  }
  const terms: string[] = [];
  for (let i = 0; i < 2; i++) {
    terms.push(REDDIT_SEARCH_TERMS[(termOffset + i) % REDDIT_SEARCH_TERMS.length]!);
  }

  logger.info(`Reddit: searching r/${subs.join(', r/')} for "${terms.join('", "')}"`);

  const results: SearchResult[] = [];

  for (const sub of subs) {
    for (const term of terms) {
      try {
        const posts = await fetchSubredditPosts(sub, term);
        const snippets: string[] = [];

        for (const post of posts.slice(0, 3)) {
          const selftext = post.selftext.length > 300
            ? post.selftext.slice(0, 300) + '...'
            : post.selftext;

          snippets.push(
            `[Reddit r/${post.subreddit}] "${post.title}" (score:${post.score}, comments:${post.num_comments}): ${selftext}`
          );

          // Fetch top comments for high-engagement posts
          if (post.num_comments >= 10) {
            await sleep(1200);
            const comments = await fetchTopComments(post.permalink);
            for (const comment of comments) {
              snippets.push(`[Reddit r/${post.subreddit} comment] ${comment}`);
            }
          }
        }

        // Rate limit: ~1 req/sec for Reddit unauthenticated API
        await sleep(1200);

        if (snippets.length > 0) {
          results.push({ query: `Reddit r/${sub}: "${term}"`, snippets });
        }
      } catch (err) {
        logger.warn(`Reddit error for r/${sub} "${term}": ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  const totalSnippets = results.reduce((s, r) => s + r.snippets.length, 0);
  logger.info(`Reddit: collected ${totalSnippets} snippets from ${results.length} searches`);
  return results;
}
