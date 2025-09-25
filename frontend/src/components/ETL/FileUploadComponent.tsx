// frontend/src/components/ETL/FileUploadComponent.tsx
import React, { useState, useCallback, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { FileImportType } from '../../types/import.types';
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from '../../constants/fileImportTypes';
import { toastService } from '../../services/toast.service';
import { API_ENDPOINTS } from '../../services/serviceURLs';

interface FileUploadComponentProps {
  importType: FileImportType;
  onFileUploaded: (fileInfo: any) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

const FileUploadComponent: React.FC<FileUploadComponentProps> = ({
  importType,
  onFileUploaded,
  onError,
  disabled = false
}) => {
  const { theme, isDarkMode } = useTheme();
  const { tenantId, environment } = useAuth();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // File validation
  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
    }

    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_FILE_TYPES.includes(fileExtension as any)) {
      return `Invalid file type. Only ${ALLOWED_FILE_TYPES.join(', ')} files are allowed`;
    }

    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(file.name)) {
      return 'File name contains invalid characters. Please rename the file';
    }

    return null;
  };

  // Upload file to server
  const uploadFile = async (file: File) => {
    const loadingToastId = toastService.loading('Uploading file...', { autoClose: false });
    
    // Create FormData with only the file
    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsUploading(true);
      setUploadProgress({ loaded: 0, total: file.size, percentage: 0 });

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentage = Math.round((event.loaded / event.total) * 100);
          setUploadProgress({
            loaded: event.loaded,
            total: event.total,
            percentage
          });
          
          toastService.update(loadingToastId, {
            render: `Uploading file... ${percentage}%`,
            type: 'info'
          });
        }
      };

      // Handle response
      xhr.onload = () => {
        toastService.dismiss(loadingToastId);
        
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success) {
              toastService.success('File uploaded successfully!');
              // Map backend response fields to expected format
              onFileUploaded({
                id: response.data.id,
                original_filename: response.data.original_filename,
                file_size: response.data.file_size,
                mime_type: response.data.mime_type
              });
            } else {
              const errorMsg = response.error || 'Upload failed';
              toastService.error(errorMsg);
              onError(errorMsg);
            }
          } catch (e) {
            const errorMsg = 'Invalid response from server';
            toastService.error(errorMsg);
            onError(errorMsg);
          }
        } else {
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            const errorMsg = errorResponse.error || `Upload failed (${xhr.status})`;
            toastService.error(errorMsg);
            onError(errorMsg);
          } catch (e) {
            const errorMsg = `Upload failed with status ${xhr.status}`;
            toastService.error(errorMsg);
            onError(errorMsg);
          }
        }
        setIsUploading(false);
        setUploadProgress(null);
        setSelectedFile(null);
      };

      // Handle network errors
      xhr.onerror = () => {
        toastService.dismiss(loadingToastId);
        const errorMsg = 'Network error during upload. Please check your connection and try again.';
        toastService.error(errorMsg);
        onError(errorMsg);
        setIsUploading(false);
        setUploadProgress(null);
        setSelectedFile(null);
      };

      // Handle timeout
      xhr.ontimeout = () => {
        toastService.dismiss(loadingToastId);
        const errorMsg = 'Upload timed out. Please try again.';
        toastService.error(errorMsg);
        onError(errorMsg);
        setIsUploading(false);
        setUploadProgress(null);
        setSelectedFile(null);
      };

      // Configure request - IMPORTANT: importType is in query parameter
      const uploadUrl = `${API_ENDPOINTS.IMPORT.UPLOAD}?importType=${importType}`;
      console.log('Uploading to:', uploadUrl);
      
      xhr.open('POST', uploadUrl);
      xhr.timeout = 60000; // 60 second timeout
      
      // Set authentication headers
      const token = localStorage.getItem('access_token');
      if (!token) {
        toastService.error('Authentication required. Please log in again.');
        setIsUploading(false);
        setUploadProgress(null);
        toastService.dismiss(loadingToastId);
        return;
      }
      
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      
      if (tenantId) {
        xhr.setRequestHeader('X-Tenant-ID', String(tenantId));
      }
      
      if (environment) {
        xhr.setRequestHeader('X-Environment', environment);
      }
      
      // Send the request
      xhr.send(formData);

    } catch (error) {
      toastService.dismiss(loadingToastId);
      console.error('Upload error:', error);
      const errorMsg = 'Upload failed. Please try again.';
      toastService.error(errorMsg);
      onError(errorMsg);
      setIsUploading(false);
      setUploadProgress(null);
      setSelectedFile(null);
    }
  };

  const handleFileSelect = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      toastService.error(validationError);
      onError(validationError);
      return;
    }

    setSelectedFile(file);
    uploadFile(file);
  }, [importType]);

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input to allow re-selecting the same file
    event.target.value = '';
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragOver(true);
    }
  }, [disabled, isUploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled || isUploading) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 1) {
      const errorMsg = 'Please select only one file at a time';
      toastService.warning(errorMsg);
      onError(errorMsg);
      return;
    }

    const file = files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [disabled, isUploading, handleFileSelect]);

  const browseFiles = () => {
    if (!disabled && !isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const UploadIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17,8 12,3 7,8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );

  return (
    <div style={{
      padding: '40px',
      textAlign: 'center' as const
    }}>
      <div style={{
        marginBottom: '32px'
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: colors.utility.primaryText,
          marginBottom: '8px',
          margin: 0
        }}>
          Upload {importType === 'CustomerData' ? 'Customer Data' : 'Transaction Data'} File
        </h2>
        <p style={{
          fontSize: '16px',
          color: colors.utility.secondaryText,
          margin: 0
        }}>
          Select a CSV or Excel file to import your data
        </p>
      </div>

      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={browseFiles}
        style={{
          border: `2px dashed ${isDragOver 
            ? colors.brand.primary 
            : isUploading 
              ? colors.semantic.info 
              : colors.utility.primaryText + '30'}`,
          borderRadius: '16px',
          padding: '60px 40px',
          backgroundColor: isDragOver 
            ? colors.brand.primary + '08' 
            : colors.utility.secondaryBackground,
          cursor: disabled || isUploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          position: 'relative' as const,
          opacity: disabled ? 0.6 : 1,
          maxWidth: '600px',
          margin: '0 auto'
        }}
      >
        {!isUploading ? (
          <>
            <div style={{
              color: isDragOver ? colors.brand.primary : colors.utility.secondaryText,
              marginBottom: '24px'
            }}>
              <UploadIcon />
            </div>

            <div style={{
              marginBottom: '16px'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                marginBottom: '8px',
                margin: 0
              }}>
                {isDragOver ? 'Drop file here' : 'Drag & drop your file here'}
              </h3>
              <p style={{
                fontSize: '14px',
                color: colors.utility.secondaryText,
                margin: 0
              }}>
                or click to browse files
              </p>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                browseFiles();
              }}
              disabled={disabled || isUploading}
              style={{
                backgroundColor: colors.brand.primary,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: disabled || isUploading ? 'not-allowed' : 'pointer',
                marginBottom: '24px'
              }}
            >
              Browse Files
            </button>
          </>
        ) : (
          <>
            <div style={{
              color: colors.semantic.info,
              marginBottom: '24px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                border: `4px solid ${colors.semantic.info}30`,
                borderTop: `4px solid ${colors.semantic.info}`,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto'
              }} />
            </div>

            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              marginBottom: '8px'
            }}>
              Uploading {selectedFile?.name || 'File'}...
            </h3>

            {uploadProgress && (
              <>
                <div style={{
                  fontSize: '14px',
                  color: colors.utility.secondaryText,
                  marginBottom: '16px'
                }}>
                  {uploadProgress.percentage}% - {formatFileSize(uploadProgress.loaded)} of {formatFileSize(uploadProgress.total)}
                </div>

                <div style={{
                  width: '100%',
                  maxWidth: '300px',
                  height: '8px',
                  backgroundColor: colors.utility.primaryText + '20',
                  borderRadius: '4px',
                  margin: '0 auto',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${uploadProgress.percentage}%`,
                    height: '100%',
                    backgroundColor: colors.semantic.info,
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </>
            )}
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_FILE_TYPES.join(',')}
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
          disabled={disabled || isUploading}
        />
      </div>

      <div style={{
        marginTop: '32px',
        padding: '20px',
        backgroundColor: colors.utility.primaryBackground,
        borderRadius: '12px',
        border: `1px solid ${colors.utility.primaryText}10`,
        textAlign: 'left' as const,
        maxWidth: '600px',
        margin: '32px auto 0'
      }}>
        <h4 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: colors.utility.primaryText,
          marginBottom: '12px'
        }}>
          File Requirements:
        </h4>
        
        <ul style={{
          margin: 0,
          paddingLeft: '16px',
          listStyle: 'none'
        }}>
          <li style={{
            fontSize: '13px',
            color: colors.utility.secondaryText,
            marginBottom: '6px',
            position: 'relative',
            paddingLeft: '20px'
          }}>
            <span style={{ position: 'absolute', left: '0', color: colors.semantic.success }}>✓</span>
            File types: {ALLOWED_FILE_TYPES.join(', ')}
          </li>
          <li style={{
            fontSize: '13px',
            color: colors.utility.secondaryText,
            marginBottom: '6px',
            position: 'relative',
            paddingLeft: '20px'
          }}>
            <span style={{ position: 'absolute', left: '0', color: colors.semantic.success }}>✓</span>
            Maximum file size: {MAX_FILE_SIZE / (1024 * 1024)}MB
          </li>
          <li style={{
            fontSize: '13px',
            color: colors.utility.secondaryText,
            marginBottom: '6px',
            position: 'relative',
            paddingLeft: '20px'
          }}>
            <span style={{ position: 'absolute', left: '0', color: colors.semantic.success }}>✓</span>
            First row should contain column headers
          </li>
          <li style={{
            fontSize: '13px',
            color: colors.utility.secondaryText,
            position: 'relative',
            paddingLeft: '20px'
          }}>
            <span style={{ position: 'absolute', left: '0', color: colors.semantic.success }}>✓</span>
            No special characters in file name (except - and _)
          </li>
        </ul>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default FileUploadComponent;