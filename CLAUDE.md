# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**KewalInvest** is a multi-tenant financial advisory platform for portfolio management, goal tracking, transaction processing, and market analysis. Built with a React frontend, Express/TypeScript backend, PostgreSQL database, and Redis cache.

## Commands

### Full Stack Setup
```bash
npm run install:all       # Install all dependencies (root + backend + frontend)
docker-compose up -d      # Start PostgreSQL, Redis, n8n, pgAdmin
```

### Backend
```bash
cd backend
npm run dev               # Start with nodemon hot reload (port 8080)
npm run build             # TypeScript compilation → dist/
npm test                  # Run Jest tests
npm test -- --testNamePattern="test name"  # Run single test
```

### Frontend
```bash
cd frontend
npm start                 # React dev server (port 3000)
npm run build             # Production build
npm test                  # React-scripts test runner
```

### Root-level shortcuts
```bash
npm run dev:backend       # Same as cd backend && npm run dev
npm run dev:frontend      # Same as cd frontend && npm start
npm run build             # Build both backend and frontend
npm run test:backend      # Run backend tests
```

## Architecture

### Multi-Tenancy Model
Every database table has `tenant_id` and `is_live` (boolean for test vs live environments). All queries must filter by both. This is the most critical invariant — missing either filter causes data leakage across tenants or environments.

### Backend Structure (`backend/src/`)
- **`server.ts`** — Main Express app, 1100+ lines, all routes registered here
- **`services/`** — All business logic lives here (40+ service files). Controllers are thin — they delegate immediately to services.
- **`controllers/`** — Route handlers only; no business logic
- **`routes/`** — Express route definitions
- **`config/`** — DB pool and environment setup
- **`jobs/`** — Background job executors (registered with `jobScheduler.service.ts`)
- **`middleware/`** — Auth, error handling, logging

Key large services:
- `portfolioSnapshot.service.ts` — Snapshot generation with smart backfill; generates per-asset-type snapshots
- `navDownload.service.ts` — Downloads NAV data from AMFI/MFAPI.in
- `market.service.ts` / `marketDownload.service.ts` — Market index data (Yahoo Finance)
- `import.service.ts` — Transaction file import pipeline
- `jobScheduler.service.ts` — Universal background job scheduler with history/retry

### Database
- **No ORM** — direct `pg` library with connection pooling
- **37 numbered migrations** in `backend/db/migrations/` (001–037)
- When adding features, create a new numbered migration file
- Distribution scripts for fresh installs: `backend/db/ditribution scripts/`
- Key tables: `t_scheme_details`, `t_transaction_table`, `t_customer_asset_assignments`, `t_portfolio_snapshots`, `t_customer_snapshots`, `t_jtbd_configurations`, `t_market_indices`, `t_market_data`
- Asset types in `m_asset_types` (global, no tenant_id) — 42 scheme categories plus non-MF types (GOLD, FD, PPF, etc.)

### Frontend Structure (`frontend/src/`)
- **`pages/`** — Full page views (Dashboard, Customers, Goals, Market, NAV, Portfolio, Admin)
- **`components/`** — 26+ subdirectories of reusable components
- **`services/`** — API call wrappers
- **`utils/formatters.ts`** — Date/currency formatting (dates always DD-MM-YYYY format)
- Data fetching via `@tanstack/react-query` v5 + axios

### External Integrations
- **AMFI** — Daily NAV data download
- **MFAPI.in** — Historical NAV backfill (scheme-by-scheme, last 90 days)
- **Yahoo Finance** — Market index OHLC data (`yahooFinance.service.ts`)
- **n8n** — Workflow automation (runs on port 5678, uses `n8n.*` schema in PostgreSQL)

### Background Jobs
The `jobScheduler.service.ts` manages all background jobs. Jobs register themselves and run on timers with retry logic and execution history stored in `t_job_executions`. Currently: Portfolio Snapshots via scheduler; NAV and Market downloads still run as separate services.

### Asset Type System
`t_scheme_details.asset_type_id` links to `m_asset_types`. `t_transaction_table.asset_type_code` is backfilled from the scheme's asset type at import time. Snapshots are generated per asset type. Old `'MF'` asset type (id=1) is deprecated — 'Growth' is the default fallback.

## Astro / Panchangam Integration

Panchangam data is stored in the `kaala_dristi_db` database, table `km_daily_panchang`. Key fields: `tithi_name`, `tithi_end_ist`, `tithi_next_name`, `nakshatra_name`, `nakshatra_end_ist`, `nakshatra_next_name`. All times are IST strings (`HH:MM` or `HH:MM:SS`).

**Critical display logic** (in `frontend/src/components/domain/PanchangamCard.tsx`):
- Compare current IST time against `*_end_ist`
- Before end time → show `name · ends HH:MM` (current element still active)
- After end time → show `next_name · since HH:MM` (element ended, next is active since that time)
- Nakshatra can transition mid-day — always re-evaluate against real IST clock

Astro pipeline runs on port **8101**. Backend API endpoint: `GET /api/panchang/daily?date=YYYY-MM-DD`.

## Development Branch

Active development branch: `claude/fix-astro-panchangam-issue-p5K5z`

Always push to this branch:
```bash
git push -u origin claude/fix-astro-panchangam-issue-p5K5z
```
