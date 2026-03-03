export interface Niche {
  id: string;
  niche_name: string;
  description: string;
  why_attractive: string;
  margin_potential: number;
  startup_capital: number;
  time_to_revenue: number;
  market_size: number;
  market_growth: number;
  ai_automation_score: number;
  competition_level: 'low' | 'medium' | 'high';
  organic_traffic_potential: 'low' | 'medium' | 'high';
  risk_flags: string[];
  confidence_level: 'low' | 'medium' | 'high';
  sources: string[];
  total_score: number;
  cycle_id: string;
  status: 'active' | 'rejected' | 'archived';
  created_at: string;
  source_pain_ids?: string[];
}

export interface CompetitorProfile {
  name: string;
  url?: string;
  description: string;
  positioning: string;
  target_audience: string;
  pricing: {
    model: string;
    tiers: string[];
    avg_price: string;
  };
  product: {
    core_features: string[];
    unique_selling_points: string[];
  };
  marketing: {
    channels: string[];
    content_strategy: string;
  };
  strengths: string[];
  weaknesses: string[];
  customer_sentiment: {
    positive: string[];
    negative: string[];
  };
  sources: string[];
}

export interface CompetitiveAnalysis {
  id: string;
  validation_id: string;
  idea: string;
  market: string;
  competitors: CompetitorProfile[];
  synthesis: {
    market_overview?: string;
    attack_vectors?: Array<{ vector: string; target_weakness: string; effort: string; impact: string }>;
    feature_priority_matrix?: Array<{ feature: string; priority: string; competitors_have: number; competitors_total: number; rationale: string }>;
    pricing_recommendation?: { strategy: string; entry_price: string; rationale: string; reference_competitors: string[] };
    go_to_market?: { primary_channel: string; content_gaps: string[]; quick_wins: string[] };
    key_risks?: string[];
    overall_assessment?: string;
  };
  total_searches: number;
  model_used: string;
  tokens_used: { input: number; output: number } | null;
  searches_performed: string[];
  cycle_id: string | null;
  status: 'active' | 'archived';
  created_at: string;
}

export interface ValidationBlock {
  name: string;
  score: number;
  max_score: number;
  status: 'GREEN' | 'YELLOW' | 'RED';
  analysis: string;
  key_findings: string[];
  sources: string[];
  data_gaps: string[];
}

export interface Validation {
  id: string;
  niche_id: string | null;
  idea: string;
  market: string;
  verdict: 'GO' | 'CONDITIONAL_GO' | 'NO_GO';
  total_score: number;
  confidence_level: 'HIGH' | 'MEDIUM' | 'LOW';
  opportunity_headline: string | null;
  critical_insight: string | null;
  report: {
    blocks: ValidationBlock[];
    strategic_recommendations?: {
      immediate_actions: Array<{ action: string; rationale: string; effort: string; impact: string }>;
      mvp_hypothesis: string;
      target_customer_profile: string;
      kill_criteria: string[];
    };
  };
  searches_performed: string[];
  model_used: string;
  tokens_used: { input: number; output: number } | null;
  cycle_id: string | null;
  status: 'active' | 'archived';
  created_at: string;
}

export interface Cycle {
  id: string;
  agent_name: string;
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'completed' | 'failed';
  niches_generated: number;
  niches_after_dedup: number;
  niches_after_filter: number;
  niches_saved: number;
  search_queries_used: string[];
  error_message: string | null;
}

export interface DashboardStats {
  totalNiches: number;
  avgScore: number;
  bestNiche: Niche | null;
  totalCycles: number;
}

export interface AgentConfig {
  id: string;
  agent_name: string;
  display_name: string;
  description: string | null;
  system_prompt: string | null;
  config: Record<string, unknown>;
  is_active: boolean;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}
