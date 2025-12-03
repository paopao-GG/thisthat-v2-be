/**
 * Category Prefetch Job
 *
 * Intelligent prefetching system that monitors category levels and automatically
 * fetches markets when categories are running low.
 *
 * Features:
 * - Runs every 5 minutes to check category levels
 * - Prefetches 1000 markets per category when below minimum threshold
 * - Respects maximum limit of 10,000 markets per category
 * - Prevents concurrent runs
 * - Logs detailed statistics
 */

import cron from 'node-cron';
import {
  getAllCategoryStats,
  getCategoriesNeedingPrefetch,
  calculatePrefetchAmount,
  getSystemStats,
  CATEGORIES,
} from '../services/category-monitor.service.js';
import { ingestMarketsFromPolymarket } from '../services/market-ingestion.service.js';

let prefetchTask: cron.ScheduledTask | null = null;
let isRunning = false;

/**
 * Run prefetch for categories that need it
 */
async function runCategoryPrefetch(label: string) {
  if (isRunning) {
    console.log(`[Category Prefetch Job] Skipping ${label} run (already in progress)`);
    return;
  }

  isRunning = true;
  const startTime = Date.now();

  try {
    console.log(`\n[Category Prefetch Job] ========== ${label.toUpperCase()} RUN ==========`);

    // Get system overview
    const systemStats = await getSystemStats();
    console.log(`[Category Prefetch Job] System Overview:`);
    console.log(`  - Total markets: ${systemStats.totalMarkets}`);
    console.log(`  - Total open markets: ${systemStats.totalOpen}`);
    console.log(`  - Average per category: ${systemStats.averageMarketsPerCategory.toFixed(1)}`);
    console.log(`  - Categories needing prefetch: ${systemStats.categoriesNeedingPrefetch}`);
    console.log(`  - Categories at capacity: ${systemStats.categoriesAtCapacity}`);

    // Get detailed stats per category
    const categoryStats = await getAllCategoryStats();
    console.log(`\n[Category Prefetch Job] Category Status:`);
    categoryStats.forEach((stat) => {
      const status = stat.needsPrefetch
        ? '🔴 LOW'
        : stat.count >= stat.maxCount
        ? '🟢 FULL'
        : '🟡 OK';
      console.log(
        `  ${status} ${stat.category.padEnd(15)} ${stat.count.toString().padStart(5)} / ${stat.maxCount} markets`
      );
    });

    // Get categories that need prefetching
    const categoriesToPrefetch = await getCategoriesNeedingPrefetch();

    if (categoriesToPrefetch.length === 0) {
      console.log(`\n[Category Prefetch Job] ✅ All categories have sufficient markets`);
      return;
    }

    console.log(
      `\n[Category Prefetch Job] 📥 Prefetching for ${categoriesToPrefetch.length} categories: ${categoriesToPrefetch.join(', ')}`
    );

    // Prefetch for each category that needs it
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalErrors = 0;

    for (const category of categoriesToPrefetch) {
      const stat = categoryStats.find((s) => s.category === category);
      if (!stat) continue;

      const amountToFetch = calculatePrefetchAmount(stat.count);
      if (amountToFetch === 0) {
        console.log(`[Category Prefetch Job] ⏭️  Skipping ${category} (already at capacity)`);
        continue;
      }

      console.log(
        `\n[Category Prefetch Job] 🔄 Fetching ${amountToFetch} markets for "${category}"...`
      );

      try {
        const result = await ingestMarketsFromPolymarket({
          limit: amountToFetch,
          activeOnly: true,
          category,
        });

        totalCreated += result.created;
        totalUpdated += result.updated;
        totalErrors += result.errors;

        console.log(
          `[Category Prefetch Job] ✅ "${category}" complete: ${result.created} created, ${result.updated} updated, ${result.errors} errors`
        );
      } catch (error: any) {
        console.error(`[Category Prefetch Job] ❌ Error prefetching "${category}":`, error.message);
        totalErrors++;
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n[Category Prefetch Job] ========== SUMMARY ==========`);
    console.log(`  - Duration: ${duration}s`);
    console.log(`  - Categories processed: ${categoriesToPrefetch.length}`);
    console.log(`  - Total created: ${totalCreated}`);
    console.log(`  - Total updated: ${totalUpdated}`);
    console.log(`  - Total errors: ${totalErrors}`);
    console.log(`[Category Prefetch Job] ========== COMPLETE ==========\n`);
  } catch (error: any) {
    console.error('[Category Prefetch Job] Fatal error:', error?.message || error);
    if (error?.stack) {
      console.error('[Category Prefetch Job] Stack trace:', error.stack);
    }
  } finally {
    isRunning = false;
  }
}

/**
 * Start the category prefetch job
 */
export function startCategoryPrefetchJob() {
  if (prefetchTask) {
    console.log('[Category Prefetch Job] Scheduler already running');
    return;
  }

  try {
    // Run every 5 minutes
    const cronExpression = process.env.CATEGORY_PREFETCH_CRON || '*/5 * * * *';
    prefetchTask = cron.schedule(cronExpression, () => runCategoryPrefetch('scheduled'), {
      scheduled: true,
      timezone: 'UTC',
    });

    console.log(
      `[Category Prefetch Job] ✅ Scheduler started (cron: ${cronExpression}, timezone: UTC)`
    );
    console.log(
      `[Category Prefetch Job] Will check categories every 5 minutes and prefetch when needed`
    );

    // Run immediately on startup
    console.log('[Category Prefetch Job] Triggering startup check...');
    runCategoryPrefetch('startup').catch((error) => {
      console.error('[Category Prefetch Job] Startup run failed:', error?.message || error);
    });
  } catch (error: any) {
    console.error('[Category Prefetch Job] Failed to start scheduler:', error?.message || error);
    if (error?.stack) {
      console.error('[Category Prefetch Job] Stack trace:', error.stack);
    }
  }
}

/**
 * Stop the category prefetch job
 */
export function stopCategoryPrefetchJob() {
  if (prefetchTask) {
    prefetchTask.stop();
    prefetchTask = null;
    console.log('[Category Prefetch Job] Scheduler stopped');
  }
}

/**
 * Manually trigger prefetch (for testing/admin use)
 */
export async function triggerManualPrefetch(): Promise<void> {
  await runCategoryPrefetch('manual');
}
