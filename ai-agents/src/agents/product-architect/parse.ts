import { z } from 'zod';

/* ─── Shared JSON Parser ─── */

function extractJson(content: string): unknown {
  if (!content.trim()) {
    throw new Error('LLM returned empty response');
  }

  let clean = content.trim();

  const fenceMatch = clean.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    clean = fenceMatch[1]!.trim();
  }

  try {
    return JSON.parse(clean);
  } catch {
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

/* ─── Block 1: Vision ─── */

const VisionSchema = z.object({
  product_name: z.string().default(''),
  one_liner: z.string().default(''),
  problem_statement: z.string().default(''),
  solution_approach: z.string().default(''),
  key_differentiators: z.array(z.string()).default([]),
  north_star_metric: z.string().default(''),
});

/* ─── Block 2: Audience ─── */

const PersonaSchema = z.object({
  name: z.string().default(''),
  role: z.string().default(''),
  pain_points: z.array(z.string()).default([]),
  goals: z.array(z.string()).default([]),
  current_solutions: z.array(z.string()).default([]),
});

const SecondaryPersonaSchema = z.object({
  name: z.string().default(''),
  role: z.string().default(''),
  pain_points: z.array(z.string()).default([]),
  goals: z.array(z.string()).default([]),
});

const AudienceSchema = z.object({
  primary_persona: PersonaSchema.default({ name: '', role: '', pain_points: [], goals: [], current_solutions: [] }),
  secondary_personas: z.array(SecondaryPersonaSchema).default([]),
  tam_sam_som: z.object({
    tam: z.string().default(''),
    sam: z.string().default(''),
    som: z.string().default(''),
  }).default({ tam: '', sam: '', som: '' }),
});

/* ─── Block 3: Features ─── */

const FeatureSchema = z.object({
  name: z.string(),
  description: z.string(),
  priority: z.string().default('P1'),
  effort_days: z.number().default(3),
  competitive_advantage: z.string().default(''),
});

const FeaturesSchema = z.object({
  mvp_features: z.array(FeatureSchema).default([]),
  v2_features: z.array(FeatureSchema).default([]),
  explicitly_excluded: z.array(z.string()).default([]),
});

/* ─── Block 4: User Flows ─── */

const UserFlowsSchema = z.object({
  onboarding_flow: z.array(z.string()).default([]),
  core_loop: z.string().default(''),
  aha_moment: z.string().default(''),
  retention_hooks: z.array(z.string()).default([]),
});

/* ─── Block 5: Information Architecture ─── */

const PageSchema = z.object({
  name: z.string(),
  purpose: z.string().default(''),
  key_components: z.array(z.string()).default([]),
});

const InformationArchitectureSchema = z.object({
  pages: z.array(PageSchema).default([]),
  navigation_model: z.string().default(''),
  data_model_overview: z.string().default(''),
});

/* ─── Block 6: Monetization ─── */

const PricingTierSchema = z.object({
  name: z.string(),
  price: z.string().default('$0'),
  features: z.array(z.string()).default([]),
  target: z.string().default(''),
});

const MonetizationSchema = z.object({
  model: z.string().default('freemium'),
  pricing_tiers: z.array(PricingTierSchema).default([]),
  revenue_projections: z.object({
    month_6: z.string().default(''),
    month_12: z.string().default(''),
    assumptions: z.array(z.string()).default([]),
  }).default({ month_6: '', month_12: '', assumptions: [] }),
  competitor_pricing_context: z.string().default(''),
});

/* ─── Block 7: GTM ─── */

const ChannelSchema = z.object({
  channel: z.string(),
  priority: z.string().default('SECONDARY'),
  strategy: z.string().default(''),
  expected_cac: z.string().default(''),
});

const GtmSchema = z.object({
  launch_strategy: z.string().default(''),
  channels: z.array(ChannelSchema).default([]),
  content_strategy: z.string().default(''),
  partnerships: z.array(z.string()).default([]),
  first_100_users: z.string().default(''),
});

/* ─── Block 8: Success Criteria ─── */

const SuccessCriteriaSchema = z.object({
  week_1: z.array(z.string()).default([]),
  month_1: z.array(z.string()).default([]),
  month_3: z.array(z.string()).default([]),
  kill_criteria: z.array(z.string()).default([]),
});

/* ─── Full ProductSpec ─── */

export const ProductSpecSchema = z.object({
  vision: VisionSchema.default({ product_name: '', one_liner: '', problem_statement: '', solution_approach: '', key_differentiators: [], north_star_metric: '' }),
  audience: AudienceSchema.default({ primary_persona: { name: '', role: '', pain_points: [], goals: [], current_solutions: [] }, secondary_personas: [], tam_sam_som: { tam: '', sam: '', som: '' } }),
  features: FeaturesSchema.default({ mvp_features: [], v2_features: [], explicitly_excluded: [] }),
  user_flows: UserFlowsSchema.default({ onboarding_flow: [], core_loop: '', aha_moment: '', retention_hooks: [] }),
  information_architecture: InformationArchitectureSchema.default({ pages: [], navigation_model: '', data_model_overview: '' }),
  monetization: MonetizationSchema.default({ model: 'freemium', pricing_tiers: [], revenue_projections: { month_6: '', month_12: '', assumptions: [] }, competitor_pricing_context: '' }),
  gtm: GtmSchema.default({ launch_strategy: '', channels: [], content_strategy: '', partnerships: [], first_100_users: '' }),
  success_criteria: SuccessCriteriaSchema.default({ week_1: [], month_1: [], month_3: [], kill_criteria: [] }),
});

export type ProductSpec = z.infer<typeof ProductSpecSchema>;

export function parseProductSpecResponse(content: string): ProductSpec {
  const parsed = extractJson(content);
  return ProductSpecSchema.parse(parsed);
}
