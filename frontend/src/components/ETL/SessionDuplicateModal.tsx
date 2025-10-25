// frontend/src/components/ETL/SessionDuplicateModal.tsx
import React, { useState } from 'react';
import { X, AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';

interface SessionDuplicateModalProps {
  isOpen: boolean;
  duplicateCheck: {
    checked: boolean;
    importType: string;
    totalRecords: number;
    matchCount: number;
    matchPercentage: number;
    comparisonWindow: string;
    severity: 'critical' | 'warning' | 'none';
    shouldBlock: boolean;
    requiresUserDecision: boolean;
    sampleDuplicates: Array<{
      rowNumber: number;
      name?: string;
      pan?: string;
      email?: string;
      mobile?: string;
    }>;
    message: string;
    userGuidance?: string;
  };
  onCancel: () => void;
  onProceed: (classification: 'user_marked_duplicate' | 'user_marked_legitimate') => void;
}

export const SessionDuplicateModal: React.FC<SessionDuplicateModalProps> = ({
  isOpen,
  duplicateCheck,
  onCancel,
  onProceed
}) => {
  const [selectedClassification, setSelectedClassification] = useState<'user_marked_duplicate' | 'user_marked_legitimate' | null>(null);
  const [showSamples, setShowSamples] = useState(false);

  if (!isOpen || !duplicateCheck.checked) return null;

  // If no decision required, just show info
  if (!duplicateCheck.requiresUserDecision && !duplicateCheck.shouldBlock) {
    return null;
  }

  const getSeverityColor = () => {
    switch (duplicateCheck.severity) {
      case 'critical':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-800 dark:text-red-200',
          icon: 'text-red-600 dark:text-red-400'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-800',
          text: 'text-yellow-800 dark:text-yellow-200',
          icon: 'text-yellow-600 dark:text-yellow-400'
        };
      default:
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          text: 'text-blue-800 dark:text-blue-200',
          icon: 'text-blue-600 dark:text-blue-400'
        };
    }
  };

  const colors = getSeverityColor();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className={`p-2 ${colors.bg} rounded-lg`}>
              {duplicateCheck.severity === 'critical' ? (
                <AlertTriangle className={`w-6 h-6 ${colors.icon}`} />
              ) : (
                <AlertCircle className={`w-6 h-6 ${colors.icon}`} />
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {duplicateCheck.shouldBlock ? 'Import Blocked' : 'Potential Duplicates Detected'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {duplicateCheck.matchPercentage}% of records match existing data
              </p>
            </div>
          </div>
          {!duplicateCheck.shouldBlock && (
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Main Message */}
          <div className={`${colors.bg} ${colors.border} border rounded-lg p-4`}>
            <p className={`${colors.text} font-medium`}>
              {duplicateCheck.message}
            </p>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Records</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {duplicateCheck.totalRecords.toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">Potential Matches</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {duplicateCheck.matchCount.toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">Match Percentage</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {duplicateCheck.matchPercentage}%
              </p>
            </div>
          </div>

          {/* User Guidance */}
          {duplicateCheck.userGuidance && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">
                    What does this mean?
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    {duplicateCheck.userGuidance}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Sample Duplicates */}
          {duplicateCheck.sampleDuplicates && duplicateCheck.sampleDuplicates.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
              <button
                onClick={() => setShowSamples(!showSamples)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sample Duplicate Records ({duplicateCheck.sampleDuplicates.length})
                </span>
                {showSamples ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {showSamples && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3 max-h-60 overflow-y-auto">
                  {duplicateCheck.sampleDuplicates.map((sample, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-50 dark:bg-gray-900 rounded p-3 text-sm"
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Row:</span>
                          <span className="ml-2 text-gray-900 dark:text-white font-medium">
                            {sample.rowNumber}
                          </span>
                        </div>
                        {sample.name && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Name:</span>
                            <span className="ml-2 text-gray-900 dark:text-white">
                              {sample.name}
                            </span>
                          </div>
                        )}
                        {sample.pan && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">PAN:</span>
                            <span className="ml-2 text-gray-900 dark:text-white font-mono">
                              {sample.pan}
                            </span>
                          </div>
                        )}
                        {sample.email && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Email:</span>
                            <span className="ml-2 text-gray-900 dark:text-white">
                              {sample.email}
                            </span>
                          </div>
                        )}
                        {sample.mobile && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Mobile:</span>
                            <span className="ml-2 text-gray-900 dark:text-white">
                              {sample.mobile}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Classification Options (only if user decision required) */}
          {duplicateCheck.requiresUserDecision && !duplicateCheck.shouldBlock && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                How would you like to classify this import?
              </h3>

              <div className="space-y-3">
                <label
                  className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedClassification === 'user_marked_duplicate'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="classification"
                    value="user_marked_duplicate"
                    checked={selectedClassification === 'user_marked_duplicate'}
                    onChange={(e) => setSelectedClassification(e.target.value as 'user_marked_duplicate')}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Tag as "Duplicate"
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      This is likely accidental re-import. Individual duplicate checks will still run as a safety measure.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedClassification === 'user_marked_legitimate'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="classification"
                    value="user_marked_legitimate"
                    checked={selectedClassification === 'user_marked_legitimate'}
                    onChange={(e) => setSelectedClassification(e.target.value as 'user_marked_legitimate')}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Tag as "Legitimate"
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      This is intentional (corrections, updates, etc.). Individual duplicate checks will still run.
                    </p>
                  </div>
                </label>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  <strong>Note:</strong> Regardless of your choice, individual duplicate checks will still run for each record. You can review and include/exclude records later in the Import Dashboard.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          {duplicateCheck.shouldBlock ? (
            <button
              onClick={onCancel}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
            >
              I Understand - Cancel Import
            </button>
          ) : (
            <>
              <button
                onClick={onCancel}
                className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel Import
              </button>
              <button
                onClick={() => {
                  if (selectedClassification) {
                    onProceed(selectedClassification);
                  }
                }}
                disabled={!selectedClassification}
                className={`px-6 py-2.5 font-medium rounded-lg transition-colors shadow-sm ${
                  selectedClassification
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                Proceed with Import
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
