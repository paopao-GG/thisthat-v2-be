import React, { useState, useEffect, useMemo } from 'react';
import { getCreditClaimInfo, calculateDailyClaimAmount } from '@shared/utils/creditSystem';
import { claimDailyCredits } from '@shared/services/economyService';
import { useAuth } from '@shared/contexts/AuthContext';

interface DailyCreditsSectionProps {
  dailyStreak: number;
  lastClaimDate: Date | null;
  onClaim?: () => void;
}

const DailyCreditsSection: React.FC<DailyCreditsSectionProps> = ({
  dailyStreak,
  lastClaimDate,
  onClaim
}) => {
  const { refreshUser } = useAuth();
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [justClaimed, setJustClaimed] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(dailyStreak);
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const claimInfo = useMemo(() => {
    return getCreditClaimInfo(currentStreak, lastClaimDate);
  }, [currentStreak, lastClaimDate]);
  
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const nextClaim = claimInfo.nextClaimAvailable;
      const diff = nextClaim.getTime() - now.getTime();
      
      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemaining({ hours, minutes, seconds });
      } else {
        setTimeRemaining({ hours: 0, minutes: 0, seconds: 0 });
      }
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [claimInfo.nextClaimAvailable]);

  const handleClaim = async () => {
    if (isClaiming || !claimInfo.isClaimAvailable) return;
    
    setIsClaiming(true);
    setError(null);
    
    try {
      const response = await claimDailyCredits();
      
      if (response.success) {
        // Only mark as claimed if credits were actually awarded
        if (response.creditsAwarded > 0) {
          setJustClaimed(true);
          setCurrentStreak(response.consecutiveDays);
          
          // Refresh user data to update credits
          if (refreshUser) {
            await refreshUser();
          }
          
          // Call parent callback if provided
          if (onClaim) {
            onClaim();
          }
        } else {
          // Already claimed today - refresh user data to update lastClaimDate
          if (refreshUser) {
            await refreshUser();
          }
          // Don't show error, just update the UI state
        }
      } else {
        setError(response.error || 'Failed to claim daily credits');
      }
    } catch (err: any) {
      console.error('Error claiming daily credits:', err);
      setError(err.message || 'Failed to claim daily credits');
    } finally {
      setIsClaiming(false);
    }
  };

  const nextStreakAmount = calculateDailyClaimAmount(currentStreak + 1);
  const streakDisplay = currentStreak >= 18 ? '18+' : currentStreak;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
          <p className="text-red-400 text-sm text-center">{error}</p>
        </div>
      )}

      {/* Title and Subtitle - Show before claiming */}
      {!justClaimed && (
        <>
          <p className="text-[#f5f5f5] text-lg font-medium mb-1 text-center">Play with Credits!</p>
          <p className="text-[#f5f5f5]/50 text-sm mb-4 text-center">
            {currentStreak > 0 ? `${streakDisplay}-Day Streak` : 'Earn them every 24 hours'}
          </p>
        </>
      )}
      
      {/* Daily Streak - Show only after claiming */}
      {justClaimed && (
        <>
          <p className="text-[#f5f5f5] text-lg font-medium mb-1 text-center">{streakDisplay}-Day Streak</p>
          <p className="text-[#f5f5f5]/50 text-sm mb-4 text-center">
            {currentStreak < 18 ? (
              <>Next streak: <span className="font-medium text-[#f5f5f5]">{nextStreakAmount.toLocaleString()} points</span></>
            ) : (
              <>Max streak reached! <span className="font-medium text-[#f5f5f5]">10,000 points/day</span></>
            )}
          </p>
        </>
      )}
      
      {/* Timer Button - Show when claimed or not available */}
      {justClaimed || !claimInfo.isClaimAvailable ? (
        <button
          className="w-full py-5 px-10 text-sm font-light text-white rounded-xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] block tracking-wider daily-credits-timer-button"
          disabled
        >
          <span className="relative z-10">
            {justClaimed ? 'Claimed!' : `Available in ${String(timeRemaining.hours).padStart(2, '0')}:${String(timeRemaining.minutes).padStart(2, '0')}:${String(timeRemaining.seconds).padStart(2, '0')}`}
          </span>
        </button>
      ) : (
        <button
          onClick={handleClaim}
          disabled={isClaiming}
          className="w-full py-5 px-10 text-sm font-light text-white rounded-xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] block tracking-wider daily-credits-timer-button disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="relative z-10">
            {isClaiming ? 'Claiming...' : `Claim ${claimInfo.dailyClaimAmount.toLocaleString()} points`}
          </span>
        </button>
      )}
    </div>
  );
};

export default DailyCreditsSection;

