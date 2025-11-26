import type { FastifyInstance } from 'fastify';
import { getMeHandler, refreshHandler, logoutHandler, xAuthHandler, xCallbackHandler } from './auth.controllers.js';
import { authenticate } from './auth.middleware.js';

export default async function authRoutes(fastify: FastifyInstance) {
  // OAuth routes (X login only)
  fastify.get('/x', xAuthHandler);
  fastify.get('/x/callback', xCallbackHandler);

  // Token management routes
  fastify.post('/refresh', refreshHandler);
  fastify.post('/logout', logoutHandler);

  // Protected routes (require authentication)
  fastify.get('/me', { preHandler: authenticate }, getMeHandler);
}
