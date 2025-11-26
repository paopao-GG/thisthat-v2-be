import React, { useState, useMemo } from 'react';
import SwipeableCard from '@features/betting/components/SwipeableCard';
import CategoryFilter from '@shared/components/CategoryFilter';
import { useCategoryFilter } from '@shared/contexts/CategoryFilterContext';
import type { Market } from '@shared/types';
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
}> = ({ markets: filteredMarkets }) => {
  const [currentMarketIndex, setCurrentMarketIndex] = useState(0);
  const [swipedCards, setSwipedCards] = useState<Set<number>>(new Set());

  const handleSwipeLeft = (index: number) => {
    // Swipe left = THIS option
    console.log(`Selected THIS for market ${filteredMarkets[index].id}`);
    setSwipedCards((prev) => new Set([...prev, index]));
    
    // Auto-advance to next card after a short delay
    setTimeout(() => {
      setCurrentMarketIndex((prev) => (prev + 1) % filteredMarkets.length);
    }, 300);
  };

  const handleSwipeRight = (index: number) => {
    // Swipe right = THAT option
    console.log(`Selected THAT for market ${filteredMarkets[index].id}`);
    setSwipedCards((prev) => new Set([...prev, index]));
    
    // Auto-advance to next card after a short delay
    setTimeout(() => {
      setCurrentMarketIndex((prev) => (prev + 1) % filteredMarkets.length);
    }, 300);
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
        />
      ))}
    </div>
  );
};

const BettingPage: React.FC = () => {
  const { selectedCategory: categoryFilter, setSelectedCategory: setCategoryFilter, categories } = useCategoryFilter();

  // Fetch images for markets - using useMemo to avoid effect warnings
  const mockMarkets = useMemo<Market[]>(() => {
    return mockMarketsBase.map((market) => {
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
  }, []);
  
  // Filter markets by category
  const filteredMarkets = useMemo(() => {
    if (mockMarkets.length === 0) return [];
    if (categoryFilter === 'All') {
      return mockMarkets;
    }
    return mockMarkets.filter(market => market.category === categoryFilter);
  }, [categoryFilter, mockMarkets]);

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
      
      {/* Card stack - keyed by category to reset state when category changes */}
      <CardStack key={categoryFilter} markets={filteredMarkets} />
    </div>
  );
};

export default BettingPage;
