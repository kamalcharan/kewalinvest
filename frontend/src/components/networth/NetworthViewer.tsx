// frontend/src/components/networth/NetworthViewer.tsx
// Main container component for NetworthViewer - Cycle 3 Frontend
// Combines Summary, History Chart, and Breakdown views

import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useNetworthViewer } from '../../hooks/useNetworthData';
import { NetworthTab } from '../../types/networth.types';
import NetworthSummary from './NetworthSummary';
import NetworthHistoryChart from './NetworthHistoryChart';
import NetworthBreakdown from './NetworthBreakdown';

interface NetworthViewerProps {
  customerId?: number;
  familyHeadIwellcode?: string;
  defaultTab?: NetworthTab;
  showTabs?: boolean;
  compact?: boolean;
}

const NetworthViewer: React.FC<NetworthViewerProps> = ({
  customerId,
  familyHeadIwellcode,
  defaultTab = 'summary',
  showTabs = true,
  compact = false
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  const [activeTab, setActiveTab] = useState<NetworthTab>(defaultTab);

  // Fetch all networth data
  const {
    summary,
    history,
    breakdown,
    goals,
    isLoading,
    isError,
    errors,
    refetch
  } = useNetworthViewer({
    customerId,
    familyHeadIwellcode,
    enabled: !!(customerId || familyHeadIwellcode)
  });

  // Icons
  const RefreshIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );

  const SummaryIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );

  const ChartIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  );

  const BreakdownIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c2.39 0 4.68.94 6.36 2.64" />
      <path d="M12 8v4l3 3" />
    </svg>
  );

  const GoalsIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );

  // Tab configuration
  const tabs: { key: NetworthTab; label: string; icon: React.ReactNode }[] = [
    { key: 'summary', label: 'Summary', icon: <SummaryIcon /> },
    { key: 'history', label: 'History', icon: <ChartIcon /> },
    { key: 'breakdown', label: 'Breakdown', icon: <BreakdownIcon /> },
    { key: 'goals', label: 'Goals', icon: <GoalsIcon /> }
  ];

  // Loading state
  if (isLoading) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: `3px solid ${colors.utility.primaryText}20`,
          borderTopColor: colors.brand.primary,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }} />
        <div style={{
          fontSize: '14px',
          color: colors.utility.secondaryText
        }}>
          Loading networth data...
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        border: `1px solid ${colors.semantic?.error || '#EF4444'}30`
      }}>
        <div style={{
          fontSize: '14px',
          color: colors.semantic?.error || '#EF4444',
          marginBottom: '12px'
        }}>
          Failed to load networth data
        </div>
        <button
          onClick={refetch}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            backgroundColor: colors.brand.primary,
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          <RefreshIcon />
          Retry
        </button>
      </div>
    );
  }

  // No data state
  if (!summary && !history && !breakdown) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px'
      }}>
        <div style={{
          fontSize: '14px',
          color: colors.utility.secondaryText,
          marginBottom: '8px'
        }}>
          No networth data available
        </div>
        <div style={{
          fontSize: '12px',
          color: colors.utility.secondaryText
        }}>
          Add investment plans to see your networth
        </div>
      </div>
    );
  }

  // Compact view - just summary
  if (compact && summary) {
    return <NetworthSummary data={summary} compact />;
  }

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'summary':
        return summary ? (
          <NetworthSummary data={summary} showBreakdown />
        ) : (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: colors.utility.secondaryText
          }}>
            Summary data not available
          </div>
        );

      case 'history':
        return history ? (
          <NetworthHistoryChart data={history} height={350} />
        ) : (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: colors.utility.secondaryText
          }}>
            History data not available
          </div>
        );

      case 'breakdown':
        return breakdown ? (
          <NetworthBreakdown data={breakdown} showInvestmentPlans />
        ) : (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: colors.utility.secondaryText
          }}>
            Breakdown data not available
          </div>
        );

      case 'goals':
        return goals ? (
          <GoalsView data={goals} colors={colors} />
        ) : (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: colors.utility.secondaryText
          }}>
            Goals data not available
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      {/* Header with Tabs */}
      {showTabs && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: '4px',
            padding: '4px',
            backgroundColor: colors.utility.primaryBackground,
            borderRadius: '10px'
          }}>
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  fontSize: '13px',
                  fontWeight: '500',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: activeTab === tab.key ? colors.brand.primary : 'transparent',
                  color: activeTab === tab.key ? '#ffffff' : colors.utility.secondaryText,
                  transition: 'all 0.2s ease'
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={refetch}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              backgroundColor: 'transparent',
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '500',
              color: colors.utility.secondaryText,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <RefreshIcon />
            Refresh
          </button>
        </div>
      )}

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
};

