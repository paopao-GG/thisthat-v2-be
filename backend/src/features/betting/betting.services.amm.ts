/**
 * AMM-Based Betting Services
 *
 * This is the new AMM implementation that uses dynamic pricing via CPMM formula.
 * It replaces the simple odds-based betting with share-based positions.
 */

import { usersPrisma, marketsPrisma } from '../../lib/database.js';
import type { PlaceBetInput } from './betting.models.js';
import { buyYes, buyNo, sellYes, sellNo, type Pool, getYesProbability, getNoProbability } from '../../services/amm.service.js';
import {
  createStructuredError,
  executeWithFailover,
  circuitBreakers,
} from '../../lib/error-handler.js';
import { retryWithBackoffSilent } from '../../lib/retry.js';

const MIN_BET_AMOUNT = 10;
const MAX_BET_AMOUNT = 10000;
const AMM_FEE_BPS = 30; // 0.3% fee

/**
 * Place a bet using AMM (share-based)
 */
export async function placeBetAMM(
  userId: string,
  input: PlaceBetInput
): Promise<{
  bet: any;
  newBalance: number;
  sharesReceived: number;
  priceImpact: number;
  newProbability: number;
}> {
  // Find market
  const market = await marketsPrisma.market.findUnique({
    where: { id: input.marketId },
  });

  if (!market) {
    throw new Error('Market not found');
  }

  if (market.status !== 'open') {
    throw new Error('Market is not open for betting');
  }

  // Check if market has expired
  if (market.expiresAt && new Date() > market.expiresAt) {
    throw new Error('Market has expired');
  }

  // Validate bet amount
  if (input.amount < MIN_BET_AMOUNT) {
    throw new Error(`Minimum bet amount is ${MIN_BET_AMOUNT} credits`);
  }
  if (input.amount > MAX_BET_AMOUNT) {
    throw new Error(`Maximum bet amount is ${MAX_BET_AMOUNT} credits`);
  }

  // Create pool from market reserves
  const pool: Pool = {
    yesReserve: Number(market.yesReserve),
    noReserve: Number(market.noReserve),
  };

  // Validate reserves
  if (pool.yesReserve <= 0 || pool.noReserve <= 0) {
    throw new Error('Market reserves are invalid. Cannot place bet.');
  }

  // Execute AMM trade (calculate shares and new pool state)
  let tradeResult;
  try {
    tradeResult = input.side === 'this'
      ? buyYes(pool, input.amount, AMM_FEE_BPS)
      : buyNo(pool, input.amount, AMM_FEE_BPS);
  } catch (error: any) {
    throw new Error(`AMM trade calculation failed: ${error.message}`);
  }

  // Wrap in retry logic for database transaction failures
  return await retryWithBackoffSilent(
    async () => {
      return await usersPrisma.$transaction(async (tx) => {
        // Get user
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user) {
          throw new Error('User not found');
        }

        // Check available credits
        const availableCredits = Number(user.availableCredits);
        if (availableCredits < input.amount) {
          throw new Error('Insufficient credits');
        }

        const balanceBefore = availableCredits;
        const balanceAfter = balanceBefore - input.amount;

        // Create bet record with AMM fields
        const bet = await tx.bet.create({
          data: {
            userId: userId,
            marketId: market.id,
            amount: input.amount,
            side: input.side,

            // AMM fields
            sharesReceived: tradeResult.sharesOut,
            priceAtBet: tradeResult.effectivePrice,

            // Legacy fields (optional for backwards compatibility)
            oddsAtBet: input.side === 'this' ? tradeResult.probAfter : (1 - tradeResult.probAfter),
            potentialPayout: tradeResult.sharesOut, // Shares pay 1:1 on win

            status: 'pending',
          },
        });

        // Update user credits
        await tx.user.update({
          where: { id: userId },
          data: {
            availableCredits: balanceAfter,
            creditBalance: balanceAfter,
            expendedCredits: {
              increment: input.amount,
            },
            totalVolume: {
              increment: input.amount,
            },
          },
        });

        // Create credit transaction
        await tx.creditTransaction.create({
          data: {
            userId,
            amount: -input.amount,
            transactionType: 'bet_placed',
            referenceId: bet.id,
            balanceAfter,
          },
        });

        // Update market reserves (outside transaction since it's in different database)
        // This is done after transaction commits to maintain consistency

        return {
          bet,
          newBalance: balanceAfter,
          sharesReceived: tradeResult.sharesOut,
          priceImpact: tradeResult.priceImpact,
          newProbability: tradeResult.probAfter,
          newPool: tradeResult.newPool,
        };
      }, {
        timeout: 10000,
        isolationLevel: 'ReadCommitted',
      });
    },
    {
      maxRetries: 2,
      initialDelayMs: 500,
      retryableErrors: (error) => {
        return error.code === 'P2034' ||
               error.code === 'P1008' ||
               error.message?.includes('timeout') ||
               error.message?.includes('deadlock');
      },
    }
  ).then(async (result) => {
    // Update market reserves after successful transaction
    if (result) {
      try {
        await marketsPrisma.market.update({
          where: { id: market.id },
          data: {
            yesReserve: result.newPool.yesReserve,
            noReserve: result.newPool.noReserve,
            // Update computed odds for backwards compatibility
            thisOdds: getYesProbability(result.newPool),
            thatOdds: getNoProbability(result.newPool),
          },
        });
      } catch (error) {
        console.error('[AMM] Failed to update market reserves:', error);
        // Don't throw - bet was placed successfully, just log the error
      }

      // Return without newPool in response
      const { newPool, ...response } = result;
      return response;
    }

    throw new Error('Failed to place bet after retries');
  });
}

