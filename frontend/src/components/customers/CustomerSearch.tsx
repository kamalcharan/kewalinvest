// frontend/src/components/customers/CustomerSearch.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { CustomerSearchParams } from '../../types/customer.types';
import { debounce } from 'lodash';

interface CustomerSearchProps {
  onSearchParamsChange: (params: CustomerSearchParams) => void;
  currentParams: CustomerSearchParams;
}

const CustomerSearch: React.FC<CustomerSearchProps> = ({
  onSearchParamsChange,
  currentParams
}) => {
  const { theme, isDarkMode } = useTheme();
  const [searchInput, setSearchInput] = useState(currentParams.search || '');
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Use ref to access current params in debounced function
  const currentParamsRef = useRef(currentParams);
  currentParamsRef.current = currentParams;

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      onSearchParamsChange({
        ...currentParamsRef.current,
        search: query,
        page: 1 // Reset to first page when searching
      });
    }, 300),
    [onSearchParamsChange]
  );

  // Handle search input changes
  useEffect(() => {
    if (searchInput !== currentParams.search) {
      debouncedSearch(searchInput);
    }
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchInput]);

  // Handle filter changes
  const handleFilterChange = (key: keyof CustomerSearchParams, value: any) => {
    onSearchParamsChange({
      ...currentParams,
      [key]: value,
      page: 1
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchInput('');
    onSearchParamsChange({
      page: 1,
      page_size: currentParams.page_size || 20,
      sort_by: 'c.name',
      sort_order: 'asc'
    });
  };

  // Count active filters
  const getActiveFilterCount = () => {
    let count = 0;
    if (currentParams.search) count++;
    if (currentParams.is_active !== undefined) count++;
    if (currentParams.survival_status) count++;
    if (currentParams.onboarding_status) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  // Icons
  const SearchIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
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
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '20px',
      border: `1px solid ${colors.utility.primaryText}10`
    }}>
      {/* Search Bar and Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        {/* Main Search Input */}
        <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
          <div style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: colors.utility.secondaryText,
            zIndex: 1
          }}>
            <SearchIcon />
          </div>
          
          <input
            type="text"
            placeholder="Search by name, email, mobile, PAN, or IWell code..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onFocus={(e) => {
              e.target.style.borderColor = colors.brand.primary;
              e.target.style.boxShadow = `0 0 0 3px ${colors.brand.primary}20`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = colors.utility.secondaryText + '40';
              e.target.style.boxShadow = 'none';
            }}
            style={{
              width: '100%',
              paddingLeft: '44px',
              paddingRight: searchInput ? '44px' : '12px',
              paddingTop: '12px',
              paddingBottom: '12px',
              border: `1px solid ${colors.utility.secondaryText}40`,
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              transition: 'all 0.2s',
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText
            }}
          />

          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: colors.utility.secondaryText,
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <XIcon />
            </button>
          )}
        </div>

        {/* Active/Inactive Filter */}
        <select
          value={currentParams.is_active === undefined ? 'all' : 
                currentParams.is_active ? 'true' : 'false'}
          onChange={(e) => {
            const value = e.target.value === 'all' ? undefined : e.target.value === 'true';
            handleFilterChange('is_active', value);
          }}
          style={{
            backgroundColor: colors.utility.primaryBackground,
            color: colors.utility.primaryText,
            border: `1px solid ${colors.utility.secondaryText}40`,
            borderRadius: '8px',
            padding: '12px',
            fontSize: '14px',
            cursor: 'pointer',
            outline: 'none',
            minWidth: '140px'
          }}
        >
          <option value="all">All Status</option>
          <option value="true">Active Only</option>
          <option value="false">Inactive Only</option>
        </select>

        {/* Sort By */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SortIcon />
          <select
            value={currentParams.sort_by || 'c.name'}
            onChange={(e) => handleFilterChange('sort_by', e.target.value)}
            style={{
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
              border: `1px solid ${colors.utility.secondaryText}40`,
              borderRadius: '8px',
              padding: '12px',
              fontSize: '14px',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="c.name">Name</option>
            <option value="cust.created_at">Created Date</option>
            <option value="cust.updated_at">Updated Date</option>
            <option value="cust.date_of_birth">Birth Date</option>
          </select>

          <select
            value={currentParams.sort_order || 'asc'}
            onChange={(e) => handleFilterChange('sort_order', e.target.value as 'asc' | 'desc')}
            style={{
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
              border: `1px solid ${colors.utility.secondaryText}40`,
              borderRadius: '8px',
              padding: '12px',
              fontSize: '14px',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="asc">A-Z</option>
            <option value="desc">Z-A</option>
          </select>
        </div>

        {/* Clear Filters */}
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            style={{
              backgroundColor: 'transparent',
              color: colors.semantic.error,
              border: `1px solid ${colors.semantic.error}40`,
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            <XIcon />
            Clear ({activeFilterCount})
          </button>
        )}
      </div>
    </div>
  );
};

export default CustomerSearch;