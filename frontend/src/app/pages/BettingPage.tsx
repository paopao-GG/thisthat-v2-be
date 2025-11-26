import React, { useState, useMemo, useEffect } from 'react';
import SwipeableCard from '@features/betting/components/SwipeableCard';
import CategoryFilter from '@shared/components/CategoryFilter';
import { useCategoryFilter } from '@shared/contexts/CategoryFilterContext';
import { useAuth } from '@shared/contexts/AuthContext';
import { useSwipedMarkets } from '@shared/contexts/SwipedMarketsContext';
import type { Market } from '@shared/types';
import { getMarkets } from '@shared/services/marketService';
import { getImageUrlForMarket, getImageUrlForOption } from '@shared/utils/imageFetcher';
import '@/styles/betting/style.css';

// Mock data - images will be fetched dynamically
const mockMarketsBase: Omit<Market, 'imageUrl' | 'thisImageUrl' | 'thatImageUrl'>[] = [
  {
    id: '1',
    title: 'Will Bitcoin reach $100k by end of 2025?',
    description: 'Bitcoin has been on a bull run. Will it break the $100k mark before the year ends?',
    thisOption: 'Yes, it will reach $100k',
    thatOption: 'No, it stays below $100k',
    thisOdds: 1.65,
    thatOdds: 2.35,
    expiryDate: new Date('2025-12-31'),
    category: 'Crypto',
    liquidity: 1250000,
    marketType: 'binary',
  },
  {
    id: '2',
    title: 'Dota 2: BB4 vs Tundra',
    description: '',
    thisOption: 'BB4 BetBoom Team',
    thatOption: 'Tundra Esports',
    thisOdds: 1.85,
    thatOdds: 2.05,
    expiryDate: new Date('2024-11-05'),
    category: 'Esports',
    liquidity: 5000000,
    marketType: 'two-image',
  },
  {
    id: '3',
    title: '$PENGU - Pump to $0.0175 or Dump to $0.0075?',
    description: '',
    thisOption: 'Pump to $0.0175',
    thatOption: 'Dump to $0.0075',
    thisOdds: 2.1,
    thatOdds: 1.9,
    expiryDate: new Date('2030-12-31'),
    category: 'Crypto',
    liquidity: 3200000,
    marketType: 'binary',
  },
  {
    id: '4',
    title: 'Will the Lakers win the 2025 NBA Championship?',
    description: 'The Lakers are looking strong this season. Can they bring home another championship?',
    thisOption: 'Yes, Lakers win',
    thatOption: 'No, another team wins',
    thisOdds: 3.5,
    thatOdds: 1.3,
    expiryDate: new Date('2025-06-30'),
    category: 'Sports',
    liquidity: 2800000,
    marketType: 'binary',
  },
  {
    id: '5',
    title: 'Will Tesla stock reach $500 by end of 2025?',
    description: 'Tesla has been volatile. Will it hit the $500 mark by the end of next year?',
    thisOption: 'Yes, reaches $500+',
    thatOption: 'No, stays below $500',
    thisOdds: 2.8,
    thatOdds: 1.4,
    expiryDate: new Date('2025-12-31'),
    category: 'Finance',
    liquidity: 4500000,
    marketType: 'binary',
  },
  {
    id: '9',
    title: 'CS2: Faze vs NAVI',
    description: '',
    thisOption: 'Faze Clan',
    thatOption: 'NAVI',
    thisOdds: 1.9,
    thatOdds: 1.9,
    expiryDate: new Date('2025-12-31'),
    category: 'Esports',
    liquidity: 3800000,
    marketType: 'two-image',
  },
  {
    id: '6',
    title: 'Will there be a major earthquake in California in 2025?',
    description: 'Seismologists are monitoring activity. Will there be a significant earthquake this year?',
    thisOption: 'Yes, major earthquake occurs',
    thatOption: 'No, no major earthquake',
    thisOdds: 4.2,
    thatOdds: 1.2,
    expiryDate: new Date('2025-12-31'),
    category: 'Other',
    liquidity: 1800000,
    marketType: 'binary',
  },
  {
    id: '7',
    title: 'Will Apple release a foldable iPhone by 2026?',
    description: 'Rumors are circulating about Apple\'s foldable device. Will it launch by 2026?',
    thisOption: 'Yes, foldable iPhone launches',
    thatOption: 'No, no foldable iPhone',
    thisOdds: 2.5,
    thatOdds: 1.5,
    expiryDate: new Date('2026-12-31'),
    category: 'Technology',
    liquidity: 3600000,
    marketType: 'binary',
  },
  {
    id: '8',
    title: 'Will the US economy enter a recession in 2025?',
    description: 'Economic indicators are mixed. Will the US face a recession next year?',
    thisOption: 'Yes, recession occurs',
    thatOption: 'No, no recession',
    thisOdds: 2.2,
    thatOdds: 1.7,
    expiryDate: new Date('2025-12-31'),
    category: 'Finance',
    liquidity: 5200000,
    marketType: 'binary',
  },
];

