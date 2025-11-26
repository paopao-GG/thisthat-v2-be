/**
 * Credit System Utilities
 * Handles daily claim calculations, streak management, and credit operations
 */

export interface CreditClaimInfo {
  dailyClaimAmount: number;
  streak: number;
  nextClaimAvailable: Date;
  isClaimAvailable: boolean;
  maxClaimReached: boolean;
}

/**
 * Calculate daily claim amount based on streak
 * - Day 1: 1000 credits
 * - Day 2: 1500 credits (+500)
 * - Day 3: 2000 credits (+500)
 * - Day 4: 2500 credits (+500)
 * - ...continues until day 18: 10000 credits (max)
 * - After day 18: stays at 10000 until streak breaks
 */
export function calculateDailyClaimAmount(streak: number): number {
  if (streak <= 0) return 1000;
  
  // At streak 18, we reach max of 10000 credits
  // Formula: 1000 + (streak - 1) * 500, but at streak 18+ we cap at 10000
  if (streak >= 18) return 10000;
  
  const calculatedAmount = 1000 + (streak - 1) * 500;
  return calculatedAmount;
}

/**
 * Get the next UTC midnight (00:00 UTC)
 * PRD: Credit claim happens every 00:00 UTC
 */
export function getNextClaimTime(): Date {
  const now = new Date();
  
  // Get current UTC date components
  const utcYear = now.getUTCFullYear();
  const utcMonth = now.getUTCMonth();
  const utcDate = now.getUTCDate();
  
  // Create next UTC midnight (00:00 UTC of the next day)
  const nextUtcMidnight = new Date(Date.UTC(utcYear, utcMonth, utcDate + 1, 0, 0, 0, 0));
  
  return nextUtcMidnight;
}

/**
 * Get UTC midnight timestamp for a date
 * PRD: Credit claim happens every 00:00 UTC
 */
function getUtcMidnight(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * Check if a claim is available (it's past 00:00 UTC and user hasn't claimed today)
 * PRD: Credit claim happens every 00:00 UTC
 */
export function isClaimAvailable(lastClaimDate: Date | null): boolean {
  if (!lastClaimDate) return true;
  
  const now = new Date();
  const nowMidnight = getUtcMidnight(now);
  const lastClaimMidnight = getUtcMidnight(lastClaimDate);
  
  // Claim is available if we're in a different UTC day
  return nowMidnight > lastClaimMidnight;
}

/**
 * Get credit claim information
 */
export function getCreditClaimInfo(
  streak: number,
  lastClaimDate: Date | null
): CreditClaimInfo {
  const dailyClaimAmount = calculateDailyClaimAmount(streak);
  const claimAvailable = isClaimAvailable(lastClaimDate);
  const nextClaimAvailable = getNextClaimTime();
  const maxClaimReached = dailyClaimAmount >= 10000;

  return {
    dailyClaimAmount,
    streak,
    nextClaimAvailable,
    isClaimAvailable: claimAvailable,
    maxClaimReached,
  };
}

/**
 * Calculate new streak after a successful claim
 * PRD: Each successful claim per day increases the daily log-in streak
 * If claim is made on a new UTC day, increment streak
 * If streak is broken (missed a day), reset to 1
 */
export function calculateNewStreak(
  currentStreak: number,
  lastClaimDate: Date | null
): number {
  if (!lastClaimDate) {
    // First claim ever - start at streak 1
    return 1;
  }
  
  const now = new Date();
  const nowMidnight = getUtcMidnight(now);
  const lastClaimMidnight = getUtcMidnight(lastClaimDate);
  
  // Calculate days difference in UTC
  const daysDiff = Math.floor((nowMidnight - lastClaimMidnight) / (24 * 60 * 60 * 1000));
  
  if (daysDiff === 1) {
    // Consecutive day - increment streak (capped at 18+ for max credits)
    return Math.min(currentStreak + 1, 18);
  } else if (daysDiff > 1) {
    // Streak broken - reset to 1
    return 1;
  }
  
  // Same UTC day - no streak change (shouldn't happen if backend logic is correct)
  return currentStreak;
}

