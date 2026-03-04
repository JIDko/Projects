export interface Niche {
  id?: string;
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
  created_at?: string;
  source_pain_ids?: string[];
  // v2 Signal Detector fields
  evidence_summary?: string;
  signal_count?: number;
  unique_source_count?: number;
  avg_pain_intensity?: number;
  existing_competitors?: string[];
  cluster_id?: string;
  sample_signals?: string[];
}

export interface CompetitiveAnalysis {
  id?: string;
  validation_id: string;
  idea: string;
  market: string;
  competitors: CompetitorProfile[];
  synthesis: Record<string, unknown>;
  total_searches: number;
  model_used: string;
  tokens_used?: { input: number; output: number };
  searches_performed: string[];
  cycle_id?: string;
  status: 'active' | 'archived';
  created_at?: string;
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

export interface Validation {
  id?: string;
  niche_id?: string;
  idea: string;
  market: string;
  verdict: 'GO' | 'CONDITIONAL_GO' | 'NO_GO';
  total_score: number;
  confidence_level: 'HIGH' | 'MEDIUM' | 'LOW';
  opportunity_headline?: string;
  critical_insight?: string;
  report: Record<string, unknown>;
  searches_performed: string[];
  model_used: string;
  tokens_used?: { input: number; output: number };
  cycle_id?: string;
  status: 'active' | 'archived';
  created_at?: string;
}

export interface Cycle {
  id?: string;
  agent_name: string;
  started_at: string;
  completed_at?: string;
  status: 'running' | 'completed' | 'failed';
  niches_generated: number;
  niches_after_dedup: number;
  niches_after_filter: number;
  niches_saved: number;
  search_queries_used: string[];
  error_message?: string;
}
