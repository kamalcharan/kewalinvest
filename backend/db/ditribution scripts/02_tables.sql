-- ============================================================================
-- File: 02_tables.sql
-- Description: All table definitions in proper dependency order
-- Purpose: Create complete database schema with all tables
-- Execution: Run SECOND after 01_init.sql
-- Author: System
-- Date: 2025-01-08
-- Updated: 2025-11-05 (Updated t_customer_meetings table with complete meeting management)
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

-- TABLE: t_contacts
CREATE TABLE t_contacts (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER DEFAULT 1 REFERENCES t_tenants(id),
    is_live BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    is_customer BOOLEAN DEFAULT false,
    prefix VARCHAR(10) NOT NULL CHECK (prefix IN ('Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Sri')),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES t_users(id)
);

COMMENT ON TABLE t_contacts IS 'Base contact information - extended by customers table';
COMMENT ON COLUMN t_contacts.is_customer IS 'Flag to indicate if contact is also a customer';
COMMENT ON COLUMN t_contacts.prefix IS 'Title: Mr, Mrs, Ms, Dr, Prof, Sri';

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
    CONSTRAINT unique_customer_pan UNIQUE (tenant_id, pan, is_live),
    CONSTRAINT death_date_logic CHECK (
        (survival_status = 'alive' AND date_of_death IS NULL) OR
        (survival_status = 'deceased' AND date_of_death IS NOT NULL)
    )
);

COMMENT ON TABLE t_customers IS 'Customer records with financial and personal data';
COMMENT ON COLUMN t_customers.pan IS 'PAN card number - stored as PLAIN TEXT';
COMMENT ON COLUMN t_customers.iwell_code IS 'IWELL code - stored as PLAIN TEXT';
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

-- TABLE: t_customer_meetings (UPDATED 2025-11-05)
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
    meeting_location TEXT,  -- For in_person meetings
    meeting_link TEXT,      -- For video_call meetings

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
COMMENT ON COLUMN t_customer_meetings.completed_at IS 'Timestamp when meeting was marked as completed';
COMMENT ON COLUMN t_customer_meetings.cancelled_at IS 'Timestamp when meeting was cancelled';
COMMENT ON COLUMN t_customer_meetings.cancellation_reason IS 'Reason for meeting cancellation';

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
    file_hash VARCHAR(64), -- SHA256 hash for duplicate detection
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
COMMENT ON COLUMN t_file_uploads.updated_at IS 'Timestamp of last update to this record';

-- Index for fast duplicate file lookups
CREATE INDEX IF NOT EXISTS idx_file_uploads_hash ON t_file_uploads(file_hash, tenant_id, is_live) WHERE file_hash IS NOT NULL;

-- TABLE: t_import_sessions
CREATE TABLE t_import_sessions (
    id SERIAL PRIMARY KEY,
    session_name VARCHAR(255) NOT NULL,
    file_upload_id INTEGER REFERENCES t_file_uploads(id),
    tenant_id INTEGER DEFAULT 1 REFERENCES t_tenants(id),
    is_live BOOLEAN DEFAULT true,
    import_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (
        status IN ('pending', 'staged', 'processing', 'completed', 'completed_with_errors', 'failed', 'cancelled')
    ),
    current_stage VARCHAR(50),
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    duplicate_records INTEGER DEFAULT 0,
    duplicate_check_result JSONB,
    duplicate_classification VARCHAR(50),
    duplicate_user_decision_at TIMESTAMP,
    filename_duplicate_check JSONB,
    staging_completed_at TIMESTAMP,
    staging_total_rows INTEGER DEFAULT 0,
    batch_size INTEGER DEFAULT 100,
    current_batch INTEGER DEFAULT 0,
    total_batches INTEGER DEFAULT 0,
    last_processed_row INTEGER DEFAULT 0,
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

COMMENT ON TABLE t_import_sessions IS 'Track import processing sessions with batch progress';
COMMENT ON COLUMN t_import_sessions.import_type IS 'Type: CustomerData, TransactionData, SchemeData, or custom types';
COMMENT ON COLUMN t_import_sessions.status IS 'Status: pending, staged, processing, completed, completed_with_errors, failed, cancelled';
COMMENT ON COLUMN t_import_sessions.current_stage IS 'Current processing stage within the import workflow';
COMMENT ON COLUMN t_import_sessions.staging_total_rows IS 'Total rows inserted into staging table';
COMMENT ON COLUMN t_import_sessions.duplicate_check_result IS 'JSON result of duplicate detection analysis';
COMMENT ON COLUMN t_import_sessions.duplicate_classification IS 'Classification of duplicate status (exact, potential, none)';
COMMENT ON COLUMN t_import_sessions.duplicate_user_decision_at IS 'Timestamp when user made decision about duplicates';
COMMENT ON COLUMN t_import_sessions.filename_duplicate_check IS 'JSON result of filename-based duplicate detection';

-- TABLE: t_import_staging_data
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
        processing_status IN ('pending', 'processing', 'success', 'failed', 'skipped', 'duplicate', 'orphan')
    ),
    error_messages TEXT[],
    warnings TEXT[],
    created_record_id INTEGER,
    created_record_type VARCHAR(50),
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processing_metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT idx_unique_session_row UNIQUE(session_id, row_number)
);

