// backend/src/types/import.types.ts

export type FileImportType = 'CustomerData' | 'TransactionData' | 'BookmarkData'| 'SchemeData';;

export type ImportStatus = 'pending' | 'staged' | 'pending_processing' | 'processing' | 'completed' | 'completed_with_errors' | 'failed' | 'cancelled';

export type RecordStatus = 'pending' | 'pending_process' | 'success' | 'failed' | 'duplicate' | 'orphan' | 'skipped';

// Database entity interfaces
export interface FileUpload {
  id: number;
  tenant_id: number;
  is_live: boolean;
  is_active: boolean;
  file_type: FileImportType;
  original_filename: string;
  stored_filename: string;
  file_path: string;
  folder_path?: string;
  file_size: number;
  mime_type: string;
  customer_id?: number;
  processing_status: string;
  processed_records: number;
  failed_records: number;
  error_details?: string;
  is_processed: boolean;
  uploaded_by: number;
  created_at: Date;
  processed_at?: Date;
}

export interface ImportSession {
  id: number;
  session_name: string;
  file_upload_id: number;
  tenant_id: number;
  is_live: boolean;
  import_type: string;
  status: ImportStatus;
  total_records: number;
  processed_records: number;
  successful_records: number;
  failed_records: number;
  duplicate_records: number;
  n8n_execution_id?: string;
  n8n_webhook_id?: string;
  staging_completed_at?: Date;
  staging_total_rows?: number;
  batch_size?: number;
  current_batch?: number;
  total_batches?: number;
  last_processed_row?: number;
  processing_metadata?: any;
  processing_started_at?: Date;
  processing_completed_at?: Date;
  error_summary?: string;
  created_by: number;
  created_at: Date;
  updated_at: Date;

  // Duplicate detection fields
  file_hash?: string;
  current_stage?: string;
  duplicate_check_result?: any;
  duplicate_classification?: string;
  duplicate_user_decision_at?: Date;
  filename_duplicate_check?: any;

  // Restart and checkpoint fields (added in migration 006)
  restart_count?: number;
  last_restart_at?: Date;
  can_restart?: boolean;
  last_processed_staging_id?: number;
  processing_checkpoint?: any;
  customer_lookup_method?: 'iwell_code' | 'customer_name' | 'both';
}
export interface ImportFieldMapping {
  id: number;
  tenant_id: number;
  is_live: boolean;
  is_active: boolean;
  import_type: FileImportType;
  template_name: string;
  template_version: number;
  field_mappings: FieldMappingConfig;
  validation_rules?: ValidationRulesConfig;
  is_default: boolean;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface ImportRecordResult {
  id: number;
  import_session_id: number;
  tenant_id: number;
  is_live: boolean;
  row_number: number;
  raw_data: Record<string, any>;
  status: RecordStatus;
  error_messages: string[];
  warnings: string[];
  created_contact_id?: number;
  created_customer_id?: number;
  processed_at: Date;

  // Match tracking fields (added in migration 006)
  match_type?: string;
  match_confidence?: string;
  ambiguous_matches?: any;
  requires_review?: boolean;

  // Edit history fields (added in migration 006)
  edit_history?: any[];
  edited_at?: Date;
  edited_by?: number;
  reprocess_count?: number;
  last_reprocess_at?: Date;
}

// Configuration interfaces
export interface FieldMappingConfig {
  source_fields: string[];
  mappings: Record<string, FieldMapping>;
}

export interface FieldMapping {
  target: string;
  required: boolean;
  transformation?: string;
  validation_pattern?: string;
  error_message?: string;
}

export interface ValidationRulesConfig {
  [fieldName: string]: ValidationRule;
}

export interface ValidationRule {
  pattern: string;
  message: string;
  required?: boolean;
}

// API Request/Response interfaces
export interface FileUploadRequest {
  importType: FileImportType;
}

export interface FileUploadResponse {
  success: boolean;
  data: {
    fileId: number;
    originalFilename: string;
    fileSize: number;
    mimeType: string;
  };
  message: string;
}

export interface HeaderDetectionRequest {
  fileId: number;
}

export interface HeaderDetectionResponse {
  success: boolean;
  data: {
    headers: string[];
    sampleData: Record<string, any>[];
    totalRows: number;
    detectedColumns: number;
  };
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

export interface ProcessingStatusResponse {
  success: boolean;
  data: {
    sessionId: number;
    status: ImportStatus;  // This will now include 'staged'
    totalRecords: number;
    processedRecords: number;
    successfulRecords: number;
    failedRecords: number;
    duplicateRecords: number;
    processingStartedAt?: string;
    processingCompletedAt?: string;
    errorSummary?: string;
  };
}

export interface ImportResultsResponse {
  success: boolean;
  data: {
    session: ImportSession;
    records: ImportRecordResult[];
    summary: {
      totalRows: number;
      successfulRows: number;
      failedRows: number;
      duplicateRows: number;
      processingTime: number;
    };
  };
}

// N8N integration interfaces
export interface N8NWebhookPayload {
  sessionId: number;
  fileId: number;
  filePath: string;
  mappings: FieldMapping[];
  tenantId: number;
  isLive: boolean;
  callbackUrl: string;
  importType: FileImportType;
}

export interface N8NCallbackPayload {
  sessionId: number;
  status: 'success' | 'error' | 'completed';
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  duplicateRecords: number;
  errors: Array<{
    rowNumber: number;
    errors: string[];
    rawData: Record<string, any>;
  }>;
  executionId: string;
}

// File parsing interfaces
export interface ParsedFileData {
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
  errors: string[];
}

export interface FileParserOptions {
  skipEmptyLines?: boolean;
  trimHeaders?: boolean;
  maxRows?: number;
  encoding?: string;
}

// Validation interfaces
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  rowNumber?: number;
}

export interface ValidationWarning {
  field: string;
  message: string;
  rowNumber?: number;
}