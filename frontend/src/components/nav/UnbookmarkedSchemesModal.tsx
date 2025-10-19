// frontend/src/components/nav/UnbookmarkedSchemesModal.tsx
// Full modal showing all unbookmarked schemes with sorting, filtering, and bulk actions

import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { navService } from '../../services/nav.service';
import { UnbookmarkedScheme } from '../../types/nav.types';

interface UnbookmarkedSchemesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

type FilterType = 'all' | 'critical' | 'warnings';
type SortField = 'scheme_name' | 'customer_count' | 'total_invested' | 'last_transaction_date';
type SortOrder = 'asc' | 'desc';

const UnbookmarkedSchemesModal: React.FC<UnbookmarkedSchemesModalProps> = ({
  isOpen,
  onClose,
  onRefresh
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [schemes, setSchemes] = useState<UnbookmarkedScheme[]>([]);
  const [filteredSchemes, setFilteredSchemes] = useState<UnbookmarkedScheme[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters and sorting
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('customer_count');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // Selection and bulk actions
  const [selectedSchemes, setSelectedSchemes] = useState<Set<string>>(new Set());
  const [bookmarking, setBookmarking] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Fetch all unbookmarked schemes
  const fetchSchemes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await navService.getBookmarkGaps({
        page: 1,
        page_size: 1000 // Get all schemes
      });

      if (response.success && response.data) {
        setSchemes(response.data || []);
      } else {
        setError(response.error || 'Failed to load schemes');
      }
    } catch (err: any) {
      console.error('Error fetching unbookmarked schemes:', err);
      setError(err.message || 'Failed to load schemes');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchSchemes();
      setSelectedSchemes(new Set());
      setCurrentPage(1);
    }
  }, [isOpen, fetchSchemes]);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...schemes];

    // Apply filter type
    if (filterType === 'critical') {
      filtered = filtered.filter(s => !s.exists_in_master);
    } else if (filterType === 'warnings') {
      filtered = filtered.filter(s => s.exists_in_master);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.scheme_name.toLowerCase().includes(query) ||
        s.scheme_code.toLowerCase().includes(query) ||
        (s.amc_name && s.amc_name.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === 'scheme_name') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (sortField === 'last_transaction_date') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredSchemes(filtered);
    setCurrentPage(1);
  }, [schemes, filterType, searchQuery, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredSchemes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSchemes = filteredSchemes.slice(startIndex, endIndex);

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const bookmarkableSchemes = currentSchemes
        .filter(s => s.exists_in_master)
        .map(s => s.scheme_code);
      setSelectedSchemes(new Set(bookmarkableSchemes));
    } else {
      setSelectedSchemes(new Set());
    }
  };

  const handleSelectScheme = (schemeCode: string, checked: boolean) => {
    const newSelected = new Set(selectedSchemes);
    if (checked) {
      newSelected.add(schemeCode);
    } else {
      newSelected.delete(schemeCode);
    }
    setSelectedSchemes(newSelected);
  };

  const isAllSelected = currentSchemes.filter(s => s.exists_in_master).length > 0 &&
    currentSchemes.filter(s => s.exists_in_master).every(s => selectedSchemes.has(s.scheme_code));

  // Bookmark selected schemes
  const handleBookmarkSelected = async () => {
    if (selectedSchemes.size === 0) return;

    try {
      setBookmarking(true);

      const schemeCodes = Array.from(selectedSchemes);
      const response = await navService.bulkBookmarkSchemes(schemeCodes);

      if (response.success) {
        alert(`Successfully bookmarked ${response.data?.success_count || 0} scheme(s)!`);
        setSelectedSchemes(new Set());
        await fetchSchemes();
        if (onRefresh) onRefresh();
      } else {
        alert(`Bookmark operation completed with errors: ${response.error}`);
      }
    } catch (err: any) {
      console.error('Error bookmarking schemes:', err);
      alert(`Failed to bookmark schemes: ${err.message}`);
    } finally {
      setBookmarking(false);
    }
  };

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Format currency
  const formatCurrency = (value: number): string => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    return `₹${value.toLocaleString('en-IN')}`;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  // Icons
  const XIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  const SearchIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );

  const SortIcon = ({ active, order }: { active: boolean; order?: 'asc' | 'desc' }) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" 
         style={{ opacity: active ? 1 : 0.3 }}>
      {!active || order === 'desc' ? (
        <polyline points="6 9 12 15 18 9" />
      ) : (
        <polyline points="6 15 12 9 18 15" />
      )}
    </svg>
  );

  const BookmarkPlusIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      <line x1="12" y1="7" x2="12" y2="13" />
      <line x1="9" y1="10" x2="15" y2="10" />
    </svg>
  );

  const RefreshIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '95%',
        maxWidth: '1400px',
        maxHeight: '90vh',
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        zIndex: 1001,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: `1px solid ${colors.utility.primaryText}10`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: colors.utility.primaryText,
              margin: 0,
              marginBottom: '8px'
            }}>
              Unbookmarked Schemes
            </h2>
            <p style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              margin: 0
            }}>
              {filteredSchemes.length} scheme{filteredSchemes.length !== 1 ? 's' : ''} found
              {selectedSchemes.size > 0 && ` • ${selectedSchemes.size} selected`}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.utility.primaryText + '10'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.utility.primaryBackground}
          >
            <XIcon />
          </button>
        </div>

        {/* Filters and Actions */}
        <div style={{
          padding: '20px 24px',
          borderBottom: `1px solid ${colors.utility.primaryText}10`,
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { key: 'all', label: 'All Schemes', count: schemes.length },
              { key: 'critical', label: 'Critical Only', count: schemes.filter(s => !s.exists_in_master).length },
              { key: 'warnings', label: 'Warnings Only', count: schemes.filter(s => s.exists_in_master).length }
            ].map(filter => (
              <button
                key={filter.key}
                onClick={() => setFilterType(filter.key as FilterType)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: filterType === filter.key ? colors.brand.primary : 'transparent',
                  color: filterType === filter.key ? 'white' : colors.utility.primaryText,
                  border: `1px solid ${filterType === filter.key ? colors.brand.primary : colors.utility.primaryText + '20'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {filter.label}
                <span style={{
                  backgroundColor: filterType === filter.key ? 'rgba(255,255,255,0.2)' : colors.utility.primaryText + '10',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '600'
                }}>
                  {filter.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ flex: 1, minWidth: '250px', maxWidth: '400px', position: 'relative' }}>
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
              placeholder="Search by scheme name, code, or AMC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                backgroundColor: colors.utility.primaryBackground,
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '8px',
                color: colors.utility.primaryText,
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
            <button
              onClick={fetchSchemes}
              disabled={loading}
              style={{
                padding: '10px 16px',
                backgroundColor: colors.utility.primaryBackground,
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '8px',
                color: colors.utility.primaryText,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: loading ? 0.6 : 1
              }}
            >
              <RefreshIcon /> Refresh
            </button>
            <button
              onClick={handleBookmarkSelected}
              disabled={selectedSchemes.size === 0 || bookmarking}
              style={{
                padding: '10px 20px',
                backgroundColor: colors.semantic.success,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: selectedSchemes.size === 0 || bookmarking ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: selectedSchemes.size === 0 || bookmarking ? 0.6 : 1
              }}
            >
              <BookmarkPlusIcon />
              {bookmarking ? 'Bookmarking...' : `Bookmark Selected (${selectedSchemes.size})`}
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {loading ? (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '60px',
              gap: '16px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: `4px solid ${colors.brand.primary}20`,
                borderTop: `4px solid ${colors.brand.primary}`,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <div style={{ fontSize: '14px', color: colors.utility.secondaryText }}>
                Loading schemes...
              </div>
            </div>
          ) : error ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px',
              color: colors.semantic.error
            }}>
              <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                Failed to Load Schemes
              </div>
              <div style={{ fontSize: '14px', marginBottom: '20px' }}>
                {error}
              </div>
              <button
                onClick={fetchSchemes}
                style={{
                  padding: '10px 20px',
                  backgroundColor: colors.semantic.error,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Retry
              </button>
            </div>
          ) : filteredSchemes.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px',
              color: colors.utility.secondaryText
            }}>
              <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                No Schemes Found
              </div>
              <div style={{ fontSize: '14px' }}>
                {searchQuery ? 'Try adjusting your search query or filters' : 'All schemes are bookmarked!'}
              </div>
            </div>
          ) : (
            <>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                fontSize: '13px'
              }}>
                <thead>
                  <tr style={{ 
                    borderBottom: `2px solid ${colors.utility.primaryText}20`,
                    backgroundColor: colors.utility.primaryBackground
                  }}>
                    <th style={{ 
                      padding: '12px 16px', 
                      textAlign: 'left',
                      width: '40px'
                    }}>
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                    </th>
                    <th 
                      onClick={() => handleSort('scheme_name')}
                      style={{ 
                        padding: '12px 16px', 
                        textAlign: 'left',
                        color: colors.utility.secondaryText,
                        fontWeight: '600',
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        SCHEME NAME
                        <SortIcon active={sortField === 'scheme_name'} order={sortOrder} />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('customer_count')}
                      style={{ 
                        padding: '12px 16px', 
                        textAlign: 'right',
                        color: colors.utility.secondaryText,
                        fontWeight: '600',
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        width: '120px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        CUSTOMERS
                        <SortIcon active={sortField === 'customer_count'} order={sortOrder} />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('total_invested')}
                      style={{ 
                        padding: '12px 16px', 
                        textAlign: 'right',
                        color: colors.utility.secondaryText,
                        fontWeight: '600',
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        width: '140px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        INVESTED
                        <SortIcon active={sortField === 'total_invested'} order={sortOrder} />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('last_transaction_date')}
                      style={{ 
                        padding: '12px 16px', 
                        textAlign: 'right',
                        color: colors.utility.secondaryText,
                        fontWeight: '600',
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        width: '140px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        LAST TXN
                        <SortIcon active={sortField === 'last_transaction_date'} order={sortOrder} />
                      </div>
                    </th>
                    <th style={{ 
                      padding: '12px 16px', 
                      textAlign: 'center',
                      color: colors.utility.secondaryText,
                      fontWeight: '600',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      width: '120px'
                    }}>
                      STATUS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentSchemes.map((scheme, idx) => {
                    const isBookmarkable = scheme.exists_in_master;
                    const isSelected = selectedSchemes.has(scheme.scheme_code);

                    return (
                      <tr 
                        key={idx}
                        style={{ 
                          borderBottom: `1px solid ${colors.utility.primaryText}10`,
                          backgroundColor: isSelected ? colors.brand.primary + '08' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!isBookmarkable}
                            onChange={(e) => handleSelectScheme(scheme.scheme_code, e.target.checked)}
                            style={{ 
                              cursor: isBookmarkable ? 'pointer' : 'not-allowed', 
                              width: '16px', 
                              height: '16px',
                              opacity: isBookmarkable ? 1 : 0.3
                            }}
                          />
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ 
                            fontWeight: '500', 
                            color: colors.utility.primaryText,
                            marginBottom: '4px'
                          }}>
                            {scheme.scheme_name}
                          </div>
                          <div style={{ 
                            fontSize: '11px', 
                            color: colors.utility.secondaryText 
                          }}>
                            {scheme.scheme_code}
                            {scheme.amc_name && ` • ${scheme.amc_name}`}
                          </div>
                        </td>
                        <td style={{ 
                          padding: '12px 16px', 
                          textAlign: 'right',
                          color: colors.utility.primaryText,
                          fontWeight: '600'
                        }}>
                          {scheme.customer_count}
                        </td>
                        <td style={{ 
                          padding: '12px 16px', 
                          textAlign: 'right',
                          color: colors.utility.primaryText,
                          fontWeight: '600'
                        }}>
                          {formatCurrency(scheme.total_invested)}
                        </td>
                        <td style={{ 
                          padding: '12px 16px', 
                          textAlign: 'right',
                          color: colors.utility.secondaryText,
                          fontSize: '12px'
                        }}>
                          {formatDate(scheme.last_transaction_date)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 10px',
                            backgroundColor: !scheme.exists_in_master 
                              ? colors.semantic.error + '20' 
                              : colors.semantic.warning + '20',
                            color: !scheme.exists_in_master 
                              ? colors.semantic.error 
                              : colors.semantic.warning,
                            borderRadius: '6px',
                            fontSize: '10px',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            whiteSpace: 'nowrap'
                          }}>
                            {!scheme.exists_in_master ? 'Not in Master' : 'Not Bookmarked'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '24px',
                  paddingTop: '24px',
                  borderTop: `1px solid ${colors.utility.primaryText}10`
                }}>
                  <div style={{ fontSize: '13px', color: colors.utility.secondaryText }}>
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredSchemes.length)} of {filteredSchemes.length}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: colors.utility.primaryBackground,
                        border: `1px solid ${colors.utility.primaryText}20`,
                        borderRadius: '6px',
                        color: colors.utility.primaryText,
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        opacity: currentPage === 1 ? 0.5 : 1
                      }}
                    >
                      Previous
                    </button>
                    <div style={{
                      padding: '8px 16px',
                      backgroundColor: colors.brand.primary + '10',
                      border: `1px solid ${colors.brand.primary}30`,
                      borderRadius: '6px',
                      color: colors.brand.primary,
                      fontSize: '13px',
                      fontWeight: '600'
                    }}>
                      Page {currentPage} of {totalPages}
                    </div>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: colors.utility.primaryBackground,
                        border: `1px solid ${colors.utility.primaryText}20`,
                        borderRadius: '6px',
                        color: colors.utility.primaryText,
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        opacity: currentPage === totalPages ? 0.5 : 1
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default UnbookmarkedSchemesModal;