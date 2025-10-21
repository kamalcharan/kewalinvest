// frontend/src/components/visualizations/chartViewer/export/ChartExport.tsx
// Export button component with PNG export functionality

import React, { useState } from 'react';
import { Camera, Download, CheckCircle, AlertCircle } from 'lucide-react';
import type { ChartColors } from '../../../../types/chartViewer.types';
import { exportChartToPNG, generateFilename } from '../../../../utils/exportUtils';

interface ChartExportProps {
  elementId: string;
  indexName: string;
  colors: ChartColors;
  onExportStart?: () => void;
  onExportComplete?: (success: boolean) => void;
}

type ExportStatus = 'idle' | 'exporting' | 'success' | 'error';

const ChartExport: React.FC<ChartExportProps> = ({
  elementId,
  indexName,
  colors,
  onExportStart,
  onExportComplete
}) => {
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleExport = async () => {
    try {
      setStatus('exporting');
      setErrorMessage('');
      
      if (onExportStart) {
        onExportStart();
      }

      // Generate filename
      const filename = generateFilename(indexName, 'chart-export');

      // Export chart
      const result = await exportChartToPNG(elementId, { filename });

      if (result.success) {
        setStatus('success');
        if (onExportComplete) {
          onExportComplete(true);
        }

        // Reset to idle after 3 seconds
        setTimeout(() => {
          setStatus('idle');
        }, 3000);
      } else {
        throw new Error(result.error || 'Export failed');
      }
    } catch (error: any) {
      console.error('Export error:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Failed to export chart');
      
      if (onExportComplete) {
        onExportComplete(false);
      }

      // Reset to idle after 5 seconds
      setTimeout(() => {
        setStatus('idle');
        setErrorMessage('');
      }, 5000);
    }
  };

  // Get button content based on status
  const getButtonContent = () => {
    switch (status) {
      case 'exporting':
        return {
          icon: <Download size={16} />,
          text: 'Exporting...',
          color: colors.brand.primary,
          disabled: true
        };
      case 'success':
        return {
          icon: <CheckCircle size={16} />,
          text: 'Exported!',
          color: colors.semantic.success,
          disabled: true
        };
      case 'error':
        return {
          icon: <AlertCircle size={16} />,
          text: 'Failed',
          color: colors.semantic.error,
          disabled: false
        };
      case 'idle':
      default:
        return {
          icon: <Camera size={16} />,
          text: 'Export PNG',
          color: colors.utility.primaryText,
          disabled: false
        };
    }
  };

  const buttonContent = getButtonContent();

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={buttonContent.disabled}
        title="Export chart as PNG image"
        aria-label="Export chart as PNG image"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 14px',
          backgroundColor: status === 'success'
            ? colors.semantic.success + '15'
            : status === 'error'
            ? colors.semantic.error + '15'
            : colors.utility.secondaryBackground,
          color: buttonContent.color,
          border: `1px solid ${
            status === 'success'
              ? colors.semantic.success + '30'
              : status === 'error'
              ? colors.semantic.error + '30'
              : colors.utility.primaryText + '20'
          }`,
          borderRadius: '4px',
          cursor: buttonContent.disabled ? 'not-allowed' : 'pointer',
          fontSize: '12px',
          fontWeight: '500',
          transition: 'all 0.2s ease',
          minHeight: '32px',
          whiteSpace: 'nowrap',
          opacity: buttonContent.disabled && status === 'exporting' ? 0.7 : 1
        }}
        onMouseEnter={(e) => {
          if (!buttonContent.disabled && status === 'idle') {
            e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
            e.currentTarget.style.borderColor = colors.brand.primary + '50';
          }
        }}
        onMouseLeave={(e) => {
          if (!buttonContent.disabled && status === 'idle') {
            e.currentTarget.style.backgroundColor = colors.utility.secondaryBackground;
            e.currentTarget.style.borderColor = colors.utility.primaryText + '20';
          }
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            animation: status === 'exporting' ? 'spin 1s linear infinite' : 'none'
          }}
        >
          {buttonContent.icon}
        </span>
        <span>{buttonContent.text}</span>
      </button>

      {/* Error Tooltip */}
      {status === 'error' && errorMessage && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            minWidth: '200px',
            maxWidth: '300px',
            padding: '8px 12px',
            backgroundColor: colors.semantic.error,
            color: 'white',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease-in-out'
          }}
        >
          <div style={{ marginBottom: '4px', fontWeight: '600' }}>
            Export Failed
          </div>
          <div style={{ fontSize: '10px', opacity: 0.9 }}>
            {errorMessage}
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default ChartExport;