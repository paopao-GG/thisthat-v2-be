import type { FastifyRequest, FastifyReply } from 'fastify';
import * as leaderboardService from './leaderboard.services.js';

/**
 * Get PnL leaderboard
 */
export async function getPnLLeaderboardHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const limit = Math.min(Number((request.query as any)?.limit) || 100, 1000);
    const offset = Number((request.query as any)?.offset) || 0;

    const result = await leaderboardService.getPnLLeaderboard(limit, offset);

    return reply.send({
      success: true,
      ...result,
    });
  } catch (error: any) {
    request.log.error({ error, stack: error.stack }, 'Error fetching PnL leaderboard');
    return reply.status(500).send({
      success: false,
      error: error.message || 'Failed to fetch PnL leaderboard',
    });
  }
}

/**
 * Get Volume leaderboard
 */
export async function getVolumeLeaderboardHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const limit = Math.min(Number((request.query as any)?.limit) || 100, 1000);
    const offset = Number((request.query as any)?.offset) || 0;

    const result = await leaderboardService.getVolumeLeaderboard(limit, offset);

    return reply.send({
      success: true,
      ...result,
    });
  } catch (error: any) {
    request.log.error({ error, stack: error.stack }, 'Error fetching Volume leaderboard');
    return reply.status(500).send({
      success: false,
      error: error.message || 'Failed to fetch Volume leaderboard',
    });
  }
}

/**
 * Get current user's ranking
 */
export async function getUserRankingHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = (request.user as any)?.userId;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
      });
    }

    const type = ((request.query as any)?.type || 'pnl') as 'pnl' | 'volume';
    
    if (type !== 'pnl' && type !== 'volume') {
      return reply.status(400).send({
        success: false,
        error: 'Invalid type. Must be "pnl" or "volume"',
      });
    }

    const ranking = await leaderboardService.getUserRanking(userId, type);

    if (!ranking) {
      return reply.status(404).send({
        success: false,
        error: 'User not found',
      });
    }

    return reply.send({
      success: true,
      ranking,
    });
  } catch (error: any) {
    request.log.error({ error, stack: error.stack }, 'Error fetching user ranking');
    return reply.status(500).send({
      success: false,
      error: error.message || 'Failed to fetch user ranking',
    });
  }
}

