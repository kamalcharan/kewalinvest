// frontend/src/components/goals/GoalRecalculationModal.tsx

import React, { useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useGoal } from '../../hooks/useGoals';
import { formatCurrency, formatPercentage } from '../../utils/goalUtils';

interface GoalRecalculationModalProps {
  goalId: number;
  isOpen?: boolean;
  isRecalculating: boolean;
  onClose: () => void;
  previousCorpus?: number;
  newCorpus?: number;
  alertsTriggered?: string[];
  error?: boolean;
}

const GoalRecalculationModal: React.FC<GoalRecalculationModalProps> = ({
  goalId,
  isOpen = true,
  isRecalculating,
  onClose,
  previousCorpus,
  newCorpus,
  alertsTriggered = [],
  error = false
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const { data: goal } = useGoal(goalId);

  // Auto-close on success after 2 seconds
  useEffect(() => {
    if (!isRecalculating && isOpen && !error) {
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isRecalculating, isOpen, error, onClose]);

  if (!isOpen) return null;

  // Icons
  const CheckCircleIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );

  const AlertCircleIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );

  const XIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  // Loading state - during recalculation
  if (isRecalculating) {
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
            padding: '40px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            zIndex: 9999,
            width: '90%',
            maxWidth: '400px',
            textAlign: 'center',
            animation: 'modalSlideIn 0.3s ease-out'
          }}
        >
          {/* Spinner */}
          <div
            style={{
              width: '56px',
              height: '56px',
              margin: '0 auto 20px',
              border: `3px solid ${colors.utility.primaryText}20`,
              borderTopColor: colors.brand.primary,
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }}
          />

          {/* Title */}
          <h3
            style={{
              fontSize: '18px',
              fontWeight: '700',
              color: colors.utility.primaryText,
              margin: '0 0 8px 0'
            }}
          >
            Recalculating Goal
          </h3>

          {/* Subtitle */}
          <p
            style={{
              fontSize: '13px',
              color: colors.utility.secondaryText,
              margin: '0',
              lineHeight: '1.4'
            }}
          >
            Updating projections with latest portfolio data...
          </p>

          {/* Progress dots */}
          <div
            style={{
              marginTop: '16px',
              display: 'flex',
              gap: '6px',
              justifyContent: 'center'
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: colors.brand.primary,
                  animation: `pulse 1.5s ease-in-out ${i * 0.2}s infinite`
                }}
              />
            ))}
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (error) {
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
          onClick={onClose}
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
            padding: '40px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            zIndex: 9999,
            width: '90%',
            maxWidth: '400px',
            textAlign: 'center',
            animation: 'modalSlideIn 0.3s ease-out'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Icon */}
          <div style={{ color: colors.semantic.error, marginBottom: '16px' }}>
            <AlertCircleIcon />
          </div>

          {/* Title */}
          <h3
            style={{
              fontSize: '18px',
              fontWeight: '700',
              color: colors.utility.primaryText,
              margin: '0 0 8px 0'
            }}
          >
            Recalculation Failed
          </h3>

          {/* Message */}
          <p
            style={{
              fontSize: '13px',
              color: colors.utility.secondaryText,
              margin: '0 0 20px 0',
              lineHeight: '1.4'
            }}
          >
            Unable to recalculate goal projections. Please try again later.
          </p>

          {/* Close Button */}
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: colors.semantic.error,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600'
            }}
          >
            Close
          </button>
        </div>
      </>
    );
  }

  // Success state - before/after comparison
  const corpusChange = previousCorpus && newCorpus ? newCorpus - previousCorpus : 0;
  const corpusChangePercent = previousCorpus && previousCorpus > 0 && corpusChange !== 0
    ? (corpusChange / previousCorpus) * 100
    : 0;

  const isPositiveChange = corpusChange >= 0;
  const changeColor = isPositiveChange ? '#10B981' : '#F59E0B';

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
        onClick={onClose}
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
          padding: '32px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          zIndex: 9999,
          width: '90%',
          maxWidth: '450px',
          animation: 'modalSlideIn 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ color: '#10B981' }}>
              <CheckCircleIcon />
            </div>
            <div>
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: colors.utility.primaryText,
                  margin: 0
                }}
              >
                Goal Recalculated
              </h3>
              <p
                style={{
                  fontSize: '12px',
                  color: colors.utility.secondaryText,
                  margin: '2px 0 0 0'
                }}
              >
                {goal?.title}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: 'transparent',
              border: 'none',
              color: colors.utility.secondaryText,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <XIcon />
          </button>
        </div>

        {/* Comparison Section */}
        {previousCorpus !== undefined && newCorpus !== undefined && (
          <div
            style={{
              padding: '16px',
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '12px',
              marginBottom: '16px'
            }}
          >
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '12px'
            }}>
              {/* Previous Corpus */}
              <div>
                <div style={{
                  fontSize: '10px',
                  color: colors.utility.secondaryText,
                  marginBottom: '4px'
                }}>
                  Previous Projection
                </div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '700',
                  color: colors.utility.primaryText
                }}>
                  {formatCurrency(previousCorpus, true)}
                </div>
              </div>

              {/* New Corpus */}
              <div>
                <div style={{
                  fontSize: '10px',
                  color: colors.utility.secondaryText,
                  marginBottom: '4px'
                }}>
                  New Projection
                </div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '700',
                  color: colors.utility.primaryText
                }}>
                  {formatCurrency(newCorpus, true)}
                </div>
              </div>
            </div>

            {/* Change Indicator */}
            <div
              style={{
                padding: '10px',
                backgroundColor: changeColor + '15',
                border: `1px solid ${changeColor}40`,
                borderRadius: '8px',
                textAlign: 'center'
              }}
            >
              <div style={{
                fontSize: '11px',
                color: colors.utility.secondaryText,
                marginBottom: '4px'
              }}>
                Change
              </div>
              <div style={{
                fontSize: '16px',
                fontWeight: '700',
                color: changeColor
              }}>
                {isPositiveChange ? '+' : ''}{formatCurrency(corpusChange, true)}
              </div>
              <div style={{
                fontSize: '10px',
                color: changeColor,
                marginTop: '2px'
              }}>
                ({isPositiveChange ? '+' : ''}{formatPercentage(corpusChangePercent, 1)})
              </div>
            </div>
          </div>
        )}

        {/* Alerts Triggered */}
        {alertsTriggered && alertsTriggered.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              fontSize: '11px',
              fontWeight: '600',
              color: colors.utility.secondaryText,
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              ⚠️ Alerts Triggered
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {alertsTriggered.map((alert, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '8px 10px',
                    backgroundColor: colors.semantic.warning + '15',
                    border: `1px solid ${colors.semantic.warning}40`,
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: colors.utility.primaryText,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span style={{ color: colors.semantic.warning }}>•</span>
                  <span>{alert}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Message */}
        <div
          style={{
            padding: '10px',
            backgroundColor: colors.brand.primary + '10',
            border: `1px solid ${colors.brand.primary}30`,
            borderRadius: '6px',
            fontSize: '11px',
            color: colors.utility.primaryText,
            textAlign: 'center'
          }}
        >
          Closing in 2 seconds...
        </div>
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

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </>
  );
};

export default GoalRecalculationModal;