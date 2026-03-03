import { logger } from '../../shared/logger.js';
import { runValidation } from './validate.js';
import { PROMPT_VERSION } from './prompt.js';
import { config } from '../../shared/config.js';
import { createCycle, updateCycle, fetchNiche, saveValidation } from './store.js';

/* ─── CLI arg helpers ─── */

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= process.argv.length) return undefined;
  return process.argv[idx + 1];
}

/* ─── Main ─── */

async function run(): Promise<void> {
  const startTime = Date.now();
  logger.info('=== Business Validator Agent: Starting ===');

  let cycleId: string | undefined;

  try {
    // Parse CLI args
    const nicheId = getArg('niche-id');
    let idea = getArg('idea');
    let searchTerm: string | undefined;
    let market = getArg('market') ?? 'global english-speaking';

    // Mode 1: Validate by niche ID from DB
    if (nicheId) {
      logger.info(`Mode: niche-id (${nicheId})`);
      const niche = await fetchNiche(nicheId);
      if (!niche) {
        throw new Error(`Niche not found: ${nicheId}`);
      }
      searchTerm = niche.niche_name;
      idea = `${niche.niche_name}. ${niche.description}. ${niche.why_attractive}`;
      logger.info(`Loaded niche: "${niche.niche_name}"`);
    }

    // Mode 2: Validate by text input
    if (!idea) {
      throw new Error('Usage: --niche-id <uuid> OR --idea "business idea" [--market "US"]');
    }

    // Create cycle
    cycleId = await createCycle([idea.slice(0, 100)], PROMPT_VERSION);
    logger.info(`Cycle ${cycleId} created`);

    // Run validation
    logger.info('--- Running web research validation ---');
    const { report, tokensUsed, searchCount, searchQueries } = await runValidation({ idea, market, searchTerm });

    // Save to DB
    logger.info('--- Saving validation report ---');
    const validationId = await saveValidation({
      nicheId,
      idea,
      market,
      report,
      searchCount,
      searchQueries,
      tokensUsed,
      modelUsed: config.validator.model,
      cycleId,
    });

    // Update cycle with actual search queries
    await updateCycle(cycleId, {
      completed_at: new Date().toISOString(),
      status: 'completed',
      niches_saved: 1,
      search_queries_used: searchQueries,
    });

    // Print summary
    const s = report.executive_summary;
    const conf = report.meta.confidence_level;
    logger.info('');
    logger.info('════════════════════════════════════════════════════════');
    logger.info(`  VERDICT: ${s.verdict} (${s.total_score}/100) | Confidence: ${conf}`);
    logger.info(`  ${s.opportunity_headline}`);
    logger.info(`  ${s.critical_insight}`);
    logger.info('════════════════════════════════════════════════════════');
    logger.info('');
    logger.info('Scores by block:');
    for (const block of report.blocks) {
      const bar = '█'.repeat(Math.round(block.score / block.max_score * 10));
      const empty = '░'.repeat(10 - Math.round(block.score / block.max_score * 10));
      logger.info(`  ${block.name.padEnd(25)} ${bar}${empty} ${block.score}/${block.max_score} [${block.status}]`);
    }
    logger.info('');
    logger.info(`Validation saved: ${validationId}`);
    logger.info(`Web searches: ${searchCount} | Tokens: ${tokensUsed.input}+${tokensUsed.output}`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Validation failed', errMsg);
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
