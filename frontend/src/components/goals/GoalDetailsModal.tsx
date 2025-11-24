// frontend/src/components/goals/GoalDetailsModal.tsx

import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useGoal, useGoalHistory, useRecalculateGoal, useUpdateGoal } from '../../hooks/useGoals';
import { formatDate, formatCurrency, formatPercentage } from '../../utils/goalUtils';
import GoalCard from './GoalCard';
import GoalProgressChart from './GoalProgressChart';
import GoalActionCard from './GoalActionCard';
import { GoalActionItem } from '../../types/goal.types';

interface GoalDetailsModalProps {
  goalId: number;
  isOpen?: boolean;
  onClose: () => void;
}

type TabType = 'overview' | 'history' | 'actions';

const GoalDetailsModal: React.FC<GoalDetailsModalProps> = ({
  goalId,
  isOpen = true,
  onClose
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const { data: goal, isLoading: goalLoading, error: goalError } = useGoal(goalId);
  const { data: history, isLoading: historyLoading } = useGoalHistory(goalId);
  const recalculateMutation = useRecalculateGoal();

  // Icons
  const XIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  const RefreshIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );

  const PauseIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );

  const PlayIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );

  // Loading state
  if (goalLoading) {
    return (
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: colors.utility.primaryBackground,
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: `3px solid ${colors.utility.primaryText}20`,
          borderTopColor: colors.brand.primary,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <div style={{ fontSize: '14px', color: colors.utility.secondaryText }}>Loading goal details...</div>
      </div>
    );
  }

  // Error state
  if (goalError || !goal) {
    return (
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: colors.utility.primaryBackground,
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        zIndex: 9999,
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '16px', fontWeight: '600', color: colors.semantic.error }}>Failed to load goal</div>
        <button
          onClick={onClose}
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            backgroundColor: colors.brand.primary,
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Close
        </button>
      </div>
    );
  }

  if (!isOpen) return null;

  const config = goal.config_data;

  // Get actions for this goal
  const { getGoalActions } = require('../../utils/goalUtils');
  const actions = getGoalActions(goal);

  // Handle recalculate
  const handleRecalculate = async () => {
    try {
      await recalculateMutation.mutateAsync(goalId);
    } catch (error) {
      console.error('Failed to recalculate goal:', error);
    }
  };

  // Tabs config
  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'history', label: 'History', icon: '📈' },
    { id: 'actions', label: 'Actions', icon: '💡' }
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 9998,
          animation: 'fadeIn 0.2s ease-out'
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: colors.utility.primaryBackground,
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          zIndex: 9999,
          width: '95%',
          maxWidth: '1000px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          animation: 'modalSlideIn 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: `1px solid ${colors.utility.primaryText}10`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '20px',
                fontWeight: '700',
                color: colors.utility.primaryText,
                margin: 0
              }}
            >
              {goal.title}
            </h2>
            <p
              style={{
                fontSize: '13px',
                color: colors.utility.secondaryText,
                margin: '4px 0 0 0'
              }}
            >
              {config.goal_name}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Recalculate Button */}
            <button
              onClick={handleRecalculate}
              disabled={recalculateMutation.isPending}
              title="Recalculate Goal"
              style={{
                padding: '8px 12px',
                backgroundColor: 'transparent',
                color: colors.brand.primary,
                border: `1px solid ${colors.brand.primary}40`,
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: '500',
                opacity: recalculateMutation.isPending ? 0.5 : 1
              }}
            >
              <RefreshIcon />
              Recalculate
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                color: colors.utility.secondaryText,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <XIcon />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '0',
            borderBottom: `1px solid ${colors.utility.primaryText}10`,
            padding: '0 24px',
            overflow: 'auto',
            flexShrink: 0
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 16px',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? `3px solid ${colors.brand.primary}` : 'none',
                color: activeTab === tab.id ? colors.brand.primary : colors.utility.secondaryText,
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = colors.utility.primaryText;
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = colors.utility.secondaryText;
                }
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px'
          }}
        >
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Goal Card */}
              <GoalCard goal={goal} compact={false} />

              {/* Progress Chart */}
              <GoalProgressChart goalId={goalId} height={300} showProjection={true} />
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div>
              {historyLoading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    border: `2px solid ${colors.utility.primaryText}20`,
                    borderTopColor: colors.brand.primary,
                    borderRadius: '50%',
                    margin: '0 auto',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                </div>
              ) : !history || history.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: colors.utility.secondaryText
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
                  <div style={{ fontSize: '13px' }}>No history available yet</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '12px'
                  }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${colors.utility.primaryText}10` }}>
                        <th style={{ padding: '12px 8px', textAlign: 'left', color: colors.utility.secondaryText, fontWeight: '600' }}>Date</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right', color: colors.utility.secondaryText, fontWeight: '600' }}>Current Value</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right', color: colors.utility.secondaryText, fontWeight: '600' }}>Monthly SIP</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right', color: colors.utility.secondaryText, fontWeight: '600' }}>Projected</th>
                        {history[0]?.probability_of_success !== undefined && (
                          <th style={{ padding: '12px 8px', textAlign: 'right', color: colors.utility.secondaryText, fontWeight: '600' }}>Success %</th>
                        )}
                        <th style={{ padding: '12px 8px', textAlign: 'center', color: colors.utility.secondaryText, fontWeight: '600' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((snapshot, idx) => (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: `1px solid ${colors.utility.primaryText}10`,
                            backgroundColor: idx % 2 === 0 ? colors.utility.primaryBackground : 'transparent'
                          }}
                        >
                          <td style={{ padding: '10px 8px', color: colors.utility.primaryText }}>
                            {formatDate(snapshot.snapshot_date, 'short')}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', color: colors.utility.primaryText, fontWeight: '600' }}>
                            {formatCurrency(snapshot.current_value, true)}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', color: colors.utility.secondaryText }}>
                            {formatCurrency(snapshot.monthly_contribution, true)}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', color: colors.brand.primary, fontWeight: '600' }}>
                            {snapshot.projected_corpus ? formatCurrency(snapshot.projected_corpus, true) : '-'}
                          </td>
                          {history[0]?.probability_of_success !== undefined && (
                            <td style={{
                              padding: '10px 8px',
                              textAlign: 'right',
                              color: snapshot.probability_of_success
                                ? snapshot.probability_of_success >= 75 ? '#10B981' : snapshot.probability_of_success >= 60 ? '#F59E0B' : '#DC2626'
                                : colors.utility.secondaryText,
                              fontWeight: '600'
                            }}>
                              {snapshot.probability_of_success ? formatPercentage(snapshot.probability_of_success, 0) : '-'}
                            </td>
                          )}
                          <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                            <span style={{
                              fontSize: '10px',
                              padding: '2px 6px',
                              backgroundColor: snapshot.on_track ? '#10B981' + '20' : '#F59E0B' + '20',
                              color: snapshot.on_track ? '#10B981' : '#F59E0B',
                              borderRadius: '3px',
                              fontWeight: '600'
                            }}>
                              {snapshot.on_track ? 'On Track' : 'Behind'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Actions Tab */}
          {activeTab === 'actions' && (
            <div>
              {actions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: colors.utility.secondaryText }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>✨</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>No Actions Needed</div>
                  <div style={{ fontSize: '12px' }}>Goal is performing as expected</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {actions.map((action: GoalActionItem, idx: number) => (
                    <GoalActionCard
                      key={idx}
                      goalId={goalId}
                      goalTitle={goal.title}
                      action={action}
                      onDismiss={() => {}}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translate(-50%, -48%) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default GoalDetailsModal;