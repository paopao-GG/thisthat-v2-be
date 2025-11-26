/**
 * MongoDB to PostgreSQL Market Sync Service
 * Syncs markets from MongoDB to PostgreSQL Market table for betting system
 * 
 * IMPORTANT: Per lazy loading pattern (docs/MARKET_FETCHING.md):
 * - Only syncs STATIC fields (id, title, description, author, category, expiresAt)
 * - Does NOT sync price fields (thisOdds, thatOdds, liquidity, volume)
 * - Prices are fetched on-demand from Polymarket API when client requests them
 */

import { getDatabase } from '../../lib/mongodb.js';
import { prisma } from '../../lib/database.js';
import type { FlattenedMarket } from '../fetching/market-data/market-data.models.js';

const COLLECTION_NAME = 'markets';

/**
 * Sync a single market from MongoDB to PostgreSQL
 * Only syncs static data - no prices per lazy loading pattern
 */
async function syncMarketToPostgres(market: FlattenedMarket): Promise<boolean> {
  try {
    // Check if market already exists in PostgreSQL
    const existing = await prisma.market.findUnique({
      where: { polymarketId: market.conditionId },
    });

    // Map MongoDB market to PostgreSQL Market model
    // IMPORTANT: Only sync static fields - NO prices (per lazy loading pattern)
    const marketData = {
      polymarketId: market.conditionId,
      title: market.question,
      description: market.description || null,
      thisOption: market.thisOption,
      thatOption: market.thatOption,
      author: market.author || null, // Market creator/author
      category: market.category || null,
      imageUrl: null, // Not available in MongoDB structure
      marketType: 'polymarket' as const,
      status: market.status === 'active' ? 'open' : market.status === 'closed' ? 'closed' : 'closed',
      expiresAt: market.endDate ? new Date(market.endDate) : null,
      updatedAt: new Date(),
      // NOTE: Price fields (thisOdds, thatOdds, liquidity) are NOT synced
      // Prices are fetched on-demand from Polymarket API per lazy loading pattern
    };

    if (existing) {
      // Update existing market
      await prisma.market.update({
        where: { polymarketId: market.conditionId },
        data: marketData,
      });
      return true;
    } else {
      // Create new market
      await prisma.market.create({
        data: marketData,
      });
      return true;
    }
  } catch (error: any) {
    console.error(`Error syncing market ${market.conditionId}:`, error.message);
    return false;
  }
}

/**
 * Sync all markets from MongoDB to PostgreSQL
 */
export async function syncAllMarketsToPostgres(options?: {
  status?: 'active' | 'closed' | 'archived';
  limit?: number;
}): Promise<{
  synced: number;
  errors: number;
  skipped: number;
}> {
  try {
    const db = await getDatabase();
    const collection = db.collection<FlattenedMarket>(COLLECTION_NAME);

    // Build query
    const query: any = {};
    if (options?.status) {
      query.status = options.status;
    }

    // Fetch markets from MongoDB
    let cursor = collection.find(query);
    
    if (options?.limit) {
      cursor = cursor.limit(options.limit);
    }

    const markets = await cursor.toArray();
    console.log(`📊 Found ${markets.length} markets in MongoDB to sync`);

    let synced = 0;
    let errors = 0;
    let skipped = 0;

    for (const market of markets) {
      // Skip if missing required fields
      if (!market.conditionId || !market.question || !market.thisOption || !market.thatOption) {
        skipped++;
        continue;
      }

      const success = await syncMarketToPostgres(market);
      if (success) {
        synced++;
      } else {
        errors++;
      }
    }

    console.log(`✅ Synced ${synced} markets to PostgreSQL`);
    if (errors > 0) {
      console.log(`⚠️  ${errors} markets failed to sync`);
    }
    if (skipped > 0) {
      console.log(`⏭️  ${skipped} markets skipped (missing required fields)`);
    }

    return { synced, errors, skipped };
  } catch (error: any) {
    console.error('❌ Error syncing markets:', error);
    throw error;
  }
}

/**
 * Sync active markets only (for regular sync job)
 */
export async function syncActiveMarketsToPostgres(): Promise<{
  synced: number;
  errors: number;
  skipped: number;
}> {
  return syncAllMarketsToPostgres({
    status: 'active',
    limit: 1000, // Sync up to 1000 active markets
  });
}

/**
 * Get market count in both databases
 */
export async function getMarketCounts(): Promise<{
  mongodb: number;
  postgresql: number;
  activeMongoDB: number;
  activePostgreSQL: number;
}> {
  try {
    const db = await getDatabase();
    const collection = db.collection(COLLECTION_NAME);

    const [mongodbTotal, mongodbActive, postgresqlTotal, postgresqlActive] = await Promise.all([
      collection.countDocuments({}),
      collection.countDocuments({ status: 'active' }),
      prisma.market.count({}),
      prisma.market.count({ where: { status: 'open' } }),
    ]);

    return {
      mongodb: mongodbTotal,
      postgresql: postgresqlTotal,
      activeMongoDB: mongodbActive,
      activePostgreSQL: postgresqlActive,
    };
  } catch (error: any) {
    console.error('Error getting market counts:', error);
    throw error;
  }
}

