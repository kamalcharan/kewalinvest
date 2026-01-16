# Scheme Category-Based Asset Types Release

**Version:** 2.0
**Date:** 2026-01-16
**Status:** Ready for Deployment

## Overview

This release replaces the single `MF` (Mutual Fund) asset type with 42 scheme categories derived from the Scheme Data import file (Column E - Scheme Category):

| Category | Count | Examples |
|----------|-------|----------|
| Debt Scheme | 16 | Liquid Fund, Gilt Fund, Corporate Bond, etc. |
| Equity Scheme | 12 | Large Cap, Mid Cap, Small Cap, ELSS, etc. |
| Hybrid Scheme | 7 | Aggressive, Balanced, Arbitrage, etc. |
| Other Scheme | 5 | Index Funds, Gold ETF, FoF, etc. |
| Solution Oriented | 2 | Children's Fund, Retirement Fund |

## Why This Change?

1. **Granular categorization**: Each scheme category has different risk/return profiles
2. **Accurate reporting**: Portfolio views now show actual scheme category breakdown
3. **Better analytics**: Enables category-specific performance tracking
4. **Future-proof**: Supports scheme-category-specific features

## Changes Summary

### Database Changes

| Table | Change |
|-------|--------|
| `t_transaction_table` | Added `asset_type_code` column (VARCHAR 100) |
| `t_monthly_portfolio_snapshots` | Changed default from 'MF' to NOT NULL |
| `t_scheme_masters` | Added 42 scheme_category records |
| `m_asset_types` | Added 42 scheme category types, deactivated 'MF' |

### Backend Changes

| File | Change |
|------|--------|
| `04_functions_views_policies.sql` | Auto-tag asset_type_code using scheme_category_id |
| `portfolio.service.ts` | Aggregate across scheme categories |
| `portfolioSnapshot.service.ts` | Dynamic customer scheme categories lookup |
| `networth.service.ts` | Updated queries for scheme categories |
| `alias.service.ts` | Family view aggregates as "Mutual Funds" |

### Frontend Changes

| File | Change |
|------|--------|
| `assetTypes.ts` | Colors, icons, names for 42 categories with fallbacks |
| `assetType.types.ts` | Updated type definitions |
| `PortfolioSnapshotsTable.tsx` | Sorting logic using isSchemeAssetType() |
| `CustomerViewPage.tsx` | Updated fallback chart |
| `InvestmentPlanForm.tsx` | Scheme category checks |
| `dataTransformers.ts` | MoM calculation fix (Modified Dietz) |

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
│  Excel Column E: "Equity Scheme - Large Cap Fund", etc.         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   t_scheme_details                              │
│  scheme_category_id → t_scheme_masters (scheme_category)        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              TRANSACTION IMPORT                                 │
│  process_transaction_import_session()                           │
│  Lookup: scheme_category_id → name → asset_type_code            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                t_transaction_table                              │
│  asset_type_code: 'Equity Scheme - Large Cap Fund', etc.        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│            t_monthly_portfolio_snapshots                        │
│  Separate snapshots per scheme category per customer            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND                                     │
│  Portfolio views show all scheme categories with unique colors  │
│  - Equity: Shades of green                                      │
│  - Debt: Shades of blue                                         │
│  - Hybrid: Shades of purple                                     │
│  - Other: Shades of amber/orange                                │
│  - Solution: Shades of pink                                     │
└─────────────────────────────────────────────────────────────────┘
```

## Scheme Categories Reference

### Debt Scheme (16 categories)
- Banking and PSU Fund
- Corporate Bond Fund
- Credit Risk Fund
- Dynamic Bond
- Floater Fund
- Gilt Fund
- Gilt Fund with 10 year constant duration
- Liquid Fund
- Long Duration Fund
- Low Duration Fund
- Medium Duration Fund
- Medium to Long Duration Fund
- Money Market Fund
- Overnight Fund
- Short Duration Fund
- Ultra Short Duration Fund

### Equity Scheme (12 categories)
- Contra Fund
- Dividend Yield Fund
- ELSS
- Flexi Cap Fund
- Focused Fund
- Large & Mid Cap Fund
- Large Cap Fund
- Mid Cap Fund
- Multi Cap Fund
- Sectoral/Thematic
- Small Cap Fund
- Value Fund

### Hybrid Scheme (7 categories)
- Aggressive Hybrid Fund
- Arbitrage Fund
- Balanced Hybrid Fund
- Conservative Hybrid Fund
- Dynamic Asset Allocation or Balanced Advantage
- Equity Savings
- Multi Asset Allocation

### Other Scheme (5 categories)
- FoF Domestic
- FoF Overseas
- Gold ETF
- Index Funds
- Other ETFs

### Solution Oriented Scheme (2 categories)
- Children's Fund
- Retirement Fund

## Verification Queries

After migration, run these to verify:

```sql
-- Check scheme categories exist
SELECT * FROM t_scheme_masters WHERE master_type = 'scheme_category';

-- Check asset types
SELECT asset_type_code, category, is_active
FROM m_asset_types
WHERE asset_type_code LIKE '%Scheme%'
ORDER BY display_order;

-- Check transaction distribution
SELECT asset_type_code, COUNT(*)
FROM t_transaction_table
GROUP BY asset_type_code
ORDER BY COUNT(*) DESC;

-- Check snapshot distribution
SELECT asset_type_code, COUNT(*)
FROM t_monthly_portfolio_snapshots
GROUP BY asset_type_code
ORDER BY COUNT(*) DESC;

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
| `7810aed` | Fix | Variable name mismatch fix |
| `1d3cfd6` | Major | Change from Scheme Type to Scheme Category (42 categories) |
| `bc0acca` | Fix | MoM returns calculation (Modified Dietz method) |

## Testing Checklist

- [ ] Run migration on test database
- [ ] Import new scheme data file
- [ ] Import transactions for a customer
- [ ] Verify asset_type_code is auto-tagged with scheme category
- [ ] Check portfolio snapshots generation
- [ ] Verify frontend shows all scheme categories
- [ ] Check networth history charts show category breakdown
- [ ] Verify family view aggregation
- [ ] Test MoM returns calculation accuracy
