// frontend/src/components/ETL/RecordEditModal.tsx

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { API_ENDPOINTS } from '../../services/serviceURLs';
import { toastService } from '../../services/toast.service';

interface RecordEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: StagingRecord;
  onSaveSuccess: () => void;
  onError: (error: string) => void;
}

interface StagingRecord {
  id: number;
  import_session_id: number;
  row_number: number;
  raw_data: any;
  mapped_data: any;
  status: string;
  error_messages: string[];
  warnings: string[];
  match_type?: string;
  match_confidence?: string;
  ambiguous_matches?: Array<{
    id: number;
    name: string;
    pan: string | null;
  }>;
  edited_at?: string;
  edit_history?: Array<{
    edited_at: string;
    edited_by: number;
    field: string;
    old_value: any;
    new_value: any;
  }>;
}

const RecordEditModal: React.FC<RecordEditModalProps> = ({
  isOpen,
  onClose,
  record,
  onSaveSuccess,
  onError
}) => {
  const { theme, isDarkMode } = useTheme();
  const { tenantId, environment } = useAuth();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [editedData, setEditedData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (isOpen && record) {
      setEditedData({ ...record.mapped_data });
      setShowHistory(false);
    }
  }, [isOpen, record]);

  if (!isOpen) return null;

  const handleFieldChange = (field: string, value: any) => {
    setEditedData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const token = localStorage.getItem('access_token');
      if (!token) {
        toastService.error('Authentication token not found');
        onError('Authentication token not found');
        return;
      }

      const response = await fetch(
        API_ENDPOINTS.IMPORT.EDIT_STAGING_RECORD(record.id),
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...(tenantId && { 'X-Tenant-ID': String(tenantId) }),
            ...(environment && { 'X-Environment': environment })
          },
          body: JSON.stringify({ editedData })
        }
      );

      const result = await response.json();

      if (result.success) {
        toastService.success(`Record #${record.row_number} saved. Click "Save & Reprocess" to process it.`);
        onSaveSuccess();
        onClose();
      } else {
        toastService.error(result.error || 'Failed to save changes');
        onError(result.error || 'Failed to save changes');
      }
    } catch (error: any) {
      toastService.error(error.message || 'Failed to save changes');
      onError(error.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndReprocess = async () => {
    const loadingToastId = toastService.loading(`Processing Record #${record.row_number}...`);

    try {
      setIsReprocessing(true);

      // First save the edits
      const token = localStorage.getItem('access_token');
      if (!token) {
        toastService.dismiss(loadingToastId);
        toastService.error('Authentication token not found');
        onError('Authentication token not found');
        return;
      }

      const editResponse = await fetch(
        API_ENDPOINTS.IMPORT.EDIT_STAGING_RECORD(record.id),
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...(tenantId && { 'X-Tenant-ID': String(tenantId) }),
            ...(environment && { 'X-Environment': environment })
          },
          body: JSON.stringify({ editedData })
        }
      );

      const editResult = await editResponse.json();

      if (!editResult.success) {
        toastService.dismiss(loadingToastId);
        toastService.error(editResult.error || 'Failed to save changes');
        onError(editResult.error || 'Failed to save changes');
        return;
      }

      // Then reprocess the record
      const reprocessResponse = await fetch(
        API_ENDPOINTS.IMPORT.REPROCESS_SINGLE_RECORD(record.id),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...(tenantId && { 'X-Tenant-ID': String(tenantId) }),
            ...(environment && { 'X-Environment': environment })
          }
        }
      );

      const reprocessResult = await reprocessResponse.json();
      toastService.dismiss(loadingToastId);

      // Show result based on actual status (success, duplicate, orphan, failed)
      const status = reprocessResult.status || (reprocessResult.success ? 'success' : 'failed');

      if (status === 'success') {
        toastService.success(`Record #${record.row_number} processed successfully!`);
      } else if (status === 'duplicate') {
        toastService.warning(`Record #${record.row_number} is a duplicate. ${reprocessResult.message || ''}`);
      } else if (status === 'orphan') {
        toastService.warning(`Record #${record.row_number} is orphan (no matching customer). ${reprocessResult.message || ''}`);
      } else {
        toastService.error(`Record #${record.row_number} failed: ${reprocessResult.message || 'Processing failed'}`);
      }

      onSaveSuccess();
      onClose();
    } catch (error: any) {
      toastService.dismiss(loadingToastId);
      toastService.error(error.message || 'Failed to save and reprocess');
      onError(error.message || 'Failed to save and reprocess');
    } finally {
      setIsReprocessing(false);
    }
  };

  const getFieldLabel = (key: string): string => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const renderFieldEditor = (key: string, value: any) => {
    const isDate = key.includes('date') || key.includes('_at');
    const isNumeric = typeof value === 'number' || ['amount', 'units', 'nav', 'quantity'].some(k => key.includes(k));

    return (
      <div
        key={key}
        style={{
          marginBottom: '16px'
        }}
      >
        <label
          style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 500,
            color: colors.utility.primaryText,
            marginBottom: '6px'
          }}
        >
          {getFieldLabel(key)}
        </label>
        <input
          type={isDate ? 'date' : isNumeric ? 'number' : 'text'}
          value={editedData[key] || ''}
          onChange={(e) => handleFieldChange(key, e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '14px',
            color: colors.utility.primaryText,
            backgroundColor: colors.utility.secondaryBackground,
            border: `1px solid ${colors.utility.secondaryText}20`,
            borderRadius: '6px',
            outline: 'none',
            transition: 'border-color 0.2s ease'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = colors.brand.primary;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = `${colors.utility.secondaryText}20`;
          }}
        />
      </div>
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          maxWidth: '800px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px',
            borderBottom: `1px solid ${colors.utility.secondaryText}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 600,
                color: colors.utility.primaryText
              }}
            >
              Edit Record #{record.row_number}
            </h2>
            <p
              style={{
                margin: '6px 0 0 0',
                fontSize: '13px',
                color: colors.utility.secondaryText
              }}
            >
              Status: {record.status} | Session: {record.import_session_id}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: colors.utility.secondaryText,
              padding: '0',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.semantic.error + '20';
              e.currentTarget.style.color = colors.semantic.error;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = colors.utility.secondaryText;
            }}
          >
            ×
          </button>
        </div>

        {/* Error/Warning Section */}
        {(record.error_messages?.length > 0 || record.ambiguous_matches) && (
          <div
            style={{
              padding: '16px 24px',
              backgroundColor: `${colors.semantic.error}10`,
              borderBottom: `1px solid ${colors.utility.secondaryText}20`
            }}
          >
            {record.error_messages?.length > 0 && (
              <div style={{ marginBottom: record.ambiguous_matches ? '12px' : 0 }}>
                <strong style={{ fontSize: '13px', color: colors.semantic.error }}>
                  Errors:
                </strong>
                <ul
                  style={{
                    margin: '6px 0 0 0',
                    paddingLeft: '20px',
                    fontSize: '13px',
                    color: colors.utility.primaryText
                  }}
                >
                  {record.error_messages.map((msg, idx) => (
                    <li key={idx}>{msg}</li>
                  ))}
                </ul>
              </div>
            )}

            {record.ambiguous_matches && record.ambiguous_matches.length > 0 && (
              <div>
                <strong style={{ fontSize: '13px', color: colors.semantic.warning }}>
                  Ambiguous Matches Found:
                </strong>
                <div
                  style={{
                    marginTop: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  {record.ambiguous_matches.map((match) => (
                    <div
                      key={match.id}
                      style={{
                        padding: '8px',
                        backgroundColor: colors.utility.secondaryBackground,
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: colors.utility.primaryText
                      }}
                    >
                      {match.name} {match.pan && `(PAN: ${match.pan})`} - ID: {match.id}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Body - Scrollable */}
        <div
          style={{
            flex: 1,
            padding: '24px',
            overflowY: 'auto'
          }}
        >
          {/* Edit History Toggle */}
          {record.edit_history && record.edit_history.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <button
                onClick={() => setShowHistory(!showHistory)}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  color: colors.brand.primary,
                  backgroundColor: 'transparent',
                  border: `1px solid ${colors.brand.primary}`,
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                {showHistory ? 'Hide' : 'Show'} Edit History ({record.edit_history.length})
              </button>

              {showHistory && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '12px',
                    backgroundColor: colors.utility.primaryBackground,
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                >
                  {record.edit_history.map((edit, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '8px 0',
                        borderBottom:
                          idx < record.edit_history!.length - 1
                            ? `1px solid ${colors.utility.secondaryText}20`
                            : 'none',
                        color: colors.utility.secondaryText
                      }}
                    >
                      <div>
                        <strong style={{ color: colors.utility.primaryText }}>{edit.field}:</strong>{' '}
                        {String(edit.old_value)} → {String(edit.new_value)}
                      </div>
                      <div style={{ fontSize: '11px', marginTop: '4px' }}>
                        {new Date(edit.edited_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Field Editors */}
          <div>
            <h3
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: colors.utility.primaryText,
                marginBottom: '16px'
              }}
            >
              Edit Fields
            </h3>
            {Object.keys(editedData).map((key) => renderFieldEditor(key, editedData[key]))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '20px 24px',
            borderTop: `1px solid ${colors.utility.secondaryText}20`,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}
        >
          <button
            onClick={onClose}
            disabled={isSaving || isReprocessing}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 500,
              color: colors.utility.primaryText,
              backgroundColor: colors.utility.primaryBackground,
              border: `1px solid ${colors.utility.secondaryText}20`,
              borderRadius: '6px',
              cursor: isSaving || isReprocessing ? 'not-allowed' : 'pointer',
              opacity: isSaving || isReprocessing ? 0.6 : 1
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving || isReprocessing}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#fff',
              backgroundColor: colors.brand.primary,
              border: 'none',
              borderRadius: '6px',
              cursor: isSaving || isReprocessing ? 'not-allowed' : 'pointer',
              opacity: isSaving || isReprocessing ? 0.6 : 1
            }}
          >
            {isSaving ? 'Saving...' : 'Save Only'}
          </button>

          <button
            onClick={handleSaveAndReprocess}
            disabled={isSaving || isReprocessing}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#fff',
              backgroundColor: colors.semantic.success,
              border: 'none',
              borderRadius: '6px',
              cursor: isSaving || isReprocessing ? 'not-allowed' : 'pointer',
              opacity: isSaving || isReprocessing ? 0.6 : 1
            }}
          >
            {isReprocessing ? 'Processing...' : 'Save & Reprocess'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecordEditModal;
