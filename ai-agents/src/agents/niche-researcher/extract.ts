import { openai } from '../../shared/openai.js';
import { config } from '../../shared/config.js';
import { logger } from '../../shared/logger.js';
import type { RawSignal } from './collect/types.js';
import { extractJson, ExtractBatchResponseSchema, type NormalizedSignal } from './schemas.js';

const EXTRACT_SYSTEM_PROMPT = `You are a signal extraction engine. Your ONLY job is to extract structured pain signals from raw text snippets.

For each snippet, determine:
1. Is there a PAIN SIGNAL here? (someone complaining, wishing for a solution, describing a manual process, expressing frustration)
   - If NO clear pain signal → skip it (do not include in output)
   - If YES → extract the structured data below

2. Extract:
   - pain_description: What specific problem is described? Be concrete and specific.
     ✅ "Компании по борьбе с вредителями тратят 3+ часа в неделю на планирование через SMS и звонки"
     ❌ "Pest control нуждается в лучших инструментах" (too vague)

   - who_has_pain: Who exactly has this problem? Include business size/type.
     ✅ "Независимые операторы pest control с 3-10 техниками"
     ❌ "Малый бизнес" (too broad)

   - pain_intensity: 1-5 scale based on language:
     5 = "теряем клиентов", "стоит тысячи", "собираюсь уволиться"
     4 = "крайне разочарован", "тратим часы каждый день"
     3 = "раздражает", "хотелось бы чтобы было", "ищу"
     2 = "было бы неплохо", "мелкое неудобство"
     1 = "просто интересуюсь", расплывчатое недовольство

   - willingness_to_pay: 'explicit' if they mention paying/prices, 'implied' if pain is severe enough (intensity 4-5), 'unknown' otherwise

   - industry_vertical: Specific industry. If unknown — write "unknown".

   - existing_solutions: Any tools/software mentioned by name. Extract verbatim. Empty array if none mentioned.

CRITICAL RULES:
- Do NOT invent or embellish. If text says "scheduling is annoying" — that's intensity 3, not 5.
- If no industry is mentioned — mark as "unknown", don't guess.
- Skip signals that are: generic advice, self-promotion, spam, or too vague.
- ALL text output MUST be in Russian except brand names and tech terms.

Respond with JSON:
{
  "signals": [
    {
      "source_index": 0,
      "pain_description": "...",
      "who_has_pain": "...",
      "pain_intensity": 3,
      "willingness_to_pay": "implied",
      "industry_vertical": "...",
      "existing_solutions": ["Tool1", "Tool2"]
    }
  ]
}`;

const BATCH_SIZE = 12;
const MAX_CONCURRENCY = 5;

async function extractBatch(
  rawSignals: RawSignal[],
  startIndex: number,
): Promise<NormalizedSignal[]> {
  const snippets = rawSignals.map((s, i) => {
    const idx = startIndex + i;
    const source = s.source_type === 'reddit'
      ? `[Reddit r/${(s.metadata as Record<string, unknown>).subreddit ?? 'unknown'}]`
      : s.source_type === 'google_trends'
        ? '[Google Trends]'
        : '[Google Search]';
    return `[${idx}] ${source} ${s.text}`;
  }).join('\n\n');

  const userMessage = `Extract pain signals from these ${rawSignals.length} snippets:\n\n${snippets}`;

  const response = await openai.chat.completions.create({
    model: config.researcher.model,
    messages: [
      { role: 'system', content: EXTRACT_SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.3,
    max_completion_tokens: 8000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    logger.warn(`Extract batch starting at ${startIndex}: empty response`);
    return [];
  }

  if (response.choices[0]?.finish_reason === 'length') {
    logger.warn(`Extract batch starting at ${startIndex}: response truncated`);
  }

  try {
    const raw = extractJson(content);
    const parsed = ExtractBatchResponseSchema.parse(raw);

    // Enrich with source metadata
    // LLM may return global indices (startIndex-based) or local (0-based) — handle both
    return parsed.signals
      .map(signal => {
        let localIdx: number;
        if (signal.source_index >= startIndex && signal.source_index < startIndex + rawSignals.length) {
          // Global index → convert to local
          localIdx = signal.source_index - startIndex;
        } else if (signal.source_index >= 0 && signal.source_index < rawSignals.length) {
          // Already local index
          localIdx = signal.source_index;
        } else {
          logger.warn(`Extract: signal source_index ${signal.source_index} out of range [${startIndex}..${startIndex + rawSignals.length - 1}] — skipping`);
          return null;
        }

        const rawSignal = rawSignals[localIdx]!;
        return {
          ...signal,
          source_index: startIndex + localIdx, // always store as global
          source_type: rawSignal.source_type,
          source_url: rawSignal.source_url,
          raw_text: rawSignal.text,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);
  } catch (err) {
    logger.error(`Extract batch parse error at ${startIndex}`, err instanceof Error ? err.message : String(err));
    return [];
  }
}

export async function extractSignals(rawSignals: RawSignal[]): Promise<NormalizedSignal[]> {
  logger.info(`=== Step 2: EXTRACT & NORMALIZE (${rawSignals.length} raw signals) ===`);

  // Split into batches
  const batches: Array<{ signals: RawSignal[]; startIndex: number }> = [];
  for (let i = 0; i < rawSignals.length; i += BATCH_SIZE) {
    batches.push({
      signals: rawSignals.slice(i, i + BATCH_SIZE),
      startIndex: i,
    });
  }

  logger.info(`Processing ${batches.length} batches (${BATCH_SIZE} snippets each, ${MAX_CONCURRENCY} concurrent)`);

  // Process with concurrency limit
  const allSignals: NormalizedSignal[] = [];

  for (let i = 0; i < batches.length; i += MAX_CONCURRENCY) {
    const chunk = batches.slice(i, i + MAX_CONCURRENCY);
    const results = await Promise.allSettled(
      chunk.map(b => extractBatch(b.signals, b.startIndex)),
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        allSignals.push(...result.value);
      } else {
        logger.error('Extract batch failed', result.reason instanceof Error ? result.reason.message : String(result.reason));
      }
    }

    logger.info(`Extracted ${allSignals.length} signals so far (${Math.min(i + MAX_CONCURRENCY, batches.length)}/${batches.length} batches)`);
  }

  logger.info(`Extraction complete: ${rawSignals.length} raw → ${allSignals.length} normalized signals`);
  return allSignals;
}
