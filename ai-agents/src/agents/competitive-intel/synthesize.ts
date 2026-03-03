import { openai } from '../../shared/openai.js';
import { config } from '../../shared/config.js';
import { logger } from '../../shared/logger.js';
import { SYNTHESIS_PROMPT, SYNTHESIS_JSON_SCHEMA } from './prompt.js';
import { parseSynthesisResponse, type SynthesisResult, type CompetitorProfile } from './parse.js';

export interface SynthesisInput {
  idea: string;
  market: string;
  validationVerdict: string;
  validationScore: number;
  competitors: CompetitorProfile[];
}

export interface SynthesisOutput {
  result: SynthesisResult;
  tokensUsed: { input: number; output: number };
}

export async function runSynthesis(input: SynthesisInput): Promise<SynthesisOutput> {
  const model = config.competitive.model;
  logger.info(`[Synthesis] Creating strategic playbook from ${input.competitors.length} competitor profiles`);

  const competitorsSummary = input.competitors.map(c => ({
    name: c.name,
    url: c.url,
    positioning: c.positioning,
    pricing: c.pricing,
    core_features: c.product.core_features,
    unique_selling_points: c.product.unique_selling_points,
    strengths: c.strengths,
    weaknesses: c.weaknesses,
    customer_sentiment: c.customer_sentiment,
    marketing_channels: c.marketing.channels,
  }));

  const userMessage = [
    JSON.stringify({
      idea: input.idea,
      market: input.market,
      validation_verdict: input.validationVerdict,
      validation_score: input.validationScore,
    }),
    '',
    '=== COMPETITOR PROFILES ===',
    JSON.stringify(competitorsSummary, null, 2),
    '=== END COMPETITOR PROFILES ===',
    '',
    SYNTHESIS_JSON_SCHEMA,
  ].join('\n');

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYNTHESIS_PROMPT },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.4,
    max_completion_tokens: 8000,
  });

  const tokensUsed = {
    input: response.usage?.prompt_tokens ?? 0,
    output: response.usage?.completion_tokens ?? 0,
  };

  const finishReason = response.choices[0]?.finish_reason;
  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error(`[Synthesis] LLM returned no content. finish_reason: ${finishReason}`);
  }
  if (finishReason === 'length') {
    logger.warn('[Synthesis] Response was truncated — JSON may be incomplete');
  }

  const result = parseSynthesisResponse(content);
  logger.info(`[Synthesis] Playbook ready: ${result.attack_vectors.length} attack vectors, ${result.feature_priority_matrix.length} features`);

  return { result, tokensUsed };
}
