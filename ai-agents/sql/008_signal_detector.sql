-- Niche Researcher v2 "Signal Detector"
-- New tables: signals, pain_clusters
-- New columns on niches and cycles for evidence-based pipeline

-- ═══════════════════════════════════════
-- 1. Signals table — every extracted pain signal
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES cycles(id),
  pain_description TEXT NOT NULL,
  who_has_pain TEXT,
  pain_intensity SMALLINT CHECK (pain_intensity BETWEEN 1 AND 5),
  willingness_to_pay TEXT CHECK (willingness_to_pay IN ('explicit', 'implied', 'unknown')),
  industry_vertical TEXT,
  existing_solutions TEXT[] NOT NULL DEFAULT '{}',
  source_type TEXT NOT NULL,  -- 'reddit', 'google_search', 'google_trends'
  source_url TEXT,
  source_metadata JSONB,
  raw_text TEXT,
  cluster_id UUID,            -- filled after clustering step
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signals_cycle ON signals(cycle_id);
CREATE INDEX IF NOT EXISTS idx_signals_cluster ON signals(cluster_id);
CREATE INDEX IF NOT EXISTS idx_signals_industry ON signals(industry_vertical);

-- ═══════════════════════════════════════
-- 2. Pain clusters table — grouped pain signals
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS pain_clusters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES cycles(id),
  cluster_name TEXT NOT NULL,
  pain_summary TEXT,
  signal_count INT,
  unique_source_count INT,
  avg_pain_intensity NUMERIC(2,1),
  has_willingness_to_pay BOOLEAN DEFAULT false,
  industry_vertical TEXT,
  existing_solutions TEXT[] NOT NULL DEFAULT '{}',
  niche_id UUID REFERENCES niches(id),  -- filled after formulation
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clusters_cycle ON pain_clusters(cycle_id);

-- FK from signals.cluster_id → pain_clusters.id
ALTER TABLE signals
  ADD CONSTRAINT fk_signals_cluster
  FOREIGN KEY (cluster_id) REFERENCES pain_clusters(id);

-- ═══════════════════════════════════════
-- 3. Extend niches table with v2 evidence fields (all NULLable)
-- ═══════════════════════════════════════
ALTER TABLE niches ADD COLUMN IF NOT EXISTS evidence_summary TEXT;
ALTER TABLE niches ADD COLUMN IF NOT EXISTS signal_count INT;
ALTER TABLE niches ADD COLUMN IF NOT EXISTS unique_source_count INT;
ALTER TABLE niches ADD COLUMN IF NOT EXISTS avg_pain_intensity NUMERIC(2,1);
ALTER TABLE niches ADD COLUMN IF NOT EXISTS existing_competitors TEXT[];
ALTER TABLE niches ADD COLUMN IF NOT EXISTS cluster_id UUID REFERENCES pain_clusters(id);
ALTER TABLE niches ADD COLUMN IF NOT EXISTS sample_signals TEXT[];

-- ═══════════════════════════════════════
-- 4. Extend cycles table with signal tracking
-- ═══════════════════════════════════════
ALTER TABLE cycles ADD COLUMN IF NOT EXISTS signals_collected INT;
ALTER TABLE cycles ADD COLUMN IF NOT EXISTS signals_normalized INT;
ALTER TABLE cycles ADD COLUMN IF NOT EXISTS clusters_formed INT;

-- ═══════════════════════════════════════
-- 5. Update agent config
-- ═══════════════════════════════════════
UPDATE agent_configs
SET
  display_name = 'Signal Detector',
  description = 'Niche Researcher v2: собирает реальные сигналы из Reddit, Google, Trends → извлекает боли → кластеризует → формулирует evidence-based ниши',
  system_prompt = 'You are a signal detection and market research engine. You collect real pain signals from Reddit, Google Search, and Google Trends, then extract structured pain data, cluster similar signals, and formulate evidence-based business niches. You NEVER invent or hallucinate data. All output in Russian except brand names and tech terms.',
  config = jsonb_build_object(
    'model', 'anthropic/claude-sonnet-4-5',
    'prompt_version', 'v2-signal-detector',
    'collect', jsonb_build_object(
      'reddit_subs_per_cycle', 5,
      'reddit_terms_per_cycle', 3,
      'search_queries_per_cycle', 6,
      'trends_seeds_per_cycle', 3
    ),
    'extract', jsonb_build_object(
      'batch_size', 12,
      'max_concurrency', 5
    ),
    'cluster', jsonb_build_object(
      'min_signals', 2,
      'min_unique_sources', 2
    ),
    'score', jsonb_build_object(
      'evidence_weight', 0.5,
      'business_weight', 0.5
    )
  )
WHERE agent_name = 'niche-researcher';
