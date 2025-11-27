import { prisma } from '../../lib/database.js';
import type { PlaceBetInput, BetQueryInput } from './betting.models.js';
import { getPolymarketClient } from '../../lib/polymarket-client.js';
import { normalizeMarket } from '../fetching/market-data/market-data.services.js';
import type { Prisma } from '@prisma/client';

const MIN_BET_AMOUNT = 10;
const MAX_BET_AMOUNT = 10000;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Attempt to load a market from Postgres or create it on-the-fly from Polymarket.
 */
async function findOrSyncMarket(
  tx: Prisma.TransactionClient,
  marketIdentifier: string
) {
  console.log(`[findOrSyncMarket] Looking for market: ${marketIdentifier}`);
  
  // Try polymarketId first so conditionIds work out of the box
  let market = await tx.market.findUnique({
    where: { polymarketId: marketIdentifier },
  });

  if (market) {
    console.log(`[findOrSyncMarket] Found market by polymarketId: ${market.id}`);
    return market;
  }

  // Fallback to UUID lookups when the frontend already knows the Postgres id
  if (UUID_REGEX.test(marketIdentifier)) {
    market = await tx.market.findUnique({ where: { id: marketIdentifier } });
    if (market) {
      console.log(`[findOrSyncMarket] Found market by UUID: ${market.id}`);
      return market;
    }
  }

  console.log(`[findOrSyncMarket] Market not in PostgreSQL cache, fetching from Polymarket API...`);
  
  // As a last resort, fetch the market from Polymarket and insert it locally
  try {
    const polymarketClient = getPolymarketClient();
    
    // Try direct market fetch first
    let polymarket = await polymarketClient.getMarket(marketIdentifier);
    
    // If direct fetch fails, search through markets list
    if (!polymarket) {
      console.log(`[findOrSyncMarket] Direct fetch failed, searching markets list...`);
      const markets = await polymarketClient.getMarkets({ limit: 1000 });
      polymarket = markets.find(
        (m) => m.conditionId === marketIdentifier || m.condition_id === marketIdentifier
      ) || null;
    }
    
    if (!polymarket) {
      console.error(`[findOrSyncMarket] Market not found in Polymarket API: ${marketIdentifier}`);
      return null;
    }

    console.log(`[findOrSyncMarket] Fetched market from Polymarket: ${polymarket.conditionId || polymarket.condition_id}`);
    
    const normalized = normalizeMarket(polymarket);
    if (!normalized.conditionId) {
      console.error(`[findOrSyncMarket] Normalized market missing conditionId`);
      return null;
    }

    // Check if market was created while we were fetching (race condition)
    const existingMarket = await tx.market.findUnique({
      where: { polymarketId: normalized.conditionId },
    });
    
    if (existingMarket) {
      console.log(`[findOrSyncMarket] Market was created concurrently, using existing: ${existingMarket.id}`);
      return existingMarket;
    }

    const status = normalized.status === 'active' ? 'open' : 'closed';
    const expiresAt =
      normalized.endDate && !Number.isNaN(new Date(normalized.endDate).getTime())
        ? new Date(normalized.endDate)
        : null;

    console.log(`[findOrSyncMarket] Creating new market in DB: ${normalized.conditionId}`);
    
    const newMarket = await tx.market.create({
      data: {
        polymarketId: normalized.conditionId,
        title: normalized.question,
        description: normalized.description || null,
        thisOption: normalized.thisOption,
        thatOption: normalized.thatOption,
        thisOdds: normalized.thisOdds || 0.5,
        thatOdds: normalized.thatOdds || 0.5,
        liquidity: normalized.liquidity ?? null,
        category: normalized.category || null,
        marketType: 'polymarket',
        status,
        expiresAt,
      },
    });

    console.log(`[findOrSyncMarket] Successfully created market: ${newMarket.id}`);
    return newMarket;
  } catch (error: any) {
    console.error(`[findOrSyncMarket] Error fetching/creating market:`, error.message || error);
    return null;
  }
}

