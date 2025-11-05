# Cruise Control - Component Reuse Strategy

**Date:** 2025-01-23
**Status:** Architecture Refinement

---

## Component Reuse Analysis

### Existing Components We Can Reuse ✅

#### 1. **EnhancedBookmarkCard.tsx** (NAV)
**Location:** `frontend/src/components/nav/EnhancedBookmarkCard.tsx`

**Features Already Built**:
- ✅ Scheme info display (name, code, AMC)
- ✅ Status indicators (downloaded, pending, failed)
- ✅ NAV data range display
- ✅ Download actions (historical, daily toggle)
- ✅ Metrics calculation button
- ✅ Record count display
- ✅ Dashboard link support

**Perfect for Cruise Control NAV Tab** - No modifications needed!

#### 2. **IndexCard.tsx** (Market)
**Location:** `frontend/src/components/market/IndexCard.tsx`

**Features Already Built**:
- ✅ Index info display (name, symbol, category)
- ✅ Status indicators (downloaded, pending, failed, downloading)
- ✅ Date range display
- ✅ Download actions (historical, EOD)
- ✅ Record count display
- ✅ Delete action

**Perfect for Cruise Control Market Tab** - No modifications needed!

---

## Auto-Refresh Strategy (Polling Mode)

### React Query Polling Configuration

Instead of manual refresh, use React Query's built-in polling:

```typescript
// NAV Tab Hook with Polling
export function useNavMonitoring(tenantId: number, isLive: boolean, isAdmin: boolean) {
  const stats = useQuery({
    queryKey: ['cruise-control', 'nav', 'stats', tenantId, isLive],
    queryFn: () => fetchNavStats(tenantId, isLive, isAdmin),
    refetchInterval: 30000, // Poll every 30 seconds
    refetchIntervalInBackground: false, // Stop when tab not visible
    staleTime: 20000, // Consider data stale after 20s
  });

  const list = useQuery({
    queryKey: ['cruise-control', 'nav', 'list', filter, tenantId, isLive],
    queryFn: () => fetchNavList(filter, tenantId, isLive, isAdmin),
    refetchInterval: 60000, // Poll every 60 seconds for list
    enabled: filter !== null, // Only poll when list is visible
  });

  return { stats, list };
}
```

### Polling Strategy by Component

| Component | Polling Interval | When Active |
|-----------|------------------|-------------|
| **Dashboard Stats** | 30 seconds | Always (when page visible) |
| **NAV Tab Stats** | 30 seconds | When NAV tab active |
| **NAV List View** | 60 seconds | When list is opened |
| **Market Tab Stats** | 30 seconds | When Market tab active |
| **Market List View** | 60 seconds | When list is opened |
| **Alert Count (Bell Icon)** | 30 seconds | Always (global) |
| **Alert List** | 60 seconds | When Alerts tab active |

### Visibility-Based Polling

Use React Query's `refetchIntervalInBackground: false` to stop polling when:
- User switches to another browser tab
- User navigates to different page
- User minimizes browser

**Benefits**:
- Reduces server load
- Saves battery on mobile devices
- Automatic pause/resume on visibility change

---

## Updated Component Architecture

### ❌ REMOVE from PRD (No longer needed)

**Components we DON'T need to create**:
- ~~`StatisticsCard.tsx`~~ - Use existing card components
- ~~`NavListView.tsx`~~ - Just render `EnhancedBookmarkCard` in loop
- ~~`MarketListView.tsx`~~ - Just render `IndexCard` in loop

### ✅ KEEP in PRD (Still needed)

**New Components** (Simplified):
1. **`CruiseControlPage.tsx`** - Main container with tabs
2. **`DashboardOverview.tsx`** - Summary stats cards (simple count cards)
3. **`NavTab.tsx`** - Container that renders `EnhancedBookmarkCard[]` with polling
4. **`MarketTab.tsx`** - Container that renders `IndexCard[]` with polling
5. **`AlertsTab.tsx`** - Alert management UI (new functionality)
6. **`AlertBellIcon.tsx`** - Header bell icon with badge

**Total New Components**: 6 (down from 10+)

---

## Implementation Example

### NavTab.tsx (Simplified)

```typescript
// frontend/src/pages/cruiseControl/NavTab.tsx
import React, { useState } from 'react';
import { useNavMonitoring } from '../../hooks/useNavMonitoring';
import { EnhancedBookmarkCard } from '../../components/nav/EnhancedBookmarkCard';
import { useAuth } from '../../contexts/AuthContext';

export const NavTab: React.FC = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'pending' | 'failed' | null>(null);

  // Polling enabled: Stats refresh every 30s
  const { stats, list } = useNavMonitoring(
    user.tenant_id,
    user.is_live,
    user.tenant?.is_admin || false
  );

  return (
    <div>
      {/* Statistics Cards */}
      <div className="stats-grid">
        <StatCard
          title="Total Active NAVs"
          count={stats.data?.total_active || 0}
          onClick={() => setFilter('all')}
        />
        <StatCard
          title="Pending Downloads"
          count={stats.data?.pending_downloads || 0}
          onClick={() => setFilter('pending')}
          color="yellow"
        />
        <StatCard
          title="Failed Downloads"
          count={stats.data?.failed_downloads || 0}
          onClick={() => setFilter('failed')}
          color="red"
        />
      </div>

      {/* List View - Shows when filter is selected */}
      {filter && (
        <div className="nav-list">
          {list.data?.schemes.map(scheme => (
            <EnhancedBookmarkCard
              key={scheme.id}
              bookmark={scheme}
              onHistoricalDownload={handleDownload}
              onCalculateMetrics={handleCalculateMetrics}
              showActions
            />
          ))}
        </div>
      )}
    </div>
  );
};
```

