-- Agent configuration table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS agent_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default config for niche-researcher
INSERT INTO agent_configs (agent_name, display_name, description, system_prompt, config) VALUES (
  'niche-researcher',
  'Niche Researcher',
  'Finds and scores digital business niches using AI analysis and web research.',
  'You are a senior digital business analyst specializing in identifying profitable online business niches for the English-speaking market (US, UK, AU, CA). Generate unique, specific, actionable ideas with realistic estimates calibrated to the scoring rubric defined in the system prompt.',
  '{
    "weights": {
      "margin": 0.15,
      "growth": 0.20,
      "ai_automation": 0.10,
      "market_size": 0.10,
      "risk": 0.10,
      "startup_capital": 0.10,
      "time_to_revenue": 0.10,
      "competition": 0.05,
      "organic_traffic": 0.05,
      "license_free": 0.05
    },
    "filters": {
      "min_market_growth": 5,
      "require_digital": true,
      "require_white_market": true,
      "require_english": true
    },
    "search": {
      "queries_per_run": 7,
      "results_per_query": 10
    },
    "scoring": {
      "min_score_to_save": 30,
      "top_n": 10
    }
  }'
) ON CONFLICT (agent_name) DO NOTHING;
