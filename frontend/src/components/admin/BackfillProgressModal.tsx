// frontend/src/components/admin/BackfillProgressModal.tsx

import React, { useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { SchemeAliasService, BackfillProgress } from '../../services/schemeAlias.service';
import { toastService } from '../../services/toast.service';

interface BackfillProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const BackfillProgressModal: React.FC<BackfillProgressModalProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [progress, setProgress] = useState<BackfillProgress | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Poll for progress every 500ms
  useEffect(() => {
    if (!isOpen) return;

    const pollProgress = async () => {
      try {
        const response = await SchemeAliasService.getBackfillProgress();
        if (response.success && response.data) {
          setProgress(response.data);

          // If completed, cancelled, or error - stop polling and close
          if (response.data.status !== 'running') {
            setTimeout(() => {
              if (response.data!.status === 'completed') {
                toastService.success(`Backfill completed! Created ${response.data!.created} aliases`);
                onComplete();
              } else if (response.data!.status === 'cancelled') {
                toastService.info('Backfill cancelled');
              } else if (response.data!.status === 'error') {
                toastService.error(`Backfill failed: ${response.data!.error}`);
              }
              onClose();
            }, 1000); // Show final state for 1 second before closing
          }
        }
      } catch (error: any) {
        console.error('Error fetching progress:', error);
      }
    };

    // Initial poll
    pollProgress();

    // Set up polling interval
    const intervalId = setInterval(pollProgress, 500);

    // Cleanup
    return () => clearInterval(intervalId);
  }, [isOpen, onClose, onComplete]);

  const handleCancel = async () => {
    if (!progress || progress.status !== 'running' || isCancelling) return;

    try {
      setIsCancelling(true);
      const response = await SchemeAliasService.cancelBackfill();

      if (response.success) {
        toastService.info('Cancellation requested... Stopping after current batch');
      } else {
        toastService.error(response.error || 'Failed to cancel backfill');
        setIsCancelling(false);
      }
    } catch (error: any) {
      console.error('Error cancelling backfill:', error);
      toastService.error('Failed to cancel backfill');
      setIsCancelling(false);
    }
  };

  if (!isOpen || !progress) return null;

  const percentComplete = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  const isRunning = progress.status === 'running';
  const isCompleted = progress.status === 'completed';
  const isCancelled = progress.status === 'cancelled';
  const isError = progress.status === 'error';

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
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90%',
        maxWidth: '600px',
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        zIndex: 1001,
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: `1px solid ${colors.utility.primaryText}10`,
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: isCompleted ? colors.semantic.success + '20' :
                           isCancelled ? colors.semantic.warning + '20' :
                           isError ? colors.semantic.error + '20' :
                           colors.brand.primary + '20',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px'
          }}>
            {isCompleted ? '✓' : isCancelled ? '⊘' : isError ? '✗' : '⟳'}
          </div>
          <div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '700',
              color: colors.utility.primaryText,
              margin: 0
            }}>
              {isCompleted ? 'Backfill Complete!' :
               isCancelled ? 'Backfill Cancelled' :
               isError ? 'Backfill Error' :
               'Backfilling Aliases...'}
            </h2>
            <p style={{
              fontSize: '13px',
              color: colors.utility.secondaryText,
              margin: '4px 0 0 0'
            }}>
              {isRunning ? 'Processing schemes in batches' :
               isCompleted ? 'All schemes have been processed' :
               isCancelled ? 'Stopped by user request' :
               'An error occurred during processing'}
            </p>
          </div>
        </div>

        {/* Progress Content */}
        <div style={{ padding: '24px' }}>
          {/* Progress Bar */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              fontSize: '14px'
            }}>
              <span style={{ color: colors.utility.secondaryText }}>
                Progress
              </span>
              <span style={{
                color: colors.utility.primaryText,
                fontWeight: '600',
                fontFamily: 'monospace'
              }}>
                {progress.current.toLocaleString()} / {progress.total.toLocaleString()} schemes
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: colors.utility.primaryText + '10',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${percentComplete}%`,
                height: '100%',
                backgroundColor: isCompleted ? colors.semantic.success :
                               isCancelled ? colors.semantic.warning :
                               isError ? colors.semantic.error :
                               colors.brand.primary,
                transition: 'width 0.3s ease',
                borderRadius: '4px'
              }} />
            </div>
            <div style={{
              marginTop: '4px',
              fontSize: '12px',
              color: colors.utility.secondaryText,
              textAlign: 'right'
            }}>
              {percentComplete}% Complete
            </div>
          </div>

          {/* Statistics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            marginBottom: '20px'
          }}>
            <div style={{
              padding: '16px',
              backgroundColor: colors.utility.primaryBackground,
              borderRadius: '8px',
              border: `1px solid ${colors.utility.primaryText}10`
            }}>
              <div style={{
                fontSize: '12px',
                color: colors.utility.secondaryText,
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Aliases Created
              </div>
              <div style={{
                fontSize: '24px',
                fontWeight: '700',
                color: colors.semantic.success,
                fontFamily: 'monospace'
              }}>
                {progress.created.toLocaleString()}
              </div>
            </div>

            <div style={{
              padding: '16px',
              backgroundColor: colors.utility.primaryBackground,
              borderRadius: '8px',
              border: `1px solid ${colors.utility.primaryText}10`
            }}>
              <div style={{
                fontSize: '12px',
                color: colors.utility.secondaryText,
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Skipped
              </div>
              <div style={{
                fontSize: '24px',
                fontWeight: '700',
                color: colors.utility.secondaryText,
                fontFamily: 'monospace'
              }}>
                {progress.skipped.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {isError && progress.error && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: colors.semantic.error + '10',
              border: `1px solid ${colors.semantic.error}30`,
              borderRadius: '8px',
              marginBottom: '20px',
              color: colors.semantic.error,
              fontSize: '13px'
            }}>
              <strong>Error:</strong> {progress.error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px 24px',
          borderTop: `1px solid ${colors.utility.primaryText}10`,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          backgroundColor: colors.utility.primaryBackground
        }}>
          {isRunning && (
            <button
              onClick={handleCancel}
              disabled={isCancelling}
              style={{
                padding: '10px 20px',
                backgroundColor: colors.semantic.warning,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isCancelling ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: isCancelling ? 0.6 : 1
              }}
            >
              {isCancelling ? 'Cancelling...' : 'Cancel'}
            </button>
          )}

          {!isRunning && (
            <button
              onClick={onClose}
              style={{
                padding: '10px 24px',
                backgroundColor: colors.semantic.success,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Close
            </button>
          )}
        </div>

        {/* Spinning animation */}
        {isRunning && (
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        )}
      </div>
    </>
  );
};

export default BackfillProgressModal;