// Internal component that manages card state - keyed by category to reset on change
const CardStack: React.FC<{
  markets: Market[];
  maxCredits?: number;
  defaultBetAmount: number;
  onBetPlaced?: () => void;
}> = ({ markets: filteredMarkets, maxCredits, defaultBetAmount, onBetPlaced }) => {
  const [currentMarketIndex, setCurrentMarketIndex] = useState(0);
  const [swipedCards, setSwipedCards] = useState<Set<number>>(new Set());

  const handleSwipeLeft = async (index: number) => {
    // Swipe left = THIS option - bet is placed automatically in SwipeableCard
    // Just advance to next card after bet is placed
    console.log(`Selected THIS for market ${filteredMarkets[index].id}`);
    setSwipedCards((prev) => new Set([...prev, index]));
  };

  const handleSwipeRight = async (index: number) => {
    // Swipe right = THAT option - bet is placed automatically in SwipeableCard
    // Just advance to next card after bet is placed
    console.log(`Selected THAT for market ${filteredMarkets[index].id}`);
    setSwipedCards((prev) => new Set([...prev, index]));
  };

  const handleSwipeUp = () => {
    // Swipe up = skip to next card
    setCurrentMarketIndex((prev) => (prev + 1) % filteredMarkets.length);
  };

  const handleSwipeDown = () => {
    // Swipe down = go to previous card
    setCurrentMarketIndex((prev) => (prev - 1 + filteredMarkets.length) % filteredMarkets.length);
  };

  // Show up to 3 cards in the stack
  const visibleCards = [];
  for (let i = 0; i < Math.min(3, filteredMarkets.length); i++) {
    const cardIndex = (currentMarketIndex + i) % filteredMarkets.length;
    if (!swipedCards.has(cardIndex)) {
      visibleCards.push({
        index: i,
        marketIndex: cardIndex,
        market: filteredMarkets[cardIndex],
      });
    }
  }

  return (
    <div 
      className="relative w-full max-w-lg mx-auto betting-card-stack" 
    >
      {visibleCards.map(({ index, marketIndex, market }) => (
        <SwipeableCard
          key={market.id}
          market={market}
          index={index}
          totalCards={visibleCards.length}
          onSwipeLeft={() => handleSwipeLeft(marketIndex)}
          onSwipeRight={() => handleSwipeRight(marketIndex)}
          onSwipeUp={handleSwipeUp}
          onSwipeDown={handleSwipeDown}
          isActive={index === 0}
          maxCredits={maxCredits}
          defaultBetAmount={defaultBetAmount}
          onBetPlaced={onBetPlaced}
        />
      ))}
    </div>
  );
};

