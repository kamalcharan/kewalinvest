# Lessons Learnt - Release 1.1 Phase 1

**Date:** November 23, 2025
**Project:** Multi-Asset Portfolio Management System

## Critical Architecture Patterns

### 1. Server.ts Route Registration

**LESSON:** Always register routes in server.ts following existing patterns

**Wrong Approach:**
```typescript
// DON'T: Register routes without checking existing patterns
app.use('/investments', investmentPlanRoutes);
```

**Correct Approach:**
```typescript
// DO: Follow the established pattern in server.ts
import investmentPlanRoutes from './routes/investmentPlan.routes';

// Group with other API routes
app.use('/api', investmentPlanRoutes);  // Release 1.1 - Phase 1: Investment Plans
```

**Impact:** Inconsistent route registration caused 404 errors and routing conflicts.

---

### 2. ServiceURLs.ts Pattern

**LESSON:** NEVER hardcode API endpoints in service files. Always use serviceURLs.ts

**Wrong Approach:**
```typescript
// DON'T: Hardcode URLs in service
export class InvestmentPlanService {
  static async getPlans(customerId: number) {
    return apiService.get(`/api/customers/${customerId}/investments`);  // WRONG
  }
}
```

**Correct Approach:**
```typescript
// serviceURLs.ts
export const API_ENDPOINTS = {
  INVESTMENT_PLANS: {
    LIST: (customerId: number) => `${API_BASE}/customers/${customerId}/investments`,
    CREATE: (customerId: number) => `${API_BASE}/customers/${customerId}/investments`,
    // ... other endpoints
  }
};

// service file
import { API_ENDPOINTS } from './serviceURLs';

export class InvestmentPlanService {
  static async getPlans(customerId: number) {
    return apiService.get(API_ENDPOINTS.INVESTMENT_PLANS.LIST(customerId));  // CORRECT
  }
}
```

**Benefits:**
- Single source of truth for all API endpoints
- Easy to update base URLs
- Type-safe endpoint generation
- Consistent across the codebase

---

### 3. Import/Export Consistency

**LESSON:** Maintain consistent import/export patterns throughout the codebase

**Issues Encountered:**
1. **Default vs Named Exports**
   ```typescript
   // bookmark.service.ts uses default export
   export default BookmarkService;

   // But we tried to import as:
   import { BookmarkService } from './bookmark.service';  // WRONG

   // Correct:
   import BookmarkService from './bookmark.service';  // CORRECT
   ```

2. **Dynamic Imports**
   ```typescript
   // For default exports in dynamic imports:
   const BookmarkService = (await import('./bookmark.service')).default;
   ```

**Best Practice:**
- Check existing service files for export pattern
- Be consistent: either all default or all named exports
- Document the pattern in a style guide

---

### 4. Database Schema Management

**LESSON:** Keep distribution scripts in sync with migrations

**Issues Encountered:**
- Migration 017 added fields to `t_customer_asset_assignments`
- Distribution scripts (02_tables.sql) was out of sync
- Led to schema mismatches between fresh installs and migrated databases

**Solution Implemented:**
1. **Always update distribution scripts** when creating migrations
2. **Verify sync** before considering feature complete
3. **Two paths to same schema:**
   - Fresh install: Run distribution scripts
   - Existing DB: Run migrations

**Checklist for Database Changes:**
- [ ] Write migration script (e.g., `017_add_investment_plan_fields.sql`)
- [ ] Update distribution script (`02_tables.sql`)
- [ ] Update indexes/triggers if needed (`03_indexes_triggers.sql`)
- [ ] Test both paths (fresh install + migration)
- [ ] Document in release notes

---

### 5. Theme System Usage

**LESSON:** Always use theme colors from useTheme hook, never hardcode

**Wrong Approach:**
```typescript
// DON'T: Hardcode semantic colors for primary actions
border: `2px solid ${colors.semantic.info}`,
backgroundColor: colors.semantic.info + '15',
```

**Correct Approach:**
```typescript
// DO: Use brand.primary for primary actions (theme-aware)
border: `2px solid ${colors.brand.primary}`,
backgroundColor: colors.brand.primary + '15',
```

**Semantic Colors vs Brand Colors:**
- **Semantic:** `success`, `error`, `warning`, `info` - Use for status/feedback
- **Brand:** `primary`, `secondary` - Use for interactive elements (buttons, selections)

**Pattern:**
```typescript
const { theme, isDarkMode } = useTheme();
const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

// Then use:
colors.brand.primary        // Primary actions, selections
colors.brand.secondary      // Secondary actions
colors.semantic.success     // Success messages
colors.semantic.error       // Error messages
colors.utility.primaryText  // Main text color
```

