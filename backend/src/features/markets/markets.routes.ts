/**
 * Markets Routes
 */

import type { FastifyInstance } from 'fastify';
import { getMarketsHandler } from './markets.controllers.js';

export default async function marketsRoutes(fastify: FastifyInstance) {
  // Get markets with live prices
  fastify.get('/', getMarketsHandler);
}

