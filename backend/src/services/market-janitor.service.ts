/**
 * Market Janitor Service
 *
 * Handles stale and overdue markets:
 * - Marks expired markets as 'closed'
 * - Checks for resolved markets from Polymarket
 * - Processes payouts for resolved markets
 * - Cleans up old resolved markets (optional archival)
 */

import { prisma } from '../lib/database.js';
import { getPolymarketClient } from '../lib/polymarket-client.js';
import { settlePositionsForMarket } from '../features/positions/positions.services.js';
import { retryWithBackoffSilent } from '../lib/retry.js';

export interface JanitorResult {
  checkedMarkets: number;
  closedMarkets: number;
  resolvedMarkets: number;
  processedPayouts: number;
  settledPositions: number;
  errors: number;
}

/**
 * Get all markets that have passed their expiry date but are still 'open'
 */
async function getExpiredMarkets() {
  const now = new Date();

  return prisma.market.findMany({
    where: {
      status: 'open',
      expiresAt: {
        lte: now,
      },
    },
  });
}

/**
 * Get all markets that are 'closed' but not yet 'resolved'
 * These need to be checked against Polymarket for resolution
 */
async function getClosedUnresolvedMarkets() {
  return prisma.market.findMany({
    where: {
      status: 'closed',
      resolution: null,
      polymarketId: { not: null },
    },
    take: 100, // Process in batches
  });
}

/**
 * Check if a market has been resolved on Polymarket
 */
async function checkPolymarketResolution(polymarketId: string): Promise<{
  resolved: boolean;
  resolution: 'this' | 'that' | 'invalid' | null;
}> {
  const client = getPolymarketClient();

  try {
    // Retry API call with exponential backoff (silent - returns null on failure)
    const market = await retryWithBackoffSilent(
      () => client.getMarket(polymarketId),
      {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
      }
    );

    if (!market) {
      return { resolved: false, resolution: null };
    }

    // Check if market is resolved by looking at tokens
    const winningToken = market.tokens?.find((t) => t.winner === true);

    if (winningToken) {
      // Parse outcomes
      let outcomes: string[] = [];
      if (typeof market.outcomes === 'string') {
        try {
          outcomes = JSON.parse(market.outcomes);
        } catch {
          outcomes = ['YES', 'NO'];
        }
      } else if (Array.isArray(market.outcomes)) {
        outcomes = market.outcomes;
      }

      const thisOption = outcomes[0] || 'YES';

      // Determine if THIS or THAT won
      const resolution = winningToken.outcome === thisOption ? 'this' : 'that';
      return { resolved: true, resolution };
    }

    // Check for invalid/cancelled market
    if (market.archived && !market.accepting_orders && !winningToken) {
      // Market was closed without a clear winner - might be invalid
      return { resolved: true, resolution: 'invalid' };
    }

    return { resolved: false, resolution: null };
  } catch (error: any) {
    console.error(`[Janitor] Error checking resolution for ${polymarketId}:`, error.message);
    return { resolved: false, resolution: null };
  }
}

/**
 * Process payouts for a resolved market
 */
async function processMarketPayouts(
  marketId: string,
  resolution: 'this' | 'that' | 'invalid'
): Promise<number> {
  let processedCount = 0;

  // Get all pending bets for this market
  const pendingBets = await prisma.bet.findMany({
    where: {
      marketId,
      status: 'pending',
    },
    include: {
      user: true,
    },
  });

  for (const bet of pendingBets) {
    try {
      if (resolution === 'invalid') {
        // Refund the bet
        await prisma.$transaction(async (tx) => {
          // Update bet status
          await tx.bet.update({
            where: { id: bet.id },
            data: {
              status: 'cancelled',
              resolvedAt: new Date(),
            },
          });

          // Refund credits
          await tx.user.update({
            where: { id: bet.userId },
            data: {
              creditBalance: { increment: bet.amount },
              availableCredits: { increment: bet.amount },
            },
          });

          // Log transaction
          await tx.creditTransaction.create({
            data: {
              userId: bet.userId,
              amount: bet.amount,
              transactionType: 'bet_refund',
              referenceId: bet.id,
              balanceAfter: bet.user.creditBalance.add(bet.amount),
            },
          });
        });
      } else {
        // Check if bet won
        const betWon = bet.side === resolution;

        if (betWon) {
          // Process winning bet
          await prisma.$transaction(async (tx) => {
            // Update bet status
            await tx.bet.update({
              where: { id: bet.id },
              data: {
                status: 'won',
                actualPayout: bet.potentialPayout,
                resolvedAt: new Date(),
              },
            });

            // Credit winnings
            const payoutAmount = typeof bet.potentialPayout === 'number' 
              ? bet.potentialPayout 
              : Number(bet.potentialPayout);
            const betAmount = typeof bet.amount === 'number' 
              ? bet.amount 
              : Number(bet.amount);
            await tx.user.update({
              where: { id: bet.userId },
              data: {
                creditBalance: { increment: payoutAmount },
                availableCredits: { increment: payoutAmount },
                overallPnL: { increment: payoutAmount - betAmount },
              },
            });

            // Log transaction
            const balanceAfter = typeof bet.user.creditBalance === 'number'
              ? bet.user.creditBalance + payoutAmount
              : Number(bet.user.creditBalance) + payoutAmount;
            await tx.creditTransaction.create({
              data: {
                userId: bet.userId,
                amount: payoutAmount,
                transactionType: 'bet_payout',
                referenceId: bet.id,
                balanceAfter,
              },
            });
          });
        } else {
          // Process losing bet
          await prisma.$transaction(async (tx) => {
            // Update bet status
            await tx.bet.update({
              where: { id: bet.id },
              data: {
                status: 'lost',
                actualPayout: 0,
                resolvedAt: new Date(),
              },
            });

            // Update user PnL (loss = negative of bet amount)
            await tx.user.update({
              where: { id: bet.userId },
              data: {
                overallPnL: { decrement: bet.amount },
              },
            });
          });
        }
      }

      processedCount++;
    } catch (error: any) {
      console.error(`[Janitor] Error processing bet ${bet.id}:`, error.message);
    }
  }

  return processedCount;
}

