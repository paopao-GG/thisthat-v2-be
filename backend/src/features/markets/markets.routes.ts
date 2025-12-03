/**
 * Markets Routes
 */

import type { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import {
  getMarketsHandler,
  getMarketByIdHandler,
  getMarketLiveHandler,
  getMarketFullHandler,
  getRandomMarketsHandler,
  getMarketsByCategoryHandler,
  getCategoriesHandler,
  getMarketCountHandler,
  ingestMarketsHandler,
} from './markets.controllers.js';
import { externalApiRateLimit } from '../../lib/rate-limit.config.js';

export default async function marketsRoutes(fastify: FastifyInstance) {
  // IMPORTANT: More specific routes must come before less specific ones
  // Get markets with live prices
  fastify.get('/', getMarketsHandler);
  
  // Get random markets (static data only)
  fastify.get('/random', getRandomMarketsHandler);
  
  // Trigger Polymarket ingestion (admin/diagnostic) - Strict rate limiting
  await fastify.register(async (fastify) => {
    await fastify.register(rateLimit, {
      ...externalApiRateLimit,
    });
    fastify.post('/ingest', ingestMarketsHandler);
  });

  // Get all categories (must come before /:id to avoid matching)
  fastify.get('/categories', getCategoriesHandler);

  // Get market count (must come before /:id to avoid matching)
  fastify.get('/count', getMarketCountHandler);

  // Get markets by category (must come before /:id)
  fastify.get('/category/:category', getMarketsByCategoryHandler);
  
  // Get live prices for a market (more specific than /:id)
  fastify.get('/:id/live', getMarketLiveHandler);
  
  // Get market with static + live data combined (more specific than /:id)
  fastify.get('/:id/full', getMarketFullHandler);
  
  // Get single market by ID (static data only) - least specific, comes last
  fastify.get('/:id', getMarketByIdHandler);
}

