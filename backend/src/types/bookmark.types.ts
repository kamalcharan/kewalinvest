// backend/src/types/bookmark.types.ts
// TypeScript type definitions for bookmark import and management

/**
 * Single row from bookmark import CSV
 */
export interface BookmarkImportRow {
  scheme_code: string;      // Required: Unique scheme identifier
  isin: string;             // Optional: ISIN code
  scheme_name: string;      // Required: Scheme name from customer's software
}

/**
 * Result of bookmark import operation
 */
export interface BookmarkImportResult {
  success: boolean;                                              // Overall success status
  totalRows: number;                                             // Total rows processed
  bookmarksCreated: number;                                      // New bookmarks inserted
  bookmarksUpdated: number;                                      // Existing bookmarks updated
  aliasesCreated: number;                                        // Total aliases generated
  errors: Array<BookmarkImportError>;                            // List of errors encountered
  duplicateRows?: number[];                                      // Row numbers that were duplicates
  duration: number;                                              // Processing time in milliseconds
}

/**
 * Error details for failed bookmark import row
 */
export interface BookmarkImportError {
  row: number;              // Row number in CSV (1-indexed)
  scheme_code: string;      // Scheme code from the row
  error: string;            // Error message
}

/**
 * Bookmark statistics for a tenant
 */
export interface BookmarkStats {
  total_bookmarks: number;          // Total active bookmarks
  unique_amcs: number;              // Number of unique AMCs
  total_aliases: number;            // Total aliases for bookmarked schemes
  oldest_bookmark: Date | null;     // Date of oldest bookmark
  newest_bookmark: Date | null;     // Date of newest bookmark
}

/**
 * Complete bookmark record from database
 */
export interface Bookmark {
  id: number;
  tenant_id: number;
  user_id: number;
  scheme_id: number;
  scheme_code: string;
  scheme_name: string;
  amc_name: string;
  is_live: boolean;
  is_active: boolean;
  daily_download_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Bookmark with additional computed fields (for list view)
 */
export interface BookmarkWithDetails extends Bookmark {
  alias_count: number;              // Number of aliases for this scheme
}

/**
 * Parameters for fetching bookmark list
 */
export interface GetBookmarksParams {
  tenant_id: number;
  is_live: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Parameters for checking bookmark existence
 */
export interface CheckBookmarksParams {
  tenant_id: number;
  is_live: boolean;
}

/**
 * Response for bookmark existence check
 */
export interface CheckBookmarksResponse {
  success: boolean;
  has_bookmarks: boolean;
  can_import_transactions: boolean;
}

/**
 * Parameters for deleting a bookmark
 */
export interface DeleteBookmarkParams {
  tenant_id: number;
  is_live: boolean;
  bookmark_id: number;
}

/**
 * Alias variation generated from bookmark
 */
export interface AliasVariation {
  scheme_id: number;
  scheme_code: string;
  alias_name: string;
  source: 'auto' | 'manual' | 'import';
}

/**
 * Bookmark import request body (from API)
 */
export interface BookmarkImportRequest {
  tenant_id: number;
  is_live: boolean;
  user_id: number;
  file?: Express.Multer.File;       // Uploaded file
}

/**
 * Validation result for bookmark import file
 */
export interface BookmarkFileValidation {
  valid: boolean;
  errors: string[];
  row_count?: number;
  missing_columns?: string[];
}

/**
 * Bookmark import progress (for real-time updates)
 */
export interface BookmarkImportProgress {
  session_id: string;
  total_rows: number;
  processed_rows: number;
  successful_rows: number;
  failed_rows: number;
  current_row: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  started_at: Date;
  completed_at?: Date;
}

/**
 * Template for bookmark CSV download
 */
export interface BookmarkTemplate {
  headers: string[];
  sample_rows: BookmarkImportRow[];
}

/**
 * Bookmark import options
 */
export interface BookmarkImportOptions {
  skip_duplicates?: boolean;        // Skip rows that already exist
  update_existing?: boolean;        // Update existing bookmarks
  generate_aliases?: boolean;       // Auto-generate aliases (default: true)
  alias_variations?: number;        // Number of alias variations to generate (default: 8)
}

/**
 * Alias generation configuration
 */
export interface AliasGenerationConfig {
  include_reg_suffix: boolean;      // Generate "Reg (G)" variations
  include_direct_suffix: boolean;   // Generate "Direct (G)" variations
  include_base_name: boolean;       // Generate base name without suffixes
  include_nav_name: boolean;        // Include scheme_nav_name from master
}