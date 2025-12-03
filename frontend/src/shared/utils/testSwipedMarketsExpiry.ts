/**
 * Test utility for swiped markets expiry
 * This is for testing purposes only - allows you to verify that markets reappear after 2 days
 */

export function simulateExpiredMarket(userId: string, marketId: string) {
  const STORAGE_KEY = `swipedMarkets_${userId}`;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let data = stored ? JSON.parse(stored) : [];

    // Add market with timestamp from 3 days ago (should be expired)
    const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);

    data.push({
      marketId,
      swipedAt: threeDaysAgo,
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log(`✅ Simulated expired market ${marketId} (swiped 3 days ago)`);
    console.log('Reload the page to see it removed from swiped list');
  } catch (error) {
    console.error('Failed to simulate expired market:', error);
  }
}

export function simulateRecentMarket(userId: string, marketId: string) {
  const STORAGE_KEY = `swipedMarkets_${userId}`;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let data = stored ? JSON.parse(stored) : [];

    // Add market with timestamp from 1 day ago (should still be hidden)
    const oneDayAgo = Date.now() - (1 * 24 * 60 * 60 * 1000);

    data.push({
      marketId,
      swipedAt: oneDayAgo,
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log(`✅ Simulated recent market ${marketId} (swiped 1 day ago)`);
    console.log('This market should still be hidden');
  } catch (error) {
    console.error('Failed to simulate recent market:', error);
  }
}

export function getSwipedMarketsWithTimestamps(userId: string) {
  const STORAGE_KEY = `swipedMarkets_${userId}`;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      console.log('No swiped markets found');
      return;
    }

    const data = JSON.parse(stored);
    console.log('Swiped Markets:');
    console.table(
      data.map((item: any) => ({
        marketId: item.marketId,
        swipedAt: new Date(item.swipedAt).toLocaleString(),
        daysSince: Math.floor((Date.now() - item.swipedAt) / (24 * 60 * 60 * 1000)),
        expired: (Date.now() - item.swipedAt) >= (2 * 24 * 60 * 60 * 1000),
      }))
    );
  } catch (error) {
    console.error('Failed to get swiped markets:', error);
  }
}

// Make functions available in browser console for testing
if (typeof window !== 'undefined') {
  (window as any).testSwipedMarkets = {
    simulateExpiredMarket,
    simulateRecentMarket,
    getSwipedMarketsWithTimestamps,
  };
  console.log('🧪 Test utilities loaded. Use window.testSwipedMarkets in console');
}
