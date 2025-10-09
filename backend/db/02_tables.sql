-- ============================================================================
-- File: 02_tables.sql
-- Description: All table definitions in dependency order
-- Purpose: Create complete database schema
-- Execution: Run SECOND after 01_init.sql
-- Author: System
-- Date: 2025-01-08
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
-- ----------------------------------------------------------------------------
CREATE TABLE t_file_uploads (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES t_tenants(id) DEFAULT 1,
    is_live BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    
    file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('customer_import', 'transaction_import', 'customer_document', 'scheme_import')),
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
    processed_at TIMESTAMP
);

COMMENT ON TABLE t_file_uploads IS 'Track all uploaded files for import and document management';
COMMENT ON COLUMN t_file_uploads.file_type IS 'Type: customer_import, transaction_import, customer_document, scheme_import';

-- ----------------------------------------------------------------------------
-- TABLE: t_import_sessions
-- Description: Import processing sessions with progress tracking
-- Dependencies: t_file_uploads, t_tenants, t_users
-- ----------------------------------------------------------------------------
CREATE TABLE t_import_sessions (
    id SERIAL PRIMARY KEY,
    session_name VARCHAR(255) NOT NULL,
    file_upload_id INTEGER REFERENCES t_file_uploads(id),
    tenant_id INTEGER REFERENCES t_tenants(id) DEFAULT 1,
    is_live BOOLEAN DEFAULT true,
    
    import_type VARCHAR(50) NOT NULL CHECK (import_type IN ('CustomerData', 'TransactionData', 'SchemeData')),
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
COMMENT ON COLUMN t_import_sessions.status IS 'Status: pending, staged, processing, completed, completed_with_errors, failed, cancelled';
COMMENT ON COLUMN t_import_sessions.staging_total_rows IS 'Total rows inserted into staging table';

-- ----------------------------------------------------------------------------
-- TABLE: t_import_staging_data
-- Description: Staging table for ETL processing
-- Dependencies: t_import_sessions, t_tenants
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

-- ----------------------------------------------------------------------------
-- TABLE: t_import_field_mappings
-- Description: Field mapping templates for import types
-- Dependencies: t_tenants, t_users
-- ----------------------------------------------------------------------------
CREATE TABLE t_import_field_mappings (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES t_tenants(id) DEFAULT 1,
    is_live BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    
    import_type VARCHAR(50) NOT NULL CHECK (import_type IN ('CustomerData', 'TransactionData', 'SchemeData')),
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
-- ----------------------------------------------------------------------------
CREATE TABLE t_scheme_details (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES t_tenants(id) DEFAULT 1,
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

COMMENT ON TABLE t_scheme_details IS 'Mutual fund scheme details and metadata';
COMMENT ON COLUMN t_scheme_details.scheme_code IS 'Unique scheme identifier from AMFI';

-- ----------------------------------------------------------------------------
-- TABLE: t_scheme_bookmarks
-- Description: User bookmarked schemes for tracking
-- Dependencies: t_tenants, t_users, t_scheme_details
-- ----------------------------------------------------------------------------
CREATE TABLE t_scheme_bookmarks (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL DEFAULT 1,
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
    
    UNIQUE(tenant_id, user_id, scheme_id, is_live)
);

COMMENT ON TABLE t_scheme_bookmarks IS 'User bookmarks for tracking specific schemes';

-- ----------------------------------------------------------------------------
-- TABLE: t_nav_data
-- Description: Daily NAV data for schemes
-- Dependencies: t_tenants, t_scheme_details
-- ----------------------------------------------------------------------------
CREATE TABLE t_nav_data (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL DEFAULT 1,
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
    
    UNIQUE(tenant_id, scheme_id, nav_date, is_live)
);

COMMENT ON TABLE t_nav_data IS 'Historical NAV data for mutual fund schemes';

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
-- ----------------------------------------------------------------------------
CREATE TABLE t_customer_master_portfolio (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES t_customers(id),
    scheme_code VARCHAR(50),
    scheme_name VARCHAR(255),
    folio_no VARCHAR(100),
    tenant_id INTEGER,
    is_live BOOLEAN,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(customer_id, scheme_code, tenant_id, is_live)
);

COMMENT ON TABLE t_customer_master_portfolio IS 'Customer portfolio master records';

-- ----------------------------------------------------------------------------
-- TABLE: t_transaction_table
-- Description: Investment transactions
-- Dependencies: t_customers, t_tenants
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
    tenant_id INTEGER,
    is_live BOOLEAN,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE t_transaction_table IS 'Investment transaction records';
COMMENT ON COLUMN t_transaction_table.portfolio_flag IS 'Include/exclude from portfolio totals';

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
    RAISE NOTICE 'Next: Run 03_indexes_triggers.sql';
    RAISE NOTICE '========================================';
END $$;