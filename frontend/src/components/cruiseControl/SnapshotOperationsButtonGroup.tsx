// frontend/src/components/cruiseControl/SnapshotOperationsButtonGroup.tsx
// CORRECTED: Single button with dropdown menu for all operations

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Plus, RefreshCw, Trash2, AlertTriangle, ChevronDown } from 'lucide-react';
import PortfolioSnapshotService from '../../services/portfolioSnapshot.service';
import { toastService } from '../../services/toast.service';

interface SnapshotOperationsButtonGroupProps {
  onOperationComplete?: () => void;
  isRunning?: boolean;
}

type OperationType = 'generate_missing' | 'update_all' | 'regenerate_all' | 'drop_all';

export const SnapshotOperationsButtonGroup: React.FC<SnapshotOperationsButtonGroupProps> = ({
  onOperationComplete,
  isRunning
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmData, setConfirmData] = useState<{
    operation: OperationType;
    title: string;
    message: string;
    isDangerous: boolean;
  } | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const operationConfigs = {
    generate_missing: {
      title: 'Generate Missing Snapshots',
      description: 'Only creates new snapshots (safe)',
      message: 'This will create snapshots only for missing months. Existing snapshots will NOT be modified. This is a safe operation.',
      isDangerous: false,
      icon: <Plus size={16} />,
      color: '#10B981'
    },
    update_all: {
      title: 'Update All Snapshots',
      description: 'Creates + updates existing',
      message: 'This will create missing snapshots AND update existing ones with latest values. This operation will recalculate all snapshot data.',
      isDangerous: false,
      icon: <RefreshCw size={16} />,
      color: colors.brand.primary
    },
    regenerate_all: {
      title: 'Regenerate All Snapshots',
      description: 'Deletes all then recreates',
      message: '⚠️ WARNING: This will DELETE all existing snapshots and recreate them from scratch. This operation cannot be undone! Only use this if snapshot data is corrupted.',
      isDangerous: true,
      icon: <RefreshCw size={16} />,
      color: '#F59E0B'
    },
    drop_all: {
      title: 'Drop All Snapshots',
      description: 'Permanently deletes all',
      message: '🚨 DANGER: This will permanently DELETE all portfolio snapshots. This operation cannot be undone! Are you absolutely sure you want to proceed?',
      isDangerous: true,
      icon: <Trash2 size={16} />,
      color: '#EF4444'
    }
  };

  const handleOperationClick = (operation: OperationType) => {
    const config = operationConfigs[operation];
    setConfirmData({
      operation,
      title: config.title,
      message: config.message,
      isDangerous: config.isDangerous
    });
    setShowConfirm(true);
    setShowDropdown(false);
  };

  const handleConfirm = async () => {
    if (!confirmData) return;

    setShowConfirm(false);
    setLoading(true);

    try {
      let response;

      switch (confirmData.operation) {
        case 'generate_missing':
          response = await PortfolioSnapshotService.generateMissingSnapshots();
          break;
        case 'update_all':
          response = await PortfolioSnapshotService.updateAllSnapshots();
          break;
        case 'regenerate_all':
          response = await PortfolioSnapshotService.regenerateAllSnapshots();
          break;
        case 'drop_all':
          response = await PortfolioSnapshotService.dropAllSnapshots();
          break;
      }

      if (response.success) {
        toastService.success(response.data?.message || 'Operation started successfully');
        // Refresh after 2 seconds
        setTimeout(() => {
          if (onOperationComplete) {
            onOperationComplete();
          }
        }, 2000);
      } else {
        toastService.error(response.error || 'Operation failed');
      }
    } catch (error: any) {
      console.error('Error executing snapshot operation:', error);
      toastService.error(error.message || 'Operation failed');
    } finally {
      setLoading(false);
      setConfirmData(null);
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setConfirmData(null);
  };

  const isDisabled = loading || isRunning;

  return (
    <>
      {/* Single Button with Dropdown */}
      <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          disabled={isDisabled}
          style={{
            padding: '12px 24px',
            backgroundColor: isDisabled ? colors.utility.secondaryText : colors.brand.primary,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: isDisabled ? 0.6 : 1
          }}
        >
          <RefreshCw size={16} />
          {loading ? 'Processing...' : 'Snapshot Operations'}
          <ChevronDown size={16} />
        </button>

        {/* Dropdown Menu */}
        {showDropdown && !isDisabled && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            backgroundColor: colors.utility.secondaryBackground,
            border: `1px solid ${colors.utility.primaryText}20`,
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            minWidth: '280px',
            zIndex: 1000
          }}>
            {/* Generate Missing - Safe */}
            <button
              onClick={() => handleOperationClick('generate_missing')}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'transparent',
                color: colors.utility.primaryText,
                border: 'none',
                borderBottom: `1px solid ${colors.utility.primaryText}10`,
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Plus size={18} style={{ marginTop: '2px', color: '#10B981', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', color: '#10B981', marginBottom: '2px' }}>
                  Generate Missing
                </div>
                <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
                  Only creates new snapshots (safe)
                </div>
              </div>
            </button>

            {/* Update All */}
            <button
              onClick={() => handleOperationClick('update_all')}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'transparent',
                color: colors.utility.primaryText,
                border: 'none',
                borderBottom: `1px solid ${colors.utility.primaryText}10`,
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <RefreshCw size={18} style={{ marginTop: '2px', color: colors.brand.primary, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', color: colors.brand.primary, marginBottom: '2px' }}>
                  Update All
                </div>
                <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
                  Creates + updates existing
                </div>
              </div>
            </button>

            {/* Regenerate All - Warning */}
            <button
              onClick={() => handleOperationClick('regenerate_all')}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'transparent',
                color: colors.utility.primaryText,
                border: 'none',
                borderBottom: `1px solid ${colors.utility.primaryText}10`,
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <RefreshCw size={18} style={{ marginTop: '2px', color: '#F59E0B', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', color: '#F59E0B', marginBottom: '2px' }}>
                  Regenerate All
                </div>
                <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
                  Deletes all then recreates
                </div>
              </div>
            </button>

            {/* Drop All - Danger */}
            <button
              onClick={() => handleOperationClick('drop_all')}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'transparent',
                color: colors.utility.primaryText,
                border: 'none',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                textAlign: 'left',
                borderRadius: '0 0 8px 8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Trash2 size={18} style={{ marginTop: '2px', color: '#EF4444', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', color: '#EF4444', marginBottom: '2px' }}>
                  Drop All
                </div>
                <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
                  Permanently deletes all
                </div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirm && confirmData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            border: `1px solid ${colors.utility.primaryText}20`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}>
            {/* Title */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px'
            }}>
              {confirmData.isDangerous && (
                <AlertTriangle size={24} style={{ color: '#EF4444' }} />
              )}
              <h3 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '600',
                color: colors.utility.primaryText
              }}>
                {confirmData.title}
              </h3>
            </div>

            {/* Message */}
            <p style={{
              margin: '0 0 24px 0',
              fontSize: '14px',
              lineHeight: '1.6',
              color: colors.utility.secondaryText
            }}>
              {confirmData.message}
            </p>

            {/* Actions */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={handleCancel}
                style={{
                  padding: '10px 20px',
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText,
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  padding: '10px 20px',
                  backgroundColor: confirmData.isDangerous ? '#EF4444' : colors.brand.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SnapshotOperationsButtonGroup;