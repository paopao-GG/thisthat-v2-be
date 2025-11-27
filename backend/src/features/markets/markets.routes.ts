/**
 * Markets Routes
 */

import type { FastifyInstance } from 'fastify';
import { 
  getMarketsHandler,
  getMarketByIdHandler,
  getMarketLiveHandler,
  getMarketFullHandler,
  getRandomMarketsHandler,
  getMarketsByCategoryHandler,
  getCategoriesHandler,
  ingestMarketsHandler,
} from './markets.controllers.js';

export default async function marketsRoutes(fastify: FastifyInstance) {
  // IMPORTANT: More specific routes must come before less specific ones
  // Get markets with live prices
  fastify.get('/', getMarketsHandler);
  
  // Get random markets (static data only)
  fastify.get('/random', getRandomMarketsHandler);
  
  // Trigger Polymarket ingestion (admin/diagnostic)
  fastify.post('/ingest', ingestMarketsHandler);

  // Get all categories (must come before /:id to avoid matching)
  fastify.get('/categories', getCategoriesHandler);
  
  // Get markets by category (must come before /:id)
  fastify.get('/category/:category', getMarketsByCategoryHandler);
  
  // Get live prices for a market (more specific than /:id)
  fastify.get('/:id/live', getMarketLiveHandler);
  
  // Get market with static + live data combined (more specific than /:id)
  fastify.get('/:id/full', getMarketFullHandler);
  
  // Get single market by ID (static data only) - least specific, comes last
  fastify.get('/:id', getMarketByIdHandler);
}

