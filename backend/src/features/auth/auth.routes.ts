import type { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { getMeHandler, refreshHandler, logoutHandler, xAuthHandler, xCallbackHandler } from './auth.controllers.js';
import { authenticate } from './auth.middleware.js';
import { authRateLimit, standardRateLimit } from '../../lib/rate-limit.config.js';

export default async function authRoutes(fastify: FastifyInstance) {
  // OAuth routes (X login only) - Strict rate limiting
  await fastify.register(async (fastify) => {
    await fastify.register(rateLimit, {
      ...authRateLimit,
    });
    fastify.get('/x', xAuthHandler);
    fastify.get('/x/callback', xCallbackHandler);
  });

  // Token management routes - Strict rate limiting
  await fastify.register(async (fastify) => {
    await fastify.register(rateLimit, {
      ...authRateLimit,
    });
    fastify.post('/refresh', refreshHandler);
    fastify.post('/logout', logoutHandler);
  });

  // Protected routes (require authentication) - Standard rate limiting (more lenient)
  // /me is not an authentication attempt, just fetching user data
  await fastify.register(async (fastify) => {
    await fastify.register(rateLimit, {
      ...standardRateLimit, // 100 req/min instead of 10 req/15min
    });
    fastify.get('/me', { preHandler: authenticate }, getMeHandler);
  });
}
