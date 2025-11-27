/**
 * Markets Controllers
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import * as marketsService from './markets.services.js';
import { ingestMarketsFromPolymarket } from '../../services/market-ingestion.service.js';

/**
 * Get markets with live prices
 */
export async function getMarketsHandler(
  request: FastifyRequest<{
    Querystring: {
      status?: string;
      category?: string;
      limit?: string;
      skip?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const status = request.query.status || 'open';
    const category = request.query.category;
    const limit = request.query.limit ? parseInt(request.query.limit) : 100;
    const skip = request.query.skip ? parseInt(request.query.skip) : 0;

    // Get markets from PostgreSQL
    const markets = await marketsService.getMarkets({
      status: status as 'open' | 'closed' | 'resolved',
      category,
      limit,
      skip,
    });

    // Fetch live prices for markets with polymarketId (only fetch for first 20 to avoid rate limits)
    const marketsToFetchLive = markets.slice(0, 20);
    const marketsWithPrices = await Promise.all(
      markets.map(async (market, index) => {
        // Only fetch live data for first 20 markets to avoid rate limits
        if (index < 20 && market.polymarketId) {
          const liveData = await marketsService.fetchLivePriceData(market.polymarketId);
          if (liveData) {
            return {
              ...market,
              thisOdds: liveData.thisOdds,
              thatOdds: liveData.thatOdds,
              liquidity: liveData.liquidity,
            };
          }
        }
        // Return market with database odds (may be stale but better than nothing)
        return {
          ...market,
          thisOdds: market.thisOdds || 0.5,
          thatOdds: market.thatOdds || 0.5,
          liquidity: market.liquidity || 0,
        };
      })
    );

    return reply.send({
      success: true,
      count: marketsWithPrices.length,
      data: marketsWithPrices,
    });
  } catch (error: any) {
    request.log.error({ error }, 'Failed to get markets');
    return reply.status(500).send({
      success: false,
      error: 'Failed to get markets',
      details: error.message || 'Unknown error',
    });
  }
}

/**
 * Trigger on-demand ingestion from Polymarket
 */
export async function ingestMarketsHandler(
  request: FastifyRequest<{
    Body: {
      limit?: number;
      category?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { limit, category } = request.body || {};
    const result = await ingestMarketsFromPolymarket({
      limit,
      activeOnly: true,
      category,
    });

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error: any) {
    request.log.error({ error }, 'Failed to ingest markets');
    return reply.status(500).send({
      success: false,
      error: 'Failed to ingest markets',
      details: error.message || 'Unknown error',
    });
  }
}

/**
 * Get random markets (static data only)
 */
export async function getRandomMarketsHandler(
  request: FastifyRequest<{
    Querystring: {
      count?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const count = request.query.count ? parseInt(request.query.count) : 10;
    const maxCount = Math.min(count, 50); // Cap at 50

    const markets = await marketsService.getRandomMarkets(maxCount);

    return reply.send({
      success: true,
      count: markets.length,
      data: markets,
    });
  } catch (error: any) {
    request.log.error({ error }, 'Failed to get random markets');
    return reply.status(500).send({
      success: false,
      error: 'Failed to get random markets',
      details: error.message || 'Unknown error',
    });
  }
}

/**
 * Get single market by ID (static data only)
 */
export async function getMarketByIdHandler(
  request: FastifyRequest<{
    Params: {
      id: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const market = await marketsService.getMarketById(id);

    if (!market) {
      return reply.status(404).send({
        success: false,
        error: 'Market not found',
      });
    }

    return reply.send({
      success: true,
      data: market,
    });
  } catch (error: any) {
    request.log.error({ error }, 'Failed to get market');
    return reply.status(500).send({
      success: false,
      error: 'Failed to get market',
      details: error.message || 'Unknown error',
    });
  }
}

/**
 * Get live prices for a market
 */
export async function getMarketLiveHandler(
  request: FastifyRequest<{
    Params: {
      id: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const market = await marketsService.getMarketById(id);

    if (!market) {
      return reply.status(404).send({
        success: false,
        error: 'Market not found',
      });
    }

    if (!market.polymarketId) {
      return reply.status(400).send({
        success: false,
        error: 'Market has no Polymarket ID',
      });
    }

    const liveData = await marketsService.fetchLivePriceData(market.polymarketId);

    if (!liveData) {
      return reply.status(503).send({
        success: false,
        error: 'Failed to fetch live prices from Polymarket API',
      });
    }

    return reply.send({
      success: true,
      data: liveData,
      marketId: id,
    });
  } catch (error: any) {
    request.log.error({ error }, 'Failed to get live prices');
    return reply.status(500).send({
      success: false,
      error: 'Failed to get live prices',
      details: error.message || 'Unknown error',
    });
  }
}

/**
 * Get market with static + live data combined
 */
export async function getMarketFullHandler(
  request: FastifyRequest<{
    Params: {
      id: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    request.log.info({ marketId: id }, 'Fetching market with live data');
    
    const market = await marketsService.getMarketWithLiveData(id);

    if (!market) {
      request.log.warn({ marketId: id }, 'Market not found');
      return reply.status(404).send({
        success: false,
        error: 'Market not found',
      });
    }

    request.log.info({ marketId: id, hasLiveData: !!market.live }, 'Market fetched successfully');
    return reply.send({
      success: true,
      data: market,
    });
  } catch (error: any) {
    request.log.error({ error, stack: error.stack, marketId: request.params.id }, 'Failed to get market');
    return reply.status(500).send({
      success: false,
      error: 'Failed to get market',
      details: error.message || 'Unknown error',
    });
  }
}

/**
 * Get markets by category
 */
export async function getMarketsByCategoryHandler(
  request: FastifyRequest<{
    Params: {
      category: string;
    };
    Querystring: {
      limit?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { category } = request.params;
    const limit = request.query.limit ? parseInt(request.query.limit) : 20;
    const maxLimit = Math.min(limit, 100); // Cap at 100

    const markets = await marketsService.getMarketsByCategory(category, maxLimit);

    return reply.send({
      success: true,
      count: markets.length,
      category,
      data: markets,
    });
  } catch (error: any) {
    request.log.error({ error }, 'Failed to get markets by category');
    return reply.status(500).send({
      success: false,
      error: 'Failed to get markets by category',
      details: error.message || 'Unknown error',
    });
  }
}

/**
 * Get all categories
 */
export async function getCategoriesHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const categories = await marketsService.getCategories();

    return reply.send({
      success: true,
      data: categories,
    });
  } catch (error: any) {
    request.log.error({ error }, 'Failed to get categories');
    return reply.status(500).send({
      success: false,
      error: 'Failed to get categories',
      details: error.message || 'Unknown error',
    });
  }
}

