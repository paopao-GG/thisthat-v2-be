/**
 * SwipedMarketsContext - Tracks markets that have been swiped/bet on
 * Persists across navigation so swiped markets don't reappear
 * Markets automatically reappear after 2 days
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface SwipedMarketData {
  marketId: string;
  swipedAt: number; // Timestamp in milliseconds
}

interface SwipedMarketsContextType {
  swipedMarketIds: Set<string>;
  markMarketAsSwiped: (marketId: string) => void;
  unmarkMarketAsSwiped: (marketId: string) => void;
  isMarketSwiped: (marketId: string) => boolean;
  clearSwipedMarkets: () => void;
  clearExpiredMarkets: () => void;
}

const SwipedMarketsContext = createContext<SwipedMarketsContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'swipedMarkets_';
const EXPIRY_DAYS = 2; // Markets reappear after 2 days
const EXPIRY_MS = EXPIRY_DAYS * 24 * 60 * 60 * 1000; // 2 days in milliseconds

export function SwipedMarketsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [swipedMarketIds, setSwipedMarketIds] = useState<Set<string>>(new Set());
  const [swipedMarketsData, setSwipedMarketsData] = useState<Map<string, number>>(new Map());

  // Helper function to remove expired markets
  const removeExpiredMarkets = (marketsMap: Map<string, number>): Map<string, number> => {
    const now = Date.now();
    const filtered = new Map<string, number>();

    marketsMap.forEach((swipedAt, marketId) => {
      const timeSinceSwiped = now - swipedAt;
      if (timeSinceSwiped < EXPIRY_MS) {
        // Market is still within 2-day window
        filtered.set(marketId, swipedAt);
      } else {
        console.log(`Market ${marketId} expired after ${Math.floor(timeSinceSwiped / (24 * 60 * 60 * 1000))} days`);
      }
    });

    return filtered;
  };

  // Load swiped markets from localStorage on mount and when user changes
  useEffect(() => {
    if (!user?.id) {
      setSwipedMarketIds(new Set());
      setSwipedMarketsData(new Map());
      return;
    }

    const storageKey = `${STORAGE_KEY_PREFIX}${user.id}`;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const data = JSON.parse(stored) as SwipedMarketData[];
        const marketsMap = new Map<string, number>();

        // Convert array to Map
        data.forEach((item) => {
          marketsMap.set(item.marketId, item.swipedAt);
        });

        // Remove expired markets
        const filtered = removeExpiredMarkets(marketsMap);

        setSwipedMarketsData(filtered);
        setSwipedMarketIds(new Set(filtered.keys()));

        // If we removed any expired markets, update localStorage
        if (filtered.size !== marketsMap.size) {
          const dataToSave = Array.from(filtered.entries()).map(([marketId, swipedAt]) => ({
            marketId,
            swipedAt,
          }));
          localStorage.setItem(storageKey, JSON.stringify(dataToSave));
        }
      }
    } catch (error) {
      console.error('Failed to load swiped markets:', error);
    }
  }, [user?.id]);

  // Save to localStorage whenever swipedMarketsData changes
  useEffect(() => {
    if (!user?.id) return;

    const storageKey = `${STORAGE_KEY_PREFIX}${user.id}`;
    try {
      const dataToSave = Array.from(swipedMarketsData.entries()).map(([marketId, swipedAt]) => ({
        marketId,
        swipedAt,
      }));
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Failed to save swiped markets:', error);
    }
  }, [swipedMarketsData, user?.id]);

  const markMarketAsSwiped = (marketId: string) => {
    const now = Date.now();

    setSwipedMarketsData((prev) => {
      const newMap = new Map(prev);
      newMap.set(marketId, now);
      return newMap;
    });

    setSwipedMarketIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(marketId);
      return newSet;
    });
  };

  const unmarkMarketAsSwiped = (marketId: string) => {
    setSwipedMarketsData((prev) => {
      const newMap = new Map(prev);
      newMap.delete(marketId);
      return newMap;
    });

    setSwipedMarketIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(marketId);
      return newSet;
    });
  };

  const isMarketSwiped = (marketId: string) => {
    // Check if market exists and is not expired
    const swipedAt = swipedMarketsData.get(marketId);
    if (!swipedAt) return false;

    const timeSinceSwiped = Date.now() - swipedAt;
    if (timeSinceSwiped >= EXPIRY_MS) {
      // Market has expired, auto-remove it
      unmarkMarketAsSwiped(marketId);
      return false;
    }

    return true;
  };

  const clearExpiredMarkets = () => {
    const filtered = removeExpiredMarkets(swipedMarketsData);
    setSwipedMarketsData(filtered);
    setSwipedMarketIds(new Set(filtered.keys()));
  };

  const clearSwipedMarkets = () => {
    if (!user?.id) return;
    setSwipedMarketIds(new Set());
    setSwipedMarketsData(new Map());
    const storageKey = `${STORAGE_KEY_PREFIX}${user.id}`;
    localStorage.removeItem(storageKey);
  };

  // Periodically check for expired markets (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      clearExpiredMarkets();
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [swipedMarketsData]);

  return (
    <SwipedMarketsContext.Provider
      value={{
        swipedMarketIds,
        markMarketAsSwiped,
        unmarkMarketAsSwiped,
        isMarketSwiped,
        clearSwipedMarkets,
        clearExpiredMarkets,
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




