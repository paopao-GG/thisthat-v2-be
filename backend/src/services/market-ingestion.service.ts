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

import { marketsPrisma as prisma } from '../lib/database.js';
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

  // Derive category from market data
  // Priority: 1) market.category, 2) first tag, 3) derive from title/description
  let category = market.category || null;
  
  if (!category && market.tags && market.tags.length > 0) {
    // Use first tag as category if available
    category = market.tags[0];
  }

  if (!category) {
    // Derive category from title/description keywords
    // Priority order matters - more specific categories checked first
    const titleLower = (market.question || '').toLowerCase();
    const descLower = (market.description || '').toLowerCase();
    const combined = `${titleLower} ${descLower}`;

    // Category keywords mapping (in priority order)
    if (combined.match(/\b(election|vote|voting|ballot|primary|presidential race|electoral|midterm)\b/)) {
      category = 'elections';
    } else if (combined.match(/\b(trump|biden|congress|senate|house|governor|supreme court|white house|politics|political)\b/)) {
      category = 'politics';
    } else if (combined.match(/\b(china|russia|europe|asia|africa|middle east|israel|palestine|iran|korea|war|military|conflict|nato|ukraine)\b/)) {
      category = 'international';
    } else if (combined.match(/\b(company|ceo|merger|acquisition|revenue|earnings|ipo|startup|business|corporate)\b/)) {
      category = 'business';
    } else if (combined.match(/\b(economy|recession|inflation|fed|interest rate|gdp|unemployment|stock market|jobs|economic)\b/)) {
      category = 'economics';
    } else if (combined.match(/\b(technology|ai|artificial intelligence|tech|software|hardware|apple|google|microsoft|openai|tesla|spacex)\b/)) {
      category = 'technology';
    } else if (combined.match(/\b(crypto|bitcoin|ethereum|blockchain|defi|nft|token|coinbase|binance)\b/)) {
      category = 'crypto';
    } else if (combined.match(/\b(sports|football|basketball|soccer|nfl|nba|mlb|championship|super bowl|olympics|fifa)\b/)) {
      category = 'sports';
    } else if (combined.match(/\b(entertainment|movie|tv|celebrity|award|oscar|grammy|netflix|streaming)\b/)) {
      category = 'entertainment';
    } else if (combined.match(/\b(science|research|study|discovery|space|nasa|physics|biology|scientific)\b/)) {
      category = 'science';
    } else {
      // Default category
      category = 'general';
    }
  }

  return {
    polymarketId: market.conditionId || market.condition_id,
    title: market.question,
    description: market.description || null,
    thisOption,
    thatOption,
    thisOdds: clampOdds(thisTokenPrice),
    thatOdds: clampOdds(thatTokenPrice ?? (thisTokenPrice ? 1 - thisTokenPrice : undefined)),
    liquidity: typeof market.liquidity === 'number' ? Number(market.liquidity) : null,
    category,
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
  category?: string;
}): Promise<MarketIngestionResult> {
  const client = getPolymarketClient();
  const totalTarget = options?.limit ?? 1000;
  const activeOnly = options?.activeOnly ?? true;
  const categoryFilter = options?.category?.toLowerCase();
  const maxPageSize = Number(process.env.POLYMARKET_PAGE_SIZE) || 50; // Gamma API returns 50 per page

  const result: MarketIngestionResult = {
    total: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  };

  try {
    console.log('[Market Ingestion] Fetching markets from Polymarket...');
    console.log(`[Market Ingestion] Parameters: limit=${totalTarget}, activeOnly=${activeOnly}, category=${categoryFilter ?? 'ALL'}, pageSize=${maxPageSize}`);

    // Retry API call with exponential backoff and circuit breaker
    const { executeWithFailover, circuitBreakers } = await import('../lib/error-handler.js');

    let offset = 0;
    let fetchedCount = 0;

    // When filtering by category, we need to fetch MORE markets since most will be filtered out
    // Rough category distribution: sports (40%), general (25%), politics (20%), others (15%)
    // So to get 1000 markets in a specific category, we might need to fetch 5000-10000 total
    const fetchMultiplier = categoryFilter ? 10 : 1; // Fetch 10x more when filtering by category
    const adjustedTarget = Math.min(totalTarget * fetchMultiplier, 5000); // Cap at 5000 to avoid overwhelming

    while (fetchedCount < adjustedTarget && result.total < totalTarget) {
      const remaining = adjustedTarget - fetchedCount;
      const batchSize = Math.min(remaining, maxPageSize);

      console.log(`[Market Ingestion] Fetching batch: offset=${offset}, batchSize=${batchSize}`);

      const markets = await executeWithFailover(
        () =>
          circuitBreakers.polymarket.execute(
            () => client.getMarkets({
              closed: !activeOnly, // false = active markets
              limit: batchSize,
              offset,
            })
          ),
        {
          circuitBreaker: circuitBreakers.polymarket,
          retryOptions: {
            maxRetries: 3,
            initialDelayMs: 1000,
            maxDelayMs: 10000,
          },
          serviceName: 'Polymarket Market Ingestion',
          fallback: async () => {
            console.warn('[Market Ingestion] Polymarket API unavailable, returning empty result');
            return [];
          },
        }
      ) || [];
      
      console.log(`[Market Ingestion] API returned ${Array.isArray(markets) ? markets.length : 'non-array'} markets for offset ${offset}`);

      if (!Array.isArray(markets)) {
        console.error(
          '[Market Ingestion] Invalid response from Polymarket API - expected array, received:',
          markets
        );
        break;
      }

      if (markets.length === 0) {
        console.warn('[Market Ingestion] Polymarket returned 0 markets for this batch. Ending pagination early.');
        break;
      }

      fetchedCount += markets.length;
      offset += markets.length;

      console.log(
        `[Market Ingestion] Processing ${markets.length} markets from batch (filtering for category: ${categoryFilter || 'ALL'})`
      );

      for (const market of markets) {
      let staticData: any = null;
      try {
        staticData = extractStaticData(market);

        // Skip if missing required fields
        if (!staticData.polymarketId || !staticData.title) {
          result.skipped++;
          continue;
        }

        // Filter by category AFTER we've categorized the market
        if (categoryFilter && staticData.category !== categoryFilter) {
          result.skipped++;
          continue;
        }

        result.total++;

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

      if (markets.length < batchSize) {
        console.log('[Market Ingestion] Received fewer markets than requested, assuming end of data');
        break;
      }
    }

    console.log(
      `[Market Ingestion] Complete: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped, ${result.errors} errors (total processed: ${result.total})`
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
