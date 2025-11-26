/**
 * Markets Controllers
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import * as marketsService from './markets.services.js';

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

