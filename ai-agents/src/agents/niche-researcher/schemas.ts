import { z } from 'zod';

// ─── JSON extraction helper (same pattern as competitive-intel/parse.ts) ───

export function extractJson(content: string): unknown {
  if (!content.trim()) throw new Error('LLM returned empty response');

  let clean = content.trim();

  // Strip markdown JSON fences
  const fenceMatch = clean.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) clean = fenceMatch[1]!.trim();

  try {
    return JSON.parse(clean);
  } catch {
    // Fallback: extract first JSON object or array
    const objectMatch = clean.match(/[\[{][\s\S]*[\]}]/);
    if (!objectMatch) {
      throw new Error(`Failed to parse LLM response as JSON: ${clean.slice(0, 200)}...`);
    }
    return JSON.parse(objectMatch[0]);
  }
}

// ─── Step 2: Extract — NormalizedSignal ───

export const NormalizedSignalSchema = z.object({
  source_index: z.number().describe('Index of the raw signal this was extracted from'),
  pain_description: z.string().describe('Specific pain described, in Russian'),
  who_has_pain: z.string().describe('Who exactly has this problem (role, business size)'),
  pain_intensity: z.number().min(1).max(5).describe('1=minor, 5=critical'),
  willingness_to_pay: z.enum(['explicit', 'implied', 'unknown']),
  industry_vertical: z.string().default('unknown'),
  existing_solutions: z.array(z.string()).default([]),
});

export const ExtractBatchResponseSchema = z.object({
  signals: z.array(NormalizedSignalSchema),
});

export type NormalizedSignal = z.infer<typeof NormalizedSignalSchema> & {
  id?: string;
  source_type: string;
  source_url?: string;
  raw_text: string;
};

// ─── Step 3: Cluster — PainCluster ───

export const PainClusterSchema = z.object({
  cluster_name: z.string().describe('Short descriptive name for the pain cluster, in Russian'),
  pain_summary: z.string().describe('2-3 sentence summary of the clustered pain'),
  signal_indices: z.array(z.number()).describe('Indices of signals belonging to this cluster'),
  industry_vertical: z.string().default('unknown'),
  existing_solutions: z.array(z.string()).default([]),
});

export const ClusterResponseSchema = z.object({
  clusters: z.array(PainClusterSchema),
});

export type PainCluster = z.infer<typeof PainClusterSchema> & {
  id?: string;
  signal_count: number;
  unique_source_count: number;
  avg_pain_intensity: number;
  has_willingness_to_pay: boolean;
};

// ─── Step 4: Formulate — NicheV2 ───

export const NicheV2Schema = z.object({
  cluster_index: z.number().describe('Index of the source cluster'),
  niche_name: z.string().describe('Short, specific niche name (3-6 words)'),
  description: z.string().describe('2-3 sentence description of the business model'),
  why_attractive: z.string().describe('Why this niche is attractive, referencing evidence'),
  margin_potential: z.number().min(0).max(100).describe('Estimated profit margin %'),
  startup_capital: z.number().min(0).describe('Estimated startup cost USD'),
  time_to_revenue: z.number().min(0).describe('Days to first revenue'),
  market_size: z.number().min(0).describe('TAM in USD'),
  market_growth: z.number().min(0).max(200).describe('Annual growth %'),
  ai_automation_score: z.number().min(0).max(100).describe('% automatable'),
  competition_level: z.enum(['low', 'medium', 'high']),
  organic_traffic_potential: z.enum(['low', 'medium', 'high']),
  confidence_level: z.enum(['low', 'medium', 'high']),
  risk_flags: z.array(z.string()).default([]),
  sources: z.array(z.string()).default([]),
  evidence_summary: z.string().describe('Summary of evidence strength'),
  existing_competitors: z.array(z.string()).default([]),
  sample_signals: z.array(z.string()).default([]).describe('3-5 example signal quotes'),
});

export const FormulateResponseSchema = z.object({
  niches: z.array(NicheV2Schema),
});

export type NicheV2 = z.infer<typeof NicheV2Schema>;
