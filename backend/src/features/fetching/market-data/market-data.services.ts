// Market data service - Fetch, normalize, and save
import { getPolymarketClient, type PolymarketMarket } from '../../../lib/polymarket-client.js';
import { getDatabase } from '../../../lib/mongodb.js';
import type { FlattenedMarket, MarketStats } from './market-data.models.js';

const COLLECTION_NAME = 'markets';

/**
 * Normalize Polymarket market data to our flat structure
 * 
 * IMPORTANT: Per lazy loading pattern (docs/MARKET_FETCHING.md):
 * - Only stores STATIC fields (id, title, description, author, category, expiresAt)
 * - Does NOT store price fields (thisOdds, thatOdds, liquidity, volume)
 * - Prices are fetched on-demand from Polymarket API when client needs them
 */
export function normalizeMarket(polymarketData: PolymarketMarket): FlattenedMarket {
  // Extract THIS/THAT from outcomes (binary markets)
  // Note: Polymarket API returns outcomes as a JSON string, so we need to parse it
  let outcomes: string[] = [];
  if (typeof polymarketData.outcomes === 'string') {
    try {
      outcomes = JSON.parse(polymarketData.outcomes);
    } catch (e) {
      console.warn('Failed to parse outcomes string:', polymarketData.outcomes);
      outcomes = ['YES', 'NO'];
    }
  } else if (Array.isArray(polymarketData.outcomes)) {
    outcomes = polymarketData.outcomes;
  } else {
    outcomes = ['YES', 'NO'];
  }

  const thisOption = outcomes[0] || 'YES';
  const thatOption = outcomes[1] || 'NO';

  // NOTE: Price extraction removed - prices should NOT be stored per lazy loading pattern
  // Prices (thisOdds, thatOdds, liquidity, volume) are fetched on-demand from Polymarket API

  // Determine status
  // Note: Polymarket's 'active' and 'closed' fields are unreliable
  // 'accepting_orders' is the ONLY reliable indicator of market status
  // Priority: archived > accepting_orders (true indicator) > fallback to closed/active
  let status: 'active' | 'closed' | 'archived' = 'closed';

  if (polymarketData.archived) {
    status = 'archived';
  } else if (polymarketData.accepting_orders === true) {
    // Market is truly active and accepting bets (regardless of 'closed' field)
    status = 'active';
  } else if (polymarketData.accepting_orders === false) {
    // Market exists but not accepting orders
    status = 'closed';
  } else if (polymarketData.closed) {
    // Fallback: use closed field if accepting_orders not available
    status = 'closed';
  } else if (polymarketData.active === true) {
    // Fallback: use active field if neither accepting_orders nor closed available
    status = 'active';
  }

  // Parse end date (expiresAt)
  const endDateStr = polymarketData.endDateIso || polymarketData.end_date_iso;

  return {
    conditionId: polymarketData.conditionId || polymarketData.condition_id,
    questionId: polymarketData.questionID || polymarketData.question_id,
    marketSlug: polymarketData.marketSlug || polymarketData.market_slug,

    // Static content fields (STORED)
    question: polymarketData.question,
    description: polymarketData.description,
    author: polymarketData.submitted_by, // Market creator/author

    // Binary options (STATIC - stored)
    thisOption,
    thatOption,

    // Price fields - NOT STORED per lazy loading pattern
    // These should be undefined - prices fetched on-demand from Polymarket API
    thisOdds: undefined,
    thatOdds: undefined,
    volume: undefined,
    volume24hr: undefined,
    liquidity: undefined,

    // Metadata (STATIC - stored)
    category: polymarketData.category,
    tags: polymarketData.tags,
    status,
    featured: polymarketData.featured,

    // Dates (STATIC - stored)
    startDate: polymarketData.gameStartTime || polymarketData.game_start_time,
    endDate: endDateStr, // Market expiration/due date

    // Source tracking
    source: 'polymarket',
    // rawData removed to save space - can be fetched from Polymarket API if needed

    // Timestamps
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Fetch markets from Polymarket and save to MongoDB
 * 
 * LEGACY: This endpoint is deprecated. Use PostgreSQL-based market ingestion instead.
 * 
 * Per lazy loading pattern (docs/MARKET_FETCHING.md):
 * - Only saves STATIC fields (id, title, description, author, category, expiresAt)
 * - Does NOT save price fields (thisOdds, thatOdds, liquidity, volume)
 * - Prices are fetched on-demand from Polymarket API when client requests them
 */
export async function fetchAndSaveMarkets(options?: {
  active?: boolean;
  limit?: number;
}): Promise<{ saved: number; errors: number }> {
  const client = getPolymarketClient();
  const db = await getDatabase();
  const collection = db.collection<FlattenedMarket>(COLLECTION_NAME);

  try {
    console.log('📡 Fetching markets from Polymarket Gamma API...');
    // Use Gamma API filtering - closed=false means active markets
    const allMarkets = await client.getMarkets({
      closed: options?.active === false, // false = active markets, true = closed markets
      limit: options?.limit ?? 1000,  // Fetch requested amount
      offset: 0,
    });

    // Check if markets is an array
    if (!Array.isArray(allMarkets)) {
      console.error('❌ Polymarket API did not return an array. Response:', allMarkets);
      throw new Error('Invalid response from Polymarket API');
    }

    console.log(`✅ Fetched ${allMarkets.length} markets from Polymarket Gamma API`);

    // Filter for truly active markets (accepting orders) if needed
    // Gamma API may return some closed markets, so filter client-side as well
    const markets = options?.active !== false
      ? allMarkets.filter(m => m.accepting_orders === true || m.active === true)
      : allMarkets;

    console.log(`✅ Found ${markets.length} active markets`);

    // Apply limit after filtering (if API didn't respect it)
    const limitedMarkets = markets.slice(0, options?.limit ?? 100);
    console.log(`✅ Processing ${limitedMarkets.length} markets`);

    let saved = 0;
    let errors = 0;

    for (const market of limitedMarkets) {
      try {
        const normalized = normalizeMarket(market);

        // Upsert to MongoDB (update if exists, insert if new)
        await collection.updateOne(
          { conditionId: normalized.conditionId },
          { $set: normalized },
          { upsert: true }
        );

        saved++;
      } catch (error) {
        console.error(`❌ Error saving market ${market.condition_id}:`, error);
        errors++;
      }
    }

    console.log(`✅ Saved ${saved} markets to MongoDB`);
    if (errors > 0) {
      console.log(`⚠️  ${errors} markets failed to save`);
    }

    return { saved, errors };
  } catch (error) {
    console.error('❌ Error fetching markets:', error);
    throw error;
  }
}

/**
 * Get all markets from MongoDB
 */
export async function getAllMarkets(filter?: {
  status?: 'active' | 'closed' | 'archived';
  category?: string;
  featured?: boolean;
  limit?: number;
  skip?: number;
}): Promise<FlattenedMarket[]> {
  const db = await getDatabase();
  const collection = db.collection<FlattenedMarket>(COLLECTION_NAME);

  const query: any = {};
  if (filter?.status) query.status = filter.status;
  if (filter?.category) query.category = filter.category;
  if (filter?.featured !== undefined) query.featured = filter.featured;

  const cursor = collection
    .find(query)
    .sort({ updatedAt: -1 })
    .limit(filter?.limit || 100)
    .skip(filter?.skip || 0);

  return await cursor.toArray();
}

/**
 * Get market statistics
 */
export async function getMarketStats(): Promise<MarketStats> {
  const db = await getDatabase();
  const collection = db.collection<FlattenedMarket>(COLLECTION_NAME);

  const [total, active, closed, archived, featured] = await Promise.all([
    collection.countDocuments(),
    collection.countDocuments({ status: 'active' }),
    collection.countDocuments({ status: 'closed' }),
    collection.countDocuments({ status: 'archived' }),
    collection.countDocuments({ featured: true }),
  ]);

  // Get category counts
  const categoryPipeline = [
    { $match: { category: { $exists: true, $ne: null } } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ];

  const categoryResults = await collection.aggregate(categoryPipeline).toArray();
  const categoryCounts: Record<string, number> = {};
  for (const result of categoryResults) {
    categoryCounts[result._id] = result.count;
  }

  return {
    totalMarkets: total,
    activeMarkets: active,
    closedMarkets: closed,
    archivedMarkets: archived,
    featuredMarkets: featured,
    categoryCounts,
    lastUpdated: new Date(),
  };
}
