import React, { useState, useEffect } from 'react';
import type { LeaderboardEntry } from '@shared/types';
import LeaderboardTable from '@features/leaderboard/components/LeaderboardTable';
import { getPnLLeaderboard, getVolumeLeaderboard, type BackendLeaderboardEntry } from '@shared/services/leaderboardService';

const CATEGORIES = ['All', 'Crypto', 'Politics', 'Sports', 'Entertainment', 'Technology', 'Finance', 'Other'];

const LeaderboardPage: React.FC = () => {
  const [timeFilter, setTimeFilter] = useState<'today' | 'weekly' | 'monthly' | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'volume' | 'pnl'>('pnl');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch leaderboard data from backend
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch based on sortBy type
        const response = sortBy === 'pnl' 
          ? await getPnLLeaderboard(100, 0)
          : await getVolumeLeaderboard(100, 0);

        if (response.success && response.leaderboard) {
          // Map backend format to frontend format
          const mappedLeaderboard: LeaderboardEntry[] = response.leaderboard.map((entry: BackendLeaderboardEntry) => ({
            rank: entry.rank,
            userId: entry.user.id,
            username: entry.user.username,
            volume: entry.totalVolume,
            pnl: entry.overallPnL,
            // These fields are not available from backend yet, using placeholders
            // TODO: Calculate these from user's bet history if needed
            winRate: 0, // Will be calculated from bets if needed
            totalBets: 0, // Will be calculated from bets if needed
            tokenAllocation: 0, // V3 feature
          }));

          setLeaderboard(mappedLeaderboard);
        } else {
          setError('Failed to fetch leaderboard');
        }
      } catch (err: any) {
        console.error('Error fetching leaderboard:', err);
        setError(err.message || 'Failed to fetch leaderboard');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [sortBy]);

  const handleSort = (column: 'volume' | 'pnl') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  // Filter and sort leaderboard entries
  const filteredAndSortedLeaderboard = React.useMemo(() => {
    let filtered = leaderboard.filter((entry) => {
      if (searchQuery) {
        return entry.username.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });

    // Sort the filtered results
    filtered = [...filtered].sort((a, b) => {
      const aValue = sortBy === 'pnl' ? a.pnl : a.volume;
      const bValue = sortBy === 'pnl' ? b.pnl : b.volume;
      
      if (sortOrder === 'desc') {
        return bValue - aValue;
      } else {
        return aValue - bValue;
      }
    });

    return filtered;
  }, [leaderboard, searchQuery, sortOrder, sortBy]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 pb-24 max-w-6xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-[#f5f5f5]/60">Loading leaderboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 pb-24 max-w-6xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-red-400">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 pb-24 max-w-6xl mx-auto">
      <LeaderboardTable
        entries={filteredAndSortedLeaderboard}
        timeFilter={timeFilter}
        categoryFilter={categoryFilter}
        searchQuery={searchQuery}
        sortBy={sortBy}
        sortOrder={sortOrder}
        categories={CATEGORIES}
        onTimeFilterChange={setTimeFilter}
        onCategoryFilterChange={setCategoryFilter}
        onSearchChange={setSearchQuery}
        onSort={handleSort}
      />
    </div>
  );
};

export default LeaderboardPage;
