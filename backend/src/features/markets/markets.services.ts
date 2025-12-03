/**
 * Markets Service
 *
 * Client-facing service for market data.
 * - Static data comes from PostgreSQL
 * - Live price data is fetched on-demand from Polymarket API
 */

import { marketsPrisma } from '../../lib/database.js';
import { getPolymarketClient } from '../../lib/polymarket-client.js';
import { retryWithBackoffSilent } from '../../lib/retry.js';
import { executeWithFailover, circuitBreakers, createStructuredError } from '../../lib/error-handler.js';

export interface MarketStaticData {
  id: string;
  polymarketId: string | null;
  title: string;
  description: string | null;
  thisOption: string;
  thatOption: string;
  author?: string | null; // Not in schema, kept for compatibility
  category: string | null;
  imageUrl?: string | null; // Not in schema, kept for compatibility
  status: string;
  expiresAt: Date | null;
  thisOdds?: number;
  thatOdds?: number;
  liquidity?: number;
  marketType?: string;
}

export interface MarketLiveData {
  polymarketId: string;
  thisOdds: number;
  thatOdds: number;
  liquidity: number;
  volume: number;
  volume24hr: number;
  acceptingOrders: boolean;
}

export interface MarketWithLiveData extends MarketStaticData {
  live: MarketLiveData | null;
}

/**
 * Get random open markets from the database
 * Returns static data only - no prices
 */
export async function getRandomMarkets(count: number = 10): Promise<MarketStaticData[]> {
  // Get total count of open markets
  const totalOpen = await marketsPrisma.market.count({
    where: { status: 'open' },
  });

  if (totalOpen === 0) {
    return [];
  }

  // Generate random offset for variety
  const maxOffset = Math.max(0, totalOpen - count);
  const randomOffset = Math.floor(Math.random() * maxOffset);

  const markets = await marketsPrisma.market.findMany({
    where: { status: 'open' },
    take: count,
    skip: randomOffset,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      polymarketId: true,
      title: true,
      description: true,
      thisOption: true,
      thatOption: true,
      category: true,
      status: true,
      expiresAt: true,
      marketType: true,
    },
  });

  // Add null values for fields not in schema but expected by interface
  return markets.map(market => ({
    ...market,
    author: null,
    imageUrl: null,
  }));
}

/**
 * Get markets with filtering
 */
export async function getMarkets(options?: {
  status?: 'open' | 'closed' | 'resolved';
  category?: string;
  limit?: number;
  skip?: number;
}): Promise<MarketStaticData[]> {
  const where: any = {};
  
  if (options?.status) {
    where.status = options.status;
  }
  
  if (options?.category) {
    where.category = { equals: options.category, mode: 'insensitive' };
  }

  const markets = await marketsPrisma.market.findMany({
    where,
    take: options?.limit || 100,
    skip: options?.skip || 0,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      polymarketId: true,
      title: true,
      description: true,
      thisOption: true,
      thatOption: true,
      thisOdds: true,
      thatOdds: true,
      liquidity: true,
      category: true,
      status: true,
      expiresAt: true,
      marketType: true,
    },
  });

  return markets.map(m => ({
    id: m.id,
    polymarketId: m.polymarketId,
    title: m.title,
    description: m.description,
    thisOption: m.thisOption,
    thatOption: m.thatOption,
    author: null, // Not in schema
    category: m.category,
    imageUrl: null, // Not in schema
    status: m.status,
    expiresAt: m.expiresAt,
    // Include odds and liquidity from database (may be stale, will be updated with live data)
    thisOdds: m.thisOdds ? Number(m.thisOdds) : undefined,
    thatOdds: m.thatOdds ? Number(m.thatOdds) : undefined,
    liquidity: m.liquidity ? Number(m.liquidity) : undefined,
    marketType: m.marketType,
  })) as MarketStaticData[];
}

/**
 * Get markets by category
 */
export async function getMarketsByCategory(
  category: string,
  limit: number = 20
): Promise<MarketStaticData[]> {
  return getMarkets({ category, limit, status: 'open' });
}

/**
 * Get a single market by ID (static data)
 */
export async function getMarketById(marketId: string): Promise<MarketStaticData | null> {
  const market = await marketsPrisma.market.findUnique({
    where: { id: marketId },
    select: {
      id: true,
      polymarketId: true,
      title: true,
      description: true,
      thisOption: true,
      thatOption: true,
      category: true,
      status: true,
      expiresAt: true,
      marketType: true,
    },
  });

  if (!market) {
    return null;
  }

  // Add null values for fields not in schema but expected by interface
  return {
    ...market,
    author: null,
    imageUrl: null,
  };
}

