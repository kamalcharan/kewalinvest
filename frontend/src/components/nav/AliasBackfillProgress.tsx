// frontend/src/components/nav/AliasBackfillProgress.tsx

import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface AliasBackfillProgressProps {
  isOpen: boolean;
  current: number;
  total: number;
  currentScheme: {
    scheme_code: string;
    scheme_name: string;
  } | null;
  onCancel: () => void;
}

export const AliasBackfillProgress: React.FC<AliasBackfillProgressProps> = ({
  isOpen,
  current,
  total,
  currentScheme,
  onCancel,
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  if (!isOpen) return null;

  const progress = total > 0 ? (current / total) * 100 : 0;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: colors.utility.primaryBackground,
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2
            style={{
              fontSize: '24px',
              fontWeight: '700',
              color: colors.utility.primaryText,
              marginBottom: '8px',
            }}
          >
            🏷️ Backfilling Aliases
          </h2>
          <p
            style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              margin: 0,
            }}
          >
            Creating aliases for schemes sequentially
          </p>
        </div>

        {/* Progress Bar */}
        <div
          style={{
            width: '100%',
            height: '12px',
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '6px',
            overflow: 'hidden',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              backgroundColor: colors.semantic.info,
              transition: 'width 0.3s ease',
              borderRadius: '6px',
            }}
          />
        </div>

        {/* Progress Stats */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <span
            style={{
              fontSize: '16px',
              fontWeight: '600',
              color: colors.utility.primaryText,
            }}
          >
            {current} / {total}
          </span>
          <span
            style={{
              fontSize: '16px',
              fontWeight: '600',
              color: colors.semantic.info,
            }}
          >
            {progress.toFixed(0)}%
          </span>
        </div>

        {/* Current Scheme */}
        {currentScheme && (
          <div
            style={{
              padding: '16px',
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '8px',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                color: colors.utility.secondaryText,
                marginBottom: '4px',
              }}
            >
              Currently processing:
            </div>
            <div
              style={{
                fontSize: '14px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                marginBottom: '2px',
              }}
            >
              {currentScheme.scheme_code}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: colors.utility.secondaryText,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {currentScheme.scheme_name}
            </div>
          </div>
        )}

        {/* Cancel Button */}
        <button
          onClick={onCancel}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: colors.semantic.error,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          Cancel Backfill
        </button>

        <p
          style={{
            fontSize: '11px',
            color: colors.utility.secondaryText,
            textAlign: 'center',
            marginTop: '12px',
            marginBottom: 0,
          }}
        >
          This may take a while depending on the number of schemes
        </p>
      </div>
    </div>
  );
};
