import type { FastifyRequest, FastifyReply } from 'fastify';
import { placeBetSchema, betQuerySchema } from './betting.models.js';
import * as bettingService from './betting.services.js';

/**
 * Place a bet
 */
export async function placeBetHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = (request.user as any)?.userId;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
      });
    }

    const input = placeBetSchema.parse(request.body);
    const result = await bettingService.placeBet(userId, input);

    return reply.status(201).send({
      success: true,
      bet: result.bet,
      newBalance: result.newBalance,
      potentialPayout: result.potentialPayout,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return reply.status(400).send({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    request.log.error({ error, stack: error.stack }, 'Place bet error');
    return reply.status(400).send({
      success: false,
      error: error.message || 'Failed to place bet',
    });
  }
}

/**
 * Get user's bets
 */
export async function getUserBetsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = (request.user as any)?.userId;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
      });
    }

    const query = betQuerySchema.parse(request.query);
    const result = await bettingService.getUserBets(userId, query);

    return reply.send({
      success: true,
      ...result,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return reply.status(400).send({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    request.log.error({ error, stack: error.stack }, 'Get user bets error');
    return reply.status(500).send({
      success: false,
      error: 'Failed to get bets',
    });
  }
}

/**
 * Get bet by ID
 */
export async function getBetByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = (request.user as any)?.userId;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
      });
    }

    const betId = (request.params as any).betId;
    if (!betId) {
      return reply.status(400).send({
        success: false,
        error: 'Bet ID is required',
      });
    }

    const bet = await bettingService.getBetById(betId, userId);

    if (!bet) {
      return reply.status(404).send({
        success: false,
        error: 'Bet not found',
      });
    }

    return reply.send({
      success: true,
      bet,
    });
  } catch (error: any) {
    request.log.error({ error, stack: error.stack }, 'Get bet error');
    return reply.status(500).send({
      success: false,
      error: 'Failed to get bet',
    });
  }
}

