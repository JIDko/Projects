-- Product specifications from Product Architect agent
CREATE TABLE IF NOT EXISTS product_specs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Relations
  competitive_analysis_id UUID NOT NULL REFERENCES competitive_analyses(id) ON DELETE CASCADE,

  -- Meta
  idea TEXT NOT NULL,
  market TEXT NOT NULL,

  -- 8 spec blocks (separate JSONB columns)
  vision JSONB NOT NULL DEFAULT '{}',
  audience JSONB NOT NULL DEFAULT '{}',
  features JSONB NOT NULL DEFAULT '{}',
  user_flows JSONB NOT NULL DEFAULT '{}',
  information_architecture JSONB NOT NULL DEFAULT '{}',
  monetization JSONB NOT NULL DEFAULT '{}',
  gtm JSONB NOT NULL DEFAULT '{}',
  success_criteria JSONB NOT NULL DEFAULT '{}',

  -- Scoring
  total_score INTEGER NOT NULL DEFAULT 0,
  score_breakdown JSONB NOT NULL DEFAULT '{}',
  readiness TEXT NOT NULL DEFAULT 'INCOMPLETE'
    CHECK (readiness IN ('READY', 'NEEDS_REVIEW', 'INCOMPLETE')),

  -- Research
  total_searches INTEGER NOT NULL DEFAULT 0,
  searches_performed TEXT[] NOT NULL DEFAULT '{}',

  -- Agent meta
  model_used TEXT NOT NULL,
  tokens_used JSONB,
  cycle_id UUID REFERENCES cycles(id),

  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_specs_comp_analysis ON product_specs(competitive_analysis_id);
CREATE INDEX idx_product_specs_status ON product_specs(status);
CREATE INDEX idx_product_specs_readiness ON product_specs(readiness);

-- Register agent
INSERT INTO agent_configs (agent_name, display_name, description, system_prompt, config, is_active)
VALUES (
  'product-architect',
  'Product Architect',
  'Генерирует полную продуктовую спецификацию MVP из валидированной ниши и конкурентного анализа',
  '',
  '{"model":"anthropic/claude-sonnet-4-5","max_research_queries":12,"results_per_query":10}'::jsonb,
  true
)
ON CONFLICT (agent_name) DO NOTHING;
