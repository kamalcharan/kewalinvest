// src/pages/customers/CustomerViewPage.tsx

import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useCustomer } from '../../hooks/useCustomers';
import { mockPortfolioData, PortfolioData } from '../../data/mock/mockPortfolioData';
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

  // Fetch customer data
  const { data: customer, isLoading, error } = useCustomer(customerId || 0);
  
  // Get portfolio and JTBD data with proper typing
  const portfolio: PortfolioData | null = customerId ? mockPortfolioData[customerId] : null;
  const jtbd: JTBDData | null = customerId ? mockJTBDData[customerId] : null;

  // Format functions
  const formatCurrency = (value: number): string => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    return `₹${value.toLocaleString('en-IN')}`;
  };

  const formatPercentage = (value: number): string => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getValueColor = (value: number): string => {
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

  if (!customerId || isLoading || !customer || !portfolio || !jtbd) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: colors.utility.primaryBackground,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {!customerId ? 'Invalid Customer ID' : isLoading ? 'Loading...' : 'Customer not found'}
      </div>
    );
  }

  // Calculate additional metrics
  const profitLoss = portfolio.summary.totalValue - portfolio.summary.totalInvested;
  const profitLossPercentage = (profitLoss / portfolio.summary.totalInvested) * 100;
  
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
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                {customer.prefix} {customer.name}
                {portfolio.riskScore <= 5 && (
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
                <span>Risk Profile: {portfolio.riskProfile}</span>
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
              {formatCurrency(portfolio.summary.totalValue)}
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
              color: getValueColor(portfolio.summary.dayChange.percentage),
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              {formatPercentage(portfolio.summary.dayChange.percentage)}
              <TrendUpIcon />
            </div>
            <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginTop: '4px' }}>
              TODAY'S CHANGE
            </div>
          </div>

          <div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: getValueColor(portfolio.summary.overallReturns.xirr) }}>
              {formatPercentage(portfolio.summary.overallReturns.xirr)}
            </div>
            <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginTop: '4px' }}>
              XIRR
            </div>
          </div>

          <div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: colors.utility.primaryText }}>
              {portfolio.topHoldings.length}
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
              {jtbd.primaryGoal.currentProgress}%
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
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.utility.primaryText }}>
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
                  <PerformanceSparkline
                    data={portfolio.performanceHistory}
                    width={600}
                    height={250}
                    showArea={true}
                    showDots={true}
                    interactive={true}
                  />
                </div>
                
                {/* Monthly Performance Grid */}
                {portfolio.monthlyPerformance && (
                  <div style={{ 
                    marginTop: '24px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(6, 1fr)',
                    gap: '12px'
                  }}>
                    {portfolio.monthlyPerformance.slice(-6).map((month, idx) => (
                      <div key={idx} style={{
                        padding: '12px',
                        backgroundColor: colors.utility.primaryBackground,
                        borderRadius: '8px',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginBottom: '4px' }}>
                          {month.month}
                        </div>
                        <div style={{ 
                          fontSize: '14px', 
                          fontWeight: '600',
                          color: getValueColor(month.returns)
                        }}>
                          {formatPercentage(month.returns)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top Actions */}
              <JTBDActionCard
                actions={jtbd.actions.slice(0, 3)}
                primaryGoal={jtbd.primaryGoal}
                riskAssessment={jtbd.riskAssessment}
                compact={false}
                maxActions={3}
              />

              {/* Recent Transactions */}
              {portfolio.recentTransactions && (
                <div style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  borderRadius: '12px',
                  padding: '24px'
                }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '20px' }}>
                    Recent Transactions
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {portfolio.recentTransactions.slice(0, 5).map((txn, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        backgroundColor: colors.utility.primaryBackground,
                        borderRadius: '8px'
                      }}>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: txn.type === 'BUY' || txn.type === 'SIP' ? '#10B98120' : '#EF444420',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: '600',
                            color: txn.type === 'BUY' || txn.type === 'SIP' ? '#10B981' : '#EF4444'
                          }}>
                            {txn.type.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: '500', color: colors.utility.primaryText }}>
                              {txn.fundName}
                            </div>
                            <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
                              {txn.type} • {new Date(txn.date).toLocaleDateString('en-IN')}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText }}>
                            {formatCurrency(txn.amount)}
                          </div>
                          {txn.units && txn.units > 0 && (
                            <div style={{ fontSize: '11px', color: colors.utility.secondaryText }}>
                              {txn.units} units @ ₹{txn.nav}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Asset Allocation */}
              <div style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderRadius: '12px',
                padding: '24px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '20px' }}>
                  Asset Allocation
                </h3>
                <PortfolioDonutChart
                  allocation={portfolio.allocation}
                  size={240}
                  strokeWidth={35}
                  showLegend={true}
                />
              </div>

              {/* Top Holdings */}
              <div style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderRadius: '12px',
                padding: '24px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '20px' }}>
                  Top Holdings
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {portfolio.topHoldings.slice(0, 4).map((holding, idx) => (
                    <div key={idx} style={{
                      padding: '12px',
                      backgroundColor: colors.utility.primaryBackground,
                      borderRadius: '8px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: colors.utility.primaryText }}>
                          {holding.fundName}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: getValueColor(holding.returns) }}>
                          {formatPercentage(holding.returns)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ fontSize: '11px', color: colors.utility.secondaryText }}>
                          Value: {formatCurrency(holding.value)}
                        </div>
                        <div style={{ fontSize: '11px', color: colors.utility.secondaryText }}>
                          {holding.allocation}%
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
                          width: `${holding.allocation}%`,
                          height: '100%',
                          backgroundColor: colors.brand.primary
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming Events */}
              {jtbd.upcomingEvents && (
                <div style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  borderRadius: '12px',
                  padding: '24px'
                }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '20px' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <PortfolioSummaryWidget portfolio={portfolio} compact={false} showSparkline={true} />
            
            <div style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '12px',
              padding: '24px'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '20px' }}>
                SIP Details
              </h3>
              {portfolio.sipDetails && portfolio.sipDetails.map((sip, idx) => (
                <div key={idx} style={{
                  padding: '12px',
                  backgroundColor: colors.utility.primaryBackground,
                  borderRadius: '8px',
                  marginBottom: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: colors.utility.primaryText }}>
                        {sip.fundName}
                      </div>
                      <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
                        ₹{sip.amount.toLocaleString('en-IN')}/month on {sip.date}th
                      </div>
                    </div>
                    <div style={{
                      padding: '4px 8px',
                      backgroundColor: sip.active ? '#10B98120' : '#EF444420',
                      color: sip.active ? '#10B981' : '#EF4444',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      {sip.active ? 'ACTIVE' : 'PAUSED'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              gridColumn: 'span 2',
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '12px',
              padding: '24px'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '20px' }}>
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
                  {portfolio.topHoldings.map((holding, idx) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${colors.utility.primaryText}10` }}>
                      <td style={{ padding: '12px', fontSize: '13px', color: colors.utility.primaryText }}>
                        {holding.fundName}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', color: colors.utility.primaryText }}>
                        {formatCurrency(holding.value * 0.85)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', color: colors.utility.primaryText }}>
                        {formatCurrency(holding.value)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: getValueColor(holding.returns) }}>
                        {formatPercentage(holding.returns)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', color: colors.utility.primaryText }}>
                        {holding.allocation}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Goals Tab */}
        {activeTab === 'goals' && jtbd && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <JTBDActionCard
                actions={jtbd.actions}
                primaryGoal={jtbd.primaryGoal}
                riskAssessment={jtbd.riskAssessment}
                compact={false}
                maxActions={10}
              />

              {jtbd.recommendations && (
                <div style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  borderRadius: '12px',
                  padding: '24px'
                }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '20px' }}>
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
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '20px' }}>
                      Strengths
                    </h3>
                    {jtbd.detailedAnalysis.strengthAreas.map((strength, idx) => (
                      <div key={idx} style={{
                        padding: '8px',
                        marginBottom: '8px',
                        fontSize: '12px',
                        color: colors.utility.primaryText,
                        borderLeft: `2px solid #10B981`
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
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '20px' }}>
                      Areas to Improve
                    </h3>
                    {jtbd.detailedAnalysis.improvementAreas.map((area, idx) => (
                      <div key={idx} style={{
                        padding: '8px',
                        marginBottom: '8px',
                        fontSize: '12px',
                        color: colors.utility.primaryText,
                        borderLeft: `2px solid #F97316`
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
                      <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '20px' }}>
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
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.utility.primaryText }}>
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
                Upload Statement
              </button>
            </div>

            {portfolio.recentTransactions && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.utility.primaryText}20` }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: colors.utility.secondaryText }}>DATE</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: colors.utility.secondaryText }}>TYPE</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: colors.utility.secondaryText }}>FUND NAME</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: colors.utility.secondaryText }}>AMOUNT</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: colors.utility.secondaryText }}>UNITS</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: colors.utility.secondaryText }}>NAV</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.recentTransactions.map((txn, idx) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${colors.utility.primaryText}10` }}>
                      <td style={{ padding: '12px', fontSize: '13px', color: colors.utility.primaryText }}>
                        {new Date(txn.date).toLocaleDateString('en-IN')}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '2px 8px',
                          backgroundColor: txn.type === 'BUY' || txn.type === 'SIP' ? '#10B98120' : '#EF444420',
                          color: txn.type === 'BUY' || txn.type === 'SIP' ? '#10B981' : '#EF4444',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          {txn.type}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px', color: colors.utility.primaryText }}>
                        {txn.fundName}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: colors.utility.primaryText }}>
                        {formatCurrency(txn.amount)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', color: colors.utility.primaryText }}>
                        {txn.units || '-'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', color: colors.utility.primaryText }}>
                        {txn.nav ? `₹${txn.nav}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerViewPage;