import { logger } from '../../shared/logger.js';
import type { Niche } from '../../shared/types.js';
import { pickQueries } from './queries.js';
import { searchTrends } from './search.js';
import { generateNicheIdeas, PROMPT_VERSION, setSystemPrompt } from './generate.js';
import { deduplicateNiches } from './deduplicate.js';
import { applyFilters } from './filter.js';
import { scoreNiches, setWeights } from './score.js';
import { createCycle, updateCycle, saveNiches, fetchPastRejections, getCycleNumber, fetchAgentConfig } from './store.js';
import { searchReddit } from './reddit.js';
import { searchTrendsGoogle } from './trends.js';
import { fetchValidatedPains, buildPainSignalsContext } from './pain-signals.js';
import type { SearchResult } from './search.js';

/* ─── Detect mode from CLI args ─── */
const isPainDrivenMode = process.argv.includes('--pain-driven');

async function run(): Promise<void> {
  const startTime = Date.now();
  const modeLabel = isPainDrivenMode ? 'PAIN-DRIVEN' : 'STANDALONE';
  logger.info(`=== Niche Researcher Agent [${modeLabel}]: Starting Cycle ===`);

  let cycleId: string | undefined;

  try {
    // Load config from DB (if configured via dashboard)
    const dbConfig = await fetchAgentConfig('niche-researcher');
    if (dbConfig) {
      const cfg = dbConfig.config as Record<string, unknown> | undefined;
      if (dbConfig.system_prompt) {
        const version = (cfg?.prompt_version as string) ?? 'custom';
        setSystemPrompt(dbConfig.system_prompt, version);
      }
      if (cfg?.weights) {
        setWeights(cfg.weights as Record<string, number>);
      }
    }

    const cycleNumber = await getCycleNumber();
    const cfg = (dbConfig?.config as Record<string, unknown>) ?? {};

    let allResults: SearchResult[] = [];
    let allQueryLabels: string[] = [];
    let painSignalsContext = '';
    let validatedPainIds: string[] = [];

    if (isPainDrivenMode) {
      // ═══════════════════════════════════════════
      // MODE 2: PAIN-DRIVEN — ниши на основе болей
      // ═══════════════════════════════════════════
      logger.info('--- Mode: PAIN-DRIVEN — generating niches from validated pains ---');

      const painLinkingConfig = (cfg.pain_linking as Record<string, unknown>) ?? {};
      const threshold = (painLinkingConfig.validation_threshold as number) ?? 5;
      const maxPains = (painLinkingConfig.max_pains_to_inject as number) ?? 20;

      const validatedPains = await fetchValidatedPains(threshold, maxPains);
      if (validatedPains.length === 0) {
        logger.warn(`No validated pains found (threshold: ${threshold}+ mentions). Nothing to do in pain-driven mode.`);
        logger.info('Run Pain Hunter more cycles to accumulate pain signals, or use standalone mode: npm run agent:niche');
        return;
      }

      painSignalsContext = buildPainSignalsContext(validatedPains);
      validatedPainIds = validatedPains.map(p => p.id);
      logger.info(`Loaded ${validatedPains.length} validated pains as primary input`);

      // In pain-driven mode we still collect some search data for context,
      // but it's secondary — pains are the primary signal
      logger.info('--- Collecting supplementary search data ---');
      const queries = pickQueries(2, cycleNumber); // fewer queries — pains are primary
      const [searchResults, redditResults] = await Promise.all([
        searchTrends(queries),
        searchReddit(cycleNumber),
      ]);
      allResults = [...searchResults, ...redditResults];
      allQueryLabels = [
        ...queries,
        ...redditResults.map(r => r.query),
        ...validatedPains.map(p => `pain: ${p.pain_name.slice(0, 50)}`),
      ];

      logger.info(`Supplementary data: ${allResults.reduce((s, r) => s + r.snippets.length, 0)} snippets`);

    } else {
      // ═══════════════════════════════════════════
      // MODE 1: STANDALONE — оригинальная логика
      // ═══════════════════════════════════════════
      logger.info('--- Mode: STANDALONE — generating niches from search data ---');

      const queries = pickQueries(4, cycleNumber);
      logger.info(`Cycle #${cycleNumber}, using queries: ${queries.join(', ')}`);

      // Step 1: Collect data from all sources in parallel
      logger.info('--- Step 1: Collecting data from Google, Reddit, Trends ---');
      const [searchResults, redditResults, trendsResults] = await Promise.all([
        searchTrends(queries),
        searchReddit(cycleNumber),
        searchTrendsGoogle(cycleNumber),
      ]);

      allResults = [...searchResults, ...redditResults, ...trendsResults];
      const totalSnippets = allResults.reduce((sum, r) => sum + r.snippets.length, 0);
      if (totalSnippets === 0) {
        throw new Error('All data sources returned 0 snippets — no data for GPT-4o');
      }
      logger.info(`Total snippets collected: ${totalSnippets} (Google: ${searchResults.length}, Reddit: ${redditResults.length}, Trends: ${trendsResults.length})`);

      allQueryLabels = [
        ...queries,
        ...redditResults.map(r => r.query),
        ...trendsResults.map(r => r.query),
      ];
    }

    // Create cycle record
    cycleId = await createCycle(allQueryLabels, PROMPT_VERSION);
    logger.info(`Cycle ${cycleId} created`);

    // Step 2: Fetch past rejections (both modes)
    logger.info('--- Loading past rejections ---');
    const pastRejections = await fetchPastRejections();
    logger.info(`Loaded ${pastRejections.length} past rejections`);

    // Step 3: Generate niche ideas
    logger.info('--- Generating niche ideas ---');
    const rawNiches = await generateNicheIdeas(allResults, pastRejections, cycleNumber, painSignalsContext, isPainDrivenMode);
    await updateCycle(cycleId, { niches_generated: rawNiches.length });

    // Step 4: Deduplicate
    logger.info('--- Deduplication ---');
    const uniqueNiches = await deduplicateNiches(rawNiches);
    await updateCycle(cycleId, { niches_after_dedup: uniqueNiches.length });

    // Step 5: Filter
    logger.info('--- Applying filters ---');
    const filtered = applyFilters(uniqueNiches);
    const passing = filtered.filter(n => n.passed);
    await updateCycle(cycleId, { niches_after_filter: passing.length });

    if (passing.length === 0) {
      logger.warn('No niches passed all filters. Cycle ends with 0 results.');
      await updateCycle(cycleId, {
        completed_at: new Date().toISOString(),
        status: 'completed',
        niches_saved: 0,
      });
      return;
    }

    // Step 6: Score
    logger.info('--- Scoring ---');
    const scored = scoreNiches(passing);

    // Step 7: Save top 10
    logger.info('--- Saving top 10 ---');
    const nichesToSave: Niche[] = scored
      .sort((a, b) => b.total_score - a.total_score)
      .slice(0, 10)
      .map(s => ({
        niche_name: s.niche_name,
        description: s.description,
        why_attractive: s.why_attractive,
        margin_potential: s.margin_potential,
        startup_capital: s.startup_capital,
        time_to_revenue: s.time_to_revenue,
        market_size: s.market_size,
        market_growth: s.market_growth,
        ai_automation_score: s.ai_automation_score,
        competition_level: s.competition_level,
        organic_traffic_potential: s.organic_traffic_potential,
        risk_flags: s.risk_flags,
        confidence_level: s.confidence_level,
        sources: s.sources,
        total_score: s.total_score,
        cycle_id: cycleId!,
        status: 'active' as const,
        source_pain_ids: validatedPainIds,
      }));

    const savedCount = await saveNiches(nichesToSave);

    // Step 8: Complete cycle
    await updateCycle(cycleId, {
      completed_at: new Date().toISOString(),
      status: 'completed',
      niches_saved: savedCount,
    });

    // Print summary
    logger.info('');
    logger.info(`=== Cycle #${cycleNumber} [${modeLabel}] Complete ===`);
    logger.info(`Generated: ${rawNiches.length} | After dedup: ${uniqueNiches.length} | After filters: ${passing.length} | Saved: ${savedCount}`);
    if (isPainDrivenMode) {
      logger.info(`Pain signals used: ${validatedPainIds.length} validated pains`);
    }
    logger.info('');
    logger.info('Top 10 niches:');
    for (const [i, n] of nichesToSave.entries()) {
      const flags = n.risk_flags.length > 0 ? ` ⚠ ${n.risk_flags.join(', ')}` : '';
      logger.info(`  #${i + 1} [score: ${n.total_score}] ${n.niche_name} — margin:${n.margin_potential}% growth:${n.market_growth}% ai:${n.ai_automation_score}%${flags}`);
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Cycle failed', errMsg);
    if (cycleId) {
      await updateCycle(cycleId, {
        completed_at: new Date().toISOString(),
        status: 'failed',
        error_message: errMsg,
      });
    }
    process.exitCode = 1;
  } finally {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.info(`Total time: ${elapsed}s`);
  }
}

run().catch(err => {
  logger.error('Fatal error', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
