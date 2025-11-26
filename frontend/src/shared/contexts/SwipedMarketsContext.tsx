/**
 * SwipedMarketsContext - Tracks markets that have been swiped/bet on
 * Persists across navigation so swiped markets don't reappear
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface SwipedMarketsContextType {
  swipedMarketIds: Set<string>;
  markMarketAsSwiped: (marketId: string) => void;
  isMarketSwiped: (marketId: string) => boolean;
  clearSwipedMarkets: () => void;
}

const SwipedMarketsContext = createContext<SwipedMarketsContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'swipedMarkets_';

export function SwipedMarketsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [swipedMarketIds, setSwipedMarketIds] = useState<Set<string>>(new Set());

  // Load swiped markets from localStorage on mount and when user changes
  useEffect(() => {
    if (!user?.id) {
      setSwipedMarketIds(new Set());
      return;
    }

    const storageKey = `${STORAGE_KEY_PREFIX}${user.id}`;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const ids = JSON.parse(stored) as string[];
        setSwipedMarketIds(new Set(ids));
      }
    } catch (error) {
      console.error('Failed to load swiped markets:', error);
    }
  }, [user?.id]);

  // Save to localStorage whenever swipedMarketIds changes
  useEffect(() => {
    if (!user?.id) return;

    const storageKey = `${STORAGE_KEY_PREFIX}${user.id}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(swipedMarketIds)));
    } catch (error) {
      console.error('Failed to save swiped markets:', error);
    }
  }, [swipedMarketIds, user?.id]);

  const markMarketAsSwiped = (marketId: string) => {
    setSwipedMarketIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(marketId);
      return newSet;
    });
  };

  const isMarketSwiped = (marketId: string) => {
    return swipedMarketIds.has(marketId);
  };

  const clearSwipedMarkets = () => {
    if (!user?.id) return;
    setSwipedMarketIds(new Set());
    const storageKey = `${STORAGE_KEY_PREFIX}${user.id}`;
    localStorage.removeItem(storageKey);
  };

  return (
    <SwipedMarketsContext.Provider
      value={{
        swipedMarketIds,
        markMarketAsSwiped,
        isMarketSwiped,
        clearSwipedMarkets,
      }}
    >
      {children}
    </SwipedMarketsContext.Provider>
  );
}

export function useSwipedMarkets() {
  const context = useContext(SwipedMarketsContext);
  if (context === undefined) {
    throw new Error('useSwipedMarkets must be used within a SwipedMarketsProvider');
  }
  return context;
}

