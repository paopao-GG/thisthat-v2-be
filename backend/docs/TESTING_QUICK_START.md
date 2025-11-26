# Testing Quick Start

## ✅ Setup Complete!

Unit testing is now configured for the THISTHAT backend. Here's how to use it:

---

## 🚀 Running Tests

### Watch Mode (Recommended for Development)
```bash
npm test
```
Runs tests in watch mode - automatically re-runs when you change files.

### Run Once
```bash
npm run test:run
```

### Visual UI (Great for Debugging)
```bash
npm run test:ui
```
Opens a web interface where you can:
- See all tests visually
- Click on tests to see details
- Filter and search tests
- See test coverage

### Coverage Report
```bash
npm run test:coverage
```
Shows which code is covered by tests.

---

## 📝 Your First Test Suite

**Location:** `src/lib/__tests__/polymarket-client.test.ts`

**Status:** ✅ **24 tests passing!**

This test suite covers:
- ✅ Constructor initialization
- ✅ `getMarkets()` - fetching markets
- ✅ `getMarket()` - fetching single market
- ✅ `getEvents()` - fetching events
- ✅ `getEvent()` - fetching single event
- ✅ `getEventMarkets()` - fetching markets for an event
- ✅ Error handling
- ✅ Response format handling (wrapped/unwrapped)

---

## 🧪 Test Results

```
✓ src/lib/__tests__/polymarket-client.test.ts (24 tests) 18ms

Test Files  1 passed (1)
     Tests  24 passed (24)
```

All tests are passing! 🎉

---

## 📚 What's Tested?

### PolymarketClient Tests

1. **Constructor Tests**
   - Creates client with default URL
   - Creates client with custom URL
   - Configures axios correctly

2. **getMarkets() Tests**
   - Fetches markets successfully
   - Handles wrapped response formats
   - Passes query parameters correctly
   - Defaults to active markets
   - Handles errors gracefully

3. **getMarket() Tests**
   - Fetches single market
   - Returns null on error
   - Handles null responses

4. **getEvents() Tests**
   - Fetches events successfully
   - Handles all query parameters
   - Handles wrapped responses
   - Error handling

5. **getEvent() Tests**
   - Fetches single event
   - Returns null on error

6. **getEventMarkets() Tests**
   - Fetches markets for event
   - Returns empty array on error

---

## 🎯 Next Steps

### 1. Write More Tests

Create test files for:
- `src/features/fetching/market-data/market-data.services.test.ts`
- `src/features/fetching/event-data/event-data.services.test.ts`
- `src/lib/mongodb.test.ts`

### 2. Test Normalization Functions

Test the `normalizeMarket()` and `normalizeEvent()` functions:
- Valid input → correct output
- Missing fields → defaults
- Invalid data → errors

### 3. Test Service Functions

Test `fetchAndSaveMarkets()` and `fetchAndSaveEvents()`:
- Mock MongoDB
- Mock PolymarketClient
- Test error handling
- Test upsert logic

---

## 📖 Learn More

See `UNIT_TESTING_GUIDE.md` for:
- Detailed testing patterns
- Best practices
- Advanced mocking
- Coverage goals

---

## 💡 Tips

1. **Run tests in watch mode** while developing
2. **Use test:ui** to visually debug failing tests
3. **Write tests first** (TDD) for new features
4. **Keep tests simple** - one thing per test
5. **Mock external dependencies** - don't call real APIs

---

**Happy Testing! 🧪**

