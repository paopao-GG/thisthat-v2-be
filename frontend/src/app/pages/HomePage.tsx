import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Trophy, User } from 'lucide-react';
import AppTitle from '@shared/components/AppTitle';
import DailyCreditsSection from '@features/profile/wallet/components/DailyCreditsSection';
import { useAuth } from '@shared/contexts/AuthContext';

const HomePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  
  const dailyStreak = user?.consecutiveDaysOnline || 0;
  const lastClaimDate = user?.lastDailyRewardAt ? new Date(user.lastDailyRewardAt) : null;

  const handleClaim = async () => {
    // Refresh user data after claiming to update credits and streak
    if (refreshUser) {
      await refreshUser();
    }
  };

  return (
    <div 
      className="relative flex flex-col items-center justify-center min-h-screen w-full overflow-hidden"
      style={{ 
        background: 'radial-gradient(ellipse at left, rgba(30, 30, 45, 0.5) 0%, transparent 50%), radial-gradient(ellipse at right, rgba(30, 30, 45, 0.5) 0%, transparent 50%), #0a0a0a'
      }}
    >
      {/* User Icon */}
      <div className="absolute top-6 right-6 z-10">
        <Link
          to="/app/profile"
          className="flex items-center justify-center p-2.5 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            background: 'rgba(26, 26, 26, 0.6)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(245, 245, 245, 0.08)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(245, 245, 245, 0.05)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(245, 245, 245, 0.12)';
            e.currentTarget.style.background = 'rgba(26, 26, 26, 0.8)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(245, 245, 245, 0.08)';
            e.currentTarget.style.background = 'rgba(26, 26, 26, 0.6)';
          }}
          aria-label="Go to Profile"
        >
          <User size={18} className="text-[#f5f5f5]" />
        </Link>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 py-20">
        {/* Title Section */}
        <AppTitle className="mb-12" />

        {/* Play and Leaderboard Buttons */}
        <div className="flex gap-4 justify-center">
          <Link
            to="/app/play"
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all"
            style={{
              background: '#f5f5f5',
              color: '#0a0a0a',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
            }}
          >
            <Play size={18} fill="currentColor" />
            <span>Play</span>
          </Link>

          <Link
            to="/app/leaderboard"
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all"
            style={{
              background: 'rgba(26, 26, 26, 0.6)',
              border: '1px solid rgba(245, 245, 245, 0.08)',
              color: '#f5f5f5'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(245, 245, 245, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(245, 245, 245, 0.08)';
            }}
          >
            <Trophy size={18} />
            <span>Leaderboard</span>
          </Link>
        </div>
      </div>

      {/* Claim Credits Section at bottom */}
      {user && (
        <div className="relative z-10 w-full px-6 pb-12 pt-8">
          <DailyCreditsSection 
            dailyStreak={dailyStreak}
            lastClaimDate={lastClaimDate}
            onClaim={handleClaim}
          />
        </div>
      )}
    </div>
  );
};

export default HomePage;

