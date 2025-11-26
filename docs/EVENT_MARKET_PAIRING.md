# Event-Market Pairing Implementation

## Overview

Implemented event-market grouping where each event can contain multiple markets, matching the Polymarket structure.

## Data Structure

```
Event: "US Elections 2024"
├─ Market 1: "Will Trump win?"
├─ Market 2: "Will Biden run?"
└─ Market 3: "Electoral college votes >300?"

Event: "Fed Rate Decisions"
├─ Market 1: "Rate hike in 2025?"
└─ Market 2: "6 rate cuts in 2025?"
```

## Backend Implementation

### New Files Created

1. **`backend/src/features/fetching/event-market-group/event-market-group.services.ts`**
   - `fetchAndSaveEventMarketGroups()` - Fetches events with their markets from Polymarket
   - `getAllEventMarketGroups()` - Retrieves event groups from MongoDB
   - `getEventMarketGroup()` - Gets single event by ID
   - `getEventMarketGroupStats()` - Statistics

2. **`backend/src/features/fetching/event-market-group/event-market-group.controllers.ts`**
   - HTTP controllers for event-market group endpoints

3. **`backend/src/features/fetching/event-market-group/event-market-group.routes.ts`**
   - Routes registered at `/api/v1/event-market-groups`

### API Endpoints

#### Fetch Events with Markets
```bash
POST /api/v1/event-market-groups/fetch?active=true&limit=10
```
- Fetches events from Polymarket Gamma API
- Each event includes its markets
- Saves to MongoDB collections: `events` and `markets`

#### Get Event Groups
```bash
GET /api/v1/event-market-groups?status=active&limit=50
```
- Returns events with their nested markets
- Supports filtering by status and category

#### Get Single Event Group
```bash
GET /api/v1/event-market-groups/:eventId
```

#### Get Statistics
```bash
GET /api/v1/event-market-groups/stats
```

### Data Model

```typescript
interface EventMarketGroup {
  eventId: string;
  eventTitle: string;          // "US Elections 2024"
  eventDescription?: string;
  eventSlug: string;
  eventImage?: string;
  eventIcon?: string;
  category?: string;
  status: 'active' | 'closed' | 'archived';
  markets: FlattenedMarket[];  // Array of markets
  totalLiquidity: number;      // Sum of all market liquidities
  totalVolume: number;         // Sum of all market volumes
  createdAt: Date;
  updatedAt: Date;
}
```

## Frontend Implementation

### New Files Created

1. **`frontend/src/shared/services/eventMarketGroupService.ts`**
   - Service to fetch event-market groups
   - `getEventMarketGroups()` - Fetch from API
   - `getEventMarketGroup()` - Get single event
   - `fetchEventMarketGroups()` - Trigger Polymarket fetch

### Updated Files

2. **`frontend/src/app/pages/BettingPage.tsx`**
   - Now fetches event groups instead of individual markets
   - Shows event title header
   - Navigation cycles through markets within events
   - Counter shows: "Event X of Y • Market X of Y"

### Navigation Logic

**Arrow Up / Click ↑:**
- If more markets in current event → next market
- If last market in event → first market of next event

**Arrow Down / Click ↓:**
- If not first market in event → previous market
- If first market in event → last market of previous event

### Display Format

```
┌─────────────────────────────────┐
│   US Elections 2024             │
│   3 markets in this event       │
├─────────────────────────────────┤
│                                 │
│   [Market Card]                 │
│   Will Trump win?               │
│                                 │
├─────────────────────────────────┤
│   [Betting Controls]            │
│   THIS / THAT                   │
│                                 │
├─────────────────────────────────┤
│ Event 1 of 5 • Market 1 of 3    │
└─────────────────────────────────┘
```

## Usage

### 1. Fetch Events with Markets (Backend)
```bash
curl -X POST "http://localhost:3001/api/v1/event-market-groups/fetch?active=true&limit=10"
```

Response:
```json
{
  "success": true,
  "message": "Fetched and saved 10 event-market groups",
  "data": {
    "saved": 10,
    "errors": 0
  }
}
```

### 2. View in Frontend
- Navigate to http://localhost:5173/play
- Events load automatically
- Use arrow keys or navigation buttons
- See event title and market count above each market

## Benefits

1. **Organized Data**: Markets grouped by their parent event
2. **Context**: Users see which event the market belongs to
3. **Navigation**: Logical flow through related markets
4. **Scalability**: Events with many markets (e.g., "How many Fed rate cuts?" with 10 markets)

## Example Events from Polymarket

**Event**: "How many Fed rate cuts in 2025?"
- Market: "0 cuts (0 bps)"
- Market: "1 cut (25 bps)"
- Market: "2 cuts (50 bps)"
- Market: "3 cuts (75 bps)"
- ... up to 10+ markets

**Event**: "US recession in 2025?"
- Market: "US recession in 2025?"

**Event**: "Fed rate hike in 2025?"
- Market: "Fed rate hike in 2025?"

## MongoDB Collections

### `events` Collection
```json
{
  "eventId": "16092",
  "eventTitle": "US recession in 2025?",
  "eventSlug": "us-recession-in-2025",
  "eventImage": "https://...",
  "status": "active",
  "markets": [
    {
      "conditionId": "0xfa48...",
      "question": "US recession in 2025?",
      "thisOption": "Yes",
      "thatOption": "No",
      "thisOdds": 0.0395,
      "thatOdds": 0.9605
    }
  ],
  "totalLiquidity": 69948.98,
  "totalVolume": 10188156.04
}
```

### `markets` Collection
- Individual markets are still saved separately for backward compatibility
- Can query markets directly OR through event groups

## Testing

1. **Fetch event groups**:
```bash
curl -X POST "http://localhost:3001/api/v1/event-market-groups/fetch?active=true&limit=5"
```

2. **Verify data**:
```bash
curl "http://localhost:3001/api/v1/event-market-groups?status=active&limit=2" | python -m json.tool
```

3. **Check stats**:
```bash
curl "http://localhost:3001/api/v1/event-market-groups/stats" | python -m json.tool
```

4. **View in browser**:
- Open http://localhost:5173/play
- Should show events with event title header
- Navigate with arrow keys

## Status

✅ **Complete and Working**
- Backend fetches events with markets
- Frontend displays event-market pairs
- Navigation works across events and markets
- Event title and counter displayed

---

**Date**: 2025-11-20
**Version**: V1 - Event-Market Pairing
