# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Root-level (run from `/home/user/kewalinvest`)
```bash
npm run install:all       # Install all dependencies (root + backend + frontend)
npm run dev:backend       # Start backend dev server (nodemon + ts-node, port 8080)
npm run dev:frontend      # Start frontend dev server (react-scripts, port 3000)
npm run build             # Build both backend and frontend
npm run test:backend      # Run backend Jest tests
npm run test:frontend     # Run frontend React tests
```

### Backend (run from `backend/`)
```bash
npm run dev               # Nodemon watching src/ for .ts/.json changes
npm run build             # tsc → dist/
npm run start             # node dist/server.js
npm test                  # Jest with ts-jest
npx jest path/to/test     # Run a single test file
```

### Frontend (run from `frontend/`)
```bash
npm start                 # react-scripts start (port 3000)
npm test                  # react-scripts test
npm run build             # Production build
```

### Docker (full stack)
```bash
docker-compose up         # Starts postgres, redis, n8n, backend, frontend, pgadmin
```
pgAdmin available at port 5050.

## Architecture

**KewalInvest** is a financial advisory platform: customer portfolio management, NAV tracking, goal planning, and market analysis.

### Stack
- **Backend**: Node.js + Express + TypeScript, PostgreSQL 16 (pg pool, min=2/max=20), Redis (ioredis), JWT auth
- **Frontend**: React 18 + TypeScript, TanStack React Query v5 (server state), React Router v7, Recharts, react-toastify
- **Infrastructure**: Docker Compose multi-container; n8n for workflow automation (runs in its own schema inside the same DB)

### Backend Structure (`backend/src/`)
Follows a **Route → Controller → Service** pattern:
- `routes/` — 30+ route files, each maps to a domain (auth, customer, scheme, nav, portfolio, goals, jtbd, market, transactions, etc.)
- `controllers/` — Request/response handlers; thin layer that delegates to services
- `services/` — Business logic: goal calculations, JTBD execution, market metrics, portfolio snapshots, NAV downloads
- `types/` — Comprehensive TypeScript interfaces for all domain entities
- `middleware/` — Rate limiting (15 min window / 10k req), CORS, JWT validation, error handling
- `jobs/` — Node-cron scheduler for NAV downloads, goal recalculations, market metrics
- `db/` — Raw `pg` queries; connection pooling with configurable statement timeouts for long-running operations

Key domain concepts:
- **JTBD (Jobs To Be Done)**: Unified configs + executions model; configurable financial jobs with tracked outcomes
- **Goals**: Three modes — time-based, price-based, time+price hybrid; recalculated via scheduler
- **Course Correction**: ETL/data-ops pipeline for CSV/Excel imports (schemes, transactions, NAV)
- **Multi-tenancy**: Tenant context set per request for Row-Level Security (RLS) in PostgreSQL

### Frontend Structure (`frontend/src/`)
- `pages/` — Full-page views (Dashboard, Customers, NAV Search, Goals, JTBD, Market, Import, etc.)
- `components/` — Shared/feature components
- `contexts/` — React Context for Auth and Theme
- `hooks/` — Custom hooks (React Query data-fetching hooks live here)
- `services/` — Axios-based HTTP client with centralized API integration
- `utils/` — Shared utilities

State: React Context for auth/theme; React Query for all server state (caching, background refetch).

### Auth Flow
JWT access token + refresh token. Passwords hashed with bcrypt. Backend middleware validates tokens on protected routes; frontend stores tokens and attaches them via axios interceptors.

### Environment Config
Both backend and frontend are configured via `.env` files. Backend reads DB connection string, Redis URL, JWT secrets, and port from env. Frontend uses `REACT_APP_*` prefixed vars for the API base URL.
