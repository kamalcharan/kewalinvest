// frontend/src/components/goals/GoalProgressTracker.tsx
import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { GoalService, GoalTrackingStatus } from '../../services/goal.service';

interface GoalProgressTrackerProps {
  customerId: number;
  onWatchlistChange?: () => void;
}

export const GoalProgressTracker: React.FC<GoalProgressTrackerProps> = ({
  customerId,
  onWatchlistChange
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [trackingData, setTrackingData] = useState<GoalTrackingStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTrackingData();
  }, [customerId]);

  const loadTrackingData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await GoalService.getCustomerGoalTrackingStatus(customerId);

      if (response.success && response.data) {
        setTrackingData(response.data);
      } else {
        setError(response.error || 'Failed to load goal tracking data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load goal tracking data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWatchlistToggle = async (goalId: number, isInWatchlist: boolean) => {
    try {
      if (isInWatchlist) {
        await GoalService.removeFromWatchlist(goalId);
      } else {
        await GoalService.addToWatchlist(goalId, 'Performance below expected value');
      }

      // Reload data
      await loadTrackingData();

      if (onWatchlistChange) {
        onWatchlistChange();
      }
    } catch (err: any) {
      console.error('Failed to toggle watchlist:', err);
    }
  };

  const getStatusColor = (isOnTrack: boolean) => {
    return isOnTrack ? colors.semantic.success : colors.semantic.error;
  };

  const getStatusIcon = (isOnTrack: boolean, variance: number) => {
    if (isOnTrack) {
      return <TrendingUp size={20} />;
    } else {
      return <TrendingDown size={20} />;
    }
  };

  const formatCurrency = (value: number): string => {
    return `₹${Math.abs(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const formatPercentage = (value: number): string => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <div
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center'
        }}
      >
        <p style={{ color: colors.utility.secondaryText }}>Loading goal tracking data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          backgroundColor: colors.semantic.error + '15',
          border: `1px solid ${colors.semantic.error}40`,
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        <AlertCircle size={20} style={{ color: colors.semantic.error }} />
        <p style={{ color: colors.semantic.error, margin: 0 }}>{error}</p>
      </div>
    );
  }

  if (trackingData.length === 0) {
    return (
      <div
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center'
        }}
      >
        <p style={{ color: colors.utility.secondaryText }}>No goals to track</p>
      </div>
    );
  }

  return (
    <div>
      <h3
        style={{
          fontSize: '16px',
          fontWeight: '600',
          color: colors.utility.primaryText,
          marginBottom: '16px'
        }}
      >
        Goal Progress Tracking
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {trackingData.map((goal) => (
          <div
            key={goal.goal_id}
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              border: `1px solid ${colors.utility.primaryText}10`,
              borderRadius: '12px',
              padding: '16px',
              transition: 'all 0.2s ease'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <h4
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: colors.utility.primaryText,
                    margin: '0 0 4px 0'
                  }}
                >
                  {goal.goal_name}
                </h4>
                <span
                  style={{
                    fontSize: '11px',
                    color: colors.utility.secondaryText,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  {goal.goal_type.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Watchlist Toggle */}
              <button
                onClick={() => handleWatchlistToggle(goal.goal_id, goal.is_in_watchlist)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: goal.is_in_watchlist
                    ? colors.semantic.warning + '20'
                    : 'transparent',
                  border: `1px solid ${goal.is_in_watchlist
                    ? colors.semantic.warning
                    : colors.utility.primaryText + '30'}`,
                  borderRadius: '6px',
                  color: goal.is_in_watchlist
                    ? colors.semantic.warning
                    : colors.utility.secondaryText,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                title={goal.is_in_watchlist ? 'Remove from watchlist' : 'Add to watchlist'}
              >
                {goal.is_in_watchlist ? <Eye size={14} /> : <EyeOff size={14} />}
                {goal.is_in_watchlist ? 'Watching' : 'Watch'}
              </button>
            </div>

            {/* Values */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginBottom: '4px' }}>
                  Current Value
                </div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText }}>
                  {formatCurrency(goal.current_value)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginBottom: '4px' }}>
                  Expected Value
                </div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText }}>
                  {formatCurrency(goal.expected_value)}
                </div>
              </div>
            </div>

            {/* Performance Bar */}
            <div style={{ marginBottom: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px'
                }}
              >
                <span style={{ fontSize: '11px', color: colors.utility.secondaryText }}>
                  Performance
                </span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: getStatusColor(goal.is_on_track),
                    fontSize: '13px',
                    fontWeight: '600'
                  }}
                >
                  {getStatusIcon(goal.is_on_track, goal.variance_percentage)}
                  {goal.performance_percentage.toFixed(1)}%
                </div>
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  height: '8px',
                  backgroundColor: colors.utility.primaryText + '10',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(goal.performance_percentage, 100)}%`,
                    backgroundColor: getStatusColor(goal.is_on_track),
                    borderRadius: '4px',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>

            {/* Status Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: goal.is_on_track
                  ? colors.semantic.success + '15'
                  : colors.semantic.error + '15',
                border: `1px solid ${goal.is_on_track
                  ? colors.semantic.success + '40'
                  : colors.semantic.error + '40'}`,
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '600',
                color: getStatusColor(goal.is_on_track)
              }}
            >
              {goal.is_on_track ? 'On Track' : 'Behind Schedule'}
              <span style={{ opacity: 0.8 }}>
                ({formatPercentage(goal.variance_percentage)})
              </span>
            </div>

            {/* Watchlist Reason */}
            {goal.is_in_watchlist && goal.watchlist_reason && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '8px 12px',
                  backgroundColor: colors.semantic.warning + '10',
                  border: `1px solid ${colors.semantic.warning}30`,
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: colors.utility.secondaryText
                }}
              >
                <strong style={{ color: colors.semantic.warning }}>Watchlist Reason:</strong> {goal.watchlist_reason}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GoalProgressTracker;
