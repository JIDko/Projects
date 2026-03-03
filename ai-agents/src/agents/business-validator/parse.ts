import { z } from 'zod';

/* ─── Zod Schema ─── */

const BlockSchema = z.object({
  name: z.string(),
  score: z.number().min(0).max(16),
  max_score: z.number().min(1),
  status: z.enum(['GREEN', 'YELLOW', 'RED']),
  analysis: z.string(),
  key_findings: z.array(z.string()),
  sources: z.array(z.string()),
  data_gaps: z.array(z.string()).default([]),
}).refine(b => b.score <= b.max_score, {
  message: 'score must not exceed max_score',
});

const ActionSchema = z.object({
  action: z.string(),
  rationale: z.string(),
  effort: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  impact: z.enum(['LOW', 'MEDIUM', 'HIGH']),
});

export const ValidationReportSchema = z.object({
  executive_summary: z.object({
    verdict: z.enum(['GO', 'CONDITIONAL_GO', 'NO_GO']),
    total_score: z.number().min(0).max(100),
    opportunity_headline: z.string(),
    critical_insight: z.string(),
  }),
  meta: z.object({
    confidence_level: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    confidence_rationale: z.string().default(''),
    searches_performed: z.array(z.string()).default([]),
  }),
  blocks: z.array(BlockSchema).min(7).max(7),
  strategic_recommendations: z.object({
    immediate_actions: z.array(ActionSchema).default([]),
    mvp_hypothesis: z.string().default(''),
    target_customer_profile: z.string().default(''),
    kill_criteria: z.array(z.string()).default([]),
  }).default({
    immediate_actions: [],
    mvp_hypothesis: '',
    target_customer_profile: '',
    kill_criteria: [],
  }),
});

export type ValidationReport = z.infer<typeof ValidationReportSchema>;

/* ─── Response Parser ─── */

export function parseValidationResponse(content: string): ValidationReport {
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
  let parsed: unknown;
  try {
    parsed = JSON.parse(clean);
  } catch {
    // Fallback: try to extract JSON object from mixed content
    const objectMatch = clean.match(/\{[\s\S]*\}/);
    if (!objectMatch) {
      throw new Error(
        `Failed to parse validation response as JSON.\nFirst 500 chars: ${content.slice(0, 500)}`,
      );
    }
    try {
      parsed = JSON.parse(objectMatch[0]);
    } catch {
      throw new Error(
        `Failed to parse extracted JSON from response.\nFirst 500 chars: ${content.slice(0, 500)}`,
      );
    }
  }

  // Validate with Zod
  return ValidationReportSchema.parse(parsed);
}
