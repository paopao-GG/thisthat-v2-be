# Credit Allocation Schema & Structure

## Overview

The credit allocation system uses **three main tables**:
1. **`users`** - Stores current credit balances and streak tracking
2. **`daily_rewards`** - Separate table tracking each daily claim
3. **`credit_transactions`** - Complete audit trail of all credit movements

---

## Database Schema Diagram

```mermaid
erDiagram
    User ||--o{ DailyReward : "has many"
    User ||--o{ CreditTransaction : "has many"
    User ||--o{ CreditPurchase : "has many"
    User ||--o{ Bet : "has many"
    User ||--o{ StockHolding : "has many"
    User ||--o{ StockTransaction : "has many"
    
    User {
        uuid id PK
        string username UK
        string email UK
        string referral_code UK
        uuid referred_by_id FK
        decimal credit_balance "Current total credits"
        decimal available_credits "Credits for trading"
        decimal expended_credits "Total spent"
        decimal total_volume "Betting volume"
        decimal overall_pnl "Profit/Loss"
        int consecutive_days_online "Streak counter"
        datetime last_daily_reward_at "Last claim timestamp"
        datetime last_login_at "Last login timestamp"
        int referral_count
        decimal referral_credits_earned
    }
    
    DailyReward {
        uuid id PK
        uuid user_id FK
        decimal credits_awarded "Amount claimed"
        datetime claimed_at "Claim timestamp"
    }
    
    CreditTransaction {
        uuid id PK
        uuid user_id FK
        decimal amount "Positive=credit, Negative=debit"
        string transaction_type "daily_reward, bet_placed, bet_won, referral_bonus, etc."
        uuid reference_id "Links to Bet/DailyReward/etc"
        decimal balance_after "Balance after transaction"
        datetime created_at
    }
    
    CreditPurchase {
        uuid id PK
        uuid user_id FK
        string package_id "starter, boost, pro, whale"
        decimal credits_granted
        decimal usd_amount
        string status "pending, completed, failed"
        string provider "stripe, manual"
        string external_id
        datetime created_at
    }
    
    Bet {
        uuid id PK
        uuid user_id FK
        uuid market_id FK
        decimal amount
        string side "this, that"
        decimal odds_at_bet
        decimal potential_payout
        decimal actual_payout
        string status "pending, won, lost, cancelled"
        datetime placed_at
        datetime resolved_at
    }
```

---

## Credit Allocation Flow Diagram

```mermaid
flowchart TD
    Start([User Claims Daily Credits]) --> CheckEligible{Check Eligibility}
    
    CheckEligible -->|Never claimed| FirstClaim[First Claim: Day 1]
    CheckEligible -->|Last claim < today UTC midnight| Eligible[Eligible to Claim]
    CheckEligible -->|Already claimed today| AlreadyClaimed[Return: Already Claimed]
    
    FirstClaim --> CalculateStreak[Calculate Consecutive Days]
    Eligible --> CalculateStreak
    
    CalculateStreak --> CheckStreak{Check Streak}
    
    CheckStreak -->|Days since last = 1| IncrementStreak[Increment Streak: +1]
    CheckStreak -->|Days since last = 0| SameDay[Same Day: No Change]
    CheckStreak -->|Days since last > 1| ResetStreak[Reset Streak: Back to 1]
    
    IncrementStreak --> CalculateCredits[Calculate Credits]
    SameDay --> AlreadyClaimed
    ResetStreak --> CalculateCredits
    
    CalculateCredits --> Formula{Apply Formula}
    
    Formula -->|Day 1-17| FormulaCalc["credits = 1000 + (streak - 1) × 500"]
    Formula -->|Day 18+| MaxCredits["credits = 10,000 (max)"]
    
    FormulaCalc --> Transaction[Start Database Transaction]
    MaxCredits --> Transaction
    
    Transaction --> UpdateUser[Update User Table]
    UpdateUser --> UpdateBalance["creditBalance += creditsAwarded<br/>availableCredits += creditsAwarded<br/>consecutiveDaysOnline = newStreak<br/>lastDailyRewardAt = now"]
    
    UpdateBalance --> CreateTransaction[Create CreditTransaction]
    CreateTransaction --> LogTransaction["transactionType: 'daily_reward'<br/>amount: creditsAwarded<br/>balanceAfter: newBalance"]
    
    LogTransaction --> CreateDailyReward[Create DailyReward Record]
    CreateDailyReward --> RecordClaim["Store claim history:<br/>creditsAwarded<br/>claimedAt"]
    
    RecordClaim --> Commit[Commit Transaction]
    Commit --> Success([Success: Credits Awarded])
    
    AlreadyClaimed --> End([End])
    Success --> End
    
    style Start fill:#e1f5ff
    style Success fill:#d4edda
    style AlreadyClaimed fill:#fff3cd
    style Transaction fill:#f8d7da
    style Formula fill:#d1ecf1
```