/**
 * Place a bet on a market
 */
export async function placeBet(
  userId: string,
  input: PlaceBetInput
): Promise<{
  bet: any;
  newBalance: number;
  potentialPayout: number;
}> {
  return await prisma.$transaction(async (tx) => {
    // Get user
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const market = await findOrSyncMarket(tx, input.marketId);
    if (!market) throw new Error('Market not found');
    if (market.status !== 'open') throw new Error('Market is not open');
    
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

    // Check available credits
    const availableCredits = Number(user.availableCredits);
    if (availableCredits < input.amount) {
      throw new Error('Insufficient credits');
    }

    // Get odds for selected side
    const odds = input.side === 'this' ? Number(market.thisOdds) : Number(market.thatOdds);
    if (odds <= 0 || odds > 1) {
      throw new Error('Invalid odds');
    }

    // Calculate potential payout: betAmount / odds
    const potentialPayout = input.amount / odds;

    const balanceBefore = availableCredits;
    const balanceAfter = balanceBefore - input.amount;

    // Create bet record
    // Use relation connects so Prisma doesn't require nested user object in strict mode
    const bet = await tx.bet.create({
      data: {
        user: {
          connect: { id: userId },
        },
        market: {
          connect: { id: market.id },
        },
        amount: input.amount,
        side: input.side,
        oddsAtBet: odds,
        potentialPayout,
        status: 'pending',
      },
      include: {
        market: {
          select: {
            id: true,
            title: true,
            thisOption: true,
            thatOption: true,
            status: true,
          },
        },
      },
    });

    // Update user credits
    await tx.user.update({
      where: { id: userId },
      data: {
        availableCredits: balanceAfter,
        creditBalance: balanceAfter, // Also update main balance
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
        amount: -input.amount, // Negative for debit
        transactionType: 'bet_placed',
        referenceId: bet.id,
        balanceAfter,
      },
    });

    return {
      bet,
      newBalance: balanceAfter,
      potentialPayout,
    };
  });
}

/**
 * Get user's bets with filters and pagination
 */
export async function getUserBets(
  userId: string,
  query: BetQueryInput
): Promise<{
  bets: any[];
  total: number;
  limit: number;
  offset: number;
}> {
  const where: any = {
    userId,
  };

  if (query.status) {
    where.status = query.status;
  }

  if (query.marketId) {
    where.marketId = query.marketId;
  }

  const [bets, total] = await Promise.all([
    prisma.bet.findMany({
      where,
      include: {
        market: {
          select: {
            id: true,
            title: true,
            thisOption: true,
            thatOption: true,
            status: true,
            resolution: true,
            resolvedAt: true,
          },
        },
      },
      orderBy: {
        placedAt: 'desc',
      },
      take: query.limit,
      skip: query.offset,
    }),
    prisma.bet.count({ where }),
  ]);

  return {
    bets,
    total,
    limit: query.limit,
    offset: query.offset,
  };
}

/**
 * Get bet by ID
 */
export async function getBetById(betId: string, userId: string): Promise<any | null> {
  const bet = await prisma.bet.findFirst({
    where: {
      id: betId,
      userId, // Ensure user can only access their own bets
    },
    include: {
      market: {
        select: {
          id: true,
          title: true,
          description: true,
          thisOption: true,
          thatOption: true,
          status: true,
          resolution: true,
          resolvedAt: true,
          expiresAt: true,
        },
      },
    },
  });

  return bet;
}

/**
 * Sell a position early (before market expires)
 * Calculates current value based on live odds and returns credits to user
 */