COMMENT ON TABLE t_import_staging_data IS 'Staging table for ETL import processing';
COMMENT ON COLUMN t_import_staging_data.raw_data IS 'Original row data as received from uploaded file';
COMMENT ON COLUMN t_import_staging_data.mapped_data IS 'Transformed data after applying field mappings';
COMMENT ON COLUMN t_import_staging_data.import_type IS 'Type: CustomerData, TransactionData, SchemeData, or custom types';

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
COMMENT ON COLUMN t_import_field_mappings.import_type IS 'Type: CustomerData, TransactionData, SchemeData, or custom types';

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
COMMENT ON COLUMN t_scheme_masters.master_type IS 'Type: scheme_type or scheme_category';

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
COMMENT ON COLUMN t_scheme_details.scheme_code IS 'Unique scheme identifier from AMFI';
COMMENT ON COLUMN t_scheme_details.last_nav_download_date IS 'Last NAV download attempt date (global)';
COMMENT ON COLUMN t_scheme_details.historical_data_available IS 'Whether historical NAV data has been downloaded';
COMMENT ON COLUMN t_scheme_details.total_nav_records IS 'Count of NAV records in t_nav_data';

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

COMMENT ON TABLE t_scheme_aliases IS 'Global scheme alias mapping - stores multiple name variations for flexible transaction imports. Aliases are shared across all tenants.';
COMMENT ON COLUMN t_scheme_aliases.alias_name IS 'The actual alias variation (e.g., "ICICI Pru MNC Fund Reg (G)")';
COMMENT ON COLUMN t_scheme_aliases.alias_name_normalized IS 'Normalized version for matching: uppercase, trimmed, single spaces';
COMMENT ON COLUMN t_scheme_aliases.source IS 'How this alias was created: auto (seeded), manual (user added), import (from CSV)';

-- TABLE: t_nav_data (NO tenant_id column)
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
    -- Performance metrics columns
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
COMMENT ON COLUMN t_nav_data.daily_return IS 'Daily return percentage (today vs yesterday)';
COMMENT ON COLUMN t_nav_data.return_1w IS '1-week return percentage';
COMMENT ON COLUMN t_nav_data.return_1m IS '1-month return percentage';
COMMENT ON COLUMN t_nav_data.return_3m IS '3-month return percentage';
COMMENT ON COLUMN t_nav_data.return_6m IS '6-month return percentage';
COMMENT ON COLUMN t_nav_data.return_1y IS '1-year return percentage';
COMMENT ON COLUMN t_nav_data.return_ytd IS 'Year-to-date return percentage';
COMMENT ON COLUMN t_nav_data.return_all IS 'All-time return percentage (since inception)';
COMMENT ON COLUMN t_nav_data.sd_7d IS '7-day rolling standard deviation (volatility)';
COMMENT ON COLUMN t_nav_data.sd_14d IS '14-day rolling standard deviation (volatility)';
COMMENT ON COLUMN t_nav_data.sd_21d IS '21-day rolling standard deviation (volatility)';
COMMENT ON COLUMN t_nav_data.sd_42d IS '42-day rolling standard deviation (volatility)';
COMMENT ON COLUMN t_nav_data.sd_3m IS '3-month rolling standard deviation (volatility)';
COMMENT ON COLUMN t_nav_data.sd_6m IS '6-month rolling standard deviation (volatility)';
COMMENT ON COLUMN t_nav_data.count_3m IS 'Number of data points available in 3-month period';
COMMENT ON COLUMN t_nav_data.count_42d IS 'Number of data points available in 42-day period';
COMMENT ON COLUMN t_nav_data.sharpe_ratio IS 'Sharpe ratio (risk-adjusted return metric)';
COMMENT ON COLUMN t_nav_data.max_drawdown IS 'Maximum drawdown percentage (largest peak-to-trough decline)';
COMMENT ON COLUMN t_nav_data.total_risk IS 'Total risk metric (composite volatility measure)';
COMMENT ON COLUMN t_nav_data.cagr IS 'Compound Annual Growth Rate percentage';
COMMENT ON COLUMN t_nav_data.metrics_calculated_at IS 'Timestamp when metrics were last calculated';

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

