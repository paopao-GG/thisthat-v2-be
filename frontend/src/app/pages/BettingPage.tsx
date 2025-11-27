import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import SwipeableCard from '@features/betting/components/SwipeableCard';
import CategoryFilter from '@shared/components/CategoryFilter';
import { useCategoryFilter } from '@shared/contexts/CategoryFilterContext';
import { useAuth } from '@shared/contexts/AuthContext';
import { useSwipedMarkets } from '@shared/contexts/SwipedMarketsContext';
import type { Market } from '@shared/types';
import { getMarkets, ingestMarkets } from '@shared/services/marketService';
import { getImageUrlForMarket, getImageUrlForOption } from '@shared/utils/imageFetcher';
import '@/styles/betting/style.css';

const PAGE_SIZE = 50;
const VIEWED_STORAGE_PREFIX = 'viewedMarkets_';
const AUTO_INGEST_KEY_FALLBACK = '__ALL__';

interface CardStackProps {
  markets: Market[];
  maxCredits?: number;
  defaultBetAmount: number;
  onBetPlaced?: () => void;
  onMarkViewed: (marketId: string) => void;
  onRestoreViewed: (marketId: string) => void;
}

const CardStack: React.FC<CardStackProps> = ({
  markets: filteredMarkets,
  maxCredits,
  defaultBetAmount,
  onBetPlaced,
  onMarkViewed,
  onRestoreViewed,
}) => {
  const [currentMarketIndex, setCurrentMarketIndex] = useState(0);
  const [viewHistory, setViewHistory] = useState<string[]>([]);
  const [pendingRestoreId, setPendingRestoreId] = useState<string | null>(null);

  const clampIndex = useCallback(
    (nextIndex: number) => {
      if (filteredMarkets.length === 0) {
        return 0;
      }
      const safeIndex = ((nextIndex % filteredMarkets.length) + filteredMarkets.length) % filteredMarkets.length;
      return safeIndex;
    },
    [filteredMarkets.length]
  );

  useEffect(() => {
    setCurrentMarketIndex((prev) => clampIndex(prev));
  }, [filteredMarkets.length, clampIndex]);

  useEffect(() => {
    setViewHistory((prev) => prev.filter((id) => filteredMarkets.some((market) => market.id === id)));
  }, [filteredMarkets]);

  useEffect(() => {
    if (!pendingRestoreId) return;
    const targetIndex = filteredMarkets.findIndex((m) => m.id === pendingRestoreId);
    if (targetIndex !== -1) {
      setCurrentMarketIndex(targetIndex);
      setPendingRestoreId(null);
    }
  }, [filteredMarkets, pendingRestoreId]);

  const advanceAfterRemoval = useCallback(() => {
    if (filteredMarkets.length <= 1) {
      setCurrentMarketIndex(0);
      return;
    }
    setCurrentMarketIndex((prev) => clampIndex(prev));
  }, [filteredMarkets.length, clampIndex]);

  const handleSwipeLeft = (marketIndex: number) => {
    console.log(`Selected THIS for market ${filteredMarkets[marketIndex].id}`);
    advanceAfterRemoval();
  };

  const handleSwipeRight = (marketIndex: number) => {
    console.log(`Selected THAT for market ${filteredMarkets[marketIndex].id}`);
    advanceAfterRemoval();
  };

  const handleSwipeUp = () => {
    if (filteredMarkets.length === 0) return;
    const currentMarket = filteredMarkets[currentMarketIndex];
    setViewHistory((prev) => [...prev, currentMarket.id]);
    onMarkViewed(currentMarket.id);
    setCurrentMarketIndex((prev) =>
      filteredMarkets.length <= 1 ? 0 : clampIndex(prev + 1)
    );
  };

  const handleSwipeDown = () => {
    setViewHistory((prev) => {
      if (prev.length === 0) {
        return prev;
      }
      const copy = [...prev];
      const lastId = copy.pop();
      if (lastId) {
        onRestoreViewed(lastId);
        setPendingRestoreId(lastId);
      }
      return copy;
    });
  };

  const visibleCards = [];
  for (let i = 0; i < Math.min(3, filteredMarkets.length); i++) {
    const marketIndex = (currentMarketIndex + i) % filteredMarkets.length;
    visibleCards.push({
      index: i,
      marketIndex,
      market: filteredMarkets[marketIndex],
    });
  }

  return (
    <div className="relative w-full max-w-lg mx-auto betting-card-stack">
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
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMoreMarkets, setHasMoreMarkets] = useState(true);
  const [skip, setSkip] = useState(0);
  const activeCategoryRef = useRef(categoryFilter);
  const fetchControllerRef = useRef(0);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [viewedMarketIds, setViewedMarketIds] = useState<Set<string>>(new Set());
  const [ingestingCategory, setIngestingCategory] = useState(false);
  const categoryIngestAttemptsRef = useRef<Set<string>>(new Set());
  const autoIngestAttemptsRef = useRef<Set<string>>(new Set());
  
  const getCategoryParam = useCallback(
    (category: string) => (category === 'All' ? undefined : category),
    []
  );

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

  useEffect(() => {
    activeCategoryRef.current = categoryFilter;
  }, [categoryFilter]);

  useEffect(() => {
    if (!user?.id) {
      setViewedMarketIds(new Set());
      return;
    }
    const storageKey = `${VIEWED_STORAGE_PREFIX}${user.id}`;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const ids = JSON.parse(stored) as string[];
        setViewedMarketIds(new Set(ids));
      } else {
        setViewedMarketIds(new Set());
      }
    } catch (error) {
      console.error('Failed to load viewed markets:', error);
    }
  }, [user?.id]);

  const persistViewedSet = useCallback(
    (nextSet: Set<string>) => {
      if (!user?.id) return;
      const storageKey = `${VIEWED_STORAGE_PREFIX}${user.id}`;
      try {
        localStorage.setItem(storageKey, JSON.stringify(Array.from(nextSet)));
      } catch (error) {
        console.error('Failed to persist viewed markets:', error);
      }
    },
    [user?.id]
  );

  const markMarketAsViewed = useCallback(
    (marketId: string) => {
      setViewedMarketIds((prev) => {
        if (prev.has(marketId)) return prev;
        const next = new Set(prev);
        next.add(marketId);
        persistViewedSet(next);
        return next;
      });
    },
    [persistViewedSet]
  );

  const unmarkMarketAsViewed = useCallback(
    (marketId: string) => {
      setViewedMarketIds((prev) => {
        if (!prev.has(marketId)) return prev;
        const next = new Set(prev);
        next.delete(marketId);
        persistViewedSet(next);
        return next;
      });
    },
    [persistViewedSet]
  );

  const clearViewedMarkets = useCallback(() => {
    setViewedMarketIds(() => {
      const next = new Set<string>();
      persistViewedSet(next);
      return next;
    });
  }, [persistViewedSet]);

  // Helper function to add images to markets
  const addImagesToMarkets = useCallback((marketsToProcess: Market[]): Market[] => {
    return marketsToProcess.map((market) => {
      if (market.marketType === 'two-image') {
        return {
          ...market,
          thisImageUrl: getImageUrlForOption(market.thisOption, market.category),
          thatImageUrl: getImageUrlForOption(market.thatOption, market.category),
        };
      }
      return {
        ...market,
        imageUrl: getImageUrlForMarket(market),
      };
    });
  }, []);

  const fetchMarketsBatch = useCallback(
    async (categoryParam?: string, skipParam: number = 0) => {
      const fetchedMarkets = await getMarkets({
        status: 'open',
        limit: PAGE_SIZE,
        skip: skipParam,
        ...(categoryParam ? { category: categoryParam } : {}),
      });
      return addImagesToMarkets(fetchedMarkets);
    },
    [addImagesToMarkets]
  );

  const runAutoIngest = useCallback(
    async (categoryParam?: string) => {
      const key = categoryParam ?? AUTO_INGEST_KEY_FALLBACK;
      if (autoIngestAttemptsRef.current.has(key)) {
        return false;
      }

      autoIngestAttemptsRef.current.add(key);

      try {
        setIngestingCategory(true);
        await ingestMarkets({
          category: categoryParam,
          limit: PAGE_SIZE,
        });
        return true;
      } catch (err: any) {
        console.error('Automatic Polymarket fetch failed:', err);
        setError(err?.message || 'Automatic Polymarket fetch failed. Please try again shortly.');
        return false;
      } finally {
        setIngestingCategory(false);
      }
    },
    [setError]
  );

  const loadMarkets = useCallback(
    async (options?: { showGlobalLoading?: boolean; category?: string }) => {
      const { showGlobalLoading = false, category } = options || {};
      const categoryParam = category ?? getCategoryParam(categoryFilter);
      const fetchId = ++fetchControllerRef.current;

      if (showGlobalLoading) {
        setLoading(true);
      } else {
        setManualRefreshing(true);
      }

      try {
        setError(null);
        const marketsWithImages = await fetchMarketsBatch(categoryParam, 0);

        if (fetchId !== fetchControllerRef.current) {
          return;
        }

        setHasMoreMarkets(true);
        setIsFetchingMore(false);

        if (marketsWithImages.length === 0) {
          console.warn('No markets fetched from backend.');
          const autoIngested = await runAutoIngest(categoryParam);

          if (fetchId !== fetchControllerRef.current) {
            return;
          }

          if (autoIngested) {
            const retryMarkets = await fetchMarketsBatch(categoryParam, 0);

            if (fetchId !== fetchControllerRef.current) {
              return;
            }

            if (retryMarkets.length > 0) {
              setMarkets(retryMarkets);
              setSkip(retryMarkets.length);
              setHasMoreMarkets(retryMarkets.length === PAGE_SIZE);
              setError(null);
              return;
            }
          }

          setMarkets([]);
          setHasMoreMarkets(false);
          setSkip(0);
          setError('No markets available yet. We tried to fetch new ones automatically—please try again shortly.');
        } else {
          setMarkets(marketsWithImages);
          setSkip(marketsWithImages.length);
          setHasMoreMarkets(marketsWithImages.length === PAGE_SIZE);
        }
      } catch (err: any) {
        if (fetchId !== fetchControllerRef.current) {
          return;
        }
        console.error('Failed to fetch markets:', err);
        setError(err.message || 'Failed to load markets');
        setMarkets([]);
        setHasMoreMarkets(false);
        setSkip(0);
      } finally {
        if (fetchId === fetchControllerRef.current) {
          if (showGlobalLoading) {
            setLoading(false);
          } else {
            setManualRefreshing(false);
          }
        }
      }
    },
    [addImagesToMarkets, fetchMarketsBatch, categoryFilter, getCategoryParam, runAutoIngest]
  );

  // Initial load & when category changes (even though currently disregarded)
  useEffect(() => {
    loadMarkets({ showGlobalLoading: true });
  }, [categoryFilter, loadMarkets]);

  const handleManualRefresh = useCallback(() => {
    loadMarkets({ showGlobalLoading: false });
  }, [loadMarkets]);

  const handleIngestCategory = useCallback(async () => {
    if (categoryFilter === 'All' || ingestingCategory) return;
    try {
      setIngestingCategory(true);
      await ingestMarkets({
        category: categoryFilter,
        limit: PAGE_SIZE,
      });
      await loadMarkets({ showGlobalLoading: false, category: getCategoryParam(categoryFilter) });
    } catch (err: any) {
      console.error('Failed to fetch new category markets:', err);
      setError(err?.message || 'Unable to fetch new markets for this category');
    } finally {
      setIngestingCategory(false);
    }
  }, [categoryFilter, getCategoryParam, ingestingCategory, loadMarkets]);

  useEffect(() => {
    const intervalMs = Number(import.meta.env.VITE_MARKET_REFRESH_INTERVAL_MS || 60000);
    const intervalId = window.setInterval(() => {
      loadMarkets({ showGlobalLoading: false });
    }, intervalMs);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadMarkets]);

  const fetchMoreMarkets = useCallback(async () => {
    if (isFetchingMore || loading || !hasMoreMarkets) return;
    const categoryKey = categoryFilter;
    const categoryParam = getCategoryParam(categoryFilter);
    setIsFetchingMore(true);

    try {
      const nextBatch = await fetchMarketsBatch(categoryParam, skip);

      // Prevent state updates if category changed mid-fetch
      if (activeCategoryRef.current !== categoryKey) {
        return;
      }

      if (nextBatch.length === 0) {
        setHasMoreMarkets(false);
        return;
      }

      setMarkets((prev) => {
        if (prev.length === 0) {
          return nextBatch;
        }

        const existingIds = new Set(prev.map((market) => market.id));
        const merged = [...prev];

        nextBatch.forEach((market) => {
          if (!existingIds.has(market.id)) {
            merged.push(market);
          }
        });

        return merged;
      });
      setSkip((prev) => prev + nextBatch.length);

      if (nextBatch.length < PAGE_SIZE) {
        setHasMoreMarkets(false);
      }
    } catch (err: any) {
      console.error('Failed to load more markets:', err);
      setError(err.message || 'Failed to load more markets');
      setHasMoreMarkets(false);
    } finally {
      setIsFetchingMore(false);
    }
  }, [categoryFilter, fetchMarketsBatch, getCategoryParam, hasMoreMarkets, isFetchingMore, loading, skip]);

  const { isMarketSwiped } = useSwipedMarkets();

  // Filter markets by category and exclude swiped/viewed markets
  const filteredMarkets = useMemo(() => {
    if (markets.length === 0) return [];

    let next = markets;
    if (categoryFilter !== 'All') {
      next = next.filter(
        (market) => (market.category || 'Other') === categoryFilter
      );
    }

    next = next.filter((market) => !isMarketSwiped(market.id));
    next = next.filter((market) => !viewedMarketIds.has(market.id));

    return next;
  }, [categoryFilter, markets, isMarketSwiped, viewedMarketIds]);

  useEffect(() => {
    if (filteredMarkets.length > 0) {
      categoryIngestAttemptsRef.current.delete(categoryFilter);
    }
  }, [filteredMarkets.length, categoryFilter]);

  useEffect(() => {
    if (
      !loading &&
      !ingestingCategory &&
      categoryFilter !== 'All' &&
      filteredMarkets.length === 0 &&
      !categoryIngestAttemptsRef.current.has(categoryFilter)
    ) {
      categoryIngestAttemptsRef.current.add(categoryFilter);
      handleIngestCategory();
    }
  }, [categoryFilter, filteredMarkets.length, handleIngestCategory, ingestingCategory, loading]);

  // Auto-load more when user has swiped everything we have locally
  useEffect(() => {
    if (
      loading ||
      isFetchingMore ||
      !hasMoreMarkets ||
      markets.length === 0 ||
      filteredMarkets.length > 0
    ) {
      return;
    }

    fetchMoreMarkets();
  }, [fetchMoreMarkets, filteredMarkets.length, hasMoreMarkets, isFetchingMore, loading, markets.length]);

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
        <div className="flex flex-col items-center justify-center flex-1 gap-2">
          {isFetchingMore && hasMoreMarkets ? (
            <>
              <div className="text-white/60">Loading more markets...</div>
              <div className="text-white/40 text-sm">Hang tight while we pull fresh markets.</div>
            </>
          ) : viewedMarketIds.size > 0 ? (
            <>
              <div className="text-white/60 text-center">
                You’ve already viewed every market in this category.
              </div>
              <button
                onClick={clearViewedMarkets}
                className="mt-3 px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-white text-sm font-medium transition"
              >
                Reset viewed markets
              </button>
            </>
          ) : categoryFilter !== 'All' ? (
            <>
              <div className="text-white/60 text-center">
                No markets found for {categoryFilter}. Fetch fresh markets from Polymarket?
              </div>
              <button
                onClick={handleIngestCategory}
                disabled={ingestingCategory}
                className="mt-3 px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {ingestingCategory ? 'Fetching...' : 'Fetch new markets'}
              </button>
            </>
          ) : (
            <>
              <div className="text-white/60">No markets found in this category.</div>
              <div className="text-white/40 text-sm">Try selecting a different category.</div>
            </>
          )}
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
        <div className="flex justify-end mt-3 gap-2 flex-wrap">
          <button
            onClick={clearViewedMarkets}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/15 rounded text-white text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset viewed
          </button>
          <button
            onClick={handleManualRefresh}
            disabled={loading || manualRefreshing}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-white text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading || manualRefreshing ? 'Refreshing…' : 'Refresh markets'}
          </button>
          {categoryFilter !== 'All' && (
            <button
              onClick={handleIngestCategory}
              disabled={ingestingCategory}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-white text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {ingestingCategory ? 'Fetching…' : 'Fetch new'}
            </button>
          )}
        </div>
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
          key={`${categoryFilter}-${user?.id ?? 'anon'}`} 
          markets={filteredMarkets}
          maxCredits={maxCredits}
          defaultBetAmount={safeDefaultBetAmount}
          onBetPlaced={handleBetPlaced}
          onMarkViewed={markMarketAsViewed}
          onRestoreViewed={unmarkMarketAsViewed}
        />
      ) : (
        <div className="flex flex-col items-center justify-center flex-1">
          <div className="text-white/60">No markets available.</div>
        </div>
      )}

      {/* Load more controls */}
      <div className="w-full max-w-lg mx-auto mt-6 flex flex-col items-center gap-3">
        {hasMoreMarkets && (
          <button
            onClick={fetchMoreMarkets}
            disabled={isFetchingMore}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isFetchingMore ? 'Loading more markets...' : 'Load more markets'}
          </button>
        )}
        {!hasMoreMarkets && filteredMarkets.length > 0 && (
          <div className="text-white/40 text-xs">
            You&rsquo;re all caught up for this category. Check back soon for fresh markets.
          </div>
        )}
      </div>
    </div>
  );
};

export default BettingPage;
