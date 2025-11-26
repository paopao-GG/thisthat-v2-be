import React, { useState, useRef, useEffect } from 'react';
import type { UserStats } from '@shared/types';
import ProfileSummaryCard from '@features/profile/components/ProfileSummaryCard';
import WalletSection from '@features/profile/wallet/components/WalletSection';
import PositionsTable from '@features/profile/components/PositionsTable';
import ReferralModal from '@features/profile/components/ReferralModal';

// Mock data
const mockUserStats: UserStats = {
  userId: '1',
  username: 'John Doe',
  credits: 1000,
  totalVolume: 25000,
  totalPnL: 4226.59,
  rank: 45,
  winRate: 58.3,
  totalBets: 192,
  dailyStreak: 7,
  tokenAllocation: 1200,
  lockedTokens: 1000,
};

const mockPositions: Array<{
  id: string;
  market: string;
  prediction: string;
  shares: string;
  avgPrice: string;
  currentPrice: string;
  value: number;
  pnl: number;
  pnlPercent: number;
}> = [
  {
    id: '1',
    market: "Will 'The Running Man' Opening Weekend Box Office be between 17m and 19m?",
    prediction: 'Yes',
    shares: '6,343,700.5 shares at 50¢',
    avgPrice: '50¢',
    currentPrice: '0.1¢',
    value: 3474.85,
    pnl: -3471379.33,
    pnlPercent: -99.9,
  },
];

const ProfilePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'positions' | 'activity'>('positions');
  const [positionFilter, setPositionFilter] = useState<'active' | 'closed'>('active');
  const [timeFilter, setTimeFilter] = useState<'1D' | '1W' | '1M' | 'ALL'>('1D');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [sliderStyle, setSliderStyle] = useState<React.CSSProperties>({});
  const [userStats] = useState<UserStats>(() => ({
    ...mockUserStats,
    lastClaimDate: new Date(Date.now() - 86400000), // Yesterday
  }));

  const biggestWin = 6200000; // $6.2m
  
  // Generate random referral code
  const [referralCode] = useState(() => {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  });

  const referralLink = `https://thisthat.app/ref/${referralCode}`;

  // Update slider position when activeTab changes
  useEffect(() => {
    const updateSliderPosition = () => {
      if (!tabsContainerRef.current) return;

      const activeIndex = activeTab === 'positions' ? 0 : 1;
      const container = tabsContainerRef.current;
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
  }, [activeTab]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
  };

  const handleShareLink = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join THIS<THAT',
        text: 'Check out this prediction market platform!',
        url: referralLink,
      });
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="p-4 max-w-6xl mx-auto pb-8">
      {/* Wallet Section */}
      <WalletSection
        userStats={userStats}
      />

      {/* Summary Card */}
      <ProfileSummaryCard
        userStats={userStats}
        positions={mockPositions}
        biggestWin={biggestWin}
        timeFilter={timeFilter}
        onTimeFilterChange={setTimeFilter}
        onReferralClick={() => setIsModalOpen(true)}
      />

      {/* Tabs */}
      <div 
        ref={tabsContainerRef}
        className="flex items-center gap-6 mb-4 relative" 
        style={{ borderBottom: '1px solid rgba(245, 245, 245, 0.08)' }}
      >
        {/* Sliding gradient underline */}
        <div
          className="absolute bottom-0 h-0.5 pointer-events-none z-0"
          style={{
            ...sliderStyle,
            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
            transition: 'left 250ms cubic-bezier(0.4, 0, 0.2, 1), width 250ms cubic-bezier(0.4, 0, 0.2, 1)',
            willChange: 'left, width',
          }}
        />
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setActiveTab('positions');
          }}
          className={`pb-3 px-1 text-sm font-semibold transition-all relative border-none z-10 ${
            activeTab === 'positions' ? 'text-[#f5f5f5]' : 'text-[#f5f5f5]/60 hover:text-[#f5f5f5]/80'
          }`}
        >
          Positions
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setActiveTab('activity');
          }}
          className={`pb-3 px-1 text-sm font-semibold transition-all relative border-none z-10 ${
            activeTab === 'activity' ? 'text-[#f5f5f5]' : 'text-[#f5f5f5]/60 hover:text-[#f5f5f5]/80'
          }`}
        >
          Previous Activity
        </button>
      </div>

      {/* Positions Table */}
      {activeTab === 'positions' && (
        <PositionsTable
          positions={mockPositions}
          positionFilter={positionFilter}
          searchQuery={searchQuery}
          onFilterChange={setPositionFilter}
          onSearchChange={setSearchQuery}
        />
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="text-center py-12 text-[#f5f5f5]/50 text-sm">
          Activity history coming soon
        </div>
      )}


      {/* Invite Friends Modal */}
      <ReferralModal
        isOpen={isModalOpen}
        referralCode={referralCode}
        referralLink={referralLink}
        onClose={() => setIsModalOpen(false)}
        onCopyCode={handleCopyCode}
        onShareLink={handleShareLink}
      />
    </div>
  );
};

export default ProfilePage;
