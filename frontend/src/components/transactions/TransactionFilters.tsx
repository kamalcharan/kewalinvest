// frontend/src/components/transactions/TransactionFilters.tsx

import React, { useState, useEffect } from 'react';
import { TransactionFilters as TransactionFiltersType } from '../../services/transaction.service';
import { useTheme } from '../../contexts/ThemeContext';

interface TransactionFiltersProps {
  onFiltersChange: (filters: TransactionFiltersType) => void;
  initialFilters?: TransactionFiltersType;
  loading?: boolean;
}

const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  onFiltersChange,
  initialFilters = {},
  loading = false
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Form state
  const [filters, setFilters] = useState<TransactionFiltersType>({
    page: 1,
    page_size: 100,
    sort_by: 'txn_date',
    sort_order: 'desc',
    ...initialFilters
  });

  // Local state for inputs
  const [customerSearch, setCustomerSearch] = useState('');
  const [schemeSearch, setSchemeSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Update parent when filters change
  useEffect(() => {
    onFiltersChange(filters);
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (key: keyof TransactionFiltersType, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value,
      page: 1 // Reset to first page when filters change
    }));
  };

  // Quick date filters
  const setQuickDateRange = (range: '7d' | '30d' | '3m' | '1y' | 'all') => {
    const today = new Date();
    let start: Date | null = null;

    switch (range) {
      case '7d':
        start = new Date(today);
        start.setDate(today.getDate() - 7);
        break;
      case '30d':
        start = new Date(today);
        start.setDate(today.getDate() - 30);
        break;
      case '3m':
        start = new Date(today);
        start.setMonth(today.getMonth() - 3);
        break;
      case '1y':
        start = new Date(today);
        start.setFullYear(today.getFullYear() - 1);
        break;
      case 'all':
        setStartDate('');
        setEndDate('');
        setFilters(prev => ({
          ...prev,
          start_date: undefined,
          end_date: undefined,
          page: 1
        }));
        return;
    }

    if (start) {
      const startStr = start.toISOString().split('T')[0];
      const endStr = today.toISOString().split('T')[0];
      setStartDate(startStr);
      setEndDate(endStr);
      setFilters(prev => ({
        ...prev,
        start_date: startStr,
        end_date: endStr,
        page: 1
      }));
    }
  };

  // Apply date range
  const applyDateRange = () => {
    setFilters(prev => ({
      ...prev,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      page: 1
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setCustomerSearch('');
    setSchemeSearch('');
    setStartDate('');
    setEndDate('');
    setFilters({
      page: 1,
      page_size: 100,
      sort_by: 'txn_date',
      sort_order: 'desc'
    });
  };

  // Check if any filters are active
  const hasActiveFilters = () => {
    return !!(
      filters.customer_id ||
      filters.customer_search ||
      filters.scheme_code ||
      filters.start_date ||
      filters.end_date ||
      filters.txn_type_id ||
      filters.import_session_id ||
      filters.is_potential_duplicate !== undefined ||
      filters.portfolio_flag !== undefined
    );
  };

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

  const CalendarIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );

  return (
    <div style={{
      backgroundColor: colors.utility.secondaryBackground,
      border: `1px solid ${colors.utility.primaryText}10`,
      borderRadius: '12px',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: '600',
          color: colors.utility.primaryText
        }}>
          <FilterIcon />
          Filter Transactions
        </div>

        {hasActiveFilters() && (
          <button
            onClick={clearFilters}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: colors.semantic.error + '20',
              color: colors.semantic.error,
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            <XIcon />
            Clear All
          </button>
        )}
      </div>

      {/* Filter Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '16px'
      }}>
        {/* Customer Search */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '12px',
            fontWeight: '500',
            color: colors.utility.primaryText,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Customer (Name or IWELL Code)
          </label>
          <div style={{ position: 'relative', display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
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
                placeholder="Search by name or IWELL code..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleFilterChange('customer_search', customerSearch);
                  }
                }}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 44px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '6px',
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText,
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
            <button
              onClick={() => handleFilterChange('customer_search', customerSearch)}
              disabled={loading}
              style={{
                padding: '10px 16px',
                backgroundColor: colors.brand.primary,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Search
            </button>
            {customerSearch && (
              <button
                onClick={() => {
                  setCustomerSearch('');
                  handleFilterChange('customer_search', undefined);
                }}
                disabled={loading}
                style={{
                  padding: '10px',
                  backgroundColor: colors.utility.secondaryBackground,
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: colors.utility.secondaryText
                }}
              >
                <XIcon />
              </button>
            )}
          </div>
        </div>

        {/* Scheme Search */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '12px',
            fontWeight: '500',
            color: colors.utility.primaryText,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Scheme
          </label>
          <div style={{ position: 'relative' }}>
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
              placeholder="Search by code or name..."
              value={schemeSearch}
              onChange={(e) => {
                setSchemeSearch(e.target.value);
                handleFilterChange('scheme_code', e.target.value || undefined);
              }}
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px 12px 10px 44px',
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '6px',
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText,
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Transaction Type */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '12px',
            fontWeight: '500',
            color: colors.utility.primaryText,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Transaction Type
          </label>
          <select
            value={filters.txn_type_id || ''}
            onChange={(e) => handleFilterChange('txn_type_id', e.target.value ? parseInt(e.target.value) : undefined)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '6px',
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
              fontSize: '14px',
              outline: 'none'
            }}
          >
            <option value="">All Types</option>
            <option value="1">Purchase (Addition)</option>
            <option value="2">Redemption (Deduction)</option>
          </select>
        </div>

        {/* Import Session */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '12px',
            fontWeight: '500',
            color: colors.utility.primaryText,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Import Session
          </label>
          <select
            value={filters.import_session_id || ''}
            onChange={(e) => handleFilterChange('import_session_id', e.target.value ? parseInt(e.target.value) : undefined)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '6px',
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
              fontSize: '14px',
              outline: 'none'
            }}
          >
            <option value="">All Sessions</option>
            {/* TODO: Populate from API call to get sessions */}
            {/* Example: importSessions.map(session => (
              <option key={session.id} value={session.id}>
                {session.name || `Session ${session.id}`}
              </option>
            )) */}
          </select>
        </div>
      </div>

      {/* Date Range */}
      <div style={{
        padding: '16px',
        backgroundColor: colors.utility.primaryBackground,
        borderRadius: '8px',
        marginBottom: '16px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
          fontSize: '12px',
          fontWeight: '500',
          color: colors.utility.primaryText,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          <CalendarIcon />
          Date Range
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '12px'
        }}>
          <div>
            <label style={{
              display: 'block',
              marginBottom: '4px',
              fontSize: '11px',
              color: colors.utility.secondaryText
            }}>
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '6px',
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.primaryText,
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              marginBottom: '4px',
              fontSize: '11px',
              color: colors.utility.secondaryText
            }}>
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '6px',
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.primaryText,
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Quick Date Filters */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px'
        }}>
          <span style={{
            fontSize: '11px',
            color: colors.utility.secondaryText,
            marginRight: '4px',
            alignSelf: 'center'
          }}>
            Quick:
          </span>
          {[
            { label: 'Last 7 days', value: '7d' as const },
            { label: 'Last 30 days', value: '30d' as const },
            { label: 'Last 3 months', value: '3m' as const },
            { label: 'Last year', value: '1y' as const },
            { label: 'All time', value: 'all' as const }
          ].map((quick) => (
            <button
              key={quick.value}
              onClick={() => setQuickDateRange(quick.value)}
              disabled={loading}
              style={{
                padding: '4px 10px',
                backgroundColor: colors.utility.secondaryBackground,
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '4px',
                fontSize: '11px',
                color: colors.utility.primaryText,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.brand.primary + '20';
                e.currentTarget.style.borderColor = colors.brand.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.utility.secondaryBackground;
                e.currentTarget.style.borderColor = colors.utility.primaryText + '20';
              }}
            >
              {quick.label}
            </button>
          ))}
        </div>

        {(startDate || endDate) && (
          <button
            onClick={applyDateRange}
            style={{
              width: '100%',
              marginTop: '12px',
              padding: '8px',
              backgroundColor: colors.brand.primary,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Apply Date Range
          </button>
        )}
      </div>

      {/* Status Filters */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          color: colors.utility.primaryText
        }}>
          <input
            type="checkbox"
            checked={filters.is_potential_duplicate === true}
            onChange={(e) => handleFilterChange('is_potential_duplicate', e.target.checked ? true : undefined)}
            disabled={loading}
            style={{
              width: '16px',
              height: '16px',
              cursor: 'pointer'
            }}
          />
          Show Duplicates Only
        </label>

        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          color: colors.utility.primaryText
        }}>
          <input
            type="checkbox"
            checked={filters.portfolio_flag === false}
            onChange={(e) => handleFilterChange('portfolio_flag', e.target.checked ? false : undefined)}
            disabled={loading}
            style={{
              width: '16px',
              height: '16px',
              cursor: 'pointer'
            }}
          />
          Excluded from Portfolio
        </label>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters() && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: colors.brand.primary + '10',
          borderRadius: '8px',
          fontSize: '12px',
          color: colors.utility.secondaryText,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <FilterIcon />
          <span>
            {Object.entries(filters).filter(([key, value]) =>
              value !== undefined && value !== '' &&
              key !== 'page' && key !== 'page_size' && key !== 'sort_by' && key !== 'sort_order'
            ).length} filter(s) active
          </span>
        </div>
      )}
    </div>
  );
};

export default TransactionFilters;