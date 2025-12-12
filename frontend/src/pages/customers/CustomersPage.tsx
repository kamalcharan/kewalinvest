// frontend/src/pages/customers/CustomersPage.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useCustomers, useCustomerStats, useActivateCustomer, useDeleteCustomer } from '../../hooks/useCustomers';
import { usePortfolioMetrics } from '../../hooks/usePortfolioData';
import { CustomerSearchParams } from '../../types/customer.types';
import { FrontendErrorLogger } from '../../services/errorLogger.service';
import CustomerCard from '../../components/customers/CustomerCard';
import CustomerFilters from '../../components/customers/CustomerFilters';
import { CreateAliasModal } from '../../components/alias/CreateAliasModal';

const CustomersPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // State management
  const [searchParams, setSearchParams] = useState<CustomerSearchParams>({
    page: 1,
    page_size: 20,
    sort_by: 'c.name',
    sort_order: 'asc'
  });
  const [selectedCustomers, setSelectedCustomers] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('cards');
  const [showCreateAliasModal, setShowCreateAliasModal] = useState(false);

  // Hooks
  const { data: customerData, isLoading, error, refetch } = useCustomers(searchParams);
  const { data: stats } = useCustomerStats();
  const { metrics: portfolioMetrics, isLoading: metricsLoading } = usePortfolioMetrics();
  const activateCustomerMutation = useActivateCustomer();
  const deleteCustomerMutation = useDeleteCustomer();

  // Derived data
  const customers = customerData?.customers || [];
  const totalCount = customerData?.total || 0;
  const hasNextPage = customerData?.has_next || false;
  const hasPrevPage = customerData?.has_prev || false;
  const totalPages = customerData?.total_pages || 1;

  // Event handlers with error logging
  const handleCreateCustomer = () => {
    try {
      navigate('/customers/new');
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Navigation to create customer failed',
        'CustomersPage',
        { action: 'create', error: error.message },
        error.stack
      );
    }
  };

  const handleEditCustomer = (customerId: number) => {
    try {
      navigate(`/customers/${customerId}/edit`);
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Navigation to edit customer failed',
        'CustomersPage',
        { customerId, action: 'edit', error: error.message },
        error.stack
      );
    }
  };

  const handleViewCustomer = (customerId: number) => {
    try {
      navigate(`/customers/${customerId}`);
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Navigation to view customer failed',
        'CustomersPage',
        { customerId, action: 'view', error: error.message },
        error.stack
      );
    }
  };

  const handleDeleteCustomer = (customerId: number) => {
    try {
      deleteCustomerMutation.mutate(customerId);
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Customer deletion failed',
        'CustomersPage',
        {
          customerId,
          errorMessage: error.message
        },
        error.stack
      );
    }
  };

  const handleActivateCustomer = (customerId: number) => {
    try {
      activateCustomerMutation.mutate(customerId);
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Customer activation failed',
        'CustomersPage',
        {
          customerId,
          errorMessage: error.message
        },
        error.stack
      );
    }
  };

  const handleSearchParamsChange = (newParams: CustomerSearchParams) => {
    try {
      setSearchParams(newParams);
      setSelectedCustomers(new Set());
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Search params change failed',
        'CustomersPage',
        { newParams, error: error.message },
        error.stack
      );
    }
  };

  const handlePageChange = (newPage: number) => {
    try {
      setSearchParams(prev => ({ ...prev, page: newPage }));
      setSelectedCustomers(new Set());
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Page change failed',
        'CustomersPage',
        { newPage, currentPage: searchParams.page, error: error.message },
        error.stack
      );
    }
  };

  const handleCustomerSelection = (customerId: number, selected: boolean) => {
    try {
      setSelectedCustomers(prev => {
        const newSet = new Set(prev);
        if (selected) {
          newSet.add(customerId);
        } else {
          newSet.delete(customerId);
        }
        return newSet;
      });
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Customer selection failed',
        'CustomersPage',
        { customerId, selected, error: error.message },
        error.stack
      );
    }
  };

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

  const UsersIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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

  // Star Icon (NEW)
  const StarIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#FFD700" stroke="#FFD700" strokeWidth="2">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
  );

  // Error handling with logging
  if (error) {
    FrontendErrorLogger.error(
      'Failed to load customers data',
      'CustomersPage',
      {
        searchParams,
        totalCount,
        errorMessage: error.message || 'Unknown error'
      }
    );

    return (
      <div style={{ padding: '24px' }}>
        <div style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: colors.semantic.error + '10',
          borderRadius: '12px',
          color: colors.semantic.error
        }}>
          <p style={{ marginBottom: '16px' }}>Failed to load customers</p>
          <button
            onClick={() => {
              FrontendErrorLogger.error(
                'User initiated retry after customers load failure',
                'CustomersPage',
                { action: 'retry' }
              );
              refetch();
            }}
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
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.utility.primaryBackground,
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: colors.brand.primary,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <UsersIcon />
            </div>
            <div>
              <h1 style={{
                fontSize: '28px',
                fontWeight: '700',
                color: colors.utility.primaryText,
                margin: '0 0 4px 0'
              }}>
                Customers
              </h1>
              <p style={{
                fontSize: '14px',
                color: colors.utility.secondaryText,
                margin: 0
              }}>
                Manage your customer database • Environment: live
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleCreateCustomer}
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

            <button
              onClick={() => {
                try {
                  refetch();
                } catch (error: any) {
                  FrontendErrorLogger.error(
                    'Manual data refresh failed',
                    'CustomersPage',
                    { error: error.message },
                    error.stack
                  );
                }
              }}
              disabled={isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
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
            </button>
          </div>
        </div>

        {/* Stats Cards - Using Real Portfolio API */}
        {/* UPDATED: Added Bookmarked stat card */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '8px',
            padding: '20px'
          }}>
            <div style={{
              fontSize: '32px',
              fontWeight: '700',
              color: colors.utility.primaryText,
              marginBottom: '4px'
            }}>
              {totalCount}
            </div>
            <div style={{
              fontSize: '14px',
              color: colors.utility.secondaryText
            }}>
              Total Customers
            </div>
          </div>
          
          {/* Family Accounts Card (NEW) */}
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '8px',
            padding: '20px',
            cursor: stats?.family_count ? 'pointer' : 'default',
            transition: 'transform 0.2s ease'
          }}
          onClick={() => {
            if (stats?.family_count) {
              setSearchParams(prev => ({ ...prev, account_type: 'family', page: 1 }));
            }
          }}
          onMouseEnter={(e) => {
            if (stats?.family_count) {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          >
            <div style={{
              fontSize: '32px',
              fontWeight: '700',
              color: colors.brand.secondary,
              marginBottom: '4px'
            }}>
              {stats?.family_count || 0}
            </div>
            <div style={{
              fontSize: '14px',
              color: colors.utility.secondaryText
            }}>
              Family Accounts
            </div>
            {stats?.customers_in_families ? (
              <div style={{
                fontSize: '12px',
                color: colors.utility.secondaryText,
                marginTop: '4px'
              }}>
                ({stats.customers_in_families} customers)
              </div>
            ) : null}
          </div>

          {/* Bookmarked Stat Card (NEW) */}
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '8px',
            padding: '20px',
            cursor: stats?.bookmarked ? 'pointer' : 'default',
            transition: 'transform 0.2s ease'
          }}
          onClick={() => {
            if (stats?.bookmarked) {
              setSearchParams(prev => ({ ...prev, is_bookmarked: true, page: 1 }));
            }
          }}
          onMouseEnter={(e) => {
            if (stats?.bookmarked) {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          >
            <div style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#FFD700',
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <StarIcon />
              {stats?.bookmarked || 0}
            </div>
            <div style={{
              fontSize: '14px',
              color: colors.utility.secondaryText
            }}>
              Bookmarked
            </div>
          </div>

          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '8px',
            padding: '20px'
          }}>
            <div style={{
              fontSize: '32px',
              fontWeight: '700',
              color: colors.brand.secondary,
              marginBottom: '4px'
            }}>
              {metricsLoading ? '...' : portfolioMetrics.totalCustomers}
            </div>
            <div style={{
              fontSize: '14px',
              color: colors.utility.secondaryText
            }}>
              With Portfolio
            </div>
          </div>
        </div>

        {/* Search Component */}
        <CustomerFilters
          onFiltersChange={handleSearchParamsChange}
          initialFilters={searchParams}
          loading={isLoading}
        />

        {/* Customer List */}
        <div style={{
          backgroundColor: colors.utility.primaryBackground,
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              margin: 0
            }}>
              Customer List
            </h3>
            {selectedCustomers.size > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{
                  padding: '4px 12px',
                  backgroundColor: colors.brand.primary + '20',
                  color: colors.brand.primary,
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  {selectedCustomers.size} selected
                </span>
                {selectedCustomers.size >= 2 && (
                  <button
                    onClick={() => setShowCreateAliasModal(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      backgroundColor: colors.brand.primary,
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}
                  >
                    <Link2 size={14} />
                    Create Alias
                  </button>
                )}
              </div>
            )}
          </div>

          {isLoading ? (
            // Loading skeleton
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  style={{
                    height: '120px',
                    backgroundColor: colors.utility.primaryBackground,
                    borderRadius: '8px',
                    animation: 'pulse 1.5s ease-in-out infinite',
                    opacity: 0.6
                  }}
                />
              ))}
            </div>
          ) : customers.length === 0 ? (
            // Empty state
            <div style={{
              padding: '60px 20px',
              textAlign: 'center',
              border: `2px dashed ${colors.utility.primaryText}20`,
              borderRadius: '8px'
            }}>
              <div style={{ marginBottom: '16px', opacity: 0.5 }}>
                <UsersIcon />
              </div>
              <h4 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                marginBottom: '8px'
              }}>
                No customers found
              </h4>
              <p style={{
                fontSize: '14px',
                color: colors.utility.secondaryText,
                marginBottom: '20px'
              }}>
                {searchParams.search ? 'Try adjusting your search filters' : 'Get started by creating your first customer'}
              </p>
              <button
                onClick={handleCreateCustomer}
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
            </div>
          ) : (
            // Customer cards - NO MOCK DATA, only real API
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px' 
            }}>
              {customers.map((customer) => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  portfolio={undefined} // Portfolio fetched inside CustomerCard if needed
                  onView={() => handleViewCustomer(customer.id)}
                  onEdit={() => handleEditCustomer(customer.id)}
                  onDelete={() => handleDeleteCustomer(customer.id)}
                  onActivate={() => handleActivateCustomer(customer.id)}
                  selectable={true}
                  selected={selectedCustomers.has(customer.id)}
                  onSelectionChange={handleCustomerSelection}
                  showFinancials={true}
                  variant="list"
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && customers.length > 0 && totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '20px',
              padding: '16px',
              backgroundColor: colors.utility.primaryBackground,
              borderRadius: '8px'
            }}>
              <div style={{
                fontSize: '14px',
                color: colors.utility.secondaryText
              }}>
                Page {searchParams.page || 1} of {totalPages}
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
                    backgroundColor: hasPrevPage ? colors.utility.secondaryBackground : 'transparent',
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

                <button
                  onClick={() => handlePageChange((searchParams.page || 1) + 1)}
                  disabled={!hasNextPage}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '8px 12px',
                    backgroundColor: hasNextPage ? colors.utility.secondaryBackground : 'transparent',
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
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.6; }
        }
      `}</style>

      {/* Create Alias Modal */}
      <CreateAliasModal
        isOpen={showCreateAliasModal}
        onClose={() => setShowCreateAliasModal(false)}
        selectedCustomers={customers
          .filter(c => selectedCustomers.has(c.id))
          .map(c => ({
            id: c.id,
            name: c.name,
            iwell_code: c.iwell_code,
            email: c.email,
            current_value: c.current_value
          }))}
        onSuccess={() => {
          setSelectedCustomers(new Set());
          navigate('/aliases');
        }}
      />
    </div>
  );
};

export default CustomersPage;