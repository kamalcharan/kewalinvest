# Database Impact & Processing Flow

## Database Changes Made

### 1. New PostgreSQL Function

**Function:** `normalize_customer_name(TEXT)`
- **Purpose:** Normalizes customer names for exact matching
- **Location:** Migration `006_add_name_normalization_and_restart.sql`
- **Rules:**
  - Removes salutations (MR, MRS, MS, DR, SRI, SHRI, SMT, MISS, PROF)
  - Converts to UPPERCASE
  - Keeps middle initials and spaces
  - Removes special characters
  - Returns NULL for empty results

**Example:**
```sql
SELECT normalize_customer_name('Mr. John A. Smith');
-- Returns: 'JOHN A SMITH'

SELECT normalize_customer_name('Sri. Rajesh Kumar');
-- Returns: 'RAJESH KUMAR'

SELECT normalize_customer_name('Dr. Sarah O''Brien');
-- Returns: 'SARAH OBRIEN'
```

### 2. New Computed Column

**Table:** `t_contacts`
**Column:** `normalized_name TEXT GENERATED ALWAYS AS (normalize_customer_name(name)) STORED`

- **Type:** Computed/Generated column (automatically maintained)
- **Storage:** STORED (physically stored, not computed on-the-fly)
- **Purpose:** Fast customer lookups without runtime normalization
- **Index:** `idx_contacts_normalized_name` (WHERE is_active = true)

**Impact:**
- Every INSERT/UPDATE to `t_contacts.name` automatically updates `normalized_name`
- No triggers needed - PostgreSQL handles it automatically
- Index allows fast lookup: `WHERE normalized_name = normalize_customer_name($1)`

### 3. Schema Changes to `t_import_sessions`

**New Columns:**
```sql
restart_count INTEGER DEFAULT 0
last_restart_at TIMESTAMP WITH TIME ZONE
can_restart BOOLEAN DEFAULT true
last_processed_staging_id INTEGER
processing_checkpoint JSONB DEFAULT '{}'
customer_lookup_method VARCHAR(50) DEFAULT 'iwell_code'
  CHECK (customer_lookup_method IN ('iwell_code', 'customer_name', 'both'))
```

**Updated Constraint:**
```sql
-- Old statuses: 'pending', 'processing', 'completed', 'completed_with_errors', 'failed', 'cancelled'
-- New statuses added: 'staged', 'pending_processing'

CHECK (status IN (
  'pending',           -- Initial state
  'staged',            -- Phase 1 complete (file parsed to staging)
  'pending_processing',-- Ready for Phase 2 (can be restarted)
  'processing',        -- Phase 2 in progress
  'completed',         -- All records successful
  'completed_with_errors', -- Some records failed
  'failed',            -- Session failed
  'cancelled'          -- User cancelled
))
```

### 4. Schema Changes to `t_import_staging_data`

**New Columns:**
```sql
-- Match tracking
match_type VARCHAR(50)              -- 'exact_name', 'name_with_pan', 'ambiguous', etc.
match_confidence VARCHAR(20)        -- 'high', 'medium', 'low', 'ambiguous', 'not_found'
ambiguous_matches JSONB             -- [{id, name, pan}, ...] for user to choose
requires_review BOOLEAN DEFAULT false

-- Edit tracking
edit_history JSONB DEFAULT '[]'    -- [{edited_at, edited_by, field, old_value, new_value}, ...]
edited_at TIMESTAMP WITH TIME ZONE
edited_by INTEGER
reprocess_count INTEGER DEFAULT 0
last_reprocess_at TIMESTAMP WITH TIME ZONE
```

**Updated Constraint:**
```sql
-- Old: 'pending', 'processing', 'success', 'failed', 'skipped', 'duplicate', 'orphan'
-- New: Added 'pending_process'

CHECK (processing_status IN (
  'pending',          -- Not yet processed
  'pending_process',  -- Staged, waiting for Phase 2
  'processing',       -- Currently being processed
  'success',          -- Successfully imported
  'failed',           -- Processing failed
  'duplicate',        -- Duplicate transaction found
  'orphan',           -- Customer/scheme not found
  'skipped'           -- Skipped (validation failed)
))
```

**New Indexes:**
```sql
idx_staging_requires_review        -- Fast query for records needing review
idx_staging_processing_status_session  -- Fast query by status and session
idx_staging_edited                 -- Fast query for edited records
```

### 5. No Triggers Created

