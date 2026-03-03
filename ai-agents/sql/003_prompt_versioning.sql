-- Prompt versioning: track which prompt version produced each cycle's results
-- Run this in Supabase SQL Editor

-- Add prompt_version to cycles so we can compare results across prompt versions
ALTER TABLE cycles ADD COLUMN IF NOT EXISTS prompt_version text NOT NULL DEFAULT 'v1';

-- Add prompt_hash to cycles for exact diff tracking
ALTER TABLE cycles ADD COLUMN IF NOT EXISTS prompt_hash text;

-- History table: stores old prompt versions for rollback
CREATE TABLE IF NOT EXISTS prompt_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_prompt_versions_unique ON prompt_versions (agent_name, version);

-- Insert v1 (the original prompt) for rollback reference
INSERT INTO prompt_versions (version, agent_name, system_prompt, description) VALUES (
  'v1',
  'niche-researcher',
  'You are a senior digital business analyst specializing in identifying profitable online business niches for the English-speaking market (US, UK, AU, CA).

Your task is to generate unique, specific, actionable digital business niche ideas based on trending search data provided to you.

RULES:
- Each niche must be a SPECIFIC business idea, not a broad category (e.g. "AI-powered resume optimization SaaS" not "AI tools")
- Provide REALISTIC estimates backed by market data, not optimistic guesses
- Focus on DIGITAL-ONLY businesses (no physical products, no offline operations)
- Target English-speaking markets: US, UK, Australia, Canada
- Evaluate honestly: if a niche requires licenses, say so. If dominated by big tech, say so.
- Include source URLs where available (from the search data provided)
- Confidence level: "high" only if backed by multiple data points, "medium" for reasonable estimates, "low" for speculative',
  'Original prompt — basic rules, no scoring rubric'
) ON CONFLICT (agent_name, version) DO NOTHING;

-- Insert v2 (the improved prompt with scoring rubric)
INSERT INTO prompt_versions (version, agent_name, system_prompt, description) VALUES (
  'v2',
  'niche-researcher',
  'Improved prompt with scoring rubric, anti-patterns, and calibrated estimation scales. See generate.ts for full text.',
  'Added scoring rubric for all numeric fields, anti-patterns section, confidence calibration'
) ON CONFLICT (agent_name, version) DO NOTHING;

-- View: compare average scores between prompt versions
CREATE OR REPLACE VIEW prompt_comparison AS
SELECT
  c.prompt_version,
  COUNT(DISTINCT c.id) AS total_cycles,
  COUNT(n.id) AS total_niches,
  ROUND(AVG(n.total_score), 1) AS avg_score,
  ROUND(AVG(n.margin_potential), 1) AS avg_margin,
  ROUND(AVG(n.market_growth), 1) AS avg_growth,
  ROUND(AVG(n.ai_automation_score), 1) AS avg_ai_score,
  ROUND(AVG(n.market_size)::numeric, 0) AS avg_market_size,
  ROUND(AVG(n.startup_capital)::numeric, 0) AS avg_capital,
  ROUND(AVG(n.time_to_revenue), 0) AS avg_time_to_rev,
  COUNT(*) FILTER (WHERE n.confidence_level = 'high')::float / NULLIF(COUNT(*), 0) AS pct_high_confidence,
  COUNT(*) FILTER (WHERE n.status = 'rejected')::float / NULLIF(COUNT(*), 0) AS pct_rejected
FROM cycles c
LEFT JOIN niches n ON n.cycle_id = c.id
GROUP BY c.prompt_version
ORDER BY c.prompt_version;
