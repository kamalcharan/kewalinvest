// frontend/src/components/goals/GoalInvestmentAllocator.tsx
// Phase 2: Component for allocating investment plans to goals

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { GoalInvestmentAllocation } from '../../types/goal.types';
import { InvestmentPlan as InvestmentPlanType } from '../../types/investmentPlan.types';
import GoalInvestmentAllocationService from '../../services/goalInvestmentAllocation.service';
import { InvestmentPlanService } from '../../services/investmentPlan.service';

interface GoalInvestmentAllocatorProps {
  goalId: number;
  customerId: number;
  availableInvestments?: InvestmentPlanType[]; // Optional - will fetch if not provided
  onAllocationChange?: () => void;
}

const GoalInvestmentAllocator: React.FC<GoalInvestmentAllocatorProps> = ({
  goalId,
  customerId,
  availableInvestments: providedInvestments,
  onAllocationChange
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [allocations, setAllocations] = useState<GoalInvestmentAllocation[]>([]);
  const [availableInvestments, setAvailableInvestments] = useState<InvestmentPlanType[]>(providedInvestments || []);
  const [selectedInvestments, setSelectedInvestments] = useState<{
    [key: number]: { selected: boolean; percentage: number };
  }>({});
  const [loading, setLoading] = useState(false);
  const [loadingInvestments, setLoadingInvestments] = useState(!providedInvestments);
  const [error, setError] = useState<string | null>(null);

  // Fetch investment plans if not provided
  useEffect(() => {
    if (!providedInvestments && customerId) {
      fetchInvestmentPlans();
    }
  }, [customerId, providedInvestments]);

  // Fetch existing allocations
  useEffect(() => {
    fetchAllocations();
  }, [goalId]);

  const fetchInvestmentPlans = async () => {
    setLoadingInvestments(true);
    try {
      const plans = await InvestmentPlanService.getCustomerInvestmentPlans(customerId);
      setAvailableInvestments(plans);
    } catch (err: any) {
      console.error('Failed to fetch investment plans:', err);
      setError('Failed to load investment plans');
    } finally {
      setLoadingInvestments(false);
    }
  };

  const fetchAllocations = async () => {
    setLoading(true);
    try {
      const response = await GoalInvestmentAllocationService.getGoalAllocations(goalId);
      if (response.success && response.data) {
        setAllocations(response.data);

        // Pre-populate selected investments
        const selected: typeof selectedInvestments = {};
        response.data.forEach(allocation => {
          selected[allocation.investment_plan_id] = {
            selected: true,
            percentage: allocation.allocated_percentage
          };
        });
        setSelectedInvestments(selected);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInvestmentToggle = (investmentId: number) => {
    setSelectedInvestments(prev => ({
      ...prev,
      [investmentId]: {
        selected: !prev[investmentId]?.selected,
        percentage: prev[investmentId]?.percentage || 0
      }
    }));
  };

  const handlePercentageChange = (investmentId: number, percentage: number) => {
    setSelectedInvestments(prev => ({
      ...prev,
      [investmentId]: {
        ...prev[investmentId],
        percentage: Math.min(100, Math.max(0, percentage))
      }
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get existing allocation IDs
      const existingMap = new Map(allocations.map(a => [a.investment_plan_id, a.id]));

      // Process each selected investment
      for (const investment of availableInvestments) {
        const selection = selectedInvestments[investment.id];
        const existingAllocationId = existingMap.get(investment.id);

        if (selection?.selected) {
          // Add or update allocation
          if (existingAllocationId) {
            // Update existing
            await GoalInvestmentAllocationService.updateAllocation(
              goalId,
              existingAllocationId,
              { allocated_percentage: selection.percentage }
            );
          } else {
            // Create new
            await GoalInvestmentAllocationService.allocateInvestmentToGoal(goalId, {
              investment_plan_id: investment.id,
              allocated_percentage: selection.percentage
            });
          }
        } else if (existingAllocationId) {
          // Remove allocation
          await GoalInvestmentAllocationService.removeAllocation(goalId, existingAllocationId);
        }
      }

      // Refresh allocations
      await fetchAllocations();

      if (onAllocationChange) {
        onAllocationChange();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save allocations');
    } finally {
      setLoading(false);
    }
  };

  const getTotalAllocation = (): number => {
    return Object.values(selectedInvestments)
      .filter(s => s.selected)
      .reduce((sum, s) => sum + (s.percentage || 0), 0);
  };

  const totalAllocation = getTotalAllocation();

  // Show loading state while fetching investment plans
  if (loadingInvestments) {
    return (
      <div style={{
        marginTop: '24px',
        padding: '40px',
        textAlign: 'center',
        color: colors.utility.secondaryText
      }}>
        <div style={{ marginBottom: '12px', fontSize: '24px' }}>⏳</div>
        <div>Loading investment plans...</div>
      </div>
    );
  }

  // Show message if no investment plans available
  if (availableInvestments.length === 0) {
    return (
      <div style={{
        marginTop: '24px',
        padding: '40px',
        textAlign: 'center',
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '8px',
        border: `1px solid ${colors.utility.primaryText}20`
      }}>
        <div style={{ marginBottom: '12px', fontSize: '48px' }}>💼</div>
        <div style={{ fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '8px' }}>
          No Investment Plans Found
        </div>
        <div style={{ fontSize: '14px', color: colors.utility.secondaryText }}>
          Create investment plans first to allocate them to this goal.
        </div>
      </div>
    );
  }

  return (
    <div style={{
      marginTop: '24px',
      padding: '20px',
      border: `1px solid ${colors.utility.primaryText}20`,
      borderRadius: '8px',
      backgroundColor: colors.utility.secondaryBackground
    }}>
      <h3 style={{
        margin: '0 0 16px 0',
        fontSize: '16px',
        fontWeight: '600',
        color: colors.utility.primaryText
      }}>
        Allocate Investment Plans to Goal
      </h3>

      {error && (
        <div style={{
          padding: '12px',
          marginBottom: '16px',
          backgroundColor: colors.semantic.error + '15',
          border: `1px solid ${colors.semantic.error}`,
          borderRadius: '6px',
          color: colors.semantic.error,
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        {availableInvestments.length === 0 ? (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            color: colors.utility.secondaryText,
            fontSize: '14px'
          }}>
            No investment plans available for this customer.
          </div>
        ) : (
          availableInvestments.map(investment => {
            const selection = selectedInvestments[investment.id];
            const isSelected = selection?.selected || false;

            return (
              <div
                key={investment.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  marginBottom: '8px',
                  border: `1px solid ${isSelected ? colors.brand.primary : colors.utility.primaryText + '20'}`,
                  borderRadius: '6px',
                  backgroundColor: isSelected ? colors.brand.primary + '08' : 'transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleInvestmentToggle(investment.id)}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                    accentColor: colors.brand.primary
                  }}
                />

                <div style={{ flex: 1, marginLeft: '12px' }}>
                  <div style={{
                    fontWeight: '600',
                    color: colors.utility.primaryText,
                    marginBottom: '4px'
                  }}>
                    {investment.asset_type_name}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: colors.utility.secondaryText
                  }}>
                    {investment.investment_type === 'sip' && `SIP: ₹${investment.recurring_amount?.toLocaleString()}`}
                    {investment.investment_type === 'one_time' && `Principal: ₹${investment.principal_amount.toLocaleString()}`}
                    {investment.investment_type === 'recurring' && `Recurring: ₹${investment.recurring_amount?.toLocaleString()}`}
                  </div>
                </div>

                {isSelected && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={selection.percentage || 0}
                      onChange={(e) => handlePercentageChange(investment.id, parseFloat(e.target.value) || 0)}
                      style={{
                        width: '80px',
                        padding: '6px 12px',
                        border: `1px solid ${colors.utility.primaryText}20`,
                        borderRadius: '4px',
                        fontSize: '14px',
                        textAlign: 'right',
                        backgroundColor: colors.utility.primaryBackground,
                        color: colors.utility.primaryText
                      }}
                    />
                    <span style={{
                      fontSize: '14px',
                      color: colors.utility.secondaryText
                    }}>
                      %
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Total allocation indicator */}
      <div style={{
        padding: '12px',
        marginBottom: '16px',
        backgroundColor: totalAllocation > 100
          ? colors.semantic.error + '15'
          : totalAllocation === 100
            ? colors.semantic.success + '15'
            : colors.utility.secondaryBackground,
        border: `1px solid ${totalAllocation > 100
          ? colors.semantic.error
          : totalAllocation === 100
            ? colors.semantic.success
            : colors.utility.secondaryText
          }`,
        borderRadius: '6px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{
          fontWeight: '600',
          color: colors.utility.primaryText
        }}>
          Total Allocation:
        </span>
        <span style={{
          fontSize: '18px',
          fontWeight: '700',
          color: totalAllocation > 100
            ? colors.semantic.error
            : totalAllocation === 100
              ? colors.semantic.success
              : colors.utility.primaryText
        }}>
          {totalAllocation.toFixed(1)}%
        </span>
      </div>

      {totalAllocation > 100 && (
        <div style={{
          padding: '8px 12px',
          marginBottom: '16px',
          backgroundColor: colors.semantic.error + '15',
          border: `1px solid ${colors.semantic.error}`,
          borderRadius: '4px',
          fontSize: '13px',
          color: colors.semantic.error
        }}>
          ⚠️ Total allocation cannot exceed 100%
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={loading || totalAllocation > 100}
        style={{
          width: '100%',
          padding: '12px',
          border: 'none',
          borderRadius: '6px',
          backgroundColor: loading || totalAllocation > 100 ? colors.utility.secondaryText : colors.brand.primary,
          color: '#FFFFFF',
          fontSize: '15px',
          fontWeight: '600',
          cursor: loading || totalAllocation > 100 ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          opacity: loading || totalAllocation > 100 ? 0.6 : 1
        }}
      >
        {loading ? 'Saving...' : 'Save Allocations'}
      </button>
    </div>
  );
};

export default GoalInvestmentAllocator;
