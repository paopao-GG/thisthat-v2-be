import React, { useRef, useEffect, useState, useMemo } from 'react';
import type { UserStats } from '@shared/types';
import '@/styles/profile/style.css';

interface Position {
  value: number;
}

interface ProfileSummaryCardProps {
  userStats: UserStats;
  positions: Position[];
  biggestWin: number;
  positionValue: number;
  timeFilter: '1D' | '1W' | '1M' | 'ALL';
  bets?: any[]; // Bet data for chart calculation
  onTimeFilterChange: (filter: '1D' | '1W' | '1M' | 'ALL') => void;
  onConnectWallet?: () => void;
  onReferralClick?: () => void;
}

const ProfileSummaryCard: React.FC<ProfileSummaryCardProps> = ({
  userStats,
  positions,
  biggestWin,
  positionValue,
  timeFilter,
  bets = [],
  onTimeFilterChange,
  onConnectWallet,
  onReferralClick
}) => {
  const timeFilterContainerRef = useRef<HTMLDivElement>(null);
  const [sliderStyle, setSliderStyle] = useState<React.CSSProperties>({});
  
  // Calculate total position value from all active positions
  const calculatedPositionValue = positions.reduce((sum, pos) => sum + pos.value, 0);
  // Use provided positionValue if available, otherwise calculate from positions
  const displayPositionValue = positionValue > 0 ? positionValue : calculatedPositionValue;

  // Calculate PnL chart data points
  const chartData = useMemo(() => {
    if (!bets || bets.length === 0) {
      // Return flat line at bottom (neutral PnL)
      return {
        path: 'M 0,55 L 200,55',
        areaPath: 'M 0,55 L 200,55 L 200,60 L 0,60 Z',
        desktopMarkers: [],
        mobileMarkers: [],
        peak: null,
        zeroLineY: 55, // Zero line at bottom when no data
      };
    }

    const now = new Date();
    let filteredBets = [...bets];

    // Filter bets by time
    if (timeFilter !== 'ALL') {
      const daysAgo = timeFilter === '1D' ? 1 : timeFilter === '1W' ? 7 : 30;
      const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      filteredBets = bets.filter((bet: any) => {
        const betDate = new Date(bet.placedAt);
        return betDate >= cutoffDate;
      });
    }

    if (filteredBets.length === 0) {
      return {
        path: 'M 0,55 L 200,55',
        areaPath: 'M 0,55 L 200,55 L 200,60 L 0,60 Z',
        desktopMarkers: [],
        mobileMarkers: [],
        peak: null,
        zeroLineY: 55, // Zero line at bottom when no data
      };
    }

    // Sort bets by date
    filteredBets.sort((a: any, b: any) => {
      return new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime();
    });

    // Calculate cumulative PnL over time
    const dataPoints: { date: Date; pnl: number }[] = [];
    let cumulativePnL = 0;

    filteredBets.forEach((bet: any) => {
      const amount = Number(bet.amount);
      const actualPayout = bet.actualPayout ? Number(bet.actualPayout) : null;

      if (bet.status === 'won' && actualPayout) {
        cumulativePnL += (actualPayout - amount);
      } else if (bet.status === 'lost') {
        cumulativePnL -= amount;
      }
      // Pending and cancelled bets don't affect realized PnL

      dataPoints.push({
        date: new Date(bet.placedAt),
        pnl: cumulativePnL,
      });
    });

    if (dataPoints.length === 0) {
      return {
        path: 'M 0,55 L 200,55',
        areaPath: 'M 0,55 L 200,55 L 200,60 L 0,60 Z',
        desktopMarkers: [],
        mobileMarkers: [],
        peak: null,
        zeroLineY: 55,
      };
    }

    // Find min and max PnL for normalization
    const pnlValues = dataPoints.map(p => p.pnl);
    const minPnL = Math.min(...pnlValues);
    const maxPnL = Math.max(...pnlValues);
    
    // Ensure we have a baseline at 0 for better visualization
    const absMin = Math.min(minPnL, 0);
    const absMax = Math.max(maxPnL, 0);
    
    // If all values are the same, create a small range for visualization
    let range = absMax - absMin;
    if (range === 0) {
      // All values are the same - create a small range around the value
      const value = pnlValues[0] || 0;
      range = Math.max(Math.abs(value) * 0.2, 100); // 20% of value or 100 credits minimum
    }

    // Chart dimensions (viewBox: 0 0 200 60)
    const chartWidth = 200;
    const chartHeight = 60;
    const paddingTop = 2; // Space from top
    const paddingBottom = 5; // Space from bottom
    const usableHeight = chartHeight - paddingTop - paddingBottom;

    const points = dataPoints.map((point, index) => {
      // X: time position (0 to 200)
      const x = dataPoints.length === 1 ? chartWidth / 2 : (index / (dataPoints.length - 1)) * chartWidth;
      
      // Y: PnL position (inverted: higher PnL = lower Y value)
      // Normalize PnL relative to absMin, then map to chart height
      const normalizedPnL = (point.pnl - absMin) / range;
      const y = chartHeight - paddingBottom - (normalizedPnL * usableHeight);
      
      // Clamp Y to chart bounds
      const clampedY = Math.max(paddingTop, Math.min(chartHeight - paddingBottom, y));
      
      return { x, y: clampedY, pnl: point.pnl };
    });

    // Generate SVG path
    let path = '';
    let areaPath = '';
    
    if (points.length === 1) {
      // Single point - horizontal line
      path = `M 0,${points[0].y} L ${chartWidth},${points[0].y}`;
      areaPath = `M 0,${points[0].y} L ${chartWidth},${points[0].y} L ${chartWidth},${chartHeight} L 0,${chartHeight} Z`;
    } else {
      // Build path with smooth curves
      path = `M ${points[0].x},${points[0].y}`;
      areaPath = `M ${points[0].x},${points[0].y}`;
      
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        
        // Use quadratic curves for smooth transitions
        const controlX = (prev.x + curr.x) / 2;
        path += ` Q ${controlX},${prev.y} ${curr.x},${curr.y}`;
        areaPath += ` Q ${controlX},${prev.y} ${curr.x},${curr.y}`;
      }
      
      // Close area path
      areaPath += ` L ${chartWidth},${chartHeight} L 0,${chartHeight} Z`;
    }

    // Generate markers (show every Nth point for desktop, fewer for mobile)
    const desktopMarkers = points.filter((_, i) => i % Math.max(1, Math.floor(points.length / 10)) === 0 || i === points.length - 1);
    const mobileMarkers = points.filter((_, i) => i % Math.max(1, Math.floor(points.length / 8)) === 0 || i === points.length - 1);

    // Find peak point
    const peakPoint = points.reduce((max, point) => (point.pnl > max.pnl ? point : max), points[0]);

    // Calculate zero line Y position
    let zeroLineY: number | null = null;
    if (absMin < 0) {
      // There are negative values, calculate where zero should be
      const normalizedZero = (0 - absMin) / range;
      zeroLineY = chartHeight - paddingBottom - (normalizedZero * usableHeight);
      // Clamp to chart bounds
      zeroLineY = Math.max(paddingTop, Math.min(chartHeight - paddingBottom, zeroLineY));
    } else if (absMax > 0) {
      // All positive, zero line at bottom
      zeroLineY = chartHeight - paddingBottom;
    }

    return {
      path,
      areaPath,
      desktopMarkers,
      mobileMarkers,
      peak: peakPoint,
      zeroLineY,
    };
  }, [bets, timeFilter]);

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
                {displayPositionValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} credits
              </span>
            </div>
            <div className="flex flex-col gap-1 px-6 lg:px-8 profile-stat-divider">
              <span className="text-xs text-[#f5f5f5]/50 uppercase tracking-wider font-medium">BIGGEST WIN</span>
              <span className="text-lg sm:text-xl font-bold text-[#f5f5f5]">
                {biggestWin > 0 ? `+${biggestWin.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} credits` : '0 credits'}
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
            <div className={`text-xl sm:text-2xl lg:text-3xl font-bold ${userStats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {userStats.totalPnL >= 0 ? '+' : ''}{userStats.totalPnL.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} credits
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
                {/* Zero line (break-even) */}
                {chartData.zeroLineY !== null && chartData.zeroLineY > 2 && chartData.zeroLineY < 58 && (
                  <line
                    x1="0"
                    y1={chartData.zeroLineY}
                    x2="200"
                    y2={chartData.zeroLineY}
                    stroke="rgba(245, 245, 245, 0.15)"
                    strokeWidth="0.5"
                    strokeDasharray="2,2"
                  />
                )}
                {/* Desktop: Gradient fill area */}
                <path
                  id="desktop-area"
                  className="chart-desktop-area"
                  d={chartData.areaPath}
                  fill="url(#chartAreaGradient)"
                />
                {/* Mobile/Tablet: Gradient fill area */}
                <path
                  id="mobile-area"
                  className="chart-mobile-area"
                  d={chartData.areaPath}
                  fill="url(#chartAreaGradient)"
                />
                {/* Desktop: Chart path */}
                <path
                  id="desktop-line"
                  className="chart-desktop-line profile-chart-stroke"
                  d={chartData.path}
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
                  d={chartData.path}
                  fill="none"
                  stroke="url(#chartGradient)"
                  strokeWidth="0.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Desktop: Data point markers */}
                {chartData.desktopMarkers.length > 0 && (
                  <g id="desktop-markers" className="chart-desktop-markers">
                    {chartData.desktopMarkers.map((point, i) => (
                      <circle key={`desktop-${i}`} cx={point.x} cy={point.y} r="1" fill="#667eea" opacity="0.6" />
                    ))}
                  </g>
                )}
                {/* Mobile/Tablet: Data point markers */}
                {chartData.mobileMarkers.length > 0 && (
                  <g id="mobile-markers" className="chart-mobile-markers">
                    {chartData.mobileMarkers.map((point, i) => (
                      <circle key={`mobile-${i}`} cx={point.x} cy={point.y} r="1" fill="#667eea" opacity="0.6" />
                    ))}
                  </g>
                )}
                {/* Desktop: Peak marker */}
                {chartData.peak && (
                  <g id="desktop-peak" className="chart-desktop-peak">
                    <circle cx={chartData.peak.x} cy={chartData.peak.y} r="2" fill="#764ba2" />
                    <circle cx={chartData.peak.x} cy={chartData.peak.y} r="4" fill="#764ba2" opacity="0.2" />
                  </g>
                )}
                {/* Mobile/Tablet: Peak marker */}
                {chartData.peak && (
                  <g id="mobile-peak" className="chart-mobile-peak">
                    <circle cx={chartData.peak.x} cy={chartData.peak.y} r="2" fill="#764ba2" />
                    <circle cx={chartData.peak.x} cy={chartData.peak.y} r="4" fill="#764ba2" opacity="0.2" />
                  </g>
                )}
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSummaryCard;

