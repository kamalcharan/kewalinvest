-- ============================================================================
-- File: 01_init.sql
-- Description: Foundation setup - Clean slate and prepare database
-- Purpose: Drop all existing objects and create necessary extensions
-- Execution: Run FIRST before any other migration files
-- Author: System
-- Date: 2025-01-08
-- ============================================================================

-- ============================================================================
-- SECTION 1: INFORMATION
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Starting Database Initialization';
    RAISE NOTICE 'Database: kewalinvest';
    RAISE NOTICE 'This will DROP ALL existing objects';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- SECTION 2: DROP ALL VIEWS (Must drop before tables)
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Dropping all views...';
END $$;

DROP VIEW IF EXISTS v_import_staging_statistics CASCADE;
DROP VIEW IF EXISTS v_import_staging_progress CASCADE;
DROP MATERIALIZED VIEW IF EXISTS t_customer_portfolio_totals CASCADE;

-- ============================================================================
-- SECTION 3: DROP ALL FUNCTIONS (Must drop before triggers)
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Dropping all functions...';
END $$;

-- Customer import functions
DROP FUNCTION IF EXISTS process_customer_import_with_timing(INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS process_single_customer_record(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS check_customer_duplicate(VARCHAR, VARCHAR, VARCHAR) CASCADE;

-- Scheme import functions
DROP FUNCTION IF EXISTS process_single_scheme_record(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS process_scheme_import_with_timing(INTEGER, INTEGER) CASCADE;

-- Cleanup functions
DROP FUNCTION IF EXISTS cleanup_old_staging_data(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS cleanup_session_staging_data(INTEGER, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS get_staging_storage_stats() CASCADE;

-- Utility functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_staging_updated_at() CASCADE;
DROP FUNCTION IF EXISTS current_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS current_environment() CASCADE;

-- ============================================================================
-- SECTION 4: DROP ALL TABLES (In reverse dependency order)
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Dropping all tables...';
END $$;

-- Drop JTBD tables
DROP TABLE IF EXISTS t_jtbd_configurations CASCADE;

-- Drop NAV tables
DROP TABLE IF EXISTS t_nav_schedule_executions CASCADE;
DROP TABLE IF EXISTS t_nav_scheduler_configs CASCADE;
DROP TABLE IF EXISTS t_nav_download_jobs CASCADE;
DROP TABLE IF EXISTS t_nav_data CASCADE;
DROP TABLE IF EXISTS t_scheme_bookmarks CASCADE;

-- Drop scheme tables
DROP TABLE IF EXISTS t_scheme_staging_data CASCADE;
DROP TABLE IF EXISTS t_scheme_details CASCADE;
DROP TABLE IF EXISTS t_scheme_masters CASCADE;

-- Drop transaction tables
DROP TABLE IF EXISTS t_transaction_table CASCADE;
DROP TABLE IF EXISTS t_customer_master_portfolio CASCADE;
DROP TABLE IF EXISTS m_transaction_types CASCADE;

-- Drop import tables
DROP TABLE IF EXISTS t_import_record_results CASCADE;
DROP TABLE IF EXISTS t_import_staging_data CASCADE;
DROP TABLE IF EXISTS t_import_field_mappings CASCADE;
DROP TABLE IF EXISTS t_import_sessions CASCADE;
DROP TABLE IF EXISTS t_import_logs CASCADE;
DROP TABLE IF EXISTS t_file_uploads CASCADE;

-- Drop customer tables
DROP TABLE IF EXISTS t_customer_addresses CASCADE;
DROP TABLE IF EXISTS t_customers CASCADE;
DROP TABLE IF EXISTS t_contact_channels CASCADE;
DROP TABLE IF EXISTS t_contacts CASCADE;

-- Drop chat tables
DROP TABLE IF EXISTS t_chat_messages CASCADE;
DROP TABLE IF EXISTS t_chat_sessions CASCADE;

-- Drop user tables
DROP TABLE IF EXISTS t_users CASCADE;

-- Drop tenant table (last, as everything references it)
DROP TABLE IF EXISTS t_tenants CASCADE;

-- ============================================================================
-- SECTION 5: DROP ALL INDEXES (Dynamic Cleanup)
-- ============================================================================
DO $$ 
DECLARE
    r RECORD;
    v_dropped_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Dropping all custom indexes...';
    
    -- Drop all indexes that start with 'idx_' or 'm_' (our custom indexes)
    FOR r IN (
        SELECT schemaname, indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND (indexname LIKE 'idx_%' OR indexname LIKE 'm_%')
        ORDER BY indexname
    ) LOOP
        BEGIN
            EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(r.schemaname) || '.' || quote_ident(r.indexname) || ' CASCADE';
            v_dropped_count := v_dropped_count + 1;
        EXCEPTION WHEN OTHERS THEN
            -- Silently ignore errors and continue
            NULL;
        END;
    END LOOP;
    
    RAISE NOTICE 'Dropped % custom indexes', v_dropped_count;
END $$;

-- ============================================================================
-- SECTION 6: DROP ALL TRIGGERS (Dynamic Cleanup)
-- ============================================================================
DO $$ 
DECLARE
    r RECORD;
    v_dropped_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Dropping all triggers...';
    
    -- Drop all non-internal triggers
    FOR r IN (
        SELECT tgname, relname
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
        AND NOT t.tgisinternal
        ORDER BY tgname
    ) LOOP
        BEGIN
            EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.tgname) || 
                    ' ON ' || quote_ident(r.relname) || ' CASCADE';
            v_dropped_count := v_dropped_count + 1;
        EXCEPTION WHEN OTHERS THEN
            -- Silently ignore errors
            NULL;
        END;
    END LOOP;
    
    RAISE NOTICE 'Dropped % triggers', v_dropped_count;
END $$;

-- ============================================================================
-- SECTION 7: DROP ALL POLICIES (Row Level Security)
-- ============================================================================
DO $$ 
DECLARE
    r RECORD;
    v_dropped_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Dropping all RLS policies...';
    
    -- Drop all policies in public schema
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname
    ) LOOP
        BEGIN
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || 
                    ' ON ' || quote_ident(r.schemaname) || '.' || quote_ident(r.tablename) || ' CASCADE';
            v_dropped_count := v_dropped_count + 1;
        EXCEPTION WHEN OTHERS THEN
            -- Silently ignore errors
            NULL;
        END;
    END LOOP;
    
    RAISE NOTICE 'Dropped % RLS policies', v_dropped_count;
END $$;

-- Disable RLS on any remaining tables
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    ) LOOP
        BEGIN
            EXECUTE 'ALTER TABLE IF EXISTS ' || quote_ident(r.tablename) || ' DISABLE ROW LEVEL SECURITY';
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END LOOP;
END $$;

-- ============================================================================
-- SECTION 8: CREATE EXTENSIONS
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating required extensions...';
END $$;

-- UUID extension for unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pg_trgm for fuzzy text search (optional but useful for search features)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- SECTION 9: VERIFY CLEAN STATE
-- ============================================================================
DO $$ 
DECLARE
    v_table_count INTEGER;
    v_function_count INTEGER;
    v_view_count INTEGER;
    v_index_count INTEGER;
    v_trigger_count INTEGER;
    v_policy_count INTEGER;
    rec RECORD;
BEGIN
    -- Count remaining tables
    SELECT COUNT(*) INTO v_table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE';
    
    -- Count remaining functions
    SELECT COUNT(*) INTO v_function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.prokind = 'f';
    
    -- Count remaining views
    SELECT COUNT(*) INTO v_view_count
    FROM information_schema.views
    WHERE table_schema = 'public';
    
    -- Count custom indexes
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND (indexname LIKE 'idx_%' OR indexname LIKE 'm_%');
    
    -- Count triggers
    SELECT COUNT(*) INTO v_trigger_count
    FROM pg_trigger
    WHERE tgisinternal = false;
    
    -- Count policies
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Cleanup Summary:';
    RAISE NOTICE 'Tables remaining: %', v_table_count;
    RAISE NOTICE 'Functions remaining: %', v_function_count;
    RAISE NOTICE 'Views remaining: %', v_view_count;
    RAISE NOTICE 'Custom indexes remaining: %', v_index_count;
    RAISE NOTICE 'Triggers remaining: %', v_trigger_count;
    RAISE NOTICE 'RLS policies remaining: %', v_policy_count;
    RAISE NOTICE '========================================';
    
    -- List any remaining tables (for debugging)
    IF v_table_count > 0 THEN
        RAISE NOTICE 'Remaining tables:';
        FOR rec IN 
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        LOOP
            RAISE NOTICE '  - %', rec.table_name;
        END LOOP;
    END IF;
    
    -- Warn if custom indexes remain
    IF v_index_count > 0 THEN
        RAISE WARNING '% custom indexes still exist after cleanup', v_index_count;
    END IF;
END $$;

-- ============================================================================
-- SECTION 10: GRANT PERMISSIONS ON EXTENSIONS
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Setting up extension permissions...';
END $$;

-- Grant usage on extensions
GRANT ALL ON SCHEMA public TO kewal_admin;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Database initialization completed!';
    RAISE NOTICE 'Database is now ready for table creation';
    RAISE NOTICE 'Next: Run 02_tables.sql';
    RAISE NOTICE '========================================';
END $$;-- ============================================================================
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
    prefix VARCHAR(20) NOT NULL CHECK (prefix IN ('Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Sri', 'Shri', 'Smt', 'Kumari', 'Master', 'Late', 'Pandit', 'CA', 'Adv')),
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
    pan VARCHAR(15),
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
END $$;-- ============================================================================
-- File: 03_indexes_triggers.sql
-- Description: All indexes and triggers for performance and automation
-- Purpose: Optimize queries and automate timestamp updates
-- Execution: Run THIRD after 02_tables.sql
-- Author: System
-- Date: 2025-01-08
-- Updated: 2025-01-09 (Added indexes for portfolio fields, transaction tracking, system logs, materialized view)
-- Updated: 2025-01-15 (Added bookmark indexes and triggers)
-- ============================================================================

-- ============================================================================
-- SECTION 1: CORE TABLE INDEXES
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Creating Indexes for Core Tables';
    RAISE NOTICE '========================================';
END $$;

-- ----------------------------------------------------------------------------
-- INDEXES: t_users
-- ----------------------------------------------------------------------------
CREATE INDEX idx_users_email ON t_users(email);
CREATE INDEX idx_users_tenant ON t_users(tenant_id);
CREATE INDEX idx_users_tenant_active ON t_users(tenant_id, is_active) WHERE is_active = true;
CREATE INDEX idx_users_environment ON t_users(environment_preference, is_live);

COMMENT ON INDEX idx_users_email IS 'Fast email lookup for authentication';
COMMENT ON INDEX idx_users_tenant IS 'Tenant isolation queries';

-- ----------------------------------------------------------------------------
-- INDEXES: t_tenants
-- ----------------------------------------------------------------------------
CREATE INDEX idx_tenants_code ON t_tenants(tenant_code) WHERE is_active = true;
CREATE INDEX idx_tenants_active ON t_tenants(is_active);

-- ============================================================================
-- SECTION 2: CHAT TABLE INDEXES
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Indexes for Chat Tables...';
END $$;

-- ----------------------------------------------------------------------------
-- INDEXES: t_chat_sessions
-- ----------------------------------------------------------------------------
CREATE INDEX idx_chat_sessions_user ON t_chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_tenant ON t_chat_sessions(tenant_id, is_live);
CREATE INDEX idx_chat_sessions_user_recent ON t_chat_sessions(user_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- INDEXES: t_chat_messages
-- ----------------------------------------------------------------------------
CREATE INDEX idx_chat_messages_session ON t_chat_messages(session_id);
CREATE INDEX idx_chat_messages_session_time ON t_chat_messages(session_id, created_at);

-- ============================================================================
-- SECTION 3: CONTACT & CUSTOMER INDEXES
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Indexes for Contact and Customer Tables...';
END $$;

-- ----------------------------------------------------------------------------
-- INDEXES: t_contacts
-- ----------------------------------------------------------------------------
CREATE INDEX idx_contacts_tenant ON t_contacts(tenant_id, is_live);
CREATE INDEX idx_contacts_name ON t_contacts(name);
CREATE INDEX idx_contacts_is_customer ON t_contacts(is_customer) WHERE is_customer = true;
CREATE INDEX idx_contacts_active ON t_contacts(tenant_id, is_active, is_live);

-- ----------------------------------------------------------------------------
-- INDEXES: t_contact_channels
-- ----------------------------------------------------------------------------
CREATE INDEX idx_channels_contact ON t_contact_channels(contact_id);
CREATE INDEX idx_channels_type_value ON t_contact_channels(channel_type, channel_value);
CREATE INDEX idx_channels_email ON t_contact_channels(channel_value) 
    WHERE channel_type = 'email' AND is_active = true;
CREATE INDEX idx_channels_mobile ON t_contact_channels(channel_value) 
    WHERE channel_type = 'mobile' AND is_active = true;
CREATE INDEX idx_channels_primary ON t_contact_channels(contact_id, channel_type, is_primary) 
    WHERE is_primary = true;

COMMENT ON INDEX idx_channels_email IS 'Fast email lookup for duplicate checking';
COMMENT ON INDEX idx_channels_mobile IS 'Fast mobile lookup for duplicate checking';

-- ----------------------------------------------------------------------------
-- INDEXES: t_customers
-- NOTE: Uses plain text pan/iwell_code fields
-- ----------------------------------------------------------------------------
CREATE INDEX idx_customers_contact ON t_customers(contact_id);
CREATE INDEX idx_customers_tenant ON t_customers(tenant_id, is_live);
CREATE INDEX idx_customers_active ON t_customers(tenant_id, is_active, is_live);
CREATE INDEX idx_customers_pan ON t_customers(pan) 
    WHERE is_live = true AND pan IS NOT NULL;
CREATE INDEX idx_customers_iwell_code ON t_customers(iwell_code) 
    WHERE is_live = true AND iwell_code IS NOT NULL;
CREATE INDEX idx_customers_survival ON t_customers(survival_status) 
    WHERE is_active = true;
CREATE INDEX idx_customers_onboarding ON t_customers(onboarding_status) 
    WHERE is_active = true;
CREATE INDEX idx_customers_dob ON t_customers(date_of_birth) 
    WHERE date_of_birth IS NOT NULL;
CREATE INDEX idx_customers_referred_by ON t_customers(referred_by) 
    WHERE referred_by IS NOT NULL;
CREATE INDEX idx_customers_jtbd_setup ON t_customers(has_jtbd_setup) 
    WHERE has_jtbd_setup = true;

COMMENT ON INDEX idx_customers_jtbd_setup IS 'Fast lookup of customers with JTBD configurations';
COMMENT ON INDEX idx_customers_pan IS 'Fast PAN lookup for duplicate checking - PLAIN TEXT';
COMMENT ON INDEX idx_customers_iwell_code IS 'Fast IWELL code lookup - PLAIN TEXT';

-- ----------------------------------------------------------------------------
-- INDEXES: t_customer_addresses
-- ----------------------------------------------------------------------------
CREATE INDEX idx_addresses_customer ON t_customer_addresses(customer_id);
CREATE INDEX idx_addresses_primary ON t_customer_addresses(customer_id, is_primary) 
    WHERE is_primary = true;
CREATE INDEX idx_addresses_city ON t_customer_addresses(city);
CREATE INDEX idx_addresses_pincode ON t_customer_addresses(pincode);

-- ============================================================================
-- SECTION 4: FILE UPLOAD & IMPORT INDEXES
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Indexes for Import Tables...';
END $$;

-- ----------------------------------------------------------------------------
-- INDEXES: t_file_uploads
-- ----------------------------------------------------------------------------
CREATE INDEX idx_file_uploads_tenant ON t_file_uploads(tenant_id, is_live);
CREATE INDEX idx_file_uploads_type ON t_file_uploads(file_type);
CREATE INDEX idx_file_uploads_status ON t_file_uploads(processing_status);
CREATE INDEX idx_file_uploads_customer ON t_file_uploads(customer_id) 
    WHERE customer_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- INDEXES: t_import_sessions
-- ----------------------------------------------------------------------------
CREATE INDEX idx_import_sessions_tenant_type ON t_import_sessions(tenant_id, import_type, is_live);
CREATE INDEX idx_import_sessions_status ON t_import_sessions(status);
CREATE INDEX idx_import_sessions_type ON t_import_sessions(import_type);
CREATE INDEX idx_import_sessions_n8n_execution ON t_import_sessions(n8n_execution_id) 
    WHERE n8n_execution_id IS NOT NULL;
CREATE INDEX idx_import_sessions_processing ON t_import_sessions(status) 
    WHERE status IN ('processing', 'pending');
CREATE INDEX idx_import_sessions_staged ON t_import_sessions(status) 
    WHERE status = 'staged';
CREATE INDEX idx_import_sessions_file ON t_import_sessions(file_upload_id);
CREATE INDEX idx_sessions_cleanup ON t_import_sessions(status, processing_completed_at) 
    WHERE status IN ('completed', 'completed_with_errors', 'cancelled');

COMMENT ON INDEX idx_import_sessions_staged IS 'Find sessions ready for processing';
COMMENT ON INDEX idx_sessions_cleanup IS 'Support cleanup of old completed sessions';

-- ----------------------------------------------------------------------------
-- INDEXES: t_import_staging_data
-- ----------------------------------------------------------------------------
CREATE INDEX idx_staging_session_status ON t_import_staging_data(session_id, processing_status);
CREATE INDEX idx_staging_tenant ON t_import_staging_data(tenant_id, is_live);
CREATE INDEX idx_staging_pending ON t_import_staging_data(processing_status, import_type) 
    WHERE processing_status = 'pending';
CREATE INDEX idx_staging_session_processing ON t_import_staging_data(session_id) 
    WHERE processing_status IN ('pending', 'processing');
CREATE INDEX idx_staging_view_support ON t_import_staging_data(session_id, processing_status);
CREATE INDEX idx_staging_created_record ON t_import_staging_data(created_record_type, created_record_id) 
    WHERE created_record_id IS NOT NULL;

COMMENT ON INDEX idx_staging_pending IS 'Fast lookup of pending records for processing';

-- ----------------------------------------------------------------------------
-- INDEXES: t_import_field_mappings
-- ----------------------------------------------------------------------------
CREATE INDEX idx_field_mappings_type ON t_import_field_mappings(tenant_id, import_type, is_live);
CREATE INDEX idx_field_mappings_default ON t_import_field_mappings(import_type, is_default) 
    WHERE is_default = true;
CREATE INDEX idx_field_mappings_active ON t_import_field_mappings(is_active) 
    WHERE is_active = true;

-- ----------------------------------------------------------------------------
-- INDEXES: t_import_record_results
-- ----------------------------------------------------------------------------
CREATE INDEX idx_record_results_session ON t_import_record_results(import_session_id);
CREATE INDEX idx_record_results_status ON t_import_record_results(status);
CREATE INDEX idx_record_results_customer ON t_import_record_results(created_customer_id) 
    WHERE created_customer_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- INDEXES: t_import_logs
-- ----------------------------------------------------------------------------
CREATE INDEX idx_import_logs_file ON t_import_logs(file_upload_id);
CREATE INDEX idx_import_logs_type ON t_import_logs(import_type);
CREATE INDEX idx_import_logs_tenant ON t_import_logs(tenant_id, is_live);

-- ============================================================================
-- SECTION 5: SCHEME & NAV INDEXES
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Indexes for Scheme and NAV Tables...';
END $$;

-- ----------------------------------------------------------------------------
-- INDEXES: t_scheme_masters
-- ----------------------------------------------------------------------------
CREATE INDEX idx_scheme_masters_type ON t_scheme_masters(master_type);
CREATE INDEX idx_scheme_masters_code ON t_scheme_masters(code);
CREATE INDEX idx_scheme_masters_active ON t_scheme_masters(master_type, is_active) 
    WHERE is_active = true;

-- ----------------------------------------------------------------------------
-- INDEXES: t_scheme_details
-- ----------------------------------------------------------------------------
CREATE INDEX idx_scheme_details_code ON t_scheme_details(scheme_code);
CREATE INDEX idx_scheme_details_amc ON t_scheme_details(amc_name);
CREATE INDEX idx_scheme_details_type ON t_scheme_details(scheme_type_id);
CREATE INDEX idx_scheme_details_category ON t_scheme_details(scheme_category_id);
CREATE INDEX idx_scheme_details_active ON t_scheme_details(tenant_id, is_active, is_live);
CREATE INDEX idx_scheme_details_name ON t_scheme_details(scheme_name);

-- ----------------------------------------------------------------------------
-- INDEXES: t_scheme_bookmarks
-- ----------------------------------------------------------------------------
CREATE INDEX idx_bookmarks_user ON t_scheme_bookmarks(user_id, tenant_id, is_live);
CREATE INDEX idx_bookmarks_scheme ON t_scheme_bookmarks(scheme_id);
CREATE INDEX idx_bookmarks_daily_download ON t_scheme_bookmarks(daily_download_enabled) 
    WHERE daily_download_enabled = true;
CREATE INDEX idx_bookmarks_active ON t_scheme_bookmarks(is_active) 
    WHERE is_active = true;

-- ----------------------------------------------------------------------------
-- INDEXES: t_nav_data
-- ----------------------------------------------------------------------------
CREATE INDEX idx_nav_scheme_date ON t_nav_data(scheme_id, nav_date DESC);
CREATE INDEX idx_nav_code_date ON t_nav_data(scheme_code, nav_date DESC);
CREATE INDEX idx_nav_date ON t_nav_data(nav_date DESC);
CREATE INDEX idx_nav_source ON t_nav_data(data_source);
CREATE INDEX idx_nav_tenant ON t_nav_data(tenant_id, is_live);

COMMENT ON INDEX idx_nav_scheme_date IS 'Fast NAV lookups by scheme and date';

-- ----------------------------------------------------------------------------
-- INDEXES: t_nav_download_jobs
-- ----------------------------------------------------------------------------
CREATE INDEX idx_nav_jobs_status ON t_nav_download_jobs(status);
CREATE INDEX idx_nav_jobs_scheduled ON t_nav_download_jobs(scheduled_date);
CREATE INDEX idx_nav_jobs_type ON t_nav_download_jobs(job_type);
CREATE INDEX idx_nav_jobs_pending ON t_nav_download_jobs(status, scheduled_date) 
    WHERE status = 'pending';

-- ----------------------------------------------------------------------------
-- INDEXES: t_nav_scheduler_configs
-- ----------------------------------------------------------------------------
CREATE INDEX idx_scheduler_configs_tenant_user ON t_nav_scheduler_configs(tenant_id, user_id, is_live);
CREATE INDEX idx_scheduler_configs_enabled ON t_nav_scheduler_configs(is_enabled) 
    WHERE is_enabled = true;
CREATE INDEX idx_scheduler_configs_next_execution ON t_nav_scheduler_configs(next_execution_at) 
    WHERE is_enabled = true;

-- ----------------------------------------------------------------------------
-- INDEXES: t_nav_schedule_executions
-- ----------------------------------------------------------------------------
CREATE INDEX idx_nav_schedule_executions_config_id ON t_nav_schedule_executions(scheduler_config_id);
CREATE INDEX idx_nav_schedule_executions_time ON t_nav_schedule_executions(execution_time);
CREATE INDEX idx_nav_schedule_executions_status ON t_nav_schedule_executions(status);

-- ============================================================================
-- SECTION 6: PORTFOLIO & TRANSACTION INDEXES
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Indexes for Portfolio and Transaction Tables...';
END $$;

-- ----------------------------------------------------------------------------
-- INDEXES: t_customer_master_portfolio
-- UPDATED: Added indexes for new category and fund_name columns
-- ----------------------------------------------------------------------------
CREATE INDEX idx_portfolio_customer ON t_customer_master_portfolio(customer_id);
CREATE INDEX idx_portfolio_scheme ON t_customer_master_portfolio(scheme_code);
CREATE INDEX idx_portfolio_folio ON t_customer_master_portfolio(folio_no);
CREATE INDEX idx_portfolio_tenant ON t_customer_master_portfolio(tenant_id, is_live);
CREATE INDEX idx_portfolio_active ON t_customer_master_portfolio(customer_id, is_active) 
    WHERE is_active = true;
CREATE INDEX idx_portfolio_category ON t_customer_master_portfolio(category);
CREATE INDEX idx_portfolio_fund_name ON t_customer_master_portfolio(fund_name);

COMMENT ON INDEX idx_portfolio_category IS 'Fast filtering by fund category (Equity, Debt, Hybrid)';
COMMENT ON INDEX idx_portfolio_fund_name IS 'Fast searching by fund name';

-- ----------------------------------------------------------------------------
-- INDEXES: t_transaction_table
-- UPDATED: Added indexes for new import tracking columns
-- ----------------------------------------------------------------------------
CREATE INDEX idx_transactions_customer ON t_transaction_table(customer_id);
CREATE INDEX idx_transactions_scheme ON t_transaction_table(scheme_code);
CREATE INDEX idx_transactions_date ON t_transaction_table(txn_date DESC);
CREATE INDEX idx_transactions_customer_date ON t_transaction_table(customer_id, txn_date DESC);
CREATE INDEX idx_transactions_folio ON t_transaction_table(folio_no);
CREATE INDEX idx_transactions_portfolio_flag ON t_transaction_table(portfolio_flag) 
    WHERE portfolio_flag = true;
CREATE INDEX idx_transactions_tenant ON t_transaction_table(tenant_id, is_live);
CREATE INDEX idx_transaction_staging_record ON t_transaction_table(staging_record_id);
CREATE INDEX idx_transaction_import_session ON t_transaction_table(import_session_id);
CREATE INDEX idx_transaction_duplicates ON t_transaction_table(is_potential_duplicate) 
    WHERE is_potential_duplicate = true;

COMMENT ON INDEX idx_transaction_staging_record IS 'Link transactions back to staging records';
COMMENT ON INDEX idx_transaction_import_session IS 'Find all transactions from specific import session';
COMMENT ON INDEX idx_transaction_duplicates IS 'Fast lookup of potential duplicate transactions';

-- ----------------------------------------------------------------------------
-- INDEXES: m_transaction_types
-- ----------------------------------------------------------------------------
CREATE INDEX idx_txn_types_code ON m_transaction_types(txn_code);
CREATE INDEX idx_txn_types_active ON m_transaction_types(is_active) WHERE is_active = true;
CREATE INDEX idx_txn_types_type ON m_transaction_types(txn_type);

COMMENT ON INDEX idx_txn_types_code IS 'Fast lookup by transaction code';
COMMENT ON INDEX idx_txn_types_active IS 'Fast lookup of active transaction types';
COMMENT ON INDEX idx_txn_types_type IS 'Filter by transaction type (purchase/redemption)';

-- ============================================================================
-- SECTION 7: JTBD INDEXES
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Indexes for JTBD Tables...';
END $$;

-- ----------------------------------------------------------------------------
-- INDEXES: t_jtbd_configurations
-- ----------------------------------------------------------------------------
CREATE INDEX idx_jtbd_customer ON t_jtbd_configurations(customer_id, tenant_id, is_live);
CREATE INDEX idx_jtbd_type ON t_jtbd_configurations(jtbd_type);
CREATE INDEX idx_jtbd_active ON t_jtbd_configurations(is_active, tenant_id, is_live);
CREATE INDEX idx_jtbd_next_date ON t_jtbd_configurations(next_alert_date) 
    WHERE is_active = true;
CREATE INDEX idx_jtbd_priority ON t_jtbd_configurations(priority, is_active);

-- ============================================================================
-- SECTION 7B: BOOKMARK INDEXES
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Indexes for Bookmark Tables...';
END $$;

-- ----------------------------------------------------------------------------
-- INDEXES: m_bookmark_reasons
-- ----------------------------------------------------------------------------
CREATE INDEX idx_bookmark_reasons_tenant ON m_bookmark_reasons(tenant_id, is_live, is_active);
CREATE INDEX idx_bookmark_reasons_code ON m_bookmark_reasons(tenant_id, is_live, reason_code);
CREATE INDEX idx_bookmark_reasons_active ON m_bookmark_reasons(tenant_id, is_live, display_order) 
    WHERE is_active = true;

COMMENT ON INDEX idx_bookmark_reasons_tenant IS 'Fast lookup of reasons by tenant and environment';
COMMENT ON INDEX idx_bookmark_reasons_code IS 'Fast lookup by reason code';
COMMENT ON INDEX idx_bookmark_reasons_active IS 'Retrieve active reasons sorted by display order';

-- ----------------------------------------------------------------------------
-- INDEXES: t_customer_bookmarks
-- ----------------------------------------------------------------------------
CREATE INDEX idx_customer_bookmarks_customer ON t_customer_bookmarks(customer_id, is_active);
CREATE INDEX idx_customer_bookmarks_user ON t_customer_bookmarks(user_id, tenant_id, is_live, is_active);
CREATE INDEX idx_customer_bookmarks_reason ON t_customer_bookmarks(reason_id) 
    WHERE reason_id IS NOT NULL;
CREATE INDEX idx_customer_bookmarks_tenant ON t_customer_bookmarks(tenant_id, is_live, is_active);
CREATE INDEX idx_customer_bookmarks_active ON t_customer_bookmarks(is_active, created_at DESC) 
    WHERE is_active = true;

COMMENT ON INDEX idx_customer_bookmarks_customer IS 'Fast lookup of bookmarks for a customer';
COMMENT ON INDEX idx_customer_bookmarks_user IS 'Fast lookup of user bookmarks';
COMMENT ON INDEX idx_customer_bookmarks_reason IS 'Fast filtering by bookmark reason';
COMMENT ON INDEX idx_customer_bookmarks_active IS 'Recent bookmarks query optimization';

-- ============================================================================
-- SECTION 8: SYSTEM LOGS INDEXES
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Indexes for System Logs Table...';
END $$;

-- ----------------------------------------------------------------------------
-- INDEXES: t_system_logs
-- NEW: All indexes for the system logs table
-- ----------------------------------------------------------------------------
CREATE INDEX idx_system_logs_created_at ON t_system_logs(created_at DESC);
CREATE INDEX idx_system_logs_level ON t_system_logs(level);
CREATE INDEX idx_system_logs_source ON t_system_logs(source);
CREATE INDEX idx_system_logs_tenant_id ON t_system_logs(tenant_id);
CREATE INDEX idx_system_logs_user_id ON t_system_logs(user_id);
CREATE INDEX idx_system_logs_level_created_at ON t_system_logs(level, created_at DESC);

COMMENT ON INDEX idx_system_logs_created_at IS 'Fast retrieval of recent logs';
COMMENT ON INDEX idx_system_logs_level IS 'Filter logs by severity level';
COMMENT ON INDEX idx_system_logs_source IS 'Filter logs by source system';
COMMENT ON INDEX idx_system_logs_level_created_at IS 'Common query pattern: logs by level and time';

-- ============================================================================
-- SECTION 9: TRIGGER FUNCTIONS
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Creating Trigger Functions';
    RAISE NOTICE '========================================';
END $$;

-- ----------------------------------------------------------------------------
-- FUNCTION: update_updated_at_column
-- Description: Generic function to update updated_at timestamp
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column IS 'Automatically update updated_at timestamp on row update';

-- ----------------------------------------------------------------------------
-- FUNCTION: update_staging_updated_at
-- Description: Update timestamp for staging table
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_staging_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 10: CREATE TRIGGERS
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Triggers...';
END $$;

-- ----------------------------------------------------------------------------
-- TRIGGERS: Core tables
-- ----------------------------------------------------------------------------
CREATE TRIGGER update_tenants_updated_at 
    BEFORE UPDATE ON t_tenants
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON t_users
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TRIGGERS: Contact & Customer tables
-- ----------------------------------------------------------------------------
CREATE TRIGGER update_contacts_updated_at 
    BEFORE UPDATE ON t_contacts
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON t_customers
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TRIGGERS: Import tables
-- UPDATED: Added trigger for t_file_uploads
-- ----------------------------------------------------------------------------
CREATE TRIGGER update_file_uploads_updated_at 
    BEFORE UPDATE ON t_file_uploads
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_import_sessions_updated_at 
    BEFORE UPDATE ON t_import_sessions
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_staging_updated_at 
    BEFORE UPDATE ON t_import_staging_data
    FOR EACH ROW 
    EXECUTE FUNCTION update_staging_updated_at();

CREATE TRIGGER update_field_mappings_updated_at 
    BEFORE UPDATE ON t_import_field_mappings
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TRIGGERS: Scheme tables
-- ----------------------------------------------------------------------------
CREATE TRIGGER update_scheme_masters_updated_at 
    BEFORE UPDATE ON t_scheme_masters
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheme_details_updated_at 
    BEFORE UPDATE ON t_scheme_details
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheme_bookmarks_updated_at 
    BEFORE UPDATE ON t_scheme_bookmarks
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nav_data_updated_at 
    BEFORE UPDATE ON t_nav_data
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nav_jobs_updated_at 
    BEFORE UPDATE ON t_nav_download_jobs
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduler_configs_updated_at 
    BEFORE UPDATE ON t_nav_scheduler_configs
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TRIGGERS: Portfolio & Transaction tables
-- ----------------------------------------------------------------------------
CREATE TRIGGER update_portfolio_updated_at 
    BEFORE UPDATE ON t_customer_master_portfolio
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON t_transaction_table
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TRIGGERS: JTBD tables
-- ----------------------------------------------------------------------------
CREATE TRIGGER update_jtbd_updated_at 
    BEFORE UPDATE ON t_jtbd_configurations
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TRIGGERS: Bookmark tables
-- ----------------------------------------------------------------------------
CREATE TRIGGER update_bookmark_reasons_updated_at 
    BEFORE UPDATE ON m_bookmark_reasons
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_bookmarks_updated_at 
    BEFORE UPDATE ON t_customer_bookmarks
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 11: ANALYZE TABLES FOR QUERY PLANNER
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Analyzing tables for query planner optimization...';
END $$;

ANALYZE t_tenants;
ANALYZE t_users;
ANALYZE t_contacts;
ANALYZE t_contact_channels;
ANALYZE t_customers;
ANALYZE t_customer_addresses;
ANALYZE t_import_sessions;
ANALYZE t_import_staging_data;
ANALYZE t_scheme_details;
ANALYZE t_nav_data;
ANALYZE t_customer_master_portfolio;
ANALYZE t_transaction_table;
ANALYZE t_system_logs;
ANALYZE m_bookmark_reasons;
ANALYZE t_customer_bookmarks;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
DO $$ 
DECLARE
    v_index_count INTEGER;
    v_trigger_count INTEGER;
BEGIN
    -- Count indexes
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE schemaname = 'public';
    
    -- Count triggers
    SELECT COUNT(*) INTO v_trigger_count
    FROM pg_trigger
    WHERE tgisinternal = false;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Indexes and Triggers created!';
    RAISE NOTICE 'Total indexes: %', v_index_count;
    RAISE NOTICE 'Total triggers: %', v_trigger_count;
    RAISE NOTICE 'Updates included:';
    RAISE NOTICE '  - Added trigger for t_file_uploads.updated_at';
    RAISE NOTICE '  - Added indexes for portfolio categories';
    RAISE NOTICE '  - Added indexes for transaction import tracking';
    RAISE NOTICE '  - Added all indexes for t_system_logs';
    RAISE NOTICE '  - Added indexes for bookmark reasons and customer bookmarks';
    RAISE NOTICE '  - Added triggers for bookmark tables';
    RAISE NOTICE 'Next: Run 04_functions_views_policies.sql';
    RAISE NOTICE '========================================';
END $$;-- ============================================================================
-- File: 04_functions_views_policies.sql
-- Description: Business logic functions, views, and security policies
-- Purpose: Implement data processing, views, and row-level security
-- Execution: Run FOURTH after 03_indexes_triggers.sql
-- Author: System
-- Date: 2025-01-08
-- Updated: 2025-01-09 (Added transaction import, materialized view, refresh function)
-- Updated: 2025-01-15 (Added v_tenant_customer_schemes view for NAV refactor)
-- ============================================================================

-- ============================================================================
-- SECTION 1: UTILITY FUNCTIONS (RLS Support)
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Creating Utility Functions';
    RAISE NOTICE '========================================';
END $$;

-- ----------------------------------------------------------------------------
-- FUNCTION: current_tenant_id
-- Description: Get current tenant_id from session context for RLS
-- Usage: Set with: SET app.current_tenant_id = '2';
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION current_tenant_id() 
RETURNS INTEGER AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::INTEGER;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION current_tenant_id IS 'Get current tenant ID from session for RLS policies';

-- ----------------------------------------------------------------------------
-- FUNCTION: current_environment
-- Description: Get current environment (live/test) from session context
-- Usage: SET app.current_environment = 'live';
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION current_environment() 
RETURNS VARCHAR AS $$
BEGIN
    RETURN COALESCE(current_setting('app.current_environment', true), 'live');
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'live';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION current_environment IS 'Get current environment (live/test) from session';

-- ============================================================================
-- SECTION 2: CUSTOMER IMPORT FUNCTIONS
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Customer Import Functions...';
END $$;

-- ----------------------------------------------------------------------------
-- FUNCTION: check_customer_duplicate
-- Description: Check if customer already exists by PAN, email, or mobile
-- NOTE: Uses PLAIN TEXT pan field (not encrypted)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_customer_duplicate(
    p_pan VARCHAR,
    p_email VARCHAR,
    p_mobile VARCHAR
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    -- Check by PAN if provided (PLAIN TEXT comparison)
    IF p_pan IS NOT NULL AND p_pan != '' THEN
        SELECT EXISTS(
            SELECT 1 FROM t_customers 
            WHERE pan = UPPER(TRIM(p_pan))
            AND is_active = true
        ) INTO v_exists;
        
        IF v_exists THEN
            RETURN true;
        END IF;
    END IF;
    
    -- Check by email
    IF p_email IS NOT NULL AND p_email != '' THEN
        SELECT EXISTS(
            SELECT 1 FROM t_contact_channels
            WHERE channel_type = 'email'
            AND channel_value = LOWER(TRIM(p_email))
            AND is_active = true
        ) INTO v_exists;
        
        IF v_exists THEN
            RETURN true;
        END IF;
    END IF;
    
    -- Check by mobile
    IF p_mobile IS NOT NULL AND p_mobile != '' THEN
        SELECT EXISTS(
            SELECT 1 FROM t_contact_channels
            WHERE channel_type = 'mobile'
            AND channel_value = REGEXP_REPLACE(p_mobile, '[^0-9]', '', 'g')
            AND is_active = true
        ) INTO v_exists;
        
        IF v_exists THEN
            RETURN true;
        END IF;
    END IF;
    
    RETURN false;
END;
$$;

COMMENT ON FUNCTION check_customer_duplicate IS 'Check for duplicate customers using PAN (plain text), email, or mobile';

-- ----------------------------------------------------------------------------
-- FUNCTION: process_single_customer_record
-- Description: Process a single customer record from staging
-- NOTE: Uses PLAIN TEXT for pan and iwell_code (no encryption)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION process_single_customer_record(p_staging_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_staging RECORD;
    v_mapped_data JSONB;
    v_contact_id INTEGER;
    v_customer_id INTEGER;
    v_is_duplicate BOOLEAN;
    v_error_messages TEXT[];
    v_clean_prefix VARCHAR(10);
    v_date_of_birth DATE;
    v_anniversary_date DATE;
    v_iwell_code VARCHAR(100);
BEGIN
    -- Get staging record
    SELECT * INTO v_staging
    FROM t_import_staging_data
    WHERE id = p_staging_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Mark as processing
    UPDATE t_import_staging_data
    SET processing_status = 'processing'
    WHERE id = p_staging_id;
    
    v_mapped_data := v_staging.mapped_data;
    v_error_messages := ARRAY[]::TEXT[];
    
    BEGIN
        -- Check for duplicates
        v_is_duplicate := check_customer_duplicate(
            v_mapped_data->>'pan',
            v_mapped_data->>'email',
            v_mapped_data->>'mobile'
        );
        
        IF v_is_duplicate THEN
            UPDATE t_import_staging_data
            SET processing_status = 'duplicate',
                warnings = array_append(warnings, 'Customer already exists'),
                processed_at = CURRENT_TIMESTAMP
            WHERE id = p_staging_id;
            RETURN;
        END IF;
        
        -- Clean and validate prefix
        v_clean_prefix := TRIM(v_mapped_data->>'prefix');
        v_clean_prefix := REPLACE(v_clean_prefix, '.', '');
        v_clean_prefix := INITCAP(LOWER(v_clean_prefix));
        
        IF v_clean_prefix IN ('Mr', 'Mrs', 'Ms', 'Dr', 'Prof') THEN
            NULL;
        ELSIF v_clean_prefix = '' OR v_clean_prefix IS NULL THEN
            v_clean_prefix := 'Sri';
        ELSE
            v_clean_prefix := 'Sri';
        END IF;
        
        -- Create contact with cleaned prefix
        INSERT INTO t_contacts (
            tenant_id,
            is_live,
            prefix,
            name,
            is_customer,
            created_at
        ) VALUES (
            v_staging.tenant_id,
            v_staging.is_live,
            v_clean_prefix,
            v_mapped_data->>'name',
            true,
            CURRENT_TIMESTAMP
        ) RETURNING id INTO v_contact_id;
        
        -- Create contact channels (email)
        IF v_mapped_data->>'email' IS NOT NULL AND TRIM(v_mapped_data->>'email') != '' THEN
            INSERT INTO t_contact_channels (
                contact_id,
                tenant_id,
                is_live,
                channel_type,
                channel_value,
                is_primary
            ) VALUES (
                v_contact_id,
                v_staging.tenant_id,
                v_staging.is_live,
                'email',
                v_mapped_data->>'email',
                true
            );
        END IF;
        
        -- Create contact channels (mobile)
        IF v_mapped_data->>'mobile' IS NOT NULL AND TRIM(v_mapped_data->>'mobile') != '' THEN
            INSERT INTO t_contact_channels (
                contact_id,
                tenant_id,
                is_live,
                channel_type,
                channel_value,
                is_primary
            ) VALUES (
                v_contact_id,
                v_staging.tenant_id,
                v_staging.is_live,
                'mobile',
                v_mapped_data->>'mobile',
                CASE WHEN v_mapped_data->>'email' IS NULL THEN true ELSE false END
            );
        END IF;
        
        -- Handle date conversion for DD-MM-YYYY format
        v_date_of_birth := NULL;
        IF v_mapped_data->>'date_of_birth' IS NOT NULL AND TRIM(v_mapped_data->>'date_of_birth') != '' THEN
            BEGIN
                v_date_of_birth := TO_DATE(v_mapped_data->>'date_of_birth', 'DD-MM-YYYY');
            EXCEPTION WHEN OTHERS THEN
                BEGIN
                    v_date_of_birth := TO_DATE(v_mapped_data->>'date_of_birth', 'MM-DD-YYYY');
                EXCEPTION WHEN OTHERS THEN
                    BEGIN
                        v_date_of_birth := TO_DATE(v_mapped_data->>'date_of_birth', 'YYYY-MM-DD');
                    EXCEPTION WHEN OTHERS THEN
                        v_date_of_birth := NULL;
                    END;
                END;
            END;
        END IF;
        
        -- Handle anniversary date
        v_anniversary_date := NULL;
        IF v_mapped_data->>'anniversary_date' IS NOT NULL AND TRIM(v_mapped_data->>'anniversary_date') != '' THEN
            BEGIN
                v_anniversary_date := TO_DATE(v_mapped_data->>'anniversary_date', 'DD-MM-YYYY');
            EXCEPTION WHEN OTHERS THEN
                BEGIN
                    v_anniversary_date := TO_DATE(v_mapped_data->>'anniversary_date', 'MM-DD-YYYY');
                EXCEPTION WHEN OTHERS THEN
                    BEGIN
                        v_anniversary_date := TO_DATE(v_mapped_data->>'anniversary_date', 'YYYY-MM-DD');
                    EXCEPTION WHEN OTHERS THEN
                        v_anniversary_date := NULL;
                    END;
                END;
            END;
        END IF;
        
        -- Extract iwell_code (already uppercase from transformation)
        v_iwell_code := NULLIF(TRIM(v_mapped_data->>'iwell_code'), '');
        
        -- Create customer record with PLAIN TEXT fields
        INSERT INTO t_customers (
            contact_id,
            tenant_id,
            is_live,
            pan,
            iwell_code,
            date_of_birth,
            anniversary_date,
            family_head_name,
            family_head_iwell_code,
            referred_by_name,
            created_at
        ) VALUES (
            v_contact_id,
            v_staging.tenant_id,
            v_staging.is_live,
            v_mapped_data->>'pan',
            v_iwell_code,
            v_date_of_birth,
            v_anniversary_date,
            v_mapped_data->>'family_head_name',
            v_mapped_data->>'family_head_iwell_code',
            v_mapped_data->>'referred_by_name',
            CURRENT_TIMESTAMP
        ) RETURNING id INTO v_customer_id;
        
        -- Create address if provided
        IF (v_mapped_data->>'address_line1' IS NOT NULL AND TRIM(v_mapped_data->>'address_line1') != '') OR 
           (v_mapped_data->>'city' IS NOT NULL AND TRIM(v_mapped_data->>'city') != '') THEN
            INSERT INTO t_customer_addresses (
                customer_id,
                tenant_id,
                is_live,
                address_type,
                address_line1,
                address_line2,
                city,
                state,
                country,
                pincode,
                is_primary
            ) VALUES (
                v_customer_id,
                v_staging.tenant_id,
                v_staging.is_live,
                'residential',
                COALESCE(NULLIF(TRIM(v_mapped_data->>'address_line1'), ''), 'Not Provided'),
                NULLIF(TRIM(v_mapped_data->>'address_line2'), ''),
                COALESCE(NULLIF(TRIM(v_mapped_data->>'city'), ''), 'Unknown'),
                COALESCE(NULLIF(TRIM(v_mapped_data->>'state'), ''), 'Unknown'),
                COALESCE(NULLIF(TRIM(v_mapped_data->>'country'), ''), 'India'),
                COALESCE(NULLIF(TRIM(v_mapped_data->>'pincode'), ''), '000000'),
                true
            );
        END IF;
        
        -- Mark as success
        UPDATE t_import_staging_data
        SET processing_status = 'success',
            created_record_id = v_customer_id,
            created_record_type = 'customer',
            processed_at = CURRENT_TIMESTAMP
        WHERE id = p_staging_id;
        
    EXCEPTION WHEN OTHERS THEN
        -- Handle errors
        v_error_messages := array_append(v_error_messages, SQLERRM);
        
        UPDATE t_import_staging_data
        SET processing_status = 'failed',
            error_messages = v_error_messages,
            processed_at = CURRENT_TIMESTAMP
        WHERE id = p_staging_id;
        
        -- Cleanup partial records if any
        IF v_contact_id IS NOT NULL THEN
            DELETE FROM t_contacts WHERE id = v_contact_id;
        END IF;
    END;
END;
$$;

COMMENT ON FUNCTION process_single_customer_record IS 'Process single customer record from staging - uses plain text PAN/IWELL';

-- ----------------------------------------------------------------------------
-- FUNCTION: process_customer_import_with_timing
-- Description: Process customer import with controlled timing
-- Returns: JSONB with processing results
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION process_customer_import_with_timing(
    p_session_id INTEGER,
    p_target_duration_ms INTEGER DEFAULT 30000
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_session RECORD;
    v_staging_record RECORD;
    v_total_records INTEGER;
    v_records_per_batch INTEGER;
    v_delay_per_batch INTERVAL;
    v_processed_count INTEGER := 0;
    v_success_count INTEGER := 0;
    v_failed_count INTEGER := 0;
    v_duplicate_count INTEGER := 0;
    v_batch_count INTEGER := 0;
    v_start_time TIMESTAMP;
    v_result JSONB;
BEGIN
    v_start_time := CURRENT_TIMESTAMP;
    
    -- Get session details
    SELECT * INTO v_session
    FROM t_import_sessions
    WHERE id = p_session_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session % not found', p_session_id;
    END IF;
    
    -- Get total record count
    SELECT COUNT(*) INTO v_total_records
    FROM t_import_staging_data
    WHERE session_id = p_session_id
    AND processing_status = 'pending';
    
    -- Calculate batch size and delays for target duration
    v_records_per_batch := GREATEST(1, v_total_records / 10);
    v_delay_per_batch := (p_target_duration_ms / 10.0 || ' milliseconds')::INTERVAL;
    
    -- Update session to processing
    UPDATE t_import_sessions
    SET status = 'processing',
        processing_started_at = CURRENT_TIMESTAMP,
        total_records = v_total_records
    WHERE id = p_session_id;
    
    -- Process records in batches
    FOR v_staging_record IN 
        SELECT * FROM t_import_staging_data
        WHERE session_id = p_session_id
        AND processing_status = 'pending'
        ORDER BY row_number
        FOR UPDATE SKIP LOCKED
    LOOP
        -- Process individual record
        PERFORM process_single_customer_record(v_staging_record.id);
        
        -- Update counters based on result
        SELECT processing_status INTO v_staging_record
        FROM t_import_staging_data
        WHERE id = v_staging_record.id;
        
        v_processed_count := v_processed_count + 1;
        
        CASE v_staging_record.processing_status
            WHEN 'success' THEN v_success_count := v_success_count + 1;
            WHEN 'failed' THEN v_failed_count := v_failed_count + 1;
            WHEN 'duplicate' THEN v_duplicate_count := v_duplicate_count + 1;
        END CASE;
        
        -- Update progress every batch
        IF v_processed_count % v_records_per_batch = 0 OR v_processed_count = v_total_records THEN
            v_batch_count := v_batch_count + 1;
            
            UPDATE t_import_sessions
            SET processed_records = v_processed_count,
                successful_records = v_success_count,
                failed_records = v_failed_count,
                duplicate_records = v_duplicate_count,
                current_batch = v_batch_count,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = p_session_id;
            
            -- Add delay between batches (except for last batch)
            IF v_processed_count < v_total_records THEN
                PERFORM pg_sleep(EXTRACT(EPOCH FROM v_delay_per_batch));
            END IF;
        END IF;
    END LOOP;
    
    -- Final session update
    UPDATE t_import_sessions
    SET status = CASE 
            WHEN v_failed_count = 0 THEN 'completed'
            ELSE 'completed_with_errors'
        END,
        processing_completed_at = CURRENT_TIMESTAMP,
        processed_records = v_processed_count,
        successful_records = v_success_count,
        failed_records = v_failed_count,
        duplicate_records = v_duplicate_count
    WHERE id = p_session_id;
    
    -- Return summary
    v_result := jsonb_build_object(
        'sessionId', p_session_id,
        'totalProcessed', v_processed_count,
        'successful', v_success_count,
        'failed', v_failed_count,
        'duplicates', v_duplicate_count,
        'processingTime', EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - v_start_time)) * 1000,
        'status', CASE 
            WHEN v_failed_count = 0 THEN 'completed'
            ELSE 'completed_with_errors'
        END
    );
    
    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION process_customer_import_with_timing IS 'Process customer import with controlled timing for better UX';

-- ============================================================================
-- SECTION 3: SCHEME IMPORT FUNCTIONS
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Scheme Import Functions...';
END $$;

-- ----------------------------------------------------------------------------
-- FUNCTION: process_single_scheme_record
-- Description: Process a single scheme record from staging
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION process_single_scheme_record(p_staging_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_staging RECORD;
    v_mapped_data JSONB;
    v_scheme_id INTEGER;
    v_is_duplicate BOOLEAN;
    v_error_messages TEXT[];
    v_scheme_type_id INTEGER;
    v_scheme_category_id INTEGER;
    v_launch_date DATE;
    v_closure_date DATE;
    v_minimum_amount DECIMAL(15,2);
BEGIN
    -- Get staging record
    SELECT * INTO v_staging
    FROM t_import_staging_data
    WHERE id = p_staging_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Mark as processing
    UPDATE t_import_staging_data
    SET processing_status = 'processing'
    WHERE id = p_staging_id;
    
    v_mapped_data := v_staging.mapped_data;
    v_error_messages := ARRAY[]::TEXT[];
    
    BEGIN
        -- Check for duplicate by scheme_code
        SELECT COUNT(*) > 0 INTO v_is_duplicate
        FROM t_scheme_details
        WHERE scheme_code = v_mapped_data->>'scheme_code'
          AND tenant_id = v_staging.tenant_id
          AND is_live = v_staging.is_live;
        
        IF v_is_duplicate THEN
            -- Update existing scheme
            UPDATE t_scheme_details
            SET 
                amc_name = COALESCE(NULLIF(TRIM(v_mapped_data->>'amc_name'), ''), amc_name),
                scheme_name = COALESCE(NULLIF(TRIM(v_mapped_data->>'scheme_name'), ''), scheme_name),
                scheme_nav_name = COALESCE(NULLIF(TRIM(v_mapped_data->>'scheme_nav_name'), ''), scheme_nav_name),
                scheme_minimum_amount = CASE 
                    WHEN v_mapped_data->>'scheme_minimum_amount' IS NOT NULL 
                    THEN (v_mapped_data->>'scheme_minimum_amount')::DECIMAL(15,2)
                    ELSE scheme_minimum_amount 
                END,
                isin_div_payout = COALESCE(NULLIF(TRIM(v_mapped_data->>'isin_div_payout'), ''), isin_div_payout),
                isin_growth = COALESCE(NULLIF(TRIM(v_mapped_data->>'isin_growth'), ''), isin_growth),
                isin_div_reinvestment = COALESCE(NULLIF(TRIM(v_mapped_data->>'isin_div_reinvestment'), ''), isin_div_reinvestment),
                updated_at = CURRENT_TIMESTAMP
            WHERE scheme_code = v_mapped_data->>'scheme_code'
              AND tenant_id = v_staging.tenant_id
              AND is_live = v_staging.is_live
            RETURNING id INTO v_scheme_id;
            
            -- Mark as duplicate
            UPDATE t_import_staging_data
            SET processing_status = 'duplicate',
                warnings = array_append(warnings, 'Scheme already exists - updated'),
                created_record_id = v_scheme_id,
                created_record_type = 'scheme',
                processed_at = CURRENT_TIMESTAMP
            WHERE id = p_staging_id;
            
            RETURN;
        END IF;
        
        -- Get scheme_type_id if scheme_type is provided
        v_scheme_type_id := NULL;
        IF v_mapped_data->>'scheme_type' IS NOT NULL AND TRIM(v_mapped_data->>'scheme_type') != '' THEN
            SELECT id INTO v_scheme_type_id
            FROM t_scheme_masters
            WHERE LOWER(TRIM(name)) = LOWER(TRIM(v_mapped_data->>'scheme_type'))
              AND master_type = 'scheme_type'
              AND tenant_id = v_staging.tenant_id
              AND is_live = v_staging.is_live
              AND is_active = true
            LIMIT 1;
        END IF;
        
        -- Get scheme_category_id if scheme_category is provided
        v_scheme_category_id := NULL;
        IF v_mapped_data->>'scheme_category' IS NOT NULL AND TRIM(v_mapped_data->>'scheme_category') != '' THEN
            SELECT id INTO v_scheme_category_id
            FROM t_scheme_masters
            WHERE LOWER(TRIM(name)) = LOWER(TRIM(v_mapped_data->>'scheme_category'))
              AND master_type = 'scheme_category'
              AND tenant_id = v_staging.tenant_id
              AND is_live = v_staging.is_live
              AND is_active = true
            LIMIT 1;
        END IF;
        
        -- Parse launch_date
        v_launch_date := NULL;
        IF v_mapped_data->>'launch_date' IS NOT NULL AND TRIM(v_mapped_data->>'launch_date') != '' THEN
            BEGIN
                v_launch_date := TO_DATE(v_mapped_data->>'launch_date', 'YYYY-MM-DD');
            EXCEPTION WHEN OTHERS THEN
                BEGIN
                    v_launch_date := TO_DATE(v_mapped_data->>'launch_date', 'DD-MM-YYYY');
                EXCEPTION WHEN OTHERS THEN
                    BEGIN
                        v_launch_date := TO_DATE(v_mapped_data->>'launch_date', 'MM-DD-YYYY');
                    EXCEPTION WHEN OTHERS THEN
                        v_launch_date := NULL;
                    END;
                END;
            END;
        END IF;
        
        -- Parse closure_date
        v_closure_date := NULL;
        IF v_mapped_data->>'closure_date' IS NOT NULL AND TRIM(v_mapped_data->>'closure_date') != '' THEN
            BEGIN
                v_closure_date := TO_DATE(v_mapped_data->>'closure_date', 'YYYY-MM-DD');
            EXCEPTION WHEN OTHERS THEN
                BEGIN
                    v_closure_date := TO_DATE(v_mapped_data->>'closure_date', 'DD-MM-YYYY');
                EXCEPTION WHEN OTHERS THEN
                    BEGIN
                        v_closure_date := TO_DATE(v_mapped_data->>'closure_date', 'MM-DD-YYYY');
                    EXCEPTION WHEN OTHERS THEN
                        v_closure_date := NULL;
                    END;
                END;
            END;
        END IF;
        
        -- Parse minimum amount
        v_minimum_amount := NULL;
        IF v_mapped_data->>'scheme_minimum_amount' IS NOT NULL AND TRIM(v_mapped_data->>'scheme_minimum_amount') != '' THEN
            BEGIN
                v_minimum_amount := (v_mapped_data->>'scheme_minimum_amount')::DECIMAL(15,2);
            EXCEPTION WHEN OTHERS THEN
                v_minimum_amount := NULL;
            END;
        END IF;
        
        -- Create new scheme record
        INSERT INTO t_scheme_details (
            tenant_id,
            is_live,
            amc_name,
            scheme_code,
            scheme_name,
            scheme_type_id,
            scheme_category_id,
            scheme_nav_name,
            scheme_minimum_amount,
            launch_date,
            closure_date,
            isin_div_payout,
            isin_growth,
            isin_div_reinvestment,
            created_at
        ) VALUES (
            v_staging.tenant_id,
            v_staging.is_live,
            NULLIF(TRIM(v_mapped_data->>'amc_name'), ''),
            v_mapped_data->>'scheme_code',
            v_mapped_data->>'scheme_name',
            v_scheme_type_id,
            v_scheme_category_id,
            NULLIF(TRIM(v_mapped_data->>'scheme_nav_name'), ''),
            v_minimum_amount,
            v_launch_date,
            v_closure_date,
            NULLIF(TRIM(v_mapped_data->>'isin_div_payout'), ''),
            NULLIF(TRIM(v_mapped_data->>'isin_growth'), ''),
            NULLIF(TRIM(v_mapped_data->>'isin_div_reinvestment'), ''),
            CURRENT_TIMESTAMP
        ) RETURNING id INTO v_scheme_id;
        
        -- Mark as success
        UPDATE t_import_staging_data
        SET processing_status = 'success',
            created_record_id = v_scheme_id,
            created_record_type = 'scheme',
            processed_at = CURRENT_TIMESTAMP
        WHERE id = p_staging_id;
        
    EXCEPTION WHEN OTHERS THEN
        -- Handle errors
        v_error_messages := array_append(v_error_messages, SQLERRM);
        
        UPDATE t_import_staging_data
        SET processing_status = 'failed',
            error_messages = v_error_messages,
            processed_at = CURRENT_TIMESTAMP
        WHERE id = p_staging_id;
    END;
END;
$$;

COMMENT ON FUNCTION process_single_scheme_record IS 'Process single scheme record from staging';

-- ----------------------------------------------------------------------------
-- FUNCTION: process_scheme_import_with_timing
-- Description: Process scheme import with controlled timing
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION process_scheme_import_with_timing(
    p_session_id INTEGER,
    p_target_duration_ms INTEGER DEFAULT 30000
) RETURNS TABLE(
    processed_count INTEGER,
    success_count INTEGER,
    failed_count INTEGER,
    duplicate_count INTEGER,
    actual_duration_ms INTEGER
) 
LANGUAGE plpgsql
AS $$
DECLARE
    v_start_time TIMESTAMP;
    v_end_time TIMESTAMP;
    v_staging_record RECORD;
    v_processed_count INTEGER := 0;
    v_success_count INTEGER := 0;
    v_failed_count INTEGER := 0;
    v_duplicate_count INTEGER := 0;
    v_batch_size INTEGER := 100;
    v_sleep_ms INTEGER;
BEGIN
    v_start_time := clock_timestamp();
    
    -- Update session status to processing
    UPDATE t_import_sessions 
    SET status = 'processing',
        processing_started_at = v_start_time
    WHERE id = p_session_id;
    
    -- Process records in batches
    FOR v_staging_record IN 
        SELECT id, processing_status
        FROM t_import_staging_data
        WHERE session_id = p_session_id
        AND processing_status = 'pending'
        ORDER BY row_number
    LOOP
        -- Process single record
        PERFORM process_single_scheme_record(v_staging_record.id);
        
        -- Get the updated status
        SELECT processing_status INTO v_staging_record
        FROM t_import_staging_data
        WHERE id = v_staging_record.id;
        
        -- Update counters
        v_processed_count := v_processed_count + 1;
        
        CASE v_staging_record.processing_status
            WHEN 'success' THEN v_success_count := v_success_count + 1;
            WHEN 'failed' THEN v_failed_count := v_failed_count + 1;
            WHEN 'duplicate' THEN v_duplicate_count := v_duplicate_count + 1;
        END CASE;
        
        -- Check if we should sleep
        IF v_processed_count % 10 = 0 THEN
            v_end_time := clock_timestamp();
            v_sleep_ms := (p_target_duration_ms / v_batch_size) - 
                         EXTRACT(MILLISECOND FROM (v_end_time - v_start_time));
            
            IF v_sleep_ms > 0 THEN
                PERFORM pg_sleep(v_sleep_ms / 1000.0);
            END IF;
        END IF;
    END LOOP;
    
    v_end_time := clock_timestamp();
    
    -- Update session with final statistics
    UPDATE t_import_sessions 
    SET status = CASE 
            WHEN v_failed_count > 0 THEN 'completed_with_errors'
            ELSE 'completed'
        END,
        processed_records = v_processed_count,
        successful_records = v_success_count,
        failed_records = v_failed_count,
        duplicate_records = v_duplicate_count,
        processing_completed_at = v_end_time
    WHERE id = p_session_id;
    
    RETURN QUERY SELECT 
        v_processed_count,
        v_success_count,
        v_failed_count,
        v_duplicate_count,
        EXTRACT(MILLISECOND FROM (v_end_time - v_start_time))::INTEGER;
END;
$$;

COMMENT ON FUNCTION process_scheme_import_with_timing IS 'Process scheme import with controlled timing';

-- ============================================================================
-- SECTION 4: TRANSACTION IMPORT FUNCTIONS
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Transaction Import Functions...';
END $$;

-- ----------------------------------------------------------------------------
-- FUNCTION: process_transaction_import_with_timing
-- Description: Process transaction imports from staging with controlled timing
-- Target Duration: 30-45 seconds
-- NEW FUNCTION: Added for transaction import support
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION process_transaction_import_with_timing(
    p_session_id INTEGER, 
    p_target_duration_ms INTEGER DEFAULT 35000
) 
RETURNS TABLE(
    total_processed INTEGER,
    successful INTEGER, 
    failed INTEGER,
    duplicates INTEGER,
    duration_ms INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_start_time TIMESTAMP;
    v_end_time TIMESTAMP;
    v_total_rows INTEGER;
    v_processed INTEGER := 0;
    v_success INTEGER := 0;
    v_failed INTEGER := 0;
    v_duplicates INTEGER := 0;
    v_batch_size INTEGER;
    v_sleep_per_batch NUMERIC;
    v_staging_record RECORD;
    v_customer_id INTEGER;
    v_txn_type_id INTEGER;
    v_txn_type VARCHAR(20);
    v_portfolio_id INTEGER;
    v_is_duplicate BOOLEAN;
    v_error_msg TEXT;
BEGIN
    v_start_time := clock_timestamp();
    
    -- Get total rows to process
    SELECT COUNT(*) INTO v_total_rows
    FROM t_import_staging_data
    WHERE session_id = p_session_id
        AND processing_status = 'pending';
    
    -- Calculate batch size and sleep time to target duration
    IF v_total_rows > 0 THEN
        v_batch_size := GREATEST(10, v_total_rows / 20); -- Process in ~20 batches
        v_sleep_per_batch := (p_target_duration_ms / 20.0) / 1000.0; -- Sleep between batches in seconds
    ELSE
        -- No rows to process
        RETURN QUERY SELECT 0, 0, 0, 0, 0;
        RETURN;
    END IF;
    
    -- Update session status
    UPDATE t_import_sessions
    SET status = 'processing',
        processing_started_at = v_start_time,
        total_records = v_total_rows
    WHERE id = p_session_id;
    
    -- Process each staging record
    FOR v_staging_record IN
        SELECT * FROM t_import_staging_data
        WHERE session_id = p_session_id
            AND processing_status = 'pending'
        ORDER BY row_number
    LOOP
        BEGIN
            v_error_msg := NULL;
            v_is_duplicate := false;
            
            -- 1. VALIDATE CUSTOMER (by IWELL code) - PLAIN TEXT
            SELECT c.id INTO v_customer_id
            FROM t_customers c
            WHERE c.iwell_code = v_staging_record.mapped_data->>'iwell_code'
                AND c.tenant_id = v_staging_record.tenant_id
                AND c.is_live = v_staging_record.is_live
                AND c.is_active = true;
            
            IF v_customer_id IS NULL THEN
                v_error_msg := 'Customer data not found for import - IWELL code not matched';
                RAISE EXCEPTION '%', v_error_msg;
            END IF;
            
            -- 2. VALIDATE TRANSACTION TYPE
            SELECT id, txn_type INTO v_txn_type_id, v_txn_type
            FROM m_transaction_types
            WHERE UPPER(txn_code) = UPPER(v_staging_record.mapped_data->>'txn_code')
                AND is_active = true;
            
            IF v_txn_type_id IS NULL THEN
                v_error_msg := 'Invalid transaction type: ' || (v_staging_record.mapped_data->>'txn_code');
                RAISE EXCEPTION '%', v_error_msg;
            END IF;
            
            -- 3. CHECK FOR DUPLICATE
            SELECT EXISTS (
                SELECT 1 FROM t_transaction_table
                WHERE customer_id = v_customer_id
                    AND scheme_code = v_staging_record.mapped_data->>'scheme_code'
                    AND txn_date = (v_staging_record.mapped_data->>'txn_date')::DATE
                    AND total_amount = (v_staging_record.mapped_data->>'total_amount')::DECIMAL
                    AND txn_type_id = v_txn_type_id
                    AND is_active = true
            ) INTO v_is_duplicate;
            
            -- 4. CREATE/UPDATE PORTFOLIO ENTRY (if not exists)
            INSERT INTO t_customer_master_portfolio (
                tenant_id, is_live, customer_id, scheme_code, scheme_name,
                folio_no, category, sub_category, fund_name, start_date
            ) VALUES (
                v_staging_record.tenant_id,
                v_staging_record.is_live,
                v_customer_id,
                v_staging_record.mapped_data->>'scheme_code',
                v_staging_record.mapped_data->>'scheme_name',
                v_staging_record.mapped_data->>'folio_no',
                v_staging_record.mapped_data->>'category',
                v_staging_record.mapped_data->>'sub_category',
                v_staging_record.mapped_data->>'fund_name',
                (v_staging_record.mapped_data->>'txn_date')::DATE
            )
            ON CONFLICT (customer_id, scheme_code, tenant_id, is_live)
            DO NOTHING
            RETURNING id INTO v_portfolio_id;
            
            -- 5. INSERT TRANSACTION
            INSERT INTO t_transaction_table (
                tenant_id, is_live, customer_id, scheme_code, scheme_name, folio_no,
                txn_type_id, txn_date, total_amount, units, nav, stamp_duty,
                staging_record_id, import_session_id,
                is_potential_duplicate, portfolio_flag,
                duplicate_reason
            ) VALUES (
                v_staging_record.tenant_id,
                v_staging_record.is_live,
                v_customer_id,
                v_staging_record.mapped_data->>'scheme_code',
                v_staging_record.mapped_data->>'scheme_name',
                v_staging_record.mapped_data->>'folio_no',
                v_txn_type_id,
                (v_staging_record.mapped_data->>'txn_date')::DATE,
                (v_staging_record.mapped_data->>'total_amount')::DECIMAL,
                (v_staging_record.mapped_data->>'units')::DECIMAL,
                (v_staging_record.mapped_data->>'nav')::DECIMAL,
                (v_staging_record.mapped_data->>'stamp_duty')::DECIMAL,
                v_staging_record.id,
                p_session_id,
                v_is_duplicate,
                true, -- portfolio_flag defaults to true
                CASE WHEN v_is_duplicate THEN 'Duplicate transaction detected: same customer, scheme, date, amount, and type' ELSE NULL END
            );
            
            -- 6. UPDATE STAGING RECORD
            UPDATE t_import_staging_data
            SET processing_status = CASE WHEN v_is_duplicate THEN 'duplicate' ELSE 'success' END,
                processed_at = clock_timestamp(),
                created_record_type = 'transaction'
            WHERE id = v_staging_record.id;
            
            IF v_is_duplicate THEN
                v_duplicates := v_duplicates + 1;
            ELSE
                v_success := v_success + 1;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            -- Handle errors
            v_error_msg := COALESCE(v_error_msg, SQLERRM);
            
            UPDATE t_import_staging_data
            SET processing_status = 'failed',
                error_messages = ARRAY[v_error_msg],
                processed_at = clock_timestamp()
            WHERE id = v_staging_record.id;
            
            v_failed := v_failed + 1;
        END;
        
        v_processed := v_processed + 1;
        
        -- Update session progress
        IF v_processed % 10 = 0 THEN
            UPDATE t_import_sessions
            SET processed_records = v_processed,
                successful_records = v_success,
                failed_records = v_failed,
                duplicate_records = v_duplicates
            WHERE id = p_session_id;
        END IF;
        
        -- Sleep between batches to control duration
        IF v_processed % v_batch_size = 0 THEN
            PERFORM pg_sleep(v_sleep_per_batch);
        END IF;
    END LOOP;
    
    v_end_time := clock_timestamp();
    
    -- Final session update
    UPDATE t_import_sessions
    SET status = CASE 
            WHEN v_failed > 0 THEN 'completed_with_errors'
            ELSE 'completed'
        END,
        processed_records = v_processed,
        successful_records = v_success,
        failed_records = v_failed,
        duplicate_records = v_duplicates,
        processing_completed_at = v_end_time
    WHERE id = p_session_id;
    
    -- Refresh materialized view
    PERFORM refresh_portfolio_totals();
    
    RETURN QUERY SELECT 
        v_processed,
        v_success,
        v_failed,
        v_duplicates,
        EXTRACT(EPOCH FROM (v_end_time - v_start_time))::INTEGER * 1000;
END;
$$;

COMMENT ON FUNCTION process_transaction_import_with_timing IS 
'Process transaction imports from staging with controlled timing (30-45 seconds target). Uses plain text iwell_code for customer lookup.';

-- ============================================================================
-- SECTION 5: CLEANUP FUNCTIONS
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Cleanup Functions...';
END $$;

-- ----------------------------------------------------------------------------
-- FUNCTION: cleanup_old_staging_data
-- Description: Remove old staging data after retention period
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cleanup_old_staging_data(
    p_days_to_keep INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_deleted_sessions INTEGER;
    v_deleted_staging_records INTEGER;
    v_cutoff_date TIMESTAMP;
BEGIN
    v_cutoff_date := CURRENT_TIMESTAMP - (p_days_to_keep || ' days')::INTERVAL;
    
    -- Delete old staging data for completed sessions
    WITH deleted_staging AS (
        DELETE FROM t_import_staging_data
        WHERE session_id IN (
            SELECT id FROM t_import_sessions
            WHERE status IN ('completed', 'completed_with_errors', 'cancelled')
            AND processing_completed_at < v_cutoff_date
        )
        RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted_staging_records FROM deleted_staging;
    
    -- Delete old completed sessions
    WITH deleted_sessions AS (
        DELETE FROM t_import_sessions
        WHERE status IN ('completed', 'completed_with_errors', 'cancelled')
        AND processing_completed_at < v_cutoff_date
        RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted_sessions FROM deleted_sessions;
    
    -- Return summary
    RETURN jsonb_build_object(
        'deleted_sessions', v_deleted_sessions,
        'deleted_staging_records', v_deleted_staging_records,
        'cutoff_date', v_cutoff_date,
        'execution_time', CURRENT_TIMESTAMP
    );
END;
$$;

COMMENT ON FUNCTION cleanup_old_staging_data IS 'Remove staging data older than specified days';

-- ----------------------------------------------------------------------------
-- FUNCTION: cleanup_session_staging_data
-- Description: Clean up staging data immediately after successful import
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cleanup_session_staging_data(
    p_session_id INTEGER,
    p_keep_failed_records BOOLEAN DEFAULT true
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_session RECORD;
BEGIN
    -- Get session details
    SELECT * INTO v_session
    FROM t_import_sessions
    WHERE id = p_session_id;
    
    IF NOT FOUND THEN
        RAISE NOTICE 'Session % not found', p_session_id;
        RETURN;
    END IF;
    
    -- Only clean up completed sessions
    IF v_session.status NOT IN ('completed', 'completed_with_errors') THEN
        RAISE NOTICE 'Session % is not completed (status: %)', p_session_id, v_session.status;
        RETURN;
    END IF;
    
    IF p_keep_failed_records THEN
        -- Delete only successful records to save space
        DELETE FROM t_import_staging_data
        WHERE session_id = p_session_id
        AND processing_status IN ('success', 'duplicate');
    ELSE
        -- Delete all staging records for this session
        DELETE FROM t_import_staging_data
        WHERE session_id = p_session_id;
    END IF;
    
    -- Update session to indicate staging data was cleaned
    UPDATE t_import_sessions
    SET processing_metadata = COALESCE(processing_metadata, '{}'::jsonb) || 
        jsonb_build_object('staging_cleaned_at', CURRENT_TIMESTAMP)
    WHERE id = p_session_id;
END;
$$;

COMMENT ON FUNCTION cleanup_session_staging_data IS 'Clean up staging data for a completed session';

-- ----------------------------------------------------------------------------
-- FUNCTION: get_staging_storage_stats
-- Description: Get staging storage statistics
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_staging_storage_stats()
RETURNS TABLE (
    total_sessions BIGINT,
    active_sessions BIGINT,
    completed_sessions BIGINT,
    total_staging_records BIGINT,
    pending_records BIGINT,
    processed_records BIGINT,
    failed_records BIGINT,
    total_size_estimate TEXT,
    oldest_session_date TIMESTAMP,
    newest_session_date TIMESTAMP
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT s.id) as total_sessions,
        COUNT(DISTINCT s.id) FILTER (WHERE s.status IN ('pending', 'staged', 'processing')) as active_sessions,
        COUNT(DISTINCT s.id) FILTER (WHERE s.status IN ('completed', 'completed_with_errors')) as completed_sessions,
        COUNT(st.id) as total_staging_records,
        COUNT(st.id) FILTER (WHERE st.processing_status = 'pending') as pending_records,
        COUNT(st.id) FILTER (WHERE st.processing_status IN ('success', 'duplicate')) as processed_records,
        COUNT(st.id) FILTER (WHERE st.processing_status = 'failed') as failed_records,
        pg_size_pretty(
            pg_relation_size('t_import_staging_data') + 
            pg_relation_size('t_import_sessions')
        ) as total_size_estimate,
        MIN(s.created_at) as oldest_session_date,
        MAX(s.created_at) as newest_session_date
    FROM t_import_sessions s
    LEFT JOIN t_import_staging_data st ON s.id = st.session_id;
END;
$$;

COMMENT ON FUNCTION get_staging_storage_stats IS 'Get storage statistics for import staging tables';

-- ============================================================================
-- SECTION 6: VIEWS
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Views...';
END $$;

-- ----------------------------------------------------------------------------
-- VIEW: v_import_staging_statistics
-- Description: Aggregated statistics for staging table by session
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_import_staging_statistics AS
SELECT 
    session_id,
    tenant_id,
    is_live,
    import_type,
    COUNT(*) as total_rows,
    COUNT(*) FILTER (WHERE processing_status = 'pending') as pending_rows,
    COUNT(*) FILTER (WHERE processing_status = 'processing') as processing_rows,
    COUNT(*) FILTER (WHERE processing_status = 'success') as success_rows,
    COUNT(*) FILTER (WHERE processing_status = 'failed') as failed_rows,
    COUNT(*) FILTER (WHERE processing_status = 'duplicate') as duplicate_rows,
    COUNT(*) FILTER (WHERE processing_status = 'skipped') as skipped_rows,
    MIN(created_at) as staging_started_at,
    MAX(processed_at) as last_processed_at,
    ROUND(
        CAST(COUNT(*) FILTER (WHERE processing_status = 'success') AS DECIMAL) / 
        NULLIF(COUNT(*), 0) * 100, 2
    ) as success_rate
FROM t_import_staging_data
GROUP BY session_id, tenant_id, is_live, import_type;

COMMENT ON VIEW v_import_staging_statistics IS 'Aggregated statistics for staging table by session';

-- ----------------------------------------------------------------------------
-- VIEW: v_import_staging_progress
-- Description: Real-time import progress monitoring
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_import_staging_progress AS
SELECT 
    s.id as session_id,
    s.session_name,
    s.import_type,
    s.status as session_status,
    s.staging_total_rows,
    s.current_batch,
    s.total_batches,
    s.last_processed_row,
    COALESCE(st.pending_rows, 0) as pending_rows,
    COALESCE(st.processing_rows, 0) as processing_rows,
    COALESCE(st.success_rows, 0) as success_rows,
    COALESCE(st.failed_rows, 0) as failed_rows,
    CASE 
        WHEN s.staging_total_rows > 0 THEN 
            ROUND(CAST(COALESCE(st.success_rows + st.failed_rows + st.skipped_rows, 0) AS DECIMAL) / 
                  s.staging_total_rows * 100, 2)
        ELSE 0 
    END as completion_percentage,
    s.processing_started_at,
    s.staging_completed_at,
    CASE 
        WHEN s.processing_started_at IS NOT NULL AND st.processing_rows > 0 THEN
            EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - s.processing_started_at)) / 
            NULLIF(st.success_rows + st.failed_rows, 0)
        ELSE NULL
    END as avg_seconds_per_record
FROM t_import_sessions s
LEFT JOIN v_import_staging_statistics st ON s.id = st.session_id;

COMMENT ON VIEW v_import_staging_progress IS 'Real-time import progress monitoring view';

-- ----------------------------------------------------------------------------
-- VIEW: v_tenant_customer_schemes
-- Description: Identify unique schemes used across customer portfolios per tenant
-- Purpose: Compare with t_scheme_bookmarks to detect unbookmarked schemes
-- Usage: Find schemes customers use that aren't bookmarked for NAV tracking
-- NEW: Added for NAV schema refactor
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_tenant_customer_schemes AS
SELECT 
    tt.tenant_id,
    tt.is_live,
    tt.scheme_code,
    tt.scheme_name,
    COUNT(DISTINCT tt.customer_id) as customer_count,
    COUNT(*) as transaction_count,
    SUM(CASE WHEN tt.portfolio_flag = true THEN tt.total_amount ELSE 0 END) as total_invested,
    MAX(tt.txn_date) as last_transaction_date,
    MIN(tt.txn_date) as first_transaction_date
FROM t_transaction_table tt
WHERE tt.is_active = true
GROUP BY tt.tenant_id, tt.is_live, tt.scheme_code, tt.scheme_name;

COMMENT ON VIEW v_tenant_customer_schemes IS 
'Unique schemes from customer transactions - used for bookmark gap detection';

COMMENT ON COLUMN v_tenant_customer_schemes.customer_count IS 
'Number of distinct customers holding this scheme';

COMMENT ON COLUMN v_tenant_customer_schemes.transaction_count IS 
'Total transactions across all customers for this scheme';

COMMENT ON COLUMN v_tenant_customer_schemes.total_invested IS 
'Sum of amounts where portfolio_flag = true';

-- ============================================================================
-- SECTION 7: MATERIALIZED VIEW - PORTFOLIO TOTALS
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Materialized View for Portfolio Totals...';
END $$;

-- ----------------------------------------------------------------------------
-- MATERIALIZED VIEW: t_customer_portfolio_totals
-- Description: Pre-calculated portfolio totals with returns
-- NEW: Added complete materialized view for portfolio calculations
-- ----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW t_customer_portfolio_totals AS
SELECT 
    p.tenant_id,
    p.is_live,
    p.customer_id,
    p.scheme_code,
    p.scheme_name,
    p.folio_no,
    p.category,
    p.sub_category,
    p.fund_name,
    p.start_date,
    
    -- Transaction Counts
    COUNT(DISTINCT t.id) as transaction_count,
    COUNT(DISTINCT CASE WHEN tt.txn_type = 'Addition' THEN t.id END) as purchase_count,
    COUNT(DISTINCT CASE WHEN tt.txn_type = 'Deduction' THEN t.id END) as redemption_count,
    
    -- Units Totals - FIXED
    COALESCE(SUM(CASE WHEN tt.txn_type = 'Addition' THEN t.units 
                     WHEN tt.txn_type = 'Deduction' THEN -t.units 
                     ELSE 0 END), 0) as total_units,
    
    -- Investment Amount - FIXED
    COALESCE(SUM(CASE WHEN tt.txn_type = 'Addition' THEN t.total_amount ELSE 0 END), 0) - 
    COALESCE(SUM(CASE WHEN tt.txn_type = 'Deduction' THEN t.total_amount ELSE 0 END), 0) as total_invested,
    
    -- Latest NAV
    (SELECT nav FROM t_transaction_table 
     WHERE customer_id = p.customer_id 
       AND scheme_code = p.scheme_code 
       AND is_active = true 
     ORDER BY txn_date DESC 
     LIMIT 1) as latest_nav,
    
    -- Current Value - FIXED
    COALESCE(SUM(CASE WHEN tt.txn_type = 'Addition' THEN t.units 
                     WHEN tt.txn_type = 'Deduction' THEN -t.units 
                     ELSE 0 END), 0) * 
    COALESCE((SELECT nav FROM t_transaction_table 
              WHERE customer_id = p.customer_id 
                AND scheme_code = p.scheme_code 
                AND is_active = true 
              ORDER BY txn_date DESC 
              LIMIT 1), 0) as current_value,
    
    -- Total Returns - FIXED
    (COALESCE(SUM(CASE WHEN tt.txn_type = 'Addition' THEN t.units 
                      WHEN tt.txn_type = 'Deduction' THEN -t.units 
                      ELSE 0 END), 0) * 
     COALESCE((SELECT nav FROM t_transaction_table 
               WHERE customer_id = p.customer_id 
                 AND scheme_code = p.scheme_code 
                 AND is_active = true 
               ORDER BY txn_date DESC 
               LIMIT 1), 0)) - 
    (COALESCE(SUM(CASE WHEN tt.txn_type = 'Addition' THEN t.total_amount ELSE 0 END), 0) - 
     COALESCE(SUM(CASE WHEN tt.txn_type = 'Deduction' THEN t.total_amount ELSE 0 END), 0)) as total_returns,
    
    -- Return Percentage - FIXED
    CASE 
        WHEN (COALESCE(SUM(CASE WHEN tt.txn_type = 'Addition' THEN t.total_amount ELSE 0 END), 0) - 
              COALESCE(SUM(CASE WHEN tt.txn_type = 'Deduction' THEN t.total_amount ELSE 0 END), 0)) > 0
        THEN ((COALESCE(SUM(CASE WHEN tt.txn_type = 'Addition' THEN t.units 
                            WHEN tt.txn_type = 'Deduction' THEN -t.units 
                            ELSE 0 END), 0) * 
               COALESCE((SELECT nav FROM t_transaction_table 
                         WHERE customer_id = p.customer_id 
                           AND scheme_code = p.scheme_code 
                           AND is_active = true 
                         ORDER BY txn_date DESC 
                         LIMIT 1), 0)) - 
              (COALESCE(SUM(CASE WHEN tt.txn_type = 'Addition' THEN t.total_amount ELSE 0 END), 0) - 
               COALESCE(SUM(CASE WHEN tt.txn_type = 'Deduction' THEN t.total_amount ELSE 0 END), 0))) / 
              (COALESCE(SUM(CASE WHEN tt.txn_type = 'Addition' THEN t.total_amount ELSE 0 END), 0) - 
               COALESCE(SUM(CASE WHEN tt.txn_type = 'Deduction' THEN t.total_amount ELSE 0 END), 0)) * 100
        ELSE 0
    END as return_percentage,
    
    MAX(t.txn_date) as last_transaction_date,
    p.is_active,
    p.id as portfolio_id,
    NOW() as last_refreshed_at
    
FROM t_customer_master_portfolio p
LEFT JOIN t_transaction_table t ON 
    t.customer_id = p.customer_id 
    AND t.scheme_code = p.scheme_code
    AND t.tenant_id = p.tenant_id
    AND t.is_live = p.is_live
    AND t.is_active = true
    AND t.portfolio_flag = true
LEFT JOIN m_transaction_types tt ON t.txn_type_id = tt.id
WHERE p.is_active = true
GROUP BY 
    p.id, p.tenant_id, p.is_live, p.customer_id,
    p.scheme_code, p.scheme_name, p.folio_no,
    p.category, p.sub_category, p.fund_name,
    p.start_date, p.is_active;

COMMENT ON MATERIALIZED VIEW t_customer_portfolio_totals IS 'Pre-calculated portfolio totals with returns and performance metrics';

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX idx_portfolio_totals_pk 
    ON t_customer_portfolio_totals(customer_id, scheme_code, tenant_id, is_live);

-- Create additional indexes for performance
CREATE INDEX idx_portfolio_totals_customer 
    ON t_customer_portfolio_totals(customer_id);

CREATE INDEX idx_portfolio_totals_scheme 
    ON t_customer_portfolio_totals(scheme_code);

CREATE INDEX idx_portfolio_totals_tenant 
    ON t_customer_portfolio_totals(tenant_id, is_live);

CREATE INDEX idx_portfolio_totals_category 
    ON t_customer_portfolio_totals(category);

CREATE INDEX idx_portfolio_totals_value 
    ON t_customer_portfolio_totals(current_value DESC);

-- Initial population of materialized view
REFRESH MATERIALIZED VIEW t_customer_portfolio_totals;

-- ============================================================================
-- SECTION 8: MATERIALIZED VIEW REFRESH FUNCTION
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Materialized View Refresh Function...';
END $$;

-- ----------------------------------------------------------------------------
-- FUNCTION: refresh_portfolio_totals
-- Description: Refresh the portfolio totals materialized view
-- NEW FUNCTION: Added for materialized view refresh
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION refresh_portfolio_totals()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Refresh the materialized view concurrently (if possible)
    -- CONCURRENTLY allows reads during refresh but requires unique index
    REFRESH MATERIALIZED VIEW CONCURRENTLY t_customer_portfolio_totals;
    
EXCEPTION WHEN OTHERS THEN
    -- If concurrent refresh fails (e.g., no unique index), do regular refresh
    REFRESH MATERIALIZED VIEW t_customer_portfolio_totals;
END;
$$;

COMMENT ON FUNCTION refresh_portfolio_totals IS 
'Refreshes the t_customer_portfolio_totals materialized view. Attempts concurrent refresh first.';

-- ============================================================================
-- SECTION 9: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Row Level Security Policies...';
END $$;

-- Enable RLS on core tables
ALTER TABLE t_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_chat_messages ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- RLS POLICIES: Tenant Isolation
-- ----------------------------------------------------------------------------
CREATE POLICY tenant_isolation_users ON t_users
    FOR ALL
    USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_chat_sessions ON t_chat_sessions
    FOR ALL
    USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_chat_messages ON t_chat_messages
    FOR ALL
    USING (tenant_id = current_tenant_id());

-- ----------------------------------------------------------------------------
-- RLS POLICIES: Environment Filtering (Live/Test)
-- ----------------------------------------------------------------------------
CREATE POLICY environment_filter_users ON t_users
    FOR SELECT
    USING (
        CASE 
            WHEN current_environment() = 'live' THEN is_live = true
            WHEN current_environment() = 'test' THEN is_live = false
            ELSE true
        END
    );

CREATE POLICY environment_filter_chat_sessions ON t_chat_sessions
    FOR SELECT
    USING (
        CASE 
            WHEN current_environment() = 'live' THEN is_live = true
            WHEN current_environment() = 'test' THEN is_live = false
            ELSE true
        END
    );

CREATE POLICY environment_filter_chat_messages ON t_chat_messages
    FOR SELECT
    USING (
        CASE 
            WHEN current_environment() = 'live' THEN is_live = true
            WHEN current_environment() = 'test' THEN is_live = false
            ELSE true
        END
    );

COMMENT ON POLICY tenant_isolation_users ON t_users IS 'Isolate users by tenant_id';
COMMENT ON POLICY environment_filter_users ON t_users IS 'Filter users by environment (live/test)';

-- ============================================================================
-- SECTION 10: GRANT PERMISSIONS
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Granting Permissions...';
END $$;

-- Grant permissions on all tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO kewal_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO kewal_admin;

-- Grant execute on all functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO kewal_admin;

-- Grant execute on specific utility functions
GRANT EXECUTE ON FUNCTION current_tenant_id() TO kewal_admin;
GRANT EXECUTE ON FUNCTION current_environment() TO kewal_admin;

-- Grant execute on import functions
GRANT EXECUTE ON FUNCTION check_customer_duplicate TO kewal_admin;
GRANT EXECUTE ON FUNCTION process_single_customer_record TO kewal_admin;
GRANT EXECUTE ON FUNCTION process_customer_import_with_timing TO kewal_admin;
GRANT EXECUTE ON FUNCTION process_single_scheme_record TO kewal_admin;
GRANT EXECUTE ON FUNCTION process_scheme_import_with_timing TO kewal_admin;
GRANT EXECUTE ON FUNCTION process_transaction_import_with_timing TO kewal_admin;

-- Grant execute on cleanup functions
GRANT EXECUTE ON FUNCTION cleanup_old_staging_data TO kewal_admin;
GRANT EXECUTE ON FUNCTION cleanup_session_staging_data TO kewal_admin;
GRANT EXECUTE ON FUNCTION get_staging_storage_stats TO kewal_admin;

-- Grant execute on materialized view refresh function
GRANT EXECUTE ON FUNCTION refresh_portfolio_totals TO kewal_admin;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
DO $$ 
DECLARE
    v_function_count INTEGER;
    v_view_count INTEGER;
    v_policy_count INTEGER;
    v_mat_view_count INTEGER;
BEGIN
    -- Count functions
    SELECT COUNT(*) INTO v_function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public';
    
    -- Count views
    SELECT COUNT(*) INTO v_view_count
    FROM information_schema.views
    WHERE table_schema = 'public';
    
    -- Count materialized views
    SELECT COUNT(*) INTO v_mat_view_count
    FROM pg_matviews
    WHERE schemaname = 'public';
    
    -- Count policies
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Functions, Views, and Policies created!';
    RAISE NOTICE 'Total functions: %', v_function_count;
    RAISE NOTICE 'Total views: %', v_view_count;
    RAISE NOTICE 'Total materialized views: %', v_mat_view_count;
    RAISE NOTICE 'Total RLS policies: %', v_policy_count;
    RAISE NOTICE 'Updates included:';
    RAISE NOTICE '  - Added process_transaction_import_with_timing()';
    RAISE NOTICE '  - Added t_customer_portfolio_totals materialized view';
    RAISE NOTICE '  - Added refresh_portfolio_totals() function';
    RAISE NOTICE '  - Added v_tenant_customer_schemes view (NAV refactor)';
    RAISE NOTICE 'Next: Run 05_seed_data.sql';
    RAISE NOTICE '========================================';
END $$;-- ============================================================================
-- File: 05_seed_data.sql
-- Description: Seed data for transaction types and initial tenants
-- Purpose: Master data and test tenants
-- Execution: Run FIFTH (last) after 04_functions_views_policies.sql
-- Author: System
-- Date: 2025-01-08
-- Updated: 2025-01-15 (Added bookmark reasons seeding)
-- ============================================================================

-- ============================================================================
-- SECTION 1: CREATE TRANSACTION TYPES TABLE
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Creating Transaction Types Table';
    RAISE NOTICE '========================================';
END $$;

-- ----------------------------------------------------------------------------
-- TABLE: m_transaction_types
-- Description: Master data for transaction types
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m_transaction_types (
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
COMMENT ON COLUMN m_transaction_types.txn_type IS 'Addition or Deduction type';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_txn_types_updated_at ON m_transaction_types;
CREATE TRIGGER update_txn_types_updated_at 
    BEFORE UPDATE ON m_transaction_types
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_txn_types_code 
    ON m_transaction_types(txn_code);

CREATE INDEX IF NOT EXISTS idx_txn_types_active 
    ON m_transaction_types(is_active) 
    WHERE is_active = true;

-- ============================================================================
-- SECTION 2: SEED TRANSACTION TYPES
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Seeding Transaction Types';
    RAISE NOTICE '========================================';
END $$;

INSERT INTO m_transaction_types (txn_code, txn_name, txn_type, is_active, description)
VALUES
    ('SIP', 'Systematic Investment Plan', 'Addition', TRUE, 
     'Regular systematic investment contributions at fixed intervals'),
    
    ('STP-IN', 'Systematic Transfer Plan - In', 'Addition', TRUE, 
     'Systematic transfer of funds from another scheme (incoming)'),
    
    ('PURCHASE', 'One-Time Purchase', 'Addition', TRUE, 
     'Lump sum purchase or investment transaction'),
    
    ('SWITCH_IN', 'Switch In', 'Addition', TRUE, 
     'Funds received from switching from another scheme'),
    
    ('STP-OUT', 'Systematic Transfer Plan - Out', 'Deduction', TRUE, 
     'Systematic transfer of funds to another scheme (outgoing)'),
    
    ('REDEMPTION', 'Redemption', 'Deduction', TRUE, 
     'Withdrawal or redemption of invested funds'),
    
    ('SWITCH_OUT', 'Switch Out', 'Deduction', TRUE, 
     'Funds moved out by switching to another scheme'),
    
    ('SELL', 'Sell', 'Deduction', TRUE,
     'Funds sold out'),

    ('SYSTEMATIC TRANSFER OUT', 'Systematic Transfer Out', 'Deduction', TRUE,
     'Systematic transfer of funds to another scheme (outgoing) - alternate code'),

    ('SYSTEMATIC TRANSFER IN', 'Systematic Transfer In', 'Addition', TRUE,
     'Systematic transfer of funds from another scheme (incoming) - alternate code')
ON CONFLICT (txn_code) DO UPDATE 
    SET txn_name = EXCLUDED.txn_name,
        txn_type = EXCLUDED.txn_type,
        is_active = EXCLUDED.is_active,
        description = EXCLUDED.description,
        updated_at = CURRENT_TIMESTAMP;

DO $$ 
BEGIN
    RAISE NOTICE 'Transaction Types seeded: % total, % active', 
        (SELECT COUNT(*) FROM m_transaction_types),
        (SELECT COUNT(*) FROM m_transaction_types WHERE is_active = true);
END $$;

-- ============================================================================
-- SECTION 3: SEED TENANTS
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Seeding Tenants';
    RAISE NOTICE '========================================';
END $$;

-- ----------------------------------------------------------------------------
-- Insert initial tenants
-- ID 1: Primary/Production tenant
-- ID 2: Staging/UAT tenant
-- ID 3: QA/Testing tenant
-- ----------------------------------------------------------------------------
INSERT INTO t_tenants (id, tenant_name, tenant_code, is_active, created_at, updated_at)
VALUES 
    (1, 'Kewal Investments', 'KEWAL', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (2, 'Staging Environment', 'STAGING', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (3, 'QA Tenant', 'QA', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE 
    SET tenant_name = EXCLUDED.tenant_name,
        tenant_code = EXCLUDED.tenant_code,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP;

-- Reset sequence to highest ID to prevent conflicts
SELECT setval('t_tenants_id_seq', 
    (SELECT GREATEST(MAX(id), 3) FROM t_tenants), 
    true);

DO $$ 
BEGIN
    RAISE NOTICE 'Tenants seeded: % total, % active', 
        (SELECT COUNT(*) FROM t_tenants),
        (SELECT COUNT(*) FROM t_tenants WHERE is_active = true);
END $$;

-- ============================================================================
-- SECTION 4: SEED BOOKMARK REASONS
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Seeding Bookmark Reasons';
    RAISE NOTICE '========================================';
END $$;

-- ----------------------------------------------------------------------------
-- FUNCTION: seed_bookmark_reasons_for_tenant
-- Description: Reusable function to seed default bookmark reasons for any tenant
-- Parameters: 
--   p_tenant_id: Tenant ID to seed reasons for
--   p_is_live: Environment (true=live, false=test)
-- Usage: SELECT seed_bookmark_reasons_for_tenant(1, true);
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION seed_bookmark_reasons_for_tenant(
    p_tenant_id INTEGER, 
    p_is_live BOOLEAN
)
RETURNS void AS $$
BEGIN
    INSERT INTO m_bookmark_reasons (
        tenant_id, 
        is_live, 
        reason_code, 
        reason_label, 
        display_order, 
        is_active
    )
    VALUES
        (p_tenant_id, p_is_live, 'VIP', 'VIP Customer', 1, true),
        (p_tenant_id, p_is_live, 'FOLLOW_UP', 'Follow-up Required', 2, true),
        (p_tenant_id, p_is_live, 'IMPORTANT', 'Important', 3, true),
        (p_tenant_id, p_is_live, 'HIGH_VALUE', 'High Value Client', 4, true),
        (p_tenant_id, p_is_live, 'ATTENTION', 'Requires Attention', 5, true),
        (p_tenant_id, p_is_live, 'PORTFOLIO_REVIEW', 'Portfolio Review Due', 6, true),
        (p_tenant_id, p_is_live, 'TAX_PLANNING', 'Tax Planning', 7, true),
        (p_tenant_id, p_is_live, 'OTHER', 'Other (Custom)', 99, true)
    ON CONFLICT (tenant_id, is_live, reason_code) DO NOTHING;
    
    RAISE NOTICE 'Seeded bookmark reasons for tenant_id=%, is_live=%', p_tenant_id, p_is_live;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION seed_bookmark_reasons_for_tenant IS 'Seed default bookmark reasons for a tenant and environment';

-- ----------------------------------------------------------------------------
-- Seed bookmark reasons for all existing tenants (both live and test)
-- ----------------------------------------------------------------------------
DO $$ 
DECLARE
    v_tenant RECORD;
    v_total_inserted INTEGER := 0;
BEGIN
    RAISE NOTICE 'Seeding bookmark reasons for all tenants...';
    
    -- Loop through all active tenants
    FOR v_tenant IN 
        SELECT id, tenant_name, tenant_code 
        FROM t_tenants 
        WHERE is_active = true
        ORDER BY id
    LOOP
        -- Seed for LIVE environment
        PERFORM seed_bookmark_reasons_for_tenant(v_tenant.id, true);
        v_total_inserted := v_total_inserted + 8;
        
        -- Seed for TEST environment
        PERFORM seed_bookmark_reasons_for_tenant(v_tenant.id, false);
        v_total_inserted := v_total_inserted + 8;
        
        RAISE NOTICE 'Completed seeding for tenant: % (%) - Live & Test', 
            v_tenant.tenant_name, v_tenant.tenant_code;
    END LOOP;
    
    RAISE NOTICE 'Total bookmark reasons seeded: %', v_total_inserted;
    RAISE NOTICE 'Bookmark reasons per tenant: 8 (for each environment)';
END $$;

-- Verify seeding
DO $$ 
DECLARE
    v_reason_count INTEGER;
    v_tenant_count INTEGER;
    v_live_count INTEGER;
    v_test_count INTEGER;
BEGIN
    -- Count total reasons
    SELECT COUNT(*) INTO v_reason_count FROM m_bookmark_reasons;
    
    -- Count unique tenants
    SELECT COUNT(DISTINCT tenant_id) INTO v_tenant_count FROM m_bookmark_reasons;
    
    -- Count by environment
    SELECT COUNT(*) INTO v_live_count FROM m_bookmark_reasons WHERE is_live = true;
    SELECT COUNT(*) INTO v_test_count FROM m_bookmark_reasons WHERE is_live = false;
    
    RAISE NOTICE '----------------------------------------';
    RAISE NOTICE 'Bookmark Reasons Verification:';
    RAISE NOTICE '  Total reasons: %', v_reason_count;
    RAISE NOTICE '  Unique tenants: %', v_tenant_count;
    RAISE NOTICE '  Live environment: %', v_live_count;
    RAISE NOTICE '  Test environment: %', v_test_count;
    RAISE NOTICE '----------------------------------------';
END $$;

-- ============================================================================
-- SECTION 5: VERIFICATION & SUMMARY
-- ============================================================================
DO $$ 
DECLARE
    v_txn_count INTEGER;
    v_tenant_count INTEGER;
    v_active_txn INTEGER;
    v_active_tenant INTEGER;
    v_bookmark_reason_count INTEGER;
    v_bookmark_tenants INTEGER;
BEGIN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE is_active = true)
    INTO v_txn_count, v_active_txn
    FROM m_transaction_types;
    
    SELECT COUNT(*), COUNT(*) FILTER (WHERE is_active = true)
    INTO v_tenant_count, v_active_tenant
    FROM t_tenants;
    
    -- Count bookmark reasons
    SELECT COUNT(*), COUNT(DISTINCT tenant_id)
    INTO v_bookmark_reason_count, v_bookmark_tenants
    FROM m_bookmark_reasons;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '     SEED DATA SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Transaction Types:';
    RAISE NOTICE '  - Total: %', v_txn_count;
    RAISE NOTICE '  - Active: %', v_active_txn;
    RAISE NOTICE '';
    RAISE NOTICE 'Tenants:';
    RAISE NOTICE '  - Total: %', v_tenant_count;
    RAISE NOTICE '  - Active: %', v_active_tenant;
    RAISE NOTICE '';
    RAISE NOTICE 'Bookmark Reasons:';
    RAISE NOTICE '  - Total: %', v_bookmark_reason_count;
    RAISE NOTICE '  - Tenants covered: %', v_bookmark_tenants;
    RAISE NOTICE '  - Per tenant (both envs): 16';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Seed data loaded successfully!';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- END OF FILE
-- ============================================================================