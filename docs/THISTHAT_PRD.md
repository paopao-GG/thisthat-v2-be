# **THISTHAT PRD – Full Product Requirements Document**

Polymarket-Integrated Rebuild

\------------------------------------------------------------

# **Section 1: Swipe & Betting UI / Market Interaction**

Overview:

The Button Tapping & Swiping UI is the core interaction of the new THISTHAT app, merging SocialFi elements with Polymarket-style THIS/THAT prediction markets (binary).

Key Goals:

\- Tap on THIS/THAT \= select option to bet

\- Balance input \= input the amount of balance users want to risk

\- Swipe up/down \= next/previous market

\- Single market card by default but we’re not limited to having one more than one

\- Credits for V1, wallet/USDC for V2

Components:

\- Market card (title, description, odds, expiry)

\- THIS/THAT bar with bet size indicator below to input risk amount

\- Navigation and animations

\- Polymarket API integration

\- Edge case handling

# 

# **Section 2: Credit System & Wallet Integration**

Credits (V1):

\- Earned via daily claims or through referrals

	\- Each successful claim per day increases the daily log-in streak of a user. When this happens, an additional 500 credits can be claimed. Starting from 1000 credits up to 1500, 2000, 2500, and so on until a max of 10000 credit claims (18-day streak).

	\- Once a user is at the max of 10000 credit claims, it will no longer increase but instead will be kept until the streak is over. Hence, will reset back to 1000 credit claims per day.

	\- The credit claim happens every 00:00 UTC.

\- Used for all bets in V1

\- Minimum/maximum bet configurable

\- Payouts mirrors Polymarket odds

\- Can also be earned through in-app purchases

Wallet (V2):

\- Connect MetaMask, Phantom, etc. \[Chain: Redacted\]

\- Real USDC betting

\- Compliance: KYC, geo-blocking as needed

# **Section 3: Market Selection / Categorization Logic**

3-Layer Categorization:

1\. Credits markets

2\. Polymarket markets

3\. Cross markets (CreatorWall data \+ Polymarket)

Market Types:

\- Single-card THIS/THAT markets (default)

\- Dual-card creator comparisons

Ranking Logic:

\- Trendingness, liquidity, category preference, user history, editorial selection

# **Section 4: Market Creation (Builder \+ Creator)**

V1:

\- Admin-only market creation

V2:

\- Admin-only market creation following the market using Polymarket API

\- Introduction to onchain markets using USDC as risk

V3:

\- Fully integrated polymarket API \+ creator-driven markets created by spending/staking $THIS tokens

# **Section 5: Rankings, Rewards, Gamification**

User Ranking:

\- Credits Earned (Overall PnL), Overall Volume

Creator Ranking:

\- Markets Created, Engagement, Bet Activitiy

User Goals:

\- Earn as much volume as you can while trying to stay positive in their overall PnL aligned with their overall volume. The higher the volume and overall PnL goes, the higher $THIS token allocation users will receive.

Rewards:

\- Rewards are going to be based off of the leaderboards. The higher a user is ranked, the higher $THIS token allocation they will receive. However, we won’t be allowing a direct withdrawal of $THIS tokens to avoid dumping, milking, and to protect our economy. For users to cashout, they need to use their credits to unlock locked $THIS token allocation. This way users won’t be able to forget betting on the V1 market (credit-based).

# **Section 6: System Architecture Overview**

Frontend:

\- React Native/Flutter

\- Swipe engine \+ local caching

Backend:

\- Node/Go, credit ledger, ranking engine, ingestion pipeline

External Integrations:

\- Polymarket Builder API

\- WalletConnect (V2)

\- CreatorWall dataset

# **Section 7: Timeline & Milestones**

M1 \- M2: UI finalization, credits system \+ payment system, categorizations, active leaderboards, and market ingestion

M2: GTM assets

M3: Stress testing before public release

# **Section 8: Risks & Mitigations**

Risks:

\- Polymarket API instability

\- Credit inflation

\- User overwhelm

\- Dual-selection exploit

\- Regulatory restrictions

Mitigations:

\- Strict single-selection

\- Credit sink mechanisms

\- Editorial curation

\- Credits-first launch

# **Section 9: Success Metrics & KPIs**

DAU, WAU, MAU

Avg bets/user/day

Swipe-to-bet conversion

Retention (D1, D7, D30)

Virality coefficient

Accuracy of top bettors

Launch goals:

\- 500 DAU bettors

\- 3,000+ week-one bets

\- \<10s time-to-first-bet