**Important:** This implementation does NOT use triggers. All logic is in application code (stagingProcessor.service.ts).

**Why no triggers?**
- Better testability
- Easier debugging
- More explicit control flow
- Better error handling
- No hidden side effects

---

## Processing Flow: Two-Phase Architecture

### Phase 1: File → Staging Table (Fast)
**Service:** `staging.service.ts`

```
User uploads file
       ↓
Parse CSV/Excel
       ↓
Validate basic data types
       ↓
Insert into t_import_staging_data
  - raw_data: Original row data (JSONB)
  - mapped_data: Field mappings applied (JSONB)
  - processing_status: 'pending_process'
       ↓
Session status: 'staged'
```

**Key Points:**
- NO customer/scheme lookups in Phase 1
- NO duplicate checking in Phase 1
- Just parse, validate types, and store
- Fast (completes in seconds)
- All records stored even if they will fail later

**Code Location:** `backend/src/services/staging.service.ts`

```typescript
// Phase 1: Just stage the data
values.push(
  params.tenantId,
  params.isLive,
  params.sessionId,
  params.importType,
  rowNumber,
  JSON.stringify(row),      // raw_data
  JSON.stringify(mappedData), // mapped_data
  validation.warnings,
  'pending_process'          // Status: ready for Phase 2
);
```

### Phase 2: Staging → Final Tables (Slow, Restartable)
**Service:** `stagingProcessor.service.ts`

```
Get records WHERE processing_status = 'pending_process'
       ↓
FOR EACH RECORD:
    ├─> Customer Lookup (by name or IWELL code)
    │     ├─> Exact match found? → Continue
    │     ├─> Multiple matches + no PAN? → ORPHAN
    │     ├─> Multiple matches + PAN? → Use PAN tiebreaker
    │     └─> No match? → ORPHAN
    │
    ├─> Scheme Lookup (via t_scheme_aliases)
    │     ├─> Exact alias match? → Continue
    │     └─> No match? → Warning (optional field)
    │
    ├─> Duplicate Check (same customer + date + amount)
    │     ├─> Already exists? → DUPLICATE
    │     └─> Unique? → Continue
    │
    └─> Insert into t_transaction_table
          ├─> Success? → processing_status = 'success'
          └─> Error? → processing_status = 'failed'

    Update t_import_staging_data with result
    Save checkpoint every 100 records
       ↓
Session status: 'completed' or 'completed_with_errors'
```

**Key Points:**
- Processes records in batches (default: 100)
- Saves checkpoint after each batch
- Can be restarted from last checkpoint
- 20-minute timeout (configurable)
- Each record independently processed

---

## stagingProcessor.service.ts - Core Logic

### Main Function: `processSession()`

```typescript
async processSession(sessionId: number, restartFromId?: number): Promise<{
  success: boolean;
  processed: number;
  successful: number;
  failed: number;
  duplicates: number;
  orphans: number;
  timedOut: boolean;
}> {
  const startTime = Date.now();
  const timeout = 20 * 60 * 1000; // 20 minutes

  let lastProcessedId = restartFromId || 0;
  let stats = { processed: 0, successful: 0, failed: 0, ... };

  while (true) {
    // Check timeout
    if (Date.now() - startTime > timeout) {
      await this.saveCheckpoint(sessionId, lastProcessedId, stats);
      return { ...stats, timedOut: true };
    }

    // Get next batch of records
    const batch = await this.getNextBatch(sessionId, lastProcessedId, 100);
    if (batch.length === 0) break; // All done

    // Process each record in batch
    for (const record of batch) {
      const result = await this.processRecord(record, params);
      await this.updateStagingRecord(record.id, result);

      lastProcessedId = record.id;
      stats.processed++;
      if (result.status === 'success') stats.successful++;
      if (result.status === 'failed') stats.failed++;
      // ... update other stats
    }

    // Save checkpoint after each batch
    await this.saveCheckpoint(sessionId, lastProcessedId, stats);
  }

  return { ...stats, timedOut: false };
}
```

### processRecord() - Single Record Processing

