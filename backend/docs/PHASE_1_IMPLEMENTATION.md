# Phase 1 Implementation Guide - Polymarket Data Fetching

This guide covers the complete implementation of Phase 1: Fetching Polymarket market and event data.

## What We've Built So Far

### ✅ Completed

1. **Polymarket API Client** - [src/lib/polymarket-client.ts](src/lib/polymarket-client.ts)
   - Fetches markets and events from Polymarket
   - Error handling and retry logic
   - TypeScript interfaces for all data types

2. **MongoDB Client** - [src/lib/mongodb.ts](src/lib/mongodb.ts)
   - MongoDB connection management
   - Singleton pattern for reuse

3. **Data Models** with Zod Validation
   - [src/features/fetching/market-data/market-data.models.ts](src/features/fetching/market-data/market-data.models.ts)
   - [src/features/fetching/event-data/event-data.models.ts](src/features/fetching/event-data/event-data.models.ts)

---

## Next Steps to Complete Phase 1

### Step 1: Create Market Data Service

Create [src/features/fetching/market-data/market-data.services.ts](src/features/fetching/market-data/market-data.services.ts):

```typescript
// Market data service - Fetch, normalize, and save
import { getPolymarketClient, type PolymarketMarket } from '../../../lib/polymarket-client.js';
import { getDatabase } from '../../../lib/mongodb.js';
import type { FlattenedMarket, MarketStats } from './market-data.models.js';

const COLLECTION_NAME = 'markets';

/**
 * Normalize Polymarket market data to our flat structure
 */
export function normalizeMarket(polymarketData: PolymarketMarket): FlattenedMarket {
  // Extract THIS/THAT from outcomes (binary markets)
  const thisOption = polymarketData.outcomes?.[0] || 'YES';
  const thatOption = polymarketData.outcomes?.[1] || 'NO';

  // Extract odds from tokens
  const thisOdds = polymarketData.tokens?.find(t => t.outcome === thisOption)?.price || 0.5;
  const thatOdds = polymarketData.tokens?.find(t => t.outcome === thatOption)?.price || 0.5;

  // Determine status
  let status: 'active' | 'closed' | 'archived' = 'active';
  if (polymarketData.archived) status = 'archived';
  else if (polymarketData.closed) status = 'closed';
  else if (polymarketData.active === false) status = 'closed';

  return {
    conditionId: polymarketData.condition_id,
    questionId: polymarketData.question_id,
    marketSlug: polymarketData.market_slug,

    question: polymarketData.question,
    description: polymarketData.description,

    thisOption,
    thatOption,
    thisOdds,
    thatOdds,

    volume: polymarketData.volume,
    volume24hr: polymarketData.volume_24hr,
    liquidity: polymarketData.liquidity,

    category: polymarketData.category,
    tags: polymarketData.tags,
    status,
    featured: polymarketData.featured,

    startDate: polymarketData.game_start_time,
    endDate: polymarketData.end_date_iso,

    source: 'polymarket',
    rawData: polymarketData, // Keep original for debugging

    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Fetch markets from Polymarket and save to MongoDB
 */
export async function fetchAndSaveMarkets(options?: {
  active?: boolean;
  limit?: number;
}): Promise<{ saved: number; errors: number }> {
  const client = getPolymarketClient();
  const db = await getDatabase();
  const collection = db.collection<FlattenedMarket>(COLLECTION_NAME);

  try {
    console.log('📡 Fetching markets from Polymarket...');
    const markets = await client.getMarkets({
      active: options?.active ?? true,
      limit: options?.limit ?? 100,
    });

    console.log(`✅ Fetched ${markets.length} markets from Polymarket`);

    let saved = 0;
    let errors = 0;

    for (const market of markets) {
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
```

### Step 2: Create Event Data Service

Create similar service for events in [src/features/fetching/event-data/event-data.services.ts](src/features/fetching/event-data/event-data.services.ts) (follow same pattern as market service).

### Step 3: Create Controllers

Create [src/features/fetching/market-data/market-data.controllers.ts](src/features/fetching/market-data/market-data.controllers.ts):

```typescript
// Market data controllers
import type { FastifyRequest, FastifyReply } from 'fastify';
import * as marketService from './market-data.services.js';

/**
 * Fetch markets from Polymarket and save to MongoDB
 */
export async function fetchMarkets(
  request: FastifyRequest<{
    Querystring: {
      active?: string;
      limit?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const active = request.query.active === 'true';
    const limit = request.query.limit ? parseInt(request.query.limit) : 100;

    const result = await marketService.fetchAndSaveMarkets({ active, limit });

    return reply.send({
      success: true,
      message: `Fetched and saved ${result.saved} markets`,
      data: result,
    });
  } catch (error) {
    return reply.status(500).send({
      success: false,
      error: 'Failed to fetch markets',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get all markets from MongoDB
 */
export async function getMarkets(
  request: FastifyRequest<{
    Querystring: {
      status?: 'active' | 'closed' | 'archived';
      category?: string;
      featured?: string;
      limit?: string;
      skip?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const filter = {
      status: request.query.status,
      category: request.query.category,
      featured: request.query.featured === 'true' ? true : undefined,
      limit: request.query.limit ? parseInt(request.query.limit) : 100,
      skip: request.query.skip ? parseInt(request.query.skip) : 0,
    };

    const markets = await marketService.getAllMarkets(filter);

    return reply.send({
      success: true,
      count: markets.length,
      data: markets,
    });
  } catch (error) {
    return reply.status(500).send({
      success: false,
      error: 'Failed to get markets',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get market statistics
 */
export async function getMarketStats(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const stats = await marketService.getMarketStats();

    return reply.send({
      success: true,
      data: stats,
    });
  } catch (error) {
    return reply.status(500).send({
      success: false,
      error: 'Failed to get market stats',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
```

### Step 4: Create Routes

Update [src/features/fetching/market-data/market-data.routes.ts](src/features/fetching/market-data/market-data.routes.ts):

```typescript
// Market data routes
import type { FastifyInstance } from 'fastify';
import * as controller from './market-data.controllers.js';

export default async function marketDataRoutes(fastify: FastifyInstance) {
  // Fetch markets from Polymarket and save to MongoDB
  fastify.post('/fetch', controller.fetchMarkets);

  // Get markets from MongoDB
  fastify.get('/', controller.getMarkets);

  // Get market statistics
  fastify.get('/stats', controller.getMarketStats);
}
```

### Step 5: Register Routes in Main App

Update [src/app/index.ts](src/app/index.ts):

```typescript
import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { connectMongoDB, closeMongoDB } from '../lib/mongodb.js';
import marketDataRoutes from '../features/fetching/market-data/market-data.routes.js';
import eventDataRoutes from '../features/fetching/event-data/event-data.routes.js';

// Load environment variables
dotenv.config();

const fastify = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  },
});

// Register CORS
await fastify.register(cors, {
  origin: true,
});

// Connect to MongoDB
await connectMongoDB();

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register feature routes
await fastify.register(marketDataRoutes, { prefix: '/api/v1/markets' });
await fastify.register(eventDataRoutes, { prefix: '/api/v1/events' });

// Graceful shutdown
process.on('SIGTERM', async () => {
  await closeMongoDB();
  await fastify.close();
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    console.log(`🚀 Server running at http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
```

### Step 6: Update .env

Add MongoDB URL to your `.env` file:

```bash
# MongoDB (for testing)
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=thisthat_test

# Polymarket API
POLYMARKET_BASE_URL=https://clob.polymarket.com
POLYMARKET_API_KEY=  # Optional
```

---

## Testing Phase 1

### 1. Start MongoDB

```bash
# Using Docker
docker run --name thisthat-mongo -p 27017:27017 -d mongo:7
```

### 2. Start the Server

```bash
npm run dev
```

### 3. Test API Endpoints

**Fetch markets from Polymarket:**
```bash
curl -X POST "http://localhost:3000/api/v1/markets/fetch?active=true&limit=10"
```

**Get markets from MongoDB:**
```bash
curl "http://localhost:3000/api/v1/markets?status=active&limit=10"
```

**Get market statistics:**
```bash
curl "http://localhost:3000/api/v1/markets/stats"
```

**Health check:**
```bash
curl "http://localhost:3000/health"
```

---

## Expected Response Format

### POST /api/v1/markets/fetch
```json
{
  "success": true,
  "message": "Fetched and saved 10 markets",
  "data": {
    "saved": 10,
    "errors": 0
  }
}
```

### GET /api/v1/markets
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "conditionId": "0x123...",
      "question": "Will Bitcoin reach $100k in 2025?",
      "thisOption": "YES",
      "thatOption": "NO",
      "thisOdds": 0.65,
      "thatOdds": 0.35,
      "status": "active",
      "category": "Crypto",
      "createdAt": "2025-11-18T12:00:00.000Z",
      "updatedAt": "2025-11-18T12:00:00.000Z"
    }
  ]
}
```

### GET /api/v1/markets/stats
```json
{
  "success": true,
  "data": {
    "totalMarkets": 100,
    "activeMarkets": 75,
    "closedMarkets": 20,
    "archivedMarkets": 5,
    "featuredMarkets": 10,
    "categoryCounts": {
      "Politics": 30,
      "Sports": 25,
      "Crypto": 20,
      "Other": 25
    },
    "lastUpdated": "2025-11-18T12:30:00.000Z"
  }
}
```

---

## Summary of Phase 1

### What You've Built:
1. ✅ Polymarket API client with TypeScript types
2. ✅ MongoDB integration for testing
3. ✅ Data validation with Zod schemas
4. ✅ Data normalization (Polymarket → Flat structure)
5. ✅ Market & event data services
6. ✅ RESTful API routes for BFF integration
7. ✅ Error handling and logging

### Next Phase (Phase 2):
- Auth system with JWT
- Credits system implementation
- User registration and login
- Bet placement logic

---

## Files Created in Phase 1

- `src/lib/mongodb.ts` - MongoDB client
- `src/lib/polymarket-client.ts` - Polymarket API client
- `src/features/fetching/market-data/market-data.models.ts` - Market models
- `src/features/fetching/market-data/market-data.services.ts` - Market services
- `src/features/fetching/market-data/market-data.controllers.ts` - Market controllers
- `src/features/fetching/market-data/market-data.routes.ts` - Market routes
- `src/features/fetching/event-data/*` - Event data (same pattern)

Let me know when you're ready to test or move to Phase 2!
