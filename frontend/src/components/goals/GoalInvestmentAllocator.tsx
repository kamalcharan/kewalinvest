// frontend/src/components/goals/GoalInvestmentAllocator.tsx
// Phase 2: Component for allocating investment plans to goals
// Updated: Radio button style, 3x3 grid, 100% default, assigned/unassigned display

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Plus, Loader, Check } from 'lucide-react';
import { GoalInvestmentAllocation } from '../../types/goal.types';
import { InvestmentPlan as InvestmentPlanType } from '../../types/investmentPlan.types';
import GoalInvestmentAllocationService from '../../services/goalInvestmentAllocation.service';
import { InvestmentPlanService } from '../../services/investmentPlan.service';
import toastService from '../../services/toast.service';

interface GoalInvestmentAllocatorProps {
  goalId: number;
  customerId: number;
  availableInvestments?: InvestmentPlanType[];
  onAllocationChange?: () => void;
}

// Asset type icon mapping
// Note: MF replaced with scheme-based types (Open Ended, Close Ended, Interval Fund)
const getAssetIcon = (code: string): string => {
  const icons: { [key: string]: string } = {
    'Open Ended': '📊',
    'Close Ended': '📅',
    'Interval Fund': '⏰',
    'GOLD': '🪙',
    'EQUITY': '📈',
    'FD': '🏦',
    'PPF': '🏛️',
    'EPF': '💼',
    'NPS': '🎯',
    'REAL_ESTATE': '🏠',
    'INSURANCE': '🛡️'
  };
  return icons[code] || '💰';
};

