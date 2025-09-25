// frontend/src/pages/customers/CustomersPage.tsx
// Updated version with Dashboard navigation and error logging

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useCustomers, useCustomerStats } from '../../hooks/useCustomers';
import { CustomerSearchParams, CustomerWithContact } from '../../types/customer.types';
import { mockPortfolioData } from '../../data/mock/mockPortfolioData';
import { mockJTBDData } from '../../data/mock/mockJTBDData';
import { FrontendErrorLogger } from '../../services/errorLogger.service';
import CustomerCard from '../../components/customers/CustomerCard';

const CustomersPage: React.FC = () => {
  const navigate = useNavigate();
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
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('cards');

  // Hooks
  const { data: customerData, isLoading, error, refetch } = useCustomers(searchParams);
  const { data: stats } = useCustomerStats();

  // Derived data
  const customers = customerData?.customers || [];
  const totalCount = customerData?.total || 0;
  const hasNextPage = customerData?.has_next || false;
  const hasPrevPage = customerData?.has_prev || false;
  const totalPages = customerData?.total_pages || 1;

  // Calculate portfolio metrics
  const portfolioMetrics = React.useMemo(() => {
    let totalAUM = 0;
    let customersWithPortfolio = 0;
    
    customers.forEach(customer => {
      const portfolio = mockPortfolioData[customer.id];
      if (portfolio) {
        totalAUM += portfolio.summary.totalValue;
        customersWithPortfolio++;
      }
    });
    
    return { totalAUM, customersWithPortfolio };
  }, [customers]);

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
      console.log('Delete customer:', customerId);
      // Implement delete functionality
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

  const handleNavigateToDashboard = () => {
    try {
      navigate('/customers/dashboard');
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Navigation to customer dashboard failed',
        'CustomersPage',
        { action: 'dashboard', error: error.message },
        error.stack
      );
    }
  };

  const handleFiltersChange = (newFilters: CustomerSearchParams) => {
    try {
      setSearchParams(prev => ({
        ...prev,
        ...newFilters,
        page: newFilters.page || 1
      }));
      setSelectedCustomers(new Set());
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Filter change failed',
        'CustomersPage',
        { newFilters, error: error.message },
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

  const handleSelectAll = (selected: boolean) => {
    try {
      if (selected) {
        setSelectedCustomers(new Set(customers.map(c => c.id)));
      } else {
        setSelectedCustomers(new Set());
      }
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Select all customers failed',
        'CustomersPage',
        { selected, customerCount: customers.length, error: error.message },
        error.stack
      );
    }
  };

  // Format currency
  const formatCurrency = (value: number): string => {
    try {
      if (value >= 10000000) {
        return `₹${(value / 10000000).toFixed(2)}Cr`;
      } else if (value >= 100000) {
        return `₹${(value / 100000).toFixed(2)}L`;
      }
      return `₹${value.toLocaleString('en-IN')}`;
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Currency formatting failed',
        'CustomersPage',
        { value, error: error.message },
        error.stack
      );
      return `₹${value}`;
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

  const DashboardIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
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

  const GridIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );

  const ListIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );

  // Error handling with logging
  if (error) {
    // Log the error for debugging
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
              // Log retry attempt
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
              onClick={handleNavigateToDashboard}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                backgroundColor: colors.brand.secondary,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              <DashboardIcon />
              Portfolio Dashboard
            </button>

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
          </div>
        </div>

        {/* Enhanced Stats Cards with Portfolio Metrics */}
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
              color: colors.semantic.error,
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
          
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '8px',
            padding: '20px'
          }}>
            <div style={{
              fontSize: '32px',
              fontWeight: '700',
              color: colors.semantic.success,
              marginBottom: '4px'
            }}>
              {stats?.active || 0}
            </div>
            <div style={{
              fontSize: '14px',
              color: colors.utility.secondaryText
            }}>
              Active
            </div>
          </div>

          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '8px',
            padding: '20px'
          }}>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              color: colors.brand.primary,
              marginBottom: '4px'
            }}>
              {formatCurrency(portfolioMetrics.totalAUM)}
            </div>
            <div style={{
              fontSize: '14px',
              color: colors.utility.secondaryText
            }}>
              Total AUM
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
              {portfolioMetrics.customersWithPortfolio}
            </div>
            <div style={{
              fontSize: '14px',
              color: colors.utility.secondaryText
            }}>
              With Portfolio
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '16px'
          }}>
            <input
              type="text"
              placeholder="Search customers by name, email, mobile, PAN, or IWell code..."
              value={searchParams.search || ''}
              onChange={(e) => handleFiltersChange({ ...searchParams, search: e.target.value, page: 1 })}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '8px',
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText,
                fontSize: '14px',
                outline: 'none'
              }}
            />
            
            <div style={{
              display: 'flex',
              gap: '4px',
              padding: '4px',
              backgroundColor: colors.utility.primaryBackground,
              borderRadius: '6px'
            }}>
              <button
                onClick={() => setViewMode('cards')}
                style={{
                  padding: '6px',
                  backgroundColor: viewMode === 'cards' ? colors.brand.primary : 'transparent',
                  color: viewMode === 'cards' ? 'white' : colors.utility.secondaryText,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                <GridIcon />
              </button>
              <button
                onClick={() => setViewMode('list')}
                style={{
                  padding: '6px',
                  backgroundColor: viewMode === 'list' ? colors.brand.primary : 'transparent',
                  color: viewMode === 'list' ? 'white' : colors.utility.secondaryText,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                <ListIcon />
              </button>
            </div>

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
          </div>
        </div>

        {/* Customer List with Enhanced Cards */}
        <div style={{
          backgroundColor: colors.utility.secondaryBackground,
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
            // Customer cards with portfolio data
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px' 
            }}>
              {customers.map((customer) => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  portfolio={mockPortfolioData[customer.id]}
                  jtbd={mockJTBDData[customer.id]}
                  onView={() => handleViewCustomer(customer.id)}
                  onEdit={() => handleEditCustomer(customer.id)}
                  onDelete={() => handleDeleteCustomer(customer.id)}
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
    </div>
  );
};

export default CustomersPage;