```typescript
async processRecord(record: StagingRecord, params: SessionParams): Promise<{
  status: string;
  error_messages?: string[];
  warnings?: string[];
  match_type?: string;
  ambiguous_matches?: any[];
}> {
  const data = record.mapped_data;
  const warnings: string[] = [];

  // Step 1: Customer Lookup
  let customerResult;

  if (params.customerLookupMethod === 'customer_name') {
    // Use name-based lookup with PAN tiebreaker
    customerResult = await this.customerLookup.findCustomerByNameWithPAN(
      data.customer_name,
      data.pan,
      params.tenantId,
      params.isLive
    );
  } else {
    // Use IWELL code lookup (traditional)
    customerResult = await this.customerLookup.findCustomerByIwellCode(
      data.iwell_code,
      params.tenantId,
      params.isLive
    );
  }

  if (!customerResult.customerId) {
    return {
      status: 'orphan',
      error_messages: ['Customer not found'],
      match_type: customerResult.matchType,
      ambiguous_matches: customerResult.ambiguousMatches
    };
  }

  // Step 2: Scheme Lookup (via aliases)
  let schemeId = null;
  if (data.scheme_name) {
    const schemeResult = await this.schemeAlias.lookupSchemeByAlias(
      data.scheme_name
    );
    if (schemeResult.success) {
      schemeId = schemeResult.data.scheme_id;
    } else {
      warnings.push(`Scheme not found: ${data.scheme_name}`);
    }
  }

  // Step 3: Duplicate Check
  const duplicateCheck = await this.checkTransactionDuplicate({
    customer_id: customerResult.customerId,
    scheme_id: schemeId,
    txn_date: data.txn_date,
    total_amount: data.total_amount,
    txn_type_id: data.txn_type_id,
    tenant_id: params.tenantId,
    is_live: params.isLive
  });

  if (duplicateCheck.isDuplicate) {
    return {
      status: 'duplicate',
      error_messages: [`Duplicate found (ID: ${duplicateCheck.existingId})`],
      match_type: customerResult.matchType,
      warnings
    };
  }

  // Step 4: Insert Transaction
  try {
    const transactionId = await this.insertTransaction({
      customer_id: customerResult.customerId,
      scheme_id: schemeId,
      txn_date: data.txn_date,
      txn_type_id: data.txn_type_id,
      total_amount: data.total_amount,
      units: data.units,
      nav: data.nav,
      folio_no: data.folio_no,
      txn_description: data.txn_description,
      staging_record_id: record.id,
      import_session_id: params.sessionId,
      tenant_id: params.tenantId,
      is_live: params.isLive
    });

    return {
      status: 'success',
      match_type: customerResult.matchType,
      warnings
    };
  } catch (error) {
    return {
      status: 'failed',
      error_messages: [error.message],
      match_type: customerResult.matchType,
      warnings
    };
  }
}
```

---

## Customer Lookup Logic (customerLookup.service.ts)

### Name-Based Lookup with PAN Tiebreaker

```typescript
async findCustomerByNameWithPAN(
  customerName: string,
  pan: string | null,
  tenantId: number,
  isLive: boolean
): Promise<{
  customerId: number | null;
  matchType: 'exact_name' | 'name_with_pan' | 'ambiguous' | 'not_found';
  matchCount: number;
  ambiguousMatches?: Array<{id, name, pan}>;
}> {
  // Query using normalized name
  const query = `
    SELECT c.id, ct.name, c.pan
    FROM t_customers c
    INNER JOIN t_contacts ct ON ct.id = c.contact_id
    WHERE c.tenant_id = $1
      AND c.is_live = $2
      AND c.is_active = true
      AND ct.is_active = true
      AND ct.normalized_name = normalize_customer_name($3)  -- EXACT MATCH ONLY
  `;

  const result = await this.db.query(query, [tenantId, isLive, customerName]);

  if (result.rows.length === 0) {
    return {
      customerId: null,
      matchType: 'not_found',
      matchCount: 0
    };
  }

  if (result.rows.length === 1) {
    return {
      customerId: result.rows[0].id,
      matchType: 'exact_name',
      matchCount: 1
    };
  }

  // Multiple matches found - use PAN tiebreaker
  if (pan) {
    const panMatch = result.rows.find(row => row.pan === pan);
    if (panMatch) {
      return {
        customerId: panMatch.id,
        matchType: 'name_with_pan',
        matchCount: result.rows.length
      };
    }
  }

  // Ambiguous - no PAN or PAN didn't match
  return {
    customerId: null,
    matchType: 'ambiguous',
    matchCount: result.rows.length,
    ambiguousMatches: result.rows.map(r => ({
      id: r.id,
      name: r.name,
      pan: r.pan
    }))
  };
}
```

---

## Edit & Reprocess Flow

### When User Clicks "Edit & Reprocess"