---

## Credit Allocation Formula

```mermaid
graph LR
    A[Consecutive Days] --> B{Day >= 18?}
    B -->|Yes| C[10,000 Credits<br/>MAX]
    B -->|No| D[Formula Calculation]
    D --> E["credits = 1000 +<br/>(streak - 1) × 500"]
    E --> F{Result > 10,000?}
    F -->|Yes| C
    F -->|No| G[Use Calculated Value]
    
    style C fill:#ff6b6b
    style G fill:#51cf66
    style E fill:#4dabf7
```

---

## Credit Allocation Timeline

```mermaid
gantt
    title Daily Credit Allocation Streak System
    dateFormat YYYY-MM-DD
    axisFormat Day %d
    
    section Streak Progression
    Day 1: 1,000 credits    :done, day1, 2025-01-01, 1d
    Day 2: 1,500 credits    :done, day2, 2025-01-02, 1d
    Day 3: 2,000 credits    :done, day3, 2025-01-03, 1d
    Day 4: 2,500 credits    :done, day4, 2025-01-04, 1d
    Day 5: 3,000 credits    :done, day5, 2025-01-05, 1d
    Day 6: 3,500 credits    :active, day6, 2025-01-06, 1d
    Day 7: 4,000 credits    :day7, 2025-01-07, 1d
    Day 8: 4,500 credits    :day8, 2025-01-08, 1d
    Day 9: 5,000 credits    :day9, 2025-01-09, 1d
    Day 10: 5,500 credits   :day10, 2025-01-10, 1d
    Day 11: 6,000 credits   :day11, 2025-01-11, 1d
    Day 12: 6,500 credits   :day12, 2025-01-12, 1d
    Day 13: 7,000 credits   :day13, 2025-01-13, 1d
    Day 14: 7,500 credits   :day14, 2025-01-14, 1d
    Day 15: 8,000 credits   :day15, 2025-01-15, 1d
    Day 16: 8,500 credits   :day16, 2025-01-16, 1d
    Day 17: 9,000 credits   :day17, 2025-01-17, 1d
    Day 18+: 10,000 credits :crit, day18, 2025-01-18, 365d
```

---

## Table Structure Details

### 1. User Table (Credit Tracking Fields)

```mermaid
classDiagram
    class User {
        +uuid id
        +string username
        +string email
        +decimal credit_balance "Total credits owned"
        +decimal available_credits "Credits available for trading"
        +decimal expended_credits "Total credits spent"
        +int consecutive_days_online "Current streak (1-18+)"
        +datetime last_daily_reward_at "Last claim timestamp"
        +datetime last_login_at "Last login timestamp"
        +int rank_by_pnl
        +int rank_by_volume
    }
    
    note for User "credit_balance = available_credits + locked_credits<br/>In V1, all credits are available"
```

### 2. DailyReward Table (Claim History)

```mermaid
classDiagram
    class DailyReward {
        +uuid id
        +uuid user_id FK
        +decimal credits_awarded "Amount claimed this day"
        +datetime claimed_at "Exact claim timestamp"
    }
    
    note for DailyReward "Separate table for audit trail<br/>One record per claim<br/>Indexed by user_id and claimed_at"
```

### 3. CreditTransaction Table (Complete Audit Trail)

```mermaid
classDiagram
    class CreditTransaction {
        +uuid id
        +uuid user_id FK
        +decimal amount "Positive=credit, Negative=debit"
        +string transaction_type
        +uuid reference_id "Links to source (Bet/DailyReward/etc)"
        +decimal balance_after "Balance after this transaction"
        +datetime created_at
    }
    
    note for CreditTransaction "transaction_type values:<br/>- daily_reward<br/>- bet_placed<br/>- bet_won<br/>- bet_lost<br/>- bet_cancelled<br/>- referral_bonus<br/>- credit_purchase<br/>- signup_bonus"
```

---

## Credit Allocation Process (Step-by-Step)

