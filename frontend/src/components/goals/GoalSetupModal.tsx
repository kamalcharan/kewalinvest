// frontend/src/components/goals/GoalSetupModal.tsx

import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { CreateGoalRequest, GoalTrackingType } from '../../types/goal.types';
import { useCreateGoal } from '../../hooks/useGoals';
import TimeBasedGoalForm from './forms/TimeBasedGoalForm';
import PriceBasedGoalForm from './forms/PriceBasedGoalForm';
import TimeAndPriceGoalForm from './forms/TimeAndPriceGoalForm';

interface GoalSetupModalProps {
  customerId: number;
  isOpen?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type SetupStep = 'select_type' | 'configure';

const GoalSetupModal: React.FC<GoalSetupModalProps> = ({
  customerId,
  isOpen = true,
  onClose,
  onSuccess
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [step, setStep] = useState<SetupStep>('select_type');
  const [selectedType, setSelectedType] = useState<GoalTrackingType | null>(null);

  const createGoalMutation = useCreateGoal();

  // Handle type selection
  const handleTypeSelect = (type: GoalTrackingType) => {
    setSelectedType(type);
    setStep('configure');
  };

  // Handle back to type selection
  const handleBack = () => {
    setStep('select_type');
    setSelectedType(null);
  };

  // Handle form submission
  const handleSubmit = async (data: CreateGoalRequest) => {
    if (createGoalMutation.isPending) {
      return;
    }

    try {
      await createGoalMutation.mutateAsync(data);
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error('Error creating goal:', error);
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (createGoalMutation.isPending) return;

    setStep('select_type');
    setSelectedType(null);
    onClose();
  };

  if (!isOpen) return null;

  // Icons
  const XIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  const ArrowLeftIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12,19 5,12 12,5" />
    </svg>
  );

  const ChevronRightIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );

  // Goal type cards data
  const goalTypeCards = [
    {
      type: 'time_based_goal' as GoalTrackingType,
      icon: '📅',
      title: 'Time-Based Goal',
      description: 'Set a fixed deadline with flexible target amount',
      color: '#3B82F6',
      features: [
        'Fixed retirement/target date',
        'Flexible corpus amount',
        'Inflation-adjusted projections',
        'Best for: Retirement planning'
      ]
    },
    {
      type: 'price_based_goal' as GoalTrackingType,
      icon: '💰',
      title: 'Price-Based Goal',
      description: 'Target a specific amount with flexible timeline',
      color: '#10B981',
      features: [
        'Fixed target amount',
        'Flexible timeline to achieve',
        'Achievement pace tracking',
        'Best for: Major purchases'
      ]
    },
    {
      type: 'time_and_price_goal' as GoalTrackingType,
      icon: '🎯',
      title: 'Time & Price Goal',
      description: 'Set both fixed date and amount with monitoring',
      color: '#F59E0B',
      features: [
        'Fixed date and amount',
        'Success probability tracking',
        'Gap analysis with recommendations',
        'Best for: Education/weddings'
      ]
    }
  ];

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
          zIndex: 9998,
          animation: 'fadeIn 0.2s ease-out'
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
          maxWidth: step === 'select_type' ? '900px' : '1000px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          animation: 'modalSlideIn 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: `1px solid ${colors.utility.primaryText}10`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {step === 'configure' && (
              <button
                onClick={handleBack}
                disabled={createGoalMutation.isPending}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  backgroundColor: 'transparent',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '6px',
                  color: colors.utility.primaryText,
                  cursor: createGoalMutation.isPending ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  opacity: createGoalMutation.isPending ? 0.5 : 1
                }}
              >
                <ArrowLeftIcon />
                Back
              </button>
            )}
            <div>
              <h2
                style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: colors.utility.primaryText,
                  margin: 0
                }}
              >
                {step === 'select_type' ? 'Create Financial Goal' : 'Configure Goal'}
              </h2>
              <p
                style={{
                  fontSize: '13px',
                  color: colors.utility.secondaryText,
                  margin: '4px 0 0 0'
                }}
              >
                {step === 'select_type'
                  ? 'Choose the type of goal that matches your needs'
                  : selectedType
                  ? `Creating: ${goalTypeCards.find(c => c.type === selectedType)?.title}`
                  : ''
                }
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={createGoalMutation.isPending}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              color: colors.utility.secondaryText,
              cursor: createGoalMutation.isPending ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              opacity: createGoalMutation.isPending ? 0.5 : 1
            }}
          >
            <XIcon />
          </button>
        </div>

        {/* Content */}
        {step === 'select_type' ? (
          <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '20px'
              }}
            >
              {goalTypeCards.map((card) => (
                <div
                  key={card.type}
                  onClick={() => handleTypeSelect(card.type)}
                  style={{
                    padding: '20px',
                    backgroundColor: colors.utility.secondaryBackground,
                    borderRadius: '12px',
                    border: `2px solid ${colors.utility.primaryText}10`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
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
                  {/* Icon */}
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      backgroundColor: card.color + '20',
                      color: card.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '16px',
                      fontSize: '28px'
                    }}
                  >
                    {card.icon}
                  </div>

                  {/* Title */}
                  <h3
                    style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: colors.utility.primaryText,
                      margin: '0 0 6px 0'
                    }}
                  >
                    {card.title}
                  </h3>

                  {/* Description */}
                  <p
                    style={{
                      fontSize: '12px',
                      color: colors.utility.secondaryText,
                      margin: '0 0 12px 0',
                      lineHeight: '1.4'
                    }}
                  >
                    {card.description}
                  </p>

                  {/* Features */}
                  <ul
                    style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      flex: 1
                    }}
                  >
                    {card.features.map((feature, idx) => (
                      <li
                        key={idx}
                        style={{
                          fontSize: '11px',
                          color: colors.utility.secondaryText,
                          marginBottom: idx < card.features.length - 1 ? '6px' : '0',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '6px'
                        }}
                      >
                        <span style={{ color: card.color, marginTop: '1px' }}>✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Arrow - Bottom Right */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '12px',
                      right: '12px',
                      color: card.color,
                      opacity: 0.5,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <ChevronRightIcon />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {selectedType === 'time_based_goal' && (
              <TimeBasedGoalForm
                customerId={customerId}
                onSubmit={handleSubmit}
                onCancel={handleClose}
                isSubmitting={createGoalMutation.isPending}
              />
            )}

            {selectedType === 'price_based_goal' && (
              <PriceBasedGoalForm
                customerId={customerId}
                onSubmit={handleSubmit}
                onCancel={handleClose}
                isSubmitting={createGoalMutation.isPending}
              />
            )}

            {selectedType === 'time_and_price_goal' && (
              <TimeAndPriceGoalForm
                customerId={customerId}
                onSubmit={handleSubmit}
                onCancel={handleClose}
                isSubmitting={createGoalMutation.isPending}
              />
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translate(-50%, -48%) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
      `}</style>
    </>
  );
};

export default GoalSetupModal;