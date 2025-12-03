import type { FastifyRequest, FastifyReply } from 'fastify';
import { placeBetSchema, betQuerySchema, sellPositionSchema } from './betting.models.js';
import * as bettingService from './betting.services.js';
import { createStructuredError, ErrorType } from '../../lib/error-handler.js';
import { sendErrorResponse, sendValidationError, sendNotFoundError, sendUnauthorizedError } from '../../lib/error-response.js';

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
        code: ErrorType.VALIDATION,
        details: error.errors,
      });
    }

    const structuredError = createStructuredError(error);
    request.log.error({ 
      error: structuredError, 
      stack: error.stack 
    }, 'Place bet error');

    const statusCode = structuredError.type === ErrorType.INSUFFICIENT_BALANCE 
      ? 400 
      : structuredError.type === ErrorType.MARKET_CLOSED 
      ? 400 
      : structuredError.type === ErrorType.NOT_FOUND
      ? 404
      : structuredError.retryable 
      ? 503 
      : 400;

    return reply.status(statusCode).send({
      success: false,
      error: structuredError.message,
      code: structuredError.code,
      type: structuredError.type,
      retryable: structuredError.retryable,
      retryAfter: structuredError.retryAfter,
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
      return sendUnauthorizedError(reply);
    }

    const betId = (request.params as any).betId;
    if (!betId) {
      return sendValidationError(reply, [{ path: ['betId'], message: 'Bet ID is required' }], 'Bet ID is required');
    }

    const bet = await bettingService.getBetById(betId, userId);

    if (!bet) {
      return sendNotFoundError(reply, 'Bet');
    }

    return reply.send({
      success: true,
      bet,
    });
  } catch (error: any) {
    request.log.error({ 
      error: createStructuredError(error), 
      stack: error.stack 
    }, 'Get bet error');
    return sendErrorResponse(reply, error, 'Failed to get bet');
  }
}

/**
 * Sell a position early (before market expires)
 */
export async function sellPositionHandler(request: FastifyRequest, reply: FastifyReply) {
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

    const input = sellPositionSchema.parse(request.body || {});
    const result = await bettingService.sellPosition(userId, betId, input);

    return reply.send({
      success: true,
      bet: result.bet,
      creditsReturned: result.creditsReturned,
      newBalance: result.newBalance,
      currentValue: result.currentValue,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return reply.status(400).send({
        success: false,
        error: 'Validation error',
        code: ErrorType.VALIDATION,
        details: error.errors,
      });
    }

    const structuredError = createStructuredError(error);
    request.log.error({ 
      error: structuredError, 
      stack: error.stack 
    }, 'Sell position error');

    const statusCode = structuredError.type === ErrorType.NOT_FOUND
      ? 404
      : structuredError.retryable 
      ? 503 
      : 400;

    return reply.status(statusCode).send({
      success: false,
      error: structuredError.message,
      code: structuredError.code,
      type: structuredError.type,
      retryable: structuredError.retryable,
      retryAfter: structuredError.retryAfter,
    });
  }
}

