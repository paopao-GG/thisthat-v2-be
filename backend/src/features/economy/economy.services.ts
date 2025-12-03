import { usersPrisma as prisma } from '../../lib/database.js';
import { generateTransactionHash } from '../../lib/transaction-signer.js';
import type { BuyStockInput, SellStockInput } from './economy.models.js';

const STARTING_DAILY_CREDITS = 1000; // Starting daily credit allocation (Day 1)
const DAILY_INCREMENT = 500; // Increment per consecutive day
const MAX_DAILY_CREDITS = 10000; // Maximum daily credits (reached at day 18)
const MAX_STREAK_DAYS = 18; // Days to reach max credits
const MS_IN_DAY = 24 * 60 * 60 * 1000;

function getUtcMidnight(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function getNextUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
}

/**
 * Calculate daily credit allocation based on consecutive days
 * PRD: Starting from 1000 credits up to 1500, 2000, 2500... until max of 10000 (18-day streak)
 */
export function calculateDailyCredits(consecutiveDays: number): number {
  if (consecutiveDays >= MAX_STREAK_DAYS) {
    return MAX_DAILY_CREDITS;
  }

  const cappedDays = Math.max(1, consecutiveDays);
  const credits = STARTING_DAILY_CREDITS + (cappedDays - 1) * DAILY_INCREMENT;

  return Math.min(credits, MAX_DAILY_CREDITS);
}

/**
 * Process daily credit allocation for a user
 * Updates consecutive days online and allocates credits
 */
export async function processDailyCreditAllocation(userId: string): Promise<{
  creditsAwarded: number;
  consecutiveDays: number;
  nextAvailableAt: Date;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const now = new Date();
  const lastRewardAt = user.lastDailyRewardAt;

  // Check if user can claim daily reward (resets at 00:00 UTC)
  // PRD: Credit claim happens every 00:00 UTC
  if (lastRewardAt) {
    const nowMidnight = getUtcMidnight(now);
    const lastRewardMidnight = getUtcMidnight(lastRewardAt);

    if (nowMidnight === lastRewardMidnight) {
      const nextAvailable = getNextUtcMidnight(lastRewardAt);
      return {
        creditsAwarded: 0,
        consecutiveDays: user.consecutiveDaysOnline,
        nextAvailableAt: nextAvailable,
      };
    }
  }

  // Calculate consecutive days based on last rewarding day
  let consecutiveDays = 1;
  if (lastRewardAt) {
    const daysSinceLastReward = Math.floor(
      (getUtcMidnight(now) - getUtcMidnight(lastRewardAt)) / MS_IN_DAY
    );

    if (daysSinceLastReward === 1) {
      consecutiveDays = user.consecutiveDaysOnline + 1;
    } else if (daysSinceLastReward <= 0) {
      consecutiveDays = user.consecutiveDaysOnline || 1;
    } else {
      consecutiveDays = 1;
    }
  }

  // Calculate credits to award
  const creditsAwarded = calculateDailyCredits(consecutiveDays);

  // Update user and create transaction atomically
  await prisma.$transaction(async (tx) => {
    // Update user
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        creditBalance: {
          increment: creditsAwarded,
        },
        availableCredits: {
          increment: creditsAwarded,
        },
        consecutiveDaysOnline: consecutiveDays,
        lastDailyRewardAt: now,
        lastLoginAt: now,
      },
    });

    // Create credit transaction
    await tx.creditTransaction.create({
      data: {
        userId,
        amount: creditsAwarded,
        transactionType: 'daily_reward',
        balanceAfter: Number(updatedUser.creditBalance),
      },
    });

    // Create daily reward record
    await tx.dailyReward.create({
      data: {
        userId,
        creditsAwarded,
        claimedAt: now,
      },
    });
  });

  const nextAvailable = getNextUtcMidnight(now);

  return {
    creditsAwarded,
    consecutiveDays,
    nextAvailableAt: nextAvailable,
  };
}

/**
 * Buy stocks with leverage
 */
