// frontend/src/components/jtbd/JTBDSetupModal.tsx
// UPDATED: Added Goal Tracking as 4th option

import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { CreateJTBDRequest } from '../../types/jtbd.types';
import { useCreateJTBD } from '../../hooks/useJTBD';
import PortfolioAlertForm from './forms/PortfolioAlertForm';
import TimeAlertForm from './forms/TimeAlertForm';
import ProfileTriggerForm from './forms/ProfileTriggerForm';
import GoalWizardModal from '../goals/GoalWizardModal';


interface JTBDSetupModalProps {
  customerId: number;
  customerName?: string;
  isOpen?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type JTBDType = 'portfolio_alert' | 'time_based' | 'profile_trigger' | 'goal_tracking';
type SetupStep = 'select_type' | 'configure';

const JTBDSetupModal: React.FC<JTBDSetupModalProps> = ({
  customerId,
  customerName = 'Customer',
  isOpen = true,
  onClose,
  onSuccess
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [step, setStep] = useState<SetupStep>('select_type');
  const [selectedType, setSelectedType] = useState<JTBDType | null>(null);
  const [showGoalModal, setShowGoalModal] = useState(false);

  const createJTBDMutation = useCreateJTBD();

  // Handle type selection
  const handleTypeSelect = (type: JTBDType) => {
    if (type === 'goal_tracking') {
      // For goal tracking, open the goal setup modal directly
      setShowGoalModal(true);
      return;
    }
    
    setSelectedType(type);
    setStep('configure');
  };

  // Handle back to type selection
  const handleBack = () => {
    setStep('select_type');
    setSelectedType(null);
  };

  // Handle goal setup modal close
  const handleGoalModalClose = () => {
    setShowGoalModal(false);
  };

  // Handle goal setup modal success
  const handleGoalSuccess = () => {
    setShowGoalModal(false);
    onSuccess?.();
    handleClose();
  };

  // Handle form submission with race condition protection
  const handleSubmit = async (data: CreateJTBDRequest) => {
    // Race condition guard
    if (createJTBDMutation.isPending) {
      console.log('⚠️ Submission already in progress');
      return;
    }

    try {
      await createJTBDMutation.mutateAsync(data);
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error('Error creating JTBD:', error);
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (createJTBDMutation.isPending) return;
    
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

  const BellIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );

  const CalendarIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );

  const UserIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );

  const TargetIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );

  const ChevronRightIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );

  // Type cards data - NOW WITH 4 OPTIONS
  const typeCards = [
    {
      type: 'portfolio_alert' as JTBDType,
      icon: <BellIcon />,
      title: 'Portfolio Alert',
      description: 'Get notified about expected transactions in customer portfolios',
      color: colors.brand.primary,
      features: ['Track SIPs & STPs', 'Monitor redemptions', 'Set frequency & amount', 'Deviation tracking']
    },
    {
      type: 'time_based' as JTBDType,
      icon: <CalendarIcon />,
      title: 'Time-Based Alert',
      description: 'Set alerts for specific dates throughout the year',
      color: colors.brand.secondary,
      features: ['Annual reminders', 'Custom dates', 'One-time or recurring', 'Tax deadlines']
    },
    {
      type: 'profile_trigger' as JTBDType,
      icon: <UserIcon />,
      title: 'Profile Trigger',
      description: 'Automated alerts based on customer life events',
      color: colors.semantic.info,
      features: ['Birthday reminders', 'Anniversary alerts', 'Configurable lead time', 'Personal touch']
    },
    {
      type: 'goal_tracking' as JTBDType,
      icon: <TargetIcon />,
      title: 'Goal Tracking',
      description: 'Set financial targets and track progress toward achieving them',
      color: '#F59E0B',
      features: ['Multiple goal types', 'Progress monitoring', 'Real-time projections', 'Achievement tracking']
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

      {/* Main Modal */}
      {!showGoalModal && (
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
            maxWidth: step === 'select_type' ? '1000px' : '1100px',
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
                  disabled={createJTBDMutation.isPending}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    backgroundColor: 'transparent',
                    border: `1px solid ${colors.utility.primaryText}20`,
                    borderRadius: '6px',
                    color: colors.utility.primaryText,
                    cursor: createJTBDMutation.isPending ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    opacity: createJTBDMutation.isPending ? 0.5 : 1
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
                  {step === 'select_type' ? 'Setup JTBD & Goal' : 'Configure'}
                </h2>
                <p
                  style={{
                    fontSize: '13px',
                    color: colors.utility.secondaryText,
                    margin: '4px 0 0 0'
                  }}
                >
                  {step === 'select_type' 
                    ? `Setting up for ${customerName}`
                    : `Type: ${selectedType ? typeCards.find(t => t.type === selectedType)?.title : ''}`
                  }
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={createJTBDMutation.isPending}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                color: colors.utility.secondaryText,
                cursor: createJTBDMutation.isPending ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                opacity: createJTBDMutation.isPending ? 0.5 : 1
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
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '20px'
                }}
              >
                {typeCards.map((card) => (
                  <div
                    key={card.type}
                    onClick={() => handleTypeSelect(card.type)}
                    style={{
                      padding: '24px',
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
                        marginBottom: '16px'
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
              {selectedType === 'portfolio_alert' && (
                <PortfolioAlertForm
                  customerId={customerId}
                  onSubmit={handleSubmit}
                  onCancel={handleClose}
                  isSubmitting={createJTBDMutation.isPending}
                />
              )}

              {selectedType === 'time_based' && (
                <TimeAlertForm
                  customerId={customerId}
                  onSubmit={handleSubmit}
                  onCancel={handleClose}
                  isSubmitting={createJTBDMutation.isPending}
                />
              )}

              {selectedType === 'profile_trigger' && (
                <ProfileTriggerForm
                  customerId={customerId}
                  onSubmit={handleSubmit}
                  onCancel={handleClose}
                  isSubmitting={createJTBDMutation.isPending}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Goal Wizard Modal - Rendered when goal_tracking is selected */}
      {showGoalModal && (
        <GoalWizardModal
          customerId={customerId}
          isOpen={showGoalModal}
          onClose={handleGoalModalClose}
          onSuccess={handleGoalSuccess}
        />
      )}

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

export default JTBDSetupModal;