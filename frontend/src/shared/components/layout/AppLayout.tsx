import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import TopBar from './TopBar';
import NavigationTabs from '@shared/components/NavigationTabs';
import { CategoryFilterProvider } from '@shared/contexts/CategoryFilterContext';
import '@/styles/shared/style.css';

const AppLayout: React.FC = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/app' || location.pathname === '/app/';

  return (
    <CategoryFilterProvider>
      <div className="flex flex-col min-h-screen w-full text-[#f5f5f5] app-layout-container">
        {!isHomePage && <TopBar />}
        <main className={`flex-1 overflow-x-hidden relative ${isHomePage ? '' : 'overflow-y-auto'} app-layout-main`}>
          <Outlet />
        </main>
        {/* Navigation Tabs - Fixed at bottom (hidden on home page) */}
        {!isHomePage && (
          <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 z-50 app-layout-navigation">
            <div className="max-w-md mx-auto">
              <NavigationTabs />
            </div>
          </div>
        )}
      </div>
    </CategoryFilterProvider>
  );
};

export default AppLayout;


