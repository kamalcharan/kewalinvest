// frontend/src/pages/goals/GoalWizardPage.tsx
// Full-page goal creation wizard with withdrawal support and asset type allocation

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { CreateGoalRequest, GoalTrackingType, GoalWithdrawal } from '../../types/goal.types';
import { AssetType } from '../../types/assetType.types';
import { useCreateGoal } from '../../hooks/useGoals';
import { useAssetTypes } from '../../hooks/useAssetTypes';
import ConfirmationDialog from '../../components/ui/ConfirmationDialog';

type GoalStatus = 'new' | 'existing';
type WizardStep = 1 | 2 | 3 | 4 | 5;

interface AssetTypeAllocation {
  asset_type_id: number;
  asset_type_code: string;
  asset_type_name: string;
  allocation_percentage: number;
  default_assumption_rate: number;
}

interface FormData {
  // Step 1 & 2
  goalType: GoalTrackingType | null;
  goalStatus: GoalStatus | null;

  // Step 3
  title: string;
  goal_name: string;
  start_date: string;
  target_date?: string;
  target_amount?: number;
  current_value: number;
  // REMOVED: monthly_contribution - Phase 2: This belongs to investment plans, not goals
  priority: 'critical' | 'high' | 'medium' | 'low';

  // Step 3 - Withdrawals
  has_withdrawals: boolean;
  withdrawals: GoalWithdrawal[];

  // Step 4 - Asset Type Allocation
  asset_allocations: AssetTypeAllocation[];
}

