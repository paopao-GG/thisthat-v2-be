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
 */
export function getNextClaimTime(): Date {
  const now = new Date();
  const utcNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
  
  // Set to next UTC midnight
  const nextMidnight = new Date(utcNow);
  nextMidnight.setUTCHours(24, 0, 0, 0);
  
  // Convert back to local time
  return new Date(nextMidnight.getTime() - (now.getTimezoneOffset() * 60000));
}

/**
 * Check if a claim is available (it's past 00:00 UTC and user hasn't claimed today)
 */
export function isClaimAvailable(lastClaimDate: Date | null): boolean {
  if (!lastClaimDate) return true;
  
  const now = new Date();
  const lastClaim = new Date(lastClaimDate);
  
  // Convert both to UTC for comparison
  const nowUTC = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
  const lastClaimUTC = new Date(lastClaim.getTime() + (lastClaim.getTimezoneOffset() * 60000));
  
  // Check if it's a new UTC day
  return nowUTC.getUTCDate() !== lastClaimUTC.getUTCDate() ||
         nowUTC.getUTCMonth() !== lastClaimUTC.getUTCMonth() ||
         nowUTC.getUTCFullYear() !== lastClaimUTC.getUTCFullYear();
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
 * If claim is made on a new day, increment streak
 * If claim is made on the same day, return current streak
 */
export function calculateNewStreak(
  currentStreak: number,
  lastClaimDate: Date | null
): number {
  if (isClaimAvailable(lastClaimDate)) {
    // Check if last claim was yesterday (consecutive day)
    if (lastClaimDate) {
      const now = new Date();
      const lastClaim = new Date(lastClaimDate);
      
      const nowUTC = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
      const lastClaimUTC = new Date(lastClaim.getTime() + (lastClaim.getTimezoneOffset() * 60000));
      
      // Calculate days difference
      const timeDiff = nowUTC.getTime() - lastClaimUTC.getTime();
      const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 1) {
        // Consecutive day - increment streak
        return currentStreak + 1;
      } else if (daysDiff > 1) {
        // Streak broken - reset to 1
        return 1;
      }
    }
    // First claim ever
    return 1;
  }
  
  // Same day claim - no streak change
  return currentStreak;
}

