// src/components/jtbd/JTBDActionCard.tsx

import React from 'react';
import { JTBDAction, JTBDGoal, JTBDRiskAssessment } from '../../types/jtbd.types';
import { useTheme } from '../../contexts/ThemeContext';

interface JTBDActionCardProps {
  actions: JTBDAction[];
  primaryGoal?: JTBDGoal;
  riskAssessment?: JTBDRiskAssessment;
  compact?: boolean;
  maxActions?: number;
  onActionClick?: (action: JTBDAction) => void;
}

const JTBDActionCard: React.FC<JTBDActionCardProps> = ({
  actions,
  primaryGoal,
  riskAssessment,
  compact = false,
  maxActions = 3,
  onActionClick
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Priority colors
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical': return '#DC2626';
      case 'high': return '#F97316';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return colors.utility.secondaryText;
    }
  };

  // Action type icons
  const getActionIcon = (type: string) => {
    switch (type) {
      case 'rebalancing':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
        );
      case 'tax-saving':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
            <path d="M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0z" />
          </svg>
        );
      case 'goal-based':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        );
      case 'risk-management':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        );
      case 'opportunity':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        );
      default:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        );
    }
  };

  // Icons
  const ClockIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12,6 12,12 16,14" />
    </svg>
  );

  const ChevronRightIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9,18 15,12 9,6" />
    </svg>
  );

  const AlertIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );

  // Format currency
  const formatCurrency = (value: number): string => {
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)}L`;
    }
    return `₹${value.toLocaleString('en-IN')}`;
  };

  // Calculate days until deadline
  const getDaysUntil = (deadline: string): number => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const visibleActions = actions.slice(0, maxActions);
  const hasMoreActions = actions.length > maxActions;

  if (compact) {
    // Compact view for list
    const topAction = actions[0];
    if (!topAction) return null;

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 0'
      }}>
        <div
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: getPriorityColor(topAction.priority),
            flexShrink: 0
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '12px',
            color: colors.utility.primaryText,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {topAction.title}
          </div>
        </div>
        {topAction.deadline && (
          <div style={{
            fontSize: '11px',
            color: colors.utility.secondaryText,
            display: 'flex',
            alignItems: 'center',
            gap: '2px'
          }}>
            <ClockIcon />
            {getDaysUntil(topAction.deadline)}d
          </div>
        )}
        {actions.length > 1 && (
          <div style={{
            padding: '2px 6px',
            backgroundColor: colors.utility.primaryText + '10',
            borderRadius: '8px',
            fontSize: '10px',
            color: colors.utility.secondaryText
          }}>
            +{actions.length - 1}
          </div>
        )}
      </div>
    );
  }

  // Full card view
  return (
    <div style={{
      backgroundColor: colors.utility.secondaryBackground,
      borderRadius: '12px',
      padding: '16px',
      border: `1px solid ${colors.utility.primaryText}10`
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <div style={{
          fontSize: '12px',
          color: colors.utility.secondaryText,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          fontWeight: '500'
        }}>
          Actions Required
        </div>
        {actions.length > 0 && (
          <div style={{
            padding: '2px 8px',
            backgroundColor: getPriorityColor(actions[0].priority) + '20',
            borderRadius: '8px',
            fontSize: '10px',
            fontWeight: '600',
            color: getPriorityColor(actions[0].priority)
          }}>
            {actions.filter(a => a.priority === 'critical' || a.priority === 'high').length} Urgent
          </div>
        )}
      </div>

      {/* Primary Goal Progress */}
      {primaryGoal && (
        <div style={{
          marginBottom: '12px',
          padding: '12px',
          backgroundColor: colors.utility.primaryBackground,
          borderRadius: '8px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <div style={{
              fontSize: '13px',
              color: colors.utility.primaryText,
              fontWeight: '500'
            }}>
              {primaryGoal.name}
            </div>
            <div style={{
              fontSize: '12px',
              color: primaryGoal.onTrack ? '#10B981' : '#F59E0B',
              fontWeight: '600'
            }}>
              {primaryGoal.currentProgress}%
            </div>
          </div>
          
          <div style={{
            width: '100%',
            height: '6px',
            backgroundColor: colors.utility.secondaryText + '20',
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${primaryGoal.currentProgress}%`,
              height: '100%',
              backgroundColor: primaryGoal.onTrack ? '#10B981' : '#F59E0B',
              transition: 'width 0.3s ease'
            }} />
          </div>
          
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '6px',
            fontSize: '10px',
            color: colors.utility.secondaryText
          }}>
            <span>₹{(primaryGoal.monthlyRequired / 1000).toFixed(0)}K/month needed</span>
            <span>{primaryGoal.targetDate.split('-')[0]}</span>
          </div>
        </div>
      )}

      {/* Risk Assessment Alert */}
      {riskAssessment && riskAssessment.action !== 'maintain' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px',
          backgroundColor: '#F59E0B' + '10',
          borderRadius: '8px',
          marginBottom: '12px'
        }}>
          <AlertIcon />
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '11px',
              color: '#F59E0B',
              fontWeight: '500'
            }}>
              Risk Adjustment Needed
            </div>
            <div style={{
              fontSize: '10px',
              color: colors.utility.secondaryText,
              marginTop: '2px'
            }}>
              {riskAssessment.action === 'increase' ? 'Consider adding equity' : 'Reduce risky assets'}
            </div>
          </div>
        </div>
      )}

      {/* Action Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {visibleActions.map((action) => (
          <div
            key={action.id}
            style={{
              padding: '10px',
              backgroundColor: colors.utility.primaryBackground,
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              borderLeft: `3px solid ${getPriorityColor(action.priority)}`
            }}
            onClick={() => onActionClick?.(action)}
          >
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              <div style={{
                color: getPriorityColor(action.priority),
                marginTop: '2px'
              }}>
                {getActionIcon(action.type)}
              </div>
              
              <div style={{ flex: 1 }}>
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
                  lineHeight: '1.4'
                }}>
                  {action.description}
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginTop: '6px'
                }}>
                  {action.impact && (
                    <div style={{
                      fontSize: '10px',
                      color: '#10B981',
                      fontWeight: '500'
                    }}>
                      {action.impact}
                    </div>
                  )}
                  
                  {action.estimatedValue && (
                    <div style={{
                      fontSize: '10px',
                      color: colors.brand.primary,
                      fontWeight: '600'
                    }}>
                      {formatCurrency(action.estimatedValue)}
                    </div>
                  )}
                  
                  {action.deadline && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10px',
                      color: getDaysUntil(action.deadline) < 30 ? '#F59E0B' : colors.utility.secondaryText
                    }}>
                      <ClockIcon />
                      {getDaysUntil(action.deadline)} days
                    </div>
                  )}
                </div>
                
                                  {action.actionButton && (
                  <button
                    style={{
                      marginTop: '8px',
                      padding: '4px 10px',
                      backgroundColor: getPriorityColor(action.priority) + '20',
                      color: getPriorityColor(action.priority),
                      border: `1px solid ${getPriorityColor(action.priority)}40`,
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Action clicked:', action.id, action.actionButton?.action);
                    }}
                  >
                    {action.actionButton.label}
                    <ChevronRightIcon />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* View More */}
      {hasMoreActions && (
        <button
          style={{
            width: '100%',
            marginTop: '8px',
            padding: '8px',
            backgroundColor: 'transparent',
            color: colors.brand.primary,
            border: `1px solid ${colors.brand.primary}40`,
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          View {actions.length - maxActions} More Actions
          <ChevronRightIcon />
        </button>
      )}
    </div>
  );
};

export default JTBDActionCard;