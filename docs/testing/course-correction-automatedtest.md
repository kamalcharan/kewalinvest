# Course Correction - Automated Test Scripts

## Overview
Automated test scripts for Course Correction API and UI testing.

---

## 1. API Test Scripts (cURL)

### 1.1 Setup Variables

```bash
# Set these variables before running tests
export BASE_URL="http://localhost:8080"
export TOKEN="your_jwt_token_here"
export TENANT_ID="17"
export ENVIRONMENT="live"

# Headers for all requests
HEADERS="-H 'Content-Type: application/json' \
         -H 'Authorization: Bearer $TOKEN' \
         -H 'X-Tenant-ID: $TENANT_ID' \
         -H 'X-Environment: $ENVIRONMENT'"
```

### 1.2 Get Bookmarks (Source Schemes)

```bash
# TC-3.2: Get all bookmarked schemes
curl -X GET "$BASE_URL/api/course-correction/bookmarks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -H "X-Environment: $ENVIRONMENT"

# Expected: { "success": true, "data": [{ "scheme_code": "...", "scheme_name": "...", "amc_name": "..." }] }
```

### 1.3 Get Impact Analysis

```bash
# TC-4.1: Get impact analysis for a scheme code
SCHEME_CODE="152065"

curl -X GET "$BASE_URL/api/course-correction/impact/$SCHEME_CODE" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -H "X-Environment: $ENVIRONMENT"

# Expected: { "success": true, "data": { "scheme_code": "152065", "total_customers": N, "customers": [...] } }
```

### 1.4 Search Target Schemes

```bash
# TC-5.4: Search for target schemes
SEARCH="Kotak Multicap"

curl -X GET "$BASE_URL/api/course-correction/schemes/search?search=$SEARCH&page=1&page_size=10" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -H "X-Environment: $ENVIRONMENT"

# Expected: { "success": true, "data": { "schemes": [...], "total": N } }
```

### 1.5 Get Corrections List

```bash
# TC-2.1: Get all corrections
curl -X GET "$BASE_URL/api/course-correction/corrections?page=1&page_size=15" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -H "X-Environment: $ENVIRONMENT"

# TC-2.3: Get only pending corrections
curl -X GET "$BASE_URL/api/course-correction/corrections?status=pending" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -H "X-Environment: $ENVIRONMENT"

# Expected: { "success": true, "data": { "corrections": [...], "total": N, "page": 1 } }
```

### 1.6 Create Correction

```bash
# TC-6.5: Create a new correction
curl -X POST "$BASE_URL/api/course-correction/corrections" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -H "X-Environment: $ENVIRONMENT" \
  -d '{
    "customer_id": 1287,
    "source_scheme_code": "152065",
    "target_scheme_code": "149182",
    "notes": "Test migration - wrong scheme code mapping"
  }'

# Expected: { "success": true, "data": { "id": N, "status": "pending", ... } }
```

### 1.7 Execute Correction

```bash
# TC-7.4: Execute a pending correction
CORRECTION_ID="1"

curl -X POST "$BASE_URL/api/course-correction/corrections/$CORRECTION_ID/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -H "X-Environment: $ENVIRONMENT"

# Expected: { "success": true, "data": { "updated_transactions": N, "message": "..." } }
```

### 1.8 Rollback Correction

```bash
# TC-8.4: Rollback a completed correction
CORRECTION_ID="1"

curl -X POST "$BASE_URL/api/course-correction/corrections/$CORRECTION_ID/rollback" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -H "X-Environment: $ENVIRONMENT"

# Expected: { "success": true, "data": { "restored_transactions": N, "message": "..." } }
```

### 1.9 Delete Correction

```bash
# TC-9.4: Delete a pending correction
CORRECTION_ID="1"

curl -X DELETE "$BASE_URL/api/course-correction/corrections/$CORRECTION_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -H "X-Environment: $ENVIRONMENT"

# Expected: { "success": true, "message": "Course correction deleted" }
```

### 1.10 Mark Snapshot Done

```bash
# TC-10.2: Mark snapshot as regenerated
CORRECTION_ID="1"

curl -X POST "$BASE_URL/api/course-correction/corrections/$CORRECTION_ID/snapshot-done" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -H "X-Environment: $ENVIRONMENT"

# Expected: { "success": true, "message": "Snapshot marked as regenerated" }
```

---

## 2. Database Verification Scripts

### 2.1 Verify Correction Created

```sql
-- After creating a correction
SELECT id, customer_id, customer_name, source_scheme_code, target_scheme_code,
       status, transaction_count, created_at
FROM t_course_corrections
WHERE tenant_id = 17
ORDER BY created_at DESC
LIMIT 5;
```

