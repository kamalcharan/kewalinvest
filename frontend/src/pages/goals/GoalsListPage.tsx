// frontend/src/pages/goals/GoalsListPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Target, Search, AlertCircle, User, LayoutGrid, Users, Calendar } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api.service';
import { API_ENDPOINTS } from '../../services/serviceURLs';
import GoalCard from '../../components/goals/GoalCard';
import { GoalConfiguration } from '../../types/goal.types';

// Extended type to include customer_name from the API
interface GoalWithCustomer extends GoalConfiguration {
  customer_name: string;
}

const GoalsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { theme, isDarkMode } = useTheme();
  const { environment } = useAuth();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Get initial filter from URL query param
  const urlFilter = searchParams.get('filter');
  const initialFilter = urlFilter === 'withdrawal' ? 'withdrawal' : 'all';

  const [goals, setGoals] = useState<GoalWithCustomer[]>([]);
  const [filteredGoals, setFilteredGoals] = useState<GoalWithCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'on_track' | 'behind' | 'active' | 'paused' | 'withdrawal'>(initialFilter);
  const [filterType, setFilterType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'flat' | 'grouped'>('flat');
  const [withdrawalPeriod, setWithdrawalPeriod] = useState<3 | 6>(3);

  useEffect(() => {
    fetchGoals();
  }, [environment]);

  useEffect(() => {
    filterGoals();
  }, [goals, searchTerm, filterStatus, filterType, withdrawalPeriod]);

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
      filtered = filtered.filter(goal => {
        const config = goal.config_data as any;
        return goal.title.toLowerCase().includes(term) ||
          goal.customer_name.toLowerCase().includes(term) ||
          config?.goal_name?.toLowerCase().includes(term);
      });
    }

    // Status filter
    if (filterStatus === 'on_track') {
      filtered = filtered.filter(goal => (goal.config_data as any)?.on_track === true);
    } else if (filterStatus === 'behind') {
      filtered = filtered.filter(goal => (goal.config_data as any)?.on_track === false);
    } else if (filterStatus === 'active') {
      filtered = filtered.filter(goal => goal.is_active);
    } else if (filterStatus === 'paused') {
      filtered = filtered.filter(goal => !goal.is_active);
    } else if (filterStatus === 'withdrawal') {
      // Filter goals that have withdrawals scheduled in the next N months
      const now = new Date();
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + withdrawalPeriod);

      filtered = filtered.filter(goal => {
        const config = goal.config_data as any;

        // Check if goal has withdrawals array (has_withdrawals = true)
        if (config?.has_withdrawals && Array.isArray(config?.withdrawals)) {
          // Check if any withdrawal is within the period
          return config.withdrawals.some((w: any) => {
            if (w?.withdrawal_date) {
              const wDate = new Date(w.withdrawal_date);
              return wDate >= now && wDate <= futureDate;
            }
            return false;
          });
        }

        return false;
      });

      // Sort by earliest withdrawal date
      filtered.sort((a, b) => {
        const getEarliestWithdrawal = (goal: GoalWithCustomer) => {
          const config = goal.config_data as any;
          let earliest = new Date('9999-12-31');

          if (config?.withdrawals && Array.isArray(config.withdrawals)) {
            config.withdrawals.forEach((w: any) => {
              if (w?.withdrawal_date) {
                const wDate = new Date(w.withdrawal_date);
                if (wDate >= now && wDate < earliest) {
                  earliest = wDate;
                }
              }
            });
          }
          return earliest;
        };

        return getEarliestWithdrawal(a).getTime() - getEarliestWithdrawal(b).getTime();
      });
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(goal => goal.config_data?.goal_type === filterType);
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

  const handleRecalculate = async (goalId: number) => {
    try {
      await apiService.post(API_ENDPOINTS.GOALS.RECALCULATE(goalId));
      fetchGoals(); // Refresh after recalculation
    } catch (err) {
      console.error('Failed to recalculate goal:', err);
    }
  };

  // Get unique goal types for filter
  const goalTypes = Array.from(new Set(goals.map(g => g.config_data?.goal_type).filter(Boolean)));

  // Calculate summary stats
  const activeGoals = goals.filter(g => g.is_active);
  const totalGoals = goals.length;
  const onTrackCount = activeGoals.filter(g => (g.config_data as any)?.on_track === true).length;
  const behindCount = activeGoals.filter(g => (g.config_data as any)?.on_track === false).length;
  const totalTargetAmount = activeGoals.reduce((sum, g) => sum + ((g.config_data as any)?.target_amount || 0), 0);
  const totalCurrentValue = activeGoals.reduce((sum, g) => sum + ((g.config_data as any)?.current_value || 0), 0);

  // Group goals by customer
  const goalsByCustomer = filteredGoals.reduce((acc, goal) => {
    const customerName = goal.customer_name || 'Unknown Customer';
    if (!acc[customerName]) {
      acc[customerName] = {
        customerId: goal.customer_id,
        goals: []
      };
    }
    acc[customerName].goals.push(goal);
    return acc;
  }, {} as Record<string, { customerId: number; goals: GoalWithCustomer[] }>);

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
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
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
          <option value="active">Active Only</option>
          <option value="paused">Paused Only</option>
          <option value="withdrawal">📅 Withdrawal Due</option>
        </select>

        {/* Withdrawal Period Toggle - only shown when withdrawal filter is active */}
        {filterStatus === 'withdrawal' && (
          <div style={{
            display: 'flex',
            backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
            border: `1px solid ${isDarkMode ? colors.utility.primaryText + '10' : '#E2E8F0'}`,
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <button
              onClick={() => setWithdrawalPeriod(3)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '10px 14px',
                backgroundColor: withdrawalPeriod === 3 ? colors.semantic.error : 'transparent',
                color: withdrawalPeriod === 3 ? '#FFFFFF' : colors.utility.primaryText,
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: withdrawalPeriod === 3 ? '600' : '400'
              }}
            >
              <Calendar size={14} />
              3 Months
            </button>
            <button
              onClick={() => setWithdrawalPeriod(6)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '10px 14px',
                backgroundColor: withdrawalPeriod === 6 ? colors.semantic.warning : 'transparent',
                color: withdrawalPeriod === 6 ? '#FFFFFF' : colors.utility.primaryText,
                border: 'none',
                borderLeft: `1px solid ${isDarkMode ? colors.utility.primaryText + '10' : '#E2E8F0'}`,
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: withdrawalPeriod === 6 ? '600' : '400'
              }}
            >
              <Calendar size={14} />
              6 Months
            </button>
          </div>
        )}

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
            <option key={type} value={type}>
              {type === 'time_based_goal' ? 'Time Based' :
               type === 'price_based_goal' ? 'Price Based' :
               type === 'time_and_price_goal' ? 'Time & Price' : type}
            </option>
          ))}
        </select>

        {/* View Mode Toggle */}
        <div style={{
          display: 'flex',
          backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
          border: `1px solid ${isDarkMode ? colors.utility.primaryText + '10' : '#E2E8F0'}`,
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <button
            onClick={() => setViewMode('flat')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 14px',
              backgroundColor: viewMode === 'flat' ? colors.brand.primary : 'transparent',
              color: viewMode === 'flat' ? '#FFFFFF' : colors.utility.primaryText,
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: viewMode === 'flat' ? '600' : '400'
            }}
          >
            <LayoutGrid size={16} />
            Flat
          </button>
          <button
            onClick={() => setViewMode('grouped')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 14px',
              backgroundColor: viewMode === 'grouped' ? colors.brand.primary : 'transparent',
              color: viewMode === 'grouped' ? '#FFFFFF' : colors.utility.primaryText,
              border: 'none',
              borderLeft: `1px solid ${isDarkMode ? colors.utility.primaryText + '10' : '#E2E8F0'}`,
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: viewMode === 'grouped' ? '600' : '400'
            }}
          >
            <Users size={16} />
            By Customer
          </button>
        </div>
      </div>

      {/* Goals Display */}
      {filteredGoals.length === 0 ? (
        <div style={{
          padding: '48px',
          textAlign: 'center',
          color: colors.utility.secondaryText,
          backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
          borderRadius: '12px',
          border: `1px solid ${isDarkMode ? colors.utility.primaryText + '10' : '#E2E8F0'}`
        }}>
          {goals.length === 0 ? 'No goals found' : 'No goals match your filters'}
        </div>
      ) : viewMode === 'flat' ? (
        /* Flat View - All goals in a single grid */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
          gap: '16px'
        }}>
          {filteredGoals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onRecalculate={handleRecalculate}
              showAllocations={true}
              showCustomerName={true}
            />
          ))}
        </div>
      ) : (
        /* Grouped View - Goals organized by customer */
        Object.entries(goalsByCustomer).map(([customerName, { customerId, goals: customerGoals }]) => (
          <div key={customerName} style={{ marginBottom: '24px' }}>
            {/* Customer Header */}
            <div
              onClick={() => navigate(`/customers/${customerId}`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
                padding: '8px 12px',
                backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#F8FAFC',
                borderRadius: '8px',
                cursor: 'pointer',
                border: `1px solid ${isDarkMode ? colors.utility.primaryText + '10' : '#E2E8F0'}`
              }}
            >
              <User size={18} style={{ color: colors.brand.primary }} />
              <span style={{
                fontSize: '16px',
                fontWeight: '600',
                color: colors.brand.primary
              }}>
                {customerName}
              </span>
              <span style={{
                fontSize: '13px',
                color: colors.utility.secondaryText,
                marginLeft: '8px'
              }}>
                ({customerGoals.length} goal{customerGoals.length !== 1 ? 's' : ''})
              </span>
            </div>

            {/* Goal Cards Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
              gap: '16px'
            }}>
              {customerGoals.map(goal => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onRecalculate={handleRecalculate}
                  showAllocations={true}
                />
              ))}
            </div>
          </div>
        ))
      )}

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
