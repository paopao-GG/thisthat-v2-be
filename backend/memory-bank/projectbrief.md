# Project Brief

## Project Name
THISTHAT Backend API - V1 (Credits System)

## Project Overview
Build a Fastify-based REST API backend for THISTHAT, a mobile-first prediction market platform that integrates with Polymarket infrastructure. V1 focuses exclusively on a credits-based economy to gather user metrics and validate product-market fit before introducing real-money betting.

## Core Objectives

### Primary Goal
Create a production-ready backend that supports:
- Credits-based prediction market betting
- Polymarket API integration for market data
- User authentication and profile management
- Real-time leaderboard rankings
- Daily reward distribution system

### Success Criteria
- Support 500+ DAU at launch
- Handle 1,000+ requests/second
- API response times < 500ms (p95)
- 99.5% uptime
- Zero critical bugs in production
- Enable 3,000+ bets in week one

## Target Users
- Mobile app users (React frontend)
- Future: Mobile native apps (React Native)

## Key Constraints

### V1 Scope (In-Scope)
- Credits-only betting (no real money)
- Admin-only market creation
- Polymarket market ingestion
- User registration and authentication
- Bet placement and resolution
- Leaderboard system (PnL and Volume)
- Daily login rewards

### V1 Exclusions (Out-of-Scope)
- Wallet integration (MetaMask, WalletConnect)
- USDC/real-money betting
- Creator-driven market creation
- Token ($THIS) economics
- KYC/compliance systems
- Social features (friends, chat)
- Push notifications

## Timeline
- **M1-M2:** Core API development, Polymarket integration, leaderboards
- **M2:** Testing and GTM preparation
- **M3:** Stress testing before public launch

## Success Metrics (Week 1)
- 500 DAU betting users
- 3,000+ total bets placed
- <10s time-to-first-bet (p95)
- >60% D1 retention

## Technical Philosophy
- Performance first: Fast, scalable, reliable
- Type safety: TypeScript everywhere
- Security: JWT auth, rate limiting, input validation
- Observability: Comprehensive logging and monitoring
- Simplicity: Clean architecture, minimal dependencies
