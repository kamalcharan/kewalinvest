// src/components/dashboard/CustomerDetailPanel.tsx
// Updated to use real backend API types

import React, { useState } from 'react';
import { CustomerWithContact } from '../../types/customer.types';
import { CustomerPortfolioResponse } from '../../types/portfolio.types';
import { JTBDData } from '../../types/jtbd.types';
import { useTheme } from '../../contexts/ThemeContext';
import PortfolioDonutChart from '../visualizations/PortfolioDonutChart';

interface CustomerDetailPanelProps {
  customer: CustomerWithContact;
  portfolio: CustomerPortfolioResponse;
  jtbd: JTBDData;
  onClose: () => void;
  onEdit?: () => void;
  onActionClick?: (action: any) => void;
}

const CustomerDetailPanel: React.FC<CustomerDetailPanelProps> = ({
  customer,
  portfolio,
  jtbd,
  onClose,
  onEdit,
  onActionClick
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  
  const [activeTab, setActiveTab] = useState<'overview' | 'portfolio' | 'actions'>('overview');

  // Format currency
  const formatCurrency = (value: number): string => {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(2)}Cr`;
    } else if (value >= 100000) {
      return `₹${(value / 100000).toFixed(2)}L`;
    }
    return `₹${value.toLocaleString('en-IN')}`;
  };

  // Format percentage
  const formatPercentage = (value: number): string => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  // Get color for value
  const getValueColor = (value: number): string => {
    if (value > 0) return '#10B981';
    if (value < 0) return '#EF4444';
    return colors.utility.secondaryText;
  };

  // Icons
  const CloseIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  const EditIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );

  const PhoneIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );

  const EmailIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );

  const CalendarIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );

  const InfoIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );

  // Get contact channels
  const phoneChannel = customer.channels?.find(ch => ch.channel_type === 'mobile' && ch.is_primary);
  const emailChannel = customer.channels?.find(ch => ch.channel_type === 'email' && ch.is_primary);

  return (
    <div style={{
      position: 'fixed',
      right: 0,
      top: 0,
      bottom: 0,
      width: '450px',
      backgroundColor: colors.utility.secondaryBackground,
      boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      animation: 'slideIn 0.3s ease'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: `1px solid ${colors.utility.primaryText}10`,
        backgroundColor: colors.utility.primaryBackground
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <div style={{ flex: 1 }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              margin: 0,
              marginBottom: '8px'
            }}>
              {customer.prefix} {customer.name}
            </h2>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <div style={{
                fontSize: '12px',
                color: colors.utility.secondaryText,
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span>ID: {customer.id}</span>
                {customer.iwell_code && (
                  <>
                    <span>•</span>
                    <span>IWell: {customer.iwell_code}</span>
                  </>
                )}
              </div>
              
              <div style={{
                display: 'flex',
                gap: '12px',
                fontSize: '12px',
                color: colors.utility.secondaryText
              }}>
                {phoneChannel && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <PhoneIcon />
                    <span>{phoneChannel.channel_value}</span>
                  </div>
                )}
                {emailChannel && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <EmailIcon />
                    <span>{emailChannel.channel_value}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {onEdit && (
              <button
                onClick={onEdit}
                style={{
                  padding: '8px',
                  backgroundColor: 'transparent',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '6px',
                  color: colors.utility.primaryText,
                  cursor: 'pointer'
                }}
                title="Edit Customer"
              >
                <EditIcon />
              </button>
            )}
            
            <button
              onClick={onClose}
              style={{
                padding: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                color: colors.utility.secondaryText,
                cursor: 'pointer'
              }}
              title="Close"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '12px',
          marginTop: '16px'
        }}>
          <div style={{
            padding: '8px',
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '8px'
          }}>
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              color: colors.utility.primaryText
            }}>
              {formatCurrency(portfolio.summary.current_value)}
            </div>
            <div style={{
              fontSize: '10px',
              color: colors.utility.secondaryText,
              textTransform: 'uppercase'
            }}>
              Portfolio Value
            </div>
          </div>
          
          <div style={{
            padding: '8px',
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '8px'
          }}>
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              color: getValueColor(portfolio.summary.return_percentage)
            }}>
              {formatPercentage(portfolio.summary.return_percentage)}
            </div>
            <div style={{
              fontSize: '10px',
              color: colors.utility.secondaryText,
              textTransform: 'uppercase'
            }}>
              Returns
            </div>
          </div>
          
          <div style={{
            padding: '8px',
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '8px'
          }}>
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              color: colors.brand.primary
            }}>
              {jtbd.actions.length}
            </div>
            <div style={{
              fontSize: '10px',
              color: colors.utility.secondaryText,
              textTransform: 'uppercase'
            }}>
              Actions
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: `1px solid ${colors.utility.primaryText}10`,
        backgroundColor: colors.utility.primaryBackground
      }}>
        {['overview', 'portfolio', 'actions'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab ? `2px solid ${colors.brand.primary}` : '2px solid transparent',
              color: activeTab === tab ? colors.brand.primary : colors.utility.secondaryText,
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              textTransform: 'capitalize',
              transition: 'all 0.2s ease'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px'
      }}>
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Summary Card */}
            <div style={{
              backgroundColor: colors.utility.primaryBackground,
              borderRadius: '12px',
              padding: '16px'
            }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                margin: 0,
                marginBottom: '12px'
              }}>
                Portfolio Summary
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: colors.utility.secondaryText }}>Total Invested</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText }}>
                    {formatCurrency(portfolio.summary.total_invested)}
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: colors.utility.secondaryText }}>Current Value</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText }}>
                    {formatCurrency(portfolio.summary.current_value)}
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: colors.utility.secondaryText }}>Total Returns</span>
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: getValueColor(portfolio.summary.total_returns) 
                  }}>
                    {formatCurrency(portfolio.summary.total_returns)}
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: colors.utility.secondaryText }}>Total Schemes</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText }}>
                    {portfolio.summary.total_schemes}
                  </span>
                </div>
              </div>
            </div>

            {/* Goal Progress */}
            <div style={{
              backgroundColor: colors.utility.primaryBackground,
              borderRadius: '12px',
              padding: '16px'
            }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                margin: 0,
                marginBottom: '12px'
              }}>
                Primary Goal
              </h3>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <span style={{
                  fontSize: '13px',
                  color: colors.utility.primaryText
                }}>
                  {jtbd.primaryGoal.name}
                </span>
                <span style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: jtbd.primaryGoal.onTrack ? '#10B981' : '#F59E0B'
                }}>
                  {jtbd.primaryGoal.currentProgress}%
                </span>
              </div>
              
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: colors.utility.secondaryText + '20',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${jtbd.primaryGoal.currentProgress}%`,
                  height: '100%',
                  backgroundColor: jtbd.primaryGoal.onTrack ? '#10B981' : '#F59E0B',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '8px',
                fontSize: '11px',
                color: colors.utility.secondaryText
              }}>
                <span>Target: {formatCurrency(jtbd.primaryGoal.targetAmount)}</span>
                <span>{jtbd.primaryGoal.targetDate}</span>
              </div>
            </div>

            {/* Next Review */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px',
              backgroundColor: colors.utility.primaryBackground,
              borderRadius: '8px'
            }}>
              <CalendarIcon />
              <div>
                <div style={{
                  fontSize: '12px',
                  color: colors.utility.secondaryText
                }}>
                  Next Review
                </div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: colors.utility.primaryText
                }}>
                  {new Date(jtbd.nextReview).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'portfolio' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Asset Allocation */}
            {portfolio.allocation && portfolio.allocation.length > 0 && (
              <div style={{
                backgroundColor: colors.utility.primaryBackground,
                borderRadius: '12px',
                padding: '16px'
              }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: colors.utility.primaryText,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  margin: 0,
                  marginBottom: '16px'
                }}>
                  Asset Allocation
                </h3>
                <PortfolioDonutChart
                  allocation={portfolio.allocation}
                  size={180}
                  strokeWidth={28}
                  showLegend={true}
                />
              </div>
            )}

            {/* Top Holdings */}
            {portfolio.holdings && portfolio.holdings.length > 0 && (
              <div style={{
                backgroundColor: colors.utility.primaryBackground,
                borderRadius: '12px',
                padding: '16px'
              }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: colors.utility.primaryText,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  margin: 0,
                  marginBottom: '12px'
                }}>
                  Top Holdings
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {portfolio.holdings.slice(0, 5).map((holding, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px',
                        backgroundColor: colors.utility.secondaryBackground,
                        borderRadius: '6px'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: '500',
                          color: colors.utility.primaryText,
                          marginBottom: '2px'
                        }}>
                          {holding.fund_name || holding.scheme_name}
                        </div>
                        <div style={{
                          fontSize: '11px',
                          color: colors.utility.secondaryText
                        }}>
                          {holding.allocation_percentage.toFixed(1)}% • {formatCurrency(holding.current_value)}
                        </div>
                      </div>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: getValueColor(holding.return_percentage)
                      }}>
                        {formatPercentage(holding.return_percentage)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'actions' && (
          <div>
            {/* Actions List */}
            <div style={{
              backgroundColor: colors.utility.primaryBackground,
              borderRadius: '12px',
              padding: '16px'
            }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                margin: 0,
                marginBottom: '12px'
              }}>
                Recommended Actions
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {jtbd.actions.slice(0, 10).map((action, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '12px',
                      backgroundColor: colors.utility.secondaryBackground,
                      borderRadius: '8px',
                      borderLeft: `3px solid ${
                        action.priority === 'critical' ? '#DC2626' :
                        action.priority === 'high' ? '#F97316' :
                        action.priority === 'medium' ? '#F59E0B' : '#10B981'
                      }`,
                      cursor: onActionClick ? 'pointer' : 'default'
                    }}
                    onClick={() => onActionClick?.(action)}
                  >
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '500',
                      color: colors.utility.primaryText,
                      marginBottom: '4px'
                    }}>
                      {action.title}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: colors.utility.secondaryText,
                      marginBottom: '6px'
                    }}>
                      {action.description}
                    </div>
                    <div style={{
                      fontSize: '10px',
                      color: colors.utility.secondaryText,
                      textTransform: 'uppercase',
                      fontWeight: '600'
                    }}>
                      Priority: {action.priority}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Insights */}
            {jtbd.insights.length > 0 && (
              <div style={{
                marginTop: '20px',
                backgroundColor: colors.utility.primaryBackground,
                borderRadius: '12px',
                padding: '16px'
              }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: colors.utility.primaryText,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  margin: 0,
                  marginBottom: '12px'
                }}>
                  <InfoIcon />
                  Insights
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {jtbd.insights.map((insight, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '8px',
                        backgroundColor: colors.utility.secondaryBackground,
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: colors.utility.secondaryText,
                        borderLeft: `2px solid ${colors.brand.primary}40`
                      }}
                    >
                      {insight}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default CustomerDetailPanel;