import React, { useRef, useEffect, useState } from 'react';
import type { UserStats } from '@shared/types';
import '@/styles/profile/style.css';

interface Position {
  value: number;
}

interface ProfileSummaryCardProps {
  userStats: UserStats;
  positions: Position[];
  biggestWin: number;
  timeFilter: '1D' | '1W' | '1M' | 'ALL';
  onTimeFilterChange: (filter: '1D' | '1W' | '1M' | 'ALL') => void;
  onConnectWallet?: () => void;
  onReferralClick?: () => void;
}

const ProfileSummaryCard: React.FC<ProfileSummaryCardProps> = ({
  userStats,
  positions,
  biggestWin,
  timeFilter,
  onTimeFilterChange,
  onConnectWallet,
  onReferralClick
}) => {
  const timeFilterContainerRef = useRef<HTMLDivElement>(null);
  const [sliderStyle, setSliderStyle] = useState<React.CSSProperties>({});
  const positionsValue = positions[0]?.value || 0;

  // Update slider position when timeFilter changes
  useEffect(() => {
    const updateSliderPosition = () => {
      if (!timeFilterContainerRef.current) return;

      // Calculate active index based on timeFilter
      const filterOrder: ('1D' | '1W' | '1M' | 'ALL')[] = ['1D', '1W', '1M', 'ALL'];
      const activeIndex = filterOrder.indexOf(timeFilter);

      if (activeIndex === -1) return;

      const container = timeFilterContainerRef.current;
      const buttons = container.querySelectorAll('button');
      const activeButton = buttons[activeIndex] as HTMLElement;
      
      if (!activeButton) return;

      const containerRect = container.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      
      const left = buttonRect.left - containerRect.left;
      const width = buttonRect.width;

      setSliderStyle({
        left: `${left}px`,
        width: `${width}px`,
      });
    };

    // Use requestAnimationFrame for smoother updates
    const rafId = requestAnimationFrame(() => {
      updateSliderPosition();
      // Double RAF to ensure layout is complete
      requestAnimationFrame(updateSliderPosition);
    });
    
    // Update on resize
    const handleResize = () => {
      requestAnimationFrame(updateSliderPosition);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, [timeFilter]);

  return (
    <div className="px-4 py-6 mb-6 rounded-lg profile-summary-card">
      <div className="flex flex-col gap-6">
        {/* User Info with Connect Wallet Button */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div 
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold text-[#0a0a0a] flex-shrink-0 profile-avatar"
            >
              {userStats.username[0].toUpperCase()}
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-xl sm:text-2xl font-semibold m-0 text-[#f5f5f5]">{userStats.username}</h1>
              <button
                onClick={onReferralClick}
                className="text-xs sm:text-sm italic text-[#f5f5f5]/60 hover:text-[#f5f5f5]/80 transition-colors text-left cursor-pointer"
              >
                Referral Link
              </button>
            </div>
          </div>
          <button 
            onClick={onConnectWallet}
            className="px-4 py-2 text-xs sm:text-sm font-medium transition-all flex-shrink-0 profile-connect-wallet-button"
          >
            Connect Wallet
          </button>
        </div>

        {/* Key Stats */}
        <div className="flex justify-end">
          <div className="flex">
            <div className="flex flex-col gap-1 pr-6 lg:pr-8 profile-stat-divider">
              <span className="text-xs text-[#f5f5f5]/50 uppercase tracking-wider font-medium">POSITIONS VALUE</span>
              <span className="text-lg sm:text-xl font-bold text-[#f5f5f5]">
                ${positionsValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex flex-col gap-1 px-6 lg:px-8 profile-stat-divider">
              <span className="text-xs text-[#f5f5f5]/50 uppercase tracking-wider font-medium">BIGGEST WIN</span>
              <span className="text-lg sm:text-xl font-bold text-[#f5f5f5]">
                ${(biggestWin / 1000000).toFixed(1)}m
              </span>
            </div>
            <div className="flex flex-col gap-1 pl-6 lg:pl-8">
              <span className="text-xs text-[#f5f5f5]/50 uppercase tracking-wider font-medium">PREDICTIONS</span>
              <span className="text-lg sm:text-xl font-bold text-[#f5f5f5]">
                {userStats.totalBets}
              </span>
            </div>
          </div>
        </div>

        {/* Profit/Loss Chart */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 p-4 rounded profile-pnl-container">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm text-[#f5f5f5]/50">PnL</span>
              <div ref={timeFilterContainerRef} className="flex gap-1 relative">
                {/* Sliding gradient background */}
                <div
                  className="absolute top-0 bottom-0 rounded pointer-events-none z-0 profile-time-filter-slider"
                  style={sliderStyle}
                />
                {(['1D', '1W', '1M', 'ALL'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => onTimeFilterChange(filter)}
                    className={`px-2 py-1 text-xs font-medium transition-all rounded relative z-10 profile-time-filter-button ${
                      timeFilter === filter
                        ? 'text-white'
                        : 'text-[#f5f5f5]/60 hover:text-[#f5f5f5]/80'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">
              ${userStats.totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            {/* Chart */}
            <div className="h-16 sm:h-20 md:h-24 lg:h-28 w-full mt-4 relative overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 200 60" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#667eea" />
                    <stop offset="100%" stopColor="#764ba2" />
                  </linearGradient>
                  <linearGradient id="chartAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#667eea" stopOpacity="0.2" />
                    <stop offset="50%" stopColor="#764ba2" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#764ba2" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Desktop: Gradient fill area */}
                <path
                  id="desktop-area"
                  className="chart-desktop-area"
                  d="M 0,55 L 18,55 L 36,54.9 L 54,55 L 72,54.8 L 90,55 L 108,54.9 L 126,55 L 144,54.8 L 150,55 Q 155,55 160,50 Q 165,40 170,25 Q 175,10 180,5 Q 185,2 190,1 Q 195,0.5 200,2 L 200,60 L 0,60 Z"
                  fill="url(#chartAreaGradient)"
                />
                {/* Mobile/Tablet: Gradient fill area */}
                <path
                  id="mobile-area"
                  className="chart-mobile-area"
                  d="M 0,55 L 20,55 L 40,55 L 60,54.8 L 80,55 L 100,55 L 120,54.8 L 140,55 L 160,55 Q 165,55 170,50 Q 175,40 180,25 Q 185,10 190,5 Q 195,2 200,3 L 200,60 L 0,60 Z"
                  fill="url(#chartAreaGradient)"
                />
                {/* Desktop: Chart path */}
                <path
                  id="desktop-line"
                  className="chart-desktop-line profile-chart-stroke"
                  d="M 0,55 L 18,55 L 36,54.9 L 54,55 L 72,54.8 L 90,55 L 108,54.9 L 126,55 L 144,54.8 L 150,55 Q 155,55 160,50 Q 165,40 170,25 Q 175,10 180,5 Q 185,2 190,1 Q 195,0.5 200,2"
                  fill="none"
                  stroke="url(#chartGradient)"
                  strokeWidth="0.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Mobile/Tablet: Chart path */}
                <path
                  id="mobile-line"
                  className="chart-mobile-line profile-chart-stroke"
                  d="M 0,55 L 20,55 L 40,55 L 60,54.8 L 80,55 L 100,55 L 120,54.8 L 140,55 L 160,55 Q 165,55 170,50 Q 175,40 180,25 Q 185,10 190,5 Q 195,2 200,3"
                  fill="none"
                  stroke="url(#chartGradient)"
                  strokeWidth="0.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Desktop: 9 data point markers along flat section (75%) */}
                <g id="desktop-markers" className="chart-desktop-markers">
                  <circle cx="18" cy="55" r="1" fill="#667eea" opacity="0.6" />
                  <circle cx="36" cy="54.9" r="1" fill="#667eea" opacity="0.6" />
                  <circle cx="54" cy="55" r="1" fill="#667eea" opacity="0.6" />
                  <circle cx="72" cy="54.8" r="1" fill="#667eea" opacity="0.6" />
                  <circle cx="90" cy="55" r="1" fill="#667eea" opacity="0.6" />
                  <circle cx="108" cy="54.9" r="1" fill="#667eea" opacity="0.6" />
                  <circle cx="126" cy="55" r="1" fill="#667eea" opacity="0.6" />
                  <circle cx="144" cy="54.8" r="1" fill="#667eea" opacity="0.6" />
                  <circle cx="150" cy="55" r="1" fill="#667eea" opacity="0.6" />
                </g>
                {/* Mobile/Tablet: 8 data point markers */}
                <g id="mobile-markers" className="chart-mobile-markers">
                  <circle cx="20" cy="55" r="1" fill="#667eea" opacity="0.6" />
                  <circle cx="40" cy="55" r="1" fill="#667eea" opacity="0.6" />
                  <circle cx="60" cy="54.8" r="1" fill="#667eea" opacity="0.6" />
                  <circle cx="80" cy="55" r="1" fill="#667eea" opacity="0.6" />
                  <circle cx="100" cy="55" r="1" fill="#667eea" opacity="0.6" />
                  <circle cx="120" cy="54.8" r="1" fill="#667eea" opacity="0.6" />
                  <circle cx="140" cy="55" r="1" fill="#667eea" opacity="0.6" />
                  <circle cx="160" cy="55" r="1" fill="#667eea" opacity="0.6" />
                </g>
                {/* Desktop: Peak marker - within container */}
                <g id="desktop-peak" className="chart-desktop-peak">
                  <circle cx="200" cy="2" r="2" fill="#764ba2" />
                  <circle cx="200" cy="2" r="4" fill="#764ba2" opacity="0.2" />
                </g>
                {/* Mobile/Tablet: Peak marker */}
                <g id="mobile-peak" className="chart-mobile-peak">
                  <circle cx="200" cy="3" r="2" fill="#764ba2" />
                  <circle cx="200" cy="3" r="4" fill="#764ba2" opacity="0.2" />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSummaryCard;

