-- AI Agents: Initial Schema
-- Run this in Supabase Dashboard → SQL Editor → New Query → Run

-- Cycles: metadata for each agent run
create table cycles (
  id                  uuid primary key default gen_random_uuid(),
  agent_name          text not null,
  started_at          timestamptz not null default now(),
  completed_at        timestamptz,
  status              text not null default 'running'
                        check (status in ('running', 'completed', 'failed')),
  niches_generated    int not null default 0,
  niches_after_dedup  int not null default 0,
  niches_after_filter int not null default 0,
  niches_saved        int not null default 0,
  search_queries_used text[] not null default '{}',
  error_message       text
);

-- Niches: all evaluated business niches
create table niches (
  id                        uuid primary key default gen_random_uuid(),
  niche_name                text not null,
  description               text not null,
  why_attractive            text not null,
  margin_potential           numeric not null,
  startup_capital            numeric not null,
  time_to_revenue            int not null,
  market_size                numeric not null,
  market_growth              numeric not null,
  ai_automation_score        numeric not null,
  competition_level          text not null
                               check (competition_level in ('low', 'medium', 'high')),
  organic_traffic_potential  text not null
                               check (organic_traffic_potential in ('low', 'medium', 'high')),
  risk_flags                 text[] not null default '{}',
  confidence_level           text not null
                               check (confidence_level in ('low', 'medium', 'high')),
  sources                    text[] not null default '{}',
  total_score                numeric not null,
  cycle_id                   uuid not null references cycles(id),
  status                     text not null default 'active'
                               check (status in ('active', 'rejected', 'archived')),
  created_at                 timestamptz not null default now()
);

create unique index idx_niches_name_unique on niches (lower(niche_name));
create index idx_niches_status on niches (status);
create index idx_niches_score on niches (total_score desc);

-- Rejections: feedback from Agent #2 (populated later)
create table rejections (
  id            uuid primary key default gen_random_uuid(),
  niche_name    text not null,
  rejected_by   text not null,
  reason        text not null,
  created_at    timestamptz not null default now()
);

create index idx_rejections_name on rejections (lower(niche_name));
