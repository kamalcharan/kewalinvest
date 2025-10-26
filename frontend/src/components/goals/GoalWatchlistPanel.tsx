// frontend/src/components/goals/GoalWatchlistPanel.tsx
import React, { useState, useEffect } from 'react';
import { Eye, X, AlertTriangle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { GoalService, WatchlistGoal } from '../../services/goal.service';

interface GoalWatchlistPanelProps {
  customerId: number;
  onRemove?: () => void;
}

export const GoalWatchlistPanel: React.FC<GoalWatchlistPanelProps> = ({
  customerId,
  onRemove
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [watchlistGoals, setWatchlistGoals] = useState<WatchlistGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWatchlistGoals();
  }, [customerId]);

  const loadWatchlistGoals = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await GoalService.getWatchlistGoals(customerId);

      if (response.success && response.data) {
        setWatchlistGoals(response.data);
      } else {
        setError(response.error || 'Failed to load watchlist');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load watchlist');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (goalId: number) => {
    try {
      await GoalService.removeFromWatchlist(goalId);
      await loadWatchlistGoals();

      if (onRemove) {
        onRemove();
      }
    } catch (err: any) {
      console.error('Failed to remove from watchlist:', err);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return null; // Don't show loading state for panel
  }

  if (error || watchlistGoals.length === 0) {
    return null; // Don't show panel if empty or error
  }

  return (
    <div
      style={{
        backgroundColor: colors.semantic.warning + '10',
        border: `1px solid ${colors.semantic.warning}40`,
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '20px'
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '12px'
        }}
      >
        <AlertTriangle size={18} style={{ color: colors.semantic.warning }} />
        <h3
          style={{
            fontSize: '14px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            margin: 0,
            flex: 1
          }}
        >
          Goals on Watchlist ({watchlistGoals.length})
        </h3>
        <Eye size={16} style={{ color: colors.semantic.warning }} />
      </div>

      <p
        style={{
          fontSize: '12px',
          color: colors.utility.secondaryText,
          marginBottom: '12px',
          lineHeight: '1.5'
        }}
      >
        These goals are underperforming and need attention. Consider reviewing investment strategy or increasing contributions.
      </p>

      {/* Watchlist Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {watchlistGoals.map((goal) => (
          <div
            key={goal.id}
            style={{
              backgroundColor: colors.utility.primaryBackground,
              border: `1px solid ${colors.utility.primaryText}10`,
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: colors.utility.primaryText,
                  marginBottom: '4px'
                }}
              >
                {goal.title}
              </div>

              {goal.watchlist_reason && (
                <div
                  style={{
                    fontSize: '11px',
                    color: colors.utility.secondaryText,
                    marginBottom: '4px'
                  }}
                >
                  {goal.watchlist_reason}
                </div>
              )}

              <div
                style={{
                  fontSize: '10px',
                  color: colors.utility.secondaryText,
                  opacity: 0.7
                }}
              >
                Added: {formatDate(goal.watchlist_added_at)}
              </div>
            </div>

            <button
              onClick={() => handleRemove(goal.id)}
              style={{
                padding: '6px',
                backgroundColor: 'transparent',
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '6px',
                color: colors.utility.secondaryText,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              title="Remove from watchlist"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.semantic.error + '15';
                e.currentTarget.style.borderColor = colors.semantic.error + '40';
                e.currentTarget.style.color = colors.semantic.error;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = colors.utility.primaryText + '20';
                e.currentTarget.style.color = colors.utility.secondaryText;
              }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GoalWatchlistPanel;
