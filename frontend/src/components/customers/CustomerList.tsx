// frontend/src/components/customers/CustomerList.tsx

import React, { useState, useCallback, useMemo } from 'react';
import { useCustomers, useDeleteCustomer } from '../../hooks/useCustomers';
import { CustomerSearchParams, CustomerWithContact } from '../../types/customer.types';
import { useTheme } from '../../contexts/ThemeContext';
import CustomerCard from './CustomerCard';
import CustomerFilters from './CustomerFilters';
import toastService from '../../services/toast.service';

interface CustomerListProps {
  onCustomerSelect?: (customer: CustomerWithContact) => void;
  onCreateCustomer?: () => void;
  onEditCustomer?: (customerId: number) => void;
  onViewCustomer?: (customerId: number) => void;
  enableBulkActions?: boolean;
  enableSelection?: boolean;
}

const CustomerList: React.FC<CustomerListProps> = ({
  onCustomerSelect,
  onCreateCustomer,
  onEditCustomer,
  onViewCustomer,
  enableBulkActions = true,
  enableSelection = false
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // State management
  const [searchParams, setSearchParams] = useState<CustomerSearchParams>({
    page: 1,
    page_size: 20,
    sort_by: 'name',
    sort_order: 'asc'
  });
  const [selectedCustomers, setSelectedCustomers] = useState<Set<number>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Hooks
  const { data: customerData, isLoading, error, refetch } = useCustomers(searchParams);
  const deleteCustomerMutation = useDeleteCustomer();

  // Memoized values
  const customers = useMemo(() => customerData?.customers || [], [customerData]);
  const totalCount = useMemo(() => customerData?.total || 0, [customerData]);
  const hasNextPage = useMemo(() => customerData?.has_next || false, [customerData]);
  const hasPrevPage = useMemo(() => customerData?.has_prev || false, [customerData]);
  const totalPages = useMemo(() => customerData?.total_pages || 1, [customerData]);

  // Event handlers
  const handleFiltersChange = useCallback((newFilters: CustomerSearchParams) => {
    setSearchParams(prev => ({
      ...prev,
      ...newFilters,
      page: newFilters.page || 1
    }));
    setSelectedCustomers(new Set()); // Clear selection when filters change
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setSearchParams(prev => ({ ...prev, page: newPage }));
    setSelectedCustomers(new Set()); // Clear selection when page changes
  }, []);

  const handleCustomerSelection = useCallback((customerId: number, selected: boolean) => {
    setSelectedCustomers(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(customerId);
      } else {
        newSet.delete(customerId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedCustomers(new Set(customers.map(c => c.id)));
    } else {
      setSelectedCustomers(new Set());
    }
  }, [customers]);

  const handleDeleteCustomer = useCallback(async (customerId: number) => {
    try {
      await deleteCustomerMutation.mutateAsync(customerId);
      setSelectedCustomers(prev => {
        const newSet = new Set(prev);
        newSet.delete(customerId);
        return newSet;
      });
    } catch (error) {
      console.error('Failed to delete customer:', error);
    }
  }, [deleteCustomerMutation]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedCustomers.size === 0) return;

    const confirmed = window.confirm(
      `Delete ${selectedCustomers.size} selected customer(s)? This action cannot be undone.`
    );
    
    if (!confirmed) return;

    setBulkActionLoading(true);
    try {
      const deletePromises = Array.from(selectedCustomers).map(id => 
        deleteCustomerMutation.mutateAsync(id)
      );
      
      await Promise.all(deletePromises);
      setSelectedCustomers(new Set());
      toastService.success(`Successfully deleted ${selectedCustomers.size} customer(s)`);
    } catch (error) {
      toastService.error('Some customers could not be deleted');
      console.error('Bulk delete error:', error);
    } finally {
      setBulkActionLoading(false);
    }
  }, [selectedCustomers, deleteCustomerMutation]);

  // Icons
  const PlusIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );

  const RefreshIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23,4 23,10 17,10" />
      <polyline points="1,20 1,14 7,14" />
      <path d="m20.49,9a9,9 0 1 1-2.13-5.36l4.64,4.36" />
    </svg>
  );

  const TrashIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3,6 5,6 21,6" />
      <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" />
    </svg>
  );

  const ChevronLeftIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15,18 9,12 15,6" />
    </svg>
  );

  const ChevronRightIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9,18 15,12 9,6" />
    </svg>
  );

  const allSelected = customers.length > 0 && selectedCustomers.size === customers.length;
  const someSelected = selectedCustomers.size > 0 && selectedCustomers.size < customers.length;

  if (error) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        backgroundColor: colors.semantic.error + '10',
        borderRadius: '12px',
        color: colors.semantic.error
      }}>
        <p style={{ marginBottom: '16px' }}>Failed to load customers</p>
        <button
          onClick={() => refetch()}
          style={{
            padding: '8px 16px',
            backgroundColor: colors.semantic.error,
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: colors.utility.primaryText,
            margin: '0 0 8px 0'
          }}>
            Customers
          </h1>
          <p style={{
            fontSize: '16px',
            color: colors.utility.secondaryText,
            margin: 0
          }}>
            {isLoading ? 'Loading...' : `${totalCount} customer${totalCount !== 1 ? 's' : ''} found`}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Bulk Actions */}
          {enableBulkActions && selectedCustomers.size > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: colors.brand.primary + '10',
              borderRadius: '8px',
              fontSize: '14px',
              color: colors.brand.primary
            }}>
              <span>{selectedCustomers.size} selected</span>
              <button
                onClick={handleBulkDelete}
                disabled={bulkActionLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  backgroundColor: colors.semantic.error,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  opacity: bulkActionLoading ? 0.6 : 1
                }}
              >
                <TrashIcon />
                Delete
              </button>
            </div>
          )}

          {/* Refresh Button */}
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              backgroundColor: 'transparent',
              color: colors.utility.secondaryText,
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              opacity: isLoading ? 0.6 : 1
            }}
          >
            <RefreshIcon />
            Refresh
          </button>

          {/* Create Customer Button */}
          {onCreateCustomer && (
            <button
              onClick={onCreateCustomer}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                backgroundColor: colors.brand.primary,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              <PlusIcon />
              Add Customer
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <CustomerFilters
        onFiltersChange={handleFiltersChange}
        initialFilters={searchParams}
        loading={isLoading}
      />

      {/* Select All (when bulk actions enabled) */}
      {enableBulkActions && customers.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '4px',
              border: `2px solid ${allSelected ? colors.brand.primary : colors.utility.secondaryText}`,
              backgroundColor: allSelected ? colors.brand.primary : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative'
            }}
            onClick={() => handleSelectAll(!allSelected)}
          >
            {allSelected && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20,6 9,17 4,12" />
              </svg>
            )}
            {someSelected && !allSelected && (
              <div style={{
                width: '8px',
                height: '8px',
                backgroundColor: colors.brand.primary,
                borderRadius: '2px'
              }} />
            )}
          </div>
          <span style={{
            fontSize: '14px',
            color: colors.utility.primaryText,
            fontWeight: '500'
          }}>
            Select All ({customers.length})
          </span>
        </div>
      )}

      {/* Customer List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              style={{
                height: '120px',
                backgroundColor: colors.utility.secondaryBackground,
                borderRadius: '12px',
                animation: 'pulse 1.5s ease-in-out infinite',
                opacity: 0.6
              }}
            />
          ))
        ) : customers.length === 0 ? (
          // Empty state
          <div style={{
            padding: '60px 20px',
            textAlign: 'center',
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px'
          }}>
            <div style={{ marginBottom: '16px', opacity: 0.5 }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={colors.utility.secondaryText} strokeWidth="1">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              marginBottom: '8px'
            }}>
              No customers found
            </h3>
            <p style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              marginBottom: '20px'
            }}>
              {searchParams.search || Object.keys(searchParams).some(key => 
                key !== 'page' && key !== 'page_size' && key !== 'sort_by' && key !== 'sort_order' && searchParams[key as keyof CustomerSearchParams]
              ) 
                ? 'Try adjusting your search filters'
                : 'Get started by creating your first customer'
              }
            </p>
            {onCreateCustomer && (
              <button
                onClick={onCreateCustomer}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  backgroundColor: colors.brand.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                <PlusIcon />
                Add Your First Customer
              </button>
            )}
          </div>
        ) : (
          // Customer cards
          customers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              onView={() => {
                if (onViewCustomer) {
                  onViewCustomer(customer.id);
                } else if (onCustomerSelect) {
                  onCustomerSelect(customer);
                }
              }}
              onEdit={() => onEditCustomer?.(customer.id)}
              onDelete={() => handleDeleteCustomer(customer.id)}
              selectable={enableSelection || enableBulkActions}
              selected={selectedCustomers.has(customer.id)}
              onSelectionChange={handleCustomerSelection}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {!isLoading && customers.length > 0 && totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '24px',
          padding: '16px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '8px'
        }}>
          <div style={{
            fontSize: '14px',
            color: colors.utility.secondaryText
          }}>
            Showing {((searchParams.page || 1) - 1) * (searchParams.page_size || 20) + 1} to{' '}
            {Math.min((searchParams.page || 1) * (searchParams.page_size || 20), totalCount)} of{' '}
            {totalCount} customers
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => handlePageChange((searchParams.page || 1) - 1)}
              disabled={!hasPrevPage}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 12px',
                backgroundColor: hasPrevPage ? colors.utility.primaryBackground : 'transparent',
                color: hasPrevPage ? colors.utility.primaryText : colors.utility.secondaryText,
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '6px',
                cursor: hasPrevPage ? 'pointer' : 'not-allowed',
                fontSize: '14px'
              }}
            >
              <ChevronLeftIcon />
              Previous
            </button>

            <span style={{
              padding: '8px 16px',
              fontSize: '14px',
              color: colors.utility.primaryText
            }}>
              Page {searchParams.page || 1} of {totalPages}
            </span>

            <button
              onClick={() => handlePageChange((searchParams.page || 1) + 1)}
              disabled={!hasNextPage}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 12px',
                backgroundColor: hasNextPage ? colors.utility.primaryBackground : 'transparent',
                color: hasNextPage ? colors.utility.primaryText : colors.utility.secondaryText,
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '6px',
                cursor: hasNextPage ? 'pointer' : 'not-allowed',
                fontSize: '14px'
              }}
            >
              Next
              <ChevronRightIcon />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerList;