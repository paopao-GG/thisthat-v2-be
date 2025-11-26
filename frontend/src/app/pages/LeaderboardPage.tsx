import React, { useState } from 'react';
import type { LeaderboardEntry } from '@shared/types';
import LeaderboardTable from '@features/leaderboard/components/LeaderboardTable';

// Mock data
const mockLeaderboard: LeaderboardEntry[] = [
  {
    rank: 1,
    userId: '1',
    username: 'John Doe',
    volume: 125000,
    pnl: 45000,
    winRate: 68.5,
    totalBets: 342,
    tokenAllocation: 5000,
  },
  {
    rank: 2,
    userId: '2',
    username: 'Jane Doe',
    volume: 98000,
    pnl: 32000,
    winRate: 64.2,
    totalBets: 287,
    tokenAllocation: 4200,
  },
  {
    rank: 3,
    userId: '3',
    username: 'John Doe',
    volume: 87500,
    pnl: 28000,
    winRate: 62.8,
    totalBets: 245,
    tokenAllocation: 3800,
  },
  {
    rank: 4,
    userId: '4',
    username: 'Jane Doe',
    volume: 76000,
    pnl: 22000,
    winRate: 61.4,
    totalBets: 210,
    tokenAllocation: 3200,
  },
  {
    rank: 5,
    userId: '5',
    username: 'John Doe',
    volume: 65000,
    pnl: 18000,
    winRate: 59.7,
    totalBets: 189,
    tokenAllocation: 2800,
  },
];

const CATEGORIES = ['All', 'Crypto', 'Politics', 'Sports', 'Entertainment', 'Technology', 'Finance', 'Other'];

const LeaderboardPage: React.FC = () => {
  const [timeFilter, setTimeFilter] = useState<'today' | 'weekly' | 'monthly' | 'all'>('monthly');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'volume'>('volume');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (column: 'volume') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  // Filter and sort leaderboard entries
  const filteredAndSortedLeaderboard = React.useMemo(() => {
    let filtered = mockLeaderboard.filter((entry) => {
      if (searchQuery) {
        return entry.username.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });

    // Sort the filtered results
    filtered = [...filtered].sort((a, b) => {
      const aValue = a.volume;
      const bValue = b.volume;
      
      if (sortOrder === 'desc') {
        return bValue - aValue;
      } else {
        return aValue - bValue;
      }
    });

    return filtered;
  }, [searchQuery, sortOrder]);

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


