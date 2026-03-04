import { logger } from '../../shared/logger.js';
import { config } from '../../shared/config.js';
import { PROMPT_VERSION } from './prompt.js';
import { createCycle, updateCycle, saveProductSpec } from './store.js';
import { assembleContext } from './context.js';
import { runResearch } from './research.js';
import { runSpecification } from './specify.js';
import { scoreProductSpec } from './validate.js';

async function main() {
  const args = process.argv.slice(2);

  // Parse --competitive-analysis-id
  const caIdx = args.indexOf('--competitive-analysis-id');
  if (caIdx === -1 || !args[caIdx + 1]) {
    console.error('Usage: npx tsx src/agents/product-architect/index.ts --competitive-analysis-id <uuid>');
    process.exitCode = 1;
    return;
  }
  const competitiveAnalysisId = args[caIdx + 1]!;

  logger.info('=== Product Architect Agent ===');
  logger.info(`Competitive Analysis ID: ${competitiveAnalysisId}`);

  const allSearchQueries: string[] = [];
  const cycleId = await createCycle([], PROMPT_VERSION);
  logger.info(`Cycle: ${cycleId}`);

  const totalTokens = { input: 0, output: 0 };

  try {
    // ═══════════════════════════════════════════
    // Phase 1: Context Assembly
    // ═══════════════════════════════════════════
    logger.info('\n--- Phase 1: Context Assembly ---');
    const { chain, contextSummary } = await assembleContext(competitiveAnalysisId);
    logger.info(`Idea: "${chain.analysis.idea}"`);
    logger.info(`Verdict: ${chain.validation.verdict}, Score: ${chain.validation.total_score}`);

    // ═══════════════════════════════════════════
    // Phase 2: Product Research
    // ═══════════════════════════════════════════
    logger.info('\n--- Phase 2: Product Research ---');
    const research = await runResearch(
      chain.analysis.idea,
      chain.analysis.market,
      chain.analysis.competitors,
    );
    allSearchQueries.push(...research.queriesUsed);

    // ═══════════════════════════════════════════
    // Phase 3: Product Specification
    // ═══════════════════════════════════════════
    logger.info('\n--- Phase 3: Product Specification ---');
    const spec = await runSpecification(contextSummary, research.searchContext);
    totalTokens.input += spec.tokensUsed.input;
    totalTokens.output += spec.tokensUsed.output;

    // ═══════════════════════════════════════════
    // Phase 4: Validation & Scoring
    // ═══════════════════════════════════════════
    logger.info('\n--- Phase 4: Validation & Scoring ---');
    const validation = scoreProductSpec(spec.result);

    // ═══════════════════════════════════════════
    // Save to DB
    // ═══════════════════════════════════════════
    logger.info('\n--- Saving results ---');
    const specId = await saveProductSpec({
      competitiveAnalysisId,
      idea: chain.analysis.idea,
      market: chain.analysis.market,
      spec: spec.result,
      totalScore: validation.totalScore,
      scoreBreakdown: validation.breakdown,
      readiness: validation.readiness,
      totalSearches: allSearchQueries.length,
      searchQueries: allSearchQueries,
      tokensUsed: totalTokens,
      modelUsed: config.architect.model,
      cycleId,
    });

    await updateCycle(cycleId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      search_queries_used: allSearchQueries,
    });

    // Print summary
    logger.info('\n=== RESULTS ===');
    logger.info(`Product spec saved: ${specId}`);
    logger.info(`Score: ${validation.totalScore}/100 (${validation.readiness})`);
    logger.info(`Product: ${spec.result.vision.product_name}`);
    logger.info(`MVP features: ${spec.result.features.mvp_features.length}`);
    logger.info(`Pricing tiers: ${spec.result.monetization.pricing_tiers.length}`);
    logger.info(`Total searches: ${allSearchQueries.length}`);
    logger.info(`Total tokens: ${totalTokens.input} in / ${totalTokens.output} out`);

    // Print specId to stdout for API route to capture
    console.log(`Product spec saved: ${specId}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Agent failed:', message);

    await updateCycle(cycleId, {
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: message,
      search_queries_used: allSearchQueries,
    });

    process.exitCode = 1;
  }
}

main();
