# Tenant Seeding Strategy

## Overview

As of 2025-01-23, the application now automatically seeds master data for new tenants during the signup process. This document explains how tenant seeding works and when to use different approaches.

## Automatic Seeding on Signup

### How It Works

When a new tenant registers via the `/api/auth/register` endpoint:

1. **Transaction begins**
2. **Tenant created** in `t_tenants` table
3. **User created** in `t_users` table
4. **Master data seeded automatically** by calling `seedTenantData()`
5. **Transaction committed**

If any step fails, the entire transaction rolls back - ensuring data consistency.

### What Gets Seeded

For each new tenant, the following data is seeded for **BOTH** environments (live and test):

#### Transaction Types (17 types)
- PURCHASE
- REDEMPTION
- SWITCH_IN
- SWITCH_OUT
- DIVIDEND_PAYOUT
- DIVIDEND_REINVEST
- SIP
- SWP
- STP_IN
- STP_OUT
- BONUS
- MERGER_IN
- MERGER_OUT
- SEGREGATION
- STAMP_DUTY
- STT_TAX
- OTHER

#### Bookmark Reasons (8 reasons)
- VIP (VIP Customer)
- FOLLOW_UP (Follow-up Required)
- IMPORTANT (Important)
- HIGH_VALUE (High Value Client)
- ATTENTION (Requires Attention)
- PORTFOLIO_REVIEW (Portfolio Review Due)
- TAX_PLANNING (Tax Planning)
- OTHER (Other - Custom)

### Implementation Details

**Service:** `backend/src/services/tenantSeed.service.ts`
- Function: `seedTenantData(tenantId: number, client: PoolClient)`
- Uses ON CONFLICT for idempotency (safe to run multiple times)
- All inserts are part of the registration transaction

**Integration Point:** `backend/src/routes/auth.routes.ts`
- Called in the `/register` endpoint after user creation
- Executes within the same database transaction
- Logs: `🌱 REGISTER: Seeding master data for new tenant...`

## Manual Seeding (Legacy Approach)

### When to Use 05_seed_data.sql

The `backend/db/05_seed_data.sql` script is now primarily used for:

1. **Initial Database Setup**
   - Fresh deployment to a new environment
   - Seeds pre-configured tenants (Kewal, Staging, QA)

2. **Backfilling Existing Tenants**
   - Tenants created before auto-seeding was implemented
   - Missing master data that needs to be added

3. **Development/Testing**
   - Setting up multiple test tenants at once
   - Recreating environments from scratch

### Deployment Process

**For new client deployment:**
```bash
# Run all database scripts in order
psql -d dbname -f 01_init.sql
psql -d dbname -f 02_tables.sql
psql -d dbname -f 03_indexes_triggers.sql
psql -d dbname -f 04_functions_views_policies.sql
psql -d dbname -f 05_seed_data.sql  # Seeds pre-configured tenants ONCE

# After this, all new tenant signups will automatically seed their data
```

## Modifying Seed Data

### Adding New Transaction Types or Bookmark Reasons

To add new master data types that should be seeded for all tenants:

1. **Update the service:** `backend/src/services/tenantSeed.service.ts`
   - Add the new type to the appropriate array (`transactionTypes` or `bookmarkReasons`)
   - Maintain the same structure (code, label, display_order, etc.)

2. **Update the SQL script:** `backend/db/05_seed_data.sql`
   - Add the new type to existing tenant sections
   - Ensures consistency for tenants seeded via script

3. **Backfill existing tenants (if needed):**
   ```sql
   -- Run this for each existing tenant and environment
   INSERT INTO m_transaction_types (tenant_id, is_live, transaction_code, ...)
   VALUES (1, TRUE, 'NEW_TYPE', ...)
   ON CONFLICT (tenant_id, is_live, transaction_code) DO NOTHING;
   ```

### Example: Adding a New Transaction Type

```typescript
// In tenantSeed.service.ts
const transactionTypes = [
  // ... existing types ...
  {
    code: 'NFO',
    label: 'New Fund Offer',
    txn_type: 'BUY',
    display_order: 18
  }
];
```

## Testing

### Testing New Tenant Signup

1. **Start the backend server:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Register a new tenant:**
   ```bash
   curl -X POST http://localhost:3001/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "password123",
       "business_name": "Test Business"
     }'
   ```

3. **Check the logs for:**
   ```
   🌱 REGISTER: Seeding master data for new tenant...
   🌱 SEED: Starting seed data for tenant X...
   🌱 SEED: Seeding LIVE environment for tenant X...
     ✅ Seeded 17 transaction types (is_live=true)
     ✅ Seeded 8 bookmark reasons (is_live=true)
   🌱 SEED: Seeding TEST environment for tenant X...
     ✅ Seeded 17 transaction types (is_live=false)
     ✅ Seeded 8 bookmark reasons (is_live=false)
   ✅ SEED: Completed seed data for tenant X
   ✅ REGISTER: Tenant data seeded successfully
   ```

4. **Verify in database:**
   ```sql
   -- Check transaction types
   SELECT COUNT(*) FROM m_transaction_types WHERE tenant_id = X;
   -- Should return 34 (17 × 2 environments)

   -- Check bookmark reasons
   SELECT COUNT(*) FROM m_bookmark_reasons WHERE tenant_id = X;
   -- Should return 16 (8 × 2 environments)
   ```

## Advantages

### Automatic Seeding Approach

✅ **No manual intervention** - Data seeded automatically on signup
✅ **Transactional integrity** - All-or-nothing within signup transaction
✅ **Consistency** - Every tenant gets the same master data
✅ **Scalability** - Works for any number of tenants
✅ **Maintainability** - Single source of truth in TypeScript service
✅ **Version control** - Changes tracked in code, not just SQL

### When Manual Seeding is Better

✅ **Bulk operations** - Seeding many tenants at once
✅ **Initial setup** - First deployment with pre-configured tenants
✅ **Backfilling** - Adding data to existing tenants

## Future Enhancements

Potential improvements to consider:

1. **Admin UI for Master Data**
   - Allow tenants to customize transaction types
   - Add/remove bookmark reasons via UI
   - Sync changes across environments

2. **Seed Data Versioning**
   - Track which seed version each tenant has
   - Apply migrations when seed data structure changes

3. **Tenant Templates**
   - Different seed data sets for different industries
   - Allow choosing a template during signup

4. **Audit Logging**
   - Log when seed data is created/modified
   - Track who made changes and when

## Files Reference

- **Service:** `backend/src/services/tenantSeed.service.ts`
- **Integration:** `backend/src/routes/auth.routes.ts` (lines 183-186)
- **Legacy Script:** `backend/db/05_seed_data.sql`
- **This Document:** `TENANT_SEEDING.md`
