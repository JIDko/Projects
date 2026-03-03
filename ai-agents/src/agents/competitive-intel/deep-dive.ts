import { openai } from '../../shared/openai.js';
import { config } from '../../shared/config.js';
import { logger } from '../../shared/logger.js';
import { DEEP_DIVE_PROMPT, DEEP_DIVE_JSON_SCHEMA } from './prompt.js';
import { parseDeepDiveResponse, type CompetitorProfile, type DiscoveredCompetitor } from './parse.js';

export interface DeepDiveOutput {
  profile: CompetitorProfile;
  tokensUsed: { input: number; output: number };
}

export async function runDeepDive(
  competitor: DiscoveredCompetitor,
  idea: string,
  market: string,
  searchContext: string,
): Promise<DeepDiveOutput> {
  const model = config.competitive.model;
  logger.info(`[DeepDive] Analyzing: ${competitor.name}`);

  const userMessage = [
    JSON.stringify({
      competitor_name: competitor.name,
      competitor_url: competitor.url,
      competitor_description: competitor.description,
      business_idea: idea,
      market,
    }),
    '',
    '=== WEB SEARCH RESULTS ===',
    searchContext,
    '=== END SEARCH RESULTS ===',
    '',
    DEEP_DIVE_JSON_SCHEMA,
  ].join('\n');

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: DEEP_DIVE_PROMPT },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.3,
    max_completion_tokens: 6000,
  });

  const tokensUsed = {
    input: response.usage?.prompt_tokens ?? 0,
    output: response.usage?.completion_tokens ?? 0,
  };

  const finishReason = response.choices[0]?.finish_reason;
  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error(`[DeepDive] LLM returned no content for ${competitor.name}. finish_reason: ${finishReason}`);
  }
  if (finishReason === 'length') {
    logger.warn(`[DeepDive] Response was truncated for ${competitor.name} — JSON may be incomplete`);
  }

  const profile = parseDeepDiveResponse(content);
  logger.info(`[DeepDive] ${competitor.name}: ${profile.strengths.length} strengths, ${profile.weaknesses.length} weaknesses`);

  return { profile, tokensUsed };
}