const BettingPage: React.FC = () => {
  const { selectedCategory: categoryFilter, setSelectedCategory: setCategoryFilter, categories } = useCategoryFilter();
  const { user, refreshUser } = useAuth();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load default bet amount from localStorage, default to 100 if not set
  const [defaultBetAmount, setDefaultBetAmount] = useState(() => {
    try {
      const stored = localStorage.getItem('defaultBetAmount');
      return stored ? parseInt(stored, 10) : 100;
    } catch {
      return 100;
    }
  });

  // Save default bet amount to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('defaultBetAmount', defaultBetAmount.toString());
    } catch (error) {
      console.error('Failed to save default bet amount:', error);
    }
  }, [defaultBetAmount]);

  // Helper function to add images to markets
  const addImagesToMarkets = (marketsToProcess: Market[]): Market[] => {
    return marketsToProcess.map((market) => {
      if (market.marketType === 'two-image') {
        return {
          ...market,
          thisImageUrl: getImageUrlForOption(market.thisOption, market.category),
          thatImageUrl: getImageUrlForOption(market.thatOption, market.category),
        };
      } else {
        return {
          ...market,
          imageUrl: getImageUrlForMarket(market),
        };
      }
    });
  };

  // Fetch markets from backend
  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching markets from backend...');
        
        const fetchedMarkets = await getMarkets({
          status: 'open', // Use 'open' for PostgreSQL, which maps to 'active' for MongoDB
          limit: 100,
        });
        
        console.log(`Fetched ${fetchedMarkets.length} markets from backend`);
        
        // Add images to markets
        const marketsWithImages = addImagesToMarkets(fetchedMarkets);
        
        // If no markets fetched, fall back to mock data
        if (marketsWithImages.length === 0) {
          console.warn('No markets fetched from backend, using mock data');
          const mockMarketsWithImages = addImagesToMarkets(mockMarketsBase);
          setMarkets(mockMarketsWithImages);
        } else {
          console.log(`Setting ${marketsWithImages.length} markets`);
          setMarkets(marketsWithImages);
        }
      } catch (err: any) {
        console.error('Failed to fetch markets:', err);
        setError(err.message || 'Failed to load markets');
        // Always fall back to mock data on error so user can still see markets
        console.log('Falling back to mock data due to error');
        const mockMarketsWithImages = addImagesToMarkets(mockMarketsBase);
        setMarkets(mockMarketsWithImages);
      } finally {
        setLoading(false);
      }
    };

    fetchMarkets();
  }, []);
  
  const { isMarketSwiped } = useSwipedMarkets();

  // Filter markets by category and exclude swiped markets
  const filteredMarkets = useMemo(() => {
    if (markets.length === 0) return [];
    
    // First filter by category
    let categoryFiltered = markets;
    if (categoryFilter !== 'All') {
      categoryFiltered = markets.filter(market => market.category === categoryFilter);
    }
    
    // Then filter out swiped markets
    return categoryFiltered.filter(market => !isMarketSwiped(market.id));
  }, [categoryFilter, markets, isMarketSwiped]);

  // Handle bet placed - refresh user credits
  const handleBetPlaced = async () => {
    if (refreshUser) {
      await refreshUser();
    }
  };

  // Get max credits from user
  const maxCredits = user?.availableCredits 
    ? Number(user.availableCredits) 
    : user?.creditBalance 
      ? Number(user.creditBalance) 
      : 10000;

  // Ensure default bet amount doesn't exceed max credits
  const safeDefaultBetAmount = Math.min(defaultBetAmount, maxCredits);

  // Show loading state only if we have no markets at all
  if (loading && markets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full p-3 pt-4">
        <div className="text-white/60">Loading markets...</div>
      </div>
    );
  }

  // Show error message but still display markets if we have them
  if (error && markets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full p-3 pt-4">
        <div className="text-red-400 mb-4">Error: {error}</div>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  // Show message if no markets available after filtering
  if (filteredMarkets.length === 0 && markets.length > 0) {
    return (
      <div className="flex flex-col items-center justify-start min-h-full p-3 pt-4 relative betting-page-container">
        {/* Category Filter */}
        <div className="w-full max-w-lg mx-auto mb-8">
          <CategoryFilter
            categories={categories}
            selectedCategory={categoryFilter}
            onCategoryChange={setCategoryFilter}
          />
        </div>
        <div className="flex flex-col items-center justify-center flex-1">
          <div className="text-white/60">No markets found in this category.</div>
          <div className="text-white/40 text-sm mt-2">Try selecting a different category.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-full p-3 pt-4 relative betting-page-container">
      {/* Error banner if there was an error but we're showing fallback data */}
      {error && markets.length > 0 && (
        <div className="w-full max-w-lg mx-auto mb-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded text-yellow-200 text-sm">
          ⚠️ Using fallback data. {error}
        </div>
      )}
      
      {/* Category Filter */}
      <div className="w-full max-w-lg mx-auto mb-4">
        <CategoryFilter
          categories={categories}
          selectedCategory={categoryFilter}
          onCategoryChange={setCategoryFilter}
        />
      </div>

      {/* Default Bet Amount Control */}
      <div className="w-full max-w-lg mx-auto mb-6 px-4">
        <div className="flex items-center justify-between gap-4 p-3 bg-white/5 rounded-lg border border-white/10">
          <div className="flex-1">
            <label className="text-xs text-white/50 mb-1 block">Default Bet Amount</label>
            <div className="flex items-center gap-2">
              <span className="text-white/70">$</span>
              <input
                type="number"
                min="1"
                max={maxCredits}
                value={defaultBetAmount}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  if (value >= 1 && value <= maxCredits) {
                    setDefaultBetAmount(value);
                  }
                }}
                className="flex-1 bg-transparent border-none outline-none text-white text-lg font-semibold focus:outline-none"
                style={{ width: '100px' }}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setDefaultBetAmount(Math.max(1, defaultBetAmount - 10))}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-white text-sm font-medium transition-all"
            >
              -$10
            </button>
            <button
              onClick={() => setDefaultBetAmount(Math.min(maxCredits, defaultBetAmount + 10))}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-white text-sm font-medium transition-all"
            >
              +$10
            </button>
            <button
              onClick={() => setDefaultBetAmount(Math.min(maxCredits, Math.floor(maxCredits / 2)))}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-white text-sm font-medium transition-all"
            >
              Half
            </button>
            <button
              onClick={() => setDefaultBetAmount(maxCredits)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-white text-sm font-medium transition-all"
            >
              Max
            </button>
          </div>
        </div>
      </div>
      
      {/* Card stack - keyed by category to reset state when category changes */}
      {filteredMarkets.length > 0 ? (
        <CardStack 
          key={categoryFilter} 
          markets={filteredMarkets}
          maxCredits={maxCredits}
          defaultBetAmount={safeDefaultBetAmount}
          onBetPlaced={handleBetPlaced}
        />
      ) : (
        <div className="flex flex-col items-center justify-center flex-1">
          <div className="text-white/60">No markets available.</div>
        </div>
      )}
    </div>
  );
};

export default BettingPage;