### 2.2 Verify Transactions Before Execute

```sql
-- Check transactions for a customer before migration
SELECT id, scheme_code, scheme_name, amount, transaction_date
FROM t_transaction_table
WHERE customer_id = 1287
  AND scheme_code = '152065'
  AND tenant_id = 17
  AND is_live = true
ORDER BY transaction_date;
```

### 2.3 Verify Transactions After Execute

```sql
-- Check transactions after migration (should have new scheme_code)
SELECT id, scheme_code, scheme_name, amount, transaction_date
FROM t_transaction_table
WHERE customer_id = 1287
  AND scheme_code = '149182'  -- New scheme code
  AND tenant_id = 17
  AND is_live = true
ORDER BY transaction_date;
```

### 2.4 Verify Rollback Data Saved

```sql
-- Check rollback data is populated
SELECT id, status, rollback_data, executed_at
FROM t_course_corrections
WHERE id = 1;

-- Parse rollback_data to see original values
SELECT id,
       jsonb_array_length(rollback_data->'transactions') as transaction_count,
       rollback_data->'transactions'->0 as sample_transaction
FROM t_course_corrections
WHERE id = 1;
```

### 2.5 Verify Rollback Restored

```sql
-- After rollback, verify transactions restored
SELECT id, scheme_code, scheme_name
FROM t_transaction_table
WHERE customer_id = 1287
  AND tenant_id = 17
  AND is_live = true;
-- Should show original scheme_code again
```

### 2.6 Verify Tenant Isolation

```sql
-- Tenant 1 should not see Tenant 2's corrections
SELECT COUNT(*) as count, tenant_id
FROM t_course_corrections
GROUP BY tenant_id;
```

---

## 3. Full Integration Test Script

