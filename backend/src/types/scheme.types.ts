// backend/src/types/scheme.types.ts

// =====================================================
// Scheme Alias Types
// =====================================================

/**
 * Database record from t_scheme_aliases
 */
export interface SchemeAlias {
  id: number;
  scheme_id: number;
  scheme_code: string | null;
  alias_name: string;
  alias_name_normalized: string;
  source: 'auto' | 'manual' | 'import';
  is_active: boolean;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Scheme alias with associated scheme details (for display)
 */
export interface SchemeAliasWithScheme extends SchemeAlias {
  scheme_name: string;
  scheme_nav_name: string | null;
  amc_name: string | null;
}

/**
 * Result from lookup_scheme_by_alias() database function
 */
export interface SchemeLookupResult {
  scheme_id: number;
  scheme_code: string;
  scheme_name: string;
  matched_alias: string;
}

// =====================================================
// Request Types (API Input)
// =====================================================

/**
 * Create new scheme alias
 */
export interface CreateSchemeAliasRequest {
  scheme_id?: number;       // Either scheme_id
  scheme_code?: string;     // OR scheme_code (will look up ID)
  alias_name: string;       // The alias to add
  source?: 'manual' | 'import';  // Defaults to 'manual'
}

/**
 * Update existing alias
 */
export interface UpdateSchemeAliasRequest {
  alias_name?: string;      // New alias name
  is_active?: boolean;      // Activate/deactivate
}

/**
 * Bulk import multiple aliases for one scheme
 */
export interface BulkCreateAliasesRequest {
  scheme_code: string;      // Target scheme
  aliases: string[];        // Array of alias names
  source?: 'import' | 'manual';
}

// =====================================================
// Response Types (API Output)
// =====================================================

/**
 * Single alias response
 */
export interface SchemeAliasResponse {
  success: boolean;
  data?: SchemeAliasWithScheme;
  error?: string;
}

/**
 * List of aliases response
 */
export interface SchemeAliasListResponse {
  success: boolean;
  data?: SchemeAliasWithScheme[];
  total?: number;
  page?: number;
  page_size?: number;
  error?: string;
}

/**
 * Delete response
 */
export interface SchemeAliasDeleteResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Bulk import response
 */
export interface BulkCreateAliasesResponse {
  success: boolean;
  created: number;
  skipped: number;
  errors: Array<{
    alias: string;
    error: string;
  }>;
}

/**
 * Lookup response (for transaction import)
 */
export interface SchemeLookupResponse {
  success: boolean;
  data?: SchemeLookupResult;
  error?: string;
}

// =====================================================
// Filter and Pagination Types
// =====================================================

/**
 * Filters for querying aliases
 */
export interface SchemeAliasFilters {
  scheme_id?: number;           // Filter by specific scheme
  scheme_code?: string;         // Filter by scheme code
  search?: string;              // Search in alias_name or scheme_name
  source?: 'auto' | 'manual' | 'import';  // Filter by source
  is_active?: boolean;          // Filter by active status
  page?: number;                // Pagination: page number (1-indexed)
  page_size?: number;           // Pagination: items per page
}

// =====================================================
// Utility Types
// =====================================================

/**
 * Alias statistics (for admin dashboard)
 */
export interface AliasStatistics {
  total_aliases: number;
  active_aliases: number;
  schemes_with_aliases: number;
  avg_aliases_per_scheme: number;
  recent_additions: number;  // Last 7 days
}

/**
 * Alias conflict (when trying to add duplicate)
 */
export interface AliasConflict {
  alias_name: string;
  existing_scheme_id: number;
  existing_scheme_code: string;
  existing_scheme_name: string;
  requested_scheme_id: number;
}
