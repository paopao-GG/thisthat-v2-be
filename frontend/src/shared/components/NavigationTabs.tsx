import React, { useRef, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Play, Trophy, User } from 'lucide-react';
import '@/styles/shared/style.css';

const NavigationTabs: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderStyle, setSliderStyle] = useState<React.CSSProperties>({});

  const tabs = [
    {
      path: '/app/play',
      icon: Play,
      label: 'Play',
      isActive: currentPath === '/app/play' || currentPath === '/app',
    },
    {
      path: '/app/leaderboard',
      icon: Trophy,
      label: 'Leaderboard',
      isActive: currentPath === '/app/leaderboard',
    },
    {
      path: '/app/profile',
      icon: User,
      label: 'Profile',
      isActive: currentPath === '/app/profile',
    },
  ];

  useEffect(() => {
    const updateSliderPosition = () => {
      if (!containerRef.current) return;

      // Calculate active index based on currentPath directly
      let activeIndex = -1;
      if (currentPath === '/app/play' || currentPath === '/app') {
        activeIndex = 0;
      } else if (currentPath === '/app/leaderboard') {
        activeIndex = 1;
      } else if (currentPath === '/app/profile') {
        activeIndex = 2;
      }

      if (activeIndex === -1) return;

      const container = containerRef.current;
      const buttons = container.querySelectorAll('a');
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

    // Update on mount and path change
    updateSliderPosition();
    
    // Update on resize
    window.addEventListener('resize', updateSliderPosition);
    
    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(updateSliderPosition, 10);

    return () => {
      window.removeEventListener('resize', updateSliderPosition);
      clearTimeout(timeoutId);
    };
  }, [currentPath]);

  return (
    <div 
      ref={containerRef}
      className="flex gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-2xl premium-glass relative navigation-tabs-container"
    >
      {/* Sliding gradient background */}
      <div
        className="absolute top-1 sm:top-1.5 bottom-1 sm:bottom-1.5 rounded-xl ease-out pointer-events-none z-0 navigation-tabs-slider"
        style={sliderStyle}
      >
        <div 
          className="absolute inset-0 opacity-10 rounded-xl navigation-tabs-slider-glow"
        />
      </div>

      {tabs.map((tab, index) => {
        const Icon = tab.icon;
        const isActive = tab.isActive;

        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2 sm:px-4 rounded-xl transition-all duration-300 relative z-10 navigation-tab-link navigation-tab-link-transform ${
              isActive
                ? 'text-white'
                : 'text-[#f5f5f5]/60 hover:text-[#f5f5f5]/90'
            }`}
            style={{
              transform: isActive ? 'scale(1.02)' : 'scale(1)',
            }}
          >
            <Icon 
              size={20} 
              className={`relative z-10 flex-shrink-0 inline-block ${
                isActive ? 'navigation-tab-icon-active' : 'navigation-tab-icon-inactive'
              }`}
            />
            {isActive && (
              <span className="hidden sm:inline text-sm font-semibold relative z-10 tracking-wide whitespace-nowrap">{tab.label}</span>
            )}
          </Link>
        );
      })}
    </div>
  );
};

export default NavigationTabs;

