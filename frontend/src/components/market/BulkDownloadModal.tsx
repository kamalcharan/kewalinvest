// frontend/src/components/market/BulkDownloadModal.tsx
// Modal for bulk historical data download

import React, { useState, useEffect } from 'react';
import { X, Download, Calendar, AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { MarketIndex } from '../../types/market.types';
import { useBulkDownload } from '../../hooks/useMarketData';

interface BulkDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIndices: MarketIndex[];
  onSuccess?: () => void;
}

export const BulkDownloadModal: React.FC<BulkDownloadModalProps> = ({
  isOpen,
  onClose,
  selectedIndices,
  onSuccess
}) => {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');

  const {
    bulkDownload,
    isProcessing,
    progress,
    results,
    error,
    isComplete
  } = useBulkDownload(() => {
    onSuccess?.();
  });

  // Set default date range (20 years)
  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const twentyYearsAgo = new Date(today);
      twentyYearsAgo.setFullYear(today.getFullYear() - 20);
      
      setEndDate(today.toISOString().split('T')[0]);
      setStartDate(twentyYearsAgo.toISOString().split('T')[0]);
      setValidationError('');
    }
  }, [isOpen]);

  // Reset when complete
  useEffect(() => {
    if (isComplete && !isProcessing) {
      // Auto-close after 3 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, isProcessing]);

  const handleClose = () => {
    if (!isProcessing) {
      onClose();
    }
  };

  const validateDates = (): boolean => {
    if (!startDate || !endDate) {
      setValidationError('Both start and end dates are required');
      return false;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();

    if (start >= end) {
      setValidationError('Start date must be before end date');
      return false;
    }

    if (end > today) {
      setValidationError('End date cannot be in the future');
      return false;
    }

    const minDate = new Date('2000-01-01');
    if (start < minDate) {
      setValidationError('Start date cannot be before 2000-01-01');
      return false;
    }

    const rangeDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const maxDays = 20 * 365;

    if (rangeDays > maxDays) {
      setValidationError('Date range cannot exceed 20 years');
      return false;
    }

    setValidationError('');
    return true;
  };

  const handleDownload = async () => {
    if (!validateDates()) return;

    const indexIds = selectedIndices.map(idx => idx.id);
    await bulkDownload(indexIds, startDate, endDate);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Download className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Bulk Historical Download
              </h2>
              <p className="text-sm text-gray-600">
                Download historical data for {selectedIndices.length} {selectedIndices.length === 1 ? 'index' : 'indices'}
              </p>
            </div>
          </div>
          {!isProcessing && (
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-6">
          {/* Selected Indices */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selected Indices
            </label>
            <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
              <div className="space-y-2">
                {selectedIndices.map(index => (
                  <div
                    key={index.id}
                    className="flex items-center justify-between py-2 px-3 bg-white rounded border border-gray-200"
                  >
                    <div>
                      <span className="font-medium text-gray-900">
                        {index.index_name}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        ({index.index_code})
                      </span>
                    </div>
                    {index.provider_enabled ? (
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                        {index.data_provider}
                      </span>
                    ) : (
                      <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                        Not configured
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isProcessing}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                min="2000-01-01"
                max={endDate || undefined}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isProcessing}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                min={startDate || '2000-01-01'}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{validationError}</p>
            </div>
          )}

          {/* Progress */}
          {isProcessing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">Progress</span>
                <span className="text-gray-600">
                  {progress.current} / {progress.total} indices
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Downloading data... Please wait.</span>
              </div>
            </div>
          )}

          {/* Results */}
          {isComplete && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-medium text-green-700">Successful</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700">{results.successful}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="text-xs font-medium text-red-700">Failed</span>
                  </div>
                  <p className="text-2xl font-bold text-red-700">{results.failed}</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4 text-gray-600" />
                    <span className="text-xs font-medium text-gray-700">Skipped</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-700">{results.skipped}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-700">
                  Bulk download completed successfully! Window will close automatically.
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && !isProcessing && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-700 mb-1">Download Failed</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          {/* Info */}
          {!isProcessing && !isComplete && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Note:</h4>
              <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                <li>Only indices with enabled data providers will be downloaded</li>
                <li>Existing data for the date range will be skipped</li>
                <li>Downloads are processed sequentially with rate limiting</li>
                <li>This may take several minutes for large date ranges</li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isComplete ? 'Close' : 'Cancel'}
          </button>
          <button
            onClick={handleDownload}
            disabled={isProcessing || isComplete || selectedIndices.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Start Download
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};