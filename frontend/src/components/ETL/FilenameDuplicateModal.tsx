// frontend/src/components/ETL/FilenameDuplicateModal.tsx
import React from 'react';
import { X, AlertTriangle, FileText, Clock } from 'lucide-react';

interface FilenameDuplicateModalProps {
  isOpen: boolean;
  duplicateInfo: {
    isDuplicate: boolean;
    severity: 'critical' | 'warning' | 'none';
    canProceed: boolean;
    matchedFile?: {
      fileId: number;
      filename: string;
      fileSize: number;
      uploadedAt: string;
      processingStatus: string;
    };
    message: string;
    userGuidance?: string;
    technicalDetails?: string;
  };
  onClose: () => void;
}

export const FilenameDuplicateModal: React.FC<FilenameDuplicateModalProps> = ({
  isOpen,
  duplicateInfo,
  onClose
}) => {
  if (!isOpen || !duplicateInfo.isDuplicate) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleString();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Duplicate File Detected
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Main Message */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200 font-medium">
              {duplicateInfo.message}
            </p>
          </div>

          {/* File Details */}
          {duplicateInfo.matchedFile && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Previously Uploaded File
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start space-x-3">
                  <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Filename</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white break-all">
                      {duplicateInfo.matchedFile.filename}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Uploaded</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatDate(duplicateInfo.matchedFile.uploadedAt)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">File Size</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {(duplicateInfo.matchedFile.fileSize / 1024).toFixed(2)} KB
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    duplicateInfo.matchedFile.processingStatus === 'completed'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : duplicateInfo.matchedFile.processingStatus === 'processing'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {duplicateInfo.matchedFile.processingStatus}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* User Guidance */}
          {duplicateInfo.userGuidance && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                What should I do?
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {duplicateInfo.userGuidance}
              </p>
            </div>
          )}

          {/* Technical Details (Collapsible) */}
          {duplicateInfo.technicalDetails && (
            <details className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <summary className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                Technical Details
              </summary>
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 font-mono">
                {duplicateInfo.technicalDetails}
              </p>
            </details>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
