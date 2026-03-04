import { logger } from '../../../shared/logger.js';
import type { RawSignal } from './types.js';

const SUBREDDITS: Record<string, string[]> = {
  trades: [
    'HVAC', 'plumbing', 'Truckers', 'lawncare', 'pestcontrol',
    'Electricians', 'Roofing', 'AutoDetailing', 'pressurewashing',
  ],
  professional: [
    'veterinary', 'dentistry', 'Accounting', 'LegalAdvice',
    'physicianassistant', 'optometry', 'pharmacy',
  ],
  business: [
    'smallbusiness', 'Entrepreneur', 'SaaS', 'microsaas',
    'indiehackers', 'restaurateur', 'propertymanagement',
    'RealEstate', 'ecommerce',
  ],
  niche: [
    'funeralhome', 'marina', 'campgrounds', 'laundry',
    'selfstorage', 'trucking', 'hotelier',
  ],
};

const ALL_SUBS = Object.values(SUBREDDITS).flat();

const PAIN_TERMS = [
  'frustrated with', 'hate using', 'terrible software',
  'no good solution', 'still using spreadsheets',
  'wish there was', 'looking for alternative',
  'willing to pay for', 'would pay for',
  'need a tool that', 'anyone built',
  'manual process', 'waste of time', 'doing this by hand',
  'paper forms', 'tired of', 'bottleneck',
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

async function fetchSubredditPosts(subreddit: string, searchTerm: string): Promise<RedditPost[]> {
  const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(searchTerm)}&restrict_sr=1&sort=top&t=month&limit=5`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'NicheResearcherBot/2.0' },
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

async function fetchTopComments(permalink: string, limit: number): Promise<string[]> {
  const url = `https://www.reddit.com${permalink}.json?limit=${limit}&sort=top`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'NicheResearcherBot/2.0' },
  });

  if (!response.ok) return [];

  const json = await response.json() as Array<{ data?: { children?: Array<{ data?: { body?: string } }> } }>;
  const commentListing = json?.[1]?.data?.children ?? [];

  return commentListing
    .slice(0, limit)
    .map(c => c.data?.body ?? '')
    .filter(body => body.length > 20 && body.length < 500);
}

function pickItems<T>(arr: T[], count: number, cycleNumber: number): T[] {
  const offset = (cycleNumber * count) % arr.length;
  const picked: T[] = [];
  for (let i = 0; i < count; i++) {
    picked.push(arr[(offset + i) % arr.length]!);
  }
  return picked;
}

export async function collectRedditSignals(cycleNumber: number): Promise<RawSignal[]> {
  logger.info('--- Collecting Reddit pain signals ---');

  const subs = pickItems(ALL_SUBS, 5, cycleNumber);
  const terms = pickItems(PAIN_TERMS, 3, cycleNumber);

  logger.info(`Reddit: r/${subs.join(', r/')} × "${terms.join('", "')}"`);

  const signals: RawSignal[] = [];

  for (const sub of subs) {
    for (const term of terms) {
      try {
        const posts = await fetchSubredditPosts(sub, term);

        for (const post of posts.slice(0, 3)) {
          const selftext = post.selftext.length > 400
            ? post.selftext.slice(0, 400) + '...'
            : post.selftext;

          // Post itself = one signal
          signals.push({
            text: `"${post.title}": ${selftext}`,
            source_type: 'reddit',
            source_url: `https://reddit.com${post.permalink}`,
            metadata: {
              subreddit: post.subreddit,
              post_score: post.score,
              comment_count: post.num_comments,
              search_term: term,
            },
          });

          // Top comments = separate signals
          if (post.num_comments >= 10) {
            await sleep(1200);
            const comments = await fetchTopComments(post.permalink, 3);
            for (const comment of comments) {
              signals.push({
                text: comment,
                source_type: 'reddit',
                source_url: `https://reddit.com${post.permalink}`,
                metadata: {
                  subreddit: post.subreddit,
                  post_score: post.score,
                  is_comment: true,
                  search_term: term,
                },
              });
            }
          } else if (post.num_comments >= 5) {
            await sleep(1200);
            const comments = await fetchTopComments(post.permalink, 1);
            for (const comment of comments) {
              signals.push({
                text: comment,
                source_type: 'reddit',
                source_url: `https://reddit.com${post.permalink}`,
                metadata: {
                  subreddit: post.subreddit,
                  post_score: post.score,
                  is_comment: true,
                  search_term: term,
                },
              });
            }
          }
        }

        // Rate limit: ~1 req/sec for Reddit unauthenticated API
        await sleep(1200);
      } catch (err) {
        logger.warn(`Reddit error for r/${sub} "${term}": ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  logger.info(`Reddit: collected ${signals.length} raw signals`);
  return signals;
}
