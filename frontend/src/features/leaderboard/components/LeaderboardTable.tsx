import React, { useRef, useEffect, useState } from 'react';
import { Search, ArrowUp, ArrowDown } from 'lucide-react';
import CategoryFilter from '@shared/components/CategoryFilter';
import type { LeaderboardEntry } from '@shared/types';
import '@/styles/leaderboard/style.css';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  timeFilter: 'today' | 'weekly' | 'monthly' | 'all';
  categoryFilter: string;
  searchQuery: string;
  sortBy: 'volume';
  sortOrder: 'asc' | 'desc';
  categories: string[];
  onTimeFilterChange: (filter: 'today' | 'weekly' | 'monthly' | 'all') => void;
  onCategoryFilterChange: (category: string) => void;
  onSearchChange: (query: string) => void;
  onSort: (column: 'volume') => void;
}

const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  entries,
  timeFilter,
  categoryFilter,
  searchQuery,
  sortBy,
  sortOrder,
  categories,
  onTimeFilterChange,
  onCategoryFilterChange,
  onSearchChange,
  onSort
}) => {
  const timeFilterContainerRef = useRef<HTMLDivElement>(null);
  const [sliderStyle, setSliderStyle] = useState<React.CSSProperties>({});

  // Update slider position when timeFilter changes
  useEffect(() => {
    const updateSliderPosition = () => {
      if (!timeFilterContainerRef.current) return;

      // Calculate active index based on timeFilter
      const filterOrder: ('today' | 'weekly' | 'monthly' | 'all')[] = ['today', 'weekly', 'monthly', 'all'];
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

  // Avatar colors matching the image - to be changed to actual images or random colors
  const avatarColors = [
    '#fbbf24', 
    '#14b8a6', 
    '#a855f7', 
    '#a78bfa', 
    '#fb923c', 
  ];

  // Medal colors for top 3
  const medalColors = {
    1: {
      main: '#fbbf24',
      light: '#fcd34d',
      dark: '#d97706',
      ribbon: '#f59e0b'
    }, // gold
    2: {
      main: '#cbd5e1',
      light: '#e2e8f0',
      dark: '#94a3b8',
      ribbon: '#64748b'
    }, // silver
    3: {
      main: '#f97316',
      light: '#fb923c',
      dark: '#ea580c',
      ribbon: '#c2410c'
    }, // bronze
  };

  // Medal component
  const MedalIcon: React.FC<{ rank: 1 | 2 | 3 }> = ({ rank }) => {
    const colors = medalColors[rank];
    const size = 18;
    
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 28"
        className="medal-icon"
      >
        <defs>
          {/* Medal gradient */}
          <linearGradient id={`medalGradient${rank}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.light} stopOpacity="1" />
            <stop offset="50%" stopColor={colors.main} stopOpacity="1" />
            <stop offset="100%" stopColor={colors.dark} stopOpacity="1" />
          </linearGradient>
          {/* Ribbon gradient */}
          <linearGradient id={`ribbonGradient${rank}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.light} stopOpacity="0.8" />
            <stop offset="100%" stopColor={colors.ribbon} stopOpacity="1" />
          </linearGradient>
          {/* Shine effect */}
          <linearGradient id={`shineGradient${rank}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.6)" stopOpacity="1" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Ribbon loop at top - left */}
        <path
          d="M 6 2 Q 6 0 8 0 L 9 0 Q 10 0 10 2 L 10 4 Q 10 6 8 6 L 7 6 Q 6 6 6 4 Z"
          fill={`url(#ribbonGradient${rank})`}
          stroke={colors.dark}
          strokeWidth="0.3"
        />
        
        {/* Ribbon loop at top - right */}
        <path
          d="M 14 2 Q 14 0 16 0 L 17 0 Q 18 0 18 2 L 18 4 Q 18 6 16 6 L 15 6 Q 14 6 14 4 Z"
          fill={`url(#ribbonGradient${rank})`}
          stroke={colors.dark}
          strokeWidth="0.3"
        />
        
        {/* Ribbon hanging down */}
        <path
          d="M 8 6 L 8 8 L 16 8 L 16 6 L 12 4 Z"
          fill={colors.ribbon}
          stroke={colors.dark}
          strokeWidth="0.3"
        />
        
        {/* Medal circle with gradient */}
        <circle
          cx="12"
          cy="16"
          r="6.5"
          fill={`url(#medalGradient${rank})`}
          stroke={colors.dark}
          strokeWidth="0.6"
        />
        
        {/* Outer ring highlight */}
        <circle
          cx="12"
          cy="16"
          r="6.5"
          fill="none"
          stroke={colors.light}
          strokeWidth="0.4"
          opacity="0.5"
        />
        
        {/* Inner shadow ring */}
        <circle
          cx="12"
          cy="16"
          r="5"
          fill="none"
          stroke="rgba(0, 0, 0, 0.2)"
          strokeWidth="0.3"
        />
        
        {/* Shine effect on medal */}
        <ellipse
          cx="10"
          cy="14"
          rx="2.5"
          ry="3"
          fill={`url(#shineGradient${rank})`}
          opacity="0.7"
        />
        
        {/* Number in center for rank */}
        <text
          x="12"
          y="19"
          fontSize="7"
          fontWeight="bold"
          fill={colors.dark}
          textAnchor="middle"
          fontFamily="Arial, sans-serif"
          className="medal-text"
        >
          {rank}
        </text>
      </svg>
    );
  };

  return (
    <>
      {/* Filters */}
      <div className="mb-6">
        <div 
          ref={timeFilterContainerRef}
          className="flex gap-1 sm:gap-2 p-1 rounded-md mb-4 relative time-filter-container" 
        >
          {/* Sliding gradient background */}
          <div
            className="absolute top-1 bottom-1 rounded pointer-events-none z-0 time-filter-slider"
            style={sliderStyle}
          />
          
          <button
            className={`flex-1 py-2 sm:py-3 px-1.5 sm:px-4 text-xs sm:text-sm transition-all font-semibold rounded relative z-10 time-filter-button ${
              timeFilter === 'today'
                ? 'text-white'
                : 'text-[#f5f5f5]/60 hover:text-[#f5f5f5]/80'
            }`}
            onClick={() => onTimeFilterChange('today')}
          >
            Today
          </button>
          <button
            className={`flex-1 py-2 sm:py-3 px-1.5 sm:px-4 text-xs sm:text-sm transition-all font-semibold rounded relative z-10 ${
              timeFilter === 'weekly'
                ? 'text-white'
                : 'text-[#f5f5f5]/60 hover:text-[#f5f5f5]/80'
            }`}
            className="time-filter-button-transparent"
            onClick={() => onTimeFilterChange('weekly')}
          >
            Weekly
          </button>
          <button
            className={`flex-1 py-2 sm:py-3 px-1.5 sm:px-4 text-xs sm:text-sm transition-all font-semibold rounded relative z-10 ${
              timeFilter === 'monthly'
                ? 'text-white'
                : 'text-[#f5f5f5]/60 hover:text-[#f5f5f5]/80'
            }`}
            className="time-filter-button-transparent"
            onClick={() => onTimeFilterChange('monthly')}
          >
            Monthly
          </button>
          <button
            className={`flex-1 py-2 sm:py-3 px-1.5 sm:px-4 text-xs sm:text-sm transition-all font-semibold rounded relative z-10 ${
              timeFilter === 'all'
                ? 'text-white'
                : 'text-[#f5f5f5]/60 hover:text-[#f5f5f5]/80'
            }`}
            className="time-filter-button-transparent"
            onClick={() => onTimeFilterChange('all')}
          >
            All
          </button>
        </div>

        <div className="mb-4">
          <CategoryFilter
            categories={categories}
            selectedCategory={categoryFilter}
            onCategoryChange={onCategoryFilterChange}
          />
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#f5f5f5]/50" size={20} />
          <input
            type="text"
            placeholder="Search by name"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 text-sm rounded-md transition-all focus:outline-none leaderboard-search-input"
          />
        </div>
      </div>

      {/* Table */}
      <div 
        className="overflow-x-auto -mx-4 sm:mx-0 leaderboard-table-container" 
      >
        <div 
          className="rounded-lg overflow-hidden flex flex-col leaderboard-table-wrapper" 
        >
          {/* Table Header - Fixed */}
          <div className="flex items-center px-4 sm:px-6 py-3.5 sm:py-4 flex-shrink-0 leaderboard-table-header">
            <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
              <div className="flex-shrink-0 text-center leaderboard-rank-column">
                <span 
                  className="text-sm sm:text-sm font-semibold uppercase tracking-wider leaderboard-header-text"
                >
                  RANK
                </span>
              </div>
              <div className="flex items-center gap-3 sm:gap-3 flex-shrink-0 overflow-hidden leaderboard-user-column">
                <span 
                  className="text-sm sm:text-sm font-semibold uppercase tracking-wider leaderboard-header-text"
                >
                  USER
                </span>
              </div>
            </div>
            <div className="flex items-center gap-5 sm:gap-8 md:gap-12 flex-shrink-0 ml-auto">
              <div className="text-right min-w-[70px] sm:min-w-[80px] md:min-w-[100px]">
                <button
                  onClick={() => onSort('volume')}
                  className="text-sm sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 ml-auto leaderboard-sort-button"
                >
                  VOLUME
                  {sortBy === 'volume' && (
                    sortOrder === 'desc' ? (
                      <ArrowDown size={16} className="leaderboard-sort-icon" />
                    ) : (
                      <ArrowUp size={16} className="leaderboard-sort-icon" />
                    )
                  )}
                </button>
              </div>
              <div 
                className="text-sm sm:text-sm font-semibold uppercase text-right min-w-[70px] sm:min-w-[80px] md:min-w-[100px] leaderboard-header-text"
              >
                $THIS
              </div>
            </div>
          </div>

          {/* Table Rows - Scrollable */}
          <div 
            className="flex flex-col overflow-y-auto flex-1 leaderboard-scrollable leaderboard-table-rows" 
          >
            {entries.map((entry, index) => {
              const avatarColor = avatarColors[entry.rank - 1] || '#6b7280';

              return (
                <div
                  key={entry.userId}
                  className="flex items-center px-4 sm:px-6 py-3.5 sm:py-4 transition-all group leaderboard-table-row leaderboard-table-row-animated"
                  style={{ 
                    animationDelay: `${index * 50}ms`
                  }}
                >
                  <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                    <div className="flex-shrink-0 text-center leaderboard-rank-column">
                      <span className="text-sm sm:text-sm text-[#f5f5f5]/70 font-semibold">
                        {entry.rank}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3 sm:gap-3 md:gap-4 flex-shrink-0 overflow-hidden leaderboard-user-column">
                      <div className="relative flex-shrink-0">
                        <div
                          className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 flex items-center justify-center text-[#f5f5f5] rounded-full transition-transform group-hover:scale-105 leaderboard-avatar"
                          style={{ backgroundColor: avatarColor }}
                        >
                          <span className="text-base sm:text-lg font-bold">{entry.username[0]}</span>
                        </div>
                        {entry.rank <= 3 && (
                          <div 
                            className="absolute -bottom-0.5 -left-0.5 flex items-center justify-center transition-transform group-hover:scale-110 z-10"
                          >
                            <MedalIcon rank={entry.rank as 1 | 2 | 3} />
                          </div>
                        )}
                      </div>
                      <span className="text-sm sm:text-sm font-semibold text-[#f5f5f5] truncate min-w-0">
                        {entry.username}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-5 sm:gap-8 md:gap-12 flex-shrink-0 ml-auto">
                    <div className="text-right min-w-[70px] sm:min-w-[80px] md:min-w-[100px]">
                      <span className="text-sm sm:text-sm font-medium text-[#f5f5f5]">
                        {entry.volume.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-right min-w-[70px] sm:min-w-[80px] md:min-w-[100px]">
                      <span className="text-sm sm:text-sm font-semibold text-[#f5f5f5]">
                        {entry.tokenAllocation.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default LeaderboardTable;

