// frontend/src/components/nav/BulkDownloadProgress.tsx
// Simple progress overlay for bulk historical downloads

import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import type { SchemeBookmark } from '../../services/nav.service';

interface BulkDownloadProgressProps {
  isOpen: boolean;
  current: number;
  total: number;
  currentScheme: SchemeBookmark | null;
  onCancel?: () => void;
}

export const BulkDownloadProgress: React.FC<BulkDownloadProgressProps> = ({
  isOpen,
  current,
  total,
  currentScheme,
  onCancel
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  if (!isOpen) return null;

  const progressPercentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        backgroundColor: colors.utility.primaryBackground,
        borderRadius: '16px',
        padding: '32px',
        minWidth: '500px',
        maxWidth: '600px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
        border: `1px solid ${colors.utility.primaryText}10`
      }}>
        
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px'
        }}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📥 Bulk Historical Download
          </h3>
        </div>

        {/* Spinner */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '24px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: `4px solid ${colors.utility.secondaryBackground}`,
            borderTop: `4px solid ${colors.brand.primary}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        </div>

        {/* Progress Text */}
        <div style={{
          textAlign: 'center',
          marginBottom: '20px'
        }}>
          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            color: colors.brand.primary,
            marginBottom: '8px'
          }}>
            {current} / {total}
          </div>
          
          <div style={{
            fontSize: '14px',
            color: colors.utility.secondaryText,
            marginBottom: '4px'
          }}>
            Processing schemes...
          </div>

          <div style={{
            fontSize: '16px',
            fontWeight: '500',
            color: colors.utility.primaryText,
            marginTop: '12px',
            minHeight: '24px'
          }}>
            {currentScheme ? (
              <>
                {currentScheme.scheme_name}
                <div style={{
                  fontSize: '12px',
                  color: colors.utility.secondaryText,
                  marginTop: '4px'
                }}>
                  Code: {currentScheme.scheme_code}
                </div>
              </>
            ) : (
              <span style={{ color: colors.utility.secondaryText }}>
                Preparing...
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{
          width: '100%',
          height: '8px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '4px',
          marginBottom: '24px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progressPercentage}%`,
            height: '100%',
            backgroundColor: colors.brand.primary,
            borderRadius: '4px',
            transition: 'width 0.3s ease-in-out'
          }} />
        </div>

        {/* Info Message */}
        <div style={{
          padding: '12px 16px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '13px',
          color: colors.utility.secondaryText,
          textAlign: 'center',
          lineHeight: '1.5'
        }}>
          <strong>Please wait...</strong> Each scheme is being downloaded sequentially.
          <br />
          You'll see a toast notification for each completion.
        </div>

        {/* Cancel Button */}
        {onCancel && (
          <div style={{
            display: 'flex',
            justifyContent: 'center'
          }}>
            <button
              onClick={onCancel}
              style={{
                padding: '10px 24px',
                backgroundColor: 'transparent',
                color: colors.semantic.error,
                border: `2px solid ${colors.semantic.error}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.semantic.error + '10';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Cancel Download
            </button>
          </div>
        )}

        {/* Warning Footer */}
        <div style={{
          marginTop: '16px',
          padding: '10px',
          backgroundColor: colors.semantic.warning + '10',
          borderRadius: '6px',
          border: `1px solid ${colors.semantic.warning}30`,
          fontSize: '12px',
          color: colors.utility.secondaryText,
          textAlign: 'center'
        }}>
          ⚠️ Do not close this page until all downloads complete
        </div>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default BulkDownloadProgress;