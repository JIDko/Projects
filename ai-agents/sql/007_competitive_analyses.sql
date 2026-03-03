-- Competitive Intelligence Agent — analysis results
CREATE TABLE competitive_analyses (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_id        uuid NOT NULL REFERENCES validations(id) ON DELETE CASCADE,
  idea                 text NOT NULL,
  market               text NOT NULL,
  competitors          jsonb NOT NULL DEFAULT '[]',
  synthesis            jsonb NOT NULL DEFAULT '{}',
  total_searches       int NOT NULL DEFAULT 0,
  model_used           text NOT NULL,
  tokens_used          jsonb,
  searches_performed   text[] NOT NULL DEFAULT '{}',
  cycle_id             uuid REFERENCES cycles(id),
  status               text NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'archived')),
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_comp_analyses_validation ON competitive_analyses(validation_id);
CREATE INDEX idx_comp_analyses_status ON competitive_analyses(status);

-- Register agent in agent_configs
INSERT INTO agent_configs (agent_name, display_name, description, system_prompt, config)
VALUES (
  'competitive-intel',
  'Competitive Intelligence',
  'Анализ конкурентов на основе результатов валидации',
  E'3-phase competitive intelligence agent.\n\nPhase 1 — Discovery: Identify 3-5 direct competitors from validation data + web search.\nPhase 2 — Deep Dive: 8 SerpAPI queries per competitor → LLM builds structured profile (product, pricing, audience, marketing, strengths/weaknesses, reviews).\nPhase 3 — Synthesis: Strategic playbook — attack vectors, feature priority matrix, pricing recommendation, GTM strategy.\n\nRules:\n- All analysis text in Russian (except brand names)\n- Every claim sourced from search data\n- If data not found → \"Данные не найдены\"\n- No hallucinations — only real companies from search results',
  '{"model":"anthropic/claude-sonnet-4-5","searches_per_competitor":8}'::jsonb
) ON CONFLICT (agent_name) DO NOTHING;