### MarketTab.tsx (Simplified)

```typescript
// frontend/src/pages/cruiseControl/MarketTab.tsx
import React, { useState } from 'react';
import { useMarketMonitoring } from '../../hooks/useMarketMonitoring';
import IndexCard from '../../components/market/IndexCard';

export const MarketTab: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'failed' | null>(null);

  // Polling enabled: Stats refresh every 30s
  const { stats, list } = useMarketMonitoring();

  return (
    <div>
      {/* Statistics Cards */}
      <div className="stats-grid">
        <StatCard
          title="Total Indices"
          count={stats.data?.total_indices || 0}
          onClick={() => setFilter('all')}
        />
        <StatCard
          title="Pending >1 Day"
          count={stats.data?.pending_beyond_one_day || 0}
          onClick={() => setFilter('pending')}
          color="yellow"
        />
      </div>

      {/* List View - Shows when filter is selected */}
      {filter && (
        <div className="market-list">
          {list.data?.indices.map(index => (
            <IndexCard
              key={index.id}
              index={index}
              onDownloadHistorical={handleHistoricalDownload}
              onDownloadEOD={handleEODDownload}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};
```

---

## Updated Impact Analysis

### Frontend Impact (REDUCED)

**Before** (original estimate):
- 10+ new components
- ~1,500 LOC for card components

**After** (with component reuse):
- 6 new components (container pages + alert UI)
- ~800 LOC for container pages
- **Savings: ~700 LOC, ~2 days development time**

### Backend Impact (UNCHANGED)
- Still need new API endpoints
- Still need monitoring services
- Polling happens client-side (no backend changes)

### Testing Impact (REDUCED)

**Before**:
- 48 frontend unit tests (10+ components × 5 tests each)

**After**:
- 30 frontend unit tests (6 new components × 5 tests each)
- Existing card components already tested
- **Savings: 18 tests**

---

## Polling Performance Considerations

### Server Load

**Scenario**: 100 concurrent users on Cruise Control page

| Component | Requests/min | Total Requests/min |
|-----------|--------------|---------------------|
| Dashboard Stats | 2 req/min/user | 200 req/min |
| NAV Tab Stats | 2 req/min/user (when active) | ~40 req/min (20% active) |
| Market Tab Stats | 2 req/min/user (when active) | ~20 req/min (10% active) |
| Alert Count (Bell) | 2 req/min/user | 200 req/min |
| **Total** | | **~460 req/min** |

**Impact**: Negligible (current system handles 10K+ req/min)

### Optimization Strategies

1. **Visibility Detection**: Use `refetchIntervalInBackground: false`
   - Stops polling when user switches tabs
   - Resumes automatically on return

2. **Conditional Polling**: Only poll when data is needed
   ```typescript
   enabled: isTabActive && filter !== null
   ```

3. **Cache Sharing**: React Query shares cache across components
   - Multiple components can read same cached data
   - Only one network request per poll interval

4. **Debouncing**: React Query automatically debounces rapid requests

---

## Updated Timeline Estimate

### Development Time (REVISED)

| Phase | Before | After | Savings |
|-------|--------|-------|---------|
| Frontend Components | 10 days | 7 days | **3 days** |
| Backend Services | 12 days | 12 days | 0 days |
| Testing | 8 days | 6 days | **2 days** |
| **Total** | **40 days** | **35 days** | **5 days** |

**New Timeline**: 7 weeks → **6 weeks**

---

## Updated LOC Estimate

| Category | Before | After | Reduction |
|----------|--------|-------|-----------|
| Frontend Components | ~3,000 LOC | ~2,000 LOC | -1,000 LOC |
| Backend Services | ~2,500 LOC | ~2,500 LOC | 0 LOC |
| **Total** | **5,500 LOC** | **4,500 LOC** | **-1,000 LOC** |

---

## Advantages of Component Reuse

### ✅ Benefits

1. **Consistency**: Same look and feel as existing NAV/Market pages
2. **Less Code**: 1,000 fewer lines to write and maintain
3. **Faster Development**: 5 days saved
4. **Fewer Bugs**: Reusing battle-tested components
5. **Auto-Refresh**: Polling gives real-time feel without WebSocket complexity
6. **Battery Friendly**: Stops polling when tab not visible

### ⚠️ Considerations

1. **Card Component Flexibility**: May need to add props for different actions
2. **Polling Load**: Need to monitor server load (but should be fine)
3. **Stale Data**: 30-60s delay between updates (acceptable for dashboard)

---

## Recommendation

**✅ Proceed with component reuse strategy**

**Changes to PRD/Impact Analysis**:
1. Remove custom card components from scope
2. Use `EnhancedBookmarkCard` for NAV monitoring
3. Use `IndexCard` for Market monitoring
4. Add React Query polling to all container pages
5. Reduce LOC estimate from 5,500 to 4,500
6. Reduce timeline from 7 weeks to 6 weeks

**Next Steps**:
1. Review and approve this reuse strategy
2. Test polling performance with 100+ users
3. Update PRD Section 8 (Technical Architecture)
4. Update Impact Analysis Section 4 (Frontend Impact)

---

**END OF COMPONENT REUSE STRATEGY**
