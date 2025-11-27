/**
 * Market Ingestion Service
 *
 * Server-side service that fetches markets from Polymarket and saves STATIC data only.
 * Price data (odds, liquidity, volume) is NOT saved - it's fetched live by client API.
 *
 * This follows the "lazy loading" pattern:
 * - Static data (title, description, options, expiry) is stored in PostgreSQL
 * - Dynamic data (prices) is fetched on-demand when client requests it
 */

import { prisma } from '../lib/database.js';
import { getPolymarketClient, type PolymarketMarket } from '../lib/polymarket-client.js';
import { retryWithBackoff } from '../lib/retry.js';

export interface MarketIngestionResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}

/**
 * Extract static market data from Polymarket API response
 * Only includes fields that don't change frequently
 */
function clampOdds(value: number | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0.5;
  }
  // Keep odds within (0,1) to avoid invalid payouts
  return Math.min(Math.max(value, 0.01), 0.99);
}

function extractStaticData(market: PolymarketMarket) {
  // Extract THIS/THAT options from outcomes
  let outcomes: string[] = [];
  if (typeof market.outcomes === 'string') {
    try {
      outcomes = JSON.parse(market.outcomes);
    } catch {
      outcomes = ['YES', 'NO'];
    }
  } else if (Array.isArray(market.outcomes)) {
    outcomes = market.outcomes;
  } else {
    outcomes = ['YES', 'NO'];
  }

  const thisOption = outcomes[0] || 'YES';
  const thatOption = outcomes[1] || 'NO';

  const thisTokenPrice = market.tokens?.find((t) => t.outcome === thisOption)?.price;
  const thatTokenPrice = market.tokens?.find((t) => t.outcome === thatOption)?.price;

  // Determine status from Polymarket fields
  // Priority: archived > accepting_orders > closed > active
  let status: 'open' | 'closed' | 'resolved' = 'open';
  if (market.archived) {
    status = 'closed';
  } else if (market.accepting_orders === true) {
    status = 'open';
  } else if (market.accepting_orders === false || market.closed) {
    status = 'closed';
  }

  // Parse end date
  const endDateStr = market.endDateIso || market.end_date_iso;
  const expiresAt = endDateStr ? new Date(endDateStr) : null;

  return {
    polymarketId: market.conditionId || market.condition_id,
    title: market.question,
    description: market.description || null,
    thisOption,
    thatOption,
    thisOdds: clampOdds(thisTokenPrice),
    thatOdds: clampOdds(thatTokenPrice ?? (thisTokenPrice ? 1 - thisTokenPrice : undefined)),
    liquidity: typeof market.liquidity === 'number' ? Number(market.liquidity) : null,
    category: market.category || null,
    marketType: 'polymarket' as const,
    status,
    expiresAt,
  };
}

/**
 * Ingest markets from Polymarket API and save to PostgreSQL
 * Only saves static data - no prices
 */
export async function ingestMarketsFromPolymarket(options?: {
  limit?: number;
  activeOnly?: boolean;
}): Promise<MarketIngestionResult> {
  const client = getPolymarketClient();
  const limit = options?.limit ?? 500;
  const activeOnly = options?.activeOnly ?? true;

  const result: MarketIngestionResult = {
    total: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  };

  try {
    console.log('[Market Ingestion] Fetching markets from Polymarket...');

    // Retry API call with exponential backoff
    const markets = await retryWithBackoff(
      () =>
        client.getMarkets({
          closed: !activeOnly, // false = active markets
          limit,
          offset: 0,
        }),
      {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
      }
    );

    if (!Array.isArray(markets)) {
      console.error(
        '[Market Ingestion] Invalid response from Polymarket API - expected array, received:',
        markets
      );
      return result;
    }

    result.total = markets.length;
    console.log(`[Market Ingestion] Fetched ${markets.length} markets (limit=${limit}, activeOnly=${activeOnly})`);

    if (markets.length === 0) {
      console.warn('[Market Ingestion] Polymarket returned 0 markets. Possible causes: credit limit reached, API throttling, or upstream outage.');
    }

    for (const market of markets) {
      let staticData: any = null;
      try {
        staticData = extractStaticData(market);

        // Skip if missing required fields
        if (!staticData.polymarketId || !staticData.title) {
          result.skipped++;
          continue;
        }

        // Check if market exists
        const existing = await prisma.market.findUnique({
          where: { polymarketId: staticData.polymarketId },
        });

        if (existing) {
          // Update existing market (only static fields)
          await prisma.market.update({
            where: { polymarketId: staticData.polymarketId },
            data: {
              title: staticData.title,
              description: staticData.description,
              thisOption: staticData.thisOption,
              thatOption: staticData.thatOption,
              thisOdds: staticData.thisOdds,
              thatOdds: staticData.thatOdds,
              liquidity: staticData.liquidity,
              category: staticData.category,
              status: staticData.status,
              expiresAt: staticData.expiresAt,
              updatedAt: new Date(),
            },
          });
          result.updated++;
        } else {
          // Create new market
          await prisma.market.create({
            data: staticData,
          });
          result.created++;
        }
      } catch (error: any) {
        const marketId = staticData?.polymarketId || market?.conditionId || 'unknown';
        console.error(
          `[Market Ingestion] Error processing market ${marketId}:`,
          error.message
        );
        result.errors++;
        // Continue processing other markets even if one fails
      }
    }

    console.log(
      `[Market Ingestion] Complete: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped, ${result.errors} errors`
    );
    return result;
  } catch (error: any) {
    console.error('[Market Ingestion] Fatal error:', error?.message || error);
    // Return partial result instead of throwing to allow job to continue
    return result;
  }
}

/**
 * Get market counts from PostgreSQL
 */
export async function getMarketCounts(): Promise<{
  total: number;
  open: number;
  closed: number;
  resolved: number;
  expiringSoon: number; // Markets expiring in next 24 hours
}> {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [total, open, closed, resolved, expiringSoon] = await Promise.all([
    prisma.market.count(),
    prisma.market.count({ where: { status: 'open' } }),
    prisma.market.count({ where: { status: 'closed' } }),
    prisma.market.count({ where: { status: 'resolved' } }),
    prisma.market.count({
      where: {
        status: 'open',
        expiresAt: {
          gte: now,
          lte: tomorrow,
        },
      },
    }),
  ]);

  return { total, open, closed, resolved, expiringSoon };
}