export async function sellPosition(
  userId: string,
  betId: string,
  input?: { amount?: number }
): Promise<{
  bet: any;
  creditsReturned: number;
  newBalance: number;
  currentValue: number;
}> {
  return await prisma.$transaction(async (tx) => {
    // Get bet
    const bet = await tx.bet.findUnique({
      where: { id: betId },
      include: {
        user: true,
        market: true,
      },
    });

    if (!bet) {
      throw new Error('Bet not found');
    }

    // Verify ownership
    if (bet.userId !== userId) {
      throw new Error('Unauthorized: This bet does not belong to you');
    }

    // Check if bet is sellable (must be pending and market must be open)
    if (bet.status !== 'pending') {
      throw new Error(`Cannot sell: Bet status is ${bet.status}`);
    }

    if (bet.market.status !== 'open') {
      throw new Error('Cannot sell: Market is not open');
    }

    // Check if market has expired
    if (bet.market.expiresAt && new Date() > bet.market.expiresAt) {
      throw new Error('Cannot sell: Market has expired');
    }

    // Get current live odds from Polymarket
    let currentOdds: number;
    if (bet.market.polymarketId) {
      try {
        const { fetchLivePriceData } = await import('../markets/markets.services.js');
        const liveData = await fetchLivePriceData(bet.market.polymarketId);
        
        if (!liveData) {
          throw new Error('Failed to fetch current market prices');
        }

        // Get current odds for the side user bet on
        currentOdds = bet.side === 'this' ? liveData.thisOdds : liveData.thatOdds;
      } catch (error: any) {
        console.error(`[Sell Position] Error fetching live odds: ${error.message}`);
        // Fallback: use market's stored odds (may be stale)
        currentOdds = bet.side === 'this' 
          ? Number(bet.market.thisOdds) 
          : Number(bet.market.thatOdds);
      }
    } else {
      // No Polymarket ID, use stored odds
      currentOdds = bet.side === 'this' 
        ? Number(bet.market.thisOdds) 
        : Number(bet.market.thatOdds);
    }

    // Calculate current value of position
    // Formula: currentValue = betAmount * (currentOdds / oddsAtBet)
    // This represents what the position is worth now based on current market price
    const betAmount = Number(bet.amount);
    const oddsAtBet = Number(bet.oddsAtBet);
    const sellAmount = input?.amount ? Math.min(input.amount, betAmount) : betAmount;
    
    // Calculate current value for the amount being sold
    const currentValue = sellAmount * (currentOdds / oddsAtBet);

    // Calculate credits to return (current value)
    const creditsReturned = Math.max(0, currentValue); // Ensure non-negative

    const balanceBefore = Number(bet.user.creditBalance);
    const balanceAfter = balanceBefore + creditsReturned;

    // Update bet status
    if (sellAmount >= betAmount) {
      // Selling entire position - mark as sold/cancelled
      await tx.bet.update({
        where: { id: bet.id },
        data: {
          status: 'cancelled', // Using cancelled status for early sells
          actualPayout: creditsReturned,
          resolvedAt: new Date(),
        },
      });
    } else {
      // Partial sell - this would require splitting the bet, which is complex
      // For now, we'll only support full position sells
      throw new Error('Partial position selling is not yet supported. Please sell your entire position.');
    }

    // Update user credits
    await tx.user.update({
      where: { id: userId },
      data: {
        creditBalance: balanceAfter,
        availableCredits: balanceAfter,
        // Update PnL: creditsReturned - betAmount (could be negative if odds moved against user)
        overallPnL: {
          increment: creditsReturned - sellAmount,
        },
      },
    });

    // Create credit transaction
    await tx.creditTransaction.create({
      data: {
        userId,
        amount: creditsReturned,
        transactionType: 'position_sold',
        referenceId: bet.id,
        balanceAfter,
      },
    });

    // Get updated bet
    const updatedBet = await tx.bet.findUnique({
      where: { id: bet.id },
      include: {
        market: {
          select: {
            id: true,
            title: true,
            thisOption: true,
            thatOption: true,
            status: true,
          },
        },
      },
    });

    return {
      bet: updatedBet,
      creditsReturned,
      newBalance: balanceAfter,
      currentValue: creditsReturned,
    };
  });
}

