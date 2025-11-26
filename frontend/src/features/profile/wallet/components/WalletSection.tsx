import React from 'react';
import type { UserStats } from '@shared/types';
import '@/styles/shared/style.css';

interface WalletSectionProps {
  userStats: UserStats;
  onViewReferral?: () => void;
}

const WalletSection: React.FC<WalletSectionProps> = ({ userStats }) => {
  return (
    <div className="mb-6 space-y-6">
      {/* Credits Balance Card */}
      <div className="px-6 py-8 rounded-lg wallet-section-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm text-[#f5f5f5]/50 m-0 mb-1">Available Credits</p>
              <p className="text-3xl font-bold text-[#f5f5f5] m-0">{userStats.credits.toLocaleString()}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#f5f5f5]/50 m-0 mb-1">V1 Credits</p>
            <p className="text-sm text-[#f5f5f5]/70 m-0">Used for all bets</p>
          </div>
        </div>
      </div>

      {/* Referral Section */}
      {/* <div className="px-6 py-6 rounded-lg border border-white/10" style={{ background: 'rgba(20, 20, 30, 0.8)' }}>
        <h2 className="text-xl font-semibold text-white m-0 mb-2">Earn Credits via Referrals</h2>
        <p className="text-sm text-white/50 m-0 mb-4">
          Share your referral link and earn credits when friends join
        </p>
        <button
          onClick={onViewReferral}
          className="w-full py-3 px-4 rounded-md font-medium text-white border border-white/10 hover:border-white/20 transition-all"
          style={{ background: 'rgba(30, 30, 30, 0.8)' }}
        >
          View Referral Link
        </button>
      </div> */}
    </div>
  );
};

export default WalletSection;

