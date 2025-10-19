-- ============================================================================
-- File: 02_tables.sql
-- Description: All table definitions in dependency order
-- Purpose: Create complete database schema
-- Execution: Run SECOND after 01_init.sql
-- Author: System
-- Date: 2025-01-08
-- Updated: 2025-01-09 (Added transaction import support, portfolio fields, system logs)
-- Updated: 2025-01-15 (Added bookmark tables, NAV schema refactor)
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

-- ----------------------------------------------------------------------------
-- TABLE: t_tenants
-- Description: Multi-tenancy support for isolating customer data
-- Dependencies: None
-- ----------------------------------------------------------------------------
CREATE TABLE t_tenants (
    id SERIAL PRIMARY KEY,
    tenant_code VARCHAR(50) UNIQUE NOT NULL,
    tenant_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    settings JSONB DEFAULT '{}'::jsonb,
    subscription_plan VARCHAR(50) DEFAULT 'basic'
);

COMMENT ON TABLE t_tenants IS 'Multi-tenant isolation - each client has separate data';
COMMENT ON COLUMN t_tenants.tenant_code IS 'Unique identifier for tenant (e.g., kewal, localsing)';
COMMENT ON COLUMN t_tenants.settings IS 'JSON configuration for tenant-specific settings';

-- ----------------------------------------------------------------------------
-- TABLE: t_users
-- Description: User accounts with tenant association
-- Dependencies: t_tenants
-- ----------------------------------------------------------------------------
CREATE TABLE t_users (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES t_tenants(id) DEFAULT 1,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    theme_preference VARCHAR(50) DEFAULT 'techy-simple',
    environment_preference VARCHAR(10) DEFAULT 'live',
    is_live BOOLEAN DEFAULT true,
    
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

-- ----------------------------------------------------------------------------
-- TABLE: t_chat_sessions
-- Description: AI chat conversation sessions
-- Dependencies: t_tenants, t_users
-- ----------------------------------------------------------------------------
CREATE TABLE t_chat_sessions (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES t_tenants(id) DEFAULT 1,
    user_id INTEGER REFERENCES t_users(id),
    session_name VARCHAR(255),
    is_live BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_tenant_consistency CHECK (tenant_id IS NOT NULL AND user_id IS NOT NULL)
);

COMMENT ON TABLE t_chat_sessions IS 'AI chat conversation sessions for tracking context';

-- ----------------------------------------------------------------------------
-- TABLE: t_chat_messages
-- Description: Individual messages within chat sessions
-- Dependencies: t_tenants, t_chat_sessions
-- ----------------------------------------------------------------------------
CREATE TABLE t_chat_messages (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES t_tenants(id) DEFAULT 1,
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

-- ----------------------------------------------------------------------------
-- TABLE: t_contacts
-- Description: Main contacts table (base for customers and other contacts)
-- Dependencies: t_tenants, t_users
-- ----------------------------------------------------------------------------
CREATE TABLE t_contacts (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES t_tenants(id) DEFAULT 1,
    is_live BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    is_customer BOOLEAN DEFAULT false,
    
    -- Contact basic info
    prefix VARCHAR(10) NOT NULL CHECK (prefix IN ('Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Sri')),
    name VARCHAR(255) NOT NULL,
    
    -- System fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES t_users(id)
);

COMMENT ON TABLE t_contacts IS 'Base contact information - extended by customers table';
COMMENT ON COLUMN t_contacts.is_customer IS 'Flag to indicate if contact is also a customer';
COMMENT ON COLUMN t_contacts.prefix IS 'Title: Mr, Mrs, Ms, Dr, Prof, Sri';

-- ----------------------------------------------------------------------------
-- TABLE: t_contact_channels
-- Description: Unified communication channels (email, mobile, social media)
-- Dependencies: t_contacts, t_tenants
-- ----------------------------------------------------------------------------
CREATE TABLE t_contact_channels (
    id SERIAL PRIMARY KEY,
    contact_id INTEGER REFERENCES t_contacts(id) ON DELETE CASCADE,
    tenant_id INTEGER REFERENCES t_tenants(id) DEFAULT 1,
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

-- ----------------------------------------------------------------------------
-- TABLE: t_customers
-- Description: Customer records extending contacts with financial data
-- Dependencies: t_contacts, t_tenants, t_users
-- NOTE: Uses PLAIN TEXT for PAN and iwell_code (no encryption)
-- UPDATED: Added jtbd_count and has_jtbd_setup columns
-- ----------------------------------------------------------------------------
CREATE TABLE t_customers (
    id SERIAL PRIMARY KEY,
    contact_id INTEGER REFERENCES t_contacts(id) ON DELETE CASCADE,
    tenant_id INTEGER REFERENCES t_tenants(id) DEFAULT 1,
    is_live BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    
    -- Sensitive data stored as PLAIN TEXT
    pan VARCHAR(10),
    iwell_code VARCHAR(100),
    
    -- Personal details
    date_of_birth DATE,
    anniversary_date DATE,
    
    -- Survival status
    survival_status VARCHAR(20) DEFAULT 'alive' CHECK (survival_status IN ('alive', 'deceased')),
    date_of_death DATE,
    
    -- Family details
    family_head_name VARCHAR(255),
    family_head_iwell_code VARCHAR(100),
    
    -- Referral information
    referred_by INTEGER REFERENCES t_contacts(id),
    referred_by_name VARCHAR(255),
    
    -- Onboarding status
    onboarding_form_id INTEGER,
    onboarding_status VARCHAR(50) DEFAULT 'pending' CHECK (
        onboarding_status IN ('pending', 'in_progress', 'completed', 'cancelled')
    ),
    
    -- JTBD tracking (ADDED)
    jtbd_count INTEGER DEFAULT 0,
    has_jtbd_setup BOOLEAN DEFAULT false,
    
    -- System fields
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

-- ----------------------------------------------------------------------------
-- TABLE: t_customer_addresses
-- Description: Multiple addresses per customer
-- Dependencies: t_customers, t_tenants
-- ----------------------------------------------------------------------------
CREATE TABLE t_customer_addresses (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES t_customers(id) ON DELETE CASCADE,
    tenant_id INTEGER REFERENCES t_tenants(id) DEFAULT 1,
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

-- ============================================================================
-- SECTION 4: FILE UPLOAD & IMPORT TABLES
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Import and File Upload Tables...';
END $$;

-- ----------------------------------------------------------------------------
-- TABLE: t_file_uploads
-- Description: Track uploaded files for import processing
-- Dependencies: t_tenants, t_customers
-- UPDATED: Added updated_at column
-- ----------------------------------------------------------------------------
CREATE TABLE t_file_uploads (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES t_tenants(id) DEFAULT 1,
    is_live BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    
    file_type VARCHAR(50) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    folder_path VARCHAR(500),
    file_size BIGINT,
    mime_type VARCHAR(100),
    
    -- For customer-specific files
    customer_id INTEGER REFERENCES t_customers(id),
    
    -- Import processing status
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
COMMENT ON COLUMN t_file_uploads.updated_at IS 'Timestamp of last update to this record';

-- ----------------------------------------------------------------------------
-- TABLE: t_import_sessions
-- Description: Import processing sessions with progress tracking
-- Dependencies: t_file_uploads, t_tenants, t_users
-- UPDATED: Removed restrictive CHECK constraint on import_type
-- ----------------------------------------------------------------------------
CREATE TABLE t_import_sessions (
    id SERIAL PRIMARY KEY,
    session_name VARCHAR(255) NOT NULL,
    file_upload_id INTEGER REFERENCES t_file_uploads(id),
    tenant_id INTEGER REFERENCES t_tenants(id) DEFAULT 1,
    is_live BOOLEAN DEFAULT true,
    
    import_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (
        status IN ('pending', 'staged', 'processing', 'completed', 'completed_with_errors', 'failed', 'cancelled')
    ),
    
    -- Processing stats
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    duplicate_records INTEGER DEFAULT 0,
    
    -- Staging info
    staging_completed_at TIMESTAMP,
    staging_total_rows INTEGER DEFAULT 0,
    batch_size INTEGER DEFAULT 100,
    current_batch INTEGER DEFAULT 0,
    total_batches INTEGER DEFAULT 0,
    last_processed_row INTEGER DEFAULT 0,
    processing_metadata JSONB,
    
    -- Metadata
    processing_started_at TIMESTAMP,
    processing_completed_at TIMESTAMP,
    error_summary TEXT,
    
    -- N8N integration
    n8n_webhook_id VARCHAR(255),
    n8n_execution_id VARCHAR(255),
    
    created_by INTEGER REFERENCES t_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE t_import_sessions IS 'Track import processing sessions with batch progress';
COMMENT ON COLUMN t_import_sessions.import_type IS 'Type: CustomerData, TransactionData, SchemeData, or custom types';
COMMENT ON COLUMN t_import_sessions.status IS 'Status: pending, staged, processing, completed, completed_with_errors, failed, cancelled';
COMMENT ON COLUMN t_import_sessions.staging_total_rows IS 'Total rows inserted into staging table';

-- ----------------------------------------------------------------------------
-- TABLE: t_import_staging_data
-- Description: Staging table for ETL processing
-- Dependencies: t_import_sessions, t_tenants
-- UPDATED: Removed restrictive CHECK constraint on import_type
-- ----------------------------------------------------------------------------
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
        processing_status IN ('pending', 'processing', 'success', 'failed', 'skipped', 'duplicate')
    ),
    error_messages TEXT[],
    warnings TEXT[],
    
    created_record_id INTEGER,
    created_record_type VARCHAR(50),
    
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT idx_unique_session_row UNIQUE(session_id, row_number)
);

COMMENT ON TABLE t_import_staging_data IS 'Staging table for ETL import processing';
COMMENT ON COLUMN t_import_staging_data.raw_data IS 'Original row data as received from uploaded file';
COMMENT ON COLUMN t_import_staging_data.mapped_data IS 'Transformed data after applying field mappings';
COMMENT ON COLUMN t_import_staging_data.import_type IS 'Type: CustomerData, TransactionData, SchemeData, or custom types';

-- ----------------------------------------------------------------------------
-- TABLE: t_import_field_mappings
-- Description: Field mapping templates for import types
-- Dependencies: t_tenants, t_users
-- UPDATED: Removed restrictive CHECK constraint on import_type
-- ----------------------------------------------------------------------------
CREATE TABLE t_import_field_mappings (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES t_tenants(id) DEFAULT 1,
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

-- ----------------------------------------------------------------------------
-- TABLE: t_import_record_results
-- Description: Detailed record-level processing results
-- Dependencies: t_import_sessions, t_contacts, t_customers, t_tenants
-- ----------------------------------------------------------------------------
CREATE TABLE t_import_record_results (
    id SERIAL PRIMARY KEY,
    import_session_id INTEGER REFERENCES t_import_sessions(id) ON DELETE CASCADE,
    tenant_id INTEGER REFERENCES t_tenants(id) DEFAULT 1,
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

-- ----------------------------------------------------------------------------
-- TABLE: t_import_logs
-- Description: Import audit trail
-- Dependencies: t_file_uploads, t_tenants, t_users
-- ----------------------------------------------------------------------------
CREATE TABLE t_import_logs (
    id SERIAL PRIMARY KEY,
    file_upload_id INTEGER REFERENCES t_file_uploads(id),
    tenant_id INTEGER REFERENCES t_tenants(id) DEFAULT 1,
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

-- ----------------------------------------------------------------------------
-- TABLE: t_scheme_masters
-- Description: Master data for scheme types and categories
-- Dependencies: t_tenants
-- ----------------------------------------------------------------------------
CREATE TABLE t_scheme_masters (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES t_tenants(id) DEFAULT 1,
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

-- ----------------------------------------------------------------------------
-- TABLE: t_scheme_details
-- Description: Mutual fund scheme details
-- Dependencies: t_tenants, t_scheme_masters, t_users
-- UPDATED: tenant_id now nullable (global scheme master)
-- ----------------------------------------------------------------------------
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
    scheme_minimum_amount DECIMAL(15,2),
    launch_date DATE,
    closure_date DATE,
    isin_div_payout VARCHAR(50),
    isin_growth VARCHAR(50),
    isin_div_reinvestment VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES t_users(id)
);

COMMENT ON TABLE t_scheme_details IS 'Mutual fund scheme details - global master data';
COMMENT ON COLUMN t_scheme_details.scheme_code IS 'Unique scheme identifier from AMFI';
COMMENT ON COLUMN t_scheme_details.tenant_id IS 'Legacy field - set to NULL for global schemes';

-- ----------------------------------------------------------------------------
-- TABLE: t_scheme_bookmarks
-- Description: User bookmarked schemes for tracking
-- Dependencies: t_tenants, t_users, t_scheme_details
-- UPDATED: Added alias_name, changed unique constraint to tenant-level
-- ----------------------------------------------------------------------------
CREATE TABLE t_scheme_bookmarks (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL DEFAULT 1,
    user_id INTEGER NOT NULL REFERENCES t_users(id),
    scheme_id INTEGER NOT NULL REFERENCES t_scheme_details(id),
    scheme_code VARCHAR(100) NOT NULL,
    scheme_name VARCHAR(500) NOT NULL,
    amc_name VARCHAR(255),
    alias_name VARCHAR(255),
    is_live BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    daily_download_enabled BOOLEAN DEFAULT false,
    download_time VARCHAR(5) DEFAULT '22:00',
    historical_download_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id, scheme_id, is_live)
);

COMMENT ON TABLE t_scheme_bookmarks IS 'Tenant bookmarks for tracking specific schemes';
COMMENT ON COLUMN t_scheme_bookmarks.alias_name IS 'Custom scheme name (tenant preference). Falls back to scheme_name if NULL';
COMMENT ON COLUMN t_scheme_bookmarks.user_id IS 'Audit trail - who created bookmark. Query by tenant_id only';

-- ----------------------------------------------------------------------------
-- TABLE: t_nav_data
-- Description: Daily NAV data for schemes
-- Dependencies: t_tenants, t_scheme_details
-- UPDATED: tenant_id nullable, unique constraint changed to global
-- ----------------------------------------------------------------------------
CREATE TABLE t_nav_data (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER DEFAULT NULL,
    scheme_id INTEGER NOT NULL REFERENCES t_scheme_details(id),
    scheme_code VARCHAR(100) NOT NULL,
    nav_date DATE NOT NULL,
    nav_value DECIMAL(15,4) NOT NULL,
    repurchase_price DECIMAL(15,4),
    sale_price DECIMAL(15,4),
    is_live BOOLEAN DEFAULT true,
    data_source VARCHAR(20) NOT NULL CHECK (data_source IN ('daily', 'historical', 'weekly')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(scheme_id, nav_date, is_live)
);

COMMENT ON TABLE t_nav_data IS 'Historical NAV data - global repository across all tenants';
COMMENT ON COLUMN t_nav_data.tenant_id IS 'Legacy field - set to NULL for global NAV data';

-- ----------------------------------------------------------------------------
-- TABLE: t_nav_download_jobs
-- Description: NAV download job tracking
-- Dependencies: t_tenants
-- ----------------------------------------------------------------------------
CREATE TABLE t_nav_download_jobs (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL DEFAULT 1,
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

-- ----------------------------------------------------------------------------
-- TABLE: t_nav_scheduler_configs
-- Description: NAV scheduler configurations
-- Dependencies: t_tenants, t_users
-- ----------------------------------------------------------------------------
CREATE TABLE t_nav_scheduler_configs (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
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
    
    UNIQUE(tenant_id, user_id, is_live)
);

COMMENT ON TABLE t_nav_scheduler_configs IS 'Scheduler configurations for NAV downloads';

-- ----------------------------------------------------------------------------
-- TABLE: t_nav_schedule_executions
-- Description: NAV scheduler execution history
-- Dependencies: t_nav_scheduler_configs
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- TABLE: t_customer_master_portfolio
-- Description: Customer portfolio master records
-- Dependencies: t_customers, t_tenants
-- UPDATED: Added category, sub_category, fund_name, start_date columns
-- ----------------------------------------------------------------------------
CREATE TABLE t_customer_master_portfolio (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES t_customers(id),
    scheme_code VARCHAR(50),
    scheme_name VARCHAR(255),
    folio_no VARCHAR(100),
    
    -- Portfolio categorization (ADDED)
    category VARCHAR(100),
    sub_category VARCHAR(100),
    fund_name VARCHAR(255),
    start_date DATE,
    
    tenant_id INTEGER,
    is_live BOOLEAN,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(customer_id, scheme_code, tenant_id, is_live)
);

COMMENT ON TABLE t_customer_master_portfolio IS 'Customer portfolio master records with categorization';
COMMENT ON COLUMN t_customer_master_portfolio.category IS 'Fund category (e.g., Equity, Debt, Hybrid)';
COMMENT ON COLUMN t_customer_master_portfolio.sub_category IS 'Fund sub-category (e.g., Large Cap, Mid Cap)';
COMMENT ON COLUMN t_customer_master_portfolio.fund_name IS 'Full fund name';
COMMENT ON COLUMN t_customer_master_portfolio.start_date IS 'Date of first transaction in this portfolio';

-- ----------------------------------------------------------------------------
-- TABLE: t_transaction_table
-- Description: Investment transactions
-- Dependencies: t_customers, t_tenants, t_import_staging_data, t_import_sessions
-- UPDATED: Added staging_record_id, import_session_id, duplicate_reason columns
-- ----------------------------------------------------------------------------
CREATE TABLE t_transaction_table (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES t_customers(id),
    scheme_code VARCHAR(50),
    scheme_name VARCHAR(255),
    folio_no VARCHAR(100),
    txn_type_id INTEGER,
    txn_date DATE,
    total_amount DECIMAL(15,2),
    units DECIMAL(15,4),
    nav DECIMAL(10,4),
    stamp_duty DECIMAL(10,2),
    is_potential_duplicate BOOLEAN DEFAULT false,
    portfolio_flag BOOLEAN DEFAULT true,
    
    -- Import tracking fields (ADDED)
    staging_record_id INTEGER,
    import_session_id INTEGER,
    duplicate_reason TEXT,
    
    tenant_id INTEGER,
    is_live BOOLEAN,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints for import tracking (ADDED)
    CONSTRAINT fk_staging_record 
        FOREIGN KEY (staging_record_id) 
        REFERENCES t_import_staging_data(id) 
        ON DELETE SET NULL,
    
    CONSTRAINT fk_import_session 
        FOREIGN KEY (import_session_id) 
        REFERENCES t_import_sessions(id) 
        ON DELETE SET NULL
);

COMMENT ON TABLE t_transaction_table IS 'Investment transaction records with import tracking';
COMMENT ON COLUMN t_transaction_table.portfolio_flag IS 'Include/exclude from portfolio totals';
COMMENT ON COLUMN t_transaction_table.staging_record_id IS 'Reference to the staging record that created this transaction';
COMMENT ON COLUMN t_transaction_table.import_session_id IS 'Reference to the import session that created this transaction';
COMMENT ON COLUMN t_transaction_table.duplicate_reason IS 'Explanation if this transaction is marked as a potential duplicate';

-- ============================================================================
-- SECTION 6B: TRANSACTION TYPES MASTER TABLE
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Transaction Types Master Table...';
END $$;

-- ----------------------------------------------------------------------------
-- TABLE: m_transaction_types
-- Description: Master data for transaction types
-- Dependencies: None
-- ----------------------------------------------------------------------------
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

-- ============================================================================
-- SECTION 7: JTBD (JOBS TO BE DONE) TABLES
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating JTBD Tables...';
END $$;

-- ----------------------------------------------------------------------------
-- TABLE: t_jtbd_configurations
-- Description: Customer alert and reminder configurations
-- Dependencies: t_tenants, t_customers, t_users
-- ----------------------------------------------------------------------------
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
    
    next_alert_date DATE,
    
    created_by INTEGER NOT NULL REFERENCES t_users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE t_jtbd_configurations IS 'Customer alert and reminder configurations';
COMMENT ON COLUMN t_jtbd_configurations.jtbd_type IS 'Type: portfolio_alert, time_based, profile_trigger';

-- ============================================================================
-- SECTION 7B: BOOKMARK TABLES
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Bookmark Tables...';
END $$;

-- ----------------------------------------------------------------------------
-- TABLE: m_bookmark_reasons
-- Description: Tenant-specific bookmark reason master data
-- Dependencies: t_tenants
-- ----------------------------------------------------------------------------
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
    
    -- Each tenant can have their own set of reasons
    CONSTRAINT unique_reason_per_tenant 
        UNIQUE (tenant_id, is_live, reason_code)
);

COMMENT ON TABLE m_bookmark_reasons IS 'Tenant-specific bookmark reason master data - managed via backend';
COMMENT ON COLUMN m_bookmark_reasons.reason_code IS 'Unique code within tenant (e.g., VIP, FOLLOW_UP)';
COMMENT ON COLUMN m_bookmark_reasons.reason_label IS 'Display label for UI (e.g., VIP Customer)';
COMMENT ON COLUMN m_bookmark_reasons.display_order IS 'Sort order in dropdown (lower = higher priority)';

-- ----------------------------------------------------------------------------
-- TABLE: t_customer_bookmarks
-- Description: User bookmarks for important customers
-- Dependencies: t_tenants, t_customers, t_users, m_bookmark_reasons
-- ----------------------------------------------------------------------------
CREATE TABLE t_customer_bookmarks (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
    is_live BOOLEAN NOT NULL DEFAULT true,
    customer_id INTEGER NOT NULL REFERENCES t_customers(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES t_users(id) ON DELETE CASCADE,
    
    -- Reference to master table (preferred)
    reason_id INTEGER REFERENCES m_bookmark_reasons(id),
    
    -- OR custom free-text reason (when reason_id is NULL)
    custom_reason VARCHAR(100),
    
    -- Optional notes
    notes TEXT,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one bookmark per customer per user
    CONSTRAINT unique_bookmark_per_user_customer 
        UNIQUE (tenant_id, is_live, customer_id, user_id),
        
    -- Either reason_id or custom_reason must be provided
    CONSTRAINT check_bookmark_reason 
        CHECK (reason_id IS NOT NULL OR custom_reason IS NOT NULL)
);

COMMENT ON TABLE t_customer_bookmarks IS 'User bookmarks for tracking important customers with reasons/tags';
COMMENT ON COLUMN t_customer_bookmarks.reason_id IS 'FK to master reasons - preferred for predefined tags';
COMMENT ON COLUMN t_customer_bookmarks.custom_reason IS 'Free text when user selects "Other" or custom tag';
COMMENT ON COLUMN t_customer_bookmarks.notes IS 'Optional notes about why customer is bookmarked';

-- ============================================================================
-- SECTION 8: SYSTEM LOGS TABLE
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating System Logs Table...';
END $$;

-- ----------------------------------------------------------------------------
-- TABLE: t_system_logs
-- Description: System-wide logging for errors, warnings, and info
-- Dependencies: t_tenants, t_users (optional references)
-- NEW TABLE: Added for comprehensive system logging
-- ----------------------------------------------------------------------------
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
    RAISE NOTICE 'Updates included:';
    RAISE NOTICE '  - t_file_uploads: added updated_at';
    RAISE NOTICE '  - t_customer_master_portfolio: added category fields';
    RAISE NOTICE '  - t_transaction_table: added import tracking';
    RAISE NOTICE '  - t_system_logs: new table added';
    RAISE NOTICE '  - m_bookmark_reasons: new master table added';
    RAISE NOTICE '  - t_customer_bookmarks: new table added';
    RAISE NOTICE '  - t_scheme_details: tenant_id now nullable (global)';
    RAISE NOTICE '  - t_nav_data: tenant_id nullable, global constraint';
    RAISE NOTICE '  - t_scheme_bookmarks: added alias_name, tenant-level';
    RAISE NOTICE '  - Removed restrictive import_type constraints';
    RAISE NOTICE 'Next: Run 03_indexes_triggers.sql';
    RAISE NOTICE '========================================';
END $$;