// Goals View Component (inline for simplicity)
interface GoalsViewProps {
  data: any;
  colors: any;
}

const GoalsView: React.FC<GoalsViewProps> = ({ data, colors }) => {
  const { NetworthService } = require('../../services/networth.service');

  if (!data.goals || data.goals.length === 0) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        color: colors.utility.secondaryText
      }}>
        No goals configured
      </div>
    );
  }

  return (
    <div>
      {/* Goals Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <div style={{
          padding: '16px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '10px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: colors.utility.primaryText }}>
            {data.total_goals}
          </div>
          <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>Total Goals</div>
        </div>

        <div style={{
          padding: '16px',
          backgroundColor: '#10B98115',
          borderRadius: '10px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#10B981' }}>
            {data.goals_on_track}
          </div>
          <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>On Track</div>
        </div>

        <div style={{
          padding: '16px',
          backgroundColor: '#F59E0B15',
          borderRadius: '10px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#F59E0B' }}>
            {data.goals_at_risk}
          </div>
          <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>At Risk</div>
        </div>

        <div style={{
          padding: '16px',
          backgroundColor: '#EF444415',
          borderRadius: '10px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#EF4444' }}>
            {data.goals_behind}
          </div>
          <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>Behind</div>
        </div>
      </div>

      {/* Goals List */}
      {data.goals.map((goal: any) => (
        <div
          key={goal.goal_id}
          style={{
            padding: '16px',
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px',
            marginBottom: '12px',
            border: `1px solid ${colors.utility.primaryText}10`
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '12px'
          }}>
            <div>
              <div style={{
                fontSize: '15px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                marginBottom: '4px'
              }}>
                {goal.goal_name}
              </div>
              <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
                Target: {NetworthService.formatDate(goal.target_date)}
              </div>
            </div>

            <div style={{
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '600',
              backgroundColor: NetworthService.getGoalStatusColor(goal.status) + '20',
              color: NetworthService.getGoalStatusColor(goal.status)
            }}>
              {NetworthService.getGoalStatusLabel(goal.status)}
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{
            height: '8px',
            backgroundColor: colors.utility.primaryText + '10',
            borderRadius: '4px',
            marginBottom: '12px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${Math.min(goal.achievability_percentage, 100)}%`,
              backgroundColor: NetworthService.getGoalStatusColor(goal.status),
              borderRadius: '4px',
              transition: 'width 0.3s ease'
            }} />
          </div>

          {/* Goal Metrics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginBottom: '2px' }}>
                Target Amount
              </div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText }}>
                {NetworthService.formatCurrency(goal.target_amount)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginBottom: '2px' }}>
                Projected Value
              </div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText }}>
                {NetworthService.formatCurrency(goal.projected_value_at_target)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginBottom: '2px' }}>
                {goal.shortfall_or_surplus >= 0 ? 'Surplus' : 'Shortfall'}
              </div>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: NetworthService.getReturnColor(goal.shortfall_or_surplus)
              }}>
                {NetworthService.formatCurrency(Math.abs(goal.shortfall_or_surplus))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NetworthViewer;
