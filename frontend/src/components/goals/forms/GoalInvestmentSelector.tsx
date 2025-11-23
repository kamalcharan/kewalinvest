// frontend/src/components/goals/forms/GoalInvestmentSelector.tsx
// Phase 2: Investment plan selector for goal allocation

import React, { useState, useMemo } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { LinkedInvestment } from '../../../types/goal.types';
import { InvestmentPlan } from '../../../types/investmentPlan.types';
import { formatCurrency } from '../../../utils/goalUtils';

interface GoalInvestmentSelectorProps {
  availableInvestments: InvestmentPlan[];
  selectedInvestments: LinkedInvestment[];
  onChange: (investments: LinkedInvestment[]) => void;
  error?: string;
  disabled?: boolean;
}

const GoalInvestmentSelector: React.FC<GoalInvestmentSelectorProps> = ({
  availableInvestments,
  selectedInvestments,
  onChange,
  error,
  disabled = false
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [searchQuery, setSearchQuery] = useState('');

  // Filter investments based on search
  const filteredInvestments = useMemo(() => {
    if (!searchQuery) return availableInvestments;
    const query = searchQuery.toLowerCase();
    return availableInvestments.filter(inv =>
      inv.asset_type_name?.toLowerCase().includes(query) ||
      inv.asset_type_code?.toLowerCase().includes(query) ||
      inv.notes?.toLowerCase().includes(query)
    );
  }, [availableInvestments, searchQuery]);

  // Calculate total allocation
  const totalAllocation = useMemo(() => {
    return selectedInvestments.reduce((sum, inv) => sum + inv.allocated_percentage, 0);
  }, [selectedInvestments]);

  // Check if investment is selected
  const isInvestmentSelected = (investmentId: number): boolean => {
    return selectedInvestments.some(inv => inv.investment_plan_id === investmentId);
  };

  // Get allocation for an investment
  const getInvestmentAllocation = (investmentId: number): number => {
    const investment = selectedInvestments.find(inv => inv.investment_plan_id === investmentId);
    return investment ? investment.allocated_percentage : 0;
  };

  // Toggle investment selection
  const handleToggleInvestment = (investment: InvestmentPlan) => {
    if (disabled) return;

    if (isInvestmentSelected(investment.id)) {
      // Remove investment
      onChange(selectedInvestments.filter(inv => inv.investment_plan_id !== investment.id));
    } else {
      // Add investment with default allocation
      const remainingAllocation = Math.max(0, 100 - totalAllocation);
      const defaultAllocation = selectedInvestments.length === 0 ? 100 : Math.min(remainingAllocation, 10);

      onChange([
        ...selectedInvestments,
        {
          investment_plan_id: investment.id,
          asset_type_name: investment.asset_type_name || '',
          allocated_percentage: defaultAllocation
        }
      ]);
    }
  };

  // Update investment allocation
  const handleAllocationChange = (investmentId: number, allocation: number) => {
    if (disabled) return;

    const newInvestments = selectedInvestments.map(inv =>
      inv.investment_plan_id === investmentId
        ? { ...inv, allocated_percentage: Math.max(0, Math.min(100, allocation)) }
        : inv
    );
    onChange(newInvestments);
  };

  // Auto-distribute allocation equally
  const handleAutoDistribute = () => {
    if (disabled || selectedInvestments.length === 0) return;

    const equalAllocation = 100 / selectedInvestments.length;
    const newInvestments = selectedInvestments.map(inv => ({
      ...inv,
      allocated_percentage: Math.round(equalAllocation * 100) / 100
    }));

    // Adjust last investment to ensure exact 100%
    if (newInvestments.length > 0) {
      const total = newInvestments.slice(0, -1).reduce((sum, inv) => sum + inv.allocated_percentage, 0);
      newInvestments[newInvestments.length - 1].allocated_percentage = Math.round((100 - total) * 100) / 100;
    }

    onChange(newInvestments);
  };

  // Clear all selections
  const handleClearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  // Validation
  const isValid = Math.abs(totalAllocation - 100) < 0.01 && selectedInvestments.length > 0;
  const allocationColor =
    Math.abs(totalAllocation - 100) < 0.01 ? '#10B981' :
    totalAllocation > 100 ? '#DC2626' :
    '#F59E0B';

  // Calculate current value of investment plan
  const calculateCurrentValue = (investment: InvestmentPlan): number => {
    // Simple calculation: principal + (recurring * months elapsed if applicable)
    // For accurate calculation, this should call the backend
    return investment.principal_amount;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${colors.utility.primaryText}10`,
        backgroundColor: colors.utility.secondaryBackground
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{
            fontSize: '12px',
            fontWeight: '600',
            color: colors.utility.secondaryText,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Select Investments & Allocate
          </div>

          {/* Allocation Summary */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 10px',
            backgroundColor: allocationColor + '20',
            border: `2px solid ${allocationColor}40`,
            borderRadius: '6px'
          }}>
            <span style={{ fontSize: '11px', color: colors.utility.secondaryText }}>Total:</span>
            <span style={{
              fontSize: '14px',
              fontWeight: '700',
              color: allocationColor
            }}>
              {totalAllocation.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search investments..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={disabled}
          style={{
            width: '100%',
            padding: '8px 12px',
            backgroundColor: colors.utility.primaryBackground,
            border: `1px solid ${colors.utility.primaryText}15`,
            borderRadius: '6px',
            fontSize: '13px',
            color: colors.utility.primaryText,
            marginBottom: '8px'
          }}
        />

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={handleAutoDistribute}
            disabled={disabled || selectedInvestments.length === 0}
            style={{
              flex: 1,
              padding: '6px',
              fontSize: '11px',
              backgroundColor: 'transparent',
              color: colors.brand.primary,
              border: `1px solid ${colors.brand.primary}40`,
              borderRadius: '4px',
              cursor: disabled || selectedInvestments.length === 0 ? 'not-allowed' : 'pointer',
              opacity: disabled || selectedInvestments.length === 0 ? 0.5 : 1
            }}
          >
            📊 Equal Split
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            disabled={disabled || selectedInvestments.length === 0}
            style={{
              flex: 1,
              padding: '6px',
              fontSize: '11px',
              backgroundColor: 'transparent',
              color: colors.utility.secondaryText,
              border: `1px solid ${colors.utility.secondaryText}40`,
              borderRadius: '4px',
              cursor: disabled || selectedInvestments.length === 0 ? 'not-allowed' : 'pointer',
              opacity: disabled || selectedInvestments.length === 0 ? 0.5 : 1
            }}
          >
            Clear All
          </button>
        </div>

        {/* Summary Info */}
        {selectedInvestments.length > 0 && (
          <div style={{
            marginTop: '8px',
            padding: '8px',
            backgroundColor: colors.brand.primary + '10',
            borderRadius: '6px',
            fontSize: '11px',
            color: colors.utility.primaryText
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{selectedInvestments.length} investment{selectedInvestments.length > 1 ? 's' : ''} selected</span>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div style={{
            marginTop: '8px',
            padding: '8px',
            backgroundColor: colors.semantic.error + '10',
            border: `1px solid ${colors.semantic.error}40`,
            borderRadius: '6px',
            fontSize: '11px',
            color: colors.semantic.error
          }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Investment List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {filteredInvestments.length === 0 ? (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            color: colors.utility.secondaryText,
            fontSize: '12px'
          }}>
            {searchQuery ? 'No investments match your search' : 'No investments available'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredInvestments.map((investment) => {
              const isSelected = isInvestmentSelected(investment.id);
              const allocation = getInvestmentAllocation(investment.id);
              const currentValue = calculateCurrentValue(investment);

              return (
                <div
                  key={investment.id}
                  style={{
                    padding: '12px',
                    backgroundColor: isSelected ? colors.brand.primary + '10' : colors.utility.secondaryBackground,
                    border: `2px solid ${isSelected ? colors.brand.primary + '40' : colors.utility.primaryText + '10'}`,
                    borderRadius: '8px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Investment Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: isSelected ? '10px' : '0' }}>
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleInvestment(investment)}
                      disabled={disabled}
                      style={{
                        marginTop: '2px',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        accentColor: colors.brand.primary
                      }}
                    />

                    {/* Investment Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '4px'
                      }}>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          padding: '2px 6px',
                          backgroundColor: colors.brand.primary + '20',
                          color: colors.brand.primary,
                          borderRadius: '3px'
                        }}>
                          {investment.asset_type_name}
                        </span>
                        <span style={{
                          fontSize: '10px',
                          color: colors.utility.secondaryText
                        }}>
                          {investment.investment_type === 'sip' ? '💰 SIP' :
                           investment.investment_type === 'recurring' ? '🔄 Recurring' :
                           '💵 One-time'}
                        </span>
                      </div>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: '600',
                        color: colors.brand.primary,
                        marginBottom: '2px'
                      }}>
                        {formatCurrency(currentValue)}
                      </div>
                      {investment.notes && (
                        <div style={{
                          fontSize: '10px',
                          color: colors.utility.secondaryText,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {investment.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Allocation Controls (only if selected) */}
                  {isSelected && (
                    <div style={{
                      paddingTop: '10px',
                      borderTop: `1px solid ${colors.utility.primaryText}10`
                    }}>
                      {/* Allocation Input */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <label style={{
                          fontSize: '11px',
                          color: colors.utility.secondaryText,
                          minWidth: '70px'
                        }}>
                          Allocation:
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={allocation}
                          onChange={(e) => handleAllocationChange(investment.id, parseFloat(e.target.value) || 0)}
                          disabled={disabled}
                          style={{
                            width: '80px',
                            padding: '4px 8px',
                            fontSize: '13px',
                            fontWeight: '600',
                            backgroundColor: colors.utility.primaryBackground,
                            border: `1px solid ${colors.utility.primaryText}15`,
                            borderRadius: '4px',
                            color: colors.utility.primaryText,
                            textAlign: 'right'
                          }}
                        />
                        <span style={{ fontSize: '13px', fontWeight: '600', color: colors.utility.primaryText }}>%</span>

                        {/* Value Indicator */}
                        <div style={{ flex: 1, textAlign: 'right', fontSize: '11px', color: colors.utility.secondaryText }}>
                          = {formatCurrency(currentValue * allocation / 100, true)}
                        </div>
                      </div>

                      {/* Slider */}
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="0.1"
                        value={allocation}
                        onChange={(e) => handleAllocationChange(investment.id, parseFloat(e.target.value))}
                        disabled={disabled}
                        style={{
                          width: '100%',
                          accentColor: colors.brand.primary,
                          cursor: disabled ? 'not-allowed' : 'pointer'
                        }}
                      />

                      {/* Visual Bar */}
                      <div style={{
                        width: '100%',
                        height: '4px',
                        backgroundColor: colors.utility.primaryText + '10',
                        borderRadius: '2px',
                        overflow: 'hidden',
                        marginTop: '4px'
                      }}>
                        <div style={{
                          width: `${allocation}%`,
                          height: '100%',
                          backgroundColor: colors.brand.primary,
                          transition: 'width 0.2s ease'
                        }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer with Total Check */}
      <div style={{
        padding: '12px 16px',
        borderTop: `2px solid ${colors.utility.primaryText}10`,
        backgroundColor: colors.utility.secondaryBackground
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '11px', color: colors.utility.secondaryText }}>
            {selectedInvestments.length === 0
              ? 'Select at least one investment'
              : Math.abs(totalAllocation - 100) < 0.01
                ? '✓ Allocation is balanced'
                : totalAllocation > 100
                  ? '⚠️ Over-allocated'
                  : '⚠️ Under-allocated'
            }
          </div>
          <div style={{
            fontSize: '12px',
            fontWeight: '700',
            color: allocationColor
          }}>
            {totalAllocation.toFixed(1)}% / 100%
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{
          width: '100%',
          height: '6px',
          backgroundColor: colors.utility.primaryText + '10',
          borderRadius: '3px',
          overflow: 'hidden',
          marginTop: '8px'
        }}>
          <div style={{
            width: `${Math.min(100, totalAllocation)}%`,
            height: '100%',
            backgroundColor: allocationColor,
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>
    </div>
  );
};

export default GoalInvestmentSelector;
