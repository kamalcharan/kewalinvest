# Critical Schema Issues Found and Fixed

## Issues Discovered

### 1. ❌ PAN Column Location (FIXED)
**Error:** Migration and service assumed PAN is in `t_contacts`
**Reality:** PAN is in `t_customers`

**Files Affected:**
- `backend/db/migrations/006_add_name_normalization_and_restart.sql`
  - Line 86-87: Created index on `t_contacts(normalized_name, pan, ...)` ❌
  - Line 328: Rollback tried to drop this index ❌

- `backend/src/services/customerLookup.service.ts`
  - Line 134: Selected `ct.pan` from t_contacts alias ❌

**Fix Applied:**
- ✅ Removed incorrect composite index from migration
- ✅ Changed `ct.pan` to `c.pan` in customerLookup service
- ✅ Updated rollback script

---

### 2. ✅ Transaction Table Name (FIXED)
**Error:** Code uses `t_transactions`
**Reality:** Table is named `t_transaction_table`

**Files Affected:**
- `backend/src/services/stagingProcessor.service.ts`
  - Line 416: `FROM t_transactions` ✅ Fixed to `t_transaction_table`
  - Line 480: `INSERT INTO t_transactions` ✅ Fixed to `t_transaction_table`

**Fix Applied:**
- ✅ Changed all references from `t_transactions` to `t_transaction_table`

---

### 3. ✅ Transaction Column Names (FIXED)
**Error:** Code uses generic column names
**Reality:** Table uses abbreviated names

**Mapping Applied:**
| Code Used | Actual Column | Status |
|-----------|--------------|---------|
| `transaction_date` | `txn_date` | ✅ Fixed |
| `transaction_type` | `txn_type_id` | ✅ Fixed (handles both old/new) |
| `transaction_amount` | `total_amount` | ✅ Fixed (handles both old/new) |
| `folio_number` | `folio_no` | ✅ Fixed (handles both old/new) |
| `remarks` | `txn_description` | ✅ Fixed (handles both old/new) |

**Fix Applied:**
- ✅ Updated parameter interfaces with correct column names
- ✅ Updated WHERE clause in duplicate check
- ✅ Updated INSERT statement with correct column names
- ✅ Added backward compatibility to accept both old and new field names from mapped_data

---

### 4. ✅ Missing Required Columns (FIXED)
**Error:** Insert doesn't include all required fields
**Reality:** Need scheme_code, scheme_name, staging_record_id, import_session_id

**Fix Applied:**
- ✅ Added `scheme_code` - Retrieved from scheme lookup result
- ✅ Added `scheme_name` - Retrieved from scheme lookup result
- ✅ Added `staging_record_id` - Passed from record.id
- ✅ Added `import_session_id` - Passed from params.sessionId
- ✅ Added `folio_no` - Mapped correctly
- ✅ Added `txn_description` - Mapped correctly
- ✅ Added `txn_source` - Set to 'import'
- ✅ Added `stamp_duty`, `stt`, `tds` - Optional fields from mapped_data

---

### 5. ✅ Transaction Type Mapping (FIXED)
**Error:** Code treats transaction_type as string
**Reality:** `txn_type_id` is INTEGER foreign key to `m_transaction_types` table

**Fix Applied:**
- ✅ Added conversion logic: `parseInt(data.txn_type_id, 10)`
- ✅ Accepts NULL if not provided
- ✅ Handles both string and integer input

---

## Actual Schema Reference

```sql
-- t_contacts (has the name)
CREATE TABLE t_contacts (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    is_live BOOLEAN,
    is_active BOOLEAN,
    is_customer BOOLEAN,
    prefix VARCHAR(10),
    name VARCHAR(255),  -- ✅ Name is here
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_by INTEGER
);

-- t_customers (has PAN and IWELL code)
CREATE TABLE t_customers (
    id SERIAL PRIMARY KEY,
    contact_id INTEGER REFERENCES t_contacts(id),
    tenant_id INTEGER,
    is_live BOOLEAN,
    is_active BOOLEAN,
    pan VARCHAR(10),  -- ✅ PAN is here
    iwell_code VARCHAR(100),  -- ✅ IWELL code is here
    ...
);

-- t_transaction_table (actual table name!)
CREATE TABLE t_transaction_table (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES t_customers(id),
    scheme_code VARCHAR(50),
    scheme_name VARCHAR(255),
    folio_no VARCHAR(100),  -- ✅ Not folio_number
    txn_type_id INTEGER,  -- ✅ Not transaction_type
    txn_date DATE,  -- ✅ Not transaction_date
    total_amount NUMERIC(15,2),  -- ✅ Not transaction_amount
    units NUMERIC(15,4),
    nav NUMERIC(10,4),
    stamp_duty NUMERIC(10,2),
    stt NUMERIC(15,2),
    tds NUMERIC(15,2),
    is_potential_duplicate BOOLEAN,
    portfolio_flag BOOLEAN,
    staging_record_id INTEGER,  -- ✅ Missing from insert
    import_session_id INTEGER,  -- ✅ Missing from insert
    duplicate_reason TEXT,
    tenant_id INTEGER,
    is_live BOOLEAN,
    is_active BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    scheme_id INTEGER REFERENCES t_scheme_details(id),
    txn_description TEXT,  -- ✅ Not remarks
    txn_source VARCHAR(100)
);
```

---

## All Fixes Applied ✅

1. ✅ Migration: Removed PAN index on t_contacts
2. ✅ CustomerLookup: Changed ct.pan to c.pan
3. ✅ Migration: Updated rollback script
4. ✅ StagingProcessor: Changed table name to t_transaction_table
5. ✅ StagingProcessor: Updated all column names with backward compatibility
6. ✅ StagingProcessor: Added missing required columns (scheme_code, scheme_name, staging_record_id, import_session_id, txn_source)
7. ✅ StagingProcessor: Added txn_type_id integer conversion logic

---

## Schema Compliance Status

**All schema discrepancies have been resolved!**

The code now correctly references:
- ✅ `t_transaction_table` (not t_transactions)
- ✅ `txn_date` (not transaction_date)
- ✅ `txn_type_id` as INTEGER (not transaction_type as string)
- ✅ `total_amount` (not transaction_amount)
- ✅ `folio_no` (not folio_number)
- ✅ `txn_description` (not remarks)
- ✅ All required columns included in INSERT
- ✅ PAN correctly referenced from t_customers (c.pan, not ct.pan)

---

## Next Steps

1. ✅ All schema fixes completed
2. ⏳ Run database migration
3. ⏳ Test Phase 2 processing with actual data
4. ⏳ Verify customer name-based lookup works correctly
5. ⏳ Test restart/reprocess functionality
