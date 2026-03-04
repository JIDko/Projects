import { openai } from '../../shared/openai.js';
import { config } from '../../shared/config.js';
import { logger } from '../../shared/logger.js';
import { extractJson, FormulateResponseSchema, type NormalizedSignal, type PainCluster, type NicheV2 } from './schemas.js';

const FORMULATE_SYSTEM_PROMPT = `You are a business strategist. You receive PAIN CLUSTERS — groups of validated market signals — and must formulate a SPECIFIC digital business niche for each cluster.

## YOUR INPUT
Each cluster contains:
- cluster_name: what the pain is
- pain_summary: detailed description
- signal_count: how many signals confirm this pain
- unique_source_count: how many independent sources
- avg_pain_intensity: how severe (1-5)
- has_willingness_to_pay: whether users mentioned paying
- existing_solutions: tools/software already mentioned
- sample_signals: actual quotes from real users

## YOUR OUTPUT
For each cluster, formulate ONE specific business niche.

### Fields:

1. **niche_name**: 3-6 word specific name
   ✅ "Pest Control Dispatch & Route Optimizer"
   ❌ "Field Service Software" (too broad)

2. **description**: 2-3 sentences. What exactly this product does, for whom, how it solves the specific pain. MUST reference the actual pain from the cluster.

3. **why_attractive**: Why NOW, based on the signals. Reference signal count, intensity, lack of solutions.

4. **Numeric estimates — BE HONEST**:
   - If signals mention specific prices/costs → use those
   - If no data → use conservative estimates and set confidence_level = "low"
   - NEVER invent precise numbers without source

### SCORING RUBRIC for numeric fields:

margin_potential (profit margin %):
  0-30 = commodity business | 30-60 = service-based | 60-85 = SaaS/digital | 85+ = pure digital near-zero COGS

market_growth (annual %):
  0-5 = stagnant | 5-15 = steady | 15-30 = fast-growing | 30+ = explosive (set confidence="low")

startup_capital (USD):
  0-500 = weekend project | 500-2000 = needs tooling | 2000-10000 = needs MVP | 10000+ = significant

time_to_revenue (days):
  0-30 = immediate | 30-90 = needs MVP | 90-180 = needs product+audience | 180+ = long cycle

ai_automation_score (% automatable):
  0-30 = mostly manual | 30-60 = core automatable | 60-85 = mostly automated | 85+ = near-autonomous

market_size (USD TAM):
  <$100M = very small | $100M-$1B = solid | $1B-$10B = large | $10B+ = massive (verify)

competition_level:
  "low" = few competitors | "medium" = room for differentiation | "high" = saturated

confidence_level — calibrate based on evidence:
  "high" = signal_count >= 10 AND unique_sources >= 4 AND avg_intensity >= 4
  "medium" = signal_count >= 5 AND unique_sources >= 3
  "low" = everything else

5. **evidence_summary**: 2-3 sentences about evidence strength.
   "12 сигналов из 5 независимых источников. Средняя интенсивность боли: 4.1/5. 3 пользователя явно упомянули готовность платить."

6. **existing_competitors**: from cluster's existing_solutions + your knowledge.

7. **sample_signals**: Pick 3-5 most compelling original quotes from the cluster.

8. **risk_flags**: Array of applicable flags:
   - "PLATFORM_DEPENDENCY" — if business depends on a single platform
   - "LEGAL_REGULATORY_RISK" — if regulated industry
   - "DOMINATED_BY_GIANTS" — if big tech competitors
   - "HIGH_SEASONALITY" — if seasonal revenue

## CRITICAL RULES
- Do NOT invent a niche that doesn't follow from the cluster's pain
- Do NOT inflate numbers to make a niche look better
- Do NOT suggest generic "AI-powered X" solutions
- Do NOT ignore existing competitors mentioned in signals
- Focus on DIGITAL-ONLY businesses (SaaS, tools, platforms)
- ALL text output in Russian except brand names and tech terms

Respond with JSON:
{
  "niches": [
    {
      "cluster_index": 0,
      "niche_name": "...",
      "description": "...",
      "why_attractive": "...",
      "margin_potential": 75,
      "startup_capital": 3000,
      "time_to_revenue": 90,
      "market_size": 500000000,
      "market_growth": 12,
      "ai_automation_score": 45,
      "competition_level": "low",
      "organic_traffic_potential": "medium",
      "confidence_level": "medium",
      "risk_flags": [],
      "sources": ["https://reddit.com/..."],
      "evidence_summary": "...",
      "existing_competitors": ["Jobber", "ServiceTitan"],
      "sample_signals": ["r/HVAC: 'I spend 2 hours...'"]
    }
  ]
}`;

function buildClusterContext(clusters: PainCluster[], allSignals: NormalizedSignal[]): string {
  return clusters.map((cluster, idx) => {
    // Pick up to 5 sample signal texts
    const samples = cluster.signal_indices
      .slice(0, 5)
      .filter(i => i >= 0 && i < allSignals.length)
      .map(i => {
        const s = allSignals[i]!;
        return `  - [${s.source_type}] "${s.pain_description}" (intensity: ${s.pain_intensity}, wtp: ${s.willingness_to_pay})`;
      })
      .join('\n');

    return `## Cluster ${idx}: ${cluster.cluster_name}
Pain summary: ${cluster.pain_summary}
Signals: ${cluster.signal_count} | Unique sources: ${cluster.unique_source_count} | Avg intensity: ${cluster.avg_pain_intensity}/5 | WTP: ${cluster.has_willingness_to_pay ? 'yes' : 'no'}
Industry: ${cluster.industry_vertical}
Existing solutions mentioned: ${cluster.existing_solutions.join(', ') || 'none'}
Sample signals:
${samples}`;
  }).join('\n\n');
}

export async function formulateNiches(
  clusters: PainCluster[],
  allSignals: NormalizedSignal[],
): Promise<NicheV2[]> {
  logger.info(`=== Step 4: FORMULATE NICHES (${clusters.length} clusters) ===`);

  const clusterContext = buildClusterContext(clusters, allSignals);

  const userMessage = `Formulate one specific digital business niche for each of these ${clusters.length} pain clusters:\n\n${clusterContext}`;

  const response = await openai.chat.completions.create({
    model: config.researcher.model,
    messages: [
      { role: 'system', content: FORMULATE_SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.5,
    max_completion_tokens: 12000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Formulate step: LLM returned empty response');
  }

  if (response.choices[0]?.finish_reason === 'length') {
    logger.warn('Formulate step: response was truncated by token limit');
  }

  const raw = extractJson(content);
  const parsed = FormulateResponseSchema.parse(raw);

  logger.info(`Formulated ${parsed.niches.length} niches from ${clusters.length} clusters`);

  for (const n of parsed.niches) {
    logger.info(`  [cluster ${n.cluster_index}] ${n.niche_name} — confidence: ${n.confidence_level}`);
  }

  return parsed.niches;
}
