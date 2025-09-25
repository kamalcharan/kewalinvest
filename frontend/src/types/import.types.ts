// src/types/import.types.ts

import { IMPORT_STATUS, RECORD_STATUS } from '../constants/fileImportTypes';

// Export the FileImportType from constants
export type FileImportType = 'CustomerData' | 'TransactionData' | 'SchemeData';

// File upload related types
export interface FileUploadInfo {
  id: number;
  original_filename: string;
  stored_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  file_type: FileImportType;
  processing_status: string;
  uploaded_by: number;
  created_at: string;
}

// Header detection types
export interface FileHeaders {
  headers: string[];
  sampleData: any[];
  totalRows: number;
  detectedColumns: number;
}

// Field mapping types
export interface FieldMapping {
  sourceField: string;
  targetField: string;
  isRequired: boolean;
  transformation?: string;
  validationPattern?: string;
  errorMessage?: string;
}

export interface ImportTemplate {
  id: number;
  template_name: string;
  import_type: FileImportType;
  field_mappings: FieldMapping[];
  validation_rules: ValidationRule[];
  is_default: boolean;
  created_at: string;
  template_version: number;
}

export interface ValidationRule {
  field: string;
  pattern: string;
  message: string;
  isRequired: boolean;
}

// Import session types
export interface ImportSession {
  id: number;
  session_name: string;
  file_upload_id: number;
  import_type: FileImportType;
  status: typeof IMPORT_STATUS[keyof typeof IMPORT_STATUS];
  total_records: number;
  processed_records: number;
  successful_records: number;
  failed_records: number;
  duplicate_records: number;
  processing_started_at?: string;
  processing_completed_at?: string;
  error_summary?: string;
  n8n_webhook_id?: string;
  n8n_execution_id?: string;
  created_at: string;
  updated_at: string;
}

// Processing result types
export interface ImportRecordResult {
  id: number;
  import_session_id: number;
  row_number: number;
  raw_data: any;
  status: typeof RECORD_STATUS[keyof typeof RECORD_STATUS];
  error_messages: string[];
  warnings: string[];
  created_contact_id?: number;
  created_customer_id?: number;
  processed_at: string;
}

// UI state types
export interface ImportStepData {
  step: number;
  completed: boolean;
  data?: any;
}

export interface ImportState {
  currentStep: number;
  selectedImportType?: FileImportType;
  uploadedFile?: FileUploadInfo;
  detectedHeaders?: FileHeaders;
  fieldMappings?: FieldMapping[];
  selectedTemplate?: ImportTemplate;
  importSession?: ImportSession;
  processingResults?: ImportProcessingResults;
  steps: ImportStepData[];
}

export interface ImportProcessingResults {
  session: ImportSession;
  records: ImportRecordResult[];
  summary: {
    totalRows: number;
    successfulRows: number;
    failedRows: number;
    duplicateRows: number;
    processingTime: number;
  };
}

// API request/response types
export interface FileUploadRequest {
  file: File;
  importType: FileImportType;
}

export interface FileUploadResponse {
  success: boolean;
  data: FileUploadInfo;
  message: string;
}

export interface HeaderDetectionRequest {
  fileId: number;
}

export interface HeaderDetectionResponse {
  success: boolean;
  data: FileHeaders;
  message: string;
}

export interface FieldMappingRequest {
  fileId: number;
  importType: FileImportType;
  mappings: FieldMapping[];
  templateName?: string;
  saveAsTemplate?: boolean;
}

export interface ProcessingRequest {
  fileId: number;
  mappings: FieldMapping[];
  sessionName: string;
}

export interface ProcessingResponse {
  success: boolean;
  data: {
    sessionId: number;
    webhookUrl?: string;
  };
  message: string;
}

// Error types
export interface ImportError {
  code: string;
  message: string;
  details?: any;
  field?: string;
  rowNumber?: number;
}

// Template types
export interface SaveTemplateRequest {
  templateName: string;
  importType: FileImportType;
  mappings: FieldMapping[];
  validationRules: ValidationRule[];
  isDefault?: boolean;
}

export interface LoadTemplateRequest {
  templateId: number;
}

// Processing status types
export interface ProcessingStatus {
  sessionId: number;
  status: typeof IMPORT_STATUS[keyof typeof IMPORT_STATUS];
  currentRecord: number;
  totalRecords: number;
  successCount: number;
  failureCount: number;
  duplicateCount: number;
  processingSpeed: number; // records per second
  estimatedTimeRemaining: number; // seconds
  lastUpdate: string;
}

// N8N integration types
export interface N8NWebhookPayload {
  sessionId: number;
  fileId: number;
  mappings: FieldMapping[];
  tenantId: number;
  isLive: boolean;
  callbackUrl: string;
}

export interface N8NProcessingResult {
  sessionId: number;
  status: 'success' | 'error' | 'completed';
  processedRecords: number;
  errors: ImportError[];
  executionId: string;
}