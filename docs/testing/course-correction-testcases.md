# Course Correction - Test Cases

## Overview
Test cases for the Course Correction feature (Scheme Code Migration Tool).

**Feature Location:** Data Operations → Course Correction
**URL:** `/data-ops/course-correction`

---

## TC-1: Navigation & Page Load

| TC ID | Description | Steps | Expected Result |
|-------|-------------|-------|-----------------|
| TC-1.1 | Menu visibility | Login → Check sidebar | "Course Correction" visible under "Data Operations" |
| TC-1.2 | Page navigation | Click "Course Correction" | Page loads at `/data-ops/course-correction` |
| TC-1.3 | Empty state | Load page with no corrections | Shows "No course corrections found" message |
| TC-1.4 | Refresh button | Click "Refresh" | Page data reloads without full refresh |

---

## TC-2: History List

| TC ID | Description | Steps | Expected Result |
|-------|-------------|-------|-----------------|
| TC-2.1 | List display | Have corrections in DB → Load page | Table shows corrections with all columns |
| TC-2.2 | Status filter - All | Select "All" from dropdown | Shows all corrections |
| TC-2.3 | Status filter - Pending | Select "Pending" | Shows only pending corrections |
| TC-2.4 | Status filter - Completed | Select "Completed" | Shows only completed corrections |
| TC-2.5 | Status filter - Rolled Back | Select "Rolled Back" | Shows only rolled back corrections |
| TC-2.6 | Pagination | Have >15 corrections | Pagination controls appear and work |
| TC-2.7 | Date formatting | View list | Dates show in "DD Mon YYYY" format |
| TC-2.8 | Currency formatting | View list | Amounts show in ₹X.XX L/Cr format |

---

## TC-3: New Migration Wizard - Step 1 (Source Scheme)

| TC ID | Description | Steps | Expected Result |
|-------|-------------|-------|-----------------|
| TC-3.1 | Open wizard | Click "New Migration" | Shows Step 1 with bookmarked schemes list |
| TC-3.2 | Bookmarks load | Wait for page load | All tenant bookmarks displayed |
| TC-3.3 | Scheme selection | Click on a scheme | Navigates to Step 2 |
| TC-3.4 | Back navigation | Click back arrow | Returns to history list |
| TC-3.5 | No bookmarks | Tenant has no bookmarks | Shows "No bookmarks found" message |

---

## TC-4: New Migration Wizard - Step 2 (Select Customer)

| TC ID | Description | Steps | Expected Result |
|-------|-------------|-------|-----------------|
| TC-4.1 | Impact summary | Select source scheme | Shows total customers, transactions, invested amount |
| TC-4.2 | Customer list | View available customers | Shows customers with transaction counts |
| TC-4.3 | Already migrated | Customer already migrated for this scheme | Customer not shown in list |
| TC-4.4 | All migrated | All customers already migrated | Shows "All customers have already been migrated" |
| TC-4.5 | Customer selection | Click on a customer | Navigates to Step 3 |
| TC-4.6 | Back navigation | Click back arrow | Returns to Step 1 |
| TC-4.7 | No transactions | Scheme has no transactions | Shows empty customer list |

---

## TC-5: New Migration Wizard - Step 3 (Target Scheme)

| TC ID | Description | Steps | Expected Result |
|-------|-------------|-------|-----------------|
| TC-5.1 | Summary display | View Step 3 | Shows selected customer and source scheme |
| TC-5.2 | Search empty | No search entered | Shows "Enter at least 2 characters" |
| TC-5.3 | Search 1 char | Enter 1 character | Shows "Enter at least 2 characters" |
| TC-5.4 | Search valid | Enter 2+ characters | Shows matching schemes from master |
| TC-5.5 | Search no results | Search for "xyz123nonexistent" | Shows "No schemes found" |
| TC-5.6 | Source scheme disabled | Search includes source scheme | Source scheme shown but disabled/grayed out |
| TC-5.7 | Target selection | Click on valid scheme | Navigates to Step 4 |
| TC-5.8 | Back navigation | Click back arrow | Returns to Step 2 |

---

## TC-6: New Migration Wizard - Step 4 (Confirm)

| TC ID | Description | Steps | Expected Result |
|-------|-------------|-------|-----------------|
| TC-6.1 | Summary display | View Step 4 | Shows customer, source, target, transaction count |
| TC-6.2 | Warning message | View Step 4 | Yellow warning about pending status shown |
| TC-6.3 | Notes field | Enter notes | Text captured in textarea |
| TC-6.4 | Cancel button | Click "Cancel" | Returns to history list |
| TC-6.5 | Create success | Click "Create Migration" | Creates record, shows toast, returns to list |
| TC-6.6 | Create - pending status | Check created record | Status is "pending" |
| TC-6.7 | Back navigation | Click back arrow | Returns to Step 3 |

---

## TC-7: Execute Migration

