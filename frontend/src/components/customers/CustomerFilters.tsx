// frontend/src/components/customers/CustomerFilters.tsx

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { CustomerSearchParams, SurvivalStatus, OnboardingStatus } from '../../types/customer.types';
import { useTheme } from '../../contexts/ThemeContext';
import { useDebounce } from '../../hooks/useDebounce';
import { useBookmarkReasons } from '../../hooks/useCustomers';

interface CustomerFiltersProps {
  onFiltersChange: (filters: CustomerSearchParams) => void;
  initialFilters?: CustomerSearchParams;
  loading?: boolean;
}

const CustomerFilters: React.FC<CustomerFiltersProps> = ({
  onFiltersChange,
  initialFilters = {},
  loading = false
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Fetch bookmark reasons (NEW)
  const { data: bookmarkReasons } = useBookmarkReasons();

  // Use ref to avoid dependency issues
  const onFiltersChangeRef = useRef(onFiltersChange);
  onFiltersChangeRef.current = onFiltersChange;

  // Collapsible state
  const [isExpanded, setIsExpanded] = useState(false);

  // Search input state (local, not sent to API immediately)
  const [searchInput, setSearchInput] = useState(initialFilters.search || '');
  
  // Debounced search value (this triggers API call after 500ms)
  const debouncedSearch = useDebounce(searchInput, 500);

  // Advanced filters state (local, not sent to API until "Apply" is clicked)
  // UPDATED: Added bookmark filters and account_type
  const [localFilters, setLocalFilters] = useState<CustomerSearchParams>({
    search: '',
    sort_by: 'c.name',
    sort_order: 'asc',
    survival_status: undefined,
    onboarding_status: undefined,
    has_address: undefined,
    has_pan: undefined,
    is_active: undefined,
    birthday_month: undefined,
    anniversary_month: undefined,
    is_bookmarked: undefined,
    bookmark_reason: undefined,
    account_type: undefined,
    page: 1,
    page_size: 20,
    ...initialFilters
  });

  // Applied filters (what's currently active in the API)
  const [appliedFilters, setAppliedFilters] = useState<CustomerSearchParams>(localFilters);

  // Effect: When debounced search changes, update the API
  // BUT ONLY if search has 4+ characters OR is empty (to allow clearing)
  useEffect(() => {
    const shouldSearch = debouncedSearch.length === 0 || debouncedSearch.length >= 4;
    
    if (shouldSearch && debouncedSearch !== appliedFilters.search) {
      const newFilters = {
        ...appliedFilters,
        search: debouncedSearch,
        page: 1
      };
      setAppliedFilters(newFilters);
      onFiltersChangeRef.current(newFilters);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]); // Remove appliedFilters from dependencies to prevent focus loss

  // Handle local filter changes (doesn't trigger API)
  const handleLocalFilterChange = useCallback((key: keyof CustomerSearchParams, value: any) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value
    }));
  }, []);

  // Handle sort changes (immediate API call)
  const handleSortChange = useCallback((key: 'sort_by' | 'sort_order', value: any) => {
    const newFilters = {
      ...appliedFilters,
      [key]: value,
      page: 1
    };
    setAppliedFilters(newFilters);
    setLocalFilters(newFilters);
    onFiltersChangeRef.current(newFilters);
  }, [appliedFilters]);

  // Handle account type change (immediate API call)
  const handleAccountTypeChange = useCallback((value: string) => {
    const newFilters = {
      ...appliedFilters,
      account_type: value === '' ? undefined : (value as 'all' | 'individual' | 'family'),
      page: 1
    };
    setAppliedFilters(newFilters);
    setLocalFilters(newFilters);
    onFiltersChangeRef.current(newFilters);
  }, [appliedFilters]);

  // Apply advanced filters (triggers API call)
  const handleApplyFilters = useCallback(() => {
    const newFilters = {
      ...localFilters,
      search: debouncedSearch,
      page: 1
    };
    setAppliedFilters(newFilters);
    onFiltersChangeRef.current(newFilters);
  }, [localFilters, debouncedSearch]);

  // Clear all filters
  // UPDATED: Clear bookmark filters and account_type
  const clearFilters = useCallback(() => {
    const clearedFilters = {
      search: '',
      sort_by: 'c.name',
      sort_order: 'asc' as 'asc' | 'desc',
      survival_status: undefined,
      onboarding_status: undefined,
      has_address: undefined,
      has_pan: undefined,
      is_active: undefined,
      birthday_month: undefined,
      anniversary_month: undefined,
      is_bookmarked: undefined,
      bookmark_reason: undefined,
      account_type: undefined,
      page: 1,
      page_size: 20
    };
    setSearchInput('');
    setLocalFilters(clearedFilters);
    setAppliedFilters(clearedFilters);
    onFiltersChangeRef.current(clearedFilters);
    setIsExpanded(false);
  }, []);

  // Check if any advanced filters are active (excluding search and sort)
  // UPDATED: Include bookmark filters
  const hasActiveAdvancedFilters = () => {
    return !!(
      appliedFilters.survival_status ||
      appliedFilters.onboarding_status ||
      appliedFilters.has_address !== undefined ||
      appliedFilters.has_pan !== undefined ||
      appliedFilters.is_active !== undefined ||
      appliedFilters.birthday_month ||
      appliedFilters.anniversary_month ||
      appliedFilters.is_bookmarked !== undefined ||
      appliedFilters.bookmark_reason
    );
  };

  // Check if there are pending filter changes
  // UPDATED: Include bookmark filters
  const hasPendingChanges = () => {
    return (
      localFilters.survival_status !== appliedFilters.survival_status ||
      localFilters.onboarding_status !== appliedFilters.onboarding_status ||
      localFilters.has_address !== appliedFilters.has_address ||
      localFilters.has_pan !== appliedFilters.has_pan ||
      localFilters.is_active !== appliedFilters.is_active ||
      localFilters.birthday_month !== appliedFilters.birthday_month ||
      localFilters.anniversary_month !== appliedFilters.anniversary_month ||
      localFilters.is_bookmarked !== appliedFilters.is_bookmarked ||
      localFilters.bookmark_reason !== appliedFilters.bookmark_reason
    );
  };

  // Count active filters
  // UPDATED: Include bookmark filters
  const activeFilterCount = () => {
    let count = 0;
    if (appliedFilters.search) count++;
    if (appliedFilters.survival_status) count++;
    if (appliedFilters.onboarding_status) count++;
    if (appliedFilters.has_address !== undefined) count++;
    if (appliedFilters.has_pan !== undefined) count++;
    if (appliedFilters.is_active !== undefined) count++;
    if (appliedFilters.birthday_month) count++;
    if (appliedFilters.anniversary_month) count++;
    if (appliedFilters.is_bookmarked !== undefined) count++;
    if (appliedFilters.bookmark_reason) count++;
    return count;
  };

  // Check if search is waiting for minimum characters
  const isSearchPending = searchInput.length > 0 && searchInput.length < 4;

  // Month options
  const monthOptions = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  // Icons
  const SearchIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );

  const FilterIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46" />
    </svg>
  );

  const XIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  const SortIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </svg>
  );

  const ChevronDownIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6,9 12,15 18,9" />
    </svg>
  );

  const ChevronUpIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="18,15 12,9 6,15" />
    </svg>
  );

  const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20,6 9,17 4,12" />
    </svg>
  );

  // Star Icon (NEW)
  const StarIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
  );

  return (
    <div style={{
      backgroundColor: colors.utility.secondaryBackground,
      border: `1px solid ${colors.utility.primaryText}10`,
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '20px'
    }}>
      {/* Search and Quick Actions - ALWAYS VISIBLE */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: isExpanded ? '16px' : '0'
      }}>
        {/* Search Input */}
        <div style={{ flex: 1, position: 'relative' }}>
          <div style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: colors.utility.secondaryText
          }}>
            <SearchIcon />
          </div>
          <input
            type="text"
            placeholder="Search by name, IWell code (min 4 characters)..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 12px 12px 44px',
              border: `1px solid ${isSearchPending ? colors.semantic.warning + '40' : colors.utility.primaryText + '20'}`,
              borderRadius: '8px',
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = colors.brand.primary}
            onBlur={(e) => e.target.style.borderColor = isSearchPending ? colors.semantic.warning + '40' : colors.utility.primaryText + '20'}
          />
          {/* Search Status Indicator */}
          {searchInput && (
            <div style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '11px',
              color: isSearchPending ? colors.semantic.warning : colors.semantic.success,
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              {isSearchPending ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {4 - searchInput.length} more char{4 - searchInput.length !== 1 ? 's' : ''}
                </>
              ) : (
                <>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: colors.semantic.success,
                    animation: 'pulse 2s ease-in-out infinite'
                  }} />
                  searching...
                </>
              )}
            </div>
          )}
        </div>

        {/* Sort Options */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SortIcon />
          <select
            value={appliedFilters.sort_by || 'c.name'}
            onChange={(e) => handleSortChange('sort_by', e.target.value)}
            disabled={loading}
            style={{
              padding: '8px 12px',
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '6px',
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
              fontSize: '14px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="c.name">Name</option>
            <option value="cust.created_at">Created Date</option>
            <option value="cust.updated_at">Updated Date</option>
            <option value="cust.date_of_birth">Birth Date</option>
            <option value="cust.anniversary_date">Anniversary</option>
          </select>

          <select
            value={appliedFilters.sort_order || 'asc'}
            onChange={(e) => handleSortChange('sort_order', e.target.value as 'asc' | 'desc')}
            disabled={loading}
            style={{
              padding: '8px 12px',
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '6px',
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
              fontSize: '14px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="asc">A-Z</option>
            <option value="desc">Z-A</option>
          </select>
        </div>

        {/* Account Type Filter (NEW) */}
        <select
          value={appliedFilters.account_type || 'all'}
          onChange={(e) => handleAccountTypeChange(e.target.value)}
          disabled={loading}
          style={{
            padding: '8px 16px',
            border: `1px solid ${appliedFilters.account_type && appliedFilters.account_type !== 'all' ? colors.brand.primary : colors.utility.primaryText + '20'}`,
            borderRadius: '6px',
            backgroundColor: appliedFilters.account_type && appliedFilters.account_type !== 'all' ? colors.brand.primary + '10' : colors.utility.primaryBackground,
            color: appliedFilters.account_type && appliedFilters.account_type !== 'all' ? colors.brand.primary : colors.utility.primaryText,
            fontSize: '14px',
            outline: 'none',
            cursor: 'pointer',
            fontWeight: appliedFilters.account_type && appliedFilters.account_type !== 'all' ? '600' : '400',
            minWidth: '150px'
          }}
        >
          <option value="all">All Accounts</option>
          <option value="individual">Individual</option>
          <option value="family">Family</option>
        </select>

        {/* Toggle Filters Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            backgroundColor: hasActiveAdvancedFilters() ? colors.brand.primary + '20' : 'transparent',
            color: hasActiveAdvancedFilters() ? colors.brand.primary : colors.utility.primaryText,
            border: `1px solid ${hasActiveAdvancedFilters() ? colors.brand.primary : colors.utility.primaryText + '20'}`,
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontWeight: '500'
          }}
        >
          <FilterIcon />
          {isExpanded ? 'Hide Filters' : 'Show Filters'}
          {hasActiveAdvancedFilters() && !isExpanded && (
            <span style={{
              backgroundColor: colors.brand.primary,
              color: 'white',
              borderRadius: '10px',
              padding: '2px 6px',
              fontSize: '10px',
              fontWeight: '600',
              marginLeft: '4px'
            }}>
              {activeFilterCount()}
            </span>
          )}
          {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </button>

        {/* Clear All Filters */}
        {activeFilterCount() > 0 && (
          <button
            onClick={clearFilters}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              backgroundColor: colors.semantic.error + '20',
              color: colors.semantic.error,
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontWeight: '500'
            }}
          >
            <XIcon />
            Clear All
          </button>
        )}
      </div>

      {/* Advanced Filters - COLLAPSIBLE */}
      {isExpanded && (
        <div style={{
          animation: 'slideDown 0.3s ease-out',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            paddingTop: '16px',
            borderTop: `1px solid ${colors.utility.primaryText}10`
          }}>
            {/* Active Status Filter */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '14px',
                fontWeight: '500',
                color: colors.utility.primaryText
              }}>
                Active Status
              </label>
              <select
                value={localFilters.is_active === undefined ? '' : localFilters.is_active.toString()}
                onChange={(e) => handleLocalFilterChange('is_active', e.target.value === '' ? undefined : e.target.value === 'true')}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '6px',
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText,
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">All Status</option>
                <option value="true">Active Only</option>
                <option value="false">Inactive Only</option>
              </select>
            </div>

            {/* Survival Status */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '14px',
                fontWeight: '500',
                color: colors.utility.primaryText
              }}>
                Survival Status
              </label>
              <select
                value={localFilters.survival_status || ''}
                onChange={(e) => handleLocalFilterChange('survival_status', e.target.value as SurvivalStatus)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '6px',
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText,
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">All Status</option>
                <option value="alive">Alive</option>
                <option value="deceased">Deceased</option>
              </select>
            </div>

            {/* Onboarding Status */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '14px',
                fontWeight: '500',
                color: colors.utility.primaryText
              }}>
                Onboarding
              </label>
              <select
                value={localFilters.onboarding_status || ''}
                onChange={(e) => handleLocalFilterChange('onboarding_status', e.target.value as OnboardingStatus)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '6px',
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText,
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">All Onboarding</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Has Address Filter */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '14px',
                fontWeight: '500',
                color: colors.utility.primaryText
              }}>
                Address
              </label>
              <select
                value={localFilters.has_address === undefined ? '' : localFilters.has_address.toString()}
                onChange={(e) => handleLocalFilterChange('has_address', e.target.value === '' ? undefined : e.target.value === 'true')}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '6px',
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText,
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">All Customers</option>
                <option value="true">With Address</option>
                <option value="false">Without Address</option>
              </select>
            </div>

            {/* Has PAN Filter */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '14px',
                fontWeight: '500',
                color: colors.utility.primaryText
              }}>
                PAN
              </label>
              <select
                value={localFilters.has_pan === undefined ? '' : localFilters.has_pan.toString()}
                onChange={(e) => handleLocalFilterChange('has_pan', e.target.value === '' ? undefined : e.target.value === 'true')}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '6px',
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText,
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">All Customers</option>
                <option value="true">With PAN</option>
                <option value="false">Without PAN</option>
              </select>
            </div>

            {/* Bookmarked Filter (NEW) */}
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginBottom: '6px',
                fontSize: '14px',
                fontWeight: '500',
                color: colors.utility.primaryText
              }}>
                <StarIcon />
                Bookmarked
              </label>
              <select
                value={localFilters.is_bookmarked === undefined ? '' : localFilters.is_bookmarked.toString()}
                onChange={(e) => handleLocalFilterChange('is_bookmarked', e.target.value === '' ? undefined : e.target.value === 'true')}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '6px',
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText,
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">All Customers</option>
                <option value="true">Bookmarked Only</option>
                <option value="false">Not Bookmarked</option>
              </select>
            </div>

            {/* Bookmark Reason Filter (NEW) */}
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginBottom: '6px',
                fontSize: '14px',
                fontWeight: '500',
                color: colors.utility.primaryText
              }}>
                <StarIcon />
                Bookmark Reason
              </label>
              <select
                value={localFilters.bookmark_reason || ''}
                onChange={(e) => handleLocalFilterChange('bookmark_reason', e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '6px',
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText,
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">All Reasons</option>
                {bookmarkReasons?.map((reason) => (
                  <option key={reason.id} value={reason.reason_code}>
                    {reason.reason_label}
                  </option>
                ))}
              </select>
            </div>

            {/* Birthday Month */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '14px',
                fontWeight: '500',
                color: colors.utility.primaryText
              }}>
                Birthday Month
              </label>
              <select
                value={localFilters.birthday_month || ''}
                onChange={(e) => handleLocalFilterChange('birthday_month', e.target.value ? parseInt(e.target.value) : undefined)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '6px',
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText,
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">All Months</option>
                {monthOptions.map(month => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Anniversary Month */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '14px',
                fontWeight: '500',
                color: colors.utility.primaryText
              }}>
                Anniversary Month
              </label>
              <select
                value={localFilters.anniversary_month || ''}
                onChange={(e) => handleLocalFilterChange('anniversary_month', e.target.value ? parseInt(e.target.value) : undefined)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '6px',
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText,
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">All Months</option>
                {monthOptions.map(month => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Apply Filters Button */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: `1px solid ${colors.utility.primaryText}10`
          }}>
            {hasPendingChanges() && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                color: colors.semantic.warning,
                fontStyle: 'italic'
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                You have unsaved filter changes
              </div>
            )}
            <button
              onClick={handleApplyFilters}
              disabled={loading || !hasPendingChanges()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 20px',
                backgroundColor: hasPendingChanges() ? colors.brand.primary : colors.utility.primaryText + '20',
                color: hasPendingChanges() ? 'white' : colors.utility.secondaryText,
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: hasPendingChanges() ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                opacity: loading ? 0.6 : 1
              }}
            >
              <CheckIcon />
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Filter Summary - Show when collapsed with active filters */}
      {!isExpanded && hasActiveAdvancedFilters() && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: colors.brand.primary + '10',
          borderRadius: '8px',
          fontSize: '14px',
          color: colors.utility.secondaryText,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FilterIcon />
            <span>
              {activeFilterCount()} filter{activeFilterCount() !== 1 ? 's' : ''} active
            </span>
          </div>
          <button
            onClick={() => setIsExpanded(true)}
            style={{
              padding: '4px 8px',
              backgroundColor: 'transparent',
              color: colors.brand.primary,
              border: `1px solid ${colors.brand.primary}40`,
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            View Filters
          </button>
        </div>
      )}

      {/* CSS Animation */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            max-height: 0;
          }
          to {
            opacity: 1;
            max-height: 1000px;
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
};

export default CustomerFilters;