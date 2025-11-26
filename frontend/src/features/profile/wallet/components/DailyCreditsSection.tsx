import React, { useState, useEffect, useMemo } from 'react';
import { getCreditClaimInfo } from '@shared/utils/creditSystem';

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
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [justClaimed, setJustClaimed] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(dailyStreak);
  
  const claimInfo = useMemo(() => {
    return getCreditClaimInfo(dailyStreak, lastClaimDate);
  }, [dailyStreak, lastClaimDate]);
  
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

  const handleClaim = () => {
    setJustClaimed(true);
    setCurrentStreak(prev => prev + 1);
    if (onClaim) {
      onClaim();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Title and Subtitle - Show before claiming */}
      {!justClaimed && (
        <>
          <p className="text-[#f5f5f5] text-lg font-medium mb-1 text-center">Play with Credits!</p>
          <p className="text-[#f5f5f5]/50 text-sm mb-4 text-center">Earn them every 24 hours</p>
        </>
      )}
      
      {/* Daily Streak - Show only after claiming */}
      {justClaimed && (
        <>
          <p className="text-[#f5f5f5] text-lg font-medium mb-1 text-center">1-Day Streak</p>
          <p className="text-[#f5f5f5]/50 text-sm mb-4 text-center">Next streak: <span className="font-medium text-[#f5f5f5]">3,500 points</span></p>
        </>
      )}
      
      {/* Timer Button - Show when claimed or not available */}
      {justClaimed || !claimInfo.isClaimAvailable ? (
        <button
          className="w-full py-5 px-10 text-sm font-light text-white rounded-xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] block tracking-wider daily-credits-timer-button"
          disabled
        >
          <span className="relative z-10">Available in {String(timeRemaining.hours).padStart(2, '0')}:{String(timeRemaining.minutes).padStart(2, '0')}:{String(timeRemaining.seconds).padStart(2, '0')}</span>
        </button>
      ) : (
        <button
          onClick={handleClaim}
          className="w-full py-5 px-10 text-sm font-light text-white rounded-xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] block tracking-wider daily-credits-timer-button"
        >
          <span className="relative z-10">Claim {claimInfo.dailyClaimAmount} points</span>
        </button>
      )}
    </div>
  );
};

export default DailyCreditsSection;