```
User clicks Edit icon on failed/orphan/duplicate record
       ↓
RecordEditModal opens
       ↓
User edits fields (customer_name, pan, scheme_name, etc.)
       ↓
User clicks "Save & Reprocess"
       ↓
POST /api/import/staging/:stagingId/edit
  - Updates mapped_data with new values
  - Adds entry to edit_history array
  - Sets processing_status back to 'pending_process'
       ↓
POST /api/import/staging/:stagingId/reprocess
  - Calls stagingProcessor.processRecord() for this one record
  - Updates processing_status based on result
       ↓
Frontend refreshes results
       ↓
Record shows new status (success/failed/orphan/duplicate)
```

**Code Location:** `backend/src/services/import.service.ts`

```typescript
async editStagingRecord(
  stagingId: number,
  editedData: Record<string, any>,
  editedBy: number
): Promise<void> {
  // Get current record
  const record = await this.db.query(
    'SELECT * FROM t_import_staging_data WHERE id = $1',
    [stagingId]
  );

  // Build edit history
  const editHistory = [];
  for (const [field, newValue] of Object.entries(editedData)) {
    const oldValue = record.mapped_data[field];
    if (oldValue !== newValue) {
      editHistory.push({
        edited_at: new Date().toISOString(),
        edited_by: editedBy,
        field: field,
        old_value: oldValue,
        new_value: newValue
      });
    }
  }

  // Update record
  await this.db.query(`
    UPDATE t_import_staging_data
    SET
      mapped_data = $1,
      edit_history = edit_history || $2::jsonb,
      edited_at = NOW(),
      edited_by = $3,
      processing_status = 'pending_process',  -- Reset to reprocess
      error_messages = NULL,
      warnings = NULL
    WHERE id = $4
  `, [
    JSON.stringify({ ...record.mapped_data, ...editedData }),
    JSON.stringify(editHistory),
    editedBy,
    stagingId
  ]);
}
```

---

## Summary: Database Impact

### ✅ What Was Created:
1. **Function:** `normalize_customer_name(TEXT)` - PL/pgSQL function
2. **Computed Column:** `t_contacts.normalized_name` - Auto-maintained
3. **Index:** `idx_contacts_normalized_name` - For fast lookups
4. **Columns in t_import_sessions:** 6 new columns for restart/checkpoint
5. **Columns in t_import_staging_data:** 9 new columns for match/edit tracking
6. **Indexes:** 3 new indexes on t_import_staging_data
7. **Updated Constraints:** Status checks for both tables

### ❌ What Was NOT Created:
- No triggers
- No views
- No stored procedures
- No materialized views
- No additional tables

### 🔄 What Happens Automatically:
- `normalized_name` updates when `t_contacts.name` changes (PostgreSQL handles it)
- Indexes automatically maintained by PostgreSQL
- All lookups use standard SQL queries (no magic)

### 💾 Where Data Lives:
- **Original file data:** `t_import_staging_data.raw_data` (JSONB)
- **Mapped data:** `t_import_staging_data.mapped_data` (JSONB)
- **Match results:** `t_import_staging_data.match_type`, `ambiguous_matches` (JSONB)
- **Edit history:** `t_import_staging_data.edit_history` (JSONB array)
- **Final data:** `t_transaction_table` (only successful records)

---

## Performance Considerations

### Computed Column Performance:
- **Storage:** Normalized names stored on disk (STORED, not VIRTUAL)
- **Index:** B-tree index for O(log n) lookups
- **Cost:** Small - only stores uppercase alphanumeric strings
- **Benefit:** No runtime normalization needed for queries

### Batch Processing:
- Processes 100 records at a time
- Commits after each batch
- Checkpoint saved after each batch
- Memory efficient (doesn't load all records at once)

### Restart Capability:
- Tracks `last_processed_staging_id`
- Resumes from checkpoint (doesn't reprocess successful records)
- Multiple restarts supported
- Each restart increments `restart_count`

### Indexes Created:
```sql
-- Fast name lookups (most important)
idx_contacts_normalized_name ON t_contacts(normalized_name)

-- Fast status queries
idx_staging_processing_status_session ON t_import_staging_data(session_id, processing_status)

-- Fast review queries
idx_staging_requires_review ON t_import_staging_data(session_id, requires_review) WHERE requires_review = true

-- Fast edit queries
idx_staging_edited ON t_import_staging_data(session_id, edited_at) WHERE edited_at IS NOT NULL
```

All indexes are partial/conditional where appropriate to minimize index size.
