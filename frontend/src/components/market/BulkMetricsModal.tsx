// frontend/src/components/market/BulkMetricsModal.tsx
// Modal for bulk metrics calculation

import React, { useState, useEffect } from 'react';
import { X, Calculator, AlertCircle, CheckCircle, XCircle, Loader2, TrendingUp } from 'lucide-react';
import { MarketIndex } from '../../types/market.types';
import { useBulkCalculateMetrics } from '../../hooks/useMarketMetrics';

interface BulkMetricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIndices: MarketIndex[];
  onSuccess?: () => void;
}

export const BulkMetricsModal: React.FC<BulkMetricsModalProps> = ({
  isOpen,
  onClose,
  selectedIndices,
  onSuccess
}) => {
  const [recalculate, setRecalculate] = useState<boolean>(false);
  const [showDetails, setShowDetails] = useState<boolean>(false);

  const bulkCalculate = useBulkCalculateMetrics();

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setRecalculate(false);
      setShowDetails(false);
      bulkCalculate.reset();
    }
  }, [isOpen]);

  // Auto-close after successful completion
  useEffect(() => {
    if (bulkCalculate.isSuccess && !bulkCalculate.isPending) {
      const timer = setTimeout(() => {
        handleClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [bulkCalculate.isSuccess, bulkCalculate.isPending]);

  const handleClose = () => {
    if (!bulkCalculate.isPending) {
      onClose();
      if (bulkCalculate.isSuccess) {
        onSuccess?.();
      }
    }
  };

  const handleCalculate = async () => {
    const indexIds = selectedIndices.map(idx => idx.id);
    
    bulkCalculate.mutate({
      indexIds,
      recalculate
    });
  };

  if (!isOpen) return null;

  const summary = bulkCalculate.data?.summary;
  const results = bulkCalculate.data?.results || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calculator className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Bulk Metrics Calculation
              </h2>
              <p className="text-sm text-gray-600">
                Calculate metrics for {selectedIndices.length} {selectedIndices.length === 1 ? 'index' : 'indices'}
              </p>
            </div>
          </div>
          {!bulkCalculate.isPending && (
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
                    <div className="flex items-center gap-2">
                      {index.historical_data_available ? (
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                          {index.total_records.toLocaleString()} records
                        </span>
                      ) : (
                        <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                          No data
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={recalculate}
                onChange={(e) => setRecalculate(e.target.checked)}
                disabled={bulkCalculate.isPending}
                className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">
                  Recalculate existing metrics
                </span>
                <p className="text-xs text-gray-600 mt-1">
                  If checked, all records will be recalculated even if metrics already exist. 
                  This may take significantly longer for indices with many records.
                </p>
              </div>
            </label>
          </div>

          {/* Processing State */}
          {bulkCalculate.isPending && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Calculating metrics...</span>
                <span className="text-sm text-gray-600">Please wait</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing {selectedIndices.length} {selectedIndices.length === 1 ? 'index' : 'indices'}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full animate-pulse" style={{ width: '100%' }} />
              </div>
            </div>
          )}

          {/* Success State with Summary */}
          {bulkCalculate.isSuccess && summary && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-medium text-green-700">Successful</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700">{summary.successful}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="text-xs font-medium text-red-700">Failed</span>
                  </div>
                  <p className="text-2xl font-bold text-red-700">{summary.failed}</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-medium text-purple-700">Records</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-700">
                    {summary.total_records_processed.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total Time</span>
                  <span className="font-medium text-gray-900">
                    {(summary.total_time_ms / 1000).toFixed(1)}s
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Avg Time per Index</span>
                  <span className="font-medium text-gray-900">
                    {(summary.average_time_per_index_ms / 1000).toFixed(1)}s
                  </span>
                </div>
              </div>

              {/* Success Message */}
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-700">
                  Bulk calculation completed successfully! Window will close automatically.
                </p>
              </div>

              {/* Show Details Toggle */}
              {results.length > 0 && (
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  {showDetails ? 'Hide' : 'Show'} detailed results
                </button>
              )}

              {/* Detailed Results */}
              {showDetails && results.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700">Detailed Results</h4>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {results.map((result, index) => (
                      <div
                        key={result.index_id}
                        className={`px-4 py-3 flex items-center justify-between ${
                          index !== results.length - 1 ? 'border-b border-gray-200' : ''
                        }`}
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {result.index_name}
                          </p>
                          {result.success ? (
                            <p className="text-xs text-gray-600">
                              {result.records_processed.toLocaleString()} records • {(result.calculation_time_ms / 1000).toFixed(1)}s
                            </p>
                          ) : (
                            <p className="text-xs text-red-600">
                              {result.error}
                            </p>
                          )}
                        </div>
                        <div>
                          {result.success ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error State */}
          {bulkCalculate.isError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-700 mb-1">Calculation Failed</p>
                <p className="text-sm text-red-600">
                  {bulkCalculate.error?.message || 'An unexpected error occurred'}
                </p>
              </div>
            </div>
          )}

          {/* Info - Only show when not processing and not completed */}
          {!bulkCalculate.isPending && !bulkCalculate.isSuccess && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-purple-900 mb-2">What will be calculated?</h4>
              <ul className="text-sm text-purple-700 space-y-1 list-disc list-inside">
                <li>Returns: daily, 1w, 1m, 3m, 6m, 1y, YTD, all-time</li>
                <li>Volatility: 7d, 14d, 21d, 42d, 3m, 6m standard deviation</li>
                <li>Risk metrics: Sharpe ratio, max drawdown, total risk, CAGR</li>
                <li>Only indices with historical data will be processed</li>
                <li>Processing is done sequentially with rate limiting</li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={handleClose}
            disabled={bulkCalculate.isPending}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {bulkCalculate.isSuccess ? 'Close' : 'Cancel'}
          </button>
          <button
            onClick={handleCalculate}
            disabled={bulkCalculate.isPending || bulkCalculate.isSuccess || selectedIndices.length === 0}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {bulkCalculate.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Calculator className="w-4 h-4" />
                Calculate Metrics
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};