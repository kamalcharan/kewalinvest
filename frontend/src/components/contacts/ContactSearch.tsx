// frontend/src/components/contacts/ContactSearch.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useContactSearch, useContactStats } from '../../hooks/useContacts';
import { ContactSearchParams } from '../../types/contact.types';
import { CONTACT_PREFIXES, CHANNEL_TYPES, CONTACT_SORT_OPTIONS } from '../../constants/contact.constants';
import { debounce } from 'lodash';

interface ContactSearchProps {
  onSearchParamsChange: (params: ContactSearchParams) => void;
  currentParams: ContactSearchParams;
  showAdvancedFilters?: boolean;
  onToggleAdvanced?: () => void;
}

const ContactSearch: React.FC<ContactSearchProps> = ({
  onSearchParamsChange,
  currentParams,
  showAdvancedFilters = false,
  onToggleAdvanced
}) => {
  const { theme, isDarkMode } = useTheme();
  const [searchInput, setSearchInput] = useState(currentParams.search || '');
  const [showQuickSearch, setShowQuickSearch] = useState(false);
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Use ref to access current params in debounced function
  const currentParamsRef = useRef(currentParams);
  currentParamsRef.current = currentParams;

  // Get real-time search suggestions
  const { data: searchResults, isLoading: isSearching } = useContactSearch(
    searchInput,
    searchInput.length >= 2 && showQuickSearch
  );

  // Get stats for filter badges
  const { data: stats } = useContactStats();

  // FIXED: Debounced search function that doesn't depend on currentParams
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      onSearchParamsChange({
        ...currentParamsRef.current,
        search: query,
        page: 1 // Reset to first page when searching
      });
    }, 300),
    [onSearchParamsChange] // Only depend on the callback function
  );

  // Handle search input changes
  useEffect(() => {
    // Only trigger search if the input actually changed
    if (searchInput !== currentParams.search) {
      debouncedSearch(searchInput);
    }
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchInput]); // Remove debouncedSearch from deps since it's stable now

  // Handle filter changes
  const handleFilterChange = (key: keyof ContactSearchParams, value: any) => {
    onSearchParamsChange({
      ...currentParams,
      [key]: value,
      page: 1 // Reset pagination when filters change
    });
  };

  // Quick search selection
  const handleQuickSearchSelect = (contactName: string) => {
    setSearchInput(contactName);
    setShowQuickSearch(false);
    onSearchParamsChange({
      ...currentParams,
      search: contactName,
      page: 1
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchInput('');
    onSearchParamsChange({
      page: 1,
      page_size: currentParams.page_size || 50, // Changed from 20 to 50
      sort_by: 'name',
      sort_order: 'asc'
    });
  };

  // Count active filters for AI context
  const getActiveFilterCount = () => {
    let count = 0;
    if (currentParams.search) count++;
    if (currentParams.prefix) count++;
    if (currentParams.channel_type) count++;
    if (currentParams.has_customer !== undefined) count++;
    if (currentParams.is_active !== undefined) count++;
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

  const ChevronDownIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6,9 12,15 18,9" />
    </svg>
  );

  const TrendingUpIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" />
      <polyline points="17,6 23,6 23,12" />
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
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: '600',
          color: colors.utility.primaryText,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <SearchIcon />
          Search & Filter Contacts
          {activeFilterCount > 0 && (
            <span style={{
              backgroundColor: colors.brand.primary,
              color: 'white',
              borderRadius: '12px',
              padding: '2px 8px',
              fontSize: '12px',
              fontWeight: '500'
            }}>
              {activeFilterCount}
            </span>
          )}
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Quick Stats for AI Context */}
          {stats && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: colors.utility.secondaryText,
              fontSize: '12px'
            }}>
              <TrendingUpIcon />
              <span>{stats.total} total • {stats.active} active • {stats.customers} customers</span>
            </div>
          )}

          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              style={{
                backgroundColor: 'transparent',
                color: colors.semantic.error,
                border: `1px solid ${colors.semantic.error}40`,
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <XIcon />
              Clear All
            </button>
          )}

          {onToggleAdvanced && (
            <button
              onClick={onToggleAdvanced}
              style={{
                backgroundColor: showAdvancedFilters ? colors.brand.primary : 'transparent',
                color: showAdvancedFilters ? 'white' : colors.brand.primary,
                border: `1px solid ${colors.brand.primary}`,
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <FilterIcon />
              Advanced
            </button>
          )}
        </div>
      </div>

      {/* Main Search */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <div style={{ position: 'relative' }}>
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
            placeholder="Search by name, email, mobile number..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setShowQuickSearch(e.target.value.length >= 2);
            }}
            onFocus={(e) => {
              if (searchInput.length >= 2) {
                setShowQuickSearch(true);
              }
              e.target.style.borderColor = colors.brand.primary;
              e.target.style.boxShadow = `0 0 0 3px ${colors.brand.primary}20`;
            }}
            onBlur={(e) => {
              setTimeout(() => {
                setShowQuickSearch(false);
                e.target.style.borderColor = colors.utility.secondaryText + '40';
                e.target.style.boxShadow = 'none';
              }, 200);
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
              color: colors.utility.primaryText,
              boxSizing: 'border-box'
            }}
          />

          {/* Clear Search */}
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput('');
                setShowQuickSearch(false);
              }}
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
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <XIcon />
            </button>
          )}

          {/* Loading Indicator */}
          {isSearching && (
            <div style={{
              position: 'absolute',
              right: searchInput ? '44px' : '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '16px',
              height: '16px',
              border: `2px solid ${colors.brand.primary}20`,
              borderTop: `2px solid ${colors.brand.primary}`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          )}
        </div>

        {/* Quick Search Results */}
        {showQuickSearch && searchResults && searchResults.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: colors.utility.primaryBackground,
            border: `1px solid ${colors.utility.primaryText}20`,
            borderRadius: '8px',
            marginTop: '4px',
            maxHeight: '300px',
            overflowY: 'auto',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              padding: '8px 12px',
              fontSize: '12px',
              color: colors.utility.secondaryText,
              borderBottom: `1px solid ${colors.utility.primaryText}10`
            }}>
              Found {searchResults.length} contacts
            </div>
            {searchResults.slice(0, 5).map((contact) => (
              <div
                key={contact.id}
                onClick={() => handleQuickSearchSelect(contact.name)}
                style={{
                  padding: '12px',
                  cursor: 'pointer',
                  borderBottom: `1px solid ${colors.utility.primaryText}10`,
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.brand.primary + '10';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{
                  fontWeight: '500',
                  color: colors.utility.primaryText,
                  fontSize: '14px'
                }}>
                  {contact.prefix} {contact.name}
                </div>
                {contact.email && (
                  <div style={{
                    fontSize: '12px',
                    color: colors.utility.secondaryText,
                    marginTop: '2px'
                  }}>
                    {contact.email}
                  </div>
                )}
              </div>
            ))}
            {searchResults.length > 5 && (
              <div style={{
                padding: '8px 12px',
                fontSize: '12px',
                color: colors.utility.secondaryText,
                textAlign: 'center'
              }}>
                +{searchResults.length - 5} more results
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Filters */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginBottom: showAdvancedFilters ? '16px' : '0'
      }}>
        {/* Customer Status Filter */}
        <select
          value={currentParams.has_customer === undefined ? 'all' : 
                currentParams.has_customer ? 'true' : 'false'}
          onChange={(e) => {
            const value = e.target.value === 'all' ? undefined : e.target.value === 'true';
            handleFilterChange('has_customer', value);
          }}
          style={{
            backgroundColor: colors.utility.primaryBackground,
            color: colors.utility.primaryText,
            border: `1px solid ${colors.utility.secondaryText}40`,
            borderRadius: '6px',
            padding: '6px 8px',
            fontSize: '12px',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          <option value="all">All Contacts</option>
          <option value="true">Customers Only</option>
          <option value="false">Prospects Only</option>
        </select>

        {/* Active Status Filter */}
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
            borderRadius: '6px',
            padding: '6px 8px',
            fontSize: '12px',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          <option value="all">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>

        {/* Sort Options */}
        <select
          value={`${currentParams.sort_by || 'name'}_${currentParams.sort_order || 'asc'}`}
          onChange={(e) => {
            const [sort_by, sort_order] = e.target.value.split('_');
            handleFilterChange('sort_by', sort_by);
            handleFilterChange('sort_order', sort_order);
          }}
          style={{
            backgroundColor: colors.utility.primaryBackground,
            color: colors.utility.primaryText,
            border: `1px solid ${colors.utility.secondaryText}40`,
            borderRadius: '6px',
            padding: '6px 8px',
            fontSize: '12px',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          {CONTACT_SORT_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div style={{
          padding: '16px',
          backgroundColor: colors.utility.primaryBackground,
          borderRadius: '8px',
          border: `1px solid ${colors.utility.primaryText}10`
        }}>
          <h4 style={{
            margin: '0 0 12px 0',
            fontSize: '14px',
            fontWeight: '600',
            color: colors.utility.primaryText
          }}>
            Advanced Filters
          </h4>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px'
          }}>
            {/* Prefix Filter */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '500',
                marginBottom: '4px',
                color: colors.utility.primaryText
              }}>
                Prefix
              </label>
              <select
                value={currentParams.prefix || ''}
                onChange={(e) => handleFilterChange('prefix', e.target.value || undefined)}
                style={{
                  width: '100%',
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText,
                  border: `1px solid ${colors.utility.secondaryText}40`,
                  borderRadius: '6px',
                  padding: '8px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="">All Prefixes</option>
                {CONTACT_PREFIXES.map(prefix => (
                  <option key={prefix.value} value={prefix.value}>
                    {prefix.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Channel Type Filter */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '500',
                marginBottom: '4px',
                color: colors.utility.primaryText
              }}>
                Channel Type
              </label>
              <select
                value={currentParams.channel_type || ''}
                onChange={(e) => handleFilterChange('channel_type', e.target.value || undefined)}
                style={{
                  width: '100%',
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText,
                  border: `1px solid ${colors.utility.secondaryText}40`,
                  borderRadius: '6px',
                  padding: '8px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="">All Channels</option>
                {CHANNEL_TYPES.map(channel => (
                  <option key={channel.value} value={channel.value}>
                    {channel.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Page Size - REMOVED from advanced filters since it's in main page */}
          </div>
        </div>
      )}

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          0% { transform: translateY(-50%) rotate(0deg); }
          100% { transform: translateY(-50%) rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ContactSearch;