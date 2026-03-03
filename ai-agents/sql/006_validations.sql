-- 006: Business Validator — Validations table

CREATE TABLE IF NOT EXISTS validations (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  niche_id             uuid REFERENCES niches(id) ON DELETE SET NULL,
  idea                 text NOT NULL,
  market               text NOT NULL DEFAULT 'global english-speaking',
  verdict              text NOT NULL CHECK (verdict IN ('GO', 'CONDITIONAL_GO', 'NO_GO')),
  total_score          int NOT NULL,
  confidence_level     text NOT NULL CHECK (confidence_level IN ('HIGH', 'MEDIUM', 'LOW')),
  opportunity_headline text,
  critical_insight     text,
  report               jsonb NOT NULL,
  searches_performed   text[] NOT NULL DEFAULT '{}',
  model_used           text NOT NULL DEFAULT 'claude-sonnet-4-5',
  tokens_used          jsonb,
  cycle_id             uuid REFERENCES cycles(id),
  status               text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_validations_niche ON validations(niche_id);
CREATE INDEX IF NOT EXISTS idx_validations_verdict ON validations(verdict);
CREATE INDEX IF NOT EXISTS idx_validations_created ON validations(created_at DESC);

-- Register agent in agent_configs
INSERT INTO agent_configs (agent_name, display_name, description, config)
VALUES (
  'business-validator',
  'Business Validator',
  'Валидация бизнес-ниш через web research (Anthropic + web_search)',
  '{"model":"claude-sonnet-4-5","max_searches":20,"max_tokens":16000}'::jsonb
)
ON CONFLICT (agent_name) DO NOTHING;
