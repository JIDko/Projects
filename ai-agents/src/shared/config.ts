import 'dotenv/config';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

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
  serpapi: {
    apiKey: requireEnv('SERPAPI_KEY'),
  },
  validator: {
    model: process.env['VALIDATOR_MODEL'] ?? 'anthropic/claude-sonnet-4-5',
  },
  competitive: {
    model: process.env['COMPETITIVE_MODEL'] ?? 'anthropic/claude-sonnet-4-5',
  },
} as const;
