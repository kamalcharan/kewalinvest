# Handover Document: Alert System Enhancements (Cruise Control)

**Session Date:** 2025-11-26
**Branch:** `claude/review-networth-viewer-018ZNaYLAoa8hK51bt58wGc1`
**Status:** Ready to merge to main

---

## Summary of Completed Work

### 1. AlertsTab Card Design Update
**Files:** `frontend/src/pages/cruiseControl/AlertsTab.tsx`

- Redesigned alert cards to match the compact JTBDCard design from CustomerView
- Added customer name with clickable link to customer profile
- Added action-oriented titles with emoji prefixes (e.g., "💰 Investment Due", "🎂 Birthday Reminder")
- Added priority badges with color coding
- Added "NEW" badge for new alerts
- Implemented 2-column responsive grid layout

### 2. Auto-Complete SIP Alerts on Transaction Import
**Files:**
- `backend/src/services/mfImportJobService.ts`
- `backend/src/services/jtbd.service.ts`

- When MF transactions are imported, matching SIP alerts are automatically marked as completed
- Matching logic uses scheme_code, customer_id, and transaction type
- Completion is recorded with `completed_at` timestamp and appropriate status

### 3. Toggle Alerts per Investment Plan
**Files:**
- `frontend/src/components/assets/InvestmentPlanCard.tsx`
- `frontend/src/components/assets/CustomerAssetManager.tsx`
- `frontend/src/hooks/useInvestmentPlans.ts`
- `frontend/src/services/investmentPlan.service.ts`
- `frontend/src/types/investmentPlan.types.ts`
- `backend/src/controllers/investmentPlan.controller.ts`
- `backend/src/routes/investmentPlan.routes.ts`
- `backend/src/services/investmentPlan.service.ts`

- Added `alerts_enabled` field to investment plans
- Bell/BellOff icon toggle on InvestmentPlanCard (SIP/recurring plans only)
- API endpoint: `PATCH /api/customers/:customerId/investments/:id/toggle-alerts`
- Visual feedback with green (enabled) vs gray (disabled) bell icon

### 4. New Alert Button in Customer Header
**Files:**
- `frontend/src/components/customers/CustomerViewHeader.tsx`
- `frontend/src/pages/customers/CustomerViewPage.tsx`

- Added "New Alert" button (bell icon, warning color) next to Meeting button
- Opens JTBDSetupModal for creating alerts

### 5. Filter JTBD Types in Modal
**Files:**
- `frontend/src/components/jtbd/JTBDSetupModal.tsx`
- `frontend/src/pages/customers/CustomerViewPage.tsx`

- Added `hideTypes` prop to JTBDSetupModal
- When opened from "New Alert" button, hides:
  - `portfolio_alert` (created automatically via Investment Plans)
  - `goal_tracking` (created automatically via Goals)
- Only shows Time-Based Alert and Profile Trigger options

### 6. TypeScript Fixes
**Files:** `frontend/src/pages/cruiseControl/AlertsTab.tsx`

- Fixed TypeScript errors by adding generic type `<{ success: boolean }>` to `apiService.patch` calls

---

## Pending Tasks / Future Enhancements

### High Priority
1. **Alert Notification System**
   - Push notifications for due alerts
   - Email digest of upcoming alerts (daily/weekly)

2. **Bulk Alert Actions**
   - Select multiple alerts and acknowledge/dismiss in batch
   - Filter alerts by date range

### Medium Priority
3. **Alert History/Audit Trail**
   - View history of acknowledged/dismissed alerts
   - Track who took action and when

4. **Investment Plan Alert Customization**
   - Allow setting custom alert timing (e.g., 3 days before SIP date)
   - Configure alert priority per plan

### Low Priority
5. **Alert Analytics Dashboard**
   - Metrics on alert completion rates
   - Average response time to alerts
   - Most common alert types

---

## Lessons Learned

### 1. TypeScript Generic Types for API Services
**Problem:** `apiService.patch()` returns `unknown` type by default, causing TypeScript errors when accessing `response.success`.

**Solution:** Always specify generic type parameter:
```typescript
// Bad
const response = await apiService.patch(url);

// Good
const response = await apiService.patch<{ success: boolean }>(url);
```

### 2. Props for Conditional UI Rendering
**Problem:** Same modal needed different options based on entry point.

**Solution:** Use optional array props to filter displayed items:
```typescript
interface ModalProps {
  hideTypes?: JTBDType[];
}

// In render:
{typeCards.filter(card => !hideTypes.includes(card.type)).map(...)}
```

### 3. Alert System Architecture
**Learning:** Alerts work best as a derived/notification layer on top of core entities:
- Investment Plans generate SIP alerts
- Goals generate goal tracking alerts
- Manual alerts (time-based, profile trigger) are standalone

This separation allows:
- Automatic alert creation when plans/goals are created
- Automatic completion when transactions are imported
- Toggle alerts at the source (investment plan) without affecting the plan itself

### 4. API Endpoint Naming Conventions
**Pattern used:** Action-based endpoints for state changes
```
PATCH /api/customers/:id/investments/:id/toggle-alerts
```
Rather than:
```
PUT /api/investments/:id  (with alerts_enabled in body)
```

Benefits:
- Clear intent in URL
- Simpler request body (no body needed)
- Better audit logging

### 5. Component Reusability
**Pattern:** Create configurable base components, then specialize via props
- `JTBDSetupModal` with `hideTypes` prop works for multiple contexts
- `InvestmentPlanCard` with optional `onToggleAlerts` callback

---

## Database Schema Notes

### Investment Plans Table
```sql
-- alerts_enabled column added
ALTER TABLE t_customer_investments
ADD COLUMN alerts_enabled BOOLEAN DEFAULT true;
```

### JTBD/Alerts Table
```sql
-- Key columns for alert system:
- status: 'active' | 'acknowledged' | 'dismissed' | 'completed'
- completed_at: TIMESTAMP (when auto-completed by import)
- next_alert_date: DATE (for visibility window)
```

---

## Testing Recommendations

1. **Manual Testing:**
   - Create investment plan with SIP type → verify alert toggle appears
   - Toggle alerts off → verify alerts not generated
   - Import MF transactions → verify matching SIP alerts auto-complete
   - Click "New Alert" button → verify only Time-Based and Profile Trigger show

2. **Edge Cases:**
   - Investment plan without scheme_code
   - Multiple SIP alerts for same scheme
   - Alert toggle on one-time investment (should not show toggle)

---

## File Quick Reference

| Feature | Frontend Files | Backend Files |
|---------|---------------|---------------|
| Alert Cards | AlertsTab.tsx | - |
| Toggle Alerts | InvestmentPlanCard.tsx, useInvestmentPlans.ts | investmentPlan.controller.ts, routes |
| New Alert Button | CustomerViewHeader.tsx, CustomerViewPage.tsx | - |
| Hide Types | JTBDSetupModal.tsx | - |
| Auto-Complete | - | mfImportJobService.ts, jtbd.service.ts |

---

**Handover prepared by:** Claude Code
**Contact for questions:** Review commit history and inline comments
