// frontend/src/pages/goals/GoalsListPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Search, AlertCircle, TrendingUp, TrendingDown, Calendar, User, Eye } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api.service';
import { API_ENDPOINTS } from '../../services/serviceURLs';

interface Goal {
  id: number;
  customerId: number;
  customerName: string;
  title: string;
  description: string;
  priority: string;
  isActive: boolean;
  isWatchlisted: boolean;
  watchlistReason: string | null;
  goalType: string;
  goalName: string;
  targetAmount: number;
  currentValue: number;
  targetDate: string | null;
  deviationPercentage: number;
  onTrack: boolean;
  hasWithdrawals: boolean;
  createdAt: string;
  updatedAt: string;
}

const GoalsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, isDarkMode } = useTheme();
  const { environment } = useAuth();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [goals, setGoals] = useState<Goal[]>([]);
  const [filteredGoals, setFilteredGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'on_track' | 'behind'>('all');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    fetchGoals();
  }, [environment]);

  useEffect(() => {
    filterGoals();
  }, [goals, searchTerm, filterStatus, filterType]);

  const fetchGoals = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiService.get(API_ENDPOINTS.GOALS.GET_ALL) as any;
      if (response.success && response.data) {
        setGoals(response.data);
      } else {
        setError('Failed to load goals');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load goals');
    } finally {
      setIsLoading(false);
    }
  };

  const filterGoals = () => {
    let filtered = [...goals];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(goal =>
        goal.title.toLowerCase().includes(term) ||
        goal.customerName.toLowerCase().includes(term) ||
        goal.goalName?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (filterStatus === 'on_track') {
      filtered = filtered.filter(goal => goal.onTrack);
    } else if (filterStatus === 'behind') {
      filtered = filtered.filter(goal => !goal.onTrack);
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(goal => goal.goalType === filterType);
    }

    setFilteredGoals(filtered);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getGoalTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'time_based_goal': 'Time Based',
      'price_based_goal': 'Price Based',
      'time_and_price_goal': 'Time & Price'
    };
    return labels[type] || type;
  };

  const getProgressPercentage = (current: number, target: number): number => {
    if (target <= 0) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  };

  const handleViewGoal = (customerId: number, goalId: number) => {
    navigate(`/customers/${customerId}/goals/${goalId}`);
  };

  const handleViewCustomer = (customerId: number) => {
    navigate(`/customers/${customerId}`);
  };

  // Get unique goal types for filter
  const goalTypes = Array.from(new Set(goals.map(g => g.goalType))).filter(Boolean);

  // Calculate summary stats
  const totalGoals = goals.length;
  const onTrackCount = goals.filter(g => g.onTrack).length;
  const behindCount = goals.filter(g => !g.onTrack).length;
  const totalTargetAmount = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalCurrentValue = goals.reduce((sum, g) => sum + g.currentValue, 0);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        color: colors.utility.secondaryText
      }}>
        Loading goals...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        color: colors.semantic.error,
        flexDirection: 'column',
        gap: '12px'
      }}>
        <AlertCircle size={32} />
        <span>{error}</span>
        <button
          onClick={fetchGoals}
          style={{
            padding: '8px 16px',
            backgroundColor: colors.brand.primary,
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: colors.utility.primaryText,
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Target size={28} />
          All Goals
        </h1>
        <p style={{
          fontSize: '14px',
          color: colors.utility.secondaryText,
          margin: 0
        }}>
          View and manage all customer goals across your portfolio
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
          borderRadius: '12px',
          padding: '16px',
          border: `1px solid ${isDarkMode ? colors.utility.primaryText + '10' : '#E2E8F0'}`
        }}>
          <div style={{ fontSize: '13px', color: colors.utility.secondaryText, marginBottom: '4px' }}>
            Total Goals
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: colors.utility.primaryText }}>
            {totalGoals}
          </div>
        </div>

        <div style={{
          backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
          borderRadius: '12px',
          padding: '16px',
          border: `1px solid ${isDarkMode ? colors.utility.primaryText + '10' : '#E2E8F0'}`
        }}>
          <div style={{ fontSize: '13px', color: colors.utility.secondaryText, marginBottom: '4px' }}>
            On Track
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: colors.semantic.success }}>
            {onTrackCount}
          </div>
        </div>

        <div style={{
          backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
          borderRadius: '12px',
          padding: '16px',
          border: `1px solid ${isDarkMode ? colors.utility.primaryText + '10' : '#E2E8F0'}`
        }}>
          <div style={{ fontSize: '13px', color: colors.utility.secondaryText, marginBottom: '4px' }}>
            Needs Attention
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: colors.semantic.warning }}>
            {behindCount}
          </div>
        </div>

        <div style={{
          backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
          borderRadius: '12px',
          padding: '16px',
          border: `1px solid ${isDarkMode ? colors.utility.primaryText + '10' : '#E2E8F0'}`
        }}>
          <div style={{ fontSize: '13px', color: colors.utility.secondaryText, marginBottom: '4px' }}>
            Total Target
          </div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: colors.utility.primaryText }}>
            {formatCurrency(totalTargetAmount)}
          </div>
        </div>

        <div style={{
          backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
          borderRadius: '12px',
          padding: '16px',
          border: `1px solid ${isDarkMode ? colors.utility.primaryText + '10' : '#E2E8F0'}`
        }}>
          <div style={{ fontSize: '13px', color: colors.utility.secondaryText, marginBottom: '4px' }}>
            Current Value
          </div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: colors.brand.primary }}>
            {formatCurrency(totalCurrentValue)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        {/* Search */}
        <div style={{
          position: 'relative',
          flex: '1',
          minWidth: '250px',
          maxWidth: '400px'
        }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: colors.utility.secondaryText
            }}
          />
          <input
            type="text"
            placeholder="Search by goal or customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
              border: `1px solid ${isDarkMode ? colors.utility.primaryText + '10' : '#E2E8F0'}`,
              borderRadius: '8px',
              color: colors.utility.primaryText,
              fontSize: '14px'
            }}
          />
        </div>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          style={{
            padding: '10px 12px',
            backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
            border: `1px solid ${isDarkMode ? colors.utility.primaryText + '10' : '#E2E8F0'}`,
            borderRadius: '8px',
            color: colors.utility.primaryText,
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Status</option>
          <option value="on_track">On Track</option>
          <option value="behind">Needs Attention</option>
        </select>

        {/* Type Filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{
            padding: '10px 12px',
            backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
            border: `1px solid ${isDarkMode ? colors.utility.primaryText + '10' : '#E2E8F0'}`,
            borderRadius: '8px',
            color: colors.utility.primaryText,
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Types</option>
          {goalTypes.map(type => (
            <option key={type} value={type}>{getGoalTypeLabel(type)}</option>
          ))}
        </select>
      </div>

      {/* Goals Table */}
      <div style={{
        backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
        borderRadius: '12px',
        border: `1px solid ${isDarkMode ? colors.utility.primaryText + '10' : '#E2E8F0'}`,
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: colors.utility.secondaryText }}>
                  Customer
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: colors.utility.secondaryText }}>
                  Goal
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: colors.utility.secondaryText }}>
                  Type
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: colors.utility.secondaryText }}>
                  Target
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: colors.utility.secondaryText }}>
                  Current
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: colors.utility.secondaryText }}>
                  Progress
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: colors.utility.secondaryText }}>
                  Target Date
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: colors.utility.secondaryText }}>
                  Status
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: colors.utility.secondaryText }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredGoals.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{
                    padding: '48px 16px',
                    textAlign: 'center',
                    color: colors.utility.secondaryText
                  }}>
                    {goals.length === 0 ? 'No goals found' : 'No goals match your filters'}
                  </td>
                </tr>
              ) : (
                filteredGoals.map((goal, index) => {
                  const progress = getProgressPercentage(goal.currentValue, goal.targetAmount);
                  return (
                    <tr
                      key={goal.id}
                      style={{
                        borderTop: `1px solid ${isDarkMode ? colors.utility.primaryText + '10' : '#E2E8F0'}`,
                        backgroundColor: index % 2 === 0 ? 'transparent' : (isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)')
                      }}
                    >
                      {/* Customer */}
                      <td style={{ padding: '14px 16px' }}>
                        <button
                          onClick={() => handleViewCustomer(goal.customerId)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: colors.brand.primary,
                            fontSize: '14px',
                            fontWeight: '500',
                            padding: 0
                          }}
                        >
                          <User size={14} />
                          {goal.customerName}
                        </button>
                      </td>

                      {/* Goal Name */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: colors.utility.primaryText
                        }}>
                          {goal.title}
                        </div>
                        {goal.hasWithdrawals && (
                          <div style={{
                            fontSize: '11px',
                            color: colors.semantic.info,
                            marginTop: '2px'
                          }}>
                            Has planned withdrawals
                          </div>
                        )}
                      </td>

                      {/* Type */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          fontSize: '12px',
                          padding: '4px 8px',
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                          borderRadius: '4px',
                          color: colors.utility.secondaryText
                        }}>
                          {getGoalTypeLabel(goal.goalType)}
                        </span>
                      </td>

                      {/* Target Amount */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <span style={{ fontSize: '14px', color: colors.utility.primaryText }}>
                          {formatCurrency(goal.targetAmount)}
                        </span>
                      </td>

                      {/* Current Value */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <span style={{ fontSize: '14px', color: colors.utility.primaryText }}>
                          {formatCurrency(goal.currentValue)}
                        </span>
                      </td>

                      {/* Progress */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                          <div style={{
                            width: '60px',
                            height: '6px',
                            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                            borderRadius: '3px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${progress}%`,
                              height: '100%',
                              backgroundColor: progress >= 80 ? colors.semantic.success : progress >= 50 ? colors.semantic.warning : colors.semantic.error,
                              borderRadius: '3px'
                            }} />
                          </div>
                          <span style={{ fontSize: '12px', color: colors.utility.secondaryText, minWidth: '35px' }}>
                            {progress}%
                          </span>
                        </div>
                      </td>

                      {/* Target Date */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '13px',
                          color: colors.utility.secondaryText
                        }}>
                          <Calendar size={14} />
                          {formatDate(goal.targetDate)}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: goal.onTrack
                            ? `${colors.semantic.success}20`
                            : `${colors.semantic.warning}20`,
                          color: goal.onTrack ? colors.semantic.success : colors.semantic.warning
                        }}>
                          {goal.onTrack ? (
                            <>
                              <TrendingUp size={12} />
                              On Track
                            </>
                          ) : (
                            <>
                              <TrendingDown size={12} />
                              Behind
                            </>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleViewGoal(goal.customerId, goal.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 12px',
                            backgroundColor: colors.brand.primary,
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          <Eye size={14} />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results count */}
      <div style={{
        marginTop: '16px',
        fontSize: '13px',
        color: colors.utility.secondaryText,
        textAlign: 'right'
      }}>
        Showing {filteredGoals.length} of {goals.length} goals
      </div>
    </div>
  );
};

export default GoalsListPage;
