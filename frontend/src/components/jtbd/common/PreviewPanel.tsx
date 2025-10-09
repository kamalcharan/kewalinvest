// frontend/src/components/jtbd/common/PreviewPanel.tsx

import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';

interface PreviewItem {
  icon: string;
  label: string;
  value: string;
}

interface PreviewPanelProps {
  items: PreviewItem[];
  schemeCount?: number;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  confirmButtonText?: string;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({
  items,
  schemeCount,
  onConfirm,
  onCancel,
  isSubmitting = false,
  confirmButtonText = 'Create Alert'
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20,6 9,17 4,12" />
    </svg>
  );

  return (
    <div
      style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.utility.primaryBackground,
        borderTop: `2px solid ${colors.brand.primary}40`,
        padding: '20px 24px',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.1)'
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '16px'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          backgroundColor: colors.brand.primary + '20',
          color: colors.brand.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px'
        }}>
          📋
        </div>
        <div>
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            color: colors.utility.primaryText
          }}>
            Preview: What Will Be Created
          </div>
          {schemeCount && schemeCount > 1 && (
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText
            }}>
              {schemeCount} alerts will be created (one per scheme)
            </div>
          )}
        </div>
      </div>

      {/* Preview Items */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        marginBottom: '16px'
      }}>
        {items.map((item, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 12px',
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '8px',
              border: `1px solid ${colors.utility.primaryText}10`
            }}
          >
            <span style={{ fontSize: '16px' }}>{item.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: colors.utility.secondaryText,
                marginBottom: '2px'
              }}>
                {item.label}
              </div>
              <div style={{
                fontSize: '13px',
                fontWeight: '500',
                color: colors.utility.primaryText,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {item.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          style={{
            padding: '10px 20px',
            backgroundColor: 'transparent',
            border: `1px solid ${colors.utility.primaryText}20`,
            borderRadius: '8px',
            color: colors.utility.primaryText,
            fontSize: '14px',
            fontWeight: '500',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.5 : 1
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting}
          style={{
            padding: '10px 24px',
            backgroundColor: colors.brand.primary,
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            pointerEvents: isSubmitting ? 'none' : 'auto'
          }}
        >
          {isSubmitting ? (
            <>
              <div style={{
                width: '14px',
                height: '14px',
                border: '2px solid white',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.6s linear infinite'
              }} />
              Creating...
            </>
          ) : (
            <>
              <CheckIcon />
              {confirmButtonText}
              {schemeCount && schemeCount > 1 && ` (${schemeCount})`}
            </>
          )}
        </button>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PreviewPanel;