-- ============================================================================
-- File: 02_tables.sql
-- Description: All table definitions in proper dependency order
-- Purpose: Create complete database schema with all tables
-- Execution: Run SECOND after 01_init.sql
-- Author: System
-- Date: 2025-01-08
-- Updated: 2025-12-12 (Integrated migrations: 006, JTBD Consolidation, 007, 025, 026)
-- ============================================================================

-- ============================================================================
-- SECTION 1: CORE FOUNDATION TABLES
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Creating Core Foundation Tables';
    RAISE NOTICE '========================================';
END $$;

-- TABLE: t_tenants
CREATE TABLE t_tenants (
    id SERIAL PRIMARY KEY,
    tenant_code VARCHAR(50) UNIQUE NOT NULL,
    tenant_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    settings JSONB DEFAULT '{}'::jsonb,
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    is_admin BOOLEAN DEFAULT false,
    default_comparison_index_id INTEGER
);

COMMENT ON TABLE t_tenants IS 'Multi-tenant isolation - each client has separate data';
COMMENT ON COLUMN t_tenants.tenant_code IS 'Unique identifier for tenant (e.g., kewal, localsing)';
COMMENT ON COLUMN t_tenants.settings IS 'JSON configuration for tenant-specific settings';
COMMENT ON COLUMN t_tenants.is_admin IS 'System admin tenant flag - only ONE tenant should have this as true (SaaS owner)';
COMMENT ON COLUMN t_tenants.default_comparison_index_id IS 'Tenant preference for default market index to compare against portfolio performance charts';

-- TABLE: t_users
CREATE TABLE t_users (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER DEFAULT 1 REFERENCES t_tenants(id),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    theme_preference VARCHAR(50) DEFAULT 'techy-simple',
    environment_preference VARCHAR(10) DEFAULT 'live',
    is_live BOOLEAN DEFAULT true,
    default_comparison_index VARCHAR(50),
    CONSTRAINT unique_email_per_tenant UNIQUE (tenant_id, email)
);

COMMENT ON TABLE t_users IS 'User accounts with role-based access';
COMMENT ON COLUMN t_users.environment_preference IS 'User default: live or test environment';
COMMENT ON COLUMN t_users.is_live IS 'Data environment flag: true=production, false=test';

-- ============================================================================
-- SECTION 2: CHAT TABLES (AI Assistant)
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Creating Chat Tables...';
END $$;

-- TABLE: t_chat_sessions
CREATE TABLE t_chat_sessions (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER DEFAULT 1 REFERENCES t_tenants(id),
    user_id INTEGER REFERENCES t_users(id),
    session_name VARCHAR(255),
    is_live BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_tenant_consistency CHECK (tenant_id IS NOT NULL AND user_id IS NOT NULL)
);

COMMENT ON TABLE t_chat_sessions IS 'AI chat conversation sessions for tracking context';

-- TABLE: t_chat_messages
CREATE TABLE t_chat_messages (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER DEFAULT 1 REFERENCES t_tenants(id),
    session_id INTEGER REFERENCES t_chat_sessions(id),
    message_type VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    is_live BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE t_chat_messages IS 'Individual messages in AI chat sessions';
COMMENT ON COLUMN t_chat_messages.message_type IS 'Type: user, assistant, system';

-- ============================================================================
-- SECTION 3: CONTACT & CUSTOMER TABLES
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Creating Contact and Customer Tables...';
END $$;

-- TABLE: t_contacts (UPDATED: Added normalized_name from Migration 006)
CREATE TABLE t_contacts (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER DEFAULT 1 REFERENCES t_tenants(id),
    is_live BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    is_customer BOOLEAN DEFAULT false,
    prefix VARCHAR(10) NOT NULL CHECK (prefix IN ('Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Sri')),
    name VARCHAR(255) NOT NULL,
    normalized_name TEXT GENERATED ALWAYS AS (
        -- Normalize: Remove salutations, uppercase, remove special chars, normalize whitespace
        UPPER(
            REGEXP_REPLACE(
                REGEXP_REPLACE(
                    REGEXP_REPLACE(
                        REGEXP_REPLACE(name, '^(MR|MRS|MS|DR|PROF|SRI|SMT)\.?\s+', '', 'i'),
                        '[^A-Z0-9\s]', '', 'g'
                    ),
                    '\s+', ' ', 'g'
                ),
                '^\s+|\s+$', '', 'g'
            )
        )
    ) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES t_users(id)
);

COMMENT ON TABLE t_contacts IS 'Base contact information - extended by customers table';
COMMENT ON COLUMN t_contacts.is_customer IS 'Flag to indicate if contact is also a customer';
COMMENT ON COLUMN t_contacts.prefix IS 'Title: Mr, Mrs, Ms, Dr, Prof, Sri';
COMMENT ON COLUMN t_contacts.normalized_name IS 'Auto-generated normalized name for matching: removes titles, special chars, uppercase';

-- TABLE: t_contact_channels
CREATE TABLE t_contact_channels (
    id SERIAL PRIMARY KEY,
    contact_id INTEGER REFERENCES t_contacts(id) ON DELETE CASCADE,
    tenant_id INTEGER DEFAULT 1 REFERENCES t_tenants(id),
    is_live BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    channel_type VARCHAR(50) NOT NULL CHECK (
        channel_type IN ('email', 'mobile', 'whatsapp', 'instagram', 'twitter', 'linkedin', 'other')
    ),
    channel_value VARCHAR(255) NOT NULL,
    channel_subtype VARCHAR(50) DEFAULT 'personal' CHECK (
        channel_subtype IN ('personal', 'work', 'other')
    ),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_channel_per_contact UNIQUE (contact_id, channel_type, channel_value, is_live)
);

COMMENT ON TABLE t_contact_channels IS 'Flexible communication channels for contacts';
COMMENT ON COLUMN t_contact_channels.channel_type IS 'Type: email, mobile, whatsapp, social media';
COMMENT ON COLUMN t_contact_channels.is_primary IS 'Primary channel for this type';

-- TABLE: t_customers
-- NOTE: Migration 025 removed unique PAN constraint to allow minors to share guardian's PAN
-- Duplicate detection now uses iwell_code only (see check_customer_duplicate function)
CREATE TABLE t_customers (
    id SERIAL PRIMARY KEY,
    contact_id INTEGER REFERENCES t_contacts(id) ON DELETE CASCADE,
    tenant_id INTEGER DEFAULT 1 REFERENCES t_tenants(id),
    is_live BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    pan VARCHAR(10),
    iwell_code VARCHAR(100),
    date_of_birth DATE,
    anniversary_date DATE,
    survival_status VARCHAR(20) DEFAULT 'alive' CHECK (survival_status IN ('alive', 'deceased')),
    date_of_death DATE,
    family_head_name VARCHAR(255),
    family_head_iwell_code VARCHAR(100),
    referred_by INTEGER REFERENCES t_contacts(id),
    referred_by_name VARCHAR(255),
    onboarding_form_id INTEGER,
    onboarding_status VARCHAR(50) DEFAULT 'pending' CHECK (
        onboarding_status IN ('pending', 'in_progress', 'completed', 'cancelled')
    ),
    jtbd_count INTEGER DEFAULT 0,
    has_jtbd_setup BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES t_users(id),
    -- NOTE: No unique constraint on PAN - minors share parent's PAN (Migration 025)
    CONSTRAINT death_date_logic CHECK (
        (survival_status = 'alive' AND date_of_death IS NULL) OR
        (survival_status = 'deceased' AND date_of_death IS NOT NULL)
    )
);

COMMENT ON TABLE t_customers IS 'Customer records with financial and personal data';
COMMENT ON COLUMN t_customers.pan IS 'PAN card number - stored as PLAIN TEXT. NOT unique - minors share guardian PAN';
COMMENT ON COLUMN t_customers.iwell_code IS 'IWELL code - stored as PLAIN TEXT. Used as primary duplicate detection key';
COMMENT ON COLUMN t_customers.survival_status IS 'Alive or deceased status for tracking';
COMMENT ON COLUMN t_customers.jtbd_count IS 'Count of active JTBD configurations for this customer';
COMMENT ON COLUMN t_customers.has_jtbd_setup IS 'Flag indicating if customer has any JTBD configurations';

-- TABLE: t_customer_addresses
CREATE TABLE t_customer_addresses (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES t_customers(id) ON DELETE CASCADE,
    tenant_id INTEGER DEFAULT 1 REFERENCES t_tenants(id),
    is_live BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    address_type VARCHAR(50) DEFAULT 'residential' CHECK (
        address_type IN ('residential', 'office', 'mailing', 'permanent', 'temporary', 'other')
    ),
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) DEFAULT 'India',
    pincode VARCHAR(20) NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_address_type_per_customer UNIQUE (customer_id, address_type, is_live)
);

