// frontend/src/pages/goals/GoalSetupPage.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Target, Calendar, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { CreateGoalRequest, GoalTrackingType, LinkedScheme, DEFAULT_RETURN_RATE, DEFAULT_INFLATION_RATE } from '../../types/goal.types';
import { useCreateGoal, useGoalProjection, useGoal, useUpdateGoal } from '../../hooks/useGoals';
import { useCustomerSchemes } from '../../hooks/useJTBD';
import GoalSchemeSelector from '../../components/goals/forms/GoalSchemeSelector';
import { generateGoalTitle } from '../../utils/goalUtils';

type GoalMode = 'create' | 'edit' | 'rebalance';

interface GoalSetupPageProps {
  mode?: GoalMode;
  goalId?: number;
  customerId?: number;
}

const GoalSetupPage: React.FC<GoalSetupPageProps> = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { customerId: customerIdParam, goalId: goalIdParam } = useParams<{ customerId: string; goalId?: string }>();

  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Determine mode from URL path
  const customerId = customerIdParam ? parseInt(customerIdParam) : undefined;
  const goalId = goalIdParam ? parseInt(goalIdParam) : undefined;
  const mode: GoalMode = location.pathname.includes('/edit') ? 'edit' : location.pathname.includes('/rebalance') ? 'rebalance' : 'create';

  // Goal type selection
  const [selectedType, setSelectedType] = useState<GoalTrackingType | null>(null);

  // Fetch customer schemes
  const { data: schemes, isLoading: schemesLoading } = useCustomerSchemes(customerId!);

  // Fetch existing goal data for edit/rebalance modes
  const { data: existingGoal, isLoading: goalLoading } = useGoal(goalId || 0, { enabled: !!goalId && (mode === 'edit' || mode === 'rebalance') });

  // Goal projection calculator
  const {
    calculateFutureValue,
    calculateRequiredSIP,
    getMonthsDifference,
    calculateProgress,
    calculateGap
  } = useGoalProjection();

  const createGoalMutation = useCreateGoal();
  const updateGoalMutation = useUpdateGoal();

  // Form state - restored from original forms
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

  // Populate form with existing goal data for edit/rebalance modes
  useEffect(() => {
    if (existingGoal && (mode === 'edit' || mode === 'rebalance')) {
      const config = existingGoal.config_data;

      // Set basic fields
      setTitle(existingGoal.title);
      setDescription(existingGoal.description || '');
      setPriority(existingGoal.priority);
      setNotes(existingGoal.notes || '');
      setSelectedType(config.goal_type);
      setGoalName(config.goal_name);
      setExpectedReturnRate(config.expected_return_rate || DEFAULT_RETURN_RATE);
      setInflationRate(config.inflation_rate || DEFAULT_INFLATION_RATE);
      setMonthlyContribution(config.monthly_contribution || 0);
      setLinkedSchemes(config.linked_schemes || []);

      // Set type-specific fields
      if ('target_corpus' in config) {
        setTargetAmount(config.target_corpus || 0);
      }
      if ('target_date' in config && config.target_date) {
        setTargetDate(config.target_date);
      }
    }
  }, [existingGoal, mode]);

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
    if (!selectedType) return null;

    // Time-based goal
    if (selectedType === 'time_based_goal' && targetDate) {
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

      return {
        months,
        projectedCorpus,
        type: 'time_based'
      };
    }

    // Price-based goal
    if (selectedType === 'price_based_goal' && targetAmount > 0) {
      // For price-based, calculate how many months needed
      // This is a simplified calculation
      const monthlyReturn = expectedReturnRate / 12 / 100;
      let months = 0;
      let value = currentValue;

      while (value < targetAmount && months < 600) { // Max 50 years
        value = value * (1 + monthlyReturn) + monthlyContribution;
        months++;
      }

      const projectedDate = new Date();
      projectedDate.setMonth(projectedDate.getMonth() + months);

      return {
        months,
        projectedDate,
        type: 'price_based'
      };
    }

    // Time & Price goal
    if (selectedType === 'time_and_price_goal' && targetDate && targetAmount > 0) {
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
        successProbability,
        type: 'time_and_price'
      };
    }

    return null;
  }, [selectedType, currentValue, monthlyContribution, targetAmount, targetDate, expectedReturnRate, calculateFutureValue, calculateRequiredSIP, getMonthsDifference, calculateProgress, calculateGap]);

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

  // Auto-generate title
  useEffect(() => {
    if (!title && goalName && selectedType) {
      if (selectedType === 'time_based_goal' && targetDate) {
        setTitle(generateGoalTitle(selectedType, undefined, targetDate, goalName));
      } else if (selectedType === 'price_based_goal' && targetAmount > 0) {
        setTitle(generateGoalTitle(selectedType, targetAmount, undefined, goalName));
      } else if (selectedType === 'time_and_price_goal' && targetAmount > 0 && targetDate) {
        setTitle(generateGoalTitle(selectedType, targetAmount, targetDate, goalName));
      }
    }
  }, [goalName, targetAmount, targetDate, selectedType, title]);

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedType) {
      newErrors.type = 'Please select a goal type';
    }

    if (!goalName.trim()) {
      newErrors.goalName = 'Goal name is required';
    }

    if (selectedType === 'price_based_goal' || selectedType === 'time_and_price_goal') {
      if (targetAmount <= 0) {
        newErrors.targetAmount = 'Target amount must be greater than 0';
      }
    }

    if (selectedType === 'time_based_goal' || selectedType === 'time_and_price_goal') {
      if (!targetDate) {
        newErrors.targetDate = 'Target date is required';
      } else {
        const target = new Date(targetDate);
        const today = new Date();
        if (target <= today) {
          newErrors.targetDate = 'Target date must be in the future';
        }
      }
    }

    if (linkedSchemes.length === 0) {
      newErrors.linkedSchemes = 'Select at least one scheme';
    } else {
      const totalAllocation = linkedSchemes.reduce((sum, s) => sum + s.allocation_percentage, 0);
      if (Math.abs(totalAllocation - 100) > 0.01) {
        newErrors.linkedSchemes = `Allocation must equal 100% (currently ${totalAllocation.toFixed(1)}%)`;
      }
    }

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!validate()) return;
    if (!customerId || !selectedType) return;

    const configData: any = {
      goal_name: goalName.trim(),
      goal_type: selectedType,
      expected_return_rate: expectedReturnRate,
      inflation_rate: inflationRate,
      monthly_contribution: monthlyContribution,
      linked_schemes: linkedSchemes,
      current_value: currentValue,
      notes: notes.trim() || undefined
    };

    if (selectedType === 'time_based_goal' || selectedType === 'time_and_price_goal') {
      configData.target_date = targetDate;
    }

    if (selectedType === 'price_based_goal' || selectedType === 'time_and_price_goal') {
      configData.target_amount = targetAmount;
    }

    try {
      if (mode === 'create') {
        // Create new goal
        const goalData: CreateGoalRequest = {
          customer_id: customerId,
          goal_type: selectedType,
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          config_data: configData
        };
        await createGoalMutation.mutateAsync(goalData);
      } else if (mode === 'edit' && goalId) {
        // Update existing goal
        const updateData = {
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          config_data: configData
        };
        await updateGoalMutation.mutateAsync({ goalId, data: updateData });
      } else if (mode === 'rebalance' && goalId) {
        // Rebalance: only update linked_schemes allocation
        const updateData = {
          config_data: {
            ...existingGoal?.config_data,
            linked_schemes: linkedSchemes
          }
        };
        await updateGoalMutation.mutateAsync({ goalId, data: updateData });
      }

      navigate(`/customers/${customerId}?tab=goals`);
    } catch (error) {
      console.error(`Error ${mode === 'create' ? 'creating' : 'updating'} goal:`, error);
    }
  };

  // Goal type cards
  const goalTypeCards = [
    {
      type: 'time_based_goal' as GoalTrackingType,
      icon: Calendar,
      title: 'Time-Based Goal',
      description: 'Set a fixed deadline with flexible target amount',
      color: '#3B82F6'
    },
    {
      type: 'price_based_goal' as GoalTrackingType,
      icon: DollarSign,
      title: 'Price-Based Goal',
      description: 'Target a specific amount with flexible timeline',
      color: '#10B981'
    },
    {
      type: 'time_and_price_goal' as GoalTrackingType,
      icon: Target,
      title: 'Time & Price Goal',
      description: 'Set both fixed date and amount with monitoring',
      color: '#F59E0B'
    }
  ];

  const formatCurrency = (value: number): string => {
    return `₹${Math.abs(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const formatPercentage = (value: number, decimals: number = 1): string => {
    return `${value.toFixed(decimals)}%`;
  };

  // Check if any mutation is pending
  const isSubmitting = createGoalMutation.isPending || updateGoalMutation.isPending;

  // For rebalance mode, only allow editing scheme allocations
  const isRebalanceMode = mode === 'rebalance';
  const isReadOnly = isRebalanceMode;

  // Loading state for edit/rebalance modes
  if ((mode === 'edit' || mode === 'rebalance') && goalLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: colors.utility.primaryBackground,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: `3px solid ${colors.brand.primary}20`,
            borderTopColor: colors.brand.primary,
            borderRadius: '50%',
            margin: '0 auto 16px',
            animation: 'spin 0.8s linear infinite'
          }} />
          <div style={{ fontSize: '14px', color: colors.utility.secondaryText }}>
            Loading goal...
          </div>
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.utility.primaryBackground,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderBottom: `1px solid ${colors.utility.primaryText}10`,
        padding: '16px 32px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate(`/customers/${customerId}?tab=goals`)}
            disabled={isSubmitting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: 'transparent',
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '6px',
              color: colors.utility.primaryText,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            <ArrowLeft size={18} />
            Back
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: colors.utility.primaryText,
              margin: 0
            }}>
              {mode === 'edit' ? 'Edit Goal' : mode === 'rebalance' ? 'Rebalance Goal' : 'Create Financial Goal'}
            </h1>
            <p style={{
              fontSize: '13px',
              color: colors.utility.secondaryText,
              margin: '4px 0 0 0'
            }}>
              {!selectedType ? 'Choose goal type to get started' : `Configuring: ${goalTypeCards.find(c => c.type === selectedType)?.title}`}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {!selectedType ? (
          /* Goal Type Selection */
          <div style={{ padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ maxWidth: '1100px', width: '100%' }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                marginBottom: '24px',
                textAlign: 'center'
              }}>
                Select Goal Type
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '24px'
              }}>
                {goalTypeCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.type}
                      onClick={() => setSelectedType(card.type)}
                      style={{
                        padding: '24px',
                        backgroundColor: colors.utility.secondaryBackground,
                        borderRadius: '12px',
                        border: `2px solid ${colors.utility.primaryText}10`,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = card.color;
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = `0 8px 24px ${card.color}20`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = colors.utility.primaryText + '10';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '12px',
                        backgroundColor: card.color + '20',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '16px'
                      }}>
                        <Icon size={28} color={card.color} />
                      </div>
                      <h3 style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: colors.utility.primaryText,
                        margin: '0 0 8px 0'
                      }}>
                        {card.title}
                      </h3>
                      <p style={{
                        fontSize: '13px',
                        color: colors.utility.secondaryText,
                        margin: 0
                      }}>
                        {card.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Goal Configuration Form */
          <div style={{ display: 'flex', height: 'calc(100vh - 90px)' }}>
            {/* LEFT PANEL: Scheme Selector */}
            <div style={{
              width: '320px',
              borderRight: `1px solid ${colors.utility.primaryText}15`,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: colors.utility.secondaryBackground,
              overflow: 'hidden'
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
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Form Content - Scrollable */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

                {/* Goal Details Section */}
                <div style={{
                  marginBottom: '16px',
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
                      disabled={isSubmitting || isReadOnly}
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

                  {/* Dynamic Fields Based on Goal Type */}
                  {(selectedType === 'price_based_goal' || selectedType === 'time_and_price_goal') && (
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '500', color: colors.utility.secondaryText, marginBottom: '6px', display: 'block' }}>
                        Target Amount (₹) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={targetAmount || ''}
                        onChange={(e) => setTargetAmount(Number(e.target.value))}
                        placeholder="5000000"
                        disabled={isSubmitting || isReadOnly}
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
                      {errors.targetAmount && (
                        <div style={{ fontSize: '11px', color: colors.semantic.error, marginTop: '4px' }}>
                          {errors.targetAmount}
                        </div>
                      )}
                    </div>
                  )}

                  {(selectedType === 'time_based_goal' || selectedType === 'time_and_price_goal') && (
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '500', color: colors.utility.secondaryText, marginBottom: '6px', display: 'block' }}>
                        Target Date *
                      </label>
                      <input
                        type="date"
                        value={targetDate}
                        onChange={(e) => setTargetDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        disabled={isSubmitting || isReadOnly}
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
                      {errors.targetDate && (
                        <div style={{ fontSize: '11px', color: colors.semantic.error, marginTop: '4px' }}>
                          {errors.targetDate}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Monthly Contribution */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '500', color: colors.utility.secondaryText, marginBottom: '6px', display: 'block' }}>
                      Monthly Contribution (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={monthlyContribution || ''}
                      onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                      placeholder="10000"
                      disabled={isSubmitting || isReadOnly}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: '14px',
                        backgroundColor: colors.utility.primaryBackground,
                        border: `1px solid ${colors.utility.primaryText}20`,
                        borderRadius: '6px',
                        color: colors.utility.primaryText
                      }}
                    />
                  </div>

                  {/* Assumptions Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '500', color: colors.utility.secondaryText, marginBottom: '6px', display: 'block' }}>
                        Expected Return (% p.a.)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        step="0.5"
                        value={expectedReturnRate}
                        onChange={(e) => setExpectedReturnRate(Number(e.target.value))}
                        disabled={isSubmitting || isReadOnly}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          fontSize: '14px',
                          backgroundColor: colors.utility.primaryBackground,
                          border: `1px solid ${colors.utility.primaryText}20`,
                          borderRadius: '6px',
                          color: colors.utility.primaryText
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '500', color: colors.utility.secondaryText, marginBottom: '6px', display: 'block' }}>
                        Inflation (% p.a.)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        value={inflationRate}
                        onChange={(e) => setInflationRate(Number(e.target.value))}
                        disabled={isSubmitting || isReadOnly}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          fontSize: '14px',
                          backgroundColor: colors.utility.primaryBackground,
                          border: `1px solid ${colors.utility.primaryText}20`,
                          borderRadius: '6px',
                          color: colors.utility.primaryText
                        }}
                      />
                    </div>
                  </div>

                  {/* Title */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '500', color: colors.utility.secondaryText, marginBottom: '6px', display: 'block' }}>
                      Title *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Auto-generated title"
                      disabled={isSubmitting || isReadOnly}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: '14px',
                        backgroundColor: colors.utility.primaryBackground,
                        border: `2px solid ${errors.title ? colors.semantic.error : colors.utility.primaryText + '15'}`,
                        borderRadius: '6px',
                        color: colors.utility.primaryText
                      }}
                    />
                    {errors.title && (
                      <div style={{ fontSize: '11px', color: colors.semantic.error, marginTop: '4px' }}>
                        {errors.title}
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '500', color: colors.utility.secondaryText, marginBottom: '6px', display: 'block' }}>
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Additional details about the goal..."
                      rows={2}
                      disabled={isSubmitting || isReadOnly}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: '14px',
                        backgroundColor: colors.utility.primaryBackground,
                        border: `1px solid ${colors.utility.primaryText}20`,
                        borderRadius: '6px',
                        color: colors.utility.primaryText,
                        resize: 'none'
                      }}
                    />
                  </div>

                  {/* Priority Selection */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '500', color: colors.utility.secondaryText, marginBottom: '8px', display: 'block' }}>
                      Priority
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                      {priorityOptions.map((option) => (
                        <div
                          key={option.value}
                          onClick={() => setPriority(option.value)}
                          style={{
                            padding: '8px',
                            borderRadius: '6px',
                            border: `2px solid ${priority === option.value ? option.color : colors.utility.primaryText + '15'}`,
                            backgroundColor: priority === option.value ? option.color + '15' : 'transparent',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ fontSize: '16px', marginBottom: '4px' }}>{option.icon}</div>
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

                {/* Projections Section */}
                {projections && (
                  <div style={{
                    padding: '16px',
                    backgroundColor: colors.semantic.info + '10',
                    borderRadius: '8px',
                    border: `1px solid ${colors.semantic.info}40`,
                    marginBottom: '16px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '12px'
                    }}>
                      <TrendingUp size={16} color={colors.semantic.info} />
                      <div style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: colors.utility.primaryText,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Projections
                      </div>
                    </div>

                    {projections.type === 'time_based' && (
                      <div>
                        <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginBottom: '4px' }}>
                          Projected Corpus by {new Date(targetDate).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: colors.semantic.success }}>
                          {formatCurrency((projections as any).projectedCorpus)}
                        </div>
                      </div>
                    )}

                    {projections.type === 'price_based' && (
                      <div>
                        <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginBottom: '4px' }}>
                          Expected Achievement Date
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: colors.semantic.success }}>
                          {(projections as any).projectedDate?.toLocaleDateString()} ({(projections as any).months} months)
                        </div>
                      </div>
                    )}

                    {projections.type === 'time_and_price' && (
                      <div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' }}>
                          <div>
                            <div style={{ fontSize: '11px', color: colors.utility.secondaryText }}>
                              Projected Corpus
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: colors.utility.primaryText }}>
                              {formatCurrency((projections as any).projectedCorpus)}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', color: colors.utility.secondaryText }}>
                              Success Probability
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: (projections as any).successProbability >= 75 ? colors.semantic.success : colors.semantic.warning }}>
                              {formatPercentage((projections as any).successProbability, 0)}
                            </div>
                          </div>
                        </div>
                        {(projections as any).sipGap > 0 && (
                          <div style={{
                            padding: '8px 12px',
                            backgroundColor: colors.semantic.warning + '20',
                            borderRadius: '6px',
                            fontSize: '12px',
                            color: colors.utility.primaryText
                          }}>
                            <strong>Required SIP:</strong> {formatCurrency((projections as any).requiredSIP)}/month
                            (Gap: {formatCurrency((projections as any).sipGap)})
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '500', color: colors.utility.secondaryText, marginBottom: '6px', display: 'block' }}>
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes..."
                    rows={2}
                    disabled={isSubmitting || isReadOnly}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '13px',
                      backgroundColor: colors.utility.secondaryBackground,
                      border: `1px solid ${colors.utility.primaryText}20`,
                      borderRadius: '6px',
                      color: colors.utility.primaryText,
                      resize: 'none'
                    }}
                  />
                </div>

                {/* Validation Errors */}
                {Object.keys(errors).length > 0 && errors.type && (
                  <div style={{
                    padding: '12px',
                    backgroundColor: colors.semantic.error + '15',
                    borderLeft: `3px solid ${colors.semantic.error}`,
                    borderRadius: '6px',
                    marginBottom: '16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertCircle size={16} color={colors.semantic.error} />
                      <span style={{ fontSize: '13px', color: colors.semantic.error, fontWeight: '500' }}>
                        {errors.type}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer - Action Buttons */}
              <div style={{
                borderTop: `1px solid ${colors.utility.primaryText}10`,
                padding: '16px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: colors.utility.secondaryBackground
              }}>
                <div style={{ fontSize: '13px', color: colors.utility.secondaryText }}>
                  Current Portfolio: <strong>{formatCurrency(currentValue)}</strong>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setSelectedType(null)}
                    disabled={createGoalMutation.isPending}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: 'transparent',
                      border: `1px solid ${colors.utility.primaryText}20`,
                      borderRadius: '6px',
                      color: colors.utility.primaryText,
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    Change Type
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={createGoalMutation.isPending}
                    style={{
                      padding: '10px 32px',
                      backgroundColor: colors.brand.primary,
                      border: 'none',
                      borderRadius: '6px',
                      color: 'white',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      opacity: isSubmitting ? 0.6 : 1
                    }}
                  >
                    {isSubmitting ? (mode === 'edit' ? 'Updating...' : mode === 'rebalance' ? 'Rebalancing...' : 'Creating...') : (mode === 'edit' ? 'Update Goal' : mode === 'rebalance' ? 'Rebalance Goal' : 'Create Goal')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoalSetupPage;
