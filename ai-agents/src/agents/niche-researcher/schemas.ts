import { z } from 'zod';

// Schema for a single niche idea returned by GPT-4o.
// Boolean fields map directly to hard filters for deterministic yes/no logic.
export const NicheIdeaSchema = z.object({
  niche_name: z.string().describe('Short, specific niche name (3-6 words)'),
  description: z.string().describe('2-3 sentence description of the business model'),
  why_attractive: z.string().describe('Why this niche is attractive right now'),
  margin_potential: z.number().min(0).max(1000).describe('Estimated profit margin percentage (e.g. 80 means 80%)'),
  startup_capital: z.number().min(0).describe('Estimated startup cost in USD'),
  time_to_revenue: z.number().min(0).describe('Estimated days to first revenue'),
  market_size: z.number().min(0).describe('Estimated total addressable market in USD'),
  market_growth: z.number().min(0).max(200).describe('Estimated annual market growth percentage'),
  ai_automation_score: z.number().min(0).max(100).describe('Percentage of business processes automatable with AI'),
  competition_level: z.enum(['low', 'medium', 'high']),
  organic_traffic_potential: z.enum(['low', 'medium', 'high']),
  confidence_level: z.enum(['low', 'medium', 'high']).describe('How confident are you in these estimates'),
  // Boolean fields for hard filter evaluation
  is_digital_only: z.boolean().describe('True if business is 100% digital, no physical/offline component'),
  is_white_market: z.boolean().describe('True if fully legal and ethical'),
  english_speaking_market: z.boolean().describe('True if targets US, UK, AU, or CA'),
  requires_license: z.boolean().describe('True if requires mandatory licenses or certifications'),
  high_seasonality: z.boolean().describe('True if revenue is highly seasonal'),
  dominated_by_giants: z.boolean().describe('True if market is dominated by Google, Amazon, Apple, Meta, etc.'),
  sources: z.array(z.string()).describe('URLs of sources supporting this analysis'),
});

// GPT-4o returns a batch of 25 niches per call (2 calls total = 50)
export const NicheBatchResponseSchema = z.object({
  niches: z.array(NicheIdeaSchema).describe('Array of 25 niche business ideas'),
});

export type NicheIdea = z.infer<typeof NicheIdeaSchema>;