```mermaid
sequenceDiagram
    participant User
    participant API as API Endpoint
    participant Service as Economy Service
    participant DB as Database
    participant Job as Background Job
    
    Note over User,Job: Manual Claim Flow
    User->>API: POST /api/v1/economy/daily-credits
    API->>Service: processDailyCreditAllocation(userId)
    Service->>DB: Find user by ID
    DB-->>Service: User data (lastDailyRewardAt, consecutiveDaysOnline)
    Service->>Service: Check if eligible (UTC midnight check)
    alt Already claimed today
        Service-->>API: { creditsAwarded: 0, nextAvailableAt }
        API-->>User: 200 OK (already claimed)
    else Eligible to claim
        Service->>Service: Calculate consecutive days
        Service->>Service: Calculate credits (1000 + (streak-1) × 500)
        Service->>DB: Begin Transaction
        Service->>DB: Update User (balance, streak, timestamp)
        Service->>DB: Create CreditTransaction
        Service->>DB: Create DailyReward
        Service->>DB: Commit Transaction
        Service-->>API: { creditsAwarded, consecutiveDays, nextAvailableAt }
        API-->>User: 200 OK (credits awarded)
    end
    
    Note over User,Job: Automatic Background Job Flow
    Job->>DB: Find eligible users (lastDailyRewardAt < today UTC midnight)
    DB-->>Job: List of eligible users
    loop For each user
        Job->>Service: processDailyCreditAllocation(userId)
        Service->>DB: Process claim (same as manual flow)
        Service-->>Job: Success/Error
    end
```

---

## Credit Sources & Sinks

```mermaid
graph TB
    subgraph "Credit Sources (Inflow)"
        S1[Daily Rewards<br/>1,000-10,000 credits]
        S2[Signup Bonus<br/>1,000 credits]
        S3[Referral Bonus<br/>+200 credits per referral]
        S4[Credit Purchase<br/>500-5,000 credits]
        S5[Bet Winnings<br/>Variable payout]
    end
    
    subgraph "Credit Sinks (Outflow)"
        D1[Bet Placement<br/>10-10,000 credits]
        D2[Stock Purchases<br/>Variable]
        D3[Bet Losses<br/>Credits lost]
    end
    
    subgraph "User Balance"
        B[creditBalance<br/>availableCredits]
    end
    
    S1 --> B
    S2 --> B
    S3 --> B
    S4 --> B
    S5 --> B
    
    B --> D1
    B --> D2
    B --> D3
    
    style S1 fill:#51cf66
    style S2 fill:#51cf66
    style S3 fill:#51cf66
    style S4 fill:#51cf66
    style S5 fill:#51cf66
    style D1 fill:#ff6b6b
    style D2 fill:#ff6b6b
    style D3 fill:#ff6b6b
    style B fill:#4dabf7
```

---

## Key Points

### ✅ Separate Tables
- **`daily_rewards`** - Dedicated table for tracking each daily claim
- **`credit_transactions`** - Complete audit trail of ALL credit movements
- **`users`** - Current state (balance, streak, timestamps)

### ✅ Atomic Transactions
All credit operations use database transactions to ensure:
- Balance updates
- Transaction logging
- Daily reward recording
- Happen atomically (all or nothing)

### ✅ UTC Midnight Reset
- Claims reset at **00:00 UTC** (not rolling 24-hour window)
- Background job runs at midnight UTC
- Users can claim once per UTC day

### ✅ Streak Calculation
- **Day 1:** 1,000 credits
- **Day 2:** 1,500 credits (+500)
- **Day 3:** 2,000 credits (+500)
- **...continues...**
- **Day 18+:** 10,000 credits (max, stays until streak breaks)
- **Missing a day:** Resets to Day 1 (1,000 credits)

### ✅ Formula
```
credits = 1000 + (consecutiveDays - 1) × 500
capped at 10,000 credits
```

---

## Example Data Flow

**Day 1 Claim:**
```
User.creditBalance: 1000 → 2000
User.availableCredits: 1000 → 2000
User.consecutiveDaysOnline: 1 → 2
User.lastDailyRewardAt: null → 2025-01-01 00:00:00 UTC

DailyReward created:
  creditsAwarded: 1000
  claimedAt: 2025-01-01 00:00:00 UTC

CreditTransaction created:
  amount: +1000
  transactionType: 'daily_reward'
  balanceAfter: 2000
```

**Day 2 Claim (Next UTC Day):**
```
User.creditBalance: 2000 → 3500
User.availableCredits: 2000 → 3500
User.consecutiveDaysOnline: 2 → 3
User.lastDailyRewardAt: 2025-01-01 → 2025-01-02 00:00:00 UTC

DailyReward created:
  creditsAwarded: 1500
  claimedAt: 2025-01-02 00:00:00 UTC

CreditTransaction created:
  amount: +1500
  transactionType: 'daily_reward'
  balanceAfter: 3500
```

---

**Last Updated:** 2025-01-XX  
**Status:** ✅ Production Ready

