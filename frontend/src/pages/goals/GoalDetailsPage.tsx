// frontend/src/pages/goals/GoalDetailsPage.tsx

import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Edit, Shuffle, Target } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useGoal, useGoalHistory, useRecalculateGoal } from '../../hooks/useGoals';
import { useJTBDExecutions } from '../../hooks/useJTBD';
import {} from '../../utils/goalUtils';
import GoalCard from '../../components/goals/GoalCard';
import { NetworthProjectionChart } from '../../components/portfolio/NetworthProjectionChart';
import GoalActionCard from '../../components/goals/GoalActionCard';
import GoalRecalculationModal from '../../components/goals/GoalRecalculationModal';
import JTBDExecutionCard from '../../components/jtbd/JTBDExecutionCard';
import GoalMetricsCard from '../../components/goals/GoalMetricsCard';
import GoalInvestmentAllocator from '../../components/goals/GoalInvestmentAllocator';
import ConfirmationDialog from '../../components/ui/ConfirmationDialog';
import { GoalActionItem } from '../../types/goal.types';
import { JTBD_TYPE, EXECUTION_STATUS } from '../../constants/jtbd.constants';

type TabType = 'overview' | 'history' | 'actions' | 'allocations';

const GoalDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { customerId, goalId } = useParams<{ customerId: string; goalId: string }>();
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showRecalculationModal, setShowRecalculationModal] = useState(false);
  const [recalculationResult, setRecalculationResult] = useState<{ previousCorpus?: number; newCorpus?: number; error?: boolean } | null>(null);
  const [showRebalanceComingSoon, setShowRebalanceComingSoon] = useState(false);
  const [showEditGoalComingSoon, setShowEditGoalComingSoon] = useState(false);

  const goalIdNum = goalId ? parseInt(goalId) : 0;
  const customerIdNum = customerId ? parseInt(customerId) : 0;

  const { data: goal, isLoading: goalLoading, error: goalError, refetch: refetchGoal } = useGoal(goalIdNum);
  const { data: _history, isLoading: _historyLoading } = useGoalHistory(goalIdNum);

  // Fetch SIP executions for this goal
  const { data: sipExecutionsData, isLoading: sipExecutionsLoading, refetch: refetchSIPExecutions } = useJTBDExecutions({
    config_id: goalIdNum,
    execution_type: JTBD_TYPE.GOAL_SIP_PLAN
  });

  const recalculateMutation = useRecalculateGoal();

  // Handle recalculate
  const handleRecalculate = async () => {
    setShowRecalculationModal(true);
    setRecalculationResult(null);

    try {
      const result = await recalculateMutation.mutateAsync(goalIdNum);
      setRecalculationResult({
        previousCorpus: result.current_value,
        newCorpus: result.projected_corpus,
        error: false
      });
      refetchGoal();
    } catch (error) {
      setRecalculationResult({ error: true });
    }
  };

  // Loading state
  if (goalLoading) {
    return (
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
          Loading goal details...
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Error state
  if (goalError || !goal) {
    return (
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
            fontSize: '48px'
          }}>
            ⚠️
          </div>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            marginBottom: '8px'
          }}>
            Failed to Load Goal
          </h2>
          <p style={{
            fontSize: '14px',
            color: colors.utility.secondaryText,
            marginBottom: '24px'
          }}>
            Unable to load goal details. Please try again.
          </p>
          <button
            onClick={() => navigate(`/customers/${customerId}`)}
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
            Back to Customer
          </button>
        </div>
      </div>
    );
  }

  const config = goal.config_data;

  // Get actions for this goal
  const { getGoalActions } = require('../../utils/goalUtils');
  const actions = getGoalActions(goal);

  // Calculate SIP metrics
  const totalSIPs = sipExecutionsData?.executions.length || 0;
  const completedSIPs = sipExecutionsData?.executions.filter(
    ex => ex.execution_status === EXECUTION_STATUS.COMPLETED
  ).length || 0;
  const missedSIPs = sipExecutionsData?.executions.filter(
    ex => ex.execution_status === EXECUTION_STATUS.NOT_EXECUTED ||
         (ex.execution_status === EXECUTION_STATUS.PLANNED && new Date(ex.scheduled_date) < new Date())
  ).length || 0;

  // Tabs config
  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'history', label: 'History', icon: '📈' },
    { id: 'allocations', label: 'Allocations', icon: '🎯' },
    { id: 'actions', label: 'Actions', icon: '💡' }
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.utility.primaryBackground }}>
      {/* Header */}
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderBottom: `1px solid ${colors.utility.primaryText}10`,
        padding: '20px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Left: Back button and title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={() => navigate(`/customers/${customerId}?tab=goals`)}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: colors.utility.primaryBackground,
                  border: `1px solid ${colors.utility.primaryText}20`,
                  color: colors.utility.primaryText,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.brand.primary + '20';
                  e.currentTarget.style.borderColor = colors.brand.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
                  e.currentTarget.style.borderColor = colors.utility.primaryText + '20';
                }}
              >
                <ArrowLeft size={20} />
              </button>

              <div>
                <h1 style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: colors.utility.primaryText,
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Target size={24} color={colors.brand.primary} />
                  {goal.title}
                </h1>
                <p style={{
                  fontSize: '14px',
                  color: colors.utility.secondaryText,
                  margin: '4px 0 0 0'
                }}>
                  {config.goal_name}
                </p>
              </div>
            </div>

            {/* Right: Action buttons */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                onClick={handleRecalculate}
                disabled={recalculateMutation.isPending}
                style={{
                  padding: '10px 16px',
                  backgroundColor: 'transparent',
                  color: colors.brand.primary,
                  border: `1px solid ${colors.brand.primary}40`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  opacity: recalculateMutation.isPending ? 0.5 : 1,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!recalculateMutation.isPending) {
                    e.currentTarget.style.backgroundColor = colors.brand.primary + '10';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <RefreshCw size={16} />
                Recalculate
              </button>

              <button
                onClick={() => setShowRebalanceComingSoon(true)}
                style={{
                  padding: '10px 16px',
                  backgroundColor: 'transparent',
                  color: colors.utility.primaryText,
                  border: `1px solid ${colors.utility.primaryText}30`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.utility.primaryText + '10';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Shuffle size={16} />
                Rebalance
              </button>

              <button
                onClick={() => setShowEditGoalComingSoon(true)}
                style={{
                  padding: '10px 16px',
                  backgroundColor: colors.brand.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 4px 12px ${colors.brand.primary}40`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Edit size={16} />
                Edit Goal
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderBottom: `1px solid ${colors.utility.primaryText}10`,
        position: 'sticky',
        top: '81px',
        zIndex: 9
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', gap: '0', padding: '0 24px' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '14px 20px',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? `3px solid ${colors.brand.primary}` : '3px solid transparent',
                color: activeTab === tab.id ? colors.brand.primary : colors.utility.secondaryText,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = colors.utility.primaryText;
                  e.currentTarget.style.backgroundColor = colors.utility.primaryText + '05';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = colors.utility.secondaryText;
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Goal Card */}
            <GoalCard goal={goal} compact={false} showAllocations={true} hideActions={true} />

            {/* Progress Tracking - 70:30 Split */}
            <div style={{ display: 'grid', gridTemplateColumns: '70% 30%', gap: '20px' }}>
              {/* Left: Progress Chart (70%) - With RED lines & inverted triangles */}
              <NetworthProjectionChart goalId={goalIdNum} height={300} showProjection={true} />

              {/* Right: Metrics Card (30%) */}
              <GoalMetricsCard
                goal={goal}
                totalSIPs={totalSIPs}
                completedSIPs={completedSIPs}
                missedSIPs={missedSIPs}
              />
            </div>
          </div>
        )}

        {/* History Tab - SIP Execution Records */}
        {activeTab === 'history' && (
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px',
            padding: '24px'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              margin: '0 0 20px 0'
            }}>
              SIP Execution History
            </h3>
            {sipExecutionsLoading ? (
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
            ) : !sipExecutionsData || sipExecutionsData.executions.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 40px',
                color: colors.utility.secondaryText
              }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>💰</div>
                <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>No SIP Records Yet</div>
                <div style={{ fontSize: '13px' }}>SIP execution records will appear here as they are scheduled and completed</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {sipExecutionsData.executions.map((execution) => (
                  <JTBDExecutionCard
                    key={execution.id}
                    execution={execution}
                    onUpdate={() => {
                      refetchSIPExecutions();
                      refetchGoal();
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Allocations Tab */}
        {activeTab === 'allocations' && (
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px',
            padding: '24px'
          }}>
            <div style={{
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: `1px solid ${colors.utility.primaryText}10`
            }}>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                margin: '0 0 8px 0'
              }}>
                🎯 Investment Allocations
              </h3>
              <p style={{
                fontSize: '14px',
                color: colors.utility.secondaryText,
                margin: 0
              }}>
                Allocate your investment plans to this goal. Total allocation must equal 100%.
              </p>
            </div>
            <GoalInvestmentAllocator goalId={goalIdNum} customerId={customerIdNum} />
          </div>
        )}

        {/* Actions Tab */}
        {activeTab === 'actions' && (
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px',
            padding: '24px'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              margin: '0 0 20px 0'
            }}>
              Recommended Actions
            </h3>
            {actions.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 30px',
                color: colors.utility.secondaryText
              }}>
                {goal.config_data?.goal_type === 'time_and_price_goal' ? (
                  <>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>✨</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: colors.semantic.success }}>
                      No Actions Needed
                    </div>
                    <div style={{ fontSize: '13px', marginBottom: '16px' }}>
                      Your goal is performing as expected. Keep up the good work!
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>📊</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: colors.utility.primaryText }}>
                      Recommended Actions
                    </div>
                    <div style={{ fontSize: '13px', marginBottom: '16px', lineHeight: 1.6 }}>
                      This feature analyzes your goal progress using Monte Carlo simulation to provide actionable recommendations like:
                    </div>
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px',
                      justifyContent: 'center',
                      marginBottom: '20px'
                    }}>
                      <span style={{ padding: '6px 12px', backgroundColor: colors.semantic.warning + '15', borderRadius: '6px', fontSize: '12px' }}>💰 Increase SIP</span>
                      <span style={{ padding: '6px 12px', backgroundColor: colors.semantic.info + '15', borderRadius: '6px', fontSize: '12px' }}>⚖️ Rebalance Portfolio</span>
                      <span style={{ padding: '6px 12px', backgroundColor: colors.utility.primaryText + '10', borderRadius: '6px', fontSize: '12px' }}>📅 Extend Timeline</span>
                    </div>
                    <div style={{
                      padding: '16px',
                      backgroundColor: colors.semantic.info + '10',
                      borderRadius: '8px',
                      border: `1px solid ${colors.semantic.info}20`,
                      textAlign: 'left'
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: colors.semantic.info, marginBottom: '8px' }}>
                        ℹ️ To enable recommendations:
                      </div>
                      <ol style={{ fontSize: '12px', margin: 0, paddingLeft: '20px', lineHeight: 1.8 }}>
                        <li>Ensure goal type is "Time & Price Goal" (both target amount and date set)</li>
                        <li>Allocate investments to this goal in the Allocations tab</li>
                        <li>Click "Recalculate" to run the Monte Carlo analysis</li>
                      </ol>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {actions.map((action: GoalActionItem, idx: number) => (
                  <GoalActionCard
                    key={idx}
                    goalId={goalIdNum}
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

      {/* Recalculation Modal */}
      {showRecalculationModal && (
        <GoalRecalculationModal
          goalId={goalIdNum}
          isRecalculating={recalculateMutation.isPending}
          onClose={() => {
            setShowRecalculationModal(false);
            setRecalculationResult(null);
          }}
          previousCorpus={recalculationResult?.previousCorpus}
          newCorpus={recalculationResult?.newCorpus}
          error={recalculationResult?.error}
        />
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Rebalance Coming Soon Dialog */}
      <ConfirmationDialog
        isOpen={showRebalanceComingSoon}
        onClose={() => setShowRebalanceComingSoon(false)}
        onConfirm={() => setShowRebalanceComingSoon(false)}
        title="Coming Soon"
        description="The Rebalance feature is currently under development and will be available in a future release. This feature will help you optimize your portfolio allocation to better align with your goal."
        confirmText="Got it"
        cancelText=""
        type="info"
      />

      {/* Edit Goal Coming Soon Dialog */}
      <ConfirmationDialog
        isOpen={showEditGoalComingSoon}
        onClose={() => setShowEditGoalComingSoon(false)}
        onConfirm={() => setShowEditGoalComingSoon(false)}
        title="Coming Soon"
        description="The Edit Goal feature is currently under development and will be available in a future release. This feature will allow you to modify goal parameters like target amount, timeline, and allocations."
        confirmText="Got it"
        cancelText=""
        type="info"
      />
    </div>
  );
};

export default GoalDetailsPage;
