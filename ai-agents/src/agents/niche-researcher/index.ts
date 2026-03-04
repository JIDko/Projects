import { logger } from '../../shared/logger.js';
import { collectAllSignals } from './collect/index.js';
import { extractSignals } from './extract.js';
import { clusterSignals } from './cluster.js';
import { formulateNiches } from './formulate.js';
import { scoreNiches } from './score.js';
import { deduplicateNiches } from './deduplicate.js';
import {
  createCycle, updateCycle, getCycleNumber, fetchAgentConfig,
  saveSignals, saveClusters, saveNichesV2,
} from './store.js';

const PROMPT_VERSION = 'v2-signal-detector';

async function run(): Promise<void> {
  const startTime = Date.now();
  logger.info('=== Niche Researcher v2 "Signal Detector": Starting Cycle ===');

  let cycleId: string | undefined;

  try {
    // Load config from DB (currently unused, but validates DB connectivity)
    const agentConfig = await fetchAgentConfig('niche-researcher');
    if (agentConfig) {
      logger.info('Agent config loaded from DB');
    }

    const cycleNumber = await getCycleNumber();
    logger.info(`Cycle #${cycleNumber}`);

    // ─── Step 1: COLLECT SIGNALS ───
    const rawSignals = await collectAllSignals(cycleNumber);

    // Build query labels for cycle record
    const queryLabels = [...new Set(
      rawSignals.map(s => {
        const meta = s.metadata as Record<string, unknown>;
        return (meta.search_term as string)
          ?? (meta.query as string)
          ?? (meta.seed_keyword as string)
          ?? s.source_type;
      }),
    )];

    cycleId = await createCycle(queryLabels, PROMPT_VERSION);
    await updateCycle(cycleId, { signals_collected: rawSignals.length });
    logger.info(`Cycle ${cycleId} created`);

    // ─── Step 2: EXTRACT & NORMALIZE ───
    const normalizedSignals = await extractSignals(rawSignals);
    await updateCycle(cycleId, { signals_normalized: normalizedSignals.length });

    if (normalizedSignals.length < 5) {
      logger.warn(`Only ${normalizedSignals.length} signals extracted — too few to cluster. Ending cycle.`);
      await updateCycle(cycleId, {
        completed_at: new Date().toISOString(),
        status: 'completed',
        niches_saved: 0,
      });
      return;
    }

    // ─── Step 3: CLUSTER ───
    const clusters = await clusterSignals(normalizedSignals);
    await updateCycle(cycleId, { clusters_formed: clusters.length });

    if (clusters.length === 0) {
      logger.warn('No valid clusters formed. Ending cycle.');
      await updateCycle(cycleId, {
        completed_at: new Date().toISOString(),
        status: 'completed',
        niches_saved: 0,
      });
      return;
    }

    // ─── Step 4: FORMULATE NICHES ───
    const rawNiches = await formulateNiches(clusters, normalizedSignals);
    await updateCycle(cycleId, { niches_generated: rawNiches.length });

    // Safety net: only keep niches whose cluster is valid
    const validNiches = rawNiches.filter(n => {
      const cluster = clusters[n.cluster_index];
      if (!cluster) {
        logger.warn(`Niche "${n.niche_name}" references invalid cluster index ${n.cluster_index} — skipping`);
        return false;
      }
      if (cluster.signal_count < 2) {
        logger.warn(`Niche "${n.niche_name}" cluster has < 2 signals — skipping`);
        return false;
      }
      if (cluster.unique_source_count < 2) {
        logger.warn(`Niche "${n.niche_name}" cluster has < 2 unique sources — skipping`);
        return false;
      }
      return true;
    });
    await updateCycle(cycleId, { niches_after_filter: validNiches.length });

    if (validNiches.length === 0) {
      logger.warn('No niches passed safety net. Ending cycle.');
      await updateCycle(cycleId, {
        completed_at: new Date().toISOString(),
        status: 'completed',
        niches_saved: 0,
      });
      return;
    }

    // ─── Step 5: SCORE & RANK ───
    const scored = scoreNiches(validNiches, clusters);

    // ─── Step 6: DEDUPLICATE & SAVE ───
    const unique = await deduplicateNiches(scored);
    await updateCycle(cycleId, { niches_after_dedup: unique.length });

    const top10 = unique.slice(0, 10);

    // Save all artifacts to DB
    logger.info('--- Saving to database ---');

    // Save signals
    await saveSignals(normalizedSignals, rawSignals, cycleId);

    // Save clusters, get index→UUID mapping
    const clusterIdMap = await saveClusters(clusters, cycleId);

    // Enrich niches with cluster evidence before saving
    for (const niche of top10) {
      const cluster = clusters[niche.cluster_index];
      if (cluster && niche.sample_signals.length === 0) {
        niche.sample_signals = cluster.signal_indices
          .slice(0, 5)
          .filter(i => i >= 0 && i < normalizedSignals.length)
          .map(i => normalizedSignals[i]!.pain_description);
      }
    }

    // Save niches with v2 evidence fields
    const savedCount = await saveNichesV2(top10, cycleId, clusterIdMap, clusters);

    // Complete cycle
    await updateCycle(cycleId, {
      completed_at: new Date().toISOString(),
      status: 'completed',
      niches_saved: savedCount,
    });

    // Summary
    logger.info('');
    logger.info(`=== Cycle #${cycleNumber} Complete ===`);
    logger.info(`Raw signals: ${rawSignals.length} | Normalized: ${normalizedSignals.length} | Clusters: ${clusters.length} | Niches: ${rawNiches.length} | After filters: ${validNiches.length} | After dedup: ${unique.length} | Saved: ${savedCount}`);
    logger.info('');
    logger.info('Top niches:');
    for (const [i, n] of top10.entries()) {
      const flags = n.risk_flags.length > 0 ? ` ⚠ ${n.risk_flags.join(', ')}` : '';
      logger.info(`  #${i + 1} [score: ${n.total_score}] ${n.niche_name} (evidence: ${n.evidence_score}, business: ${n.business_score})${flags}`);
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
