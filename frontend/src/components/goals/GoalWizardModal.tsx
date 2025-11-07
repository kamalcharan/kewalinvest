// frontend/src/components/goals/GoalWizardModal.tsx

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { CreateGoalRequest, GoalTrackingType } from '../../types/goal.types';
import { useCreateGoal } from '../../hooks/useGoals';
import { GoalService, SchemeAllocationUtilization } from '../../services/goal.service';
import { useCustomerHoldings } from '../../hooks/usePortfolioData';

interface GoalWizardModalProps {
  customerId: number;
  isOpen?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type GoalStatus = 'new' | 'existing';
type WizardStep = 1 | 2 | 3 | 4;

interface SchemeAllocation {
  scheme_code: string;
  scheme_name: string;
  allocation_percentage: number;
  current_value?: number;
  asset_class?: string;
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
  monthly_contribution: number;
  sip_date: number;
  expected_roi: number;
  expected_inflation: number;
  priority: 'high' | 'medium' | 'low';

  // Step 4
  linked_schemes: SchemeAllocation[];
}

const GoalWizardModal: React.FC<GoalWizardModalProps> = ({
  customerId,
  isOpen = true,
  onClose,
  onSuccess
}) => {
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
    monthly_contribution: 0,
    sip_date: 1,
    expected_roi: 12,
    expected_inflation: 6,
    priority: 'high',
    linked_schemes: []
  });

  const [schemeUtilization, setSchemeUtilization] = useState<SchemeAllocationUtilization[]>([]);
  const [selectedSchemes, setSelectedSchemes] = useState<Set<string>>(new Set());

  const createGoalMutation = useCreateGoal();
  const { data: holdings } = useCustomerHoldings(customerId);

  // Load scheme utilization data
  useEffect(() => {
    if (currentStep === 4) {
      GoalService.getAssetAllocationUtilization(customerId)
        .then(response => {
          if (response.success && response.data) {
            setSchemeUtilization(response.data);
          }
        })
        .catch(error => console.error('Failed to load utilization:', error));
    }
  }, [currentStep, customerId]);

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Navigation
  const goToNextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(4, prev + 1) as WizardStep);
    }
  };

  const goToPreviousStep = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1) as WizardStep);
  };

  // Validation
  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1:
        if (!formData.goalType) {
          alert('Please select a goal type');
          return false;
        }
        return true;
      case 2:
        if (!formData.goalStatus) {
          alert('Please select goal status');
          return false;
        }
        return true;
      case 3:
        if (!formData.title.trim()) {
          alert('Please enter a goal name');
          return false;
        }
        if (!formData.goal_name.trim()) {
          alert('Please enter a goal description');
          return false;
        }
        if (formData.monthly_contribution <= 0) {
          alert('Please enter a monthly SIP amount');
          return false;
        }
        if ((formData.goalType === 'price_based_goal' || formData.goalType === 'time_and_price_goal') && !formData.target_amount) {
          alert('Please enter a target amount');
          return false;
        }
        if ((formData.goalType === 'time_based_goal' || formData.goalType === 'time_and_price_goal') && !formData.target_date) {
          alert('Please enter a target date');
          return false;
        }
        if (formData.goalStatus === 'existing' && formData.current_value <= 0) {
          alert('Please enter current value for existing goal');
          return false;
        }
        return true;
      case 4:
        const total = formData.linked_schemes.reduce((sum, s) => sum + s.allocation_percentage, 0);
        if (formData.linked_schemes.length === 0) {
          alert('Please select at least one scheme');
          return false;
        }
        if (Math.abs(total - 100) > 0.01) {
          alert(`Total allocation must equal 100% (currently ${total.toFixed(1)}%)`);
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateCurrentStep() || !formData.goalType || createGoalMutation.isPending) {
      return;
    }

    try {
      const goalData: CreateGoalRequest = {
        customer_id: customerId,
        goal_type: formData.goalType,
        title: formData.title,
        goal_name: formData.goal_name,
        priority: formData.priority,
        config_data: {
          goal_type: formData.goalType,
          start_date: formData.start_date,
          ...(formData.target_date && { target_date: formData.target_date }),
          ...(formData.target_amount && { target_amount: formData.target_amount }),
          current_value: formData.current_value,
          monthly_contribution: formData.monthly_contribution,
          sip_date: formData.sip_date,
          expected_roi: formData.expected_roi,
          expected_inflation: formData.expected_inflation,
          linked_schemes: formData.linked_schemes.map(s => ({
            scheme_code: s.scheme_code,
            scheme_name: s.scheme_name,
            allocation_percentage: s.allocation_percentage
          }))
        }
      };

      await createGoalMutation.mutateAsync(goalData);
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error('Error creating goal:', error);
      alert('Failed to create goal. Please try again.');
    }
  };

  const handleClose = () => {
    if (createGoalMutation.isPending) return;
    setCurrentStep(1);
    setFormData({
      goalType: null,
      goalStatus: null,
      title: '',
      goal_name: '',
      start_date: getTodayDate(),
      current_value: 0,
      monthly_contribution: 0,
      sip_date: 1,
      expected_roi: 12,
      expected_inflation: 6,
      priority: 'high',
      linked_schemes: []
    });
    setSelectedSchemes(new Set());
    onClose();
  };

  // Handle scheme selection
  const handleSchemeToggle = (schemeCode: string) => {
    const newSelected = new Set(selectedSchemes);
    if (newSelected.has(schemeCode)) {
      newSelected.delete(schemeCode);
      // Remove from linked schemes
      setFormData(prev => ({
        ...prev,
        linked_schemes: prev.linked_schemes.filter(s => s.scheme_code !== schemeCode)
      }));
    } else {
      newSelected.add(schemeCode);
      // Add to linked schemes with 0% allocation
      const utilization = schemeUtilization.find(u => u.scheme_code === schemeCode);
      const holding = holdings?.find(h => h.scheme_code === schemeCode);
      setFormData(prev => ({
        ...prev,
        linked_schemes: [...prev.linked_schemes, {
          scheme_code: schemeCode,
          scheme_name: utilization?.scheme_name || holding?.scheme_name || schemeCode,
          allocation_percentage: 0,
          current_value: holding?.current_value,
          asset_class: utilization?.asset_class
        }]
      }));
    }
    setSelectedSchemes(newSelected);
  };

  // Handle allocation change
  const handleAllocationChange = (schemeCode: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      linked_schemes: prev.linked_schemes.map(s =>
        s.scheme_code === schemeCode
          ? { ...s, allocation_percentage: value }
          : s
      )
    }));
  };

  if (!isOpen) return null;

  // Icons
  const XIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  // Step titles
  const stepTitles = [
    { number: 1, label: 'Goal Type' },
    { number: 2, label: 'Goal Status' },
    { number: 3, label: 'Configuration' },
    { number: 4, label: 'Allocation' }
  ];

  // Calculate total allocation
  const totalAllocation = formData.linked_schemes.reduce((sum, s) => sum + s.allocation_percentage, 0);

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 9998
        }}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: colors.utility.primaryBackground,
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          zIndex: 9999,
          width: '90%',
          maxWidth: '1000px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: `1px solid ${colors.utility.primaryText}10`,
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: colors.utility.primaryText,
                margin: 0
              }}>
                Create Financial Goal
              </h2>
              <p style={{
                fontSize: '13px',
                color: colors.utility.secondaryText,
                margin: '4px 0 0 0'
              }}>
                Step {currentStep} of 4: {stepTitles[currentStep - 1].label}
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={createGoalMutation.isPending}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                color: colors.utility.secondaryText,
                cursor: createGoalMutation.isPending ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <XIcon />
            </button>
          </div>

          {/* Progress Indicator */}
          <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
            {stepTitles.map((step, index) => {
              const isCompleted = currentStep > step.number;
              const isActive = currentStep === step.number;

              return (
                <div
                  key={step.number}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    position: 'relative'
                  }}
                >
                  {/* Connector Line */}
                  {index < stepTitles.length - 1 && (
                    <div style={{
                      position: 'absolute',
                      top: '16px',
                      left: 'calc(50% + 16px)',
                      right: 'calc(-50% + 16px)',
                      height: '2px',
                      backgroundColor: isCompleted
                        ? colors.semantic.success
                        : colors.utility.primaryText + '20',
                      zIndex: 0
                    }} />
                  )}

                  {/* Step Circle */}
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: isCompleted
                      ? colors.semantic.success
                      : isActive
                      ? colors.brand.primary
                      : colors.utility.primaryText + '15',
                    color: (isCompleted || isActive) ? 'white' : colors.utility.secondaryText,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '14px',
                    zIndex: 1,
                    position: 'relative',
                    transition: 'all 0.3s ease'
                  }}>
                    {isCompleted ? <CheckIcon /> : step.number}
                  </div>

                  {/* Step Label */}
                  <div style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color: isActive
                      ? colors.brand.primary
                      : isCompleted
                      ? colors.semantic.success
                      : colors.utility.secondaryText,
                    textAlign: 'center',
                    transition: 'all 0.3s ease'
                  }}>
                    {step.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content - will continue in next part */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* STEP 1: Goal Type */}
          {currentStep === 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {[
                {
                  type: 'time_based_goal' as GoalTrackingType,
                  icon: '📅',
                  title: 'Time-Based Goal',
                  description: 'Set a fixed deadline with flexible target amount',
                  color: '#3B82F6'
                },
                {
                  type: 'price_based_goal' as GoalTrackingType,
                  icon: '💰',
                  title: 'Price-Based Goal',
                  description: 'Target a specific amount with flexible timeline',
                  color: '#10B981'
                },
                {
                  type: 'time_and_price_goal' as GoalTrackingType,
                  icon: '🎯',
                  title: 'Time & Price Goal',
                  description: 'Set both fixed date and amount with monitoring',
                  color: '#F59E0B'
                }
              ].map((card) => (
                <div
                  key={card.type}
                  onClick={() => setFormData(prev => ({ ...prev, goalType: card.type }))}
                  style={{
                    padding: '20px',
                    backgroundColor: formData.goalType === card.type
                      ? card.color + '15'
                      : colors.utility.secondaryBackground,
                    borderRadius: '12px',
                    border: `2px solid ${formData.goalType === card.type ? card.color : colors.utility.primaryText + '10'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (formData.goalType !== card.type) {
                      e.currentTarget.style.borderColor = card.color;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (formData.goalType !== card.type) {
                      e.currentTarget.style.borderColor = colors.utility.primaryText + '10';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <div style={{
                    fontSize: '36px',
                    marginBottom: '12px'
                  }}>
                    {card.icon}
                  </div>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: colors.utility.primaryText,
                    margin: '0 0 6px 0'
                  }}>
                    {card.title}
                  </h3>
                  <p style={{
                    fontSize: '12px',
                    color: colors.utility.secondaryText,
                    margin: 0,
                    lineHeight: '1.4'
                  }}>
                    {card.description}
                  </p>

                  {/* Check mark for selected */}
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
              <div style={{
                marginBottom: '24px',
                textAlign: 'center'
              }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: colors.utility.primaryText,
                  margin: '0 0 8px 0'
                }}>
                  📋 Goal Status
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: colors.utility.secondaryText,
                  margin: 0
                }}>
                  Is this a brand new goal or an existing goal you want to onboard?
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', maxWidth: '700px', margin: '0 auto' }}>
                {[
                  {
                    status: 'new' as GoalStatus,
                    icon: '✨',
                    title: 'New Goal',
                    description: 'Starting fresh from today. No historical data to import.',
                    color: '#10B981'
                  },
                  {
                    status: 'existing' as GoalStatus,
                    icon: '📥',
                    title: 'Existing Goal',
                    description: 'Already in progress. Import current value and historical data.',
                    color: '#F59E0B'
                  }
                ].map((card) => (
                  <div
                    key={card.status}
                    onClick={() => setFormData(prev => ({ ...prev, goalStatus: card.status }))}
                    style={{
                      padding: '24px',
                      backgroundColor: formData.goalStatus === card.status
                        ? card.color + '15'
                        : colors.utility.secondaryBackground,
                      borderRadius: '12px',
                      border: `2px solid ${formData.goalStatus === card.status ? card.color : colors.utility.primaryText + '10'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      minHeight: '150px'
                    }}
                    onMouseEnter={(e) => {
                      if (formData.goalStatus !== card.status) {
                        e.currentTarget.style.borderColor = card.color;
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (formData.goalStatus !== card.status) {
                        e.currentTarget.style.borderColor = colors.utility.primaryText + '10';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    <div style={{
                      fontSize: '48px',
                      marginBottom: '16px'
                    }}>
                      {card.icon}
                    </div>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: colors.utility.primaryText,
                      margin: '0 0 8px 0'
                    }}>
                      {card.title}
                    </h3>
                    <p style={{
                      fontSize: '13px',
                      color: colors.utility.secondaryText,
                      margin: 0,
                      lineHeight: '1.5'
                    }}>
                      {card.description}
                    </p>

                    {/* Check mark for selected */}
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
              <h3 style={{
                fontSize: '18px',
                fontWeight: '700',
                color: colors.utility.primaryText,
                margin: '0 0 20px 0'
              }}>
                📝 Goal Configuration
              </h3>

              {/* Goal Name */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: colors.utility.primaryText,
                  marginBottom: '8px'
                }}>
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
                <div style={{
                  fontSize: '12px',
                  color: colors.utility.secondaryText,
                  marginTop: '6px'
                }}>
                  Choose a descriptive name that clearly identifies this goal
                </div>
              </div>

              {/* Goal Description */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: colors.utility.primaryText,
                  marginBottom: '8px'
                }}>
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

              {/* Dynamic fields based on goal status */}
              {formData.goalStatus === 'existing' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: colors.utility.primaryText,
                      marginBottom: '8px'
                    }}>
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
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: colors.utility.primaryText,
                      marginBottom: '8px'
                    }}>
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
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: colors.utility.primaryText,
                    marginBottom: '8px'
                  }}>
                    Goal Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    disabled
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.utility.primaryText}20`,
                      fontSize: '14px',
                      backgroundColor: colors.utility.primaryText + '10',
                      color: colors.utility.secondaryText
                    }}
                  />
                  <div style={{
                    fontSize: '12px',
                    color: colors.utility.secondaryText,
                    marginTop: '6px'
                  }}>
                    Goal will start from today
                  </div>
                </div>
              )}

              {/* Target Amount (for price-based goals) */}
              {(formData.goalType === 'price_based_goal' || formData.goalType === 'time_and_price_goal') && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: colors.utility.primaryText,
                    marginBottom: '8px'
                  }}>
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
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: colors.utility.primaryText,
                    marginBottom: '8px'
                  }}>
                    Target Date <span style={{ color: colors.semantic.error }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.target_date || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_date: e.target.value }))}
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
                </div>
              )}

              {/* Monthly SIP and SIP Date */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: colors.utility.primaryText,
                    marginBottom: '8px'
                  }}>
                    Monthly SIP Amount <span style={{ color: colors.semantic.error }}>*</span>
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
                      value={formData.monthly_contribution || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, monthly_contribution: parseFloat(e.target.value) || 0 }))}
                      placeholder="15000"
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
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: colors.utility.primaryText,
                    marginBottom: '8px'
                  }}>
                    SIP Date
                  </label>
                  <select
                    value={formData.sip_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, sip_date: parseInt(e.target.value) }))}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.utility.primaryText}20`,
                      fontSize: '14px',
                      backgroundColor: colors.utility.secondaryBackground,
                      color: colors.utility.primaryText
                    }}
                  >
                    <option value={1}>1st of every month</option>
                    <option value={5}>5th of every month</option>
                    <option value={10}>10th of every month</option>
                    <option value={15}>15th of every month</option>
                    <option value={20}>20th of every month</option>
                    <option value={25}>25th of every month</option>
                  </select>
                </div>
              </div>

              {/* Priority Level */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: colors.utility.primaryText,
                  marginBottom: '12px'
                }}>
                  Priority Level
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {[
                    { value: 'high' as const, icon: '🔴', label: 'High', desc: 'Critical' },
                    { value: 'medium' as const, icon: '🟡', label: 'Medium', desc: 'Important' },
                    { value: 'low' as const, icon: '🟢', label: 'Low', desc: 'Flexible' }
                  ].map((priority) => (
                    <div
                      key={priority.value}
                      onClick={() => setFormData(prev => ({ ...prev, priority: priority.value }))}
                      style={{
                        padding: '16px',
                        borderRadius: '8px',
                        border: `2px solid ${formData.priority === priority.value ? colors.brand.primary : colors.utility.primaryText + '10'}`,
                        backgroundColor: formData.priority === priority.value
                          ? colors.brand.primary + '15'
                          : colors.utility.secondaryBackground,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>{priority.icon}</div>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: colors.utility.primaryText,
                        marginBottom: '2px'
                      }}>
                        {priority.label}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: colors.utility.secondaryText
                      }}>
                        {priority.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assumptions */}
              <div style={{
                backgroundColor: colors.utility.secondaryBackground,
                padding: '16px',
                borderRadius: '8px',
                border: `1px solid ${colors.utility.primaryText}10`
              }}>
                <h4 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: colors.utility.primaryText,
                  margin: '0 0 12px 0'
                }}>
                  📊 Assumptions
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: colors.utility.primaryText,
                      marginBottom: '6px'
                    }}>
                      Expected ROI (Annual %)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        value={formData.expected_roi}
                        onChange={(e) => setFormData(prev => ({ ...prev, expected_roi: parseFloat(e.target.value) || 12 }))}
                        step="0.5"
                        min="0"
                        max="30"
                        style={{
                          width: '100%',
                          padding: '10px 32px 10px 14px',
                          borderRadius: '6px',
                          border: `1px solid ${colors.utility.primaryText}20`,
                          fontSize: '13px',
                          backgroundColor: colors.utility.primaryBackground,
                          color: colors.utility.primaryText
                        }}
                      />
                      <span style={{
                        position: 'absolute',
                        right: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: colors.utility.secondaryText,
                        fontSize: '13px'
                      }}>%</span>
                    </div>
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: colors.utility.primaryText,
                      marginBottom: '6px'
                    }}>
                      Expected Inflation (Annual %)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        value={formData.expected_inflation}
                        onChange={(e) => setFormData(prev => ({ ...prev, expected_inflation: parseFloat(e.target.value) || 6 }))}
                        step="0.5"
                        min="0"
                        max="20"
                        style={{
                          width: '100%',
                          padding: '10px 32px 10px 14px',
                          borderRadius: '6px',
                          border: `1px solid ${colors.utility.primaryText}20`,
                          fontSize: '13px',
                          backgroundColor: colors.utility.primaryBackground,
                          color: colors.utility.primaryText
                        }}
                      />
                      <span style={{
                        position: 'absolute',
                        right: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: colors.utility.secondaryText,
                        fontSize: '13px'
                      }}>%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Scheme Allocation */}
          {currentStep === 4 && (
            <div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '700',
                color: colors.utility.primaryText,
                margin: '0 0 8px 0'
              }}>
                💼 Scheme Allocation
              </h3>
              <p style={{
                fontSize: '14px',
                color: colors.utility.secondaryText,
                marginBottom: '20px'
              }}>
                Select schemes and allocate percentage contribution. Total must equal 100%.
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
                <strong>💡 Tip:</strong> Schemes with lower utilization have more capacity for new goals. Fully utilized schemes (100%) cannot be selected.
              </div>

              {/* Scheme List */}
              <div style={{
                border: `1px solid ${colors.utility.primaryText}10`,
                borderRadius: '8px',
                overflow: 'hidden',
                marginBottom: '16px'
              }}>
                {schemeUtilization.length > 0 ? schemeUtilization.map((scheme) => {
                  const isFullyUtilized = scheme.utilization_percentage >= 100;
                  const isSelected = selectedSchemes.has(scheme.scheme_code);
                  const allocation = formData.linked_schemes.find(s => s.scheme_code === scheme.scheme_code);

                  return (
                    <div
                      key={scheme.scheme_code}
                      style={{
                        padding: '16px',
                        borderBottom: `1px solid ${colors.utility.primaryText}10`,
                        backgroundColor: isFullyUtilized
                          ? colors.utility.primaryText + '05'
                          : colors.utility.secondaryBackground,
                        opacity: isFullyUtilized ? 0.5 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!isFullyUtilized) {
                          e.currentTarget.style.backgroundColor = colors.utility.primaryText + '05';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = colors.utility.secondaryBackground;
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isFullyUtilized}
                        onChange={() => handleSchemeToggle(scheme.scheme_code)}
                        style={{
                          width: '18px',
                          height: '18px',
                          cursor: isFullyUtilized ? 'not-allowed' : 'pointer'
                        }}
                      />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: colors.utility.primaryText,
                          marginBottom: '4px'
                        }}>
                          {scheme.scheme_name}
                          {isFullyUtilized && (
                            <span style={{
                              marginLeft: '8px',
                              fontSize: '11px',
                              color: colors.semantic.error,
                              fontWeight: '700'
                            }}>
                              🚫 Fully Utilized
                            </span>
                          )}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: colors.utility.secondaryText
                        }}>
                          {scheme.asset_class} • ₹{(scheme.current_value / 100000).toFixed(2)}L current value
                        </div>
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        minWidth: '180px'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            height: '6px',
                            backgroundColor: colors.utility.primaryText + '15',
                            borderRadius: '3px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${Math.min(100, scheme.utilization_percentage)}%`,
                              backgroundColor: scheme.utilization_percentage >= 100
                                ? colors.semantic.error
                                : colors.brand.primary,
                              transition: 'width 0.3s'
                            }} />
                          </div>
                        </div>
                        <div style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          minWidth: '45px',
                          textAlign: 'right',
                          color: scheme.utilization_percentage >= 100
                            ? colors.semantic.error
                            : colors.utility.primaryText
                        }}>
                          {scheme.utilization_percentage.toFixed(0)}%
                        </div>
                      </div>

                      <input
                        type="number"
                        value={allocation?.allocation_percentage || ''}
                        onChange={(e) => handleAllocationChange(scheme.scheme_code, parseFloat(e.target.value) || 0)}
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
                          backgroundColor: isSelected
                            ? colors.utility.secondaryBackground
                            : colors.utility.primaryText + '10',
                          color: colors.utility.primaryText,
                          cursor: isSelected ? 'text' : 'not-allowed'
                        }}
                      />
                    </div>
                  );
                }) : (
                  <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: colors.utility.secondaryText
                  }}>
                    No schemes available
                  </div>
                )}

                {/* Total Allocation */}
                <div style={{
                  padding: '16px',
                  backgroundColor: Math.abs(totalAllocation - 100) < 0.01
                    ? colors.semantic.success + '20'
                    : totalAllocation > 0
                    ? colors.semantic.error + '20'
                    : colors.utility.primaryBackground,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontWeight: '700',
                  fontSize: '15px',
                  color: Math.abs(totalAllocation - 100) < 0.01
                    ? colors.semantic.success
                    : totalAllocation > 0
                    ? colors.semantic.error
                    : colors.utility.primaryText
                }}>
                  <span>Total Allocation</span>
                  <span>{totalAllocation.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Navigation Buttons */}
        <div style={{
          padding: '16px 24px',
          borderTop: `1px solid ${colors.utility.primaryText}10`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
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

          {currentStep < 4 ? (
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
    </>
  );
};

export default GoalWizardModal;
