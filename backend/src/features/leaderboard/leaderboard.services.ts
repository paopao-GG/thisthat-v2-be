import { prisma } from '../../lib/database.js';
import { safeRedisGet, safeRedisSetEx, safeRedisDel, safeRedisKeys } from '../../lib/redis.js';

const LEADERBOARD_CACHE_TTL = 5 * 60; // 5 minutes in seconds

/**
 * Get PnL leaderboard (top users by overall PnL)
 */
export async function getPnLLeaderboard(limit: number = 100, offset: number = 0) {
  const cacheKey = `leaderboard:pnl:${limit}:${offset}`;
  
  // Try cache first
  const cached = await safeRedisGet(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Query database
  const users = await prisma.user.findMany({
    orderBy: { overallPnL: 'desc' },
    take: limit,
    skip: offset,
    select: {
      id: true,
      username: true,
      overallPnL: true,
      totalVolume: true,
      rankByPnL: true,
    },
  });

  const total = await prisma.user.count();

  const leaderboard = users.map((user, index) => ({
    rank: offset + index + 1,
    user: {
      id: user.id,
      username: user.username,
    },
    overallPnL: Number(user.overallPnL),
    totalVolume: Number(user.totalVolume),
  }));

  const result = {
    leaderboard,
    total,
    limit,
    offset,
  };

  // Cache result
  await safeRedisSetEx(cacheKey, LEADERBOARD_CACHE_TTL, JSON.stringify(result));

  return result;
}

/**
 * Get Volume leaderboard (top users by total volume)
 */
export async function getVolumeLeaderboard(limit: number = 100, offset: number = 0) {
  const cacheKey = `leaderboard:volume:${limit}:${offset}`;
  
  // Try cache first
  const cached = await safeRedisGet(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Query database
  const users = await prisma.user.findMany({
    orderBy: { totalVolume: 'desc' },
    take: limit,
    skip: offset,
    select: {
      id: true,
      username: true,
      totalVolume: true,
      overallPnL: true,
      rankByVolume: true,
    },
  });

  const total = await prisma.user.count();

  const leaderboard = users.map((user, index) => ({
    rank: offset + index + 1,
    user: {
      id: user.id,
      username: user.username,
    },
    totalVolume: Number(user.totalVolume),
    overallPnL: Number(user.overallPnL),
  }));

  const result = {
    leaderboard,
    total,
    limit,
    offset,
  };

  // Cache result
  await safeRedisSetEx(cacheKey, LEADERBOARD_CACHE_TTL, JSON.stringify(result));

  return result;
}

/**
 * Get user's current ranking
 */
export async function getUserRanking(userId: string, type: 'pnl' | 'volume'): Promise<{
  rank: number | null;
  totalUsers: number;
  overallPnL: number;
  totalVolume: number;
} | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        rankByPnL: true,
        rankByVolume: true,
        overallPnL: true,
        totalVolume: true,
      },
    });

    if (!user) {
      return null;
    }

    const totalUsers = await prisma.user.count();

    return {
      rank: type === 'pnl' ? user.rankByPnL : user.rankByVolume,
      totalUsers,
      overallPnL: Number(user.overallPnL),
      totalVolume: Number(user.totalVolume),
    };
  } catch (error) {
    console.error('Error getting user ranking:', error);
    return null;
  }
}

/**
 * Recalculate and update all user rankings
 */
export async function updateAllRankings(): Promise<{
  pnlUpdated: number;
  volumeUpdated: number;
}> {
  try {
    // Get all users ordered by PnL
    const pnlUsers = await prisma.user.findMany({
      orderBy: { overallPnL: 'desc' },
      select: { id: true },
    });

    // Get all users ordered by Volume
    const volumeUsers = await prisma.user.findMany({
      orderBy: { totalVolume: 'desc' },
      select: { id: true },
    });

    // Update PnL rankings
    const pnlUpdates = pnlUsers.map((user, index) =>
      prisma.user.update({
        where: { id: user.id },
        data: { rankByPnL: index + 1 },
      })
    );

    // Update Volume rankings
    const volumeUpdates = volumeUsers.map((user, index) =>
      prisma.user.update({
        where: { id: user.id },
        data: { rankByVolume: index + 1 },
      })
    );

    await Promise.all([...pnlUpdates, ...volumeUpdates]);

    // Invalidate Redis cache
    const keys = await safeRedisKeys('leaderboard:*');
    if (keys.length > 0) {
      await safeRedisDel(keys);
    }

    return {
      pnlUpdated: pnlUsers.length,
      volumeUpdated: volumeUsers.length,
    };
  } catch (error) {
    console.error('Error updating rankings:', error);
    throw error;
  }
}