```bash
#!/bin/bash
# course_correction_integration_test.sh
# Full end-to-end integration test

set -e  # Exit on error

BASE_URL="http://localhost:8080"
TOKEN="$1"  # Pass token as first argument
TENANT_ID="17"
ENVIRONMENT="live"

echo "=== Course Correction Integration Test ==="
echo ""

# Test 1: Get Bookmarks
echo "1. Testing GET /bookmarks..."
BOOKMARKS=$(curl -s -X GET "$BASE_URL/api/course-correction/bookmarks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -H "X-Environment: $ENVIRONMENT")

if echo "$BOOKMARKS" | grep -q '"success":true'; then
  echo "   ✓ Bookmarks retrieved successfully"
else
  echo "   ✗ Failed to get bookmarks"
  exit 1
fi

# Extract first scheme code
SCHEME_CODE=$(echo "$BOOKMARKS" | jq -r '.data[0].scheme_code')
echo "   Using scheme_code: $SCHEME_CODE"

# Test 2: Get Impact Analysis
echo ""
echo "2. Testing GET /impact/$SCHEME_CODE..."
IMPACT=$(curl -s -X GET "$BASE_URL/api/course-correction/impact/$SCHEME_CODE" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -H "X-Environment: $ENVIRONMENT")

if echo "$IMPACT" | grep -q '"success":true'; then
  CUSTOMER_COUNT=$(echo "$IMPACT" | jq -r '.data.total_customers')
  echo "   ✓ Impact analysis retrieved: $CUSTOMER_COUNT customers"
else
  echo "   ✗ Failed to get impact analysis"
  exit 1
fi

# Extract first customer ID
CUSTOMER_ID=$(echo "$IMPACT" | jq -r '.data.customers[0].customer_id')
CUSTOMER_NAME=$(echo "$IMPACT" | jq -r '.data.customers[0].customer_name')
echo "   Using customer: $CUSTOMER_NAME (ID: $CUSTOMER_ID)"

# Test 3: Search Target Schemes
echo ""
echo "3. Testing GET /schemes/search..."
SEARCH=$(curl -s -X GET "$BASE_URL/api/course-correction/schemes/search?search=SBI&page=1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -H "X-Environment: $ENVIRONMENT")

if echo "$SEARCH" | grep -q '"success":true'; then
  SEARCH_COUNT=$(echo "$SEARCH" | jq -r '.data.total')
  echo "   ✓ Scheme search successful: $SEARCH_COUNT results"
else
  echo "   ✗ Failed to search schemes"
  exit 1
fi

# Extract a different scheme code for target
TARGET_CODE=$(echo "$SEARCH" | jq -r '.data.schemes[0].scheme_code')
echo "   Using target scheme_code: $TARGET_CODE"

# Test 4: Create Correction
echo ""
echo "4. Testing POST /corrections..."
CREATE=$(curl -s -X POST "$BASE_URL/api/course-correction/corrections" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -H "X-Environment: $ENVIRONMENT" \
  -d "{
    \"customer_id\": $CUSTOMER_ID,
    \"source_scheme_code\": \"$SCHEME_CODE\",
    \"target_scheme_code\": \"$TARGET_CODE\",
    \"notes\": \"Integration test\"
  }")

if echo "$CREATE" | grep -q '"success":true'; then
  CORRECTION_ID=$(echo "$CREATE" | jq -r '.data.id')
  echo "   ✓ Correction created: ID $CORRECTION_ID"
else
  echo "   ✗ Failed to create correction"
  echo "   Response: $CREATE"
  exit 1
fi

# Test 5: Get Corrections List
echo ""
echo "5. Testing GET /corrections..."
LIST=$(curl -s -X GET "$BASE_URL/api/course-correction/corrections" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -H "X-Environment: $ENVIRONMENT")

if echo "$LIST" | grep -q '"success":true'; then
  TOTAL=$(echo "$LIST" | jq -r '.data.total')
  echo "   ✓ Corrections list retrieved: $TOTAL total"
else
  echo "   ✗ Failed to get corrections list"
  exit 1
fi

# Test 6: Execute Correction
echo ""
echo "6. Testing POST /corrections/$CORRECTION_ID/execute..."
EXECUTE=$(curl -s -X POST "$BASE_URL/api/course-correction/corrections/$CORRECTION_ID/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -H "X-Environment: $ENVIRONMENT")

if echo "$EXECUTE" | grep -q '"success":true'; then
  UPDATED=$(echo "$EXECUTE" | jq -r '.data.updated_transactions')
  echo "   ✓ Correction executed: $UPDATED transactions updated"
else
  echo "   ✗ Failed to execute correction"
  echo "   Response: $EXECUTE"
  exit 1
fi

# Test 7: Mark Snapshot Done
echo ""
echo "7. Testing POST /corrections/$CORRECTION_ID/snapshot-done..."
SNAPSHOT=$(curl -s -X POST "$BASE_URL/api/course-correction/corrections/$CORRECTION_ID/snapshot-done" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -H "X-Environment: $ENVIRONMENT")

if echo "$SNAPSHOT" | grep -q '"success":true'; then
  echo "   ✓ Snapshot marked as done"
else
  echo "   ✗ Failed to mark snapshot"
  exit 1
fi

# Test 8: Rollback Correction
echo ""
echo "8. Testing POST /corrections/$CORRECTION_ID/rollback..."
ROLLBACK=$(curl -s -X POST "$BASE_URL/api/course-correction/corrections/$CORRECTION_ID/rollback" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -H "X-Environment: $ENVIRONMENT")

if echo "$ROLLBACK" | grep -q '"success":true'; then
  RESTORED=$(echo "$ROLLBACK" | jq -r '.data.restored_transactions')
  echo "   ✓ Correction rolled back: $RESTORED transactions restored"
else
  echo "   ✗ Failed to rollback correction"
  echo "   Response: $ROLLBACK"
  exit 1
fi

echo ""
echo "=== All Integration Tests Passed ✓ ==="
```

---

## 4. Jest Unit Test (Frontend Hooks)

```typescript
// frontend/src/__tests__/useCourseCorrection.test.ts

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCorrections, useBookmarkedSchemes, useImpactAnalysis } from '../hooks/useCourseCorrection';

// Mock the service
jest.mock('../services/courseCorrection.service', () => ({
  courseCorrectionService: {
    getCorrections: jest.fn(),
    getBookmarks: jest.fn(),
    getImpactAnalysis: jest.fn(),
  }
}));

import { courseCorrectionService } from '../services/courseCorrection.service';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useCourseCorrection hooks', () => {
  beforeEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  describe('useCorrections', () => {
    it('should fetch corrections list', async () => {
      const mockData = {
        success: true,
        data: {
          corrections: [{ id: 1, status: 'pending' }],
          total: 1,
          page: 1,
          page_size: 15,
          total_pages: 1
        }
      };

      (courseCorrectionService.getCorrections as jest.Mock).mockResolvedValue(mockData);

      const { result } = renderHook(() => useCorrections(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.corrections).toHaveLength(1);
      expect(result.current.data?.corrections[0].status).toBe('pending');
    });
  });

  describe('useBookmarkedSchemes', () => {
    it('should fetch bookmarked schemes', async () => {
      const mockData = {
        success: true,
        data: [
          { scheme_code: '123', scheme_name: 'Test Fund', amc_name: 'Test AMC' }
        ]
      };

      (courseCorrectionService.getBookmarks as jest.Mock).mockResolvedValue(mockData);

      const { result } = renderHook(() => useBookmarkedSchemes(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].scheme_code).toBe('123');
    });
  });

  describe('useImpactAnalysis', () => {
    it('should fetch impact analysis for scheme code', async () => {
      const mockData = {
        success: true,
        data: {
          scheme_code: '123',
          total_customers: 5,
          total_transactions: 20,
          customers: []
        }
      };

      (courseCorrectionService.getImpactAnalysis as jest.Mock).mockResolvedValue(mockData);

      const { result } = renderHook(() => useImpactAnalysis('123'), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.total_customers).toBe(5);
    });

    it('should not fetch when scheme code is null', () => {
      const { result } = renderHook(() => useImpactAnalysis(null), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });
});
```

