// frontend/src/components/ui/ConfirmationDialog.tsx
import React from 'react';
import { X, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'info' | 'success' | 'error';
  icon?: React.ReactNode;
  isLoading?: boolean;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info',
  icon,
  isLoading = false,
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  if (!isOpen) return null;

  const getTypeColor = () => {
    switch (type) {
      case 'warning':
        return colors.semantic.warning;
      case 'error':
        return colors.semantic.error;
      case 'success':
        return colors.semantic.success;
      default:
        return colors.semantic.info;
    }
  };

  const getDefaultIcon = () => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-6 h-6" />;
      case 'success':
        return <CheckCircle className="w-6 h-6" />;
      default:
        return <Info className="w-6 h-6" />;
    }
  };

  const typeColor = getTypeColor();
  const displayIcon = icon || getDefaultIcon();

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}
        onClick={isLoading ? undefined : onClose}
      >
        {/* Dialog */}
        <div
          style={{
            position: 'relative',
            maxWidth: '500px',
            width: '100%',
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          {!isLoading && (
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                padding: '4px',
                color: colors.utility.secondaryText,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'opacity 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              <X style={{ width: '20px', height: '20px' }} />
            </button>
          )}

          {/* Content */}
          <div style={{ padding: '24px' }}>
            {/* Icon and Title */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '16px',
              marginBottom: '16px'
            }}>
              <div
                style={{
                  padding: '12px',
                  borderRadius: '50%',
                  backgroundColor: typeColor + '20',
                  color: typeColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {displayIcon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: colors.utility.primaryText,
                    marginBottom: '8px',
                    lineHeight: '1.4'
                  }}
                >
                  {title}
                </h3>
                <p
                  style={{
                    fontSize: '14px',
                    color: colors.utility.secondaryText,
                    lineHeight: '1.5'
                  }}
                >
                  {description}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '24px'
            }}>
              {!isLoading && (
                <button
                  onClick={onClose}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.utility.secondaryText}30`,
                    backgroundColor: 'transparent',
                    color: colors.utility.primaryText,
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  {cancelText}
                </button>
              )}
              <button
                onClick={onConfirm}
                disabled={isLoading}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: typeColor,
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.5 : 1,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.opacity = '0.8';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.opacity = '1';
                  }
                }}
              >
                {isLoading ? 'Processing...' : confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ConfirmationDialog;