import { z } from 'zod';

/* ─── Shared JSON Parser ─── */

function extractJson(content: string): unknown {
  if (!content.trim()) {
    throw new Error('LLM returned empty response');
  }

  let clean = content.trim();

  // Strip markdown JSON fences if present
  const fenceMatch = clean.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    clean = fenceMatch[1]!.trim();
  }

  // Try parsing JSON
  try {
    return JSON.parse(clean);
  } catch {
    // Fallback: try to extract JSON object from mixed content
    const objectMatch = clean.match(/\{[\s\S]*\}/);
    if (!objectMatch) {
      throw new Error(
        `Failed to parse response as JSON.\nFirst 500 chars: ${content.slice(0, 500)}`,
      );
    }
    try {
      return JSON.parse(objectMatch[0]);
    } catch {
      throw new Error(
        `Failed to parse extracted JSON from response.\nFirst 500 chars: ${content.slice(0, 500)}`,
      );
    }
  }
}

/* ─── Phase 1: Discovery Schema ─── */

const DiscoveredCompetitorSchema = z.object({
  name: z.string(),
  url: z.string().default(''),
  description: z.string(),
  why_selected: z.string(),
});

export const DiscoveryResultSchema = z.object({
  competitors: z.array(DiscoveredCompetitorSchema).min(1).max(7),
});

export type DiscoveryResult = z.infer<typeof DiscoveryResultSchema>;
export type DiscoveredCompetitor = z.infer<typeof DiscoveredCompetitorSchema>;

export function parseDiscoveryResponse(content: string): DiscoveryResult {
  const parsed = extractJson(content);
  return DiscoveryResultSchema.parse(parsed);
}

/* ─── Phase 2: Deep Dive Schema ─── */

export const CompetitorProfileSchema = z.object({
  name: z.string(),
  url: z.string().default(''),
  description: z.string(),
  positioning: z.string().default(''),
  target_audience: z.string().default(''),
  pricing: z.object({
    model: z.string().default('unknown'),
    tiers: z.array(z.string()).default([]),
    avg_price: z.string().default('Данные не найдены'),
  }).default({ model: 'unknown', tiers: [], avg_price: 'Данные не найдены' }),
  product: z.object({
    core_features: z.array(z.string()).default([]),
    unique_selling_points: z.array(z.string()).default([]),
  }).default({ core_features: [], unique_selling_points: [] }),
  marketing: z.object({
    channels: z.array(z.string()).default([]),
    content_strategy: z.string().default(''),
  }).default({ channels: [], content_strategy: '' }),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  customer_sentiment: z.object({
    positive: z.array(z.string()).default([]),
    negative: z.array(z.string()).default([]),
  }).default({ positive: [], negative: [] }),
  sources: z.array(z.string()).default([]),
});

export type CompetitorProfile = z.infer<typeof CompetitorProfileSchema>;

export function parseDeepDiveResponse(content: string): CompetitorProfile {
  const parsed = extractJson(content);
  return CompetitorProfileSchema.parse(parsed);
}

/* ─── Phase 3: Synthesis Schema ─── */

const AttackVectorSchema = z.object({
  vector: z.string(),
  target_weakness: z.string(),
  effort: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  impact: z.enum(['LOW', 'MEDIUM', 'HIGH']),
});

const FeaturePrioritySchema = z.object({
  feature: z.string(),
  priority: z.enum(['MUST_HAVE', 'SHOULD_HAVE', 'NICE_TO_HAVE']),
  competitors_have: z.number(),
  competitors_total: z.number(),
  rationale: z.string(),
});

export const SynthesisResultSchema = z.object({
  market_overview: z.string(),
  attack_vectors: z.array(AttackVectorSchema).default([]),
  feature_priority_matrix: z.array(FeaturePrioritySchema).default([]),
  pricing_recommendation: z.object({
    strategy: z.string(),
    entry_price: z.string(),
    rationale: z.string(),
    reference_competitors: z.array(z.string()).default([]),
  }).default({ strategy: '', entry_price: '', rationale: '', reference_competitors: [] }),
  go_to_market: z.object({
    primary_channel: z.string().default(''),
    content_gaps: z.array(z.string()).default([]),
    quick_wins: z.array(z.string()).default([]),
  }).default({ primary_channel: '', content_gaps: [], quick_wins: [] }),
  key_risks: z.array(z.string()).default([]),
  overall_assessment: z.string(),
});

export type SynthesisResult = z.infer<typeof SynthesisResultSchema>;

export function parseSynthesisResponse(content: string): SynthesisResult {
  const parsed = extractJson(content);
  return SynthesisResultSchema.parse(parsed);
}
