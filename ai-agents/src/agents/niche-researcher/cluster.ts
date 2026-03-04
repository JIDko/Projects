import { openai } from '../../shared/openai.js';
import { config } from '../../shared/config.js';
import { logger } from '../../shared/logger.js';
import { extractJson, ClusterResponseSchema, type NormalizedSignal, type PainCluster } from './schemas.js';

const CLUSTER_SYSTEM_PROMPT = `You are a pattern recognition engine. You receive normalized pain signals and must group them into PAIN CLUSTERS.

## CLUSTERING RULES

1. Signals belong to the same cluster if they describe the SAME core pain for the SAME type of user.
   ✅ Same cluster: "ветеринары тратят часы на ввод данных" + "менеджер ветклиники ненавидит ручной ввод информации о пациентах"
   ❌ Different clusters: "ветеринарам нужно лучшее расписание" + "ветеринарам нужен лучший ввод данных"

2. A cluster must have at least 2 signals. Single-signal "clusters" are discarded.

3. Prefer NARROW clusters over broad ones:
   ✅ "HVAC компании: планирование техников по нескольким объектам"
   ❌ "Field service бизнесы: общие потребности в софте" (too broad)

4. If signals are from the SAME Reddit thread, they count as 1 independent source.
   Independence matters: 3 signals from 3 subreddits > 10 signals from 1 thread.

5. Do NOT create catch-all clusters like "Разное" or "Общие проблемы".

6. Prefer larger clusters (5-15 signals) when signals genuinely share the same pain.

## OUTPUT
Return clusters sorted by strength: (number of signals × diversity of sources) descending.

ALL text output MUST be in Russian except brand names and tech terms.

Respond with JSON:
{
  "clusters": [
    {
      "cluster_name": "Ветклиники: ручной ввод данных пациентов",
      "pain_summary": "Ветеринарные клиники малого размера тратят 1-3 часа в день на ручной ввод данных...",
      "signal_indices": [0, 5, 12, 23],
      "industry_vertical": "ветеринария",
      "existing_solutions": ["Avimark", "Cornerstone"]
    }
  ]
}`;

function buildCompactSignals(signals: NormalizedSignal[]): string {
  return signals.map((s, i) =>
    `[${i}] pain: ${s.pain_description} | who: ${s.who_has_pain} | intensity: ${s.pain_intensity} | industry: ${s.industry_vertical} | wtp: ${s.willingness_to_pay} | solutions: ${s.existing_solutions.join(', ') || 'none'} | source: ${s.source_type}`,
  ).join('\n');
}

function enrichCluster(
  raw: { cluster_name: string; pain_summary: string; signal_indices: number[]; industry_vertical: string; existing_solutions: string[] },
  allSignals: NormalizedSignal[],
): PainCluster {
  const clusterSignals = raw.signal_indices
    .filter(i => i >= 0 && i < allSignals.length)
    .map(i => allSignals[i]!);

  // Count unique independent sources
  // Reddit: same thread URL = 1 source (comments share parent post URL)
  // Google/Trends: each unique URL = 1 independent source
  // Signals without URL grouped by source_type (1 unknown per type)
  const sourceKeys = new Set<string>();
  for (const s of clusterSignals) {
    sourceKeys.add(`${s.source_type}:${s.source_url ?? 'no-url'}`);
  }

  const avgIntensity = clusterSignals.length > 0
    ? Number((clusterSignals.reduce((sum, s) => sum + s.pain_intensity, 0) / clusterSignals.length).toFixed(1))
    : 0;

  const hasWTP = clusterSignals.some(s => s.willingness_to_pay === 'explicit' || s.willingness_to_pay === 'implied');

  return {
    ...raw,
    signal_count: clusterSignals.length,
    unique_source_count: sourceKeys.size,
    avg_pain_intensity: avgIntensity,
    has_willingness_to_pay: hasWTP,
  };
}

export async function clusterSignals(signals: NormalizedSignal[]): Promise<PainCluster[]> {
  logger.info(`=== Step 3: CLUSTER (${signals.length} signals) ===`);

  const compactData = buildCompactSignals(signals);

  const userMessage = `Group these ${signals.length} pain signals into clusters. Only create clusters with 2+ signals from 2+ independent sources.\n\n${compactData}`;

  const response = await openai.chat.completions.create({
    model: config.researcher.model,
    messages: [
      { role: 'system', content: CLUSTER_SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.3,
    max_completion_tokens: 8000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Cluster step: LLM returned empty response');
  }

  if (response.choices[0]?.finish_reason === 'length') {
    logger.warn('Cluster step: response was truncated by token limit');
  }

  const raw = extractJson(content);
  const parsed = ClusterResponseSchema.parse(raw);

  // Enrich clusters with computed metrics
  const enriched = parsed.clusters.map(c => enrichCluster(c, signals));

  // Filter: min 2 signals, min 2 unique sources
  const valid = enriched.filter(c => {
    if (c.signal_count < 2) {
      logger.info(`Dropping cluster "${c.cluster_name}": only ${c.signal_count} signal(s)`);
      return false;
    }
    if (c.unique_source_count < 2) {
      logger.info(`Dropping cluster "${c.cluster_name}": only ${c.unique_source_count} unique source(s)`);
      return false;
    }
    return true;
  });

  // Sort by strength: signal_count × unique_sources × avg_intensity
  valid.sort((a, b) => {
    const scoreA = a.signal_count * a.unique_source_count * a.avg_pain_intensity;
    const scoreB = b.signal_count * b.unique_source_count * b.avg_pain_intensity;
    return scoreB - scoreA;
  });

  logger.info(`Clustering complete: ${parsed.clusters.length} raw → ${valid.length} valid clusters`);

  for (const c of valid) {
    logger.info(
      `  "${c.cluster_name}" — ${c.signal_count} signals, ${c.unique_source_count} sources, intensity ${c.avg_pain_intensity}, wtp: ${c.has_willingness_to_pay}`,
    );
  }

  return valid;
}
