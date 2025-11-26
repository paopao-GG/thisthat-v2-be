# Product Context

## Why This Project Exists

### The Problem
Prediction markets (like Polymarket) have powerful infrastructure but lack accessible, mobile-first UX. Most users find traditional prediction market interfaces overwhelming, complex, and not engaging enough for casual participation.

### The Solution
THISTHAT transforms prediction markets into an addictive, Tinder-like mobile experience:
- **Swipe up/down** to browse markets
- **Tap THIS/THAT** to place bets instantly
- **Credits-based** removes financial friction (V1)
- **Gamified** with leaderboards and daily rewards

### Product Vision
Become the default consumer-facing interface for onchain prediction markets by merging Polymarket-level infrastructure with social gaming mechanics.

## How It Should Work

### User Journey (V1)

1. **Onboarding**
   - User registers with email/username/password
   - Receives 1,000 starting credits
   - Sees landing page with quick tutorial

2. **Market Discovery**
   - User swipes up/down to browse markets
   - Each market shows: title, description, THIS/THAT options, odds, expiry
   - Markets sourced from Polymarket API + admin-created

3. **Betting Flow**
   - User inputs bet amount (10-10,000 credits)
   - Taps THIS or THAT button
   - Bet confirms instantly
   - Credits deducted from balance
   - Potential payout calculated and shown

4. **Market Resolution**
   - When market expires, outcome determined by Polymarket
   - Winning bets: Credits credited to user balance
   - Losing bets: Credits lost
   - User PnL and volume updated

5. **Engagement Loop**
   - User checks leaderboard rankings (PnL and Volume)
   - Claims daily login reward (streak-based: 1,000-10,000 credits)
   - Continues betting to climb rankings
   - Can sell positions early before market expiry
   - Can purchase additional credits (when payment integration complete)

### User Experience Goals

#### Speed
- Time-to-first-bet: <10 seconds
- Market loading: <300ms
- Bet confirmation: <500ms

#### Simplicity
- No complex order books or advanced trading
- Binary choices only (THIS/THAT)
- Single-tap betting
- Clear odds display (percentage format)

#### Engagement
- Daily rewards create habit loop
- Leaderboards drive competition
- PnL tracking provides status
- Volume tracking encourages activity

#### Trust
- Markets mirror Polymarket (established platform)
- Transparent odds and payouts
- Clear transaction history
- Fair resolution based on Polymarket outcomes

## Market Categories (V1)

### 1. Polymarket Markets
- Imported directly from Polymarket API
- Real-world events (politics, sports, crypto)
- High liquidity and credibility
- Automatic resolution

### 2. Credits-Only Markets
- Admin-created markets
- Platform-specific events
- Lower stakes, more experimental
- Manual resolution by admins

### 3. Cross Markets (Future)
- Combines CreatorWall data with Polymarket
- Social/cultural predictions
- Creator comparisons

## Core Mechanics

### Credits System (V1)
- **Starting balance:** 1,000 credits (signup bonus)
- **Daily reward:** Streak-based system
  - Day 1: 1,000 credits
  - Day 2: 1,500 credits (+500)
  - Day 3: 2,000 credits (+500)
  - ...increases by 500 each day
  - Day 18+: 10,000 credits (max)
  - Resets at 00:00 UTC daily
  - Streak breaks if user misses a day (resets to Day 1)
- **Referral bonus:** Credits awarded to referrer when someone signs up
- **In-app purchases:** Credit packages available (Stripe integration pending)
  - Starter: 500 credits ($4.99)
  - Boost: 1,000 credits ($9.99)
  - Pro: 2,500 credits ($19.99)
  - Whale: 5,000 credits ($34.99)
- **Protocol fee:** (Pending) Percentage cut on credit purchases
- **Constraints:** Cannot withdraw, no real-money value
- **Purpose:** Gather user behavior data, validate engagement, prepare for V2/V3

### Betting Mechanics
- **Minimum bet:** 10 credits
- **Maximum bet:** 10,000 credits per bet
- **Payout formula:** `betAmount / odds = payout`
- **Example:** 100 credits on 65% odds = 153.85 payout (53.85 profit)

### Ranking System

#### PnL Leaderboard
- Tracks overall profit/loss
- Formula: `SUM(all bet profits - all bet losses)`
- Updated after each market resolution
- Top performers highlighted

#### Volume Leaderboard
- Tracks total betting activity
- Formula: `SUM(all bet amounts)`
- Encourages participation regardless of win rate
- Rewards active users

### Reward Structure (V1)
- Leaderboard rankings determine future $THIS token allocation (V3)
- Users earn allocation based on PnL and volume
- Cannot directly withdraw tokens
- Must use credits to unlock token allocation (anti-dumping)

## Problems We Solve

### For Users
- **Accessibility:** No wallet needed, no real money risk (V1)
- **Simplicity:** Swipe and tap instead of complex trading
- **Engagement:** Gamified with rewards and rankings
- **Learning:** Safe environment to understand prediction markets

### For the Platform
- **Metrics gathering:** User behavior data before real-money launch
- **Product validation:** Test UX and engagement mechanics
- **Risk mitigation:** Avoid regulatory issues with credits-first approach
- **Community building:** Build user base before V2/V3 launch

## What Success Looks Like

### Week 1
- 500 DAU actively betting
- 3,000+ bets placed
- 60%+ users return next day
- <10s time-to-first-bet

### M1-M2
- 10,000 DAU
- 50,000 registered users
- 5 avg bets/user/day
- 40%+ D7 retention
- 20%+ D30 retention

### Qualitative Success
- Users describe it as "addictive"
- High NPS score (>50)
- Organic social sharing
- Users understand prediction markets better
- Community forms around leaderboards