| TC ID | Description | Steps | Expected Result |
|-------|-------------|-------|-----------------|
| TC-7.1 | Execute button visible | Pending correction exists | "Execute" button shown |
| TC-7.2 | Execute confirmation | Click "Execute" | Browser confirm dialog appears |
| TC-7.3 | Execute cancel | Click "Cancel" in confirm | No changes, stays pending |
| TC-7.4 | Execute success | Click "OK" in confirm | Status changes to "completed" |
| TC-7.5 | Transactions updated | Check database | Transaction scheme_codes updated |
| TC-7.6 | Rollback data saved | Check database | rollback_data JSONB populated |
| TC-7.7 | Execute button hidden | After execution | "Execute" button no longer shown |
| TC-7.8 | Rollback button visible | After execution | "Rollback" button now shown |

---

## TC-8: Rollback Migration

| TC ID | Description | Steps | Expected Result |
|-------|-------------|-------|-----------------|
| TC-8.1 | Rollback button visible | Completed correction | "Rollback" button shown |
| TC-8.2 | Rollback confirmation | Click "Rollback" | Browser confirm dialog appears |
| TC-8.3 | Rollback cancel | Click "Cancel" in confirm | No changes, stays completed |
| TC-8.4 | Rollback success | Click "OK" in confirm | Status changes to "rolled_back" |
| TC-8.5 | Transactions restored | Check database | Transaction scheme_codes restored to original |
| TC-8.6 | Rollback button hidden | After rollback | "Rollback" button no longer shown |
| TC-8.7 | No actions | Rolled back record | Shows "-" in actions column |

---

## TC-9: Delete Correction

| TC ID | Description | Steps | Expected Result |
|-------|-------------|-------|-----------------|
| TC-9.1 | Delete button visible | Pending correction | Trash icon button shown |
| TC-9.2 | Delete confirmation | Click delete | Browser confirm dialog appears |
| TC-9.3 | Delete cancel | Click "Cancel" in confirm | Record remains |
| TC-9.4 | Delete success | Click "OK" in confirm | Record removed from list |
| TC-9.5 | Delete not on completed | Completed correction | Delete button NOT shown |
| TC-9.6 | Delete not on rolled back | Rolled back correction | Delete button NOT shown |

---

## TC-10: Snapshot Tracking

| TC ID | Description | Steps | Expected Result |
|-------|-------------|-------|-----------------|
| TC-10.1 | Mark Done visible | Completed correction, snapshot_regenerated=false | "Mark Done" button shown |
| TC-10.2 | Mark Done click | Click "Mark Done" | Button replaced with checkmark |
| TC-10.3 | Already done | snapshot_regenerated=true | Checkmark shown, no button |
| TC-10.4 | Pending status | Pending correction | Shows "-" in snapshot column |
| TC-10.5 | Rolled back status | Rolled back correction | Shows "-" in snapshot column |

---

## TC-11: Edge Cases & Error Handling

| TC ID | Description | Steps | Expected Result |
|-------|-------------|-------|-----------------|
| TC-11.1 | Same source/target | Try to select same scheme as target | Scheme disabled, cannot select |
| TC-11.2 | Duplicate migration | Create correction for already-migrated customer | Error: "already been migrated" |
| TC-11.3 | Execute twice | Try to execute already-executed record | Error: "not in pending status" |
| TC-11.4 | Rollback pending | Try to rollback pending record | Error: "only rollback completed" |
| TC-11.5 | Network error | Disconnect network → action | Error toast shown |
| TC-11.6 | Session timeout | Token expired → action | Redirect to login |

---

## TC-12: Data Integrity

| TC ID | Description | Steps | Expected Result |
|-------|-------------|-------|-----------------|
| TC-12.1 | Transaction count match | Execute → Check DB | transaction_count matches actual updated rows |
| TC-12.2 | Rollback restores all | Execute → Rollback → Check DB | All transactions back to original scheme_code |
| TC-12.3 | Only customer affected | Execute for Customer A | Customer B transactions unchanged |
| TC-12.4 | Tenant isolation | Tenant 1 creates correction | Tenant 2 cannot see it |

---

## Sample Test Data Setup

```sql
-- Verify test data exists:
SELECT scheme_code, scheme_name, COUNT(DISTINCT customer_id) as customer_count
FROM t_transaction_table t
WHERE t.tenant_id = 17 AND t.is_live = true
GROUP BY scheme_code, scheme_name
ORDER BY customer_count DESC
LIMIT 10;

-- Check bookmarks:
SELECT scheme_code, scheme_name, amc_name
FROM t_scheme_bookmarks
WHERE tenant_id = 17 AND is_live = true AND is_active = true
ORDER BY amc_name, scheme_name;
```

---

## Test Execution Summary

| Section | Total TCs | Pass | Fail | Blocked |
|---------|-----------|------|------|---------|
| TC-1: Navigation | 4 | | | |
| TC-2: History List | 8 | | | |
| TC-3: Step 1 Source | 5 | | | |
| TC-4: Step 2 Customer | 7 | | | |
| TC-5: Step 3 Target | 8 | | | |
| TC-6: Step 4 Confirm | 7 | | | |
| TC-7: Execute | 8 | | | |
| TC-8: Rollback | 7 | | | |
| TC-9: Delete | 6 | | | |
| TC-10: Snapshot | 5 | | | |
| TC-11: Edge Cases | 6 | | | |
| TC-12: Data Integrity | 4 | | | |
| **TOTAL** | **75** | | | |

---

**Tested By:** ________________
**Date:** ________________
**Environment:** ________________
