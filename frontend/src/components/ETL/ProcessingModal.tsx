// frontend/src/components/ETL/ProcessingModal.tsx
import React, { useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface ProcessingModalProps {
  isOpen: boolean;
  stage: 'preparing' | 'staging' | 'processing' | 'completing' | 'completed' | 'error';
  message?: string;
  progress?: number;
  totalRecords?: number;
  processedRecords?: number;
  onClose?: () => void;
}

const ProcessingModal: React.FC<ProcessingModalProps> = ({
  isOpen,
  stage,
  message,
  progress = 0,
  totalRecords = 0,
  processedRecords = 0,
  onClose
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  const [dots, setDots] = useState('');

  // Animated dots for loading
  useEffect(() => {
    if (stage === 'completed' || stage === 'error') return;

    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    return () => clearInterval(interval);
  }, [stage]);

  if (!isOpen) return null;

  const getStageIcon = () => {
    switch (stage) {
      case 'preparing':
      case 'staging':
      case 'processing':
        return (
          <div style={{
            width: '64px',
            height: '64px',
            border: `4px solid ${colors.brand.primary}30`,
            borderTop: `4px solid ${colors.brand.primary}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        );
      case 'completing':
        return (
          <div style={{
            width: '64px',
            height: '64px',
            border: `4px solid ${colors.semantic.success}30`,
            borderTop: `4px solid ${colors.semantic.success}`,
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
        );
      case 'completed':
        return (
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={colors.semantic.success} strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22,4 12,14.01 9,11.01" />
          </svg>
        );
      case 'error':
        return (
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={colors.semantic.error} strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getStageTitle = () => {
    switch (stage) {
      case 'preparing':
        return 'Preparing Import';
      case 'staging':
        return 'Staging Data';
      case 'processing':
        return 'Processing Records';
      case 'completing':
        return 'Finalizing Import';
      case 'completed':
        return 'Import Completed!';
      case 'error':
        return 'Import Failed';
      default:
        return 'Processing';
    }
  };

  const getStageMessage = () => {
    if (message) return message;

    switch (stage) {
      case 'preparing':
        return 'Creating import session and validating mappings...';
      case 'staging':
        return 'Reading file and preparing records for processing...';
      case 'processing':
        return 'Importing records into the database...';
      case 'completing':
        return 'Generating import summary and results...';
      case 'completed':
        return 'Your data has been imported successfully!';
      case 'error':
        return 'An error occurred during import. Please try again.';
      default:
        return 'Please wait...';
    }
  };

  const showProgress = stage === 'processing' && totalRecords > 0;
  const progressPercentage = showProgress ? Math.round((processedRecords / totalRecords) * 100) : 0;

  return (
    <div style={{
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        backgroundColor: colors.utility.primaryBackground,
        borderRadius: '16px',
        padding: '48px 40px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        textAlign: 'center' as const,
        position: 'relative' as const
      }}>
        {/* Close button (only for completed/error states) */}
        {(stage === 'completed' || stage === 'error') && onClose && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute' as const,
              top: '16px',
              right: '16px',
              background: 'transparent',
              border: 'none',
              color: colors.utility.secondaryText,
              cursor: 'pointer',
              fontSize: '24px',
              padding: '4px',
              lineHeight: 1
            }}
            aria-label="Close"
          >
            ×
          </button>
        )}

        {/* Icon */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '24px',
          color: stage === 'error' ? colors.semantic.error : colors.brand.primary
        }}>
          {getStageIcon()}
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: colors.utility.primaryText,
          marginBottom: '12px',
          margin: 0
        }}>
          {getStageTitle()}{stage !== 'completed' && stage !== 'error' ? dots : ''}
        </h2>

        {/* Message */}
        <p style={{
          fontSize: '15px',
          color: colors.utility.secondaryText,
          marginBottom: showProgress ? '24px' : '0',
          lineHeight: '1.6',
          margin: 0
        }}>
          {getStageMessage()}
        </p>

        {/* Progress Bar (only during processing) */}
        {showProgress && (
          <div style={{ marginTop: '24px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: colors.utility.primaryText
              }}>
                {processedRecords.toLocaleString()} of {totalRecords.toLocaleString()} records
              </span>
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: colors.brand.primary
              }}>
                {progressPercentage}%
              </span>
            </div>

            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progressPercentage}%`,
                height: '100%',
                backgroundColor: colors.brand.primary,
                borderRadius: '4px',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}

        {/* Warning - Do not close browser */}
        {stage !== 'completed' && stage !== 'error' && (
          <div style={{
            marginTop: '32px',
            padding: '12px',
            backgroundColor: colors.semantic.warning + '15',
            borderRadius: '8px',
            border: `1px solid ${colors.semantic.warning}30`
          }}>
            <p style={{
              fontSize: '13px',
              color: colors.utility.secondaryText,
              margin: 0,
              lineHeight: '1.5'
            }}>
              ⚠️ Please do not close this window or navigate away during import
            </p>
          </div>
        )}

        {/* Close button for completed/error states */}
        {(stage === 'completed' || stage === 'error') && onClose && (
          <button
            onClick={onClose}
            style={{
              marginTop: '24px',
              backgroundColor: stage === 'completed' ? colors.brand.primary : colors.semantic.error,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 32px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'opacity 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
          >
            {stage === 'completed' ? 'View Results' : 'Close'}
          </button>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ProcessingModal;
