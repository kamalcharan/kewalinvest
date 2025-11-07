# TypeScript Module Resolution Fix

## Issue
TypeScript compiler cannot find `GoalWizardModal` module after cleanup and refactoring.

## Root Cause
Stale TypeScript compilation cache after deleting old files (GoalSetupModal, GoalMetricsBar, etc.) and creating new GoalWizardModal.

## Verification Complete ✓
- [x] GoalWizardModal.tsx exists at `frontend/src/components/goals/GoalWizardModal.tsx`
- [x] All imports are correct in both CustomerViewPage.tsx and JTBDSetupModal.tsx
- [x] All old modal files deleted (GoalSetupModal, GoalMetricsBar, form components)
- [x] Component properly declared and exported
- [x] All changes committed and pushed to branch

## Resolution Steps

### Option 1: Clear Cache & Restart Dev Server (Recommended)
```bash
cd frontend
rm -rf node_modules/.cache
rm -rf .next
npm run start
```

### Option 2: Restart TypeScript Server (VS Code)
1. Open Command Palette (Cmd/Ctrl + Shift + P)
2. Type: "TypeScript: Restart TS Server"
3. Press Enter

### Option 3: Full Clean Rebuild
```bash
cd frontend
rm -rf node_modules/.cache
rm -rf .next
rm -rf build
npm run build
```

### Option 4: IDE Cache Clear
- **VS Code**: Close and reopen workspace
- **WebStorm/IntelliJ**: File > Invalidate Caches / Restart

## Files Modified in Cleanup
- **Created**: `frontend/src/components/goals/GoalWizardModal.tsx`
- **Deleted**:
  - `GoalSetupModal.tsx`
  - `GoalMetricsBar.tsx`
  - `forms/TimeBasedGoalForm.tsx`
  - `forms/PriceBasedGoalForm.tsx`
  - `forms/TimeAndPriceGoalForm.tsx`
- **Updated**:
  - `CustomerViewPage.tsx` (line 35: import GoalWizardModal)
  - `JTBDSetupModal.tsx` (line 11: import GoalWizardModal)

## Expected Result
After clearing cache and restarting, TypeScript should successfully compile with:
```
Compiled successfully!
```

No errors related to GoalWizardModal module resolution.