// Format currency
const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) {
    return '₹0';
  }
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  } else if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  } else if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)} K`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
};

// Format date
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
};

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
  const [loading, setLoading] = useState(false);
  const [loadingInvestments, setLoadingInvestments] = useState(!providedInvestments);
  const [saving, setSaving] = useState(false);

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
      toastService.error('Failed to load investment plans');
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
      }
    } catch (err: any) {
      console.error('Failed to fetch allocations:', err);
    } finally {
      setLoading(false);
    }
  };

  // Check if investment is allocated to current goal
  const isAllocatedToThisGoal = (investmentId: number): boolean => {
    return allocations.some(a => a.investment_plan_id === investmentId);
  };

  // Handle investment selection (add allocation)
  const handleSelectInvestment = async (investmentId: number) => {
    if (isAllocatedToThisGoal(investmentId)) {
      // Already allocated, remove it
      await handleRemoveAllocation(investmentId);
    } else {
      // Add new allocation with 100%
      setSaving(true);
      try {
        await GoalInvestmentAllocationService.allocateInvestmentToGoal(goalId, {
          investment_plan_id: investmentId,
          allocated_percentage: 100
        });
        toastService.success('Investment allocated to goal');
        await fetchAllocations();
        if (onAllocationChange) onAllocationChange();
      } catch (err: any) {
        toastService.error(err.message || 'Failed to allocate investment');
      } finally {
        setSaving(false);
      }
    }
  };

  // Handle remove allocation
  const handleRemoveAllocation = async (investmentId: number) => {
    const allocation = allocations.find(a => a.investment_plan_id === investmentId);
    if (!allocation) return;

    setSaving(true);
    try {
      await GoalInvestmentAllocationService.removeAllocation(goalId, allocation.id);
      toastService.success('Allocation removed');
      await fetchAllocations();
      if (onAllocationChange) onAllocationChange();
    } catch (err: any) {
      toastService.error(err.message || 'Failed to remove allocation');
    } finally {
      setSaving(false);
    }
  };

  // Get investment display name
  const getInvestmentDisplayName = (investment: InvestmentPlanType): string => {
    if (investment.notes) {
      return investment.notes;
    }
    // Fallback: asset type + principal + date
    return `${investment.asset_type_name} - ${formatCurrency(investment.principal_amount)}`;
  };

  // Get investment subtitle
  const getInvestmentSubtitle = (investment: InvestmentPlanType): string => {
    const parts: string[] = [];

    if (investment.investment_type === 'sip' && investment.recurring_amount) {
      parts.push(`SIP: ${formatCurrency(investment.recurring_amount)}/mo`);
    } else if (investment.investment_type === 'recurring' && investment.recurring_amount) {
      parts.push(`Recurring: ${formatCurrency(investment.recurring_amount)}`);
    } else {
      parts.push(`Principal: ${formatCurrency(investment.principal_amount)}`);
    }

    if (investment.start_date) {
      parts.push(formatDate(investment.start_date));
    }

    return parts.join(' | ');
  };

  // Show loading state while fetching investment plans
  if (loadingInvestments || loading) {
    return (
      <div style={{
        padding: '60px 40px',
        textAlign: 'center',
        color: colors.utility.secondaryText
      }}>
        <Loader
          style={{
            width: '32px',
            height: '32px',
            color: colors.brand.primary,
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}
        />
        <div style={{ fontSize: '14px' }}>Loading investment plans...</div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Empty state - no investment plans
  if (availableInvestments.length === 0) {
    return (
      <div style={{
        padding: '60px 40px',
        textAlign: 'center',
        backgroundColor: colors.utility.primaryBackground,
        borderRadius: '12px',
        border: `2px dashed ${colors.utility.primaryText}20`
      }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>💼</div>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: colors.utility.primaryText,
          marginBottom: '12px'
        }}>
          No Investment Plans Found
        </h3>
        <p style={{
          fontSize: '14px',
          color: colors.utility.secondaryText,
          marginBottom: '24px',
          maxWidth: '400px',
          margin: '0 auto 24px',
          lineHeight: '1.6'
        }}>
          Create investment plans first, then allocate them to this goal.
        </p>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 20px',
          backgroundColor: colors.brand.primary + '15',
          borderRadius: '8px',
          color: colors.brand.primary,
          fontSize: '13px',
          fontWeight: '500'
        }}>
          <Plus size={16} />
          Go to Investments tab to add plans
        </div>
      </div>
    );
  }

  // Separate investments into unassigned and assigned to this goal
  const allocatedInvestments = availableInvestments.filter(inv => isAllocatedToThisGoal(inv.id));
  const unallocatedInvestments = availableInvestments.filter(inv => !isAllocatedToThisGoal(inv.id));

  return (
    <div>
      {/* Saving overlay */}
      {saving && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            padding: '24px 32px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Loader style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
            <span style={{ color: colors.utility.primaryText }}>Saving...</span>
          </div>
        </div>
      )}

      {/* Allocated Investments Section */}
      {allocatedInvestments.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{
            fontSize: '14px',
            fontWeight: '600',
            color: colors.semantic.success,
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Check size={16} />
            Allocated to This Goal ({allocatedInvestments.length})
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px'
          }}>
            {allocatedInvestments.map(investment => (
              <div
                key={investment.id}
                onClick={() => handleSelectInvestment(investment.id)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'flex-start',
                  padding: '14px',
                  border: `2px solid ${colors.semantic.success}`,
                  borderRadius: '10px',
                  backgroundColor: colors.semantic.success + '10',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {/* Radio indicator */}
                <div style={{
                  width: '20px',
                  height: '20px',
                  minWidth: '20px',
                  borderRadius: '50%',
                  border: `2px solid ${colors.semantic.success}`,
                  backgroundColor: colors.semantic.success,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '12px',
                  marginTop: '2px'
                }}>
                  <Check size={12} color="white" strokeWidth={3} />
                </div>

                {/* Icon */}
                <span style={{ fontSize: '24px', marginRight: '12px', lineHeight: 1 }}>
                  {getAssetIcon(investment.asset_type_code || '')}
                </span>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: colors.utility.primaryText,
                    marginBottom: '4px',
                    lineHeight: 1.3
                  }}>
                    {getInvestmentDisplayName(investment)}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: colors.utility.secondaryText,
                    lineHeight: 1.3
                  }}>
                    {investment.asset_type_name}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: colors.utility.secondaryText,
                    marginTop: '4px'
                  }}>
                    {getInvestmentSubtitle(investment)}
                  </div>
                </div>

                {/* 100% badge */}
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  fontSize: '10px',
                  fontWeight: '700',
                  color: colors.semantic.success,
                  backgroundColor: colors.semantic.success + '20',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  100%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Investments Section */}
      {unallocatedInvestments.length > 0 && (
        <div>
          <h4 style={{
            fontSize: '14px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Plus size={16} />
            Available to Allocate ({unallocatedInvestments.length})
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px'
          }}>
            {unallocatedInvestments.map(investment => (
              <div
                key={investment.id}
                onClick={() => handleSelectInvestment(investment.id)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'flex-start',
                  padding: '14px',
                  border: `2px solid ${colors.utility.primaryText}20`,
                  borderRadius: '10px',
                  backgroundColor: colors.utility.secondaryBackground,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = colors.brand.primary;
                  e.currentTarget.style.backgroundColor = colors.brand.primary + '08';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = colors.utility.primaryText + '20';
                  e.currentTarget.style.backgroundColor = colors.utility.secondaryBackground;
                }}
              >
                {/* Radio indicator */}
                <div style={{
                  width: '20px',
                  height: '20px',
                  minWidth: '20px',
                  borderRadius: '50%',
                  border: `2px solid ${colors.utility.secondaryText}`,
                  backgroundColor: colors.utility.primaryBackground,
                  marginRight: '12px',
                  marginTop: '2px'
                }} />

                {/* Icon */}
                <span style={{ fontSize: '24px', marginRight: '12px', lineHeight: 1 }}>
                  {getAssetIcon(investment.asset_type_code || '')}
                </span>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: colors.utility.primaryText,
                    marginBottom: '4px',
                    lineHeight: 1.3
                  }}>
                    {getInvestmentDisplayName(investment)}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: colors.utility.secondaryText,
                    lineHeight: 1.3
                  }}>
                    {investment.asset_type_name}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: colors.utility.secondaryText,
                    marginTop: '4px'
                  }}>
                    {getInvestmentSubtitle(investment)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {allocatedInvestments.length > 0 && (
        <div style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: colors.semantic.success + '10',
          borderRadius: '10px',
          border: `1px solid ${colors.semantic.success}30`
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{
              fontSize: '14px',
              fontWeight: '600',
              color: colors.utility.primaryText
            }}>
              Total Investments Allocated:
            </span>
            <span style={{
              fontSize: '18px',
              fontWeight: '700',
              color: colors.semantic.success
            }}>
              {allocatedInvestments.length}
            </span>
          </div>
          <div style={{
            fontSize: '12px',
            color: colors.utility.secondaryText,
            marginTop: '8px'
          }}>
            Each investment is allocated at 100% to this goal
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default GoalInvestmentAllocator;
