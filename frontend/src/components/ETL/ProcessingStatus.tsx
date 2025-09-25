import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { API_ENDPOINTS } from '../../services/serviceURLs';

interface ProcessingStatusProps {
  sessionId: number;
  sessionName: string;
  onProcessingComplete: (results: any) => void;
  onError: (error: string) => void;
  onCancel?: () => void;
}

interface ProcessingState {
  status: 'pending' | 'staged' | 'processing' | 'completed' | 'completed_with_errors' | 'failed' | 'cancelled';
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  duplicateRecords: number;
  processingSpeed: number;
  estimatedTimeRemaining: number;
  currentOperation: string;
  lastUpdate: string;
  errorSummary?: string;
  processingStartedAt?: string;
}

interface ProcessingApiResponse {
  success: boolean;
  data?: {
    status: string;
    totalRecords?: number;
    processedRecords?: number;
    successfulRecords?: number;
    failedRecords?: number;
    duplicateRecords?: number;
    processingStartedAt?: string;
    errorSummary?: string;
    currentOperation?: string;
  };
  error?: string;
}

// Progress messages for better UX
const PROCESSING_MESSAGES = [
  { range: [0, 10], message: 'Initializing import process...' },
  { range: [10, 20], message: 'Validating customer records...' },
  { range: [20, 35], message: 'Checking for duplicate entries...' },
  { range: [35, 50], message: 'Creating contact profiles...' },
  { range: [50, 65], message: 'Establishing customer relationships...' },
  { range: [65, 80], message: 'Verifying data integrity...' },
  { range: [80, 90], message: 'Updating database indexes...' },
  { range: [90, 95], message: 'Finalizing import process...' },
  { range: [95, 100], message: 'Generating import summary...' }
];

