-- 005: Pain accumulation across cycles + Pain-Niche linking

-- 1. Add tracking columns to pain_points for cross-cycle accumulation
ALTER TABLE pain_points
  ADD COLUMN IF NOT EXISTS first_seen_cycle_id uuid REFERENCES cycles(id),
  ADD COLUMN IF NOT EXISTS last_seen_cycle_id  uuid REFERENCES cycles(id),
  ADD COLUMN IF NOT EXISTS first_seen_at       timestamptz,
  ADD COLUMN IF NOT EXISTS times_seen          int NOT NULL DEFAULT 1;

-- Backfill existing rows
UPDATE pain_points
SET first_seen_cycle_id = cycle_id,
    last_seen_cycle_id  = cycle_id,
    first_seen_at       = created_at,
    times_seen          = 1
WHERE first_seen_cycle_id IS NULL;

-- 2. Add source_pain_ids to niches (which pains inspired this niche)
ALTER TABLE niches
  ADD COLUMN IF NOT EXISTS source_pain_ids uuid[] NOT NULL DEFAULT '{}';

-- 3. Add merge config to pain-hunter agent_configs
UPDATE agent_configs
SET config = config || '{
  "merge": {
    "enabled": true,
    "max_existing_pains": 100,
    "validation_threshold": 5
  }
}'::jsonb
WHERE agent_name = 'pain-hunter';

-- 4. Add pain-linking config to niche-researcher agent_configs
UPDATE agent_configs
SET config = config || '{
  "pain_linking": {
    "enabled": true,
    "validation_threshold": 5,
    "max_pains_to_inject": 20
  }
}'::jsonb
WHERE agent_name = 'niche-researcher';
