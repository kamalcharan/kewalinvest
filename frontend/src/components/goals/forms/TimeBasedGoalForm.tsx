// frontend/src/components/goals/forms/TimeBasedGoalForm.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { CreateGoalRequest, LinkedScheme, DEFAULT_RETURN_RATE, DEFAULT_INFLATION_RATE } from '../../../types/goal.types';
import { useCustomerSchemes } from '../../../hooks/useJTBD';
import { useGoalProjection } from '../../../hooks/useGoals';
import GoalSchemeSelector from './GoalSchemeSelector';
import { 
  validateGoalForm, 
  formatCurrency, 
  formatDate,
  getMonthsBetweenDates,
  generateGoalTitle 
} from '../../../utils/goalUtils';

interface TimeBasedGoalFormProps {
  customerId: number;
  onSubmit: (data: CreateGoalRequest) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const TimeBasedGoalForm: React.FC<TimeBasedGoalFormProps> = ({
  customerId,
  onSubmit,
  onCancel,
  isSubmitting
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const { data: schemes, isLoading: schemesLoading } = useCustomerSchemes(customerId);

  const {
    calculateFutureValue,
    calculateInflationAdjusted,
    getMonthsDifference
  } = useGoalProjection();

  // Form state
  const [goalName, setGoalName] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [expectedReturnRate, setExpectedReturnRate] = useState(DEFAULT_RETURN_RATE);
  const [inflationRate, setInflationRate] = useState(DEFAULT_INFLATION_RATE);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(0);
  const [linkedSchemes, setLinkedSchemes] = useState<LinkedScheme[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'critical' | 'high' | 'medium' | 'low'>('medium');
  const [notes, setNotes] = useState('');
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Calculate current portfolio value
 const currentValue = useMemo(() => {
  return linkedSchemes.reduce((sum, linked) => {
    const scheme = schemes?.find(s => s.scheme_code === linked.scheme_code);
    if (scheme) {
      const value = ((scheme as any).current_value || 0) * linked.allocation_percentage / 100;
      return sum + value;
    }
    return sum;
  }, 0);
}, [linkedSchemes, schemes]);

  // Real-time projections
  const projections = useMemo(() => {
    if (!targetDate) return null;

    const today = new Date();
    const target = new Date(targetDate);
    const months = getMonthsDifference(today, target);

    if (months <= 0) return null;

    const projectedCorpus = calculateFutureValue(
      currentValue,
      monthlyContribution,
      expectedReturnRate,
      months
    );

    const years = months / 12;
    const inflationAdjustedCorpus = calculateInflationAdjusted(
      projectedCorpus,
      inflationRate,
      years
    );

    return {
      months,
      years: years.toFixed(1),
      projectedCorpus,
      inflationAdjustedCorpus
    };
  }, [currentValue, monthlyContribution, targetDate, expectedReturnRate, inflationRate, calculateFutureValue, calculateInflationAdjusted, getMonthsDifference]);

  // Priority options
  const priorityOptions = [
    { value: 'critical' as const, label: 'Critical', color: '#DC2626', icon: '🔴' },
    { value: 'high' as const, label: 'High', color: '#F97316', icon: '🟠' },
    { value: 'medium' as const, label: 'Medium', color: '#F59E0B', icon: '🟡' },
    { value: 'low' as const, label: 'Low', color: '#10B981', icon: '🟢' }
  ];

const availableSchemes = useMemo(() => {
  return schemes?.map(s => ({
    scheme_code: s.scheme_code,
    scheme_name: s.scheme_name,
    folio_no: s.folio_no,
    current_value: ((s as any).current_value as number) || 0
  })) || [];
}, [schemes]);

  const displayToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  useEffect(() => {
    if (!title && goalName && targetDate) {
      setTitle(generateGoalTitle('time_based_goal', undefined, targetDate, goalName));
    }
  }, [goalName, targetDate, title]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const errorMessages: string[] = [];

    if (!goalName.trim()) {
      newErrors.goalName = 'Goal name is required';
      errorMessages.push('Please enter a goal name');
    }

    if (!targetDate) {
      newErrors.targetDate = 'Target date is required';
      errorMessages.push('Please select a target date');
    } else {
      const target = new Date(targetDate);
      const today = new Date();
      if (target <= today) {
        newErrors.targetDate = 'Target date must be in the future';
        errorMessages.push('Target date must be in the future');
      }
    }

    if (expectedReturnRate <= 0 || expectedReturnRate > 50) {
      newErrors.expectedReturnRate = 'Return rate must be between 0 and 50%';
      errorMessages.push('Please enter a realistic return rate');
    }

    if (monthlyContribution < 0) {
      newErrors.monthlyContribution = 'Monthly contribution cannot be negative';
      errorMessages.push('Monthly contribution cannot be negative');
    }

    if (linkedSchemes.length === 0) {
      newErrors.linkedSchemes = 'Select at least one scheme';
      errorMessages.push('Please select at least one scheme');
    } else {
      const totalAllocation = linkedSchemes.reduce((sum, s) => sum + s.allocation_percentage, 0);
      if (Math.abs(totalAllocation - 100) > 0.01) {
        newErrors.linkedSchemes = 'Scheme allocation must sum to 100%';
        errorMessages.push(`Allocation is ${totalAllocation.toFixed(1)}%, must be 100%`);
      }
    }

    if (!title.trim()) {
      newErrors.title = 'Title is required';
      errorMessages.push('Please enter a title');
    }

    setErrors(newErrors);

    if (errorMessages.length > 0) {
      displayToast(errorMessages[0]);
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const goalData: CreateGoalRequest = {
      customer_id: customerId,
      goal_type: 'time_based_goal',
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      config_data: {
        goal_name: goalName.trim(),
        goal_type: 'time_based_goal',
        target_date: targetDate,
        expected_return_rate: expectedReturnRate,
        inflation_rate: inflationRate,
        monthly_contribution: monthlyContribution,
        linked_schemes: linkedSchemes,
        current_value: currentValue,
        notes: notes.trim() || undefined
      }
    };

    onSubmit(goalData);
  };

  return (
    <div style={{ display: 'flex', height: '75vh', maxHeight: '700px' }}>
      {/* Toast */}
      {showToast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: colors.semantic.error,
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'slideInRight 0.3s ease-out'
        }}>
          <span>⚠️</span>
          <span style={{ fontSize: '14px', fontWeight: '500' }}>{toastMessage}</span>
        </div>
      )}

      {/* LEFT: Scheme Selector */}
      <div style={{
        width: '320px',
        borderRight: `1px solid ${colors.utility.primaryText}15`,
        backgroundColor: colors.utility.secondaryBackground
      }}>
        <GoalSchemeSelector
          availableSchemes={availableSchemes}
          selectedSchemes={linkedSchemes}
          onChange={setLinkedSchemes}
          error={errors.linkedSchemes}
          disabled={schemesLoading || isSubmitting}
        />
      </div>

      {/* RIGHT: Form */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          
          {/* Goal Details */}
          <div style={{
            marginBottom: '20px',
            padding: '16px',
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '8px',
            border: `1px solid ${colors.utility.primaryText}10`
          }}>
            <div style={{
              fontSize: '12px',
              fontWeight: '600',
              color: colors.utility.secondaryText,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '12px'
            }}>
              📅 Time-Based Goal (Fixed Timeline)
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: '500', color: colors.utility.secondaryText, marginBottom: '6px', display: 'block' }}>
                Goal Name *
              </label>
              <input
                type="text"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                placeholder="e.g., Retirement Fund, Vacation Corpus"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  backgroundColor: colors.utility.primaryBackground,
                  border: `2px solid ${errors.goalName ? colors.semantic.error : colors.utility.primaryText + '15'}`,
                  borderRadius: '6px',
                  color: colors.utility.primaryText
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: '500', color: colors.utility.secondaryText, marginBottom: '6px', display: 'block' }}>
                Target Date (Fixed) *
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  backgroundColor: colors.utility.primaryBackground,
                  border: `2px solid ${errors.targetDate ? colors.semantic.error : colors.brand.primary + '40'}`,
                  borderRadius: '6px',
                  color: colors.utility.primaryText
                }}
              />
              <div style={{ fontSize: '10px', color: colors.utility.secondaryText, marginTop: '4px' }}>
                💡 You'll accumulate whatever amount is possible by this date
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '500', color: colors.utility.secondaryText, marginBottom: '6px', display: 'block' }}>
                Monthly Contribution (₹)
              </label>
              <input
                type="number"
                min="0"
                value={monthlyContribution || ''}
                onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                placeholder="10000"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  backgroundColor: colors.utility.primaryBackground,
                  border: `2px solid ${colors.utility.primaryText}15`,
                  borderRadius: '6px',
                  color: colors.utility.primaryText
                }}
              />
            </div>
          </div>

          {/* Assumptions */}
          <div style={{
            marginBottom: '20px',
            padding: '16px',
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '8px',
            border: `1px solid ${colors.utility.primaryText}10`
          }}>
            <div style={{
              fontSize: '12px',
              fontWeight: '600',
              color: colors.utility.secondaryText,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '12px'
            }}>
              📊 Assumptions
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', color: colors.utility.secondaryText, marginBottom: '6px', display: 'block' }}>
                  Expected Return (% p.a.)
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.1"
                  value={expectedReturnRate}
                  onChange={(e) => setExpectedReturnRate(Number(e.target.value))}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    backgroundColor: colors.utility.primaryBackground,
                    border: `2px solid ${colors.utility.primaryText}15`,
                    borderRadius: '6px',
                    color: colors.utility.primaryText
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', color: colors.utility.secondaryText, marginBottom: '6px', display: 'block' }}>
                  Inflation Rate (% p.a.)
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.1"
                  value={inflationRate}
                  onChange={(e) => setInflationRate(Number(e.target.value))}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    backgroundColor: colors.utility.primaryBackground,
                    border: `2px solid ${colors.utility.primaryText}15`,
                    borderRadius: '6px',
                    color: colors.utility.primaryText
                  }}
                />
              </div>
            </div>
          </div>

          {/* Projection Preview */}
          {projections && (
            <div style={{
              marginBottom: '20px',
              padding: '16px',
              backgroundColor: colors.brand.primary + '10',
              borderRadius: '8px',
              border: `2px solid ${colors.brand.primary}40`
            }}>
              <div style={{
                fontSize: '12px',
                fontWeight: '600',
                color: colors.utility.secondaryText,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '12px'
              }}>
                📈 Projected Corpus at {formatDate(targetDate)}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: colors.utility.secondaryText, marginBottom: '4px' }}>
                    Nominal Value
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: colors.brand.primary }}>
                    {formatCurrency(projections.projectedCorpus, true)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '10px', color: colors.utility.secondaryText, marginBottom: '4px' }}>
                    Real Value (Inflation-Adjusted)
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: colors.utility.primaryText }}>
                    {formatCurrency(projections.inflationAdjustedCorpus, true)}
                  </div>
                </div>
              </div>

              <div style={{
                padding: '10px',
                backgroundColor: colors.utility.primaryBackground,
                borderRadius: '6px',
                fontSize: '11px',
                color: colors.utility.secondaryText
              }}>
                In {projections.years} years, current portfolio value of {formatCurrency(currentValue, true)} will grow to {formatCurrency(projections.projectedCorpus, true)}
              </div>
            </div>
          )}

          {/* Title & Description */}
          <div style={{
            marginBottom: '16px',
            padding: '16px',
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '8px',
            border: `1px solid ${colors.utility.primaryText}10`
          }}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: '500', color: colors.utility.secondaryText, marginBottom: '6px', display: 'block' }}>
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Auto-generated"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '13px',
                  backgroundColor: colors.utility.primaryBackground,
                  border: `2px solid ${errors.title ? colors.semantic.error : colors.utility.primaryText + '15'}`,
                  borderRadius: '6px',
                  color: colors.utility.primaryText
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: '500', color: colors.utility.secondaryText, marginBottom: '6px', display: 'block' }}>
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional details..."
                rows={2}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '13px',
                  backgroundColor: colors.utility.primaryBackground,
                  border: `2px solid ${colors.utility.primaryText}15`,
                  borderRadius: '6px',
                  color: colors.utility.primaryText,
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '500', color: colors.utility.secondaryText, marginBottom: '6px', display: 'block' }}>
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Private notes..."
                rows={2}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '13px',
                  backgroundColor: colors.utility.primaryBackground,
                  border: `2px solid ${colors.utility.primaryText}15`,
                  borderRadius: '6px',
                  color: colors.utility.primaryText,
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>

          {/* Priority */}
          <div style={{
            padding: '16px',
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '8px',
            border: `1px solid ${colors.utility.primaryText}10`
          }}>
            <label style={{
              fontSize: '12px',
              fontWeight: '600',
              color: colors.utility.secondaryText,
              marginBottom: '10px',
              display: 'block',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Priority Level
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {priorityOptions.map((option) => (
                <div
                  key={option.value}
                  onClick={() => !isSubmitting && setPriority(option.value)}
                  style={{
                    padding: '12px 8px',
                    backgroundColor: priority === option.value ? option.color + '20' : colors.utility.primaryBackground,
                    border: `2px solid ${priority === option.value ? option.color : colors.utility.primaryText + '10'}`,
                    borderRadius: '8px',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                    opacity: isSubmitting ? 0.6 : 1
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{option.icon}</span>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color: priority === option.value ? option.color : colors.utility.primaryText
                  }}>
                    {option.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{
          borderTop: `2px solid ${colors.brand.primary}30`,
          padding: '16px 24px',
          backgroundColor: colors.utility.secondaryBackground,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
            {linkedSchemes.length > 0 && `✓ ${linkedSchemes.length} scheme(s) • `}
            {currentValue > 0 && `💰 ${formatCurrency(currentValue, true)}`}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              style={{
                padding: '10px 20px',
                backgroundColor: 'transparent',
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '6px',
                color: colors.utility.primaryText,
                fontSize: '14px',
                fontWeight: '500',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.5 : 1
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || linkedSchemes.length === 0}
              style={{
                padding: '10px 24px',
                backgroundColor: colors.brand.primary,
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: isSubmitting || linkedSchemes.length === 0 ? 'not-allowed' : 'pointer',
                opacity: isSubmitting || linkedSchemes.length === 0 ? 0.6 : 1
              }}
            >
              {isSubmitting ? 'Creating...' : 'Create Goal'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default TimeBasedGoalForm;