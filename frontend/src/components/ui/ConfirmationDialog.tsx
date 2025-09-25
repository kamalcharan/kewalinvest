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
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
        onClick={isLoading ? undefined : onClose}
      >
        {/* Dialog */}
        <div 
          className="relative max-w-md w-full mx-4 rounded-lg shadow-xl"
          style={{ backgroundColor: colors.utility.secondaryBackground }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          {!isLoading && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded hover:opacity-80 transition-opacity"
              style={{ color: colors.utility.secondaryText }}
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Content */}
          <div className="p-6">
            {/* Icon and Title */}
            <div className="flex items-start space-x-4 mb-4">
              <div 
                className="p-3 rounded-full"
                style={{ 
                  backgroundColor: typeColor + '20',
                  color: typeColor 
                }}
              >
                {displayIcon}
              </div>
              <div className="flex-1">
                <h3 
                  className="text-lg font-semibold mb-2"
                  style={{ color: colors.utility.primaryText }}
                >
                  {title}
                </h3>
                <p 
                  className="text-sm"
                  style={{ color: colors.utility.secondaryText }}
                >
                  {description}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 mt-6">
              {!isLoading && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border transition-colors hover:opacity-80"
                  style={{ 
                    borderColor: colors.utility.secondaryText + '30',
                    color: colors.utility.primaryText 
                  }}
                >
                  {cancelText}
                </button>
              )}
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg transition-colors hover:opacity-80 disabled:opacity-50"
                style={{ 
                  backgroundColor: typeColor,
                  color: '#ffffff' 
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