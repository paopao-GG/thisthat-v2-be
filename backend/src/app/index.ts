import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import dotenv from 'dotenv';
import authRoutes from '../features/auth/auth.routes.js';
import userRoutes from '../features/users/user.routes.js';
import economyRoutes from '../features/economy/economy.routes.js';
import bettingRoutes from '../features/betting/betting.routes.js';
import { startDailyCreditsJob, stopDailyCreditsJob } from '../jobs/daily-credits.job.js';
import { startMarketResolutionJob, stopMarketResolutionJob } from '../jobs/market-resolution.job.js';
import { startLeaderboardUpdateJob, stopLeaderboardUpdateJob } from '../jobs/leaderboard-update.job.js';
import leaderboardRoutes from '../features/leaderboard/leaderboard.routes.js';
import transactionRoutes from '../features/transactions/transactions.routes.js';
import redis from '../lib/redis.js';
import referralRoutes from '../features/referrals/referral.routes.js';
import purchaseRoutes from '../features/purchases/purchases.routes.js';
import marketsRoutes from '../features/markets/markets.routes.js';
import { startMarketIngestionJob, stopMarketIngestionJob } from '../jobs/market-ingestion.job.js';

// Load environment variables
dotenv.config();

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// Register CORS plugin
await fastify.register(cors, {
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://www.growgami.com',
    process.env.FRONTEND_URL || 'http://localhost:5173',
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
});

// Register JWT plugin
await fastify.register(jwt, {
  secret: process.env.JWT_ACCESS_SECRET || 'your-secret-key-change-in-production',
});

// Basic health check route
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// API routes
fastify.get('/api/hello', async (request, reply) => {
  return { message: 'Hello from TypeScript Fastify!' };
});

// Register Markets routes (PostgreSQL-based with live prices)
await fastify.register(marketsRoutes, { prefix: '/api/v1/markets' });

// Register Auth routes
await fastify.register(authRoutes, { prefix: '/api/v1/auth' });

// Register User routes
await fastify.register(userRoutes, { prefix: '/api/v1/users' });

// Register Economy routes
await fastify.register(economyRoutes, { prefix: '/api/v1/economy' });

// Register Betting routes
await fastify.register(bettingRoutes, { prefix: '/api/v1/bets' });

// Register Leaderboard routes
await fastify.register(leaderboardRoutes, { prefix: '/api/v1/leaderboard' });

// Register Transaction routes
await fastify.register(transactionRoutes, { prefix: '/api/v1/transactions' });

// Register Referral routes
await fastify.register(referralRoutes, { prefix: '/api/v1/referrals' });

// Register Purchase routes
await fastify.register(purchaseRoutes, { prefix: '/api/v1/purchases' });

// Error handling
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  reply.status(500).send({ error: 'Something went wrong!' });
});

// Start server
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001;
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    console.log(`🚀 Server listening on http://${host}:${port}`);

    // Connect to Redis (optional - system works without it)
    try {
      if (!redis.isOpen) {
        await redis.connect();
        fastify.log.info('✅ Redis connected successfully');
      }
    } catch (err) {
      fastify.log.warn({ err }, '⚠️  Redis not available (continuing without cache - leaderboards will work but be slower)');
    }

    // Start background jobs
    startDailyCreditsJob();
    startMarketIngestionJob();
    startMarketResolutionJob();
    startLeaderboardUpdateJob();
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async () => {
  try {
    fastify.log.info('🛑 Shutting down gracefully...');
    
    // Stop background jobs
    stopDailyCreditsJob();
    stopMarketIngestionJob();
    stopMarketResolutionJob();
    stopLeaderboardUpdateJob();
    
    // Close Redis connection
    try {
      if (redis.isOpen) {
        await redis.quit();
      }
    } catch (err) {
      fastify.log.warn({ err }, 'Error closing Redis connection');
    }
    
    await fastify.close();
    fastify.log.info('✅ Server and database connections closed');
    process.exit(0);
  } catch (err) {
    fastify.log.error({ err }, 'Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

start();