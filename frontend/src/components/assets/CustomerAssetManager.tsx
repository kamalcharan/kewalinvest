// frontend/src/components/assets/CustomerAssetManager.tsx
// Component to manage customer asset assignments (Release 1.1 - Phase 1)

import React, { useState } from 'react';
import { Package, Plus, X, Loader } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAssetTypes, useCustomerAssets } from '../../hooks/useAssetTypes';
import ConfirmationDialog from '../ui/ConfirmationDialog';

interface CustomerAssetManagerProps {
  customerId: number;
}

export const CustomerAssetManager: React.FC<CustomerAssetManagerProps> = ({ customerId }) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const { assetTypes, loading: loadingTypes } = useAssetTypes();
  const { assignments, loading: loadingAssignments, assignAssets, removeAsset } = useCustomerAssets(customerId);
  const [selectedAssets, setSelectedAssets] = useState<number[]>([]);
  const [showSelector, setShowSelector] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null);

  const assignedAssetIds = assignments.map(a => a.asset_type_id);
  const availableAssets = assetTypes.filter(at => !assignedAssetIds.includes(at.id));

  const handleAssign = async () => {
    if (selectedAssets.length === 0) return;

    try {
      setIsAssigning(true);
      await assignAssets(selectedAssets);
      setSelectedAssets([]);
      setShowSelector(false);
    } catch (error) {
      console.error('Failed to assign assets:', error);
      alert('Failed to assign assets. Please try again.');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemove = async (assetTypeId: number) => {
    try {
      await removeAsset(assetTypeId);
      setConfirmRemove(null);
    } catch (error) {
      console.error('Failed to remove asset:', error);
      alert('Failed to remove asset. Please try again.');
    }
  };

  const toggleAssetSelection = (assetTypeId: number) => {
    setSelectedAssets(prev =>
      prev.includes(assetTypeId)
        ? prev.filter(id => id !== assetTypeId)
        : [...prev, assetTypeId]
    );
  };

  if (loadingTypes || loadingAssignments) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px'
      }}>
        <Loader style={{ width: '24px', height: '24px', color: colors.semantic.info, animation: 'spin 1s linear infinite' }} />
        <span style={{ marginLeft: '12px', color: colors.utility.secondaryText }}>Loading assets...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Package style={{ width: '20px', height: '20px', color: colors.utility.secondaryText }} />
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            margin: 0
          }}>
            Asset Types
          </h3>
          <span style={{
            fontSize: '14px',
            color: colors.utility.secondaryText
          }}>
            ({assignments.length} assigned)
          </span>
        </div>
        <button
          onClick={() => setShowSelector(!showSelector)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            backgroundColor: colors.semantic.info,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          <Plus style={{ width: '16px', height: '16px' }} />
          <span>Assign Assets</span>
        </button>
      </div>

      {/* Asset Selector (if open) */}
      {showSelector && (
        <div style={{
          backgroundColor: colors.semantic.info + '10',
          border: `1px solid ${colors.semantic.info}30`,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}>
            <h4 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              margin: 0
            }}>
              Select Assets to Assign
            </h4>
            <button
              onClick={() => setShowSelector(false)}
              style={{
                padding: '4px',
                color: colors.utility.secondaryText,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <X style={{ width: '20px', height: '20px' }} />
            </button>
          </div>

          {availableAssets.length === 0 ? (
            <p style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              margin: 0
            }}>
              All assets are already assigned.
            </p>
          ) : (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '12px',
                marginBottom: '16px'
              }}>
                {availableAssets.map(asset => {
                  const isSelected = selectedAssets.includes(asset.id);
                  return (
                    <label
                      key={asset.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        border: `1px solid ${isSelected ? colors.semantic.info : colors.utility.primaryText + '20'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? colors.semantic.info + '20' : colors.utility.secondaryBackground,
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = colors.semantic.info + '50';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = colors.utility.primaryText + '20';
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleAssetSelection(asset.id)}
                        style={{
                          width: '16px',
                          height: '16px',
                          cursor: 'pointer',
                          accentColor: colors.semantic.info
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: colors.utility.primaryText,
                          marginBottom: '2px'
                        }}>
                          {asset.asset_type_name}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: colors.utility.secondaryText
                        }}>
                          {asset.category || asset.asset_type_code}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px'
              }}>
                <button
                  onClick={() => setShowSelector(false)}
                  style={{
                    padding: '10px 20px',
                    color: colors.utility.primaryText,
                    backgroundColor: colors.utility.primaryText + '10',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={selectedAssets.length === 0 || isAssigning}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    backgroundColor: colors.semantic.info,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: selectedAssets.length === 0 || isAssigning ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    opacity: selectedAssets.length === 0 || isAssigning ? 0.5 : 1,
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedAssets.length > 0 && !isAssigning) {
                      e.currentTarget.style.opacity = '0.9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedAssets.length > 0 && !isAssigning) {
                      e.currentTarget.style.opacity = '1';
                    }
                  }}
                >
                  {isAssigning && <Loader style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />}
                  <span>Assign {selectedAssets.length > 0 && `(${selectedAssets.length})`}</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Assigned Assets List */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '16px'
      }}>
        {assignments.length === 0 ? (
          <div style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '60px 20px',
            color: colors.utility.secondaryText
          }}>
            <Package style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 16px',
              color: colors.utility.primaryText + '30'
            }} />
            <p style={{
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '8px',
              color: colors.utility.primaryText
            }}>
              No assets assigned yet
            </p>
            <p style={{ fontSize: '14px', margin: 0 }}>
              Click "Assign Assets" to get started
            </p>
          </div>
        ) : (
          assignments.map(assignment => (
            <div
              key={assignment.id}
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                border: `1px solid ${colors.utility.primaryText}10`,
                borderRadius: '12px',
                padding: '16px',
                transition: 'box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      backgroundColor: colors.utility.primaryText + '10',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      color: colors.utility.primaryText,
                      fontWeight: '600'
                    }}>
                      {assignment.asset_type?.asset_type_code}
                    </span>
                    <h4 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: colors.utility.primaryText,
                      margin: 0
                    }}>
                      {assignment.asset_type?.asset_type_name}
                    </h4>
                  </div>

                  {assignment.asset_type?.category && (
                    <p style={{
                      fontSize: '14px',
                      color: colors.utility.secondaryText,
                      margin: '0 0 8px 0'
                    }}>
                      {assignment.asset_type.category}
                    </p>
                  )}

                  {assignment.asset_type?.default_assumption_rate && (
                    <p style={{
                      fontSize: '12px',
                      color: colors.semantic.success,
                      margin: '0 0 8px 0'
                    }}>
                      Expected growth: {assignment.asset_type.default_assumption_rate}% / year
                    </p>
                  )}

                  {assignment.notes && (
                    <p style={{
                      fontSize: '12px',
                      color: colors.utility.secondaryText,
                      margin: '8px 0',
                      fontStyle: 'italic',
                      padding: '8px',
                      backgroundColor: colors.utility.primaryText + '05',
                      borderRadius: '6px'
                    }}>
                      Note: {assignment.notes}
                    </p>
                  )}

                  <p style={{
                    fontSize: '11px',
                    color: colors.utility.secondaryText,
                    margin: '8px 0 0 0'
                  }}>
                    Assigned {new Date(assignment.assigned_at).toLocaleDateString()}
                  </p>
                </div>

                <button
                  onClick={() => setConfirmRemove(assignment.asset_type_id)}
                  style={{
                    padding: '4px',
                    color: colors.semantic.error,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'opacity 0.2s',
                    flexShrink: 0
                  }}
                  title="Remove asset"
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  <X style={{ width: '20px', height: '20px' }} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmRemove !== null}
        onClose={() => setConfirmRemove(null)}
        onConfirm={() => confirmRemove !== null && handleRemove(confirmRemove)}
        title="Remove Asset Assignment"
        description="Are you sure you want to remove this asset assignment? This action cannot be undone."
        confirmText="Remove"
        cancelText="Cancel"
        type="warning"
      />
    </div>
  );
};
