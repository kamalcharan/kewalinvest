// src/pages/dashboard/CustomerDashboardPage.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useCustomers } from '../../hooks/useCustomers';
import { CustomerSearchParams, CustomerWithContact } from '../../types/customer.types';
import { mockPortfolioData } from '../../data/mock/mockPortfolioData';
import { mockJTBDData } from '../../data/mock/mockJTBDData';
import CustomerCard from '../../components/customers/CustomerCard';
import PortfolioSummaryWidget from '../../components/portfolio/PortfolioSummaryWidget';
import JTBDActionCard from '../../components/jtbd/JTBDActionCard';
import PortfolioDonutChart from '../../components/visualizations/PortfolioDonutChart';
import PerformanceSparkline from '../../components/visualizations/PerformanceSparkline';

const CustomerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // State management
  const [searchParams, setSearchParams] = useState<CustomerSearchParams>({
    page: 1,
    page_size: 20,
    sort_by: 'name',
    sort_order: 'asc'
  });
  
  // Initialize selectedCustomerId from navigation state
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
    location.state?.selectedCustomerId || null
  );
  const [filterView, setFilterView] = useState<'all' | 'attention' | 'positive'>('all');
  
  // Clear navigation state after using it
  useEffect(() => {
    if (location.state?.selectedCustomerId) {
      // Clear the state to prevent it from persisting
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Fetch customers
  const { data: customerData, isLoading, error, refetch } = useCustomers(searchParams);
  const customers = customerData?.customers || [];

  // Calculate dashboard metrics
  const dashboardMetrics = useMemo(() => {
    let totalAUM = 0;
    let positiveReturnsCount = 0;
    let negativeReturnsCount = 0;
    let criticalActionsCount = 0;
    let highRiskCount = 0;

    customers.forEach(customer => {
      const portfolio = mockPortfolioData[customer.id];
      const jtbd = mockJTBDData[customer.id];
      
      if (portfolio) {
        totalAUM += portfolio.summary.totalValue;
        if (portfolio.summary.overallReturns.percentage >= 0) {
          positiveReturnsCount++;
        } else {
          negativeReturnsCount++;
        }
        if (portfolio.riskScore > 7) {
          highRiskCount++;
        }
      }
      
      if (jtbd) {
        criticalActionsCount += jtbd.actions.filter(a => 
          a.priority === 'critical' || a.priority === 'high'
        ).length;
      }
    });

    return {
      totalAUM,
      totalCustomers: customers.length,
      positiveReturnsCount,
      negativeReturnsCount,
      criticalActionsCount,
      highRiskCount,
      avgReturns: customers.length > 0 
        ? customers.reduce((sum, c) => sum + (mockPortfolioData[c.id]?.summary.overallReturns.percentage || 0), 0) / customers.length
        : 0
    };
  }, [customers]);

  // Filter customers based on view
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const portfolio = mockPortfolioData[customer.id];
      const jtbd = mockJTBDData[customer.id];
      
      if (filterView === 'attention') {
        return portfolio?.summary.overallReturns.percentage < 0 || 
               jtbd?.actions.some(a => a.priority === 'critical' || a.priority === 'high');
      } else if (filterView === 'positive') {
        return portfolio?.summary.overallReturns.percentage >= 10;
      }
      return true;
    });
  }, [customers, filterView]);

  // Get selected customer data
  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find(c => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  const selectedPortfolio = selectedCustomerId ? mockPortfolioData[selectedCustomerId] : null;
  const selectedJTBD = selectedCustomerId ? mockJTBDData[selectedCustomerId] : null;

  // Format currency
  const formatCurrency = (value: number): string => {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(2)}Cr`;
    } else if (value >= 100000) {
      return `₹${(value / 100000).toFixed(2)}L`;
    }
    return `₹${value.toLocaleString('en-IN')}`;
  };

  // Icons
  const RefreshIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23,4 23,10 17,10" />
      <polyline points="1,20 1,14 7,14" />
      <path d="m20.49,9a9,9 0 1 1-2.13-5.36l4.64,4.36" />
    </svg>
  );

  const TrendUpIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" />
      <polyline points="17,6 23,6 23,12" />
    </svg>
  );

  const TrendDownIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23,18 13.5,8.5 8.5,13.5 1,6" />
      <polyline points="17,18 23,18 23,12" />
    </svg>
  );

  const AlertIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );

  const ArrowLeftIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12,19 5,12 12,5" />
    </svg>
  );

  const UsersIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.utility.primaryBackground,
      padding: '24px'
    }}>
      {/* Navigation Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        maxWidth: '1400px',
        margin: '0 auto 24px'
      }}>
        <button
          onClick={() => navigate('/customers')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            backgroundColor: colors.utility.secondaryBackground,
            color: colors.utility.primaryText,
            border: `1px solid ${colors.utility.primaryText}20`,
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          <ArrowLeftIcon />
          Back to Customers
        </button>

        <h1 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: colors.utility.primaryText,
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            backgroundColor: colors.brand.primary,
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <UsersIcon />
          </div>
          Portfolio Dashboard
        </h1>

        <button
          onClick={() => navigate('/customers/new')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            backgroundColor: colors.brand.primary,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          Add Customer
        </button>
      </div>

      {/* Header Metrics Bar */}
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '24px'
        }}>
          <div>
            <div style={{
              fontSize: '32px',
              fontWeight: '700',
              color: colors.brand.primary,
              marginBottom: '4px'
            }}>
              {formatCurrency(dashboardMetrics.totalAUM)}
            </div>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Total AUM
            </div>
          </div>
          
          <div>
            <div style={{
              fontSize: '32px',
              fontWeight: '700',
              color: colors.utility.primaryText,
              marginBottom: '4px'
            }}>
              {dashboardMetrics.totalCustomers}
            </div>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Active Customers
            </div>
          </div>

          <div>
            <div style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#10B981',
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {dashboardMetrics.positiveReturnsCount}
              <span style={{ fontSize: '16px', color: colors.utility.secondaryText }}>
                / {dashboardMetrics.negativeReturnsCount}
              </span>
            </div>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Positive / Negative Returns
            </div>
          </div>

          <div>
            <div style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#F97316',
              marginBottom: '4px'
            }}>
              {dashboardMetrics.criticalActionsCount}
            </div>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Urgent Actions
            </div>
          </div>

          <div>
            <div style={{
              fontSize: '32px',
              fontWeight: '700',
              color: dashboardMetrics.avgReturns >= 0 ? '#10B981' : '#EF4444',
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {dashboardMetrics.avgReturns >= 0 ? '+' : ''}{dashboardMetrics.avgReturns.toFixed(1)}%
              {dashboardMetrics.avgReturns >= 0 ? <TrendUpIcon /> : <TrendDownIcon />}
            </div>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Avg Returns
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: selectedCustomerId ? '1fr 400px' : '1fr',
        gap: '24px',
        alignItems: 'start'
      }}>
        {/* Left Panel - Customer List */}
        <div>
          {/* Filter Tabs */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}>
            <div style={{
              display: 'flex',
              gap: '8px',
              padding: '4px',
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '8px'
            }}>
              {[
                { value: 'all', label: 'All Customers', count: customers.length },
                { value: 'attention', label: 'Needs Attention', count: dashboardMetrics.negativeReturnsCount + dashboardMetrics.criticalActionsCount },
                { value: 'positive', label: 'Top Performers', count: dashboardMetrics.positiveReturnsCount }
              ].map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setFilterView(tab.value as any)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: filterView === tab.value ? colors.brand.primary : 'transparent',
                    color: filterView === tab.value ? 'white' : colors.utility.primaryText,
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {tab.label}
                  <span style={{
                    padding: '2px 6px',
                    backgroundColor: filterView === tab.value ? 'rgba(255,255,255,0.2)' : colors.utility.primaryText + '20',
                    borderRadius: '10px',
                    fontSize: '11px'
                  }}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => refetch()}
              disabled={isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                backgroundColor: 'transparent',
                color: colors.utility.secondaryText,
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <RefreshIcon />
              Refresh
            </button>
          </div>

          {/* Customer Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  style={{
                    height: '120px',
                    backgroundColor: colors.utility.secondaryBackground,
                    borderRadius: '12px',
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }}
                />
              ))
            ) : filteredCustomers.length === 0 ? (
              // Empty state
              <div style={{
                padding: '40px',
                backgroundColor: colors.utility.secondaryBackground,
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <AlertIcon />
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: colors.utility.primaryText,
                  marginTop: '16px'
                }}>
                  No customers found
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: colors.utility.secondaryText,
                  marginTop: '8px'
                }}>
                  Adjust your filters or add new customers
                </p>
              </div>
            ) : (
              filteredCustomers.map(customer => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  portfolio={mockPortfolioData[customer.id]}
                  jtbd={mockJTBDData[customer.id]}
                  onView={() => setSelectedCustomerId(customer.id)}
                  onEdit={() => navigate(`/customers/${customer.id}/edit`)}
                  onDelete={() => console.log('Delete:', customer.id)}
                  showFinancials={true}
                  variant="dashboard"
                />
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Selected Customer Details */}
        {selectedCustomer && selectedPortfolio && selectedJTBD && (
          <div style={{
            position: 'sticky',
            top: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {/* Customer Header */}
            <div style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '12px',
              padding: '16px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: colors.utility.primaryText
                }}>
                  {selectedCustomer.prefix} {selectedCustomer.name}
                </h3>
                <button
                  onClick={() => setSelectedCustomerId(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: colors.utility.secondaryText,
                    cursor: 'pointer',
                    fontSize: '20px'
                  }}
                >
                  ×
                </button>
              </div>
              <div style={{
                fontSize: '12px',
                color: colors.utility.secondaryText
              }}>
                Customer ID: {selectedCustomer.id} • IWell: {selectedCustomer.iwell_code || 'N/A'}
              </div>
            </div>

            {/* Portfolio Summary */}
            <PortfolioSummaryWidget
              portfolio={selectedPortfolio}
              compact={false}
              showSparkline={true}
            />

            {/* Asset Allocation */}
            <div style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '12px',
              padding: '16px'
            }}>
              <h4 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                marginBottom: '16px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Asset Allocation
              </h4>
              <PortfolioDonutChart
                allocation={selectedPortfolio.allocation}
                size={160}
                strokeWidth={24}
                showLegend={true}
              />
            </div>

            {/* JTBD Actions */}
            <JTBDActionCard
              actions={selectedJTBD.actions}
              primaryGoal={selectedJTBD.primaryGoal}
              riskAssessment={selectedJTBD.riskAssessment}
              compact={false}
              maxActions={3}
              onActionClick={(action) => console.log('Action clicked:', action)}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

export default CustomerDashboardPage;