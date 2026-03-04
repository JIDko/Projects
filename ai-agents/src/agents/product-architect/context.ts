import { logger } from '../../shared/logger.js';
import { fetchChain, type ChainData } from './store.js';

export interface ContextOutput {
  chain: ChainData;
  contextSummary: string;
}

export async function assembleContext(competitiveAnalysisId: string): Promise<ContextOutput> {
  logger.info('[Context] Fetching full data chain...');

  const chain = await fetchChain(competitiveAnalysisId);

  if (chain.validation.verdict === 'NO_GO') {
    throw new Error('Validation verdict is NO_GO — skipping product architecture');
  }

  const contextSummary = buildContextSummary(chain);

  logger.info(`[Context] Chain loaded: idea="${chain.analysis.idea}", verdict=${chain.validation.verdict}, ${chain.analysis.competitors.length} competitors`);

  return { chain, contextSummary };
}

function buildContextSummary(chain: ChainData): string {
  const parts: string[] = [];

  parts.push('=== BUSINESS IDEA ===');
  parts.push(`Idea: ${chain.analysis.idea}`);
  parts.push(`Market: ${chain.analysis.market}`);

  if (chain.niche) {
    parts.push('\n=== NICHE DATA ===');
    parts.push(`Name: ${chain.niche.niche_name}`);
    parts.push(`Description: ${chain.niche.description}`);
    parts.push(`Why attractive: ${chain.niche.why_attractive}`);
    parts.push(`Score: ${chain.niche.total_score}/100`);
    parts.push(`Competition: ${chain.niche.competition_level}`);
    parts.push(`Market size: ${chain.niche.market_size}`);
    parts.push(`Market growth: ${chain.niche.market_growth}%`);
    if (chain.niche.risk_flags.length > 0) {
      parts.push(`Risk flags: ${chain.niche.risk_flags.join(', ')}`);
    }
    if (chain.niche.evidence_summary) {
      parts.push(`Evidence: ${chain.niche.evidence_summary}`);
    }
  }

  parts.push('\n=== VALIDATION RESULTS ===');
  parts.push(`Verdict: ${chain.validation.verdict}`);
  parts.push(`Score: ${chain.validation.total_score}/100`);
  parts.push(`Confidence: ${chain.validation.confidence_level}`);

  const report = chain.validation.report as Record<string, unknown>;
  if (report.blocks && Array.isArray(report.blocks)) {
    parts.push('\nValidation blocks:');
    for (const block of report.blocks) {
      const b = block as Record<string, unknown>;
      parts.push(`  ${b.name}: ${b.score}/${b.max_score} (${b.status})`);
      if (b.analysis) parts.push(`    ${b.analysis}`);
    }
  }
  if (report.strategic_recommendations) {
    parts.push('\nStrategic recommendations:');
    parts.push(JSON.stringify(report.strategic_recommendations, null, 2));
  }

  parts.push('\n=== COMPETITIVE ANALYSIS ===');
  parts.push('Synthesis:');
  parts.push(JSON.stringify(chain.analysis.synthesis, null, 2));

  parts.push('\nCompetitor profiles:');
  for (const comp of chain.analysis.competitors) {
    parts.push(JSON.stringify(comp, null, 2));
  }

  return parts.join('\n');
}
