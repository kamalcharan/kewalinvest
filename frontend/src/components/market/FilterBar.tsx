// frontend/src/components/market/FilterBar.tsx
// Filter and search bar for Market Data

import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Search } from 'lucide-react';

export interface FilterState {
  category: 'all' | 'broad' | 'sectoral' | 'thematic';
  status: 'all' | 'downloaded' | 'pending' | 'failed';
  search: string;
}

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  totalResults: number;
  isLoading?: boolean;
}

const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  totalResults,
  isLoading = false
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Local search state for debouncing
  const [searchInput, setSearchInput] = useState(filters.search);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFilterChange({ ...filters, search: searchInput });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Sync with external filter changes
  useEffect(() => {
    if (filters.search !== searchInput) {
      setSearchInput(filters.search);
    }
  }, [filters.search]);

  // Handle category change
  const handleCategoryChange = useCallback((category: FilterState['category']) => {
    onFilterChange({ ...filters, category });
  }, [filters, onFilterChange]);

  // Handle status change
  const handleStatusChange = useCallback((status: FilterState['status']) => {
    onFilterChange({ ...filters, status });
  }, [filters, onFilterChange]);

  // Handle search input change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  }, []);

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    onFilterChange({ ...filters, search: '' });
  }, [filters, onFilterChange]);

  // Category buttons configuration
  const categoryButtons = [
    { value: 'all' as const, label: 'All Categories', icon: '📊' },
    { value: 'broad' as const, label: 'Broad Market', icon: '🏛️' },
    { value: 'sectoral' as const, label: 'Sectoral', icon: '🏭' },
    { value: 'thematic' as const, label: 'Thematic', icon: '🎯' }
  ];

  // Status buttons configuration
  const statusButtons = [
    { value: 'all' as const, label: 'All Status', icon: '📋' },
    { value: 'downloaded' as const, label: 'Downloaded', icon: '✅', color: colors.semantic.success },
    { value: 'pending' as const, label: 'Pending', icon: '⏳', color: colors.semantic.warning },
    { value: 'failed' as const, label: 'Failed', icon: '❌', color: colors.semantic.error }
  ];

  return (
    <div style={{
      backgroundColor: colors.utility.secondaryBackground,
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '24px',
      border: `1px solid ${colors.utility.primaryText}10`
    }}>
      {/* Header with result count */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: colors.utility.primaryText,
          margin: 0
        }}>
          Filters
        </h3>
        <div style={{
          fontSize: '14px',
          color: colors.utility.secondaryText,
          fontWeight: '500'
        }}>
          {isLoading ? (
            'Loading...'
          ) : (
            <>
              Showing <strong style={{ color: colors.brand.primary }}>{totalResults}</strong> {totalResults === 1 ? 'index' : 'indices'}
            </>
          )}
        </div>
      </div>

      {/* Category Filters */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: '600',
          color: colors.utility.secondaryText,
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Category
        </label>
        <div style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          {categoryButtons.map((button) => (
            <button
              key={button.value}
              onClick={() => handleCategoryChange(button.value)}
              disabled={isLoading}
              style={{
                padding: '8px 16px',
                backgroundColor: filters.category === button.value
                  ? colors.brand.primary
                  : 'transparent',
                color: filters.category === button.value
                  ? 'white'
                  : colors.utility.primaryText,
                border: `1px solid ${filters.category === button.value
                  ? colors.brand.primary
                  : colors.utility.primaryText + '30'}`,
                borderRadius: '6px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: isLoading ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!isLoading && filters.category !== button.value) {
                  e.currentTarget.style.backgroundColor = colors.brand.primary + '10';
                  e.currentTarget.style.borderColor = colors.brand.primary + '50';
                }
              }}
              onMouseLeave={(e) => {
                if (filters.category !== button.value) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = colors.utility.primaryText + '30';
                }
              }}
            >
              <span>{button.icon}</span>
              <span>{button.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Status Filters */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: '600',
          color: colors.utility.secondaryText,
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Status
        </label>
        <div style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          {statusButtons.map((button) => {
            const isActive = filters.status === button.value;
            const buttonColor = button.color || colors.brand.primary;

            return (
              <button
                key={button.value}
                onClick={() => handleStatusChange(button.value)}
                disabled={isLoading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: isActive
                    ? buttonColor
                    : 'transparent',
                  color: isActive
                    ? 'white'
                    : colors.utility.primaryText,
                  border: `1px solid ${isActive
                    ? buttonColor
                    : colors.utility.primaryText + '30'}`,
                  borderRadius: '6px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: isLoading ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!isLoading && !isActive) {
                    e.currentTarget.style.backgroundColor = buttonColor + '10';
                    e.currentTarget.style.borderColor = buttonColor + '50';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = colors.utility.primaryText + '30';
                  }
                }}
              >
                <span>{button.icon}</span>
                <span>{button.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Input */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: '600',
          color: colors.utility.secondaryText,
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Search
        </label>
        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: colors.utility.secondaryText,
            pointerEvents: 'none'
          }}>
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Search by index name or code..."
            value={searchInput}
            onChange={handleSearchChange}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '10px 40px 10px 40px',
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '8px',
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s ease',
              opacity: isLoading ? 0.6 : 1,
              cursor: isLoading ? 'not-allowed' : 'text'
            }}
            onFocus={(e) => {
              if (!isLoading) {
                e.currentTarget.style.borderColor = colors.brand.primary + '50';
              }
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = colors.utility.primaryText + '20';
            }}
          />
          {searchInput && (
            <button
              onClick={handleClearSearch}
              disabled={isLoading}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: colors.utility.secondaryText,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                transition: 'all 0.2s ease',
                opacity: isLoading ? 0.4 : 1
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = colors.utility.secondaryText + '20';
                  e.currentTarget.style.color = colors.semantic.error;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = colors.utility.secondaryText;
              }}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Active Filters Summary */}
      {(filters.category !== 'all' || filters.status !== 'all' || filters.search) && (
        <div style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: `1px solid ${colors.utility.primaryText}10`,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          <span style={{
            fontSize: '12px',
            color: colors.utility.secondaryText,
            fontWeight: '600'
          }}>
            Active:
          </span>
          {filters.category !== 'all' && (
            <span style={{
              padding: '4px 8px',
              backgroundColor: colors.brand.primary + '10',
              color: colors.brand.primary,
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '500'
            }}>
              {categoryButtons.find(b => b.value === filters.category)?.label}
            </span>
          )}
          {filters.status !== 'all' && (
            <span style={{
              padding: '4px 8px',
              backgroundColor: (statusButtons.find(b => b.value === filters.status)?.color || colors.brand.primary) + '10',
              color: statusButtons.find(b => b.value === filters.status)?.color || colors.brand.primary,
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '500'
            }}>
              {statusButtons.find(b => b.value === filters.status)?.label}
            </span>
          )}
          {filters.search && (
            <span style={{
              padding: '4px 8px',
              backgroundColor: colors.utility.secondaryBackground,
              color: colors.utility.primaryText,
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '500'
            }}>
              "{filters.search}"
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterBar;