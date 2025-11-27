# MongoDB Cursor Mock Fix Pattern

**Issue:** MongoDB cursor mocking in Vitest tests
**Fixed:** 2025-01-XX
**Applied to:** Sync Services Tests (10 tests)

---

## The Problem

MongoDB's Node.js driver uses method chaining for cursor operations:

```javascript
// Real MongoDB code
const results = await collection
  .find({ status: 'active' })
  .limit(100)
  .toArray();
```

When mocking this in tests, the mock must support the same chaining pattern. The original mock didn't support chaining properly, causing `TypeError: Cannot read properties of undefined`.

---

## ❌ WRONG Approach

```typescript
// This DOESN'T work - breaks the chain
const mockMongoDB = vi.hoisted(() => ({
  collection: vi.fn(() => ({
    find: vi.fn(() => ({
      limit: vi.fn(() => ({
        toArray: vi.fn(),
      })),
      toArray: vi.fn(),
    })),
  })),
}));
```

**Why it fails:**
- The `limit()` function returns a new object, not `this`
- You can't chain further methods like `.toArray()` after `.limit()`
- Each test can't easily override the return values

---

## ✅ CORRECT Approach

### Step 1: Create Reusable Cursor Mock Helper

```typescript
// Create in your test file or test utils
function createMongoCursor(data: any[] = []) {
  return {
    limit: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue(data),
  };
}
```

**Key points:**
- Use `.mockReturnThis()` for chainable methods
- Use `.mockResolvedValue()` for async terminal methods
- Allow data to be passed as parameter for per-test customization

### Step 2: Create Per-Test Collection Mock

```typescript
it('should test something', async () => {
  // 1. Create cursor with test-specific data
  const findCursor = createMongoCursor([mockData1, mockData2]);

  // 2. Create collection mock
  const collection = {
    find: vi.fn().mockReturnValue(findCursor),
    findOne: vi.fn(),
    countDocuments: vi.fn(),
    insertOne: vi.fn(),
    updateOne: vi.fn(),
  };

  // 3. Override the global mock for this test
  mockMongoDB.collection.mockReturnValue(collection as any);

  // 4. Run your test
  const result = await serviceFunction();

  // 5. Assert
  expect(result).toHaveLength(2);
  expect(collection.find).toHaveBeenCalledWith({ status: 'active' });
});
```

### Step 3: Global Mock Setup (Optional)

```typescript
// At the top of your test file
const mockMongoDB = vi.hoisted(() => ({
  collection: vi.fn(() => ({
    find: vi.fn(() => createMongoCursor()),
    findOne: vi.fn(),
    countDocuments: vi.fn(),
  })),
}));

vi.mock('../../lib/mongodb.js', () => ({
  getDatabase: vi.fn(() => Promise.resolve(mockMongoDB)),
}));
```

---

## Complete Example

Here's a full working example:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Helper function for cursor mocking
function createMongoCursor(data: any[] = []) {
  return {
    limit: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue(data),
  };
}

// Hoisted MongoDB mock
const mockMongoDB = vi.hoisted(() => ({
  collection: vi.fn(() => ({
    find: vi.fn(() => createMongoCursor()),
    findOne: vi.fn(),
    countDocuments: vi.fn(),
    insertOne: vi.fn(),
    updateOne: vi.fn(),
  })),
}));

// Mock the MongoDB module
vi.mock('../../lib/mongodb.js', () => ({
  getDatabase: vi.fn(() => Promise.resolve(mockMongoDB)),
}));

// Import service AFTER mocks
import * as syncService from '../mongodb-to-postgres.sync.js';

describe('Sync Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should sync markets successfully', async () => {
    // Test data
    const mockMarket = {
      conditionId: 'condition-123',
      question: 'Test Market?',
      thisOption: 'Yes',
      thatOption: 'No',
      status: 'active',
    };

    // Create cursor with test data
    const findCursor = createMongoCursor([mockMarket]);

    // Create collection mock
    const collection = {
      find: vi.fn().mockReturnValue(findCursor),
      countDocuments: vi.fn(),
    };

    // Override global mock
    mockMongoDB.collection.mockReturnValue(collection as any);

    // Run test
    const result = await syncService.syncAllMarketsToPostgres({ limit: 1 });

    // Assertions
    expect(result.synced).toBe(1);
    expect(result.errors).toBe(0);
    expect(collection.find).toHaveBeenCalledWith({});
    expect(findCursor.limit).toHaveBeenCalledWith(1);
  });

  it('should handle empty results', async () => {
    // Create cursor with no data
    const findCursor = createMongoCursor([]);

    const collection = {
      find: vi.fn().mockReturnValue(findCursor),
      countDocuments: vi.fn(),
    };

    mockMongoDB.collection.mockReturnValue(collection as any);

    const result = await syncService.syncAllMarketsToPostgres();

    expect(result.synced).toBe(0);
  });

  it('should filter by status', async () => {
    const findCursor = createMongoCursor([]);

    const collection = {
      find: vi.fn().mockReturnValue(findCursor),
      countDocuments: vi.fn(),
    };

    mockMongoDB.collection.mockReturnValue(collection as any);

    await syncService.syncAllMarketsToPostgres({ status: 'active' });

    expect(collection.find).toHaveBeenCalledWith({ status: 'active' });
  });
});
```

---

## Common Patterns

### Pattern 1: Test with Multiple Documents

```typescript
it('should process multiple documents', async () => {
  const mockDocs = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const findCursor = createMongoCursor(mockDocs);

  const collection = {
    find: vi.fn().mockReturnValue(findCursor),
  };

  mockMongoDB.collection.mockReturnValue(collection as any);

  const result = await service.findAll();

  expect(result).toHaveLength(3);
});
```

### Pattern 2: Test with Query Assertions

```typescript
it('should query with correct filters', async () => {
  const findCursor = createMongoCursor([]);

  const collection = {
    find: vi.fn().mockReturnValue(findCursor),
  };

  mockMongoDB.collection.mockReturnValue(collection as any);

  await service.findActive();

  expect(collection.find).toHaveBeenCalledWith({ status: 'active' });
  expect(findCursor.limit).toHaveBeenCalledWith(100);
});
```

### Pattern 3: Test Count Operations

```typescript
it('should count documents', async () => {
  const collection = {
    find: vi.fn(),
    countDocuments: vi.fn()
      .mockResolvedValueOnce(100)  // Total count
      .mockResolvedValueOnce(50),  // Active count
  };

  mockMongoDB.collection.mockReturnValue(collection as any);

  const counts = await service.getCounts();

  expect(counts.total).toBe(100);
  expect(counts.active).toBe(50);
});
```

### Pattern 4: Test Error Handling

```typescript
it('should handle database errors', async () => {
  const findCursor = createMongoCursor([]);
  findCursor.toArray.mockRejectedValue(new Error('DB Error'));

  const collection = {
    find: vi.fn().mockReturnValue(findCursor),
  };

  mockMongoDB.collection.mockReturnValue(collection as any);

  await expect(service.findAll()).rejects.toThrow('DB Error');
});
```

---

## Key Principles

### 1. **Use `mockReturnThis()` for Chaining**
Any method that should be chainable must return `this`:
```typescript
limit: vi.fn().mockReturnThis(),
skip: vi.fn().mockReturnThis(),
sort: vi.fn().mockReturnThis(),
```

### 2. **Use `mockResolvedValue()` for Async Terminal Methods**
Methods that end the chain and return promises:
```typescript
toArray: vi.fn().mockResolvedValue(data),
```

### 3. **Create Fresh Mocks Per Test**
Don't rely on global mocks - create new ones in each test:
```typescript
it('test', async () => {
  const findCursor = createMongoCursor([...testData]);
  const collection = { find: vi.fn().mockReturnValue(findCursor) };
  mockMongoDB.collection.mockReturnValue(collection);
  // ... test
});
```

### 4. **Mock Only What You Use**
Don't mock every possible MongoDB method - just what your service uses:
```typescript
// If service only uses find() and toArray(), that's all you need
const collection = {
  find: vi.fn().mockReturnValue(findCursor),
};
```

---

## Troubleshooting

### Issue: `Cannot read properties of undefined (reading 'length')`
**Solution:** Your cursor's `toArray()` is returning undefined. Make sure you're using `.mockResolvedValue([])` (empty array, not undefined).

### Issue: `TypeError: cursor.limit(...).toArray is not a function`
**Solution:** Your `limit()` isn't returning `this`. Use `.mockReturnThis()`.

### Issue: Tests interfere with each other
**Solution:** Create fresh mocks in each test, don't reuse global mocks. Use `beforeEach(() => vi.clearAllMocks())`.

### Issue: Mock not being called
**Solution:** Make sure you're importing the service AFTER setting up mocks. Use `vi.hoisted()` for mock definitions.

---

## Files Fixed Using This Pattern

1. ✅ `backend/src/features/sync/__tests__/sync.services.test.ts` (10 tests)
2. ⏸️ `backend/src/features/fetching/event-market-group/__tests__/event-market-group.services.test.ts` (needs fix)

---

## Related Issues

- [Vitest Mocking Guide](https://vitest.dev/guide/mocking.html)
- [MongoDB Cursor API](https://mongodb.github.io/node-mongodb-native/6.0/classes/FindCursor.html)
- Original issue: `TypeError: Cannot read properties of undefined`

---

**Last Updated:** 2025-01-XX
**Status:** ✅ Proven solution, ready for reuse