/**
 * Main janitor function - runs all cleanup tasks
 */
export async function runJanitorTasks(): Promise<JanitorResult> {
  const result: JanitorResult = {
    checkedMarkets: 0,
    closedMarkets: 0,
    resolvedMarkets: 0,
    processedPayouts: 0,
    settledPositions: 0,
    errors: 0,
  };

  try {
    // Step 1: Close expired markets
    const expiredMarkets = await getExpiredMarkets();
    result.checkedMarkets += expiredMarkets.length;

    for (const market of expiredMarkets) {
      try {
        await prisma.market.update({
          where: { id: market.id },
          data: { status: 'closed' },
        });
        result.closedMarkets++;
        console.log(`[Janitor] Closed expired market: ${market.title}`);
      } catch (error: any) {
        console.error(`[Janitor] Error closing market ${market.id}:`, error.message);
        result.errors++;
      }
    }

    // Step 2: Check closed markets for resolution
    const closedMarkets = await getClosedUnresolvedMarkets();
    result.checkedMarkets += closedMarkets.length;

    for (const market of closedMarkets) {
      if (!market.polymarketId) continue;

      try {
        const { resolved, resolution } = await checkPolymarketResolution(market.polymarketId);

        if (resolved && resolution) {
          // Update market resolution
          await prisma.market.update({
            where: { id: market.id },
            data: {
              status: 'resolved',
              resolution,
              resolvedAt: new Date(),
            },
          });

          result.resolvedMarkets++;
          console.log(`[Janitor] Resolved market: ${market.title} -> ${resolution}`);

          // Process payouts for old betting system
          const payoutsProcessed = await processMarketPayouts(market.id, resolution);
          result.processedPayouts += payoutsProcessed;

          // Settle positions for new trading system
          try {
            const positionResult = await settlePositionsForMarket(market.id, resolution);
            result.settledPositions += positionResult.settled;
            console.log(`[Janitor] Settled ${positionResult.settled} positions, payout: ${positionResult.totalPayout}`);
          } catch (posError: any) {
            console.error(`[Janitor] Error settling positions for market ${market.id}:`, posError.message);
          }
        }
      } catch (error: any) {
        console.error(`[Janitor] Error resolving market ${market.id}:`, error.message);
        result.errors++;
      }
    }

    return result;
  } catch (error: any) {
    console.error('[Janitor] Fatal error:', error.message);
    throw error;
  }
}

/**
 * Get janitor status (markets pending cleanup)
 */
export async function getJanitorStatus(): Promise<{
  expiredOpenMarkets: number;
  closedUnresolvedMarkets: number;
  pendingBets: number;
}> {
  const now = new Date();

  const [expiredOpenMarkets, closedUnresolvedMarkets, pendingBets] = await Promise.all([
    prisma.market.count({
      where: {
        status: 'open',
        expiresAt: { lte: now },
      },
    }),
    prisma.market.count({
      where: {
        status: 'closed',
        resolution: null,
        polymarketId: { not: null },
      },
    }),
    prisma.bet.count({
      where: { status: 'pending' },
    }),
  ]);

  return {
    expiredOpenMarkets,
    closedUnresolvedMarkets,
    pendingBets,
  };
}
