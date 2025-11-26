import React from 'react';
import { X, Copy, Share2, Download } from 'lucide-react';
import '@/styles/profile/style.css';

interface ReferralModalProps {
  isOpen: boolean;
  referralCode: string;
  referralLink: string;
  onClose: () => void;
  onCopyCode: () => void;
  onShareLink: () => void;
}

const ReferralModal: React.FC<ReferralModalProps> = ({
  isOpen,
  referralCode,
  referralLink,
  onClose,
  onCopyCode,
  onShareLink
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-[200] p-4 referral-modal-overlay"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md p-5 md:p-6 backdrop-blur-sm animate-slideDown referral-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[#f5f5f5]">Invite Friends</h2>
          <div className="flex items-center gap-3">
            <button
              className="text-[#f5f5f5]/60 hover:text-[#f5f5f5] transition-colors"
              onClick={() => {
                console.log('Download for X post');
              }}
            >
              <Download size={20} />
            </button>
            <button
              onClick={onClose}
              className="text-[#f5f5f5]/60 hover:text-[#f5f5f5] transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Referral Code Section */}
          <div className="space-y-3">
            <p className="text-sm text-[#f5f5f5]/70">Share your referral code with friends</p>
            <div className="flex items-center gap-2 p-3 referral-code-container">
              <span className="flex-1 text-base font-mono font-semibold text-[#f5f5f5] tracking-wider">
                {referralCode}
              </span>
              <button
                onClick={onCopyCode}
                className="p-2 text-[#f5f5f5]/60 hover:text-[#f5f5f5] transition-colors referral-copy-button"
              >
                <Copy size={18} />
              </button>
            </div>
          </div>

          {/* Share Link Section */}
          <div className="space-y-3">
            <p className="text-sm text-[#f5f5f5]/70">Or share this link</p>
            <button
              onClick={onShareLink}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 transition-all font-medium referral-share-button"
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(245, 245, 245, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(245, 245, 245, 0.08)';
              }}
            >
              <Share2 size={18} />
              Share Link
            </button>
          </div>

          {/* Credits Info */}
          <p className="text-xs text-[#f5f5f5]/50 text-center">
            Earn 10 credits for each successful referral
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReferralModal;

