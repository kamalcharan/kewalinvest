// frontend/src/components/customers/CustomerFilters.tsx

import React, { useState, useEffect } from 'react';
import { CustomerSearchParams, SurvivalStatus, OnboardingStatus } from '../../types/customer.types';
import { useTheme } from '../../contexts/ThemeContext';

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

  // Form state
  const [filters, setFilters] = useState<CustomerSearchParams>({
    search: '',
    sort_by: 'name',
    sort_order: 'asc',
    survival_status: undefined,
    onboarding_status: undefined,
    has_address: undefined,
    has_pan: undefined,
    birthday_month: undefined,
    anniversary_month: undefined,
    page: 1,
    page_size: 20,
    ...initialFilters
  });

  // Update parent when filters change
  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  // Handle filter changes
  const handleFilterChange = (key: keyof CustomerSearchParams, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value,
      page: 1 // Reset to first page when filters change
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      search: '',
      sort_by: 'name',
      sort_order: 'asc',
      survival_status: undefined,
      onboarding_status: undefined,
      has_address: undefined,
      has_pan: undefined,
      birthday_month: undefined,
      anniversary_month: undefined,
      page: 1,
      page_size: 20
    });
  };

  // Check if any filters are active
  const hasActiveFilters = () => {
    return !!(
      filters.search ||
      filters.survival_status ||
      filters.onboarding_status ||
      filters.has_address !== undefined ||
      filters.has_pan !== undefined ||
      filters.birthday_month ||
      filters.anniversary_month
    );
  };

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

  return (
    <div style={{
      backgroundColor: colors.utility.secondaryBackground,
      border: `1px solid ${colors.utility.primaryText}10`,
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '20px'
    }}>
      {/* Search and Quick Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '16px'
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
            placeholder="Search customers by name, email, mobile, PAN, or IWell code..."
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 12px 12px 44px',
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '8px',
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = colors.brand.primary}
            onBlur={(e) => e.target.style.borderColor = colors.utility.primaryText + '20'}
          />
        </div>

        {/* Sort Options */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SortIcon />
          <select
            value={filters.sort_by || 'name'}
            onChange={(e) => handleFilterChange('sort_by', e.target.value)}
            disabled={loading}
            style={{
              padding: '8px 12px',
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '6px',
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
              fontSize: '14px',
              outline: 'none'
            }}
          >
            <option value="name">Name</option>
            <option value="created_at">Created Date</option>
            <option value="updated_at">Updated Date</option>
            <option value="date_of_birth">Birth Date</option>
            <option value="anniversary_date">Anniversary</option>
          </select>

          <select
            value={filters.sort_order || 'asc'}
            onChange={(e) => handleFilterChange('sort_order', e.target.value as 'asc' | 'desc')}
            disabled={loading}
            style={{
              padding: '8px 12px',
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '6px',
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
              fontSize: '14px',
              outline: 'none'
            }}
          >
            <option value="asc">A-Z</option>
            <option value="desc">Z-A</option>
          </select>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters() && (
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
              transition: 'all 0.2s ease'
            }}
          >
            <XIcon />
            Clear All
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        paddingTop: '16px',
        borderTop: `1px solid ${colors.utility.primaryText}10`
      }}>
        {/* Survival Status */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '14px',
            fontWeight: '500',
            color: colors.utility.primaryText
          }}>
            Status
          </label>
          <select
            value={filters.survival_status || ''}
            onChange={(e) => handleFilterChange('survival_status', e.target.value as SurvivalStatus)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '6px',
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
              fontSize: '14px',
              outline: 'none'
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
            value={filters.onboarding_status || ''}
            onChange={(e) => handleFilterChange('onboarding_status', e.target.value as OnboardingStatus)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '6px',
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
              fontSize: '14px',
              outline: 'none'
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
            value={filters.has_address === undefined ? '' : filters.has_address.toString()}
            onChange={(e) => handleFilterChange('has_address', e.target.value === '' ? undefined : e.target.value === 'true')}
            disabled={loading}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '6px',
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
              fontSize: '14px',
              outline: 'none'
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
            value={filters.has_pan === undefined ? '' : filters.has_pan.toString()}
            onChange={(e) => handleFilterChange('has_pan', e.target.value === '' ? undefined : e.target.value === 'true')}
            disabled={loading}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '6px',
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
              fontSize: '14px',
              outline: 'none'
            }}
          >
            <option value="">All Customers</option>
            <option value="true">With PAN</option>
            <option value="false">Without PAN</option>
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
            value={filters.birthday_month || ''}
            onChange={(e) => handleFilterChange('birthday_month', e.target.value ? parseInt(e.target.value) : undefined)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '6px',
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
              fontSize: '14px',
              outline: 'none'
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
            value={filters.anniversary_month || ''}
            onChange={(e) => handleFilterChange('anniversary_month', e.target.value ? parseInt(e.target.value) : undefined)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '6px',
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
              fontSize: '14px',
              outline: 'none'
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

      {/* Filter Summary */}
      {hasActiveFilters() && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: colors.brand.primary + '10',
          borderRadius: '8px',
          fontSize: '14px',
          color: colors.utility.secondaryText,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <FilterIcon />
          <span>
            {Object.entries(filters).filter(([key, value]) => 
              value !== undefined && value !== '' && key !== 'page' && key !== 'page_size' && key !== 'sort_by' && key !== 'sort_order'
            ).length} filter(s) active
          </span>
        </div>
      )}
    </div>
  );
};

export default CustomerFilters;