const GoalWizardPage: React.FC = () => {
  const navigate = useNavigate();
  const { customerId } = useParams<{ customerId: string }>();
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [formData, setFormData] = useState<FormData>({
    goalType: null,
    goalStatus: null,
    title: '',
    goal_name: '',
    start_date: new Date().toISOString().split('T')[0],
    current_value: 0,
    priority: 'high',
    has_withdrawals: false,
    withdrawals: [],
    asset_allocations: []
  });

  const [validationDialog, setValidationDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({ isOpen: false, title: '', message: '' });

  const createGoalMutation = useCreateGoal();
  const { assetTypes } = useAssetTypes();

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Navigation
  const goToNextStep = () => {
    if (validateCurrentStep()) {
      // Skip withdrawal step if not needed
      if (currentStep === 3 && !formData.has_withdrawals) {
        setCurrentStep(5 as WizardStep); // Skip to asset allocation
      } else {
        setCurrentStep((prev) => Math.min(5, prev + 1) as WizardStep);
      }
    }
  };

  const goToPreviousStep = () => {
    // Handle back navigation from asset allocation
    if (currentStep === 5 && !formData.has_withdrawals) {
      setCurrentStep(3 as WizardStep); // Skip withdrawal step
    } else {
      setCurrentStep((prev) => Math.max(1, prev - 1) as WizardStep);
    }
  };

  const showValidationError = (title: string, message: string) => {
    setValidationDialog({ isOpen: true, title, message });
  };

  // Validation
  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1:
        if (!formData.goalType) {
          showValidationError('Goal Type Required', 'Please select a goal type');
          return false;
        }
        return true;
      case 2:
        if (!formData.goalStatus) {
          showValidationError('Goal Status Required', 'Please select goal status');
          return false;
        }
        return true;
      case 3:
        if (!formData.title.trim()) {
          showValidationError('Goal Name Required', 'Please enter a goal name');
          return false;
        }
        if (!formData.goal_name.trim()) {
          showValidationError('Goal Description Required', 'Please enter a goal description');
          return false;
        }
        // REMOVED: monthly_contribution validation - Phase 2: This belongs to investment plans
        if ((formData.goalType === 'price_based_goal' || formData.goalType === 'time_and_price_goal') && !formData.target_amount) {
          showValidationError('Target Amount Required', 'Please enter a target amount');
          return false;
        }
        if ((formData.goalType === 'time_based_goal' || formData.goalType === 'time_and_price_goal') && !formData.target_date) {
          showValidationError('Target Date Required', 'Please enter a target date');
          return false;
        }
        if (formData.goalStatus === 'existing' && formData.current_value <= 0) {
          showValidationError('Current Value Required', 'Please enter current value for existing goal');
          return false;
        }
        return true;
      case 4:
        // Withdrawal validation
        if (formData.withdrawals.length === 0) {
          showValidationError('Withdrawals Required', 'Please add at least one withdrawal');
          return false;
        }
        for (const withdrawal of formData.withdrawals) {
          if (!withdrawal.amount || withdrawal.amount <= 0) {
            showValidationError('Invalid Withdrawal', 'Withdrawal amount must be greater than 0');
            return false;
          }
          if (!withdrawal.withdrawal_date) {
            showValidationError('Invalid Withdrawal', 'Withdrawal date is required');
            return false;
          }
          if (!withdrawal.reason.trim()) {
            showValidationError('Invalid Withdrawal', 'Withdrawal reason is required');
            return false;
          }
          // Check withdrawal date < target date
          if (formData.target_date && withdrawal.withdrawal_date >= formData.target_date) {
            showValidationError('Invalid Withdrawal Date', 'Withdrawal date must be before target date');
            return false;
          }
        }
        // Check total withdrawals < target amount
        const totalWithdrawals = formData.withdrawals.reduce((sum, w) => sum + w.amount, 0);
        if (formData.target_amount && totalWithdrawals >= formData.target_amount) {
          showValidationError('Invalid Withdrawals', `Total withdrawals (₹${totalWithdrawals.toLocaleString()}) must be less than target amount (₹${formData.target_amount.toLocaleString()})`);
          return false;
        }
        return true;
      case 5:
        // Phase 2: Asset allocation is OPTIONAL - can skip for now
        // Will be linked via investment plans later
        const total = formData.asset_allocations.reduce((sum, a) => sum + a.allocation_percentage, 0);
        if (formData.asset_allocations.length > 0 && Math.abs(total - 100) > 0.01) {
          showValidationError('Invalid Allocation', `If allocating assets, total must equal 100% (currently ${total.toFixed(1)}%)`);
          return false;
        }
        return true; // Allow proceeding even without allocations
      default:
        return true;
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateCurrentStep() || !formData.goalType || createGoalMutation.isPending || !customerId) {
      return;
    }

    try {
      const goalData: CreateGoalRequest = {
        customer_id: parseInt(customerId),
        goal_type: formData.goalType,
        title: formData.title,
        priority: formData.priority,
        config_data: {
          goal_name: formData.goal_name,
          goal_type: formData.goalType,
          start_date: formData.start_date,
          ...(formData.target_date && { target_date: formData.target_date }),
          ...(formData.target_amount && { target_amount: formData.target_amount }),
          current_value: formData.current_value,
          monthly_contribution: 0, // Phase 2: Placeholder for backward compatibility
          has_withdrawals: formData.has_withdrawals,
          withdrawals: formData.has_withdrawals ? formData.withdrawals : []
        }
      };

      await createGoalMutation.mutateAsync(goalData);
      navigate(`/customers/${customerId}?tab=goals`);
    } catch (error) {
      console.error('Error creating goal:', error);
      showValidationError('Error', 'Failed to create goal. Please try again.');
    }
  };

  // Withdrawal management
  const addWithdrawal = () => {
    const newWithdrawal: GoalWithdrawal = {
      id: `w${Date.now()}`,
      amount: 0,
      withdrawal_date: '',
      reason: '',
      sequence: formData.withdrawals.length + 1
    };
    setFormData(prev => ({
      ...prev,
      withdrawals: [...prev.withdrawals, newWithdrawal]
    }));
  };

  const removeWithdrawal = (id: string) => {
    setFormData(prev => ({
      ...prev,
      withdrawals: prev.withdrawals.filter(w => w.id !== id)
    }));
  };

  const updateWithdrawal = (id: string, field: keyof GoalWithdrawal, value: any) => {
    setFormData(prev => ({
      ...prev,
      withdrawals: prev.withdrawals.map(w =>
        w.id === id ? { ...w, [field]: value } : w
      )
    }));
  };

  // Asset allocation management
  const toggleAssetType = (assetType: AssetType) => {
    const exists = formData.asset_allocations.find(a => a.asset_type_id === assetType.id);
    if (exists) {
      setFormData(prev => ({
        ...prev,
        asset_allocations: prev.asset_allocations.filter(a => a.asset_type_id !== assetType.id)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        asset_allocations: [...prev.asset_allocations, {
          asset_type_id: assetType.id,
          asset_type_code: assetType.asset_type_code,
          asset_type_name: assetType.asset_type_name,
          allocation_percentage: 0,
          default_assumption_rate: assetType.default_assumption_rate || 8
        }]
      }));
    }
  };

  const updateAllocation = (assetTypeId: number, percentage: number) => {
    setFormData(prev => ({
      ...prev,
      asset_allocations: prev.asset_allocations.map(a =>
        a.asset_type_id === assetTypeId ? { ...a, allocation_percentage: percentage } : a
      )
    }));
  };

  const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  const stepTitles = [
    { number: 1, label: 'Goal Type' },
    { number: 2, label: 'Goal Status' },
    { number: 3, label: 'Configuration' },
    { number: 4, label: 'Withdrawals' },
    { number: 5, label: 'Asset Allocation' }
  ];

  const totalAllocation = formData.asset_allocations.reduce((sum, a) => sum + a.allocation_percentage, 0);
  const weightedReturnRate = formData.asset_allocations.length > 0
    ? formData.asset_allocations.reduce((sum, a) => sum + (a.allocation_percentage / 100) * a.default_assumption_rate, 0)
    : 0;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.utility.primaryBackground }}>
      {/* Header */}
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderBottom: `1px solid ${colors.utility.primaryText}10`,
        padding: '16px 24px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate(`/customers/${customerId}?tab=goals`)}
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              color: colors.utility.primaryText,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '700', color: colors.utility.primaryText, margin: 0 }}>
              Create Financial Goal
            </h1>
            <p style={{ fontSize: '13px', color: colors.utility.secondaryText, margin: '4px 0 0 0' }}>
              Step {currentStep} of 5: {stepTitles[currentStep - 1].label}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div style={{ backgroundColor: colors.utility.secondaryBackground, padding: '16px 24px', borderBottom: `1px solid ${colors.utility.primaryText}10` }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '8px', position: 'relative' }}>
          {stepTitles.map((step, index) => {
            const isCompleted = currentStep > step.number;
            const isActive = currentStep === step.number;
            const isSkipped = step.number === 4 && !formData.has_withdrawals;

            return (
              <div
                key={step.number}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  position: 'relative',
                  opacity: isSkipped ? 0.3 : 1
                }}
              >
                {index < stepTitles.length - 1 && (
                  <div style={{
                    position: 'absolute',
                    top: '16px',
                    left: 'calc(50% + 16px)',
                    right: 'calc(-50% + 16px)',
                    height: '2px',
                    backgroundColor: isCompleted ? colors.semantic.success : colors.utility.primaryText + '20',
                    zIndex: 0
                  }} />
                )}
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: isCompleted ? colors.semantic.success : isActive ? colors.brand.primary : colors.utility.primaryText + '15',
                  color: (isCompleted || isActive) ? 'white' : colors.utility.secondaryText,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '14px',
                  zIndex: 1,
                  position: 'relative'
                }}>
                  {isCompleted ? <CheckIcon /> : step.number}
                </div>
                <div style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  color: isActive ? colors.brand.primary : isCompleted ? colors.semantic.success : colors.utility.secondaryText,
                  textAlign: 'center'
                }}>
                  {step.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1200px', margin: '24px auto', padding: '0 24px' }}>
        {/* STEP 1: Goal Type */}
        {currentStep === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {[
              { type: 'time_based_goal' as GoalTrackingType, icon: '📅', title: 'Time-Based Goal', description: 'Set a fixed deadline with flexible target amount', color: '#3B82F6' },
              { type: 'price_based_goal' as GoalTrackingType, icon: '💰', title: 'Price-Based Goal', description: 'Target a specific amount with flexible timeline', color: '#10B981' },
              { type: 'time_and_price_goal' as GoalTrackingType, icon: '🎯', title: 'Time & Price Goal', description: 'Set both fixed date and amount with monitoring', color: '#F59E0B' }
            ].map((card) => (
              <div
                key={card.type}
                onClick={() => setFormData(prev => ({ ...prev, goalType: card.type }))}
                style={{
                  padding: '20px',
                  backgroundColor: formData.goalType === card.type ? card.color + '15' : colors.utility.secondaryBackground,
                  borderRadius: '12px',
                  border: `2px solid ${formData.goalType === card.type ? card.color : colors.utility.primaryText + '10'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>{card.icon}</div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText, margin: '0 0 6px 0' }}>{card.title}</h3>
                <p style={{ fontSize: '12px', color: colors.utility.secondaryText, margin: 0, lineHeight: '1.4' }}>{card.description}</p>
                {formData.goalType === card.type && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: card.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}>
                    <CheckIcon />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* STEP 2: Goal Status */}
        {currentStep === 2 && (
          <div>
            <div style={{ marginBottom: '24px', textAlign: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: colors.utility.primaryText, margin: '0 0 8px 0' }}>📋 Goal Status</h3>
              <p style={{ fontSize: '14px', color: colors.utility.secondaryText, margin: 0 }}>Is this a brand new goal or an existing goal you want to onboard?</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', maxWidth: '700px', margin: '0 auto' }}>
              {[
                { status: 'new' as GoalStatus, icon: '✨', title: 'New Goal', description: 'Starting fresh from today. No historical data to import.', color: '#10B981' },
                { status: 'existing' as GoalStatus, icon: '📥', title: 'Existing Goal', description: 'Already in progress. Import current value and historical data.', color: '#F59E0B' }
              ].map((card) => (
                <div
                  key={card.status}
                  onClick={() => setFormData(prev => ({ ...prev, goalStatus: card.status }))}
                  style={{
                    padding: '24px',
                    backgroundColor: formData.goalStatus === card.status ? card.color + '15' : colors.utility.secondaryBackground,
                    borderRadius: '12px',
                    border: `2px solid ${formData.goalStatus === card.status ? card.color : colors.utility.primaryText + '10'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    minHeight: '150px'
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>{card.icon}</div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.utility.primaryText, margin: '0 0 8px 0' }}>{card.title}</h3>
                  <p style={{ fontSize: '13px', color: colors.utility.secondaryText, margin: 0, lineHeight: '1.5' }}>{card.description}</p>
                  {formData.goalStatus === card.status && (
                    <div style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: card.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white'
                    }}>
                      <CheckIcon />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: Goal Configuration */}
        {currentStep === 3 && (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: colors.utility.primaryText, margin: '0 0 20px 0' }}>📝 Goal Configuration</h3>

            {/* Goal Name */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '8px' }}>
                Goal Name <span style={{ color: colors.semantic.error }}>*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Aarav's Higher Education, Dream Home, Europe Trip"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  fontSize: '14px',
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText
                }}
              />
            </div>

            {/* Goal Description */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '8px' }}>
                Goal Description <span style={{ color: colors.semantic.error }}>*</span>
              </label>
              <input
                type="text"
                value={formData.goal_name}
                onChange={(e) => setFormData(prev => ({ ...prev, goal_name: e.target.value }))}
                placeholder="Brief description of the goal"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  fontSize: '14px',
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText
                }}
              />
            </div>

            {/* Withdrawal Radio Buttons */}
            <div style={{
              marginBottom: '24px',
              padding: '16px',
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '8px',
              border: `1px solid ${colors.utility.primaryText}10`
            }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '12px' }}>
                Intermediate Withdrawals
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `2px solid ${!formData.has_withdrawals ? colors.brand.primary : colors.utility.primaryText + '20'}`,
                  backgroundColor: !formData.has_withdrawals ? colors.brand.primary + '10' : 'transparent',
                  cursor: 'pointer'
                }}>
                  <input
                    type="radio"
                    name="withdrawals"
                    checked={!formData.has_withdrawals}
                    onChange={() => setFormData(prev => ({ ...prev, has_withdrawals: false, withdrawals: [] }))}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText }}>
                      This goal does not have any planned withdrawals
                    </div>
                    <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginTop: '4px' }}>
                      The full corpus will be available at goal completion
                    </div>
                  </div>
                </label>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `2px solid ${formData.has_withdrawals ? colors.brand.primary : colors.utility.primaryText + '20'}`,
                  backgroundColor: formData.has_withdrawals ? colors.brand.primary + '10' : 'transparent',
                  cursor: 'pointer'
                }}>
                  <input
                    type="radio"
                    name="withdrawals"
                    checked={formData.has_withdrawals}
                    onChange={() => setFormData(prev => ({ ...prev, has_withdrawals: true }))}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText }}>
                      This goal has intermediate withdrawals
                    </div>
                    <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginTop: '4px' }}>
                      Define withdrawal amounts and dates before goal completion
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Start Date and Current Value */}
            {formData.goalStatus === 'existing' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '8px' }}>
                    Goal Start Date <span style={{ color: colors.semantic.error }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.utility.primaryText}20`,
                      fontSize: '14px',
                      backgroundColor: colors.utility.secondaryBackground,
                      color: colors.utility.primaryText
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '8px' }}>
                    Current Value <span style={{ color: colors.semantic.error }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute',
                      left: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: colors.utility.secondaryText,
                      fontWeight: '600'
                    }}>₹</span>
                    <input
                      type="number"
                      value={formData.current_value || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, current_value: parseFloat(e.target.value) || 0 }))}
                      placeholder="320000"
                      style={{
                        width: '100%',
                        padding: '12px 16px 12px 36px',
                        borderRadius: '8px',
                        border: `1px solid ${colors.utility.primaryText}20`,
                        fontSize: '14px',
                        backgroundColor: colors.utility.secondaryBackground,
                        color: colors.utility.primaryText
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '8px' }}>
                  Goal Start Date
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  min={getTodayDate()}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.utility.primaryText}20`,
                    fontSize: '14px',
                    backgroundColor: colors.utility.secondaryBackground,
                    color: colors.utility.primaryText
                  }}
                />
                <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginTop: '6px' }}>
                  Can be a future date if goal starts later
                </div>
              </div>
            )}

            {/* Target Amount (for price-based goals) */}
            {(formData.goalType === 'price_based_goal' || formData.goalType === 'time_and_price_goal') && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '8px' }}>
                  Target Amount <span style={{ color: colors.semantic.error }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: colors.utility.secondaryText,
                    fontWeight: '600'
                  }}>₹</span>
                  <input
                    type="number"
                    value={formData.target_amount || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_amount: parseFloat(e.target.value) || undefined }))}
                    placeholder="2500000"
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 36px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.utility.primaryText}20`,
                      fontSize: '14px',
                      backgroundColor: colors.utility.secondaryBackground,
                      color: colors.utility.primaryText
                    }}
                  />
                </div>
              </div>
            )}

            {/* Target Date (for time-based goals) */}
            {(formData.goalType === 'time_based_goal' || formData.goalType === 'time_and_price_goal') && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '8px' }}>
                  Target Date <span style={{ color: colors.semantic.error }}>*</span>
                </label>
                <input
                  type="date"
                  value={formData.target_date || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, target_date: e.target.value }))}
                  min={formData.start_date}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.utility.primaryText}20`,
                    fontSize: '14px',
                    backgroundColor: colors.utility.secondaryBackground,
                    color: colors.utility.primaryText
                  }}
                />
              </div>
            )}

            {/* REMOVED: Monthly SIP Amount - Phase 2: This belongs to investment plans */}

            {/* Priority Level */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '12px' }}>
                Priority Level
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {[
                  { value: 'critical' as const, icon: '🔴', label: 'Critical', color: '#DC2626' },
                  { value: 'high' as const, icon: '🟠', label: 'High', color: '#F97316' },
                  { value: 'medium' as const, icon: '🟡', label: 'Medium', color: '#F59E0B' },
                  { value: 'low' as const, icon: '🟢', label: 'Low', color: '#10B981' }
                ].map((priority) => (
                  <div
                    key={priority.value}
                    onClick={() => setFormData(prev => ({ ...prev, priority: priority.value }))}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      border: `2px solid ${formData.priority === priority.value ? priority.color : colors.utility.primaryText + '10'}`,
                      backgroundColor: formData.priority === priority.value ? priority.color + '15' : colors.utility.secondaryBackground,
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>{priority.icon}</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText }}>{priority.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Withdrawal Capture (Conditional) */}
        {currentStep === 4 && formData.has_withdrawals && (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: colors.utility.primaryText, margin: '0 0 8px 0' }}>
                💸 Withdrawal Details
              </h3>
              <p style={{ fontSize: '14px', color: colors.utility.secondaryText, margin: 0 }}>
                Add intermediate withdrawal amounts and dates
              </p>
            </div>

            {formData.withdrawals.map((withdrawal, index) => (
              <div
                key={withdrawal.id}
                style={{
                  marginBottom: '16px',
                  padding: '16px',
                  backgroundColor: colors.utility.secondaryBackground,
                  borderRadius: '8px',
                  border: `1px solid ${colors.utility.primaryText}10`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText, margin: 0 }}>
                    Withdrawal #{index + 1}
                  </h4>
                  <button
                    onClick={() => removeWithdrawal(withdrawal.id)}
                    style={{
                      padding: '6px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: colors.semantic.error + '20',
                      color: colors.semantic.error,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '6px' }}>
                      Amount
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: colors.utility.secondaryText,
                        fontSize: '12px'
                      }}>₹</span>
                      <input
                        type="number"
                        value={withdrawal.amount || ''}
                        onChange={(e) => updateWithdrawal(withdrawal.id, 'amount', parseFloat(e.target.value) || 0)}
                        placeholder="500000"
                        style={{
                          width: '100%',
                          padding: '10px 12px 10px 28px',
                          borderRadius: '6px',
                          border: `1px solid ${colors.utility.primaryText}20`,
                          fontSize: '13px',
                          backgroundColor: colors.utility.primaryBackground,
                          color: colors.utility.primaryText
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '6px' }}>
                      Date
                    </label>
                    <input
                      type="date"
                      value={withdrawal.withdrawal_date}
                      onChange={(e) => updateWithdrawal(withdrawal.id, 'withdrawal_date', e.target.value)}
                      min={formData.start_date}
                      max={formData.target_date}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${colors.utility.primaryText}20`,
                        fontSize: '13px',
                        backgroundColor: colors.utility.primaryBackground,
                        color: colors.utility.primaryText
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '6px' }}>
                      Reason
                    </label>
                    <input
                      type="text"
                      value={withdrawal.reason}
                      onChange={(e) => updateWithdrawal(withdrawal.id, 'reason', e.target.value)}
                      placeholder="e.g., Education"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${colors.utility.primaryText}20`,
                        fontSize: '13px',
                        backgroundColor: colors.utility.primaryBackground,
                        color: colors.utility.primaryText
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={addWithdrawal}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: `2px dashed ${colors.brand.primary}`,
                backgroundColor: 'transparent',
                color: colors.brand.primary,
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Plus size={20} />
              Add Another Withdrawal
            </button>

            {formData.withdrawals.length > 0 && formData.target_amount && (
              <div style={{
                marginTop: '20px',
                padding: '16px',
                backgroundColor: colors.semantic.info + '10',
                borderLeft: `3px solid ${colors.semantic.info}`,
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '8px' }}>
                  Summary
                </div>
                <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
                  Total Withdrawals: ₹{formData.withdrawals.reduce((sum, w) => sum + w.amount, 0).toLocaleString()}
                  <br />
                  Target Amount: ₹{formData.target_amount.toLocaleString()}
                  <br />
                  Final Corpus: ₹{(formData.target_amount - formData.withdrawals.reduce((sum, w) => sum + w.amount, 0)).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 5: Asset Type Allocation */}
        {currentStep === 5 && (
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: colors.utility.primaryText, margin: '0 0 8px 0' }}>
              💼 Asset Type Allocation
            </h3>
            <p style={{ fontSize: '14px', color: colors.utility.secondaryText, marginBottom: '20px' }}>
              Select asset types and allocate percentage contribution. Total must equal 100%.
            </p>

            <div style={{
              backgroundColor: colors.semantic.info + '15',
              borderLeft: `3px solid ${colors.semantic.info}`,
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '13px',
              color: colors.utility.primaryText
            }}>
              <strong>💡 Tip:</strong> Each asset type has its own expected return rate. Your goal's probability will be calculated based on this mix.
            </div>

            <div style={{
              border: `1px solid ${colors.utility.primaryText}10`,
              borderRadius: '8px',
              overflow: 'hidden',
              marginBottom: '16px'
            }}>
              {assetTypes.length > 0 ? assetTypes.map((assetType) => {
                const isSelected = formData.asset_allocations.find(a => a.asset_type_id === assetType.id);
                const allocation = isSelected?.allocation_percentage || 0;

                return (
                  <div
                    key={assetType.id}
                    style={{
                      padding: '16px',
                      borderBottom: `1px solid ${colors.utility.primaryText}10`,
                      backgroundColor: colors.utility.secondaryBackground,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!isSelected}
                      onChange={() => toggleAssetType(assetType)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '4px' }}>
                        {assetType.asset_type_name}
                      </div>
                      <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
                        Expected Return: {assetType.default_assumption_rate}% p.a.
                      </div>
                    </div>
                    <input
                      type="number"
                      value={allocation || ''}
                      onChange={(e) => updateAllocation(assetType.id, parseFloat(e.target.value) || 0)}
                      disabled={!isSelected}
                      placeholder="%"
                      min="0"
                      max="100"
                      style={{
                        width: '80px',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${colors.utility.primaryText}20`,
                        textAlign: 'right',
                        fontSize: '14px',
                        fontWeight: '600',
                        backgroundColor: isSelected ? colors.utility.primaryBackground : colors.utility.primaryText + '10',
                        color: colors.utility.primaryText,
                        cursor: isSelected ? 'text' : 'not-allowed'
                      }}
                    />
                  </div>
                );
              }) : (
                <div style={{ padding: '40px', textAlign: 'center', color: colors.utility.secondaryText }}>
                  No asset types available
                </div>
              )}

              {/* Total Allocation */}
              <div style={{
                padding: '16px',
                backgroundColor: Math.abs(totalAllocation - 100) < 0.01 ? colors.semantic.success + '20' : totalAllocation > 0 ? colors.semantic.error + '20' : colors.utility.primaryBackground,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontWeight: '700',
                fontSize: '15px',
                color: Math.abs(totalAllocation - 100) < 0.01 ? colors.semantic.success : totalAllocation > 0 ? colors.semantic.error : colors.utility.primaryText
              }}>
                <span>Total Allocation</span>
                <span>{totalAllocation.toFixed(1)}%</span>
              </div>
            </div>

            {/* Weighted Return Rate Display */}
            {formData.asset_allocations.length > 0 && (
              <div style={{
                padding: '16px',
                backgroundColor: colors.brand.primary + '10',
                borderLeft: `3px solid ${colors.brand.primary}`,
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '4px' }}>
                  Expected Weighted Return Rate
                </div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: colors.brand.primary }}>
                  {weightedReturnRate.toFixed(2)}% p.a.
                </div>
                <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginTop: '4px' }}>
                  Based on your asset allocation mix
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer - Navigation Buttons */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        backgroundColor: colors.utility.secondaryBackground,
        borderTop: `1px solid ${colors.utility.primaryText}10`,
        padding: '16px 24px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={goToPreviousStep}
            disabled={currentStep === 1 || createGoalMutation.isPending}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: `1px solid ${colors.utility.primaryText}20`,
              backgroundColor: 'transparent',
              color: colors.utility.primaryText,
              fontSize: '14px',
              fontWeight: '600',
              cursor: (currentStep === 1 || createGoalMutation.isPending) ? 'not-allowed' : 'pointer',
              opacity: (currentStep === 1 || createGoalMutation.isPending) ? 0.5 : 1,
              visibility: currentStep === 1 ? 'hidden' : 'visible'
            }}
          >
            ← Previous
          </button>

          {currentStep < 5 ? (
            <button
              onClick={goToNextStep}
              disabled={createGoalMutation.isPending}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                background: `linear-gradient(135deg, ${colors.brand.primary} 0%, ${colors.brand.secondary} 100%)`,
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: createGoalMutation.isPending ? 'not-allowed' : 'pointer',
                opacity: createGoalMutation.isPending ? 0.5 : 1
              }}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={createGoalMutation.isPending}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                background: `linear-gradient(135deg, ${colors.semantic.success} 0%, ${colors.semantic.success}dd 100%)`,
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: createGoalMutation.isPending ? 'not-allowed' : 'pointer',
                opacity: createGoalMutation.isPending ? 0.5 : 1
              }}
            >
              {createGoalMutation.isPending ? 'Creating...' : 'Create Goal ✓'}
            </button>
          )}
        </div>
      </div>

      {/* Validation Dialog */}
      <ConfirmationDialog
        isOpen={validationDialog.isOpen}
        onClose={() => setValidationDialog({ isOpen: false, title: '', message: '' })}
        onConfirm={() => setValidationDialog({ isOpen: false, title: '', message: '' })}
        title={validationDialog.title}
        description={validationDialog.message}
        type="warning"
        confirmText="OK"
        cancelText=""
      />
    </div>
  );
};

export default GoalWizardPage;