const ProcessingStatus: React.FC<ProcessingStatusProps> = ({
  sessionId,
  sessionName,
  onProcessingComplete,
  onError,
  onCancel
}) => {
  const { theme, isDarkMode } = useTheme();
  const { tenantId, environment } = useAuth();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  
  const [processingState, setProcessingState] = useState<ProcessingState>({
    status: 'pending',
    totalRecords: 0,
    processedRecords: 0,
    successfulRecords: 0,
    failedRecords: 0,
    duplicateRecords: 0,
    processingSpeed: 0,
    estimatedTimeRemaining: 0,
    currentOperation: 'Initializing import process...',
    lastUpdate: new Date().toISOString()
  });

  const [logs, setLogs] = useState<string[]>([]);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isPolling, setIsPolling] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const lastLoggedPercentage = useRef(0);

  // Initialize with welcome log
  useEffect(() => {
    addLog('Import processing session started');
  }, []);

  // Poll processing status with retry logic
  useEffect(() => {
    if (!isPolling) return;

    const pollStatus = async () => {
      try {
        const token = localStorage.getItem('access_token');
        
        if (!token) {
          onError('Authentication token not found');
          setIsPolling(false);
          return;
        }

        const response = await fetch(API_ENDPOINTS.IMPORT.STATUS(sessionId), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...(tenantId && { 'X-Tenant-ID': String(tenantId) }),
            ...(environment && { 'X-Environment': environment })
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result: ProcessingApiResponse = await response.json();

        if (result.success && result.data) {
          const data = result.data;
          
          setProcessingState(prev => {
            const newState = {
              ...prev,
              status: data.status as ProcessingState['status'],
              totalRecords: data.totalRecords ?? prev.totalRecords,
              processedRecords: data.processedRecords ?? prev.processedRecords,
              successfulRecords: data.successfulRecords ?? prev.successfulRecords,
              failedRecords: data.failedRecords ?? prev.failedRecords,
              duplicateRecords: data.duplicateRecords ?? prev.duplicateRecords,
              processingStartedAt: data.processingStartedAt ?? prev.processingStartedAt,
              processingSpeed: calculateSpeed(
                data.processedRecords ?? prev.processedRecords, 
                data.processingStartedAt ?? prev.processingStartedAt
              ),
              estimatedTimeRemaining: calculateETA(
                data.totalRecords ?? prev.totalRecords,
                data.processedRecords ?? prev.processedRecords,
                data.processingStartedAt ?? prev.processingStartedAt
              ),
              currentOperation: data.currentOperation ?? getOperationText(data),
              lastUpdate: new Date().toISOString(),
              errorSummary: data.errorSummary
            };

            // Add log entry for status changes
            if (data.status !== prev.status) {
              switch (data.status) {
                case 'staged':
                  addLog('Data staging completed, starting processing...');
                  break;
                case 'processing':
                  addLog('Processing started - this will take approximately 30-45 seconds');
                  break;
                case 'completed':
                  addLog(`✓ Import completed successfully - ${data.successfulRecords || 0} records imported`);
                  break;
                case 'completed_with_errors':
                  addLog(`⚠ Import completed with ${data.failedRecords || 0} errors`);
                  break;
                default:
                  addLog(`Status changed to: ${data.status.toUpperCase()}`);
              }
            }

            // Add periodic progress logs during processing - WITH NULL CHECKS
            if (data.status === 'processing' && 
                data.processedRecords !== undefined && 
                data.processedRecords > 0 && 
                data.totalRecords !== undefined && 
                data.totalRecords > 0) {
              const percentage = Math.round((data.processedRecords / data.totalRecords) * 100);
              
              // Log at specific milestones
              if (percentage >= 25 && lastLoggedPercentage.current < 25) {
                addLog('25% complete - validating records...');
                lastLoggedPercentage.current = 25;
              } else if (percentage >= 50 && lastLoggedPercentage.current < 50) {
                addLog('50% complete - creating customer profiles...');
                lastLoggedPercentage.current = 50;
              } else if (percentage >= 75 && lastLoggedPercentage.current < 75) {
                addLog('75% complete - establishing relationships...');
                lastLoggedPercentage.current = 75;
              } else if (percentage >= 90 && lastLoggedPercentage.current < 90) {
                addLog('90% complete - finalizing import...');
                lastLoggedPercentage.current = 90;
              }
            }

            return newState;
          });

          // Handle terminal states
          if (data.status === 'completed' || data.status === 'completed_with_errors') {
            setIsPolling(false);
            onProcessingComplete(data);
          } else if (data.status === 'failed') {
            setIsPolling(false);
            onError(data.errorSummary || 'Processing failed');
          } else if (data.status === 'cancelled') {
            setIsPolling(false);
          }

          // Reset retry count on success
          retryCountRef.current = 0;

        } else {
          throw new Error(result.error || 'Invalid response from server');
        }

      } catch (error: any) {
        console.error('Error polling status:', error);
        
        retryCountRef.current++;
        
        if (retryCountRef.current <= maxRetries) {
          addLog(`Connection error, retrying... (${retryCountRef.current}/${maxRetries})`);
        } else {
          addLog('Max retries exceeded. Stopping status updates.');
          setIsPolling(false);
          onError('Failed to get processing status after multiple attempts');
        }
      }
    };

    // Initial status check
    pollStatus();

    // Set up polling interval
    intervalRef.current = setInterval(pollStatus, 2000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [sessionId, isPolling, onProcessingComplete, onError, tenantId, environment]);

  // Auto-scroll logs
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Calculate processing speed (records per second)
  const calculateSpeed = (processed: number, startTime?: string): number => {
    if (!startTime || processed <= 0) return 0;
    
    try {
      const elapsed = (Date.now() - new Date(startTime).getTime()) / 1000;
      return elapsed > 0 ? Math.round(processed / elapsed) : 0;
    } catch {
      return 0;
    }
  };

  // Calculate estimated time remaining
  const calculateETA = (total: number, processed: number, startTime?: string): number => {
    if (!total || !processed || processed <= 0 || !startTime) return 0;
    
    const remaining = total - processed;
    const speed = calculateSpeed(processed, startTime);
    
    return speed > 0 ? Math.round(remaining / speed) : 0;
  };

  // Get current operation text based on progress
  const getOperationText = (data: any): string => {
    const status = data.status || 'unknown';
    const processed = data.processedRecords || 0;
    const total = data.totalRecords || 0;
    
    switch (status) {
      case 'pending':
        return 'Waiting to start processing...';
      
      case 'staged':
        return 'Preparing data for import...';
      
      case 'processing':
        if (total > 0 && processed > 0) {
          const percentage = Math.round((processed / total) * 100);
          
          // Find the appropriate message based on percentage
          const messageEntry = PROCESSING_MESSAGES.find(
            entry => percentage >= entry.range[0] && percentage < entry.range[1]
          );
          
          if (messageEntry) {
            return messageEntry.message;
          }
          
          // Fallback for edge cases
          if (percentage === 100) {
            return 'Completing final tasks...';
          }
          return 'Processing customer data...';
        }
        return 'Starting data processing...';
      
      case 'completed':
        return 'Import completed successfully';
      
      case 'completed_with_errors':
        return 'Import completed with some errors';
      
      case 'failed':
        return 'Import processing failed';
      
      case 'cancelled':
        return 'Import was cancelled';
      
      default:
        return 'Processing...';
    }
  };

  // Add log entry with timestamp
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-49), `[${timestamp}] ${message}`]); // Keep last 50 logs
  };

  // Handle cancel request
  const handleCancelRequest = () => {
    setShowCancelDialog(true);
  };

  const confirmCancel = async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        onError('Authentication token not found');
        return;
      }

      const response = await fetch(API_ENDPOINTS.IMPORT.CANCEL(sessionId), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(tenantId && { 'X-Tenant-ID': String(tenantId) }),
          ...(environment && { 'X-Environment': environment })
        }
      });

      const result = await response.json();

      if (result.success) {
        addLog('Cancellation request sent');
        setShowCancelDialog(false);
        setIsPolling(false);
        if (onCancel) onCancel();
      } else {
        onError(`Failed to cancel: ${result.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      onError('Network error while cancelling process');
    }
  };

  // Format time duration
  const formatTime = (seconds: number): string => {
    if (seconds < 0) return '0s';
    if (seconds < 60) return `${seconds}s`;
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes < 60) {
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  // Get progress percentage
  const getProgressPercentage = (): number => {
    if (processingState.totalRecords <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round(
      (processingState.processedRecords / processingState.totalRecords) * 100
    )));
  };

  // Status icons
  const StatusIcon = () => {
    switch (processingState.status) {
      case 'pending':
      case 'staged':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12,6 12,12 16,14" />
          </svg>
        );
      case 'processing':
        return (
          <div style={{
            width: '24px',
            height: '24px',
            border: `3px solid ${colors.semantic.info}30`,
            borderTop: `3px solid ${colors.semantic.info}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        );
      case 'completed':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22,4 12,14.01 9,11.01" />
          </svg>
        );
      case 'completed_with_errors':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22,4 12,14.01 9,11.01" />
            <circle cx="12" cy="12" r="10" strokeDasharray="5,5" />
          </svg>
        );
      case 'failed':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        );
      case 'cancelled':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (processingState.status) {
      case 'pending': return colors.utility.secondaryText;
      case 'staged': return colors.semantic.info;
      case 'processing': return colors.semantic.info;
      case 'completed': return colors.semantic.success;
      case 'completed_with_errors': return colors.semantic.warning;
      case 'failed': return colors.semantic.error;
      case 'cancelled': return colors.utility.secondaryText;
      default: return colors.utility.secondaryText;
    }
  };

  return (
    <div style={{ padding: '40px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px', textAlign: 'center' as const }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: colors.utility.primaryText,
          marginBottom: '8px',
          margin: 0
        }}>
          Processing Import
        </h2>
        <p style={{
          fontSize: '16px',
          color: colors.utility.secondaryText,
          margin: 0
        }}>
          {sessionName}
        </p>
      </div>

      {/* Status Card */}
      <div style={{
        backgroundColor: colors.utility.primaryBackground,
        borderRadius: '16px',
        border: `1px solid ${colors.utility.primaryText}10`,
        padding: '32px',
        marginBottom: '32px',
        textAlign: 'center' as const
      }}>
        {/* Status Icon */}
        <div style={{
          color: getStatusColor(),
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <StatusIcon />
        </div>

        {/* Status Text */}
        <h3 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: colors.utility.primaryText,
          marginBottom: '8px',
          margin: 0
        }}>
          {processingState.status === 'completed_with_errors' 
            ? 'Completed with Errors'
            : processingState.status.charAt(0).toUpperCase() + processingState.status.slice(1)}
        </h3>

        <p style={{
          fontSize: '14px',
          color: colors.utility.secondaryText,
          margin: '0 0 24px 0'
        }}>
          {processingState.currentOperation}
        </p>

        {/* Progress Bar */}
        {processingState.totalRecords > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: colors.utility.primaryText
              }}>
                {processingState.processedRecords.toLocaleString()} of {processingState.totalRecords.toLocaleString()} records
              </span>
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: colors.brand.primary
              }}>
                {getProgressPercentage()}%
              </span>
            </div>

            <div style={{
              width: '100%',
              height: '12px',
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '6px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${getProgressPercentage()}%`,
                height: '100%',
                backgroundColor: colors.brand.primary,
                borderRadius: '6px',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ textAlign: 'center' as const }}>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              color: colors.semantic.success,
              marginBottom: '4px'
            }}>
              {processingState.successfulRecords.toLocaleString()}
            </div>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText
            }}>
              Successful
            </div>
          </div>

          <div style={{ textAlign: 'center' as const }}>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              color: colors.semantic.error,
              marginBottom: '4px'
            }}>
              {processingState.failedRecords.toLocaleString()}
            </div>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText
            }}>
              Failed
            </div>
          </div>

          <div style={{ textAlign: 'center' as const }}>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              color: colors.semantic.warning,
              marginBottom: '4px'
            }}>
              {processingState.duplicateRecords.toLocaleString()}
            </div>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText
            }}>
              Duplicates
            </div>
          </div>

          {processingState.processingSpeed > 0 && (
            <div style={{ textAlign: 'center' as const }}>
              <div style={{
                fontSize: '24px',
                fontWeight: '700',
                color: colors.semantic.info,
                marginBottom: '4px'
              }}>
                {processingState.processingSpeed.toLocaleString()}
              </div>
              <div style={{
                fontSize: '12px',
                color: colors.utility.secondaryText
              }}>
                Records/sec
              </div>
            </div>
          )}

          {processingState.estimatedTimeRemaining > 0 && (
            <div style={{ textAlign: 'center' as const }}>
              <div style={{
                fontSize: '24px',
                fontWeight: '700',
                color: colors.utility.primaryText,
                marginBottom: '4px'
              }}>
                {formatTime(processingState.estimatedTimeRemaining)}
              </div>
              <div style={{
                fontSize: '12px',
                color: colors.utility.secondaryText
              }}>
                Remaining
              </div>
            </div>
          )}
        </div>

        {/* Cancel Button */}
        {(processingState.status === 'pending' || processingState.status === 'staged' || processingState.status === 'processing') && (
          <button
            onClick={handleCancelRequest}
            style={{
              backgroundColor: 'transparent',
              color: colors.semantic.error,
              border: `1px solid ${colors.semantic.error}`,
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = colors.semantic.error + '10';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Cancel Import
          </button>
        )}
      </div>

      {/* Processing Logs */}
      <div style={{
        backgroundColor: colors.utility.primaryBackground,
        borderRadius: '12px',
        border: `1px solid ${colors.utility.primaryText}10`,
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px 20px',
          backgroundColor: colors.utility.secondaryBackground,
          borderBottom: `1px solid ${colors.utility.primaryText}10`,
          fontSize: '14px',
          fontWeight: '600',
          color: colors.utility.primaryText,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>Processing Logs</span>
          {logs.length > 0 && (
            <span style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              fontWeight: '400'
            }}>
              {logs.length} entries
            </span>
          )}
        </div>

        <div style={{
          height: '200px',
          overflowY: 'auto',
          padding: '16px 20px',
          fontFamily: 'monospace',
          fontSize: '12px',
          lineHeight: '1.5',
          backgroundColor: colors.utility.primaryBackground
        }}>
          {logs.length === 0 ? (
            <div style={{ 
              color: colors.utility.secondaryText, 
              fontStyle: 'italic',
              textAlign: 'center' as const,
              paddingTop: '60px'
            }}>
              Processing logs will appear here...
            </div>
          ) : (
            <>
              {logs.map((log, index) => (
                <div key={index} style={{ 
                  color: colors.utility.primaryText, 
                  marginBottom: '4px',
                  wordBreak: 'break-word' as const
                }}>
                  {log}
                </div>
              ))}
              <div ref={logEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      {showCancelDialog && (
        <div style={{
          position: 'fixed' as const,
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
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <h4 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              marginBottom: '16px',
              margin: 0
            }}>
              Cancel Import?
            </h4>
            <p style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              marginBottom: '24px',
              margin: 0,
              lineHeight: '1.5'
            }}>
              Are you sure you want to cancel the import process? This action cannot be undone and all progress will be lost.
            </p>
            
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowCancelDialog(false)}
                style={{
                  backgroundColor: 'transparent',
                  color: colors.utility.secondaryText,
                  border: `1px solid ${colors.utility.primaryText}30`,
                  borderRadius: '6px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                Keep Processing
              </button>
              <button
                onClick={confirmCancel}
                style={{
                  backgroundColor: colors.semantic.error,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500'
                }}
              >
                Cancel Import
              </button>
            </div>
          </div>
        </div>
      )}

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

export default ProcessingStatus;