/**
 * Get a single market by Polymarket ID (static data)
 */
export async function getMarketByPolymarketId(polymarketId: string): Promise<MarketStaticData | null> {
  const market = await marketsPrisma.market.findUnique({
    where: { polymarketId },
    select: {
      id: true,
      polymarketId: true,
      title: true,
      description: true,
      thisOption: true,
      thatOption: true,
      category: true,
      status: true,
      expiresAt: true,
      marketType: true,
    },
  });

  if (!market) {
    return null;
  }

  // Add null values for fields not in schema but expected by interface
  return {
    ...market,
    author: null,
    imageUrl: null,
  };
}

/**
 * Fetch LIVE price data from Polymarket API for a single market
 * This is the "lazy loading" - only fetch prices when client needs them
 */
export async function fetchLivePriceData(polymarketId: string): Promise<MarketLiveData | null> {
  const client = getPolymarketClient();

  // Use circuit breaker and failover for external API calls
  const market = await executeWithFailover(
    () => circuitBreakers.polymarket.execute(
      () => client.getMarket(polymarketId)
    ),
    {
      circuitBreaker: circuitBreakers.polymarket,
      retryOptions: {
        maxRetries: 2, // Fewer retries for client-facing API (faster failure)
        initialDelayMs: 500,
        maxDelayMs: 5000,
      },
      serviceName: 'Polymarket Live Prices',
      fallback: async () => null, // Return null if all retries fail
    }
  );

  if (!market) {
    return null;
  }

  try {

    // Extract odds from tokens
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

    const thisOdds = market.tokens?.find((t) => t.outcome === thisOption)?.price || 0.5;
    const thatOdds = market.tokens?.find((t) => t.outcome === thatOption)?.price || 0.5;

    return {
      polymarketId: market.conditionId || market.condition_id || polymarketId,
      thisOdds,
      thatOdds,
      liquidity: market.liquidity || 0,
      volume: market.volume || 0,
      volume24hr: market.volume_24hr || 0,
      acceptingOrders: market.accepting_orders ?? false,
    };
  } catch (error: any) {
    const structuredError = createStructuredError(error);
    console.error(`[Markets Service] Failed to process live data for ${polymarketId}:`, {
      error: structuredError.message,
      type: structuredError.type,
    });
    return null;
  }
}

/**
 * Fetch LIVE price data for multiple markets (batch)
 * More efficient than calling fetchLivePriceData for each market
 */
export async function fetchBatchLivePriceData(
  polymarketIds: string[]
): Promise<Map<string, MarketLiveData>> {
  const results = new Map<string, MarketLiveData>();

  if (polymarketIds.length === 0) {
    return results;
  }

  // Fetch all markets in parallel
  const promises = polymarketIds.map(async (id) => {
    const liveData = await fetchLivePriceData(id);
    if (liveData) {
      results.set(id, liveData);
    }
  });

  await Promise.all(promises);

  return results;
}

/**
 * Get market with live data combined
 */
export async function getMarketWithLiveData(marketId: string): Promise<MarketWithLiveData | null> {
  try {
    const staticData = await getMarketById(marketId);

    if (!staticData) {
      console.log(`[Markets Service] Market not found: ${marketId}`);
      return null;
    }

    let liveData: MarketLiveData | null = null;
    if (staticData.polymarketId) {
      try {
        liveData = await fetchLivePriceData(staticData.polymarketId);
      } catch (error: any) {
        console.error(`[Markets Service] Error fetching live data for market ${marketId}:`, error.message);
        // Continue without live data - return static data only
        liveData = null;
      }
    } else {
      console.log(`[Markets Service] Market ${marketId} has no polymarketId, skipping live data fetch`);
    }

    return {
      ...staticData,
      live: liveData,
    };
  } catch (error: any) {
    console.error(`[Markets Service] Error in getMarketWithLiveData for ${marketId}:`, error.message);
    throw error; // Re-throw to be handled by controller
  }
}

/**
 * Get total market count
 */
export async function getMarketCount(): Promise<number> {
  return await marketsPrisma.market.count();
}

/**
 * Get all available categories
 */
export async function getCategories(): Promise<string[]> {
  const categories = await marketsPrisma.market.groupBy({
    by: ['category'],
    where: {
      status: 'open',
      category: { not: null },
    },
    _count: true,
    orderBy: { _count: { category: 'desc' } },
  });

  return categories
    .filter((c) => c.category !== null)
    .map((c) => c.category as string);
}