---

### 6. Component Patterns - Radio Buttons

**LESSON:** Follow established patterns from existing components

**Reference Implementation:** `ImportTypeRadioSelector.tsx`

**Pattern:**
```typescript
<label style={{
  position: 'relative',  // For absolute child positioning
  // ... styling for the visible button
}}>
  <input
    type="radio"
    name="field_name"
    checked={isSelected}
    onChange={handleChange}
    style={{
      position: 'absolute',  // Cover entire label
      opacity: 0,            // Invisible but functional
      width: '100%',
      height: '100%',
      cursor: 'pointer',
      top: 0,
      left: 0
    }}
  />
  {Label Content}
</label>
```

**Why This Pattern:**
- Real HTML radio input (accessible, keyboard navigation)
- Custom visual styling on label
- Works with form submissions
- Maintains semantic HTML

**Don't:**
- Use `<button>` styled as radio (not semantic)
- Use `<div onClick>` (accessibility issues)
- Forget `name` attribute (radio grouping)

---

### 7. Responsive Layout - No Fixed Dimensions

**LESSON:** Use flexible sizing, avoid fixed width/height that force scrolling

**Wrong Approach:**
```typescript
<div style={{
  width: '900px',           // Fixed width
  maxHeight: '70vh',        // Fixed height
  overflowY: 'auto'         // Forces scrolling
}}>
```

**Correct Approach:**
```typescript
<div style={{
  minWidth: '800px',        // Minimum for usability
  maxWidth: '1100px',       // Maximum for readability
  // NO maxHeight on content area
}}>
```

**Guidelines:**
- Use `minWidth`/`maxWidth` for containers, not fixed `width`
- Avoid `maxHeight` on main content areas
- Let content determine height naturally
- Use `maxHeight` + `overflowY` ONLY for specific scrollable sections (like dropdowns)

---

### 8. API Service Pattern

**LESSON:** Always use the apiService wrapper, never raw axios

**Wrong Approach:**
```typescript
import axios from 'axios';

const response = await axios.get('/api/endpoint');  // WRONG
```

**Correct Approach:**
```typescript
import { apiService } from './apiService';

const response = await apiService.get<ApiResponse<DataType>>('/api/endpoint');  // CORRECT
```

**Why apiService:**
- Automatic token injection
- Error handling
- Request/response interceptors
- Consistent error format
- Type safety with generics

---

### 9. Controller Method Binding

**LESSON:** Use arrow functions in controllers for proper `this` binding

**Wrong Approach:**
```typescript
export class InvestmentPlanController {
  async createPlan(req: Request, res: Response) {  // WRONG - loses 'this' context
    await this.service.create(...);  // 'this' is undefined
  }
}
```

**Correct Approach:**
```typescript
export class InvestmentPlanController {
  createPlan = async (req: Request, res: Response): Promise<void> => {  // CORRECT
    await this.service.create(...);  // 'this' works correctly
  }
}
```

**Why Arrow Functions:**
- Automatic `this` binding
- Works correctly with route handlers
- No need for `.bind(this)` in route registration

---

### 10. TypeScript Compilation Errors

**LESSON:** Run `npm run build` frequently during development

**Issues Encountered:**
1. Import mismatches not caught until compilation
2. Type errors in unused code paths
3. Missing properties on interfaces

**Best Practice:**
```bash
# Check TypeScript before committing
cd backend && npm run build
cd frontend && npm run build

# Or use watch mode during development
npm run build -- --watch
```

**Checklist Before Commit:**
- [ ] Backend TypeScript compiles clean
- [ ] Frontend TypeScript compiles clean
- [ ] No linting errors
- [ ] All tests pass

---

### 11. Database Constraints

**LESSON:** Use CHECK constraints for enum-like fields

**Implementation:**
```sql
CREATE TABLE t_customer_asset_assignments (
  investment_type VARCHAR(20) CHECK (
    investment_type IN ('one_time', 'sip', 'recurring')
  ),
  investment_frequency VARCHAR(20) CHECK (
    investment_frequency IS NULL OR
    investment_frequency IN ('monthly', 'quarterly', 'yearly')
  ),
  CONSTRAINT chk_duration CHECK (
    (duration_months IS NOT NULL AND duration_years IS NULL) OR
    (duration_months IS NULL AND duration_years IS NOT NULL) OR
    (duration_months IS NULL AND duration_years IS NULL)
  )
);
```

**Benefits:**
- Data integrity at database level
- Self-documenting schema
- Prevents invalid data from any source (not just app)

---

### 12. Validation Strategy

**LESSON:** Validate at multiple layers

