// frontend/src/components/goals/forms/TimeAndPriceGoalForm.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { CreateGoalRequest, LinkedScheme, DEFAULT_RETURN_RATE, DEFAULT_INFLATION_RATE } from '../../../types/goal.types';
import { useCustomerSchemes } from '../../../hooks/useJTBD';
import { useGoalProjection } from '../../../hooks/useGoals';
import GoalSchemeSelector from './GoalSchemeSelector';
import { 
  validateGoalForm, 
  formatCurrency, 
  formatPercentage,
  getMonthsBetweenDates,
  generateGoalTitle 
} from '../../../utils/goalUtils';

interface TimeAndPriceGoalFormProps {
  customerId: number;
  onSubmit: (data: CreateGoalRequest) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const TimeAndPriceGoalForm: React.FC<TimeAndPriceGoalFormProps> = ({
  customerId,
  onSubmit,
  onCancel,
  isSubmitting
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Fetch customer schemes
  const { data: schemes, isLoading: schemesLoading } = useCustomerSchemes(customerId);

  // Goal projection calculator
  const {
    calculateFutureValue,
    calculateRequiredSIP,
    getMonthsDifference,
    calculateProgress,
    calculateGap
  } = useGoalProjection();

  // Form state
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState<number>(0);
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

  // Calculate current portfolio value from selected schemes
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
    if (!targetDate || targetAmount <= 0) return null;

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

    const requiredSIP = calculateRequiredSIP(
      targetAmount,
      currentValue,
      expectedReturnRate,
      months
    );

    const sipGap = requiredSIP - monthlyContribution;
    const progress = calculateProgress(currentValue, targetAmount);
    const gapInfo = calculateGap(projectedCorpus, targetAmount);

    // Simple probability estimate (not Monte Carlo, just heuristic)
    const successProbability = projectedCorpus >= targetAmount ? 95 : 
      projectedCorpus >= targetAmount * 0.9 ? 75 :
      projectedCorpus >= targetAmount * 0.8 ? 60 :
      projectedCorpus >= targetAmount * 0.7 ? 45 : 30;

    return {
      months,
      projectedCorpus,
      requiredSIP,
      sipGap,
      progress,
      gapInfo,
      successProbability
    };
  }, [currentValue, monthlyContribution, targetAmount, targetDate, expectedReturnRate, calculateFutureValue, calculateRequiredSIP, getMonthsDifference, calculateProgress, calculateGap]);

  // Priority options
  const priorityOptions = [
    { value: 'critical' as const, label: 'Critical', color: '#DC2626', icon: '🔴' },
    { value: 'high' as const, label: 'High', color: '#F97316', icon: '🟠' },
    { value: 'medium' as const, label: 'Medium', color: '#F59E0B', icon: '🟡' },
    { value: 'low' as const, label: 'Low', color: '#10B981', icon: '🟢' }
  ];

  // Available schemes for selector
const availableSchemes = useMemo(() => {
  return schemes?.map(s => ({
    scheme_code: s.scheme_code,
    scheme_name: s.scheme_name,
    folio_no: s.folio_no,
    current_value: ((s as any).current_value as number) || 0
  })) || [];
}, [schemes]);

  // Show toast helper
  const displayToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  // Auto-generate title
  useEffect(() => {
    if (!title && goalName && targetAmount > 0 && targetDate) {
      setTitle(generateGoalTitle('time_and_price_goal', targetAmount, targetDate, goalName));
    }
  }, [goalName, targetAmount, targetDate, title]);

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const errorMessages: string[] = [];

    if (!goalName.trim()) {
      newErrors.goalName = 'Goal name is required';
      errorMessages.push('Please enter a goal name');
    }

    if (targetAmount <= 0) {
      newErrors.targetAmount = 'Target amount must be greater than 0';
      errorMessages.push('Please enter a valid target amount');
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

  // Submit handler
  const handleSubmit = () => {
    if (!validate()) return;

    const goalData: CreateGoalRequest = {
      customer_id: customerId,
      goal_type: 'time_and_price_goal',
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      config_data: {
        goal_name: goalName.trim(),
        goal_type: 'time_and_price_goal',
        target_amount: targetAmount,
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
      {/* Toast Notification */}
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
          animation: 'slideInRight 0.3s ease-out',
          maxWidth: '400px'
        }}>
          <span style={{ fontSize: '16px' }}>⚠️</span>
          <span style={{ fontSize: '14px', fontWeight: '500' }}>{toastMessage}</span>
        </div>
      )}