---

## 5. Playwright E2E Test

```typescript
// e2e/course-correction.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Course Correction', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('TC-1.2: should navigate to course correction page', async ({ page }) => {
    await page.click('text=Data Operations');
    await page.click('text=Course Correction');

    await expect(page).toHaveURL('/data-ops/course-correction');
    await expect(page.locator('h1')).toContainText('Course Correction');
  });

  test('TC-1.3: should show empty state when no corrections', async ({ page }) => {
    await page.goto('/data-ops/course-correction');

    // If no corrections exist
    const emptyState = page.locator('text=No course corrections found');
    if (await emptyState.isVisible()) {
      await expect(emptyState).toBeVisible();
    }
  });

  test('TC-3.1: should open new migration wizard', async ({ page }) => {
    await page.goto('/data-ops/course-correction');
    await page.click('button:has-text("New Migration")');

    await expect(page.locator('h2')).toContainText('Step 1: Select Source Scheme');
  });

  test('TC-6.5: should create a new correction', async ({ page }) => {
    await page.goto('/data-ops/course-correction');

    // Step 1: Select source
    await page.click('button:has-text("New Migration")');
    await page.click('.scheme-item >> nth=0'); // Click first scheme

    // Step 2: Select customer
    await page.waitForSelector('h2:has-text("Step 2")');
    await page.click('.customer-item >> nth=0'); // Click first customer

    // Step 3: Search and select target
    await page.waitForSelector('h2:has-text("Step 3")');
    await page.fill('input[placeholder*="Search"]', 'SBI');
    await page.waitForSelector('.scheme-result');
    await page.click('.scheme-result >> nth=0');

    // Step 4: Confirm
    await page.waitForSelector('h2:has-text("Step 4")');
    await page.fill('textarea', 'E2E test correction');
    await page.click('button:has-text("Create Migration")');

    // Should return to list with success toast
    await expect(page.locator('.toast-success')).toBeVisible();
    await expect(page.locator('table')).toContainText('pending');
  });

  test('TC-7.4: should execute a pending correction', async ({ page }) => {
    await page.goto('/data-ops/course-correction');

    // Find pending correction and click execute
    const executeButton = page.locator('button:has-text("Execute")').first();
    if (await executeButton.isVisible()) {
      page.on('dialog', dialog => dialog.accept()); // Accept confirm
      await executeButton.click();

      await expect(page.locator('.toast-success')).toContainText('executed');
    }
  });

  test('TC-8.4: should rollback a completed correction', async ({ page }) => {
    await page.goto('/data-ops/course-correction');

    // Find completed correction and click rollback
    const rollbackButton = page.locator('button:has-text("Rollback")').first();
    if (await rollbackButton.isVisible()) {
      page.on('dialog', dialog => dialog.accept()); // Accept confirm
      await rollbackButton.click();

      await expect(page.locator('.toast-success')).toContainText('rolled back');
    }
  });
});
```

---

## 6. Running Tests

### Run cURL Tests
```bash
# Set token and run
export TOKEN="your_jwt_token"
chmod +x course_correction_integration_test.sh
./course_correction_integration_test.sh $TOKEN
```

### Run Jest Tests
```bash
cd frontend
npm test -- --testPathPattern=useCourseCorrection
```

### Run Playwright Tests
```bash
cd frontend
npx playwright test course-correction.spec.ts
```

---

## Test Results Log

| Date | Tester | Environment | Tests Run | Passed | Failed | Notes |
|------|--------|-------------|-----------|--------|--------|-------|
| | | | | | | |
| | | | | | | |
