/**
 * Markets Service
 *
 * Client-facing service for market data.
 * - Static data comes from PostgreSQL
 * - Live price data is fetched on-demand from Polymarket API
 */

import { prisma } from '../../lib/database.js';
import { getPolymarketClient } from '../../lib/polymarket-client.js';
import { retryWithBackoffSilent } from '../../lib/retry.js';

export interface MarketStaticData {
  id: string;
  polymarketId: string | null;
  title: string;
  description: string | null;
  thisOption: string;
  thatOption: string;
  author: string | null;
  category: string | null;
  imageUrl: string | null;
  status: string;
  expiresAt: Date | null;
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
  const totalOpen = await prisma.market.count({
    where: { status: 'open' },
  });

  if (totalOpen === 0) {
    return [];
  }

  // Generate random offset for variety
  const maxOffset = Math.max(0, totalOpen - count);
  const randomOffset = Math.floor(Math.random() * maxOffset);

  const markets = await prisma.market.findMany({
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
      author: true,
      category: true,
      imageUrl: true,
      status: true,
      expiresAt: true,
    },
  });

  return markets;
}

/**
 * Get markets by category
 */
export async function getMarketsByCategory(
  category: string,
  limit: number = 20
): Promise<MarketStaticData[]> {
  const markets = await prisma.market.findMany({
    where: {
      status: 'open',
      category: { equals: category, mode: 'insensitive' },
    },
    take: limit,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      polymarketId: true,
      title: true,
      description: true,
      thisOption: true,
      thatOption: true,
      author: true,
      category: true,
      imageUrl: true,
      status: true,
      expiresAt: true,
    },
  });

  return markets;
}

/**
 * Get a single market by ID (static data)
 */
export async function getMarketById(marketId: string): Promise<MarketStaticData | null> {
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    select: {
      id: true,
      polymarketId: true,
      title: true,
      description: true,
      thisOption: true,
      thatOption: true,
      author: true,
      category: true,
      imageUrl: true,
      status: true,
      expiresAt: true,
    },
  });

  return market;
}

/**
 * Get a single market by Polymarket ID (static data)
 */
export async function getMarketByPolymarketId(polymarketId: string): Promise<MarketStaticData | null> {
  const market = await prisma.market.findUnique({
    where: { polymarketId },
    select: {
      id: true,
      polymarketId: true,
      title: true,
      description: true,
      thisOption: true,
      thatOption: true,
      author: true,
      category: true,
      imageUrl: true,
      status: true,
      expiresAt: true,
    },
  });

  return market;
}

/**
 * Fetch LIVE price data from Polymarket API for a single market
 * This is the "lazy loading" - only fetch prices when client needs them
 */
export async function fetchLivePriceData(polymarketId: string): Promise<MarketLiveData | null> {
  const client = getPolymarketClient();

  try {
    // Retry API call with exponential backoff (silent - returns null on failure)
    const market = await retryWithBackoffSilent(
      () => client.getMarket(polymarketId),
      {
        maxRetries: 2, // Fewer retries for client-facing API (faster failure)
        initialDelayMs: 500,
        maxDelayMs: 5000,
      }
    );

    if (!market) {
      return null;
    }

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
    // Error already logged by retryWithBackoffSilent
    console.error(`[Markets Service] Failed to fetch live data for ${polymarketId} after retries`);
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
  const staticData = await getMarketById(marketId);

  if (!staticData) {
    return null;
  }

  let liveData: MarketLiveData | null = null;
  if (staticData.polymarketId) {
    liveData = await fetchLivePriceData(staticData.polymarketId);
  }

  return {
    ...staticData,
    live: liveData,
  };
}

/**
 * Get all available categories
 */
export async function getCategories(): Promise<string[]> {
  const categories = await prisma.market.groupBy({
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
