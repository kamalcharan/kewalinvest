# Scheme-Based Asset Types Release

**Version:** 1.0
**Date:** 2026-01-16
**Status:** Ready for Deployment

## Overview

This release replaces the single `MF` (Mutual Fund) asset type with three scheme-based types derived from the Scheme Data import file (Column E - Scheme Type):

| Old | New |
|-----|-----|
| MF | Open Ended |
|    | Close Ended |
|    | Interval Fund |

## Why This Change?

1. **Better categorization**: Different scheme types have different characteristics (liquidity, lock-in, etc.)
2. **Accurate reporting**: Portfolio views now show actual scheme type breakdown
3. **Future-proof**: Enables scheme-type-specific features and analytics

## Changes Summary

### Database Changes

| Table | Change |
|-------|--------|
| `t_transaction_table` | Added `asset_type_code` column (VARCHAR 50) |
| `t_monthly_portfolio_snapshots` | Changed default from 'MF' to NOT NULL |
| `t_scheme_masters` | Added 3 scheme_type records |
| `m_asset_types` | Added 3 scheme-based types, deactivated 'MF' |

### Backend Changes

| File | Change |
|------|--------|
| `04_functions_views_policies.sql` | Auto-tag asset_type_code during import |
| `portfolio.service.ts` | Aggregate across scheme types |
| `portfolioSnapshot.service.ts` | Generate per-scheme-type snapshots |
| `networth.service.ts` | Updated queries for scheme types |
| `alias.service.ts` | Family view aggregates as "Mutual Funds" |

### Frontend Changes

| File | Change |
|------|--------|
| `assetTypes.ts` | Colors, icons, names for 3 types |
| `assetType.types.ts` | Updated enum values |
| `PortfolioSnapshotsTable.tsx` | Sorting logic for scheme types |
| `CustomerViewPage.tsx` | Updated fallback chart |
| `InvestmentPlanForm.tsx` | Scheme type checks |
| `GoalInvestmentAllocator.tsx` | Type-specific icons |

## Migration

### For New Database (Clean Setup)

Run the distribution scripts in order:
```bash
psql -d kewalinvest -f "backend/db/ditribution scripts/01_init.sql"
psql -d kewalinvest -f "backend/db/ditribution scripts/02_tables.sql"
psql -d kewalinvest -f "backend/db/ditribution scripts/03_indexes_triggers.sql"
psql -d kewalinvest -f "backend/db/ditribution scripts/04_functions_views_policies.sql"
psql -d kewalinvest -f "backend/db/ditribution scripts/05_seed_data.sql"
```

### For Existing Database

Run the migration script:
```bash
psql -d kewalinvest -f "docs/releases/scheme-based-asset-types-migration.sql"
```

Then update the functions:
```bash
psql -d kewalinvest -f "backend/db/ditribution scripts/04_functions_views_policies.sql"
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCHEME DATA IMPORT                           │
│  Excel Column E: "Open Ended" / "Close Ended" / "Interval Fund" │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   t_scheme_details                              │
│  scheme_type_id → t_scheme_masters (scheme_type)               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              TRANSACTION IMPORT                                 │
│  process_transaction_import_session()                          │
│  Lookup: scheme_type_id → name → asset_type_code               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                t_transaction_table                              │
│  asset_type_code: 'Open Ended' / 'Close Ended' / 'Interval Fund'│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│            t_monthly_portfolio_snapshots                        │
│  Separate snapshots per scheme type per customer               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND                                     │
│  Portfolio views show all 3 scheme types with unique colors    │
└─────────────────────────────────────────────────────────────────┘
```

## Verification Queries

After migration, run these to verify:

```sql
-- Check scheme types exist
SELECT * FROM t_scheme_masters WHERE master_type = 'scheme_type';

-- Check asset types
SELECT * FROM m_asset_types WHERE asset_type_code IN ('Open Ended', 'Close Ended', 'Interval Fund', 'MF');

-- Check transaction distribution
SELECT asset_type_code, COUNT(*)
FROM t_transaction_table
GROUP BY asset_type_code;

-- Check snapshot distribution
SELECT asset_type_code, COUNT(*)
FROM t_monthly_portfolio_snapshots
GROUP BY asset_type_code;

-- Verify no MF references remain
SELECT COUNT(*) FROM t_transaction_table WHERE asset_type_code = 'MF';
SELECT COUNT(*) FROM t_monthly_portfolio_snapshots WHERE asset_type_code = 'MF';
```

## Rollback

If issues occur, see the rollback section at the bottom of:
`docs/releases/scheme-based-asset-types-migration.sql`

## Git Commits

| Commit | Phase | Description |
|--------|-------|-------------|
| `e69a94e` | 1 | Database schema & seed data |
| `b83a6e4` | 2 | Auto-tag asset_type_code during import |
| `529368d` | 3 | Backend services updates |
| `10c68d7` | 4 | Frontend updates |

## Testing Checklist

- [ ] Run migration on test database
- [ ] Import new scheme data file
- [ ] Import transactions for a customer
- [ ] Verify asset_type_code is auto-tagged
- [ ] Check portfolio snapshots generation
- [ ] Verify frontend shows 3 scheme types
- [ ] Check networth history charts
- [ ] Verify family view aggregation