-- TABLE: t_customer_master_portfolio
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_portfolio_record UNIQUE(customer_id, scheme_code, tenant_id, is_live)
);

COMMENT ON TABLE t_customer_master_portfolio IS 'Customer portfolio master records with categorization';
COMMENT ON COLUMN t_customer_master_portfolio.category IS 'Fund category (e.g., Equity, Debt, Hybrid)';
COMMENT ON COLUMN t_customer_master_portfolio.sub_category IS 'Fund sub-category (e.g., Large Cap, Mid Cap)';
COMMENT ON COLUMN t_customer_master_portfolio.fund_name IS 'Full fund name';
COMMENT ON COLUMN t_customer_master_portfolio.start_date IS 'Date of first transaction in this portfolio';

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
COMMENT ON COLUMN m_transaction_types.txn_code IS 'Unique transaction code (e.g., SIP, PURCHASE)';
COMMENT ON COLUMN m_transaction_types.txn_name IS 'Full name of transaction type';
COMMENT ON COLUMN m_transaction_types.txn_type IS 'Addition or Deduction type for portfolio calculations';

-- Seed global transaction types (shared by all tenants)
INSERT INTO m_transaction_types (txn_code, txn_name, txn_type, is_active, description) VALUES
    ('SIP', 'Systematic Investment Plan', 'Addition', TRUE,
     'Regular systematic investment contributions at fixed intervals'),

    ('STP IN', 'Systematic Transfer Plan - In', 'Addition', TRUE,
     'Systematic transfer of funds from another scheme (incoming)'),

    ('PURCHASE', 'One-Time Purchase', 'Addition', TRUE,
     'Lump sum purchase or investment transaction'),

    ('SWITCH IN', 'Switch In', 'Addition', TRUE,
     'Funds received from switching from another scheme'),

    ('STP OUT', 'Systematic Transfer Plan - Out', 'Deduction', TRUE,
     'Systematic transfer of funds to another scheme (outgoing)'),

    ('REDEMPTION', 'Redemption', 'Deduction', TRUE,
     'Withdrawal or redemption of invested funds'),

    ('SWITCH OUT', 'Switch Out', 'Deduction', TRUE,
     'Funds moved out by switching to another scheme'),

    ('SELL', 'Sell', 'Deduction', TRUE,
     'Funds moved out / encashed from the scheme'),

    ('OPENING BALANCE', 'Opening Balance', 'Addition', TRUE,
     'Funds added to system portfolio to balance the transaction records')
ON CONFLICT (txn_code) DO NOTHING;

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
COMMENT ON COLUMN t_transaction_table.portfolio_flag IS 'Include/exclude from portfolio totals';
COMMENT ON COLUMN t_transaction_table.staging_record_id IS 'Reference to the staging record that created this transaction';
COMMENT ON COLUMN t_transaction_table.import_session_id IS 'Reference to the import session that created this transaction';
COMMENT ON COLUMN t_transaction_table.duplicate_reason IS 'Explanation if this transaction is marked as a potential duplicate';

-- TABLE: t_monthly_portfolio_snapshots
CREATE TABLE t_monthly_portfolio_snapshots (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    is_live BOOLEAN NOT NULL,
    customer_id INTEGER NOT NULL,
    snapshot_month_end DATE NOT NULL,
    total_invested NUMERIC(18,2),
    current_value NUMERIC(18,2),
    total_returns NUMERIC(18,2),
    return_percentage NUMERIC(10,2),
    total_units NUMERIC(18,4),
    total_schemes INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE t_monthly_portfolio_snapshots IS 'Monthly portfolio snapshots for tracking performance over time';
COMMENT ON COLUMN t_monthly_portfolio_snapshots.snapshot_month_end IS 'Last day of the month for this snapshot';
COMMENT ON COLUMN t_monthly_portfolio_snapshots.total_invested IS 'Total amount invested as of this snapshot date';
COMMENT ON COLUMN t_monthly_portfolio_snapshots.current_value IS 'Portfolio value as of this snapshot date';
COMMENT ON COLUMN t_monthly_portfolio_snapshots.total_returns IS 'Total returns (gains/losses) as of this snapshot date';
COMMENT ON COLUMN t_monthly_portfolio_snapshots.return_percentage IS 'Return percentage as of this snapshot date';

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

COMMENT ON TABLE t_portfolio_snapshot_configs IS 'Scheduler configurations for automated portfolio snapshot generation - tenant isolated';
COMMENT ON COLUMN t_portfolio_snapshot_configs.schedule_type IS 'Type of schedule: weekly (default: Friday 9 PM), monthly, or custom cron';
COMMENT ON COLUMN t_portfolio_snapshot_configs.cron_expression IS 'Cron expression for schedule. Default: 0 21 * * 5 (Friday 9 PM)';
COMMENT ON COLUMN t_portfolio_snapshot_configs.max_retries IS 'Maximum retry attempts on failure. Default: 3';

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
    CONSTRAINT valid_trigger_source CHECK (trigger_source IN ('scheduled', 'manual'))
);

