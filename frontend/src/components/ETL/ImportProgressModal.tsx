// frontend/src/components/ETL/ImportProgressModal.tsx
import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Loader2, X } from 'lucide-react';
import api from '../../utils/api';

interface ImportProgressModalProps {
  isOpen: boolean;
  sessionId: number | null;
  sessionName: string;
  onClose: () => void;
  onViewDashboard: () => void;
}

interface ProgressData {
  sessionId: number;
  sessionName: string;
  importType: string;
  status: string;
  totalRows: number;
  pendingRows: number;
  processingRows: number;
  successRows: number;
  failedRows: number;
  completionPercentage: number;
  estimatedTimeRemaining: number | null;
  current_stage?: string;
}

export const ImportProgressModal: React.FC<ImportProgressModalProps> = ({
  isOpen,
  sessionId,
  sessionName,
  onClose,
  onViewDashboard
}) => {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen || !sessionId) return;

    let intervalId: NodeJS.Timeout;

    const fetchProgress = async () => {
      try {
        const response = await api.get(`/api/import/status/${sessionId}`);

        if (response.data.success) {
          const data = response.data.data;
          setProgress(data);

          // Check if processing is complete
          if (data.status === 'completed' || data.status === 'completed_with_errors' || data.status === 'failed') {
            setIsComplete(true);
            if (data.status === 'failed') {
              setHasError(true);
              setErrorMessage(data.error_summary || 'Import failed');
            }
            clearInterval(intervalId);
          }
        }
      } catch (error: any) {
        console.error('Error fetching progress:', error);
        setHasError(true);
        setErrorMessage(error.response?.data?.error || 'Failed to fetch progress');
        clearInterval(intervalId);
      }
    };

    // Initial fetch
    fetchProgress();

    // Poll every 2 seconds
    intervalId = setInterval(fetchProgress, 2000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOpen, sessionId]);

  if (!isOpen) return null;

  const getStageLabel = (stage?: string) => {
    switch (stage) {
      case 'parsing':
        return 'Parsing file...';
      case 'staging':
        return 'Loading data into staging...';
      case 'validating':
        return 'Validating records...';
      case 'processing':
        return 'Processing records...';
      case 'completed':
        return 'Completed!';
      case 'failed':
        return 'Failed';
      default:
        return 'Initializing...';
    }
  };

  const getStageIcon = (stage?: string) => {
    if (hasError) {
      return <XCircle className="w-6 h-6 text-red-500" />;
    }

    if (isComplete) {
      return <CheckCircle className="w-6 h-6 text-green-500" />;
    }

    return <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />;
  };

  const formatTime = (seconds: number | null) => {
    if (!seconds) return 'Calculating...';

    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else {
      const mins = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return `${mins}m ${secs}s`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            {getStageIcon(progress?.current_stage)}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {isComplete ? 'Import Completed' : 'Processing Import'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {sessionName}
              </p>
            </div>
          </div>
          {isComplete && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Stage */}
          {!isComplete && progress && (
            <div className="text-center">
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {getStageLabel(progress.current_stage)}
              </p>
            </div>
          )}

          {/* Progress Bar */}
          {progress && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Progress
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {Math.round(progress.completionPercentage || 0)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    hasError
                      ? 'bg-red-500'
                      : isComplete
                      ? 'bg-green-500'
                      : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(progress.completionPercentage || 0, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Statistics */}
          {progress && (
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {progress.totalRows}
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Success</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {progress.successRows}
                </p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Failed</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {progress.failedRows}
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {progress.pendingRows}
                </p>
              </div>
            </div>
          )}

          {/* Estimated Time Remaining */}
          {!isComplete && progress && progress.estimatedTimeRemaining && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-center">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Estimated time remaining: <strong>{formatTime(progress.estimatedTimeRemaining)}</strong>
              </p>
            </div>
          )}

          {/* Error Message */}
          {hasError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-red-900 dark:text-red-300 mb-1">
                    Import Failed
                  </h3>
                  <p className="text-sm text-red-800 dark:text-red-200">
                    {errorMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success Summary */}
          {isComplete && !hasError && progress && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-green-900 dark:text-green-300 mb-1">
                    Import Completed Successfully
                  </h3>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Processed {progress.totalRows} records: {progress.successRows} successful
                    {progress.failedRows > 0 && `, ${progress.failedRows} failed`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stage Checklist */}
          {!isComplete && progress && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                {['parsing', 'staging', 'validating', 'processing'].indexOf(progress.current_stage || '') >= 0 ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                )}
                <span className="text-sm text-gray-700 dark:text-gray-300">File parsed</span>
              </div>
              <div className="flex items-center space-x-2">
                {['staging', 'validating', 'processing'].indexOf(progress.current_stage || '') >= 0 ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : progress.current_stage === 'parsing' ? (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                )}
                <span className="text-sm text-gray-700 dark:text-gray-300">Data loaded into staging</span>
              </div>
              <div className="flex items-center space-x-2">
                {['validating', 'processing'].indexOf(progress.current_stage || '') >= 0 ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : progress.current_stage === 'staging' ? (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                )}
                <span className="text-sm text-gray-700 dark:text-gray-300">Validation complete</span>
              </div>
              <div className="flex items-center space-x-2">
                {progress.current_stage === 'processing' ? (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                )}
                <span className="text-sm text-gray-700 dark:text-gray-300">Processing records</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {isComplete && (
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <button
              onClick={onClose}
              className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
            <button
              onClick={onViewDashboard}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
            >
              View Import Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