export async function buyStock(
  userId: string,
  input: BuyStockInput
): Promise<{
  transaction: any;
  holding: any;
  newBalance: number;
}> {
  return await prisma.$transaction(async (tx) => {
    // Get user and stock
    const user = await tx.user.findUnique({ where: { id: userId } });
    const stock = await tx.stock.findUnique({ where: { id: input.stockId } });

    if (!user) throw new Error('User not found');
    if (!stock) throw new Error('Stock not found');
    if (stock.status !== 'active') throw new Error('Stock is not active');

    // Validate leverage
    if (input.leverage > Number(stock.maxLeverage)) {
      throw new Error(`Maximum leverage is ${stock.maxLeverage}x`);
    }

    // Calculate total cost (shares * price * leverage)
    const totalCost = Number(input.shares) * Number(stock.currentPrice) * input.leverage;

    // Check available credits
    if (Number(user.availableCredits) < totalCost) {
      throw new Error('Insufficient credits');
    }

    // Get or create holding
    let holding = await tx.stockHolding.findUnique({
      where: {
        userId_stockId: {
          userId,
          stockId: input.stockId,
        },
      },
    });

    const balanceBefore = Number(user.availableCredits);
    const balanceAfter = balanceBefore - totalCost;

    // Update or create holding
    if (holding) {
      // Update existing holding (calculate new average)
      const totalShares = Number(holding.shares) + Number(input.shares);
      const totalInvested = Number(holding.totalInvested) + totalCost;
      const newAveragePrice = totalInvested / totalShares;

      holding = await tx.stockHolding.update({
        where: { id: holding.id },
        data: {
          shares: totalShares,
          averageBuyPrice: newAveragePrice,
          totalInvested: totalInvested,
          leverage: input.leverage, // Update leverage
        },
      });
    } else {
      // Create new holding
      holding = await tx.stockHolding.create({
        data: {
          userId,
          stockId: input.stockId,
          shares: input.shares,
          averageBuyPrice: Number(stock.currentPrice),
          totalInvested: totalCost,
          leverage: input.leverage,
        },
      });
    }

    // Update user credits
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        availableCredits: balanceAfter,
        expendedCredits: {
          increment: totalCost,
        },
      },
    });

    // Update stock circulating supply and market cap
    const newCirculatingSupply = Number(stock.circulatingSupply) + Number(input.shares);
    const newMarketCap = Number(stock.currentPrice) * newCirculatingSupply;
    
    await tx.stock.update({
      where: { id: input.stockId },
      data: {
        circulatingSupply: newCirculatingSupply,
        marketCap: newMarketCap,
      },
    });

    // Generate transaction hash
    const transactionHash = generateTransactionHash(
      userId,
      input.stockId,
      'buy',
      Number(input.shares),
      Number(stock.currentPrice)
    );

    // Create transaction record
    const transaction = await tx.stockTransaction.create({
      data: {
        userId,
        stockId: input.stockId,
        type: 'buy',
        shares: input.shares,
        pricePerShare: stock.currentPrice,
        totalAmount: totalCost,
        leverage: input.leverage,
        transactionHash,
        balanceBefore,
        balanceAfter,
      },
    });

    // Create credit transaction
    await tx.creditTransaction.create({
      data: {
        userId,
        amount: -totalCost, // Negative for debit
        transactionType: 'stock_purchase',
        referenceId: transaction.id,
        balanceAfter,
      },
    });

    return {
      transaction,
      holding,
      newBalance: balanceAfter,
    };
  });
}

/**
 * Sell stocks
 */
export async function sellStock(
  userId: string,
  input: SellStockInput
): Promise<{
  transaction: any;
  holding: any;
  newBalance: number;
  profit: number;
}> {
  return await prisma.$transaction(async (tx) => {
    // Get user and stock
    const user = await tx.user.findUnique({ where: { id: userId } });
    const stock = await tx.stock.findUnique({ where: { id: input.stockId } });

    if (!user) throw new Error('User not found');
    if (!stock) throw new Error('Stock not found');
    if (stock.status !== 'active') throw new Error('Stock is not active');

    // Get holding
    const holding = await tx.stockHolding.findUnique({
      where: {
        userId_stockId: {
          userId,
          stockId: input.stockId,
        },
      },
    });

    if (!holding) throw new Error('No stock holding found');
    if (Number(holding.shares) < Number(input.shares)) {
      throw new Error('Insufficient shares');
    }

    // Calculate sale proceeds
    const saleProceeds = Number(input.shares) * Number(stock.currentPrice);
    const costBasis = Number(input.shares) * Number(holding.averageBuyPrice);
    const profit = saleProceeds - costBasis;

    const balanceBefore = Number(user.availableCredits);
    const balanceAfter = balanceBefore + saleProceeds;

    // Update holding
    const remainingShares = Number(holding.shares) - Number(input.shares);
    let updatedHolding;
    
    if (remainingShares > 0) {
      // Update holding with remaining shares
      updatedHolding = await tx.stockHolding.update({
        where: { id: holding.id },
        data: {
          shares: remainingShares,
          totalInvested: Number(holding.totalInvested) - costBasis,
        },
      });
    } else {
      // Delete holding if all shares sold
      await tx.stockHolding.delete({
        where: { id: holding.id },
      });
      updatedHolding = null;
    }

    // Update user credits
    await tx.user.update({
      where: { id: userId },
      data: {
        availableCredits: balanceAfter,
        overallPnL: {
          increment: profit,
        },
      },
    });

    // Update stock circulating supply and market cap
    const newCirculatingSupply = Number(stock.circulatingSupply) - Number(input.shares);
    const newMarketCap = Number(stock.currentPrice) * newCirculatingSupply;
    
    await tx.stock.update({
      where: { id: input.stockId },
      data: {
        circulatingSupply: newCirculatingSupply,
        marketCap: newMarketCap,
      },
    });

    // Generate transaction hash
    const transactionHash = generateTransactionHash(
      userId,
      input.stockId,
      'sell',
      Number(input.shares),
      Number(stock.currentPrice)
    );

    // Create transaction record
    const transaction = await tx.stockTransaction.create({
      data: {
        userId,
        stockId: input.stockId,
        type: 'sell',
        shares: input.shares,
        pricePerShare: stock.currentPrice,
        totalAmount: saleProceeds,
        leverage: holding.leverage,
        transactionHash,
        balanceBefore,
        balanceAfter,
      },
    });

    // Create credit transaction
    await tx.creditTransaction.create({
      data: {
        userId,
        amount: saleProceeds, // Positive for credit
        transactionType: 'stock_sale',
        referenceId: transaction.id,
        balanceAfter,
      },
    });

    return {
      transaction,
      holding: updatedHolding,
      newBalance: balanceAfter,
      profit,
    };
  });
}

/**
 * Get user's stock portfolio
 */
export async function getUserPortfolio(userId: string) {
  const holdings = await prisma.stockHolding.findMany({
    where: { userId },
    include: {
      stock: true,
    },
  });

  return holdings.map((holding) => {
    const currentValue = Number(holding.shares) * Number(holding.stock.currentPrice);
    const costBasis = Number(holding.totalInvested);
    const profit = currentValue - costBasis;
    const profitPercent = costBasis > 0 ? (profit / costBasis) * 100 : 0;

    return {
      ...holding,
      currentValue,
      profit,
      profitPercent,
    };
  });
}

