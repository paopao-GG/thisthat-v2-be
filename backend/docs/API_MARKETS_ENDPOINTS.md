# Markets API Endpoints Documentation

## Base URL

```
/api/v1/markets
```

---

## Static Data Endpoints

These endpoints return market data from PostgreSQL (no prices).

### GET `/random`

Get random open markets.

**Query Parameters:**
- `count` (optional): Number of markets to return (default: 10, max: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "market-uuid",
      "polymarketId": "0x123...",
      "title": "Will it rain tomorrow?",
      "description": "Weather prediction market",
      "thisOption": "YES",
      "thatOption": "NO",
      "author": "user123",
      "category": "weather",
      "imageUrl": null,
      "status": "open",
      "expiresAt": "2025-12-31T00:00:00Z"
    }
  ],
  "count": 10
}
```

**Example:**
```bash
curl "http://localhost:3001/api/v1/markets/random?count=20"
```

---

### GET `/:id`

Get a single market by ID (static data only).

**Path Parameters:**
- `id`: Market UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "market-uuid",
    "polymarketId": "0x123...",
    "title": "Will it rain tomorrow?",
    "description": "Weather prediction",
    "thisOption": "YES",
    "thatOption": "NO",
    "author": "user123",
    "category": "weather",
    "status": "open",
    "expiresAt": "2025-12-31T00:00:00Z"
  }
}
```

**Example:**
```bash
curl "http://localhost:3001/api/v1/markets/market-uuid"
```

**Errors:**
- `404` - Market not found

---

### GET `/category/:category`

Get markets by category.

**Path Parameters:**
- `category`: Category name (case-insensitive)

**Query Parameters:**
- `limit` (optional): Max results (default: 20, max: 100)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "market-uuid",
      "title": "Market Title",
      "category": "crypto",
      ...
    }
  ],
  "count": 5,
  "category": "crypto"
}
```

**Example:**
```bash
curl "http://localhost:3001/api/v1/markets/category/crypto?limit=50"
```

---

### GET `/categories`

Get all available categories.

**Response:**
```json
{
  "success": true,
  "data": ["crypto", "politics", "sports", "weather"]
}
```

**Example:**
```bash
curl "http://localhost:3001/api/v1/markets/categories"
```

---

## Live Pricing Endpoints

These endpoints fetch **fresh price data** from Polymarket API on-demand.

### GET `/:id/live`

Get live price data for a market.

**Path Parameters:**
- `id`: Market UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "polymarketId": "0x123...",
    "thisOdds": 0.65,
    "thatOdds": 0.35,
    "liquidity": 48238.52,
    "volume": 2181936.42,
    "volume24hr": 50000,
    "acceptingOrders": true
  },
  "marketId": "market-uuid"
}
```

**Example:**
```bash
curl "http://localhost:3001/api/v1/markets/market-uuid/live"
```

**Errors:**
- `404` - Market not found
- `400` - Market has no Polymarket ID
- `503` - Failed to fetch from Polymarket API

**Note:** This endpoint makes a live API call to Polymarket. Use sparingly or batch multiple requests.

---

### GET `/batch-live`

Get live price data for multiple markets at once (more efficient than individual calls).

**Query Parameters:**
- `ids`: Comma-separated market UUIDs (max: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "market-uuid-1": {
      "polymarketId": "0x111...",
      "thisOdds": 0.7,
      "thatOdds": 0.3,
      "liquidity": 1000,
      "volume": 5000,
      "volume24hr": 2000,
      "acceptingOrders": true
    },
    "market-uuid-2": {
      "polymarketId": "0x222...",
      "thisOdds": 0.5,
      "thatOdds": 0.5,
      "liquidity": 500,
      "volume": 1000,
      "volume24hr": 500,
      "acceptingOrders": true
    }
  },
  "count": 2
}
```

**Example:**
```bash
curl "http://localhost:3001/api/v1/markets/batch-live?ids=market-uuid-1,market-uuid-2,market-uuid-3"
```

**Note:** Markets without valid `polymarketId` are skipped (not included in response).

---

### GET `/:id/full`

Get market with **both** static data and live prices combined.

**Path Parameters:**
- `id`: Market UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "market-uuid",
    "polymarketId": "0x123...",
    "title": "Will it rain tomorrow?",
    "description": "Weather prediction",
    "thisOption": "YES",
    "thatOption": "NO",
    "author": "user123",
    "category": "weather",
    "status": "open",
    "expiresAt": "2025-12-31T00:00:00Z",
    "live": {
      "polymarketId": "0x123...",
      "thisOdds": 0.65,
      "thatOdds": 0.35,
      "liquidity": 48238.52,
      "volume": 2181936.42,
      "volume24hr": 50000,
      "acceptingOrders": true
    }
  }
}
```

**Example:**
```bash
curl "http://localhost:3001/api/v1/markets/market-uuid/full"
```

**Note:** If live price fetch fails, `live` will be `null` (static data still returned).

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message"
}
```

**Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found (market doesn't exist)
- `500` - Internal Server Error
- `503` - Service Unavailable (Polymarket API failure)

---

## Best Practices

### 1. Use Static Endpoints First

```typescript
// ✅ Good: Get static data first
const markets = await fetch('/api/v1/markets/random?count=10');

// Then fetch prices only for selected markets
const liveData = await fetch(`/api/v1/markets/${selectedMarketId}/live`);
```

### 2. Batch Price Requests

```typescript
// ✅ Good: Batch multiple price requests
const ids = markets.map(m => m.id).slice(0, 20);
const livePrices = await fetch(`/api/v1/markets/batch-live?ids=${ids.join(',')}`);

// ❌ Bad: Individual requests
for (const market of markets) {
  await fetch(`/api/v1/markets/${market.id}/live`); // Slow!
}
```

### 3. Cache Static Data

```typescript
// ✅ Good: Cache static market data (doesn't change often)
const markets = await fetch('/api/v1/markets/random?count=10');
// Cache for 5 minutes

// ❌ Bad: Refetch static data on every render
```

### 4. Handle Missing Prices Gracefully

```typescript
// ✅ Good: Handle null live data
const fullMarket = await fetch(`/api/v1/markets/${id}/full`);
if (fullMarket.data.live) {
  // Show prices
} else {
  // Show "Price unavailable" message
}
```

---

## Rate Limiting

**Current Limits:**
- No rate limiting implemented (planned for future)

**Polymarket API Limits:**
- Unknown (but respected by retry logic)
- Use batch endpoints when possible

**Recommendations:**
- Don't poll `/live` endpoints more than once per second per market
- Use batch endpoints for multiple markets
- Cache live prices client-side (5-10 seconds)

---

## Migration Guide

### From Old Routes

**Old:**
```typescript
GET /api/v1/markets/fetch  // Fetch from Polymarket
GET /api/v1/markets        // Get from MongoDB
```

**New:**
```typescript
GET /api/v1/markets/random           // Get random markets (PostgreSQL)
GET /api/v1/markets/:id              // Get market by ID
GET /api/v1/markets/:id/live         // Get live prices
GET /api/v1/markets/batch-live       // Batch live prices
```

**Legacy Routes (Still Available):**
```typescript
GET /api/v1/markets/legacy/fetch     // Old MongoDB fetch
GET /api/v1/markets/legacy           // Old MongoDB query
```

---

**Last Updated:** 2025-01-XX  
**Version:** 1.0

