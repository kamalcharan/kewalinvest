// frontend/src/components/market/FilterBar.tsx
// Compact filter bar for Market Data

import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Search, X } from 'lucide-react';

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

  const [searchInput, setSearchInput] = useState(filters.search);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFilterChange({ ...filters, search: searchInput });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (filters.search !== searchInput) {
      setSearchInput(filters.search);
    }
  }, [filters.search]);

  const handleCategoryChange = useCallback((category: FilterState['category']) => {
    onFilterChange({ ...filters, category });
  }, [filters, onFilterChange]);

  const handleStatusChange = useCallback((status: FilterState['status']) => {
    onFilterChange({ ...filters, status });
  }, [filters, onFilterChange]);

  const categories = [
    { value: 'all' as const, label: 'All' },
    { value: 'broad' as const, label: 'Broad' },
    { value: 'sectoral' as const, label: 'Sectoral' },
    { value: 'thematic' as const, label: 'Thematic' }
  ];

  const statuses = [
    { value: 'all' as const, label: 'All', color: colors.utility.primaryText },
    { value: 'downloaded' as const, label: 'Downloaded', color: '#10B981' },
    { value: 'pending' as const, label: 'Pending', color: '#F59E0B' },
    { value: 'failed' as const, label: 'Failed', color: '#EF4444' }
  ];

  // Pill button style
  const getPillStyle = (isActive: boolean, color?: string) => ({
    padding: '6px 14px',
    fontSize: '13px',
    fontWeight: isActive ? '600' : '500',
    backgroundColor: isActive
      ? (color || colors.brand.primary)
      : (isDarkMode ? colors.utility.secondaryBackground : '#F1F5F9'),
    color: isActive ? '#FFF' : colors.utility.primaryText,
    border: 'none',
    borderRadius: '20px',
    cursor: isLoading ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s ease',
    opacity: isLoading ? 0.6 : 1
  });

  return (
    <div style={{
      backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
      borderRadius: '12px',
      border: `1px solid ${isDarkMode ? colors.utility.primaryText + '10' : '#E2E8F0'}`,
      boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
      padding: '16px 20px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        flexWrap: 'wrap'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', minWidth: '200px', flex: '0 1 280px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: colors.utility.secondaryText
            }}
          />
          <input
            type="text"
            placeholder="Search indices..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '8px 36px',
              border: `1px solid ${isDarkMode ? colors.utility.primaryText + '15' : '#E2E8F0'}`,
              borderRadius: '8px',
              backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F8FAFC',
              color: colors.utility.primaryText,
              fontSize: '13px',
              outline: 'none'
            }}
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput('');
                onFilterChange({ ...filters, search: '' });
              }}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: colors.utility.secondaryText,
                padding: '2px',
                display: 'flex'
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Divider */}
        <div style={{
          width: '1px',
          height: '24px',
          backgroundColor: isDarkMode ? colors.utility.primaryText + '15' : '#E2E8F0'
        }} />

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <span style={{
            fontSize: '12px',
            color: colors.utility.secondaryText,
            marginRight: '8px',
            fontWeight: '500'
          }}>
            Category:
          </span>
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => handleCategoryChange(cat.value)}
              disabled={isLoading}
              style={getPillStyle(filters.category === cat.value)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div style={{
          width: '1px',
          height: '24px',
          backgroundColor: isDarkMode ? colors.utility.primaryText + '15' : '#E2E8F0'
        }} />

        {/* Status Pills */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <span style={{
            fontSize: '12px',
            color: colors.utility.secondaryText,
            marginRight: '8px',
            fontWeight: '500'
          }}>
            Status:
          </span>
          {statuses.map((st) => (
            <button
              key={st.value}
              onClick={() => handleStatusChange(st.value)}
              disabled={isLoading}
              style={getPillStyle(filters.status === st.value, st.color)}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Results count - pushed to right */}
        <div style={{
          marginLeft: 'auto',
          fontSize: '13px',
          color: colors.utility.secondaryText
        }}>
          {isLoading ? 'Loading...' : (
            <><strong style={{ color: colors.utility.primaryText }}>{totalResults}</strong> indices</>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
