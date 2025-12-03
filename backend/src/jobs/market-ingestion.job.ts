/**
 * Market Ingestion Job
 * Periodically ingests fresh Polymarket markets directly into PostgreSQL.
 */

import cron from 'node-cron';
import { ingestMarketsFromPolymarket } from '../services/market-ingestion.service.js';

let ingestionTask: cron.ScheduledTask | null = null;
let isRunning = false;

async function runIngestion(label: string) {
  if (isRunning) {
    console.log(`[Market Ingestion Job] Skipping ${label} run (already in progress)`);
    return;
  }

  isRunning = true;
  try {
    console.log(`[Market Ingestion Job] Starting ${label} run...`);
    const result = await ingestMarketsFromPolymarket({
      limit: Number(process.env.MARKET_INGEST_LIMIT) || 1000,
      activeOnly: true,
    });
    console.log(
      `[Market Ingestion Job] Completed ${label}: ${result.created} created, ${result.updated} updated, ${result.errors} errors`
    );
  } catch (error: any) {
    console.error('[Market Ingestion Job] Fatal error:', error?.message || error);
  } finally {
    isRunning = false;
  }
}

export function startMarketIngestionJob() {
  if (ingestionTask) {
    console.log('[Market Ingestion Job] Scheduler already running');
    return;
  }

  try {
    const cronExpression = process.env.MARKET_INGEST_CRON || '*/5 * * * *';
    ingestionTask = cron.schedule(cronExpression, () => runIngestion('scheduled'), {
      scheduled: true,
      timezone: 'UTC',
    });

    console.log(`[Market Ingestion Job] Scheduler started (cron: ${cronExpression}, timezone: UTC)`);
    // Kick off an immediate run so we have fresh data as soon as the server boots
    console.log('[Market Ingestion Job] Triggering startup ingestion...');
    runIngestion('startup').catch((error) => {
      console.error('[Market Ingestion Job] Startup run failed:', error?.message || error);
      if (error?.stack) {
        console.error('[Market Ingestion Job] Stack trace:', error.stack);
      }
    });
  } catch (error: any) {
    console.error('[Market Ingestion Job] Failed to start scheduler:', error?.message || error);
    if (error?.stack) {
      console.error('[Market Ingestion Job] Stack trace:', error.stack);
    }
  }
}

export function stopMarketIngestionJob() {
  if (ingestionTask) {
    ingestionTask.stop();
    ingestionTask = null;
    console.log('[Market Ingestion Job] Scheduler stopped');
  }
}