COMMENT ON TABLE t_customer_addresses IS 'Multiple addresses per customer with type classification';
COMMENT ON COLUMN t_customer_addresses.is_primary IS 'Primary address for the customer';

-- TABLE: t_customer_meetings
CREATE TABLE t_customer_meetings (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
    is_live BOOLEAN NOT NULL,
    customer_id INTEGER NOT NULL REFERENCES t_customers(id) ON DELETE CASCADE,

    -- Meeting details
    meeting_type VARCHAR(50) NOT NULL CHECK (meeting_type IN ('review', 'planning', 'onboarding', 'grievance', 'other')),
    meeting_mode VARCHAR(20) NOT NULL CHECK (meeting_mode IN ('in_person', 'video_call', 'phone_call')),

    -- Scheduling
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 60,

    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),

    -- Location/Link (based on meeting_mode)
    meeting_location TEXT,
    meeting_link TEXT,

    -- Meeting content
    agenda TEXT,
    notes TEXT,
    outcome TEXT,

    -- Completion/Cancellation tracking
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,

    -- Audit fields
    created_by INTEGER NOT NULL REFERENCES t_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE t_customer_meetings IS 'Customer meeting scheduling, tracking, and follow-up management';
COMMENT ON COLUMN t_customer_meetings.meeting_type IS 'Type: review, planning, onboarding, grievance, other';
COMMENT ON COLUMN t_customer_meetings.meeting_mode IS 'Mode: in_person, video_call, phone_call';
COMMENT ON COLUMN t_customer_meetings.scheduled_date IS 'Date when meeting is scheduled (ISO format)';
COMMENT ON COLUMN t_customer_meetings.scheduled_time IS 'Time when meeting is scheduled (HH:MM format)';
COMMENT ON COLUMN t_customer_meetings.duration_minutes IS 'Meeting duration in minutes (default: 60)';
COMMENT ON COLUMN t_customer_meetings.status IS 'Status: scheduled, completed, cancelled, rescheduled';
COMMENT ON COLUMN t_customer_meetings.meeting_location IS 'Physical location for in-person meetings';
COMMENT ON COLUMN t_customer_meetings.meeting_link IS 'Video call URL for video_call meetings';
COMMENT ON COLUMN t_customer_meetings.outcome IS 'Meeting outcome/summary after completion';

-- ============================================================================
-- TABLE: t_customer_aliases (Customer alias/grouping feature)
-- Description: Stores alias definitions for virtually grouping duplicate customer profiles
-- ============================================================================
CREATE TABLE t_customer_aliases (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
    alias_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by INTEGER NOT NULL REFERENCES t_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    -- Ensure unique alias names per tenant
    CONSTRAINT uq_alias_name_tenant UNIQUE (tenant_id, alias_name)
);

COMMENT ON TABLE t_customer_aliases IS 'Stores alias definitions for virtually grouping duplicate customer profiles';

-- ============================================================================
-- TABLE: t_customer_alias_members (Links customers to aliases)
-- Description: Links customers to their alias group
-- ============================================================================
CREATE TABLE t_customer_alias_members (
    id SERIAL PRIMARY KEY,
    alias_id INTEGER NOT NULL REFERENCES t_customer_aliases(id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES t_customers(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    added_by INTEGER NOT NULL REFERENCES t_users(id),
    -- Each customer can only be in one alias (prevent double-counting)
    CONSTRAINT uq_customer_alias UNIQUE (customer_id),
    -- Each alias can only have one primary customer
    CONSTRAINT uq_alias_primary EXCLUDE (alias_id WITH =) WHERE (is_primary = true)
);

COMMENT ON TABLE t_customer_alias_members IS 'Links customers to their alias group';
COMMENT ON COLUMN t_customer_alias_members.is_primary IS 'Identifies the primary customer record in the alias for display purposes';
COMMENT ON CONSTRAINT uq_customer_alias ON t_customer_alias_members IS 'Each customer can only belong to one alias to prevent double-counting in aggregations';

-- ============================================================================
-- SECTION 4: FILE UPLOAD & IMPORT TABLES
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Creating Import and File Upload Tables...';
END $$;

-- TABLE: t_file_uploads
CREATE TABLE t_file_uploads (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER DEFAULT 1 REFERENCES t_tenants(id),
    is_live BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    file_type VARCHAR(50) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    folder_path VARCHAR(500),
    file_size BIGINT,
    mime_type VARCHAR(100),
    file_hash VARCHAR(64),
    customer_id INTEGER REFERENCES t_customers(id),
    processing_status VARCHAR(50) DEFAULT 'pending' CHECK (
        processing_status IN ('pending', 'processing', 'completed', 'failed')
    ),
    processed_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    error_details TEXT,
    is_processed BOOLEAN DEFAULT false,
    processed_folder_path VARCHAR(500),
    uploaded_by INTEGER REFERENCES t_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

COMMENT ON TABLE t_file_uploads IS 'Track all uploaded files for import and document management';
COMMENT ON COLUMN t_file_uploads.file_type IS 'Type: customer_import, transaction_import, customer_document, scheme_import';
COMMENT ON COLUMN t_file_uploads.file_hash IS 'SHA256 hash of file content for duplicate detection';

-- TABLE: t_import_sessions (UPDATED: Restart capability from Migration 006)
CREATE TABLE t_import_sessions (
    id SERIAL PRIMARY KEY,
    session_name VARCHAR(255) NOT NULL,
    file_upload_id INTEGER REFERENCES t_file_uploads(id),
    tenant_id INTEGER DEFAULT 1 REFERENCES t_tenants(id),
    is_live BOOLEAN DEFAULT true,
    import_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (
        status IN ('pending', 'staged', 'pending_processing', 'processing', 'completed', 'completed_with_errors', 'failed', 'cancelled')
    ),
    current_stage VARCHAR(50),
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    duplicate_records INTEGER DEFAULT 0,
    orphan_records INTEGER DEFAULT 0,
    duplicate_check_result JSONB,
    duplicate_classification VARCHAR(50),
    duplicate_user_decision_at TIMESTAMP,
    filename_duplicate_check JSONB,
    staging_completed_at TIMESTAMP,
    staging_total_rows INTEGER DEFAULT 0,
    staging_processed_rows INTEGER DEFAULT 0,
    staging_successful_rows INTEGER DEFAULT 0,
    staging_failed_rows INTEGER DEFAULT 0,
    staging_skipped_rows INTEGER DEFAULT 0,
    batch_size INTEGER DEFAULT 100,
    current_batch INTEGER DEFAULT 0,
    total_batches INTEGER DEFAULT 0,
    last_processed_row INTEGER DEFAULT 0,
    
    -- Restart capability (Migration 006)
    restart_count INTEGER DEFAULT 0,
    last_restart_at TIMESTAMP WITH TIME ZONE,
    can_restart BOOLEAN DEFAULT true,
    last_processed_staging_id INTEGER,
    processing_checkpoint JSONB DEFAULT '{}',
    customer_lookup_method VARCHAR(50) DEFAULT 'iwell_code' CHECK (customer_lookup_method IN ('iwell_code', 'customer_name', 'both')),
    
    processing_metadata JSONB,
    processing_started_at TIMESTAMP,
    processing_completed_at TIMESTAMP,
    error_summary TEXT,
    n8n_webhook_id VARCHAR(255),
    n8n_execution_id VARCHAR(255),
    created_by INTEGER REFERENCES t_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE t_import_sessions IS 'Track import processing sessions with batch progress and restart capability';
COMMENT ON COLUMN t_import_sessions.import_type IS 'Type: CustomerData, TransactionData, SchemeData, or custom types';
COMMENT ON COLUMN t_import_sessions.status IS 'Status: pending, staged, pending_processing, processing, completed, completed_with_errors, failed, cancelled';
COMMENT ON COLUMN t_import_sessions.restart_count IS 'Number of times this session has been restarted after timeout or failure';
COMMENT ON COLUMN t_import_sessions.last_restart_at IS 'Timestamp of the last restart attempt';
COMMENT ON COLUMN t_import_sessions.can_restart IS 'Whether this session can be restarted (false for cancelled/completed sessions)';
COMMENT ON COLUMN t_import_sessions.last_processed_staging_id IS 'ID of last successfully processed staging record, used as checkpoint for restart';
COMMENT ON COLUMN t_import_sessions.processing_checkpoint IS 'JSON object storing checkpoint data: {batch_number, records_in_batch, last_row_number, phase}';
COMMENT ON COLUMN t_import_sessions.customer_lookup_method IS 'Method used for customer lookup in transaction imports: iwell_code (default), customer_name, or both';

-- TABLE: t_import_staging_data (UPDATED: Match tracking from Migration 006)
CREATE TABLE t_import_staging_data (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    is_live BOOLEAN DEFAULT false,
    session_id INTEGER NOT NULL REFERENCES t_import_sessions(id) ON DELETE CASCADE,
    import_type VARCHAR(50) NOT NULL,
    row_number INTEGER NOT NULL,
    raw_data JSONB NOT NULL,
    mapped_data JSONB,
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (
        processing_status IN ('pending', 'pending_process', 'processing', 'success', 'failed', 'skipped', 'duplicate', 'orphan')
    ),
    error_messages TEXT[],
    warnings TEXT[],
    created_record_id INTEGER,
    created_record_type VARCHAR(50),
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processing_metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Match tracking (Migration 006)
    match_type VARCHAR(50),
    match_confidence VARCHAR(20),
    ambiguous_matches JSONB,
    requires_review BOOLEAN DEFAULT false,
    edit_history JSONB DEFAULT '[]',
    edited_at TIMESTAMP WITH TIME ZONE,
    edited_by INTEGER REFERENCES t_users(id) ON DELETE SET NULL,
    reprocess_count INTEGER DEFAULT 0,
    last_reprocess_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT idx_unique_session_row UNIQUE(session_id, row_number)
);

COMMENT ON TABLE t_import_staging_data IS 'Staging table for ETL import processing with match tracking';
COMMENT ON COLUMN t_import_staging_data.raw_data IS 'Original row data as received from uploaded file';
COMMENT ON COLUMN t_import_staging_data.mapped_data IS 'Transformed data after applying field mappings';
COMMENT ON COLUMN t_import_staging_data.match_type IS 'Type of match found: exact_iwell, exact_name, name_with_pan, scheme_alias, etc';
COMMENT ON COLUMN t_import_staging_data.match_confidence IS 'Confidence level: high, medium, low, ambiguous, not_found';
COMMENT ON COLUMN t_import_staging_data.ambiguous_matches IS 'JSON array of potential matches when multiple customers/schemes match';
COMMENT ON COLUMN t_import_staging_data.requires_review IS 'Flag indicating this record needs manual review';
COMMENT ON COLUMN t_import_staging_data.edit_history IS 'JSON array tracking all edits: [{edited_at, edited_by, field, old_value, new_value}, ...]';
COMMENT ON COLUMN t_import_staging_data.reprocess_count IS 'Number of times this record has been reprocessed after edits';

-- TABLE: t_import_field_mappings
CREATE TABLE t_import_field_mappings (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER DEFAULT 1 REFERENCES t_tenants(id),
    is_live BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    import_type VARCHAR(50) NOT NULL,
    template_name VARCHAR(255) NOT NULL,
    template_version INTEGER DEFAULT 1,
    field_mappings JSONB NOT NULL,
    validation_rules JSONB,
    is_default BOOLEAN DEFAULT false,
    created_by INTEGER REFERENCES t_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_template_per_type UNIQUE (tenant_id, import_type, template_name, is_live)
);

COMMENT ON TABLE t_import_field_mappings IS 'Field mapping templates for different import types';
COMMENT ON COLUMN t_import_field_mappings.field_mappings IS 'JSON structure defining source to target field mappings';

-- TABLE: t_import_record_results
CREATE TABLE t_import_record_results (
    id SERIAL PRIMARY KEY,
    import_session_id INTEGER REFERENCES t_import_sessions(id) ON DELETE CASCADE,
    tenant_id INTEGER DEFAULT 1 REFERENCES t_tenants(id),
    is_live BOOLEAN DEFAULT true,
    row_number INTEGER NOT NULL,
    raw_data JSONB NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('success', 'failed', 'duplicate', 'skipped')),
    error_messages TEXT[],
    warnings TEXT[],
    created_contact_id INTEGER REFERENCES t_contacts(id),
    created_customer_id INTEGER REFERENCES t_customers(id),
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE t_import_record_results IS 'Detailed results for each imported record';

-- TABLE: t_import_logs
CREATE TABLE t_import_logs (
    id SERIAL PRIMARY KEY,
    file_upload_id INTEGER REFERENCES t_file_uploads(id),
    tenant_id INTEGER DEFAULT 1 REFERENCES t_tenants(id),
    is_live BOOLEAN DEFAULT true,
    import_type VARCHAR(50) NOT NULL,
    total_records INTEGER,
    successful_records INTEGER,
    failed_records INTEGER,
    duplicate_records INTEGER,
    import_summary JSONB,
    error_details TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    imported_by INTEGER REFERENCES t_users(id)
);

COMMENT ON TABLE t_import_logs IS 'Audit trail for import operations';

-- ============================================================================
-- SECTION 5: SCHEME & NAV TABLES
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Creating Scheme and NAV Tables...';
END $$;

-- TABLE: t_scheme_masters
CREATE TABLE t_scheme_masters (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER DEFAULT 1 REFERENCES t_tenants(id),
    is_live BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    master_type VARCHAR(50) CHECK (master_type IN ('scheme_type', 'scheme_category')),
    code VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE t_scheme_masters IS 'Master data for scheme types and categories';

-- TABLE: t_scheme_details
CREATE TABLE t_scheme_details (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES t_tenants(id) DEFAULT NULL,
    is_live BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    amc_name VARCHAR(255),
    scheme_code VARCHAR(100) UNIQUE,
    scheme_name VARCHAR(500) NOT NULL,
    scheme_type_id INTEGER REFERENCES t_scheme_masters(id),
    scheme_category_id INTEGER REFERENCES t_scheme_masters(id),
    scheme_nav_name VARCHAR(500),
    scheme_minimum_amount NUMERIC(15,2),
    launch_date DATE,
    closure_date DATE,
    isin_div_payout VARCHAR(50),
    isin_growth VARCHAR(50),
    isin_div_reinvestment VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES t_users(id),
    last_nav_download_date DATE,
    last_nav_download_status VARCHAR(20) CHECK (last_nav_download_status IN ('success', 'failed', 'in_progress', NULL)),
    last_nav_download_error TEXT,
    historical_data_available BOOLEAN DEFAULT false,
    earliest_nav_date DATE,
    latest_nav_date DATE,
    total_nav_records INTEGER DEFAULT 0
);

COMMENT ON TABLE t_scheme_details IS 'Mutual fund scheme details and metadata';

-- TABLE: t_scheme_bookmarks
CREATE TABLE t_scheme_bookmarks (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER DEFAULT 1 NOT NULL REFERENCES t_tenants(id),
    user_id INTEGER NOT NULL REFERENCES t_users(id),
    scheme_id INTEGER NOT NULL REFERENCES t_scheme_details(id),
    scheme_code VARCHAR(100) NOT NULL,
    scheme_name VARCHAR(500) NOT NULL,
    amc_name VARCHAR(255),
    is_live BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    daily_download_enabled BOOLEAN DEFAULT false,
    download_time VARCHAR(5) DEFAULT '22:00',
    historical_download_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    alias_name VARCHAR(255),
    CONSTRAINT unique_tenant_scheme UNIQUE(tenant_id, scheme_code, is_live)
);

COMMENT ON TABLE t_scheme_bookmarks IS 'User bookmarks for tracking specific schemes';
COMMENT ON COLUMN t_scheme_bookmarks.alias_name IS 'Custom scheme name (tenant preference). Falls back to scheme_name if NULL';

-- TABLE: t_scheme_aliases
CREATE TABLE t_scheme_aliases (
    id SERIAL PRIMARY KEY,
    scheme_id INTEGER NOT NULL REFERENCES t_scheme_details(id) ON DELETE CASCADE,
    scheme_code VARCHAR(100),
    alias_name VARCHAR(500) NOT NULL,
    alias_name_normalized VARCHAR(500) NOT NULL,
    source VARCHAR(50) DEFAULT 'manual',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by INTEGER REFERENCES t_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_alias_global UNIQUE (alias_name_normalized)
);

COMMENT ON TABLE t_scheme_aliases IS 'Global scheme alias mapping - stores multiple name variations for flexible transaction imports';

-- TABLE: t_nav_data
CREATE TABLE t_nav_data (
    id SERIAL PRIMARY KEY,
    scheme_id INTEGER NOT NULL REFERENCES t_scheme_details(id),
    scheme_code VARCHAR(100) NOT NULL,
    nav_date DATE NOT NULL,
    nav_value NUMERIC(15,4) NOT NULL,
    repurchase_price NUMERIC(15,4),
    sale_price NUMERIC(15,4),
    is_live BOOLEAN DEFAULT true,
    data_source VARCHAR(20) NOT NULL CHECK (data_source IN ('daily', 'historical', 'weekly')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Performance metrics
    daily_return NUMERIC(10,4),
    return_1w NUMERIC(10,4),
    return_1m NUMERIC(10,4),
    return_3m NUMERIC(10,4),
    return_6m NUMERIC(10,4),
    return_1y NUMERIC(10,4),
    return_ytd NUMERIC(10,4),
    return_all NUMERIC(10,4),
    sd_7d NUMERIC(10,4),
    sd_14d NUMERIC(10,4),
    sd_21d NUMERIC(10,4),
    sd_42d NUMERIC(10,4),
    sd_3m NUMERIC(10,4),
    sd_6m NUMERIC(10,4),
    count_3m INTEGER,
    count_42d INTEGER,
    sharpe_ratio NUMERIC(10,4),
    max_drawdown NUMERIC(10,4),
    total_risk NUMERIC(10,4),
    cagr NUMERIC(10,4),
    metrics_calculated_at TIMESTAMP,
    
    CONSTRAINT unique_nav_record UNIQUE (scheme_id, nav_date, is_live)
);

COMMENT ON TABLE t_nav_data IS 'Historical NAV data for mutual fund schemes with performance metrics';

-- TABLE: t_nav_download_jobs
CREATE TABLE t_nav_download_jobs (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER DEFAULT 1 NOT NULL REFERENCES t_tenants(id),
    job_type VARCHAR(20) NOT NULL CHECK (job_type IN ('daily', 'historical', 'weekly')),
    scheme_ids INTEGER[] NOT NULL,
    scheduled_date TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    start_date DATE,
    end_date DATE,
    n8n_execution_id VARCHAR(255),
    result_summary JSONB,
    error_details TEXT,
    is_live BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER
);

COMMENT ON TABLE t_nav_download_jobs IS 'Track NAV download jobs for schemes';

-- TABLE: t_nav_scheduler_configs
CREATE TABLE t_nav_scheduler_configs (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
    user_id INTEGER NOT NULL REFERENCES t_users(id),
    is_live BOOLEAN NOT NULL,
    schedule_type VARCHAR(20) NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'custom')),
    cron_expression VARCHAR(100) NOT NULL,
    download_time VARCHAR(5) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    n8n_webhook_url TEXT,
    last_executed_at TIMESTAMP,
    next_execution_at TIMESTAMP,
    execution_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_scheduler_config UNIQUE(tenant_id, user_id, is_live)
);

COMMENT ON TABLE t_nav_scheduler_configs IS 'Scheduler configurations for NAV downloads';

-- TABLE: t_nav_schedule_executions
CREATE TABLE t_nav_schedule_executions (
    id SERIAL PRIMARY KEY,
    scheduler_config_id INTEGER NOT NULL REFERENCES t_nav_scheduler_configs(id) ON DELETE CASCADE,
    execution_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'skipped', 'running')),
    job_id INTEGER,
    n8n_execution_id VARCHAR(100),
    error_message TEXT,
    execution_duration_ms INTEGER
);

COMMENT ON TABLE t_nav_schedule_executions IS 'Execution history for NAV scheduler';

-- ============================================================================
-- SECTION 6: PORTFOLIO & TRANSACTION TABLES
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Creating Portfolio and Transaction Tables...';
END $$;

-- TABLE: t_customer_master_portfolio (UPDATED: Added allocation from Migration 007)
CREATE TABLE t_customer_master_portfolio (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES t_customers(id),
    scheme_code VARCHAR(50),
    scheme_name VARCHAR(255),
    folio_no VARCHAR(100),
    category VARCHAR(100),
    sub_category VARCHAR(100),
    fund_name VARCHAR(255),
    start_date DATE,
    tenant_id INTEGER,
    is_live BOOLEAN,
    is_active BOOLEAN DEFAULT true,
    
    -- Goal allocation tracking (Migration 007)
    allocation DECIMAL(5,2) DEFAULT 0.00 CHECK (allocation >= 0 AND allocation <= 100),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_portfolio_record UNIQUE(customer_id, scheme_code, tenant_id, is_live)
);

COMMENT ON TABLE t_customer_master_portfolio IS 'Customer portfolio master records with categorization and goal allocation';
COMMENT ON COLUMN t_customer_master_portfolio.allocation IS 'Percentage of this scheme allocated to goals (0-100%). Auto-updated via trigger from t_jtbd_configurations.';

-- TABLE: m_transaction_types
CREATE TABLE m_transaction_types (
    id SERIAL PRIMARY KEY,
    txn_code VARCHAR(50) UNIQUE NOT NULL,
    txn_name VARCHAR(255) NOT NULL,
    txn_type VARCHAR(50) NOT NULL CHECK (txn_type IN ('Addition', 'Deduction')),
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE m_transaction_types IS 'Master data for transaction types (SIP, Purchase, Redemption, etc.)';
-- NOTE: Transaction types are seeded in 05_seed_data.sql (11 types including Migration 026 aliases)

-- TABLE: t_transaction_table
CREATE TABLE t_transaction_table (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES t_customers(id),
    scheme_code VARCHAR(50),
    scheme_name VARCHAR(255),
    folio_no VARCHAR(100),
    txn_type_id INTEGER,
    txn_date DATE,
    total_amount NUMERIC(15,2),
    units NUMERIC(15,4),
    nav NUMERIC(10,4),
    stamp_duty NUMERIC(10,2),
    is_potential_duplicate BOOLEAN DEFAULT false,
    portfolio_flag BOOLEAN DEFAULT true,
    staging_record_id INTEGER REFERENCES t_import_staging_data(id) ON DELETE SET NULL,
    import_session_id INTEGER REFERENCES t_import_sessions(id) ON DELETE SET NULL,
    duplicate_reason TEXT,
    tenant_id INTEGER,
    is_live BOOLEAN,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scheme_id INTEGER REFERENCES t_scheme_details(id),
    txn_description TEXT,
    txn_source VARCHAR(100),
    stt NUMERIC(15,2) DEFAULT 0,
    tds NUMERIC(15,2) DEFAULT 0
);

COMMENT ON TABLE t_transaction_table IS 'Investment transaction records with import tracking';

-- TABLE: t_monthly_portfolio_snapshots
-- Extended for multi-asset support (NetworthViewer feature)
CREATE TABLE t_monthly_portfolio_snapshots (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    is_live BOOLEAN NOT NULL,
    customer_id INTEGER NOT NULL,
    snapshot_month_end DATE NOT NULL,

    -- Value columns
    total_invested NUMERIC(18,2),
    current_value NUMERIC(18,2),
    total_returns NUMERIC(18,2),
    return_percentage NUMERIC(10,2),

    -- MF-specific columns (nullable for non-MF assets)
    total_units NUMERIC(18,4),           -- Only for MF: sum of units
    total_schemes INTEGER,                -- Only for MF: count of schemes

    -- Multi-asset support columns
    asset_type_code VARCHAR(50) DEFAULT 'MF',  -- MF, RE, GOLD, FD, etc.
    investment_plan_id INTEGER,                 -- FK to t_customer_asset_assignments (NULL for MF aggregated)
    calculation_method VARCHAR(20) DEFAULT 'NAV',  -- NAV or ASSUMPTION
    growth_rate_applied NUMERIC(5,2),           -- Rate used for assumption-based calculation
    actual_amount NUMERIC(18,2),                -- User-entered override value

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT chk_calculation_method CHECK (calculation_method IN ('NAV', 'ASSUMPTION'))
);

COMMENT ON TABLE t_monthly_portfolio_snapshots IS 'Monthly portfolio/networth snapshots for tracking performance across all asset types';
COMMENT ON COLUMN t_monthly_portfolio_snapshots.asset_type_code IS 'Asset type code (MF, RE, GOLD, FD, etc.). Default MF for backward compatibility.';
COMMENT ON COLUMN t_monthly_portfolio_snapshots.investment_plan_id IS 'Reference to t_customer_asset_assignments. NULL for MF aggregated snapshots.';
COMMENT ON COLUMN t_monthly_portfolio_snapshots.calculation_method IS 'How current_value was calculated: NAV (units × nav_value) or ASSUMPTION (principal × growth_rate).';
COMMENT ON COLUMN t_monthly_portfolio_snapshots.growth_rate_applied IS 'Annual growth rate used for assumption-based calculations (e.g., 8.00 for 8%).';
COMMENT ON COLUMN t_monthly_portfolio_snapshots.actual_amount IS 'User-entered actual market value. When set, overrides calculated current_value for display.';

-- TABLE: t_portfolio_snapshot_configs
CREATE TABLE t_portfolio_snapshot_configs (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
    user_id INTEGER NOT NULL REFERENCES t_users(id),
    is_live BOOLEAN NOT NULL,
    schedule_type VARCHAR(20) NOT NULL DEFAULT 'weekly',
    cron_expression VARCHAR(100) NOT NULL DEFAULT '0 21 * * 5',
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    last_executed_at TIMESTAMP,
    next_execution_at TIMESTAMP,
    execution_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_snapshot_scheduler UNIQUE(tenant_id, is_live),
    CONSTRAINT valid_schedule_type CHECK (schedule_type IN ('weekly', 'monthly', 'custom'))
);

COMMENT ON TABLE t_portfolio_snapshot_configs IS 'Scheduler configurations for automated portfolio snapshot generation';

-- TABLE: t_portfolio_snapshot_executions
CREATE TABLE t_portfolio_snapshot_executions (
    id SERIAL PRIMARY KEY,
    scheduler_config_id INTEGER NOT NULL REFERENCES t_portfolio_snapshot_configs(id) ON DELETE CASCADE,
    tenant_id INTEGER NOT NULL,
    is_live BOOLEAN NOT NULL,
    execution_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL,
    trigger_source VARCHAR(20) NOT NULL,
    snapshot_month_end DATE,
    customers_processed INTEGER DEFAULT 0,
    customers_failed INTEGER DEFAULT 0,
    snapshots_created INTEGER DEFAULT 0,
    snapshots_updated INTEGER DEFAULT 0,
    retry_attempt INTEGER DEFAULT 0,
    error_message TEXT,
    error_details JSONB,
    execution_duration_ms INTEGER,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_status CHECK (status IN ('success', 'failed', 'running', 'retrying', 'skipped')),
    CONSTRAINT valid_trigger_source CHECK (trigger_source IN ('scheduled', 'manual', 'failover'))
);

COMMENT ON TABLE t_portfolio_snapshot_executions IS 'Execution history for portfolio snapshot jobs';

-- TABLE: m_job_types
CREATE TABLE m_job_types (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    default_cron_expression VARCHAR(100),
    default_max_retries INTEGER DEFAULT 3,
    is_active BOOLEAN DEFAULT true,
    default_schedule_type VARCHAR(20) DEFAULT 'daily',  -- daily, weekly, monthly
    failover_enabled BOOLEAN DEFAULT false,
    failover_cron_expression VARCHAR(50),
    is_global BOOLEAN DEFAULT false,  -- True for NAV/Market jobs that run once for all tenants
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE m_job_types IS 'Registry of all available job types in the system';
COMMENT ON COLUMN m_job_types.default_schedule_type IS 'Default schedule type: daily, weekly, monthly';
COMMENT ON COLUMN m_job_types.failover_enabled IS 'Default failover enabled setting';
COMMENT ON COLUMN m_job_types.failover_cron_expression IS 'Default failover cron expression';
COMMENT ON COLUMN m_job_types.is_global IS 'If true, job runs once globally (not per-tenant) - e.g., NAV/Market downloads';

-- TABLE: t_job_scheduler_configs
CREATE TABLE t_job_scheduler_configs (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
    job_type VARCHAR(50) NOT NULL REFERENCES m_job_types(code),
    user_id INTEGER NOT NULL REFERENCES t_users(id),
    is_live BOOLEAN NOT NULL,
    schedule_type VARCHAR(20) NOT NULL DEFAULT 'daily',
    cron_expression VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    max_retries INTEGER NOT NULL DEFAULT 3,
    job_config JSONB,
    -- Failover support
    failover_enabled BOOLEAN DEFAULT false,
    failover_cron_expression VARCHAR(50),
    -- Tracking
    last_executed_at TIMESTAMP,
    next_execution_at TIMESTAMP,
    last_success_at TIMESTAMP,
    execution_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_job_scheduler_config UNIQUE(tenant_id, job_type, is_live),
    CONSTRAINT valid_schedule_type CHECK (schedule_type IN ('daily', 'weekly', 'monthly', 'custom'))
);

COMMENT ON TABLE t_job_scheduler_configs IS 'Scheduler configurations for all job types';
COMMENT ON COLUMN t_job_scheduler_configs.failover_enabled IS 'Enable failover execution if primary fails';
COMMENT ON COLUMN t_job_scheduler_configs.failover_cron_expression IS 'Cron for failover time (e.g., 0 22 * * * for 10 PM)';
COMMENT ON COLUMN t_job_scheduler_configs.last_success_at IS 'Timestamp of last successful execution';

-- TABLE: t_job_executions
CREATE TABLE t_job_executions (
    id SERIAL PRIMARY KEY,
    scheduler_config_id INTEGER NOT NULL REFERENCES t_job_scheduler_configs(id) ON DELETE CASCADE,
    job_type VARCHAR(50) NOT NULL REFERENCES m_job_types(code),
    tenant_id INTEGER NOT NULL,
    is_live BOOLEAN NOT NULL,
    execution_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL,
    trigger_source VARCHAR(20) NOT NULL,
    retry_attempt INTEGER DEFAULT 0,
    execution_data JSONB,
    error_message TEXT,
    error_details JSONB,
    execution_duration_ms INTEGER,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_status CHECK (status IN ('success', 'failed', 'running', 'retrying', 'skipped')),
    CONSTRAINT valid_trigger_source CHECK (trigger_source IN ('scheduled', 'manual', 'failover'))
);

COMMENT ON TABLE t_job_executions IS 'Execution history for all job types';

-- ============================================================================
-- SECTION 7: JTBD (JOBS TO BE DONE) TABLES
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Creating JTBD Tables...';
END $$;

-- TABLE: m_alert_settings (NEW: Migration 023 - Alert System Enhancements)
-- Description: Configurable alert visibility settings - determines when alerts appear and expire
CREATE TABLE IF NOT EXISTS m_alert_settings (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES t_tenants(id),
    is_live BOOLEAN DEFAULT true,

    -- Setting identification
    setting_key VARCHAR(100) NOT NULL,
    setting_label VARCHAR(255) NOT NULL,

    -- Visibility window configuration
    days_before INTEGER NOT NULL DEFAULT 3,      -- Show alert X days before scheduled date
    days_after INTEGER NOT NULL DEFAULT 10,      -- Keep alert visible X days after scheduled date

    -- Auto-expire configuration (for notifications)
    auto_expire_hours INTEGER,                   -- NULL = never auto-expire

    -- Which alert types this setting applies to
    applies_to_types TEXT[],                     -- Array of jtbd_type values, NULL = all types

    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Unique constraint per tenant (or global if tenant_id is NULL)
    CONSTRAINT unique_alert_setting UNIQUE (tenant_id, is_live, setting_key)
);

COMMENT ON TABLE m_alert_settings IS 'Configurable alert visibility settings - determines when alerts appear and expire';
COMMENT ON COLUMN m_alert_settings.tenant_id IS 'NULL for global defaults, tenant_id for tenant-specific overrides';
COMMENT ON COLUMN m_alert_settings.days_before IS 'Number of days before next_alert_date to start showing the alert';
COMMENT ON COLUMN m_alert_settings.days_after IS 'Number of days after next_alert_date to keep showing the alert';
COMMENT ON COLUMN m_alert_settings.auto_expire_hours IS 'For notifications: auto-deactivate after X hours from creation';
COMMENT ON COLUMN m_alert_settings.applies_to_types IS 'Array of jtbd_type values this setting applies to. NULL = all types.';

-- Seed default alert settings (global defaults with tenant_id = NULL)
INSERT INTO m_alert_settings (tenant_id, is_live, setting_key, setting_label, days_before, days_after, auto_expire_hours, applies_to_types)
VALUES
    -- Default for SIP/Recurring alerts (show 3 days before, keep 10 days after)
    (NULL, true, 'sip_recurring_default', 'SIP/Recurring Payment Alerts', 3, 10, NULL, ARRAY['goal_sip_plan', 'portfolio_alert']),

    -- Default for time-based alerts (birthday, anniversary - show 7 days before, keep 3 days after)
    (NULL, true, 'time_based_default', 'Time-Based Reminders', 7, 3, NULL, ARRAY['time_based', 'profile_trigger']),

    -- Default for import notifications (auto-expire after 24 hours)
    (NULL, true, 'import_notification_default', 'Import Notifications', 0, 0, 24, ARRAY['import_notification']),

    -- Default fallback for any other alert types
    (NULL, true, 'general_default', 'General Alerts', 3, 10, NULL, NULL)
ON CONFLICT (tenant_id, is_live, setting_key) DO NOTHING;

-- TABLE: t_jtbd_configurations (UPDATED: Added jtbd_category from JTBD Consolidation, completion tracking from Migration 023)
CREATE TABLE t_jtbd_configurations (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
    is_live BOOLEAN NOT NULL DEFAULT true,
    customer_id INTEGER NOT NULL REFERENCES t_customers(id),
    jtbd_type VARCHAR(50) NOT NULL,
    jtbd_category VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    is_active BOOLEAN NOT NULL DEFAULT true,
    config_data JSONB NOT NULL,
    is_watchlisted BOOLEAN DEFAULT FALSE,
    watchlist_auto_added BOOLEAN DEFAULT FALSE,
    watchlist_added_at TIMESTAMP,
    next_alert_date DATE,
    created_by INTEGER NOT NULL REFERENCES t_users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Alert completion tracking (Migration 023)
    completed_at TIMESTAMP,
    completed_by INTEGER REFERENCES t_users(id),
    completion_source VARCHAR(50),
    auto_expire_at TIMESTAMP,

    -- Constraints
    CONSTRAINT chk_completion_source CHECK (
        completion_source IS NULL OR
        completion_source IN ('manual', 'transaction_import', 'auto_expire', 'system')
    )
);

COMMENT ON TABLE t_jtbd_configurations IS 'Unified JTBD configurations - Goals, Alerts, and Meeting templates. Use jtbd_category to filter.';
COMMENT ON COLUMN t_jtbd_configurations.jtbd_type IS 'Type: portfolio_alert, time_based, profile_trigger, goal_tracking, etc.';
COMMENT ON COLUMN t_jtbd_configurations.jtbd_category IS 'Category: transactional (goals), alert (reminders, SIPs), meeting (client meetings)';
COMMENT ON COLUMN t_jtbd_configurations.completed_at IS 'Timestamp when the alert was marked as completed';
COMMENT ON COLUMN t_jtbd_configurations.completed_by IS 'User who completed the alert (NULL for system/auto)';
COMMENT ON COLUMN t_jtbd_configurations.completion_source IS 'How alert was completed: manual, transaction_import, auto_expire, system';
COMMENT ON COLUMN t_jtbd_configurations.auto_expire_at IS 'For notifications: auto-deactivate after this timestamp';

-- TABLE: t_jtbd_executions (NEW: From JTBD Consolidation migration)
CREATE TABLE t_jtbd_executions (
    id SERIAL PRIMARY KEY,

    -- Multi-tenancy
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
    is_live BOOLEAN NOT NULL DEFAULT true,

    -- Link to configuration (optional)
    config_id INTEGER REFERENCES t_jtbd_configurations(id) ON DELETE CASCADE,

    -- Customer link
    customer_id INTEGER NOT NULL REFERENCES t_customers(id) ON DELETE CASCADE,

    -- Execution type
    execution_type VARCHAR(50) NOT NULL,

    -- Title and description
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Priority
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',

    -- Scheduling
    scheduled_date DATE NOT NULL,
    scheduled_time TIME,

    -- Execution tracking
    execution_status VARCHAR(50) NOT NULL DEFAULT 'planned',
    execution_date DATE,
    execution_time TIME,
    deviation_days INTEGER,

    -- Execution data (flexible JSON)
    execution_data JSONB DEFAULT '{}'::jsonb,

    -- Audit fields
    created_by INTEGER NOT NULL REFERENCES t_users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_by INTEGER REFERENCES t_users(id),
    completed_at TIMESTAMP
);

COMMENT ON TABLE t_jtbd_executions IS 'JTBD execution instances - Tracks meetings, SIP plans, and other execution records. Linked to configs via config_id.';
COMMENT ON COLUMN t_jtbd_executions.config_id IS 'Optional link to parent configuration. NULL for standalone executions like one-time meetings.';
COMMENT ON COLUMN t_jtbd_executions.execution_type IS 'Type: goal_sip_plan, client_meeting, portfolio_review, goal_review, etc.';
COMMENT ON COLUMN t_jtbd_executions.execution_status IS 'Status: planned, due, completed, not_executed, delayed, failed, cancelled';
COMMENT ON COLUMN t_jtbd_executions.deviation_days IS 'Days difference between scheduled and actual execution. Negative=early, Positive=late';
COMMENT ON COLUMN t_jtbd_executions.execution_data IS 'Flexible JSONB for type-specific data: meeting notes, SIP details, transaction IDs, etc.';

-- TABLE: t_goal_alerts
CREATE TABLE t_goal_alerts (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
    is_live BOOLEAN NOT NULL,
    goal_id INTEGER NOT NULL REFERENCES t_jtbd_configurations(id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES t_customers(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    action_required VARCHAR(100),
    action_details JSONB,
    is_acknowledged BOOLEAN DEFAULT false,
    acknowledged_at TIMESTAMP,
    acknowledged_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE t_goal_alerts IS 'Alerts generated for customer goals and JTBD configurations';

-- TABLE: t_goal_progress_snapshots
CREATE TABLE t_goal_progress_snapshots (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
    is_live BOOLEAN NOT NULL,
    goal_id INTEGER NOT NULL REFERENCES t_jtbd_configurations(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    current_value NUMERIC(15,2) NOT NULL,
    monthly_contribution NUMERIC(15,2) NOT NULL,
    projected_corpus NUMERIC(15,2),
    projected_achievement_date DATE,
    probability_of_success NUMERIC(5,2),
    on_track BOOLEAN,
    deviation_percentage NUMERIC(5,2),
    recalculation_trigger VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_goal_snapshot UNIQUE (goal_id, snapshot_date)
);

COMMENT ON TABLE t_goal_progress_snapshots IS 'Progress snapshots for tracking goal achievement over time';

-- ============================================================================
-- DEPRECATED: t_goal_scheme_allocations (Replaced by t_goal_investment_allocations in Phase 2)
-- ============================================================================
-- TABLE: t_goal_scheme_allocations (OLD - Phase 1)
-- DEPRECATED: This table is replaced by t_goal_investment_allocations in Release 1.1 Phase 2
-- Kept commented for reference. Will be dropped after Phase 2 deployment.
/*
CREATE TABLE t_goal_scheme_allocations (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
    is_live BOOLEAN NOT NULL,
    goal_id INTEGER NOT NULL REFERENCES t_jtbd_configurations(id) ON DELETE CASCADE,
    scheme_id INTEGER NOT NULL REFERENCES t_scheme_details(id),
    allocation_percentage NUMERIC(5,2) NOT NULL CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_goal_scheme_allocation UNIQUE (goal_id, scheme_id)
);

COMMENT ON TABLE t_goal_scheme_allocations IS 'Goal scheme allocation tracking for portfolio recommendations';
*/

-- ============================================================================
-- SECTION: MULTI-ASSET PORTFOLIO TABLES (Release 1.1 - Phase 1)
-- Note: Must be created BEFORE t_goal_investment_allocations which references t_customer_asset_assignments
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Creating Multi-Asset Portfolio Tables...';
END $$;

-- TABLE: m_asset_types
-- Description: Global master data for all supported asset types
-- Note: This is NOT tenant-isolated (master data shared across all tenants)
CREATE TABLE IF NOT EXISTS m_asset_types (
    id SERIAL PRIMARY KEY,
    asset_type_code VARCHAR(50) NOT NULL UNIQUE,
    asset_type_name VARCHAR(100) NOT NULL,
    category VARCHAR(50), -- equity, debt, commodity, real_estate, fixed_income
    default_assumption_rate DECIMAL(5,2), -- Default expected growth rate (e.g., 8.00 for 8% per year)
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE m_asset_types IS 'Master data table for all supported asset types - global across all tenants';
COMMENT ON COLUMN m_asset_types.asset_type_code IS 'Unique code identifier (e.g., MF, GOLD, EQUITY, FD)';
COMMENT ON COLUMN m_asset_types.asset_type_name IS 'Display name for the asset type';
COMMENT ON COLUMN m_asset_types.category IS 'Asset category: equity, debt, commodity, real_estate, fixed_income';
COMMENT ON COLUMN m_asset_types.default_assumption_rate IS 'Default expected annual growth rate percentage (e.g., 8.00 for 8%)';
COMMENT ON COLUMN m_asset_types.display_order IS 'Display order in UI (lower numbers first)';

-- TABLE: t_customer_asset_assignments
-- Description: Tracks detailed investment plans for each customer's asset assignments
-- Note: Tenant-isolated table
CREATE TABLE IF NOT EXISTS t_customer_asset_assignments (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
    is_live BOOLEAN NOT NULL DEFAULT true,
    customer_id INTEGER NOT NULL REFERENCES t_customers(id) ON DELETE CASCADE,
    asset_type_id INTEGER NOT NULL REFERENCES m_asset_types(id),

    -- Investment Plan Details
    principal_amount DECIMAL(15,2),
    start_date DATE,
    has_started BOOLEAN DEFAULT false,
    duration_months INTEGER,
    duration_years INTEGER,

    -- Investment Type & Frequency
    investment_type VARCHAR(20) CHECK (investment_type IN ('one_time', 'sip', 'recurring')),
    recurring_amount DECIMAL(15,2),
    investment_frequency VARCHAR(20) CHECK (investment_frequency IS NULL OR investment_frequency IN ('monthly', 'quarterly', 'yearly')),

    -- Growth & Returns
    custom_assumption_rate DECIMAL(5,2),

    -- MF Specific
    scheme_code VARCHAR(50),

    -- Metadata
    is_active BOOLEAN DEFAULT true,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES t_users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Alert configuration (Migration 023)
    alerts_enabled BOOLEAN DEFAULT true,

    CONSTRAINT chk_duration CHECK (
        (duration_months IS NOT NULL AND duration_years IS NULL) OR
        (duration_months IS NULL AND duration_years IS NOT NULL) OR
        (duration_months IS NULL AND duration_years IS NULL)
    )
);

COMMENT ON TABLE t_customer_asset_assignments IS 'Tracks customer investment plans with detailed information including principal, duration, investment type, and growth assumptions';
COMMENT ON COLUMN t_customer_asset_assignments.customer_id IS 'Reference to customer in t_customers';
COMMENT ON COLUMN t_customer_asset_assignments.asset_type_id IS 'Reference to asset type in m_asset_types (master data)';
COMMENT ON COLUMN t_customer_asset_assignments.principal_amount IS 'Initial investment amount or current principal value';
COMMENT ON COLUMN t_customer_asset_assignments.start_date IS 'Date when the investment starts or started';
COMMENT ON COLUMN t_customer_asset_assignments.has_started IS 'Whether the investment has actually started (vs planned)';
COMMENT ON COLUMN t_customer_asset_assignments.duration_months IS 'Investment duration in months (use either months or years, not both)';
COMMENT ON COLUMN t_customer_asset_assignments.duration_years IS 'Investment duration in years (use either months or years, not both)';
COMMENT ON COLUMN t_customer_asset_assignments.investment_type IS 'Type of investment: one_time, sip, or recurring';
COMMENT ON COLUMN t_customer_asset_assignments.recurring_amount IS 'For SIP/recurring: amount invested per period';
COMMENT ON COLUMN t_customer_asset_assignments.investment_frequency IS 'For SIP/recurring: monthly, quarterly, or yearly';
COMMENT ON COLUMN t_customer_asset_assignments.custom_assumption_rate IS 'Custom growth rate percentage (overrides asset type default)';
COMMENT ON COLUMN t_customer_asset_assignments.scheme_code IS 'For MF: scheme code from bookmarked funds';
COMMENT ON COLUMN t_customer_asset_assignments.is_active IS 'Whether this assignment is currently active';
COMMENT ON COLUMN t_customer_asset_assignments.assigned_by IS 'User who made the assignment';
COMMENT ON COLUMN t_customer_asset_assignments.notes IS 'Optional notes about the investment plan';
COMMENT ON COLUMN t_customer_asset_assignments.alerts_enabled IS 'Toggle to enable/disable automatic alert generation for this investment plan';

-- ============================================================================
-- TABLE: t_goal_investment_allocations (NEW - Phase 2)
-- ============================================================================
-- Links goals to investment plans (multi-asset support)
-- Replaces t_goal_scheme_allocations to enable tracking goals across all asset types
CREATE TABLE t_goal_investment_allocations (
    id SERIAL PRIMARY KEY,

    -- Multi-tenancy
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
    is_live BOOLEAN NOT NULL DEFAULT true,

    -- Goal reference (stored in t_jtbd_configurations)
    goal_id INTEGER NOT NULL REFERENCES t_jtbd_configurations(id) ON DELETE CASCADE,

    -- Investment Plan reference (from Phase 1 - t_customer_asset_assignments)
    investment_plan_id INTEGER NOT NULL REFERENCES t_customer_asset_assignments(id) ON DELETE CASCADE,

    -- Allocation details
    allocated_percentage DECIMAL(5,2) CHECK (allocated_percentage >= 0 AND allocated_percentage <= 100),
    allocated_amount DECIMAL(15,2),

    -- Notes
    notes TEXT,

    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES t_users(id),

    -- Constraints
    CONSTRAINT unique_goal_investment_allocation UNIQUE (goal_id, investment_plan_id)
);

COMMENT ON TABLE t_goal_investment_allocations IS 'Phase 2: Links goals to investment plans (multi-asset support). Replaces t_goal_scheme_allocations.';
COMMENT ON COLUMN t_goal_investment_allocations.goal_id IS 'Reference to goal in t_jtbd_configurations (where jtbd_category = ''transactional'')';
COMMENT ON COLUMN t_goal_investment_allocations.investment_plan_id IS 'Reference to investment plan in t_customer_asset_assignments (Phase 1)';
COMMENT ON COLUMN t_goal_investment_allocations.allocated_percentage IS 'Percentage of this investment allocated to goal (0-100%). Allows partial allocations.';
COMMENT ON COLUMN t_goal_investment_allocations.allocated_amount IS 'Fixed amount allocated (alternative to percentage). Usually NULL if percentage is used.';

-- ============================================================================
-- SECTION 8: BOOKMARK TABLES & REASON MASTERS
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Creating Bookmark Tables...';
END $$;

-- TABLE: m_bookmark_reasons
CREATE TABLE m_bookmark_reasons (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
    is_live BOOLEAN NOT NULL DEFAULT true,
    reason_code VARCHAR(50) NOT NULL,
    reason_label VARCHAR(100) NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_reason_per_tenant UNIQUE (tenant_id, is_live, reason_code)
);

COMMENT ON TABLE m_bookmark_reasons IS 'Tenant-specific bookmark reason master data';

-- TABLE: t_customer_bookmarks
CREATE TABLE t_customer_bookmarks (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
    is_live BOOLEAN NOT NULL DEFAULT true,
    customer_id INTEGER NOT NULL REFERENCES t_customers(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES t_users(id) ON DELETE CASCADE,
    reason_id INTEGER REFERENCES m_bookmark_reasons(id),
    custom_reason VARCHAR(100),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_bookmark_per_user_customer UNIQUE (tenant_id, is_live, customer_id, user_id),
    CONSTRAINT check_bookmark_reason CHECK (reason_id IS NOT NULL OR custom_reason IS NOT NULL)
);

COMMENT ON TABLE t_customer_bookmarks IS 'User bookmarks for tracking important customers with reasons/tags';

-- ============================================================================
-- SECTION 9: MARKET DATA TABLES
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Creating Market Data Tables...';
END $$;

-- TABLE: t_market_indices
CREATE TABLE t_market_indices (
    id SERIAL PRIMARY KEY,
    index_code VARCHAR(50) NOT NULL UNIQUE,
    index_name VARCHAR(200) NOT NULL,
    yahoo_symbol VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    
    -- Download tracking
    total_records INTEGER DEFAULT 0,
    earliest_date DATE,
    latest_date DATE,
    last_download_status VARCHAR(20),
    last_download_at TIMESTAMP,
    last_download_error TEXT,
    historical_data_available BOOLEAN DEFAULT false,
    
    -- EOD retry fields
    next_eod_retry_at TIMESTAMP,
    eod_retry_count INTEGER DEFAULT 0,
    last_successful_eod_download_at TIMESTAMP,
    
    -- Data provider fields
    data_provider VARCHAR(50) DEFAULT 'not_configured',
    provider_symbol VARCHAR(100),
    provider_enabled BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_data_provider 
        CHECK (data_provider IN ('yahoo_finance', 'nse_official', 'google_sheets', 'not_configured'))
);

COMMENT ON TABLE t_market_indices IS 'Master table for NSE market indices with multi-provider support';

-- Add foreign key constraint to t_tenants
ALTER TABLE t_tenants
ADD CONSTRAINT fk_default_comparison_index
FOREIGN KEY (default_comparison_index_id)
REFERENCES t_market_indices(id)
ON DELETE SET NULL;

-- TABLE: t_market_data_records
CREATE TABLE t_market_data_records (
    id SERIAL PRIMARY KEY,
    index_id INTEGER NOT NULL REFERENCES t_market_indices(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    open NUMERIC(15,2) NOT NULL,
    high NUMERIC(15,2) NOT NULL,
    low NUMERIC(15,2) NOT NULL,
    close NUMERIC(15,2) NOT NULL,
    volume BIGINT,
    adj_close NUMERIC(15,2),
    data_source VARCHAR(50) DEFAULT 'yahoo_finance',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Performance metrics
    daily_return NUMERIC(10,4),
    return_1w NUMERIC(10,4),
    return_1m NUMERIC(10,4),
    return_3m NUMERIC(10,4),
    return_6m NUMERIC(10,4),
    return_1y NUMERIC(10,4),
    return_ytd NUMERIC(10,4),
    return_all NUMERIC(10,4),
    sd_7d NUMERIC(10,4),
    sd_14d NUMERIC(10,4),
    sd_21d NUMERIC(10,4),
    sd_42d NUMERIC(10,4),
    sd_3m NUMERIC(10,4),
    sd_6m NUMERIC(10,4),
    count_3m INTEGER,
    count_42d INTEGER,
    sharpe_ratio NUMERIC(10,4),
    max_drawdown NUMERIC(10,4),
    total_risk NUMERIC(10,4),
    cagr NUMERIC(10,4),
    metrics_calculated_at TIMESTAMP,
    
    CONSTRAINT unique_market_data UNIQUE (index_id, date)
);

COMMENT ON TABLE t_market_data_records IS 'Historical OHLCV data for market indices';

-- TABLE: t_market_download_jobs
CREATE TABLE t_market_download_jobs (
    id SERIAL PRIMARY KEY,
    job_type VARCHAR(20) NOT NULL,
    index_id INTEGER NOT NULL REFERENCES t_market_indices(id) ON DELETE CASCADE,
    start_date DATE,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'pending',
    error_details TEXT,
    records_inserted INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_skipped INTEGER DEFAULT 0,
    execution_time_ms INTEGER,
    triggered_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

COMMENT ON TABLE t_market_download_jobs IS 'Tracks download jobs for market data';

-- TABLE: t_market_download_logs
CREATE TABLE t_market_download_logs (
    id SERIAL PRIMARY KEY,
    index_id INTEGER REFERENCES t_market_indices(id) ON DELETE CASCADE,
    job_id INTEGER REFERENCES t_market_download_jobs(id) ON DELETE SET NULL,
    download_type VARCHAR(20),
    status VARCHAR(20),
    records_processed INTEGER DEFAULT 0,
    date_range_start DATE,
    date_range_end DATE,
    error_message TEXT,
    duration_seconds INTEGER,
    triggered_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE t_market_download_logs IS 'Audit log for all download activities';

-- TABLE: t_market_eod_scheduler
CREATE TABLE t_market_eod_scheduler (
    id SERIAL PRIMARY KEY,
    is_enabled BOOLEAN DEFAULT true,
    download_time TIME DEFAULT '20:00:00',
    retry_interval_minutes INTEGER DEFAULT 30,
    max_retries INTEGER DEFAULT 6,
    retry_cutoff_time TIME DEFAULT '23:00:00',
    last_execution_at TIMESTAMP,
    next_execution_at TIMESTAMP,
    execution_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE t_market_eod_scheduler IS 'Global EOD scheduler configuration';

-- ============================================================================
-- SECTION 10: USER PREFERENCE TABLES
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Creating User Preference Tables...';
END $$;

-- TABLE: t_user_chart_preferences
CREATE TABLE t_user_chart_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    index_id INTEGER NOT NULL,
    line_color VARCHAR(7) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_hex_color CHECK (line_color ~ '^#[0-9A-Fa-f]{6}$')
);

COMMENT ON TABLE t_user_chart_preferences IS 'User-specific chart visualization preferences per index';

-- ============================================================================
-- SECTION 11: SYSTEM LOGS TABLE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Creating System Logs Table...';
END $$;

-- TABLE: t_system_logs
CREATE TABLE t_system_logs (
    id BIGSERIAL PRIMARY KEY,
    level VARCHAR(10) NOT NULL CHECK (level IN ('error', 'warn', 'info')),
    source VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    context TEXT,
    user_id INTEGER,
    tenant_id INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    stack_trace TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE t_system_logs IS 'System-wide logs for errors, warnings, and info messages';

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
DO $$
DECLARE
    v_table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Table creation completed!';
    RAISE NOTICE 'Total tables created: %', v_table_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION INTEGRATION SUMMARY:';
    RAISE NOTICE '  ✓ Migration 006: Name normalization & restart';
    RAISE NOTICE '    - t_contacts.normalized_name (GENERATED)';
    RAISE NOTICE '    - t_import_sessions restart columns';
    RAISE NOTICE '    - t_import_staging_data match tracking';
    RAISE NOTICE '  ✓ JTBD Consolidation Migration:';
    RAISE NOTICE '    - t_jtbd_configurations.jtbd_category';
    RAISE NOTICE '    - t_jtbd_executions (NEW TABLE)';
    RAISE NOTICE '  ✓ Migration 007: Scheme allocation';
    RAISE NOTICE '    - t_customer_master_portfolio.allocation';
    RAISE NOTICE '  ✓ Migration 023: Alert System Enhancements';
    RAISE NOTICE '    - m_alert_settings (NEW TABLE)';
    RAISE NOTICE '    - t_jtbd_configurations completion tracking';
    RAISE NOTICE '  ✓ Migration 025: Drop unique PAN constraint';
    RAISE NOTICE '    - t_customers: NO unique_customer_pan constraint';
    RAISE NOTICE '    - Minors can share guardian PAN';
    RAISE NOTICE '  ✓ Migration 026: STP transaction aliases';
    RAISE NOTICE '    - m_transaction_types: SYSTEMATIC TRANSFER IN/OUT';
    RAISE NOTICE '  ✓ Default comparison index';
    RAISE NOTICE '    - t_tenants.default_comparison_index_id';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Next: Run 03_indexes_triggers.sql';
    RAISE NOTICE '========================================';
END $$;