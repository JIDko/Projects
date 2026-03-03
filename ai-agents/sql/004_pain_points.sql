-- Pain Hunter: discovered consumer pain points from Reddit/forums/reviews
create table pain_points (
  id                      uuid primary key default gen_random_uuid(),
  pain_name               text not null,
  description             text not null,
  exact_quotes            text[] not null default '{}',
  source_urls             text[] not null default '{}',
  jtbd_goal               text not null,
  category                text not null
                            check (category in ('functional', 'emotional', 'social', 'operational')),
  avg_urgency             numeric not null default 0,
  mention_count           int not null default 1,
  frequency_score         numeric not null default 0,
  intensity_score         numeric not null default 0,
  competition_gap_score   numeric not null default 0,
  monetization_score      numeric not null default 0,
  total_score             numeric not null default 0,
  suggested_solutions     text[] not null default '{}',
  related_niches          text[] not null default '{}',
  platforms               text[] not null default '{}',
  industries              text[] not null default '{}',
  cycle_id                uuid not null references cycles(id),
  status                  text not null default 'active'
                            check (status in ('active', 'rejected', 'archived')),
  created_at              timestamptz not null default now()
);

create unique index idx_pain_points_name_unique on pain_points (lower(pain_name));
create index idx_pain_points_status on pain_points (status);
create index idx_pain_points_score on pain_points (total_score desc);
create index idx_pain_points_category on pain_points (category);

-- Register pain-hunter agent in agent_configs
insert into agent_configs (agent_name, display_name, description, system_prompt, config)
values (
  'pain-hunter',
  'Pain Hunter',
  'Finds and scores real consumer pain points from Reddit, forums, and review sites using NLP extraction.',
  null,
  '{
    "weights": {
      "frequency": 0.30,
      "intensity": 0.25,
      "competition_gap": 0.25,
      "monetization": 0.20
    },
    "filters": {
      "min_score": 15,
      "require_quotes": true,
      "require_sources": true
    },
    "search": {
      "dorking_queries_per_run": 6,
      "reddit_subs_per_run": 4,
      "reddit_terms_per_run": 3
    },
    "scoring": {
      "top_n": 15
    }
  }'::jsonb
);