COMMENT ON TABLE t_portfolio_snapshot_executions IS 'Execution history and audit log for portfolio snapshot jobs';
COMMENT ON COLUMN t_portfolio_snapshot_executions.snapshot_month_end IS 'The month-end date for which snapshots were generated';
COMMENT ON COLUMN t_portfolio_snapshot_executions.retry_attempt IS 'Which retry attempt this is (0 = first attempt, 1-3 = retries)';
COMMENT ON COLUMN t_portfolio_snapshot_executions.trigger_source IS 'Whether this was scheduled or manually triggered';

-- TABLE: m_job_types (Master Registry)
CREATE TABLE m_job_types (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    default_cron_expression VARCHAR(100),
    default_max_retries INTEGER DEFAULT 3,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE m_job_types IS 'Registry of all available job types in the system';
COMMENT ON COLUMN m_job_types.code IS 'Unique job type identifier (e.g., PORTFOLIO_SNAPSHOT)';
COMMENT ON COLUMN m_job_types.default_cron_expression IS 'Default schedule for this job type';

-- TABLE: t_job_scheduler_configs (Generic Scheduler)
CREATE TABLE t_job_scheduler_configs (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
    job_type VARCHAR(50) NOT NULL REFERENCES m_job_types(code),
    user_id INTEGER NOT NULL REFERENCES t_users(id),
    is_live BOOLEAN NOT NULL,
    schedule_type VARCHAR(20) NOT NULL DEFAULT 'weekly',
    cron_expression VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    max_retries INTEGER NOT NULL DEFAULT 3,
    job_config JSONB,
    last_executed_at TIMESTAMP,
    next_execution_at TIMESTAMP,
    execution_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_job_scheduler_config UNIQUE(tenant_id, job_type, is_live),
    CONSTRAINT valid_schedule_type CHECK (schedule_type IN ('daily', 'weekly', 'monthly', 'custom'))
);

COMMENT ON TABLE t_job_scheduler_configs IS 'Scheduler configurations for all job types - tenant isolated';
COMMENT ON COLUMN t_job_scheduler_configs.job_type IS 'Type of job (references m_job_types.code)';
COMMENT ON COLUMN t_job_scheduler_configs.job_config IS 'Job-specific configuration as JSON (flexible per job type)';

-- TABLE: t_job_executions (Generic Execution History)
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
    CONSTRAINT valid_trigger_source CHECK (trigger_source IN ('scheduled', 'manual'))
);

COMMENT ON TABLE t_job_executions IS 'Execution history and audit log for all job types';
COMMENT ON COLUMN t_job_executions.execution_data IS 'Job-specific execution results/metrics as JSON (flexible per job type)';

-- ============================================================================
-- SECTION 7: JTBD (JOBS TO BE DONE) TABLES
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Creating JTBD Tables...';
END $$;

-- TABLE: t_jtbd_configurations
CREATE TABLE t_jtbd_configurations (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
    is_live BOOLEAN NOT NULL DEFAULT true,
    customer_id INTEGER NOT NULL REFERENCES t_customers(id),
    jtbd_type VARCHAR(50) NOT NULL,
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
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE t_jtbd_configurations IS 'Customer alert and reminder configurations';
COMMENT ON COLUMN t_jtbd_configurations.jtbd_type IS 'Type: portfolio_alert, time_based, profile_trigger';

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

-- TABLE: t_goal_scheme_allocations
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
COMMENT ON COLUMN t_goal_scheme_allocations.allocation_percentage IS 'Recommended allocation percentage for this scheme in the goal';

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

COMMENT ON TABLE m_bookmark_reasons IS 'Tenant-specific bookmark reason master data - managed via backend';
COMMENT ON COLUMN m_bookmark_reasons.reason_code IS 'Unique code within tenant (e.g., VIP, FOLLOW_UP)';
COMMENT ON COLUMN m_bookmark_reasons.reason_label IS 'Display label for UI (e.g., VIP Customer)';
COMMENT ON COLUMN m_bookmark_reasons.display_order IS 'Sort order in dropdown (lower = higher priority)';

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
COMMENT ON COLUMN t_customer_bookmarks.reason_id IS 'FK to master reasons - preferred for predefined tags';
COMMENT ON COLUMN t_customer_bookmarks.custom_reason IS 'Free text when user selects "Other" or custom tag';
COMMENT ON COLUMN t_customer_bookmarks.notes IS 'Optional notes about why customer is bookmarked';

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
    
    -- Download tracking fields
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
    
    -- Timestamp fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_data_provider 
        CHECK (data_provider IN ('yahoo_finance', 'nse_official', 'google_sheets', 'not_configured'))
);

