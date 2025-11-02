// frontend/src/components/BookmarkImport.tsx
// Component for importing scheme bookmarks from CSV

import React, { useState, useRef } from 'react';
import { BookmarkService, BookmarkImportResult, BookmarkImportError } from '../services/bookmark.service';
import { useAuth } from '../contexts/AuthContext';

interface BookmarkImportProps {
  tenantId: number;
  isLive: boolean;
  onImportComplete?: (result: BookmarkImportResult) => void;
}

export const BookmarkImport: React.FC<BookmarkImportProps> = ({
  tenantId,
  isLive,
  onImportComplete
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<BookmarkImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle file selection
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) {
      return;
    }

    // Reset previous state
    setError(null);
    setResult(null);
    setUploadProgress(0);

    // Validate file
    const validation = BookmarkService.validateBookmarkFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setSelectedFile(file);
  };

  /**
   * Handle file upload and import
   */
  const handleUpload = async () => {
    if (!selectedFile || !user) {
      setError('Please select a file and ensure you are logged in');
      return;
    }

    setIsUploading(true);
    setError(null);
    setResult(null);
    setUploadProgress(10);

    try {
      // Simulate progress (since we don't have real progress from backend)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      // Upload and import
      const importResult = await BookmarkService.importBookmarks(
        selectedFile,
        tenantId,
        isLive,
        user.id
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      setResult(importResult);

      if (importResult.success) {
        // Clear file selection on success
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        // Callback to parent
        if (onImportComplete) {
          onImportComplete(importResult);
        }
      } else {
        setError('Import completed with errors. See details below.');
      }

    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Handle template download
   */
  const handleDownloadTemplate = () => {
    BookmarkService.downloadTemplate();
  };

  /**
   * Reset component state
   */
  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bookmark-import-container">
      {/* Header */}
      <div className="import-header">
        <h2>Import Scheme Bookmarks</h2>
        <p className="text-muted">
          Upload a CSV file with your tracked schemes (scheme_code, isin, scheme_name)
        </p>
      </div>

      {/* Template Download */}
      <div className="template-section">
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={handleDownloadTemplate}
        >
          <i className="bi bi-download"></i> Download CSV Template
        </button>
      </div>

      {/* File Upload Section */}
      <div className="upload-section">
        <div className="file-input-group">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            disabled={isUploading}
            className="form-control"
          />
          
          {selectedFile && (
            <div className="file-info">
              <i className="bi bi-file-earmark-spreadsheet text-success"></i>
              <span>{selectedFile.name}</span>
              <span className="text-muted">({(selectedFile.size / 1024).toFixed(2)} KB)</span>
            </div>
          )}
        </div>

        {/* Upload Button */}
        <div className="upload-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2"></span>
                Uploading...
              </>
            ) : (
              <>
                <i className="bi bi-upload"></i> Upload & Import
              </>
            )}
          </button>

          {selectedFile && !isUploading && (
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={handleReset}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {isUploading && (
        <div className="progress-section">
          <div className="progress">
            <div
              className="progress-bar progress-bar-striped progress-bar-animated"
              role="progressbar"
              style={{ width: `${uploadProgress}%` }}
              aria-valuenow={uploadProgress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              {uploadProgress}%
            </div>
          </div>
          <p className="text-muted text-center mt-2">Processing bookmarks...</p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
        </div>
      )}

      {/* Success Result */}
      {result && result.success && (
        <div className="alert alert-success" role="alert">
          <h5 className="alert-heading">
            <i className="bi bi-check-circle-fill me-2"></i>
            Import Successful!
          </h5>
          <hr />
          <div className="result-stats">
            <div className="stat-item">
              <strong>Total Rows:</strong> {result.totalRows}
            </div>
            <div className="stat-item">
              <strong>Bookmarks Created:</strong> {result.bookmarksCreated}
            </div>
            <div className="stat-item">
              <strong>Bookmarks Updated:</strong> {result.bookmarksUpdated}
            </div>
            <div className="stat-item">
              <strong>Aliases Generated:</strong> {result.aliasesCreated}
            </div>
            <div className="stat-item">
              <strong>Duration:</strong> {(result.duration / 1000).toFixed(2)}s
            </div>
          </div>
        </div>
      )}

      {/* Result with Errors */}
      {result && !result.success && result.errors.length > 0 && (
        <div className="alert alert-warning" role="alert">
          <h5 className="alert-heading">
            <i className="bi bi-exclamation-circle-fill me-2"></i>
            Import Completed with Errors
          </h5>
          <hr />
          
          {/* Summary */}
          <div className="result-stats mb-3">
            <div className="stat-item">
              <strong>Successfully Imported:</strong> {result.bookmarksCreated + result.bookmarksUpdated}
            </div>
            <div className="stat-item">
              <strong>Failed:</strong> {result.errors.length}
            </div>
            <div className="stat-item">
              <strong>Aliases Generated:</strong> {result.aliasesCreated}
            </div>
          </div>

          {/* Error Details */}
          <div className="error-details">
            <h6>Errors:</h6>
            <div className="error-list">
              {result.errors.slice(0, 10).map((err, index) => (
                <div key={index} className="error-item">
                  <strong>Row {err.row}:</strong> {err.scheme_code} - {err.error}
                </div>
              ))}
              {result.errors.length > 10 && (
                <div className="text-muted">
                  ... and {result.errors.length - 10} more errors
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookmarkImport;