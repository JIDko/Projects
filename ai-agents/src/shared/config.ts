import 'dotenv/config';
import { initSerpApiKeys } from './serpapi-client.js';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// Support both SERPAPI_KEYS (comma-separated, preferred) and SERPAPI_KEY (legacy single key)
const serpApiKeys = process.env['SERPAPI_KEYS'] ?? process.env['SERPAPI_KEY'];
if (!serpApiKeys) {
  throw new Error('Missing required environment variable: SERPAPI_KEYS (or SERPAPI_KEY)');
}
initSerpApiKeys(serpApiKeys);

export const config = {
  openai: {
    apiKey: requireEnv('OPENAI_API_KEY'),
    baseUrl: process.env['OPENAI_BASE_URL'] || undefined,
    model: process.env['OPENAI_MODEL'] ?? 'gpt-4o',
  },
  supabase: {
    url: requireEnv('SUPABASE_URL'),
    serviceKey: requireEnv('SUPABASE_SERVICE_KEY'),
  },
  validator: {
    model: process.env['VALIDATOR_MODEL'] ?? 'anthropic/claude-sonnet-4-5',
  },
  competitive: {
    model: process.env['COMPETITIVE_MODEL'] ?? 'anthropic/claude-sonnet-4-5',
  },
  researcher: {
    model: process.env['RESEARCHER_MODEL'] ?? 'anthropic/claude-sonnet-4-5',
  },
  architect: {
    model: process.env['ARCHITECT_MODEL'] ?? 'anthropic/claude-sonnet-4-5',
  },
} as const;
