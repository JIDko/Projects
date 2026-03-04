import { logger } from '../../shared/logger.js';
import { config } from '../../shared/config.js';
import { PROMPT_VERSION } from './prompt.js';
import { buildDiscoveryQueries, buildDeepDiveQueries, runSearches, formatSearchContext } from './search.js';
import { runDiscovery } from './discover.js';
import { runDeepDive } from './deep-dive.js';
import { runSynthesis } from './synthesize.js';
import { createCycle, updateCycle, fetchValidation, saveCompetitiveAnalysis } from './store.js';
import type { CompetitorProfile } from './parse.js';

async function main() {
  const args = process.argv.slice(2);

  // Parse --validation-id
  const vidIdx = args.indexOf('--validation-id');
  if (vidIdx === -1 || !args[vidIdx + 1]) {
    console.error('Usage: npx tsx src/agents/competitive-intel/index.ts --validation-id <uuid>');
    process.exitCode = 1;
    return;
  }
  const validationId = args[vidIdx + 1]!;

  logger.info('=== Competitive Intelligence Agent ===');
  logger.info(`Validation ID: ${validationId}`);

  // 1. Fetch validation from DB
  const validation = await fetchValidation(validationId);
  if (!validation) {
    logger.error(`Validation ${validationId} not found`);
    process.exitCode = 1;
    return;
  }

  const { idea, market, report } = validation;
  logger.info(`Idea: "${idea}"`);
  logger.info(`Market: ${market}`);

  // Extract competitive_landscape block if available
  const compBlock = report.blocks?.find(b => b.name === 'competitive_landscape');
  const competitorHints = compBlock?.key_findings ?? [];

  // 2. Create cycle
  const allSearchQueries: string[] = [];
  const cycleId = await createCycle([], PROMPT_VERSION);
  logger.info(`Cycle: ${cycleId}`);

  const totalTokens = { input: 0, output: 0 };

  try {
    // ═══════════════════════════════════════════
    // Phase 1: Discovery
    // ═══════════════════════════════════════════
    logger.info('\n--- Phase 1: Discovery ---');

    const discoveryQueries = buildDiscoveryQueries(idea, market, competitorHints);
    allSearchQueries.push(...discoveryQueries.map(q => typeof q === 'string' ? q : q.q));

    const discoverySearchResults = await runSearches(discoveryQueries);
    const discoveryContext = formatSearchContext(discoverySearchResults);

    const discovery = await runDiscovery({
      idea,
      market,
      competitiveLandscapeBlock: compBlock ? {
        analysis: compBlock.analysis,
        key_findings: compBlock.key_findings,
        sources: compBlock.sources,
      } : undefined,
      searchContext: discoveryContext,
    });

    totalTokens.input += discovery.tokensUsed.input;
    totalTokens.output += discovery.tokensUsed.output;

    const competitors = discovery.result.competitors;
    logger.info(`Discovered ${competitors.length} competitors`);

    // ═══════════════════════════════════════════
    // Phase 2: Deep Dive (sequential per competitor)
    // ═══════════════════════════════════════════
    logger.info('\n--- Phase 2: Deep Dive ---');

    const profiles: CompetitorProfile[] = [];

    for (const comp of competitors) {
      logger.info(`\nAnalyzing: ${comp.name}`);

      const ddQueries = buildDeepDiveQueries(comp.name, idea, market);
      allSearchQueries.push(...ddQueries.map(q => typeof q === 'string' ? q : q.q));

      const ddSearchResults = await runSearches(ddQueries);
      const ddContext = formatSearchContext(ddSearchResults);

      const deepDive = await runDeepDive(comp, idea, market, ddContext);

      totalTokens.input += deepDive.tokensUsed.input;
      totalTokens.output += deepDive.tokensUsed.output;

      profiles.push(deepDive.profile);
      logger.info(`  ✓ ${comp.name} profile complete`);
    }

    // ═══════════════════════════════════════════
    // Phase 3: Synthesis
    // ═══════════════════════════════════════════
    logger.info('\n--- Phase 3: Synthesis ---');

    const synthesis = await runSynthesis({
      idea,
      market,
      validationVerdict: validation.verdict,
      validationScore: validation.total_score,
      competitors: profiles,
    });

    totalTokens.input += synthesis.tokensUsed.input;
    totalTokens.output += synthesis.tokensUsed.output;

    // ═══════════════════════════════════════════
    // Save to DB
    // ═══════════════════════════════════════════
    logger.info('\n--- Saving results ---');

    const analysisId = await saveCompetitiveAnalysis({
      validationId,
      idea,
      market,
      competitors: profiles,
      synthesis: synthesis.result,
      totalSearches: allSearchQueries.length,
      searchQueries: allSearchQueries,
      tokensUsed: totalTokens,
      modelUsed: config.competitive.model,
      cycleId,
    });

    await updateCycle(cycleId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      search_queries_used: allSearchQueries,
    });

    // Print summary
    logger.info('\n=== RESULTS ===');
    logger.info(`Competitive analysis saved: ${analysisId}`);
    logger.info(`Competitors analyzed: ${profiles.length}`);
    for (const p of profiles) {
      logger.info(`  • ${p.name}: ${p.strengths.length} strengths, ${p.weaknesses.length} weaknesses`);
    }
    logger.info(`Attack vectors: ${synthesis.result.attack_vectors.length}`);
    logger.info(`Feature priorities: ${synthesis.result.feature_priority_matrix.length}`);
    logger.info(`Total searches: ${allSearchQueries.length}`);
    logger.info(`Total tokens: ${totalTokens.input} in / ${totalTokens.output} out`);

    // Print analysisId to stdout for API route to capture
    console.log(`Competitive analysis saved: ${analysisId}`);
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