      {/* LEFT PANEL: Scheme Selector */}
      <div style={{
        width: '320px',
        borderRight: `1px solid ${colors.utility.primaryText}15`,
        display: 'flex',
        flexDirection: 'column',
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

      {/* RIGHT PANEL: Form */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Scrollable Form Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          
          {/* Goal Details Section */}
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
              🎯 Goal Details
            </div>

            {/* Goal Name */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: '500', color: colors.utility.secondaryText, marginBottom: '6px', display: 'block' }}>
                Goal Name *
              </label>
              <input
                type="text"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                placeholder="e.g., Child's Education, House Down Payment"
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
              {errors.goalName && (
                <div style={{ fontSize: '11px', color: colors.semantic.error, marginTop: '4px' }}>
                  {errors.goalName}
                </div>
              )}
            </div>

            {/* Target Amount & Date - 2 column */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', color: colors.utility.secondaryText, marginBottom: '6px', display: 'block' }}>
                  Target Amount (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={targetAmount || ''}
                  onChange={(e) => setTargetAmount(Number(e.target.value))}
                  placeholder="5000000"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    backgroundColor: colors.utility.primaryBackground,
                    border: `2px solid ${errors.targetAmount ? colors.semantic.error : colors.brand.primary + '40'}`,
                    borderRadius: '6px',
                    color: colors.utility.primaryText
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', color: colors.utility.secondaryText, marginBottom: '6px', display: 'block' }}>
                  Target Date *
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
              </div>
            </div>

            {/* Monthly Contribution */}
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
                  border: `2px solid ${errors.monthlyContribution ? colors.semantic.error : colors.utility.primaryText + '15'}`,
                  borderRadius: '6px',
                  color: colors.utility.primaryText
                }}
              />
            </div>
          </div>

          {/* Assumptions Section */}
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
              {/* Expected Return Rate */}
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

              {/* Inflation Rate */}
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

          {/* Real-time Projection Preview */}
          {projections && (
            <div style={{
              marginBottom: '20px',
              padding: '16px',
              backgroundColor: projections.gapInfo.status === 'on_track' || projections.gapInfo.status === 'surplus' 
                ? colors.semantic.success + '10' 
                : colors.semantic.warning + '10',
              borderRadius: '8px',
              border: `2px solid ${
                projections.gapInfo.status === 'on_track' || projections.gapInfo.status === 'surplus' 
                  ? colors.semantic.success + '40' 
                  : colors.semantic.warning + '40'
              }`
            }}>
              <div style={{
                fontSize: '12px',
                fontWeight: '600',
                color: colors.utility.secondaryText,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '12px'
              }}>
                📈 Projection Preview
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: colors.utility.secondaryText, marginBottom: '4px' }}>
                    Projected Corpus
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: colors.utility.primaryText }}>
                    {formatCurrency(projections.projectedCorpus, true)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '10px', color: colors.utility.secondaryText, marginBottom: '4px' }}>
                    Success Probability
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: 
                    projections.successProbability >= 75 ? '#10B981' : 
                    projections.successProbability >= 60 ? '#F59E0B' : '#DC2626'
                  }}>
                    {formatPercentage(projections.successProbability, 0)}
                  </div>
                </div>
              </div>

              <div style={{ 
                padding: '10px', 
                backgroundColor: colors.utility.primaryBackground, 
                borderRadius: '6px',
                marginBottom: '10px'
              }}>
                <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginBottom: '6px' }}>
                  Gap: {projections.gapInfo.gap >= 0 ? 'Surplus' : 'Shortfall'} of {formatCurrency(Math.abs(projections.gapInfo.gap), true)}
                  {' '}({formatPercentage(Math.abs(projections.gapInfo.percentage), 1)})
                </div>
                <div style={{
                  width: '100%',
                  height: '6px',
                  backgroundColor: colors.utility.primaryText + '10',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${Math.min(100, projections.progress)}%`,
                    height: '100%',
                    backgroundColor: projections.gapInfo.status === 'on_track' || projections.gapInfo.status === 'surplus' 
                      ? '#10B981' 
                      : '#F59E0B',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>

              {projections.sipGap > 0 && (
                <div style={{
                  padding: '8px 10px',
                  backgroundColor: colors.semantic.warning + '20',
                  border: `1px solid ${colors.semantic.warning}40`,
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: colors.utility.primaryText
                }}>
                  💡 <strong>Recommended:</strong> Increase monthly SIP by {formatCurrency(projections.sipGap, true)} 
                  {' '}(to {formatCurrency(projections.requiredSIP, true)}/month)
                </div>
              )}

              {projections.gapInfo.status === 'surplus' && (
                <div style={{
                  padding: '8px 10px',
                  backgroundColor: colors.semantic.success + '20',
                  border: `1px solid ${colors.semantic.success}40`,
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: colors.utility.primaryText
                }}>
                  ✓ Excellent! On track to exceed target by {formatCurrency(projections.gapInfo.gap, true)}
                </div>
              )}
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
                placeholder="Auto-generated based on goal details"
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
                placeholder="Additional details about this goal..."
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
                placeholder="Private notes, milestones, or reminders..."
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
                    color: priority === option.value ? option.color : colors.utility.primaryText,
                    textAlign: 'center'
                  }}>
                    {option.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FOOTER - Action Buttons */}
        <div style={{
          borderTop: `2px solid ${colors.brand.primary}30`,
          padding: '16px 24px',
          backgroundColor: colors.utility.secondaryBackground,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          {/* Summary Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, fontSize: '12px', color: colors.utility.secondaryText }}>
            {linkedSchemes.length > 0 && (
              <>
                <span>✓ {linkedSchemes.length} scheme{linkedSchemes.length > 1 ? 's' : ''}</span>
                <span>•</span>
              </>
            )}
            {currentValue > 0 && (
              <>
                <span>💰 Current: {formatCurrency(currentValue, true)}</span>
                <span>•</span>
              </>
            )}
            {targetAmount > 0 && (
              <span>🎯 Target: {formatCurrency(targetAmount, true)}</span>
            )}
          </div>

          {/* Action Buttons */}
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
              {isSubmitting ? 'Creating Goal...' : 'Create Goal'}
            </button>
          </div>
        </div>
      </div>

      {/* CSS Animation for Toast */}
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default TimeAndPriceGoalForm;