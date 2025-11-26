# Unit Testing Guide

This guide explains how to write and run unit tests for the THISTHAT backend.

---

## Testing Framework: Vitest

We use **Vitest** because:
- ✅ Fast and modern (built on Vite)
- ✅ Works seamlessly with TypeScript
- ✅ Supports ES modules (no configuration needed)
- ✅ Great TypeScript support
- ✅ Compatible with Jest API (easy migration if needed)
- ✅ Built-in coverage reports

---

## Setup

### 1. Install Dependencies

```bash
npm install -D vitest @vitest/ui @vitest/coverage-v8
```

### 2. Configure Vitest

Create `vitest.config.ts` in the backend root:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // Use global test, expect, etc.
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
    },
  },
});
```

### 3. Update package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## Writing Your First Test

### Test File Naming Convention

- `*.test.ts` - Unit tests
- `*.spec.ts` - Alternative naming (same as .test.ts)

### Example: Testing PolymarketClient

```typescript
// src/lib/__tests__/polymarket-client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PolymarketClient } from '../polymarket-client.js';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('PolymarketClient', () => {
  let client: PolymarketClient;
  
  beforeEach(() => {
    vi.clearAllMocks();
    client = new PolymarketClient(undefined, 'https://test-api.com');
  });

  describe('getMarkets', () => {
    it('should fetch markets successfully', async () => {
      const mockMarkets = [
        { condition_id: '1', question: 'Test?' },
        { condition_id: '2', question: 'Another?' },
      ];
      
      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: mockMarkets }),
      } as any);
      
      const result = await client.getMarkets();
      
      expect(result).toEqual(mockMarkets);
    });
  });
});
```

---

## Running Tests

### Watch Mode (Development)
```bash
npm test
```
Runs tests in watch mode - automatically re-runs on file changes.

### Run Once
```bash
npm run test:run
```

### UI Mode (Visual)
```bash
npm run test:ui
```
Opens a web UI to see test results visually.

### Coverage Report
```bash
npm run test:coverage
```
Generates coverage report showing which code is tested.

---

## Testing Patterns

### 1. Mocking External Dependencies

```typescript
import { vi } from 'vitest';

// Mock a module
vi.mock('../lib/mongodb.js', () => ({
  getDatabase: vi.fn(),
}));
```

### 2. Testing Async Functions

```typescript
it('should handle async operations', async () => {
  const result = await someAsyncFunction();
  expect(result).toBeDefined();
});
```

### 3. Testing Error Cases

```typescript
it('should throw error on API failure', async () => {
  mockedAxios.create.mockReturnValue({
    get: vi.fn().mockRejectedValue(new Error('API Error')),
  } as any);
  
  await expect(client.getMarkets()).rejects.toThrow('Failed to fetch markets');
});
```

### 4. Testing with Parameters

```typescript
it('should pass query parameters correctly', async () => {
  const mockGet = vi.fn().mockResolvedValue({ data: [] });
  mockedAxios.create.mockReturnValue({ get: mockGet } as any);
  
  await client.getMarkets({ limit: 10, closed: false });
  
  expect(mockGet).toHaveBeenCalledWith('/markets', {
    params: { closed: 'false', limit: 10 },
  });
});
```

---

## Best Practices

### 1. Test Structure (AAA Pattern)

```typescript
it('should do something', () => {
  // Arrange - Set up test data
  const input = 'test';
  
  // Act - Execute the function
  const result = functionToTest(input);
  
  // Assert - Verify the result
  expect(result).toBe('expected');
});
```

### 2. Descriptive Test Names

✅ Good:
```typescript
it('should return active markets when closed=false', ...)
it('should throw error when API returns invalid response', ...)
```

❌ Bad:
```typescript
it('test 1', ...)
it('works', ...)
```

### 3. One Assertion Per Test (When Possible)

```typescript
// ✅ Good - Clear what's being tested
it('should return array of markets', () => {
  expect(result).toBeInstanceOf(Array);
});

it('should return markets with required fields', () => {
  expect(result[0]).toHaveProperty('condition_id');
  expect(result[0]).toHaveProperty('question');
});
```

### 4. Test Edge Cases

- Empty responses
- Null/undefined values
- Invalid input
- Network errors
- Timeout errors

### 5. Clean Up After Tests

```typescript
afterEach(() => {
  vi.clearAllMocks();
});
```

---

## Example: Complete Test Suite

See `src/lib/__tests__/polymarket-client.test.ts` for a complete example.

---

## Coverage Goals

- **Minimum:** 80% code coverage
- **Target:** 90%+ for critical modules (auth, betting, credits)
- **Focus:** Test business logic, not implementation details

---

## Next Steps

1. ✅ Set up Vitest (this guide)
2. ✅ Write tests for PolymarketClient
3. Write tests for market-data.services.ts
4. Write tests for event-data.services.ts
5. Write tests for normalization functions
6. Set up CI/CD to run tests automatically

---

**Happy Testing! 🧪**

