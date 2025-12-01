import React, { useState, useEffect } from 'react';

interface PriceChartProps {
  marketId: string;
  thisOption: string;
  thatOption: string;
  currentThisOdds: number;
  currentThatOdds: number;
}

const PriceChart: React.FC<PriceChartProps> = ({
  marketId,
  thisOption,
  thatOption,
  currentThisOdds,
  currentThatOdds,
}) => {
  const [chartData, setChartData] = useState<Array<{ time: number; thisOdds: number; thatOdds: number }>>([]);

  // Generate mock historical data (in a real app, this would come from an API)
  useEffect(() => {
    // Simulate 24 hours of price data (one point per hour)
    const now = Date.now();
    const data = [];
    const baseThisOdds = currentThisOdds;
    const baseThatOdds = currentThatOdds;
    
    // Generate 24 data points with some variation
    for (let i = 23; i >= 0; i--) {
      const time = now - (i * 60 * 60 * 1000);
      // Add some random variation (±5%)
      const variation = (Math.random() - 0.5) * 0.1;
      const thisOdds = Math.max(0.05, Math.min(0.95, baseThisOdds + variation));
      const thatOdds = 1 - thisOdds;
      
      data.push({
        time,
        thisOdds,
        thatOdds,
      });
    }
    
    setChartData(data);
  }, [currentThisOdds, currentThatOdds]);

  if (chartData.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-[#f5f5f5]/50 text-sm">
        Loading chart...
      </div>
    );
  }

  // Chart dimensions
  const width = 100;
  const height = 60;
  const padding = 4;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Find min/max for scaling
  const allOdds = chartData.flatMap(d => [d.thisOdds, d.thatOdds]);
  const minOdds = Math.min(...allOdds);
  const maxOdds = Math.max(...allOdds);
  const range = maxOdds - minOdds || 1;

  // Generate path for THIS odds (green)
  const thisPath = chartData
    .map((point, index) => {
      const x = padding + (index / (chartData.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((point.thisOdds - minOdds) / range) * chartHeight;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  // Generate path for THAT odds (red)
  const thatPath = chartData
    .map((point, index) => {
      const x = padding + (index / (chartData.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((point.thatOdds - minOdds) / range) * chartHeight;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  // Generate area fill for THIS (green gradient)
  const thisAreaPath = `${thisPath} L ${padding + chartWidth} ${padding + chartHeight} L ${padding} ${padding + chartHeight} Z`;

  // Generate area fill for THAT (red gradient)
  const thatAreaPath = `${thatPath} L ${padding + chartWidth} ${padding + chartHeight} L ${padding} ${padding + chartHeight} Z`;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-48"
        preserveAspectRatio="none"
      >
        {/* Grid lines */}
        <defs>
          <linearGradient id="thisGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(34, 197, 94, 0.3)" />
            <stop offset="100%" stopColor="rgba(34, 197, 94, 0)" />
          </linearGradient>
          <linearGradient id="thatGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(239, 68, 68, 0.3)" />
            <stop offset="100%" stopColor="rgba(239, 68, 68, 0)" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding + chartHeight - ratio * chartHeight;
          return (
            <line
              key={ratio}
              x1={padding}
              y1={y}
              x2={padding + chartWidth}
              y2={y}
              stroke="rgba(245, 245, 245, 0.1)"
              strokeWidth="0.5"
            />
          );
        })}

        {/* Area fills */}
        <path
          d={thisAreaPath}
          fill="url(#thisGradient)"
        />
        <path
          d={thatAreaPath}
          fill="url(#thatGradient)"
        />

        {/* THIS odds line */}
        <path
          d={thisPath}
          fill="none"
          stroke="#22c55e"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* THAT odds line */}
        <path
          d={thatPath}
          fill="none"
          stroke="#ef4444"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Current point markers */}
        {chartData.length > 0 && (
          <>
            <circle
              cx={padding + chartWidth}
              cy={padding + chartHeight - ((currentThisOdds - minOdds) / range) * chartHeight}
              r="2"
              fill="#22c55e"
            />
            <circle
              cx={padding + chartWidth}
              cy={padding + chartHeight - ((currentThatOdds - minOdds) / range) * chartHeight}
              r="2"
              fill="#ef4444"
            />
          </>
        )}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-between mt-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-400"></div>
          <span className="text-[#f5f5f5]/70">{thisOption}</span>
          <span className="text-green-400 font-medium">
            {(currentThisOdds * 100).toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-400"></div>
          <span className="text-[#f5f5f5]/70">{thatOption}</span>
          <span className="text-red-400 font-medium">
            {(currentThatOdds * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Time labels */}
      <div className="flex justify-between mt-1 text-xs text-[#f5f5f5]/40">
        <span>24h ago</span>
        <span>Now</span>
      </div>
    </div>
  );
};

export default PriceChart;






