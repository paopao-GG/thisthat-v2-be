import React, { useState, useRef } from 'react';
import type { Market } from '@shared/types';
import { placeBet } from '@shared/services/betService';
import { useSwipedMarkets } from '@shared/contexts/SwipedMarketsContext';
import '@/styles/betting/style.css';

interface SwipeableCardProps {
  market: Market;
  index: number;
  totalCards: number;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeUp: () => void;
  onSwipeDown: () => void;
  isActive: boolean;
  maxCredits?: number;
  defaultBetAmount: number;
  onBetPlaced?: () => void;
}

const SwipeableCard: React.FC<SwipeableCardProps> = ({
  market,
  index,
  totalCards,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  isActive,
  maxCredits = 10000,
  defaultBetAmount,
  onBetPlaced,
}) => {
  const { markMarketAsSwiped } = useSwipedMarkets();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [wasDragging, setWasDragging] = useState(false);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  

  const SWIPE_THRESHOLD = 50;
  const ROTATION_FACTOR = 0.1;

  // Function to automatically place bet
  const handlePlaceBet = async (side: 'THIS' | 'THAT') => {
    if (isPlacingBet || !isActive) return;
    
    const betAmount = Math.min(defaultBetAmount, maxCredits);
    if (betAmount <= 0) {
      console.warn('Bet amount is 0 or invalid');
      return;
    }

    setIsPlacingBet(true);
    
    try {
      // Place bet via API
      await placeBet({
        marketId: market.id,
        side: side.toLowerCase() as 'this' | 'that',
        amount: betAmount,
      });
      
      // Mark market as swiped
      markMarketAsSwiped(market.id);
      
      // Refresh user credits if callback provided
      if (onBetPlaced) {
        onBetPlaced();
      }
      
      // Animate card off screen
      if (side === 'THIS') {
        setPosition({ x: -1000, y: position.y });
        setTimeout(() => {
          onSwipeLeft();
        }, 300);
      } else {
        setPosition({ x: 1000, y: position.y });
        setTimeout(() => {
          onSwipeRight();
        }, 300);
      }
    } catch (error: any) {
      console.error('Failed to place bet:', error);
      // Reset position on error
      setPosition({ x: 0, y: 0 });
      setRotation(0);
    } finally {
      setIsPlacingBet(false);
    }
  };

  const handleStart = (clientX: number, clientY: number) => {
    if (!isActive || isPlacingBet) return;
    setIsDragging(true);
    setStartPos({ x: clientX, y: clientY });
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging || !isActive) return;

    const deltaX = clientX - startPos.x;
    const deltaY = clientY - startPos.y;

    setPosition({ x: deltaX, y: deltaY });
    setRotation(deltaX * ROTATION_FACTOR);
  };

  const handleEnd = () => {
    if (!isDragging || !isActive) {
      setWasDragging(false);
      return;
    }
    
    const absX = Math.abs(position.x);
    const absY = Math.abs(position.y);
    
    // Check if user was actually dragging (moved more than a few pixels)
    const moved = absX > 5 || absY > 5;
    setWasDragging(moved);
    setIsDragging(false);

    // Swipe up takes priority
    if (position.y < -SWIPE_THRESHOLD && absY > absX) {
      // Animate card up and fade out
      setPosition({ x: position.x, y: -1000 });
      setTimeout(() => {
        onSwipeUp();
      }, 200);
      return;
    }

    // Swipe down
    if (position.y > SWIPE_THRESHOLD && absY > absX) {
      // Animate card down and fade out
      setPosition({ x: position.x, y: 1000 });
      setTimeout(() => {
        onSwipeDown();
      }, 200);
      return;
    }

    // Swipe left (THIS option) - Place bet automatically
    if (position.x < -SWIPE_THRESHOLD) {
      handlePlaceBet('THIS');
      return;
    }

    // Swipe right (THAT option) - Place bet automatically
    if (position.x > SWIPE_THRESHOLD) {
      handlePlaceBet('THAT');
      return;
    }

    // Reset position if threshold not met
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    handleStart(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  // Calculate card scale and z-index based on position in stack
  const scale = 1 - (index * 0.04); // More pronounced scale reduction for depth
  const zIndex = totalCards - index;
  const opacity = 1; // Full opacity so cards are clearly visible
  // Cascading/fanned-out effect: each card behind is higher and slightly offset
  const yOffset = -index * 20; // Cards behind are positioned higher (negative = up) - increased for more visibility
  const xOffset = index * 3; // Slight horizontal offset to the right for depth
  const rotationOffset = 0; // No rotation - cards stack straight

  const cardStyle: React.CSSProperties = {
    transform: `translate(calc(-50% + ${position.x + xOffset}px), ${position.y + yOffset}px) rotate(${rotation + rotationOffset}deg) scale(${scale})`,
    zIndex,
    opacity,
    filter: 'none', // No blur for clean, minimalist look
    transition: isDragging ? 'none' : 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.5s ease-out',
    cursor: isActive ? (isDragging ? 'grabbing' : 'grab') : 'default',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    pointerEvents: index === 0 ? 'auto' : 'none', // Only top card is interactive
    willChange: index === 0 ? 'transform' : 'auto', // Optimize for top card animation
  };

  // Show overlay hints based on swipe direction
  const showLeftHint = position.x < -20 && isDragging; // THIS option
  const showRightHint = position.x > 20 && isDragging; // THAT option
  const showUpHint = position.y < -20 && isDragging && Math.abs(position.x) < Math.abs(position.y);
  const showDownHint = position.y > 20 && isDragging && Math.abs(position.x) < Math.abs(position.y);

  return (
    <div
      ref={cardRef}
      className="absolute w-full max-w-lg swipeable-card-container"
      style={cardStyle}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
        <div
          className={`w-full overflow-hidden relative transition-all swipeable-card ${
            showLeftHint ? 'swipeable-card-hint-left' :
            showRightHint ? 'swipeable-card-hint-right' :
            showUpHint ? 'swipeable-card-hint-up' :
            showDownHint ? 'swipeable-card-hint-down' : ''
          } ${
            index === 0
              ? showLeftHint ? 'swipeable-card-shadow-0-left' :
                showRightHint ? 'swipeable-card-shadow-0-right' :
                showUpHint ? 'swipeable-card-shadow-0-up' :
                showDownHint ? 'swipeable-card-shadow-0-down' :
                'swipeable-card-shadow-0-default'
              : index === 1
              ? 'swipeable-card-shadow-1'
              : 'swipeable-card-shadow-2'
          }`}
        >
        {/* Swipe hints overlay with subtle color effects */}
        {showLeftHint && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none transition-all swipe-hint-left">
            <div className="text-4xl font-bold swipe-hint-left-text">THIS</div>
          </div>
        )}
        {showRightHint && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none transition-all swipe-hint-right">
            <div className="text-4xl font-bold swipe-hint-right-text">THAT</div>
          </div>
        )}
        {showUpHint && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none transition-all swipe-hint-up">
            <div className="text-4xl font-bold text-[#f5f5f5]">NEXT MARKET</div>
            <div className="absolute bottom-4 text-sm text-[#f5f5f5]/70">Swipe up or down to change markets</div>
          </div>
        )}
        {showDownHint && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none transition-all swipe-hint-down">
            <div className="text-4xl font-bold text-[#f5f5f5]">PREV MARKET</div>
            <div className="absolute bottom-4 text-sm text-[#f5f5f5]/70">Swipe up or down to change markets</div>
          </div>
        )}

        {/* Card content */}
        <div className="py-5 px-4 h-full flex flex-col">
          {/* Market Question - Separate Card Container */}
          <div className="mb-4 p-4 market-question-container">
            <h2 className="text-xl font-semibold mb-2 leading-tight text-[#f5f5f5] tracking-tight">
              {market.title}
            </h2>
            {market.description && (
              <p className="text-sm text-[#f5f5f5]/60 leading-relaxed">
                {market.description}
              </p>
            )}
          </div>

          {/* Images Section */}
          {market.marketType === 'two-image' && market.thisImageUrl && market.thatImageUrl ? (
            // Two-image layout (side by side) - Maximized with text overlay
            <div className="flex gap-3 mb-4 flex-1 min-h-0 two-image-container">
              <div className="flex-1 relative overflow-hidden flex items-center justify-center image-container">
                {market.thisImageUrl ? (
                  <>
                    <img 
                      src={market.thisImageUrl} 
                      alt={market.thisOption}
                      className="w-full h-full object-cover image-brightness"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    {/* Dark overlay for better text readability */}
                    <div className="absolute inset-0 image-overlay" />
                  </>
                ) : null}
                {(!market.thisImageUrl || market.thisImageUrl.includes('placeholder')) && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl mb-2 text-[#f5f5f5]/20">📷</div>
                      <div className="text-xs text-[#f5f5f5]/30">{market.thisOption}</div>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="text-base font-medium text-[#f5f5f5]">
                    {market.thisOption}
                  </div>
                </div>
              </div>
              <div className="flex-1 relative overflow-hidden flex items-center justify-center image-container">
                {market.thatImageUrl ? (
                  <>
                    <img 
                      src={market.thatImageUrl} 
                      alt={market.thatOption}
                      className="w-full h-full object-cover image-brightness"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    {/* Dark overlay for better text readability */}
                    <div className="absolute inset-0 image-overlay" />
                  </>
                ) : null}
                {(!market.thatImageUrl || market.thatImageUrl.includes('placeholder')) && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl mb-2 text-[#f5f5f5]/20">📷</div>
                      <div className="text-xs text-[#f5f5f5]/30">{market.thatOption}</div>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="text-base font-medium text-[#f5f5f5]">
                    {market.thatOption}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Single image layout (binary question) - with option names overlaid
            <div className="relative overflow-hidden mb-4 flex items-center justify-center image-aspect-ratio">
              {market.imageUrl && !market.imageUrl.includes('placeholder') ? (
                <>
                  <img 
                    src={market.imageUrl} 
                    alt={market.title}
                    className="w-full h-full object-cover image-brightness"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  {/* Dark overlay for better text readability */}
                  <div className="absolute inset-0 image-overlay" />
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-5xl mb-3 text-[#f5f5f5]/20">📷</div>
                    <div className="text-sm text-[#f5f5f5]/40 max-w-xs px-4">{market.title}</div>
                  </div>
                </div>
              )}
              {/* Option names overlaid on image - divided into two sections */}
              <div className="absolute bottom-0 left-0 right-0 flex">
                {/* THIS option - left side */}
                <div className="flex-1 px-3 py-2.5 option-overlay-left">
                  <div className="text-sm font-semibold text-[#f5f5f5] leading-tight break-words">
                    {market.thisOption}
                  </div>
                </div>
                {/* THAT option - right side */}
                <div className="flex-1 px-3 py-2.5 option-overlay-right">
                  <div className="text-sm font-semibold text-[#f5f5f5] leading-tight break-words">
                    {market.thatOption}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* THIS/THAT Swipe Controls */}
          <div className="flex gap-3 mb-4">
            {/* THIS control - Green */}
            <div
              className={`flex-1 px-4 py-3 relative flex flex-col items-center justify-center transition-all this-control ${
                showLeftHint ? 'this-control-active' : ''
              }`}
            >
              <div className="text-center">
                <div className="text-md font-medium this-control-text">
                  ← THIS <span className="text-xs opacity-50 pl-2">{market.thisOdds.toFixed(2)}x</span>
                </div>
              </div>
            </div>

            {/* THAT control - Red */}
            <div
              className={`flex-1 px-4 py-3 relative flex flex-col items-center justify-center transition-all that-control ${
                showRightHint ? 'that-control-active' : ''
              }`}
            >
              <div className="text-center">
                <div className="text-md font-medium that-control-text">
                  <span className="text-xs opacity-50 pr-2">{market.thatOdds.toFixed(2)}x</span> THAT → 
                </div>
              </div>
            </div>
          </div>

          {/* Amount display */}
          <div className="p-4 transition-all amount-display">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#f5f5f5]/50">Default Amount:</span>
              <span className="text-xl font-semibold text-[#f5f5f5] leading-snug">${defaultBetAmount.toLocaleString()}</span>
            </div>
            {isPlacingBet && (
              <div className="mt-2 text-xs text-[#f5f5f5]/50 text-center">
                Placing bet...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwipeableCard;