-- Table comments
COMMENT ON TABLE t_market_indices IS 'Master table for NSE market indices with multi-provider support';
COMMENT ON COLUMN t_market_indices.yahoo_symbol IS 'Yahoo Finance symbol (e.g., ^NSEI for Nifty 50) - kept for backward compatibility';
COMMENT ON COLUMN t_market_indices.eod_retry_count IS 'Current retry count for today EOD download (resets daily)';
COMMENT ON COLUMN t_market_indices.data_provider IS 'Data source provider: yahoo_finance, nse_official, google_sheets, or not_configured';
COMMENT ON COLUMN t_market_indices.provider_symbol IS 'Provider-specific symbol (e.g., ^NSEI for Yahoo, NIFTY 50 for NSE)';
COMMENT ON COLUMN t_market_indices.provider_enabled IS 'Whether data provider is configured and enabled for this index';

-- Indexes
CREATE INDEX idx_market_indices_code ON t_market_indices(index_code) WHERE is_active = true;
CREATE INDEX idx_market_indices_category ON t_market_indices(category) WHERE is_active = true;
CREATE INDEX idx_market_indices_provider ON t_market_indices(data_provider, provider_enabled) WHERE is_active = true;

-- Add foreign key constraint to t_tenants now that t_market_indices exists
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
COMMENT ON COLUMN t_market_data_records.adj_close IS 'Adjusted close price (for splits/dividends)';
COMMENT ON COLUMN t_market_data_records.metrics_calculated_at IS 'Timestamp when metrics were last calculated';

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

COMMENT ON TABLE t_user_chart_preferences IS 'Stores user-specific chart visualization preferences per index';
COMMENT ON COLUMN t_user_chart_preferences.line_color IS 'Hex color code for chart line. Falls back to theme default if not set.';

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
COMMENT ON COLUMN t_system_logs.level IS 'Log level: error, warn, or info';
COMMENT ON COLUMN t_system_logs.source IS 'Source of the log entry (e.g., backend, frontend, n8n)';
COMMENT ON COLUMN t_system_logs.metadata IS 'Additional structured data in JSON format';
COMMENT ON COLUMN t_system_logs.context IS 'Contextual information about where the log occurred';
COMMENT ON COLUMN t_system_logs.stack_trace IS 'Stack trace for error-level logs';

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
    RAISE NOTICE 'All tables include:';
    RAISE NOTICE '  - Column definitions with types';
    RAISE NOTICE '  - Constraints and checks';
    RAISE NOTICE '  - Foreign key relationships';
    RAISE NOTICE '  - Comments on tables/columns';
    RAISE NOTICE '  - Proper sequences for auto-increment';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'UPDATE NOTES (2025-11-05):';
    RAISE NOTICE '  ✓ UPDATED: t_customer_meetings table structure';
    RAISE NOTICE '    - Changed from single meeting_date to scheduled_date + scheduled_time';
    RAISE NOTICE '    - Added duration_minutes field';
    RAISE NOTICE '    - Replaced follow_up fields with status-based tracking';
    RAISE NOTICE '    - Added meeting_location and meeting_link (separate fields)';
    RAISE NOTICE '    - Added outcome field for completion summary';
    RAISE NOTICE '    - Added completed_at, cancelled_at, cancellation_reason';
    RAISE NOTICE '    - Updated meeting_mode values (underscores: in_person, video_call, phone_call)';
    RAISE NOTICE '    - Added status field (scheduled, completed, cancelled, rescheduled)';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CRITICAL SCHEMA FEATURES:';
    RAISE NOTICE '  - t_tenants.is_admin column present';
    RAISE NOTICE '  - t_nav_data has NO tenant_id column (global NAV data)';
    RAISE NOTICE '  - t_tenants.default_comparison_index_id for portfolio comparison';
    RAISE NOTICE '  - Schema matches production requirements';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Next: Run 03_indexes_triggers.sql';
    RAISE NOTICE '========================================';
END $$;