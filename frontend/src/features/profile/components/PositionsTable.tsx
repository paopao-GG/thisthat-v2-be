import React, { useRef, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import '@/styles/profile/style.css';

interface Position {
  id: string;
  marketId?: string;
  market: string;
  prediction: string;
  shares: string;
  avgPrice: string;
  currentPrice: string;
  value: number;
  pnl: number;
  pnlPercent: number;
  betData?: any;
}

interface PositionsTableProps {
  positions: Position[];
  positionFilter: 'active' | 'closed';
  searchQuery: string;
  onFilterChange: (filter: 'active' | 'closed') => void;
  onSearchChange: (query: string) => void;
  onPositionClick?: (position: Position) => void;
}

const PositionsTable: React.FC<PositionsTableProps> = ({
  positions,
  positionFilter,
  searchQuery,
  onFilterChange,
  onSearchChange,
  onPositionClick
}) => {
  const filterContainerRef = useRef<HTMLDivElement>(null);
  const [sliderStyle, setSliderStyle] = useState<React.CSSProperties>({});

  // Update slider position when positionFilter changes
  useEffect(() => {
    const updateSliderPosition = () => {
      if (!filterContainerRef.current) return;

      // Calculate active index based on positionFilter
      const filterOrder: ('active' | 'closed')[] = ['active', 'closed'];
      const activeIndex = filterOrder.indexOf(positionFilter);

      if (activeIndex === -1) return;

      const container = filterContainerRef.current;
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
  }, [positionFilter]);

  return (
    <>
      {/* Filter Buttons and Search */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div ref={filterContainerRef} className="flex items-center gap-2 relative">
          {/* Sliding gradient background */}
          <div
            className="absolute top-0 bottom-0 rounded-md pointer-events-none z-0 positions-filter-slider"
            style={sliderStyle}
          />
          <button
            onClick={() => onFilterChange('active')}
            className={`px-4 py-2 text-xs sm:text-sm font-medium transition-all rounded-md border relative z-10 positions-filter-button ${
              positionFilter === 'active'
                ? 'text-white positions-filter-button-active'
                : 'text-[#f5f5f5]/60 positions-filter-button-inactive'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => onFilterChange('closed')}
            className={`px-4 py-2 text-xs sm:text-sm font-medium transition-all rounded-md border relative z-10 ${
              positionFilter === 'closed'
                ? 'text-white'
                : 'text-[#f5f5f5]/60'
            }`}
            className="positions-filter-button-transparent"
            style={{
              border: positionFilter === 'closed' ? '1px solid rgba(245, 245, 245, 0.2)' : '1px solid rgba(245, 245, 245, 0.08)'
            }}
            onMouseEnter={(e) => {
              if (positionFilter !== 'closed') {
                e.currentTarget.style.borderColor = 'rgba(245, 245, 245, 0.12)';
              }
            }}
            onMouseLeave={(e) => {
              if (positionFilter !== 'closed') {
                e.currentTarget.style.borderColor = 'rgba(245, 245, 245, 0.08)';
              }
            }}
          >
            Closed
          </button>
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#f5f5f5]/50" size={18} />
          <input
            type="text"
            placeholder="Search positions"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-md transition-all focus:outline-none positions-search-input"
          />
        </div>
      </div>

      {/* Positions Table */}
      <div className="overflow-x-auto -mx-4 px-4 positions-table-container">
        <div className="min-w-[600px]">
          {/* Table Header */}
          <div className="flex items-center py-3 text-xs sm:text-sm font-semibold uppercase tracking-wide positions-table-header">
            <div className="flex-1 min-w-[300px] pl-4">MARKET</div>
            <div className="w-24 text-right flex-shrink-0 pr-4">AVG</div>
            <div className="w-24 text-right flex-shrink-0 pr-4">CURRENT</div>
            <div className="w-32 text-right flex-shrink-0 pr-4">VALUE</div>
          </div>

          {/* Table Rows */}
          <div className="flex flex-col">
            {positions.map((position, index) => (
              <div 
                key={position.id} 
                onClick={() => onPositionClick && position.marketId && onPositionClick(position)}
                className={`flex items-start py-4 transition-all group positions-table-row ${
                  onPositionClick && position.marketId ? 'cursor-pointer hover:bg-white/5' : ''
                }`}
              >
                <div className="flex-1 min-w-[300px] pl-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded flex-shrink-0 positions-placeholder-avatar"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-[#f5f5f5] m-0 mb-1">
                        {position.market}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span 
                          className={`text-xs font-medium ${
                            position.prediction.toLowerCase() === 'yes' || position.prediction.toLowerCase() === 'this'
                              ? 'positions-prediction-yes positions-prediction-this'
                              : position.prediction.toLowerCase() === 'no' || position.prediction.toLowerCase() === 'that'
                              ? 'positions-prediction-no positions-prediction-that'
                              : 'positions-prediction-default'
                          }`}
                        >
                          {position.prediction}
                        </span>
                        <span className="text-xs text-[#f5f5f5]/50">{position.shares}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="w-24 text-right text-xs sm:text-sm text-[#f5f5f5] flex-shrink-0 pr-4">
                  {position.avgPrice}
                </div>
                <div className="w-24 text-right text-xs sm:text-sm text-[#f5f5f5] flex-shrink-0 pr-4">
                  {position.currentPrice}
                </div>
                <div className="w-32 text-right flex-shrink-0 pr-4">
                  <div 
                    className={`text-xs sm:text-sm font-semibold ${
                      position.pnl > 0 ? 'positions-pnl-positive' : position.pnl < 0 ? 'positions-pnl-negative' : 'positions-pnl-neutral'
                    }`}
                  >
                    ${position.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div 
                    className={`text-xs mt-1 ${
                      position.pnl > 0 ? 'positions-pnl-positive' : position.pnl < 0 ? 'positions-pnl-negative' : 'positions-pnl-neutral'
                    }`}
                  >
                    ${position.pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({position.pnlPercent.toFixed(1)}%)
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center py-6 text-xs text-[#f5f5f5]/50">
            End of results
          </div>
        </div>
      </div>
    </>
  );
};

export default PositionsTable;

