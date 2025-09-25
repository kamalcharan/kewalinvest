// frontend/src/components/Import/RecordModal.tsx
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface RecordModalProps {
  record: {
    id: number;
    row_number: number;
    processing_status: string;
    error_messages?: string[];
    warnings?: string[];
    raw_data: any;
    mapped_data: any;
    processed_at?: string;
  };
  onClose: () => void;
}

const RecordModal: React.FC<RecordModalProps> = ({ record, onClose }) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  return (
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
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: colors.utility.primaryBackground,
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '800px',
        maxHeight: '80vh',
        overflow: 'auto',
        width: '90%'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: colors.utility.primaryText
          }}>
            Record Details - Row #{record.row_number}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: colors.utility.secondaryText,
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>

        {/* Status Section */}
        <div style={{
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '8px'
        }}>
          <h4 style={{
            fontSize: '14px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            marginBottom: '12px'
          }}>
            Processing Status
          </h4>
          <div style={{
            display: 'flex',
            gap: '24px',
            flexWrap: 'wrap'
          }}>
            <div>
              <span style={{ fontSize: '12px', color: colors.utility.secondaryText }}>Status: </span>
              <span style={{
                fontSize: '12px',
                fontWeight: '600',
                color: record.processing_status === 'success' ? colors.semantic.success : 
                       record.processing_status === 'failed' ? colors.semantic.error : 
                       colors.semantic.warning
              }}>
                {record.processing_status.toUpperCase()}
              </span>
            </div>
            {record.processed_at && (
              <div>
                <span style={{ fontSize: '12px', color: colors.utility.secondaryText }}>Processed: </span>
                <span style={{ fontSize: '12px', color: colors.utility.primaryText }}>
                  {new Date(record.processed_at).toLocaleString()}
                </span>
              </div>
            )}
          </div>
          
          {record.error_messages && record.error_messages.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: colors.semantic.error }}>
                Errors:
              </span>
              <ul style={{ margin: '4px 0 0 20px', padding: 0 }}>
                {record.error_messages.map((error, index) => (
                  <li key={index} style={{ fontSize: '12px', color: colors.semantic.error }}>
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {record.warnings && record.warnings.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: colors.semantic.warning }}>
                Warnings:
              </span>
              <ul style={{ margin: '4px 0 0 20px', padding: 0 }}>
                {record.warnings.map((warning, index) => (
                  <li key={index} style={{ fontSize: '12px', color: colors.semantic.warning }}>
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Mapped Data Section */}
        <div style={{
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '8px'
        }}>
          <h4 style={{
            fontSize: '14px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            marginBottom: '12px'
          }}>
            Mapped Data (Processed)
          </h4>
          <pre style={{
            fontSize: '12px',
            color: colors.utility.primaryText,
            backgroundColor: colors.utility.primaryBackground,
            padding: '12px',
            borderRadius: '6px',
            overflow: 'auto',
            maxHeight: '200px'
          }}>
            {JSON.stringify(record.mapped_data, null, 2)}
          </pre>
        </div>

        {/* Raw Data Section */}
        <div style={{
          padding: '16px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '8px'
        }}>
          <h4 style={{
            fontSize: '14px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            marginBottom: '12px'
          }}>
            Raw Data (Original)
          </h4>
          <pre style={{
            fontSize: '12px',
            color: colors.utility.primaryText,
            backgroundColor: colors.utility.primaryBackground,
            padding: '12px',
            borderRadius: '6px',
            overflow: 'auto',
            maxHeight: '200px'
          }}>
            {JSON.stringify(record.raw_data, null, 2)}
          </pre>
        </div>

        {/* Close Button */}
        <div style={{
          marginTop: '24px',
          textAlign: 'center'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              backgroundColor: colors.brand.primary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecordModal;