import { openai } from '../../shared/openai.js';
import { config } from '../../shared/config.js';
import { logger } from '../../shared/logger.js';
import { SYSTEM_PROMPT, JSON_SCHEMA_INSTRUCTION } from './prompt.js';
import { parseValidationResponse, type ValidationReport } from './parse.js';
import { buildSearchQueries, runSearches, formatSearchContext } from './search.js';

export interface ValidationInput {
  idea: string;
  market: string;
  /** Short term for SerpAPI queries (e.g. niche name). Falls back to idea if not set. */
  searchTerm?: string;
}

export interface ValidationResult {
  report: ValidationReport;
  tokensUsed: { input: number; output: number };
  searchCount: number;
  searchQueries: string[];
}

export async function runValidation(input: ValidationInput): Promise<ValidationResult> {
  const model = config.validator.model;

  logger.info(`Starting validation with model: ${model}`);
  logger.info(`Idea: "${input.idea}"`);
  logger.info(`Market: ${input.market}`);

  // Step 1: Run web searches via SerpAPI
  logger.info('--- Phase 1: Web research via SerpAPI ---');
  const term = input.searchTerm ?? input.idea;
  const queries = buildSearchQueries(term, input.market);
  const searchResults = await runSearches(queries);
  const searchContext = formatSearchContext(searchResults);
  const searchCount = searchResults.length;

  logger.info(`Collected data from ${searchCount} searches`);

  // Step 2: Send search data + prompt to LLM
  logger.info('--- Phase 2: LLM analysis ---');

  const userMessage = [
    JSON.stringify({ idea: input.idea, market: input.market }),
    '',
    '=== WEB SEARCH RESULTS ===',
    searchContext,
    '=== END SEARCH RESULTS ===',
    '',
    JSON_SCHEMA_INSTRUCTION,
  ].join('\n');

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.3,
    max_completion_tokens: 16000,
  });

  const tokensUsed = {
    input: response.usage?.prompt_tokens ?? 0,
    output: response.usage?.completion_tokens ?? 0,
  };

  logger.info(`Tokens used: ${tokensUsed.input} in / ${tokensUsed.output} out`);

  // Step 3: Parse response
  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error(`LLM returned no content. finish_reason: ${response.choices[0]?.finish_reason}`);
  }
  const report = parseValidationResponse(content);

  logger.info(`Verdict: ${report.executive_summary.verdict} (${report.executive_summary.total_score}/100)`);

  return { report, tokensUsed, searchCount, searchQueries: queries };
}