/**
 * Sell position early (before market resolution)
 */
export async function sellPosition(
  userId: string,
  betId: string
): Promise<{
  creditsReceived: number;
  profit: number;
  priceImpact: number;
}> {
  // Get bet
  const bet = await usersPrisma.bet.findUnique({
    where: { id: betId },
  });

  if (!bet) {
    throw new Error('Bet not found');
  }

  if (bet.userId !== userId) {
    throw new Error('You do not own this bet');
  }

  if (bet.status !== 'pending') {
    throw new Error('Bet is already resolved or cancelled');
  }

  // Get market
  const market = await marketsPrisma.market.findUnique({
    where: { id: bet.marketId },
  });

  if (!market) {
    throw new Error('Market not found');
  }

  if (market.status === 'resolved') {
    throw new Error('Market is already resolved. Cannot sell position.');
  }

  // Create pool from current reserves
  const pool: Pool = {
    yesReserve: Number(market.yesReserve),
    noReserve: Number(market.noReserve),
  };

  // Validate reserves
  if (pool.yesReserve <= 0 || pool.noReserve <= 0) {
    throw new Error('Market reserves are invalid');
  }

  const shares = Number(bet.sharesReceived);
  if (shares <= 0) {
    throw new Error('No shares to sell');
  }

  // Execute AMM sell
  let sellResult;
  try {
    sellResult = bet.side === 'this'
      ? sellYes(pool, shares, AMM_FEE_BPS)
      : sellNo(pool, shares, AMM_FEE_BPS);
  } catch (error: any) {
    throw new Error(`AMM sell calculation failed: ${error.message}`);
  }

  const creditsReceived = sellResult.sharesOut; // In sell, sharesOut is actually creditsOut
  const profit = creditsReceived - Number(bet.amount);

  // Execute transaction
  return await retryWithBackoffSilent(
    async () => {
      return await usersPrisma.$transaction(async (tx) => {
        // Update user balance
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user) {
          throw new Error('User not found');
        }

        const newBalance = Number(user.creditBalance) + creditsReceived;

        await tx.user.update({
          where: { id: userId },
          data: {
            creditBalance: newBalance,
            availableCredits: newBalance,
            overallPnL: {
              increment: profit,
            },
          },
        });

        // Update bet status
        await tx.bet.update({
          where: { id: betId },
          data: {
            status: 'cancelled', // Mark as cancelled (sold early)
            actualPayout: creditsReceived,
            resolvedAt: new Date(),
          },
        });

        // Create transaction record
        await tx.creditTransaction.create({
          data: {
            userId,
            amount: creditsReceived,
            transactionType: 'position_sold',
            referenceId: betId,
            balanceAfter: newBalance,
          },
        });

        return {
          creditsReceived,
          profit,
          priceImpact: sellResult.priceImpact,
          newPool: sellResult.newPool,
        };
      }, {
        timeout: 10000,
        isolationLevel: 'ReadCommitted',
      });
    },
    {
      maxRetries: 2,
      initialDelayMs: 500,
      retryableErrors: (error) => {
        return error.code === 'P2034' ||
               error.code === 'P1008' ||
               error.message?.includes('timeout') ||
               error.message?.includes('deadlock');
      },
    }
  ).then(async (result) => {
    // Update market reserves
    if (result) {
      try {
        await marketsPrisma.market.update({
          where: { id: market.id },
          data: {
            yesReserve: result.newPool.yesReserve,
            noReserve: result.newPool.noReserve,
            thisOdds: getYesProbability(result.newPool),
            thatOdds: getNoProbability(result.newPool),
          },
        });
      } catch (error) {
        console.error('[AMM] Failed to update market reserves after sell:', error);
      }

      const { newPool, ...response } = result;
      return response;
    }

    throw new Error('Failed to sell position after retries');
  });
}

/**
 * Get quote for a potential trade (without executing)
 */
export async function getTradeQuote(
  marketId: string,
  amount: number,
  side: 'this' | 'that'
): Promise<{
  sharesReceived: number;
  priceImpact: number;
  probabilityBefore: number;
  probabilityAfter: number;
  effectivePrice: number;
}> {
  const market = await marketsPrisma.market.findUnique({
    where: { id: marketId },
  });

  if (!market) {
    throw new Error('Market not found');
  }

  const pool: Pool = {
    yesReserve: Number(market.yesReserve),
    noReserve: Number(market.noReserve),
  };

  if (pool.yesReserve <= 0 || pool.noReserve <= 0) {
    throw new Error('Market reserves are invalid');
  }

  const result = side === 'this'
    ? buyYes(pool, amount, AMM_FEE_BPS)
    : buyNo(pool, amount, AMM_FEE_BPS);

  return {
    sharesReceived: result.sharesOut,
    priceImpact: result.priceImpact,
    probabilityBefore: result.probBefore,
    probabilityAfter: result.probAfter,
    effectivePrice: result.effectivePrice,
  };
}
