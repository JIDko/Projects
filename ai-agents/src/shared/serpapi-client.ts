import { getJson } from 'serpapi';
import { logger } from './logger.js';

/**
 * SerpAPI client with automatic key rotation.
 *
 * Loads keys from SERPAPI_KEYS (comma-separated) or falls back to SERPAPI_KEY.
 * When a key fails (quota/auth errors), automatically tries the next one.
 */

let keys: string[] = [];
let currentKeyIndex = 0;
const failedKeys = new Set<number>();

export function initSerpApiKeys(keyString: string): void {
  keys = keyString.split(',').map(k => k.trim()).filter(Boolean);
  if (keys.length === 0) {
    throw new Error('No SerpAPI keys provided');
  }
  logger.info(`SerpAPI: loaded ${keys.length} API key(s)`);
}

function isKeyError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('invalid api') ||
    lower.includes('limit') ||
    lower.includes('quota') ||
    lower.includes('forbidden') ||
    lower.includes('unauthorized') ||
    lower.includes('403') ||
    lower.includes('429') ||
    lower.includes('your account') ||
    lower.includes('plan') ||
    lower.includes('exceeded') ||
    lower.includes('expired')
  );
}

/**
 * Drop-in replacement for serpapi's getJson.
 * Pass all params EXCEPT api_key — key is injected automatically with fallback.
 */
export async function serpApiGet(
  params: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (keys.length === 0) {
    throw new Error('SerpAPI keys not initialized — call initSerpApiKeys() first');
  }

  // If all keys have failed, reset and try again (quota may have refreshed)
  if (failedKeys.size >= keys.length) {
    logger.info('SerpAPI: all keys previously failed, resetting for retry');
    failedKeys.clear();
  }

  const startIdx = currentKeyIndex;

  for (let attempt = 0; attempt < keys.length; attempt++) {
    const keyIdx = (startIdx + attempt) % keys.length;

    // Skip known-failed keys (unless it's our last option)
    if (failedKeys.has(keyIdx) && attempt < keys.length - 1) {
      continue;
    }

    try {
      const result = await getJson({
        ...params,
        api_key: keys[keyIdx],
      });

      // Success — stick with this key
      currentKeyIndex = keyIdx;
      return result as Record<string, unknown>;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);

      if (isKeyError(msg)) {
        logger.warn(`SerpAPI key #${keyIdx + 1}/${keys.length} failed: ${msg}`);
        failedKeys.add(keyIdx);
        currentKeyIndex = (keyIdx + 1) % keys.length;
        continue;
      }

      // Non-key error (network, rate limit per-request, etc.) — don't rotate
      throw err;
    }
  }

  throw new Error(
    `All ${keys.length} SerpAPI key(s) exhausted. Add new keys to SERPAPI_KEYS env variable.`,
  );
}
