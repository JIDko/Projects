import { openai } from '../../shared/openai.js';
import { config } from '../../shared/config.js';
import { logger } from '../../shared/logger.js';
import { DISCOVERY_PROMPT, DISCOVERY_JSON_SCHEMA } from './prompt.js';
import { parseDiscoveryResponse, type DiscoveryResult } from './parse.js';

export interface DiscoveryInput {
  idea: string;
  market: string;
  competitiveLandscapeBlock?: {
    analysis: string;
    key_findings: string[];
    sources: string[];
  };
  searchContext: string;
}

export interface DiscoveryOutput {
  result: DiscoveryResult;
  tokensUsed: { input: number; output: number };
}

export async function runDiscovery(input: DiscoveryInput): Promise<DiscoveryOutput> {
  const model = config.competitive.model;
  logger.info(`[Discovery] Starting with model: ${model}`);

  const validationContext = input.competitiveLandscapeBlock
    ? [
        '=== VALIDATION COMPETITIVE LANDSCAPE BLOCK ===',
        `Analysis: ${input.competitiveLandscapeBlock.analysis}`,
        `Key Findings: ${input.competitiveLandscapeBlock.key_findings.join('; ')}`,
        `Sources: ${input.competitiveLandscapeBlock.sources.join('; ')}`,
        '=== END VALIDATION BLOCK ===',
      ].join('\n')
    : '';

  const userMessage = [
    JSON.stringify({ idea: input.idea, market: input.market }),
    '',
    validationContext,
    '',
    '=== WEB SEARCH RESULTS ===',
    input.searchContext,
    '=== END SEARCH RESULTS ===',
    '',
    DISCOVERY_JSON_SCHEMA,
  ].join('\n');

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: DISCOVERY_PROMPT },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.3,
    max_completion_tokens: 4000,
  });

  const tokensUsed = {
    input: response.usage?.prompt_tokens ?? 0,
    output: response.usage?.completion_tokens ?? 0,
  };

  const finishReason = response.choices[0]?.finish_reason;
  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error(`[Discovery] LLM returned no content. finish_reason: ${finishReason}`);
  }

  const result = parseDiscoveryResponse(content);
  logger.info(`[Discovery] Found ${result.competitors.length} competitors: ${result.competitors.map(c => c.name).join(', ')}`);

  return { result, tokensUsed };
}
