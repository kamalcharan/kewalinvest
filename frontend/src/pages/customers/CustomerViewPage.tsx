// src/pages/customers/CustomerViewPage.tsx
// Complete file updated to use real backend API types with enhanced debugging and null safety

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useCustomer } from '../../hooks/useCustomers';
import { usePortfolioData } from '../../hooks/usePortfolioData';
import { mockJTBDData, JTBDData } from '../../data/mock/mockJTBDData';
import PortfolioSummaryWidget from '../../components/portfolio/PortfolioSummaryWidget';
import JTBDActionCard from '../../components/jtbd/JTBDActionCard';
import PortfolioDonutChart from '../../components/visualizations/PortfolioDonutChart';
import PerformanceSparkline from '../../components/visualizations/PerformanceSparkline';

const CustomerViewPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  
  const customerId = id ? parseInt(id) : null;
  const [activeTab, setActiveTab] = useState<'overview' | 'portfolio' | 'goals' | 'transactions'>('overview');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('1Y');

  // Fetch customer and portfolio data from real API
  const { data: customer, isLoading: customerLoading, error: customerError } = useCustomer(customerId || 0);
  const { portfolio, isLoading: portfolioLoading, error: portfolioError } = usePortfolioData({
    customerId: customerId || undefined,
    autoFetch: !!customerId
  });
  
  // JTBD data (still using mock for now)
  const jtbd: JTBDData | null = customerId ? mockJTBDData[customerId] : null;

  const isLoading = customerLoading || portfolioLoading;

  // Debug logging
  useEffect(() => {
    console.group('CustomerViewPage Debug Info');
    console.log('🔍 URL Param ID:', id);
    console.log('🔢 Parsed Customer ID:', customerId);
    console.log('👤 Customer Data:', customer);
    console.log('💼 Portfolio Data:', portfolio);
    console.log('🎯 JTBD Data:', jtbd);
    console.log('⏳ Loading States:', { 
      customerLoading, 
      portfolioLoading, 
      isLoading 
    });
    console.log('❌ Errors:', { 
      customerError, 
      portfolioError 
    });
    console.groupEnd();
  }, [id, customerId, customer, portfolio, jtbd, customerLoading, portfolioLoading, customerError, portfolioError]);

  // Format functions with null safety
  const formatCurrency = (value: number | null | undefined): string => {
    // Handle null, undefined, or NaN values
    if (value === null || value === undefined || isNaN(value)) {
      return '₹0';
    }
    
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    return `₹${value.toLocaleString('en-IN')}`;
  };

  const formatPercentage = (value: number | null | undefined): string => {
    // Handle null, undefined, or NaN values
    if (value === null || value === undefined || isNaN(value)) {
      return '0.0%';
    }
    
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getValueColor = (value: number | null | undefined): string => {
    // Handle null, undefined, or NaN values
    if (value === null || value === undefined || isNaN(value)) {
      return colors.utility.secondaryText;
    }
    
    if (value > 0) return '#10B981';
    if (value < 0) return '#EF4444';
    return colors.utility.secondaryText;
  };

  // Icons
  const ArrowLeftIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12,19 5,12 12,5" />
    </svg>
  );

  const DownloadIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );

  const TrendUpIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" />
      <polyline points="17,6 23,6 23,12" />
    </svg>
  );

  const StarIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );

  const CalendarIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );

  const AlertIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );

  // Enhanced error/loading states with better UX
  const LoadingState = () => (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.utility.primaryBackground,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <div style={{
        width: '60px',
        height: '60px',
        border: `4px solid ${colors.brand.primary}20`,
        borderTop: `4px solid ${colors.brand.primary}`,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <div style={{
        fontSize: '16px',
        color: colors.utility.primaryText,
        fontWeight: '500'
      }}>
        Loading customer data...
      </div>
      <div style={{
        fontSize: '13px',
        color: colors.utility.secondaryText
      }}>
        Customer ID: {customerId}
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

  const ErrorState = ({ message, details }: { message: string; details?: string }) => (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.utility.primaryBackground,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '500px',
        width: '100%',
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        padding: '32px',
        textAlign: 'center',
        border: `1px solid ${colors.semantic.error}30`
      }}>
        <div style={{
          color: colors.semantic.error,
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <AlertIcon />
        </div>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: colors.utility.primaryText,
          marginBottom: '8px'
        }}>
          {message}
        </h2>
        {details && (
          <p style={{
            fontSize: '14px',
            color: colors.utility.secondaryText,
            marginBottom: '24px'
          }}>
            {details}
          </p>
        )}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center'
        }}>
          <button
            onClick={() => navigate('/customers')}
            style={{
              padding: '10px 20px',
              backgroundColor: colors.brand.primary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Back to Customers
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: colors.utility.secondaryBackground,
              color: colors.utility.primaryText,
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );

  // Error handling with specific messages
  if (!customerId) {
    console.error('❌ Invalid customer ID from URL params:', id);
    return <ErrorState 
      message="Invalid Customer ID" 
      details="The customer ID in the URL is invalid or missing." 
    />;
  }

  if (isLoading) {
    console.log('⏳ Loading customer data...');
    return <LoadingState />;
  }

  if (customerError) {
    console.error('❌ Customer API Error:', customerError);
    return <ErrorState 
      message="Failed to Load Customer" 
      details={`Error fetching customer #${customerId}. Please try again.`}
    />;
  }

  if (!customer) {
    console.error('❌ Customer not found:', customerId);
    return <ErrorState 
      message="Customer Not Found" 
      details={`No customer found with ID: ${customerId}`}
    />;
  }

  if (portfolioError) {
    console.error('❌ Portfolio API Error:', portfolioError);
    return <ErrorState 
      message="Failed to Load Portfolio" 
      details={`Error fetching portfolio data for ${customer.name}. Some features may be unavailable.`}
    />;
  }

  if (!portfolio) {
    console.warn('⚠️ Portfolio data not available for customer:', customerId);
    return <ErrorState 
      message="Portfolio Not Available" 
      details={`Portfolio data not found for ${customer.name}. The customer may not have any active investments.`}
    />;
  }

  if (!jtbd) {
    console.warn('⚠️ JTBD data not available for customer:', customerId);
    return <ErrorState 
      message="Action Data Not Available" 
      details={`Goals and actions data not found for ${customer.name}.`}
    />;
  }

  // All data loaded successfully
  console.log('✅ All data loaded successfully');
  
  // Calculate metrics from API data with null safety
  const profitLoss = portfolio.summary.total_returns ?? 0;
  const dayChangePercentage = portfolio.summary.day_change_percentage ?? 0;
  const returnPercentage = portfolio.summary.return_percentage ?? 0;
  
  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.utility.primaryBackground }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${colors.brand.primary}15 0%, ${colors.brand.secondary}10 100%)`,
        borderBottom: `1px solid ${colors.utility.primaryText}10`,
        padding: '24px'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <button
            onClick={() => navigate('/customers')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              marginBottom: '20px',
              backgroundColor: colors.utility.secondaryBackground,
              border: 'none',
              borderRadius: '8px',
              color: colors.utility.primaryText,
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            <ArrowLeftIcon /> Back to Customers
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{
                fontSize: '32px',
                fontWeight: '700',
                color: colors.utility.primaryText,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                margin: 0,
                marginBottom: '8px'
              }}>
                {customer.prefix} {customer.name}
                {returnPercentage > 10 && (
                  <span style={{ color: '#FCD34D' }}><StarIcon /></span>
                )}
              </h1>
              <div style={{
                display: 'flex',
                gap: '24px',
                fontSize: '14px',
                color: colors.utility.secondaryText
              }}>
                <span>Customer ID: {customer.id}</span>
                {customer.iwell_code && <span>IWell: {customer.iwell_code}</span>}
                <span>Schemes: {portfolio.summary.total_schemes ?? 0}</span>
                <span>Member Since: 2016</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                style={{
                  padding: '10px 16px',
                  backgroundColor: colors.utility.secondaryBackground,
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '8px',
                  color: colors.utility.primaryText,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <DownloadIcon /> Export Report
              </button>
              <button
                onClick={() => navigate(`/customers/${customerId}/edit`)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: colors.brand.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Edit Customer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Bar */}
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderBottom: `1px solid ${colors.utility.primaryText}10`,
        padding: '20px 24px'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '24px'
        }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: colors.utility.primaryText }}>
              {formatCurrency(portfolio.summary.current_value)}
            </div>
            <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginTop: '4px' }}>
              CURRENT VALUE
            </div>
          </div>
          
          <div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: getValueColor(profitLoss) }}>
              {formatCurrency(Math.abs(profitLoss))}
            </div>
            <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginTop: '4px' }}>
              {profitLoss >= 0 ? 'TOTAL PROFIT' : 'TOTAL LOSS'}
            </div>
          </div>

          <div>
            <div style={{ 
              fontSize: '24px', 
              fontWeight: '700', 
              color: getValueColor(dayChangePercentage),
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              {formatPercentage(dayChangePercentage)}
              <TrendUpIcon />
            </div>
            <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginTop: '4px' }}>
              TODAY'S CHANGE
            </div>
          </div>

          <div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: getValueColor(returnPercentage) }}>
              {formatPercentage(returnPercentage)}
            </div>
            <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginTop: '4px' }}>
              OVERALL RETURN
            </div>
          </div>

          <div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: colors.utility.primaryText }}>
              {portfolio.holdings?.length || portfolio.summary.total_schemes || 0}
            </div>
            <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginTop: '4px' }}>
              TOTAL FUNDS
            </div>
          </div>

          <div>
            <div style={{ 
              fontSize: '24px', 
              fontWeight: '700', 
              color: jtbd.primaryGoal.onTrack ? '#10B981' : '#F97316' 
            }}>
              {jtbd.primaryGoal.currentProgress ?? 0}%
            </div>
            <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginTop: '4px' }}>
              GOAL PROGRESS
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: `1px solid ${colors.utility.primaryText}10` }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex' }}>
          {['overview', 'portfolio', 'goals', 'transactions'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              style={{
                padding: '16px 24px',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab ? `3px solid ${colors.brand.primary}` : '3px solid transparent',
                color: activeTab === tab ? colors.brand.primary : colors.utility.secondaryText,
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                transition: 'all 0.2s ease'
              }}
            >
              {tab === 'goals' ? 'Goals & Actions' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Portfolio Performance Chart */}
              <div style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderRadius: '12px',
                padding: '24px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.utility.primaryText, margin: 0 }}>
                    Portfolio Performance
                  </h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['1M', '3M', '6M', '1Y', 'ALL'].map(period => (
                      <button
                        key={period}
                        onClick={() => setSelectedTimeframe(period as any)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: selectedTimeframe === period ? colors.brand.primary : 'transparent',
                          color: selectedTimeframe === period ? 'white' : colors.utility.secondaryText,
                          border: `1px solid ${selectedTimeframe === period ? colors.brand.primary : colors.utility.primaryText + '20'}`,
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Performance Chart */}
                <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {portfolio.performance && portfolio.performance.length > 0 ? (
                    <PerformanceSparkline
                      data={portfolio.performance.map(p => p.current_value ?? 0)}
                      width={600}
                      height={250}
                      showArea={true}
                      showDots={true}
                      interactive={true}
                    />
                  ) : (
                    <div style={{ color: colors.utility.secondaryText, fontSize: '14px' }}>
                      Performance history not available
                    </div>
                  )}
                </div>
              </div>

              {/* Top Actions */}
              <JTBDActionCard
                actions={jtbd.actions.slice(0, 3)}
                primaryGoal={jtbd.primaryGoal}
                riskAssessment={jtbd.riskAssessment}
                compact={false}
                maxActions={3}
              />
            </div>

            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Asset Allocation */}
              {portfolio.allocation && portfolio.allocation.length > 0 && (
                <div style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  borderRadius: '12px',
                  padding: '24px'
                }}>
                  <h3 style={{ 
                    fontSize: '18px', 
                    fontWeight: '600', 
                    color: colors.utility.primaryText, 
                    margin: 0,
                    marginBottom: '20px'
                  }}>
                    Asset Allocation
                  </h3>
                  <PortfolioDonutChart
                    allocation={portfolio.allocation}
                    size={240}
                    strokeWidth={35}
                    showLegend={true}
                  />
                </div>
              )}

              {/* Top Holdings */}
              {portfolio.holdings && portfolio.holdings.length > 0 && (
                <div style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  borderRadius: '12px',
                  padding: '24px'
                }}>
                  <h3 style={{ 
                    fontSize: '18px', 
                    fontWeight: '600', 
                    color: colors.utility.primaryText, 
                    margin: 0,
                    marginBottom: '20px'
                  }}>
                    Top Holdings
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {portfolio.holdings.slice(0, 4).map((holding, idx) => (
                      <div key={idx} style={{
                        padding: '12px',
                        backgroundColor: colors.utility.primaryBackground,
                        borderRadius: '8px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <div style={{ fontSize: '13px', fontWeight: '500', color: colors.utility.primaryText }}>
                            {holding.fund_name || holding.scheme_name}
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: getValueColor(holding.return_percentage) }}>
                            {formatPercentage(holding.return_percentage)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <div style={{ fontSize: '11px', color: colors.utility.secondaryText }}>
                            Value: {formatCurrency(holding.current_value)}
                          </div>
                          <div style={{ fontSize: '11px', color: colors.utility.secondaryText }}>
                            {(holding.allocation_percentage ?? 0).toFixed(1)}%
                          </div>
                        </div>
                        <div style={{
                          width: '100%',
                          height: '4px',
                          backgroundColor: colors.utility.primaryText + '20',
                          borderRadius: '2px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${holding.allocation_percentage ?? 0}%`,
                            height: '100%',
                            backgroundColor: colors.brand.primary
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Events */}
              {jtbd.upcomingEvents && jtbd.upcomingEvents.length > 0 && (
                <div style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  borderRadius: '12px',
                  padding: '24px'
                }}>
                  <h3 style={{ 
                    fontSize: '18px', 
                    fontWeight: '600', 
                    color: colors.utility.primaryText, 
                    margin: 0,
                    marginBottom: '20px'
                  }}>
                    Upcoming Events
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {jtbd.upcomingEvents.map((event, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        gap: '12px',
                        padding: '12px',
                        backgroundColor: colors.utility.primaryBackground,
                        borderRadius: '8px'
                      }}>
                        <CalendarIcon />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: '500', color: colors.utility.primaryText }}>
                            {event.event}
                          </div>
                          <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginTop: '2px' }}>
                            {new Date(event.date).toLocaleDateString('en-IN')}
                            {event.amount && ` • ${formatCurrency(event.amount)}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Portfolio Tab */}
        {activeTab === 'portfolio' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <PortfolioSummaryWidget portfolio={portfolio} compact={false} showSparkline={true} />
            
            {portfolio.holdings && portfolio.holdings.length > 0 && (
              <div style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderRadius: '12px',
                padding: '24px'
              }}>
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  color: colors.utility.primaryText, 
                  margin: 0,
                  marginBottom: '20px'
                }}>
                  Fund-wise Performance
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${colors.utility.primaryText}20` }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: colors.utility.secondaryText }}>FUND NAME</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: colors.utility.secondaryText }}>INVESTED</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: colors.utility.secondaryText }}>CURRENT VALUE</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: colors.utility.secondaryText }}>RETURNS</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: colors.utility.secondaryText }}>ALLOCATION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.holdings.map((holding, idx) => (
                      <tr key={idx} style={{ borderBottom: `1px solid ${colors.utility.primaryText}10` }}>
                        <td style={{ padding: '12px', fontSize: '13px', color: colors.utility.primaryText }}>
                          {holding.fund_name || holding.scheme_name}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', color: colors.utility.primaryText }}>
                          {formatCurrency(holding.total_invested)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', color: colors.utility.primaryText }}>
                          {formatCurrency(holding.current_value)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: getValueColor(holding.return_percentage) }}>
                          {formatPercentage(holding.return_percentage)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', color: colors.utility.primaryText }}>
                          {(holding.allocation_percentage ?? 0).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Goals Tab */}
        {activeTab === 'goals' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <JTBDActionCard
                actions={jtbd.actions}
                primaryGoal={jtbd.primaryGoal}
                riskAssessment={jtbd.riskAssessment}
                compact={false}
                maxActions={10}
              />

              {jtbd.recommendations && jtbd.recommendations.length > 0 && (
                <div style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  borderRadius: '12px',
                  padding: '24px'
                }}>
                  <h3 style={{ 
                    fontSize: '18px', 
                    fontWeight: '600', 
                    color: colors.utility.primaryText, 
                    margin: 0,
                    marginBottom: '20px'
                  }}>
                    Personalized Recommendations
                  </h3>
                  {jtbd.recommendations.map((rec, idx) => (
                    <div key={idx} style={{
                      padding: '16px',
                      backgroundColor: colors.utility.primaryBackground,
                      borderRadius: '8px',
                      marginBottom: '12px',
                      borderLeft: `3px solid ${rec.priority === 'high' ? '#F97316' : colors.brand.primary}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText }}>
                          {rec.title}
                        </div>
                        <span style={{
                          padding: '2px 8px',
                          backgroundColor: rec.priority === 'high' ? '#F9731620' : colors.brand.primary + '20',
                          color: rec.priority === 'high' ? '#F97316' : colors.brand.primary,
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: '600'
                        }}>
                          {rec.priority.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginBottom: '8px' }}>
                        {rec.description}
                      </div>
                      {(rec.potentialSaving || rec.expectedImpact) && (
                        <div style={{ fontSize: '12px', color: colors.brand.primary, fontWeight: '500' }}>
                          {rec.potentialSaving ? `Save ₹${rec.potentialSaving.toLocaleString('en-IN')}` : rec.expectedImpact}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {jtbd.detailedAnalysis && (
                <>
                  <div style={{
                    backgroundColor: colors.utility.secondaryBackground,
                    borderRadius: '12px',
                    padding: '24px'
                  }}>
                    <h3 style={{ 
                      fontSize: '18px', 
                      fontWeight: '600', 
                      color: colors.utility.primaryText, 
                      margin: 0,
                      marginBottom: '20px'
                    }}>
                      Strengths
                    </h3>
                    {jtbd.detailedAnalysis.strengthAreas.map((strength, idx) => (
                      <div key={idx} style={{
                        padding: '8px',
                        marginBottom: '8px',
                        fontSize: '12px',
                        color: colors.utility.primaryText,
                        borderLeft: `2px solid #10B981`,
                        paddingLeft: '12px'
                      }}>
                        ✓ {strength}
                      </div>
                    ))}
                  </div>

                  <div style={{
                    backgroundColor: colors.utility.secondaryBackground,
                    borderRadius: '12px',
                    padding: '24px'
                  }}>
                    <h3 style={{ 
                      fontSize: '18px', 
                      fontWeight: '600', 
                      color: colors.utility.primaryText, 
                      margin: 0,
                      marginBottom: '20px'
                    }}>
                      Areas to Improve
                    </h3>
                    {jtbd.detailedAnalysis.improvementAreas.map((area, idx) => (
                      <div key={idx} style={{
                        padding: '8px',
                        marginBottom: '8px',
                        fontSize: '12px',
                        color: colors.utility.primaryText,
                        borderLeft: `2px solid #F97316`,
                        paddingLeft: '12px'
                      }}>
                        ! {area}
                      </div>
                    ))}
                  </div>

                  {jtbd.detailedAnalysis.peerComparison && (
                    <div style={{
                      backgroundColor: colors.utility.secondaryBackground,
                      borderRadius: '12px',
                      padding: '24px'
                    }}>
                      <h3 style={{ 
                        fontSize: '18px', 
                        fontWeight: '600', 
                        color: colors.utility.primaryText, 
                        margin: 0,
                        marginBottom: '20px'
                      }}>
                        Peer Comparison
                      </h3>
                      <div style={{
                        fontSize: '36px',
                        fontWeight: '700',
                        color: colors.brand.primary,
                        marginBottom: '8px',
                        textAlign: 'center'
                      }}>
                        {jtbd.detailedAnalysis.peerComparison.percentile}th
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: colors.utility.secondaryText,
                        textAlign: 'center',
                        marginBottom: '16px'
                      }}>
                        Percentile
                      </div>
                      <div style={{
                        padding: '12px',
                        backgroundColor: colors.utility.primaryBackground,
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}>
                        <div style={{ marginBottom: '8px' }}>
                          <span style={{ color: colors.utility.secondaryText }}>Your Returns:</span>
                          <span style={{ float: 'right', fontWeight: '600', color: '#10B981' }}>
                            {jtbd.detailedAnalysis.peerComparison.yourReturns}%
                          </span>
                        </div>
                        <div>
                          <span style={{ color: colors.utility.secondaryText }}>Peer Avg:</span>
                          <span style={{ float: 'right', fontWeight: '600', color: colors.utility.primaryText }}>
                            {jtbd.detailedAnalysis.peerComparison.avgPeerReturns}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.utility.primaryText, margin: 0 }}>
                Transaction History
              </h3>
              <button style={{
                padding: '8px 16px',
                backgroundColor: colors.brand.primary,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px'
              }}>
                View All Transactions
              </button>
            </div>

            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: colors.utility.secondaryText
            }}>
              Transaction history will be available once transaction import is complete.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerViewPage;