import { openai } from '../../shared/openai.js';
import { config } from '../../shared/config.js';
import { logger } from '../../shared/logger.js';
import { PRODUCT_SPEC_PROMPT, PRODUCT_SPEC_JSON_SCHEMA } from './prompt.js';
import { parseProductSpecResponse, type ProductSpec } from './parse.js';

export interface SpecifyOutput {
  result: ProductSpec;
  tokensUsed: { input: number; output: number };
}

export async function runSpecification(
  contextSummary: string,
  searchContext: string,
): Promise<SpecifyOutput> {
  const model = config.architect.model;
  logger.info(`[Specify] Generating product spec with model: ${model}`);

  const userMessage = [
    contextSummary,
    '',
    '=== PRODUCT RESEARCH RESULTS ===',
    searchContext,
    '=== END RESEARCH RESULTS ===',
    '',
    PRODUCT_SPEC_JSON_SCHEMA,
  ].join('\n');

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: PRODUCT_SPEC_PROMPT },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.4,
    max_completion_tokens: 16000,
  });

  const tokensUsed = {
    input: response.usage?.prompt_tokens ?? 0,
    output: response.usage?.completion_tokens ?? 0,
  };

  const finishReason = response.choices[0]?.finish_reason;
  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error(`[Specify] LLM returned no content. finish_reason: ${finishReason}`);
  }
  if (finishReason === 'length') {
    logger.warn('[Specify] Response was truncated — JSON may be incomplete');
  }

  const result = parseProductSpecResponse(content);

  logger.info(`[Specify] Spec generated: ${result.features.mvp_features.length} MVP features, ${result.monetization.pricing_tiers.length} pricing tiers`);

  return { result, tokensUsed };
}