**Three-Layer Validation:**

1. **Frontend (UX):**
   ```typescript
   if (!investmentName.trim()) {
     setError('Please provide a name for this investment');
     return;
   }
   ```

2. **Backend (Business Logic):**
   ```typescript
   if (!data.asset_type_id) {
     throw new Error('Asset type is required');
   }
   ```

3. **Database (Data Integrity):**
   ```sql
   asset_type_id INTEGER NOT NULL REFERENCES m_asset_types(id)
   ```

**Don't rely on just one layer!**

---

### 13. API Response Format

**LESSON:** Maintain consistent API response structure

**Pattern:**
```typescript
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// Success response
res.status(200).json({
  success: true,
  message: 'Investment plan created successfully',
  data: result
});

// Error response
res.status(400).json({
  success: false,
  message: 'Validation failed',
  error: errorMessage
});
```

**Benefits:**
- Predictable response structure
- Easy error handling on frontend
- Consistent across all endpoints

---

### 14. Calculated Fields Display

**LESSON:** Show calculated values prominently with clear visual indicators

**Implementation:**
```typescript
{calculatedEndDate && (
  <div style={{
    backgroundColor: colors.semantic.success + '15',
    border: `1px solid ${colors.semantic.success}30`,
    color: colors.semantic.success,
    fontWeight: '600',
    textAlign: 'center'
  }}>
    📅 Expected End Date: {calculatedEndDate}
  </div>
)}
```

**Guidelines:**
- Use emoji/icons for quick recognition
- Use semantic colors (success color for positive information)
- Show only when relevant (conditional rendering)
- Make it visually distinct from input fields

---

### 15. Testing Strategy

**LESSON:** Test both happy path AND edge cases

**Edge Cases to Test:**
- NULL values
- Empty strings
- Zero amounts
- Negative numbers
- Date boundaries
- Duration edge cases (0, negative, very large)
- Enum values (valid and invalid)
- Tenant isolation
- Multi-environment (live/test)

**Example:**
```typescript
// Don't just test normal case
plan.investment_type.toUpperCase()  // Crashes if null

// Handle edge cases
plan.investment_type?.toUpperCase() || 'N/A'  // Safe
```

---

## Process Improvements for Phase 2

### 1. Pre-Development Checklist
- [ ] Review existing patterns in codebase
- [ ] Identify similar features to use as reference
- [ ] Plan database schema changes (migrations + distribution scripts)
- [ ] Design API endpoints following serviceURLs pattern
- [ ] Review theme system and component patterns

### 2. During Development Checklist
- [ ] Follow server.ts registration pattern
- [ ] Use serviceURLs.ts for all endpoints
- [ ] Match component patterns from similar features
- [ ] Use theme colors (brand.primary for actions)
- [ ] Run TypeScript build frequently
- [ ] Test edge cases as you develop

### 3. Pre-Commit Checklist
- [ ] Backend builds without errors
- [ ] Frontend builds without errors
- [ ] Distribution scripts updated
- [ ] Migration scripts tested
- [ ] API endpoints documented
- [ ] Edge cases tested
- [ ] Theme works in light/dark mode
- [ ] Responsive on different screen sizes

### 4. Documentation Checklist
- [ ] Update RELEASE notes
- [ ] Update LESSONS-LEARNT
- [ ] Create/update migration guide
- [ ] Document new API endpoints
- [ ] Update architecture diagrams if needed

---

## Key Takeaways

1. **Consistency is Critical:** Follow existing patterns religiously
2. **Don't Hardcode:** Use serviceURLs.ts, theme system, constants
3. **Two-Path Schema:** Keep migrations and distribution scripts in sync
4. **Build Often:** Catch TypeScript errors early
5. **Validate Everywhere:** Frontend UX + Backend logic + Database constraints
6. **Test Edge Cases:** NULL, empty, zero, negative, boundaries
7. **Theme-Aware:** Use brand.primary, not semantic colors for actions
8. **Component Patterns:** Reference similar components (ImportTypeRadioSelector)
9. **Flexible Layout:** minWidth/maxWidth, avoid fixed height
10. **Document Everything:** Future you will thank present you

---

## References for Phase 2

**Pattern Examples:**
- Route Registration: `server.ts`
- API Endpoints: `serviceURLs.ts`
- Service Pattern: `bookmark.service.ts`
- Controller Pattern: `investmentPlan.controller.ts`
- Theme Usage: `ImportTypeRadioSelector.tsx`
- Radio Buttons: `ImportTypeRadioSelector.tsx`
- API Response: `investmentPlan.controller.ts`

**Review These Before Starting Phase 2!**

---

**End of Lessons Learnt Document**
