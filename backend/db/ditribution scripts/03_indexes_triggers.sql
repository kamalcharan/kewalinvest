-- ============================================================================
-- File: 03_indexes_triggers.sql
-- Description: All indexes and triggers for performance and maintenance
-- Purpose: Create performance indexes and auto-update timestamp triggers
-- Execution: Run THIRD after 01_init.sql and 02_tables.sql
-- Author: System
-- Date: 2025-01-08
-- Updated: 2025-10-25 (Added duplicate detection indexes from migration 006)
-- ============================================================================

-- ============================================================================
-- SECTION 1: INFORMATION & INITIALIZATION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Creating Indexes and Triggers';
    RAISE NOTICE 'Database: kewalinvest';
    RAISE NOTICE 'Complete regeneration with duplicate detection';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- SECTION 1.5: TRIGGER FUNCTIONS (MOVED FROM SCRIPT 04)
-- Note: These functions must exist before creating triggers in Section 3
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Creating Trigger Functions...';
    RAISE NOTICE 'Total trigger functions: 3';
END $$;

-- Function: update_updated_at_column()
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

ALTER FUNCTION public.update_updated_at_column() OWNER TO kewal_admin;
COMMENT ON FUNCTION public.update_updated_at_column() IS 'Automatically update updated_at timestamp on row update';

-- Function: update_staging_updated_at()
CREATE OR REPLACE FUNCTION public.update_staging_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

ALTER FUNCTION public.update_staging_updated_at() OWNER TO kewal_admin;

-- Function: update_market_updated_at()
CREATE OR REPLACE FUNCTION public.update_market_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

ALTER FUNCTION public.update_market_updated_at() OWNER TO kewal_admin;

-- Function: update_scheme_alias_timestamp()
CREATE OR REPLACE FUNCTION public.update_scheme_alias_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

ALTER FUNCTION public.update_scheme_alias_timestamp() OWNER TO kewal_admin;
COMMENT ON FUNCTION public.update_scheme_alias_timestamp() IS 'Automatically update updated_at timestamp for scheme aliases';

-- Function: normalize_alias_name()
CREATE OR REPLACE FUNCTION public.normalize_alias_name() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Normalize: uppercase, trim, collapse multiple spaces into single space
    NEW.alias_name_normalized = REGEXP_REPLACE(
        TRIM(UPPER(NEW.alias_name)),
        '\s+',
        ' ',
        'g'
    );
    RETURN NEW;
END;
$$;

ALTER FUNCTION public.normalize_alias_name() OWNER TO kewal_admin;
COMMENT ON FUNCTION public.normalize_alias_name() IS 'Auto-normalize alias names for case-insensitive matching';

DO $$
BEGIN
    RAISE NOTICE '✓ Trigger functions created successfully';
END $$;

-- ============================================================================
-- SECTION 2: PERFORMANCE INDEXES
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Creating performance indexes...';
    RAISE NOTICE 'Total indexes to create: 179 (165 base + 14 duplicate detection)';
END $$;

-- ============================================================================
-- 2.1: TENANT & USER INDEXES
-- ============================================================================
CREATE INDEX idx_tenants_active ON t_tenants USING btree (is_active);
CREATE INDEX idx_tenants_code ON t_tenants USING btree (tenant_code) WHERE (is_active = true);
CREATE INDEX idx_tenants_is_admin ON t_tenants USING btree (is_admin) WHERE (is_admin = true);

CREATE INDEX idx_users_email ON t_users USING btree (email);
CREATE INDEX idx_users_tenant ON t_users USING btree (tenant_id);
CREATE INDEX idx_users_tenant_active ON t_users USING btree (tenant_id, is_active) WHERE (is_active = true);
CREATE INDEX idx_users_environment ON t_users USING btree (environment_preference, is_live);

-- ============================================================================
-- 2.2: CONTACT & CUSTOMER INDEXES
-- ============================================================================
CREATE INDEX idx_contacts_tenant ON t_contacts USING btree (tenant_id, is_live);
CREATE INDEX idx_contacts_is_customer ON t_contacts USING btree (is_customer) WHERE (is_customer = true);
CREATE INDEX idx_contacts_name ON t_contacts USING btree (name);
CREATE INDEX idx_contacts_active ON t_contacts USING btree (tenant_id, is_active, is_live);

CREATE INDEX idx_channels_contact ON t_contact_channels USING btree (contact_id);
CREATE INDEX idx_channels_email ON t_contact_channels USING btree (channel_value)
    WHERE (((channel_type)::text = 'email'::text) AND (is_active = true));
CREATE INDEX idx_channels_mobile ON t_contact_channels USING btree (channel_value)
    WHERE (((channel_type)::text = 'mobile'::text) AND (is_active = true));
CREATE INDEX idx_channels_type_value ON t_contact_channels USING btree (channel_type, channel_value);
CREATE INDEX idx_channels_primary ON t_contact_channels USING btree (contact_id, channel_type, is_primary)
    WHERE (is_primary = true);

CREATE INDEX idx_customers_tenant ON t_customers USING btree (tenant_id, is_live);
CREATE INDEX idx_customers_contact ON t_customers USING btree (contact_id);
CREATE INDEX idx_customers_active ON t_customers USING btree (tenant_id, is_active, is_live);
CREATE INDEX idx_customers_pan ON t_customers USING btree (pan)
    WHERE ((is_live = true) AND (pan IS NOT NULL));
CREATE INDEX idx_customers_iwell_code ON t_customers USING btree (iwell_code)
    WHERE ((is_live = true) AND (iwell_code IS NOT NULL));
CREATE INDEX idx_customers_dob ON t_customers USING btree (date_of_birth) WHERE (date_of_birth IS NOT NULL);
CREATE INDEX idx_customers_survival ON t_customers USING btree (survival_status) WHERE (is_active = true);
CREATE INDEX idx_customers_onboarding ON t_customers USING btree (onboarding_status) WHERE (is_active = true);
CREATE INDEX idx_customers_referred_by ON t_customers USING btree (referred_by) WHERE (referred_by IS NOT NULL);
CREATE INDEX idx_customers_jtbd_setup ON t_customers USING btree (has_jtbd_setup) WHERE (has_jtbd_setup = true);

CREATE INDEX idx_addresses_customer ON t_customer_addresses USING btree (customer_id);
CREATE INDEX idx_addresses_primary ON t_customer_addresses USING btree (customer_id, is_primary) WHERE (is_primary = true);
CREATE INDEX idx_addresses_city ON t_customer_addresses USING btree (city);
CREATE INDEX idx_addresses_pincode ON t_customer_addresses USING btree (pincode);

-- ============================================================================
-- 2.3: CUSTOMER BOOKMARKS INDEXES
-- ============================================================================
CREATE INDEX idx_customer_bookmarks_user ON t_customer_bookmarks USING btree (user_id, tenant_id, is_live, is_active);
CREATE INDEX idx_customer_bookmarks_customer ON t_customer_bookmarks USING btree (customer_id, is_active);
CREATE INDEX idx_customer_bookmarks_tenant ON t_customer_bookmarks USING btree (tenant_id, is_live, is_active);
CREATE INDEX idx_customer_bookmarks_reason ON t_customer_bookmarks USING btree (reason_id) WHERE (reason_id IS NOT NULL);
CREATE INDEX idx_customer_bookmarks_active ON t_customer_bookmarks USING btree (is_active, created_at DESC) WHERE (is_active = true);

CREATE INDEX idx_bookmark_reasons_tenant ON m_bookmark_reasons USING btree (tenant_id, is_live, is_active);
CREATE INDEX idx_bookmark_reasons_active ON m_bookmark_reasons USING btree (tenant_id, is_live, display_order) WHERE (is_active = true);
CREATE INDEX idx_bookmark_reasons_code ON m_bookmark_reasons USING btree (tenant_id, is_live, reason_code);

-- ============================================================================
-- 2.4: PORTFOLIO & TRANSACTION INDEXES
-- ============================================================================
CREATE INDEX idx_portfolio_tenant ON t_customer_master_portfolio USING btree (tenant_id, is_live);
CREATE INDEX idx_portfolio_customer ON t_customer_master_portfolio USING btree (customer_id);
CREATE INDEX idx_portfolio_scheme ON t_customer_master_portfolio USING btree (scheme_code);
CREATE INDEX idx_portfolio_folio ON t_customer_master_portfolio USING btree (folio_no);
CREATE INDEX idx_portfolio_category ON t_customer_master_portfolio USING btree (category);
CREATE INDEX idx_portfolio_fund_name ON t_customer_master_portfolio USING btree (fund_name);
CREATE INDEX idx_portfolio_active ON t_customer_master_portfolio USING btree (customer_id, is_active) WHERE (is_active = true);

-- ============================================================================
-- 2.4.1: MATERIALIZED VIEW INDEXES (CONDITIONAL)
-- Note: These views are created in 04_functions_views_policies.sql
-- We check if they exist before creating indexes
-- ============================================================================
DO $$
BEGIN
    -- Check and create indexes for t_customer_portfolio_totals
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 't_customer_portfolio_totals') THEN
        CREATE INDEX IF NOT EXISTS idx_portfolio_totals_customer ON t_customer_portfolio_totals USING btree (customer_id);
        CREATE INDEX IF NOT EXISTS idx_portfolio_totals_scheme ON t_customer_portfolio_totals USING btree (scheme_code);
        CREATE INDEX IF NOT EXISTS idx_portfolio_totals_tenant ON t_customer_portfolio_totals USING btree (tenant_id, is_live);
        CREATE INDEX IF NOT EXISTS idx_portfolio_totals_category ON t_customer_portfolio_totals USING btree (category);
        CREATE INDEX IF NOT EXISTS idx_portfolio_totals_value ON t_customer_portfolio_totals USING btree (current_value DESC);
        -- CRITICAL: Unique index required for CONCURRENT refresh
        CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_totals_pk ON t_customer_portfolio_totals USING btree (customer_id, scheme_code, tenant_id, is_live);
        RAISE NOTICE '✓ Created 6 indexes for t_customer_portfolio_totals (including unique index for concurrent refresh)';
    ELSE
        RAISE NOTICE '⊘ Skipping t_customer_portfolio_totals indexes - materialized view will be created in script 04';
    END IF;

    -- Check and create indexes for v_portfolio_current
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'v_portfolio_current') THEN
        CREATE INDEX IF NOT EXISTS idx_portfolio_current_tenant_customer ON v_portfolio_current USING btree (tenant_id, customer_id);
        CREATE INDEX IF NOT EXISTS idx_portfolio_current_scheme_code ON v_portfolio_current USING btree (scheme_code);
        -- CRITICAL: Unique index required for CONCURRENT refresh
        CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_current_unique ON v_portfolio_current USING btree (tenant_id, customer_id, scheme_code);
        RAISE NOTICE '✓ Created 3 indexes for v_portfolio_current (including unique index for concurrent refresh)';
    ELSE
        RAISE NOTICE '⊘ Skipping v_portfolio_current indexes - materialized view will be created in script 04';
    END IF;
END $$;

-- Transaction indexes
CREATE INDEX idx_transactions_tenant ON t_transaction_table USING btree (tenant_id, is_live);
CREATE INDEX idx_transactions_customer ON t_transaction_table USING btree (customer_id);
CREATE INDEX idx_transactions_scheme ON t_transaction_table USING btree (scheme_code);
CREATE INDEX idx_transactions_folio ON t_transaction_table USING btree (folio_no);
CREATE INDEX idx_transactions_date ON t_transaction_table USING btree (txn_date DESC);
CREATE INDEX idx_transactions_customer_date ON t_transaction_table USING btree (customer_id, txn_date DESC);
CREATE INDEX idx_transactions_portfolio_flag ON t_transaction_table USING btree (portfolio_flag) WHERE (portfolio_flag = true);
CREATE INDEX idx_transaction_duplicates ON t_transaction_table USING btree (is_potential_duplicate) WHERE (is_potential_duplicate = true);
CREATE INDEX idx_transaction_staging_record ON t_transaction_table USING btree (staging_record_id);
CREATE INDEX idx_transaction_import_session ON t_transaction_table USING btree (import_session_id);
CREATE INDEX idx_transaction_scheme_id ON t_transaction_table USING btree (scheme_id);

CREATE INDEX idx_txn_types_active ON m_transaction_types USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_txn_types_code ON m_transaction_types USING btree (txn_code);
CREATE INDEX idx_txn_types_type ON m_transaction_types USING btree (txn_type);

-- Monthly portfolio snapshots indexes
CREATE INDEX idx_monthly_snapshots ON t_monthly_portfolio_snapshots USING btree (tenant_id, is_live, customer_id, snapshot_month_end);

-- ============================================================================
-- 2.5: IMPORT & STAGING INDEXES
-- ============================================================================
CREATE INDEX idx_file_uploads_tenant ON t_file_uploads USING btree (tenant_id, is_live);
CREATE INDEX idx_file_uploads_type ON t_file_uploads USING btree (file_type);
CREATE INDEX idx_file_uploads_status ON t_file_uploads USING btree (processing_status);
CREATE INDEX idx_file_uploads_customer ON t_file_uploads USING btree (customer_id) WHERE (customer_id IS NOT NULL);
-- Hash-based duplicate detection (from migration_001)
CREATE INDEX IF NOT EXISTS idx_file_uploads_hash 
ON t_file_uploads(file_hash, tenant_id, is_live) 
WHERE file_hash IS NOT NULL;

COMMENT ON INDEX idx_file_uploads_hash IS 'Fast hash-based duplicate file detection';

CREATE INDEX idx_import_sessions_tenant ON t_import_sessions USING btree (tenant_id, is_live);
CREATE INDEX idx_import_sessions_upload ON t_import_sessions USING btree (file_upload_id);
CREATE INDEX idx_import_sessions_status ON t_import_sessions USING btree (status);
CREATE INDEX idx_import_sessions_created ON t_import_sessions USING btree (created_at DESC);

CREATE INDEX idx_staging_data_tenant ON t_import_staging_data USING btree (tenant_id, is_live);
CREATE INDEX idx_staging_data_session ON t_import_staging_data USING btree (session_id);
CREATE INDEX idx_staging_data_status ON t_import_staging_data USING btree (processing_status);

-- Conditional indexes for columns that may not exist
DO $$
BEGIN
    -- Check if has_errors column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 't_import_staging_data' 
        AND column_name = 'has_errors'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_staging_data_errors ON t_import_staging_data USING btree (has_errors) WHERE (has_errors = true);
        RAISE NOTICE '✓ Created index idx_staging_data_errors';
    ELSE
        RAISE NOTICE '⊘ Skipping idx_staging_data_errors - column has_errors does not exist';
    END IF;

    -- Check if is_duplicate column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 't_import_staging_data' 
        AND column_name = 'is_duplicate'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_staging_data_duplicates ON t_import_staging_data USING btree (is_duplicate) WHERE (is_duplicate = true);
        RAISE NOTICE '✓ Created index idx_staging_data_duplicates';
    ELSE
        RAISE NOTICE '⊘ Skipping idx_staging_data_duplicates - column is_duplicate does not exist';
    END IF;
END $$;

CREATE INDEX idx_field_mappings_tenant ON t_import_field_mappings USING btree (tenant_id, is_live);
CREATE INDEX idx_field_mappings_active ON t_import_field_mappings USING btree (is_active, is_default);

-- ============================================================================
-- 2.6: SCHEME & NAV DATA INDEXES
-- ============================================================================
CREATE INDEX idx_scheme_masters_tenant ON t_scheme_masters USING btree (tenant_id, is_live);
CREATE INDEX idx_scheme_masters_code ON t_scheme_masters USING btree (code);
CREATE INDEX idx_scheme_masters_type ON t_scheme_masters USING btree (master_type);
CREATE INDEX idx_scheme_masters_active ON t_scheme_masters USING btree (master_type, is_active) WHERE (is_active = true);

CREATE INDEX idx_scheme_details_tenant ON t_scheme_details USING btree (tenant_id, is_live);
CREATE INDEX idx_scheme_details_scheme_type ON t_scheme_details USING btree (scheme_type_id);
CREATE INDEX idx_scheme_details_scheme_category ON t_scheme_details USING btree (scheme_category_id);
CREATE INDEX idx_scheme_details_isin ON t_scheme_details USING btree (isin_div_payout, isin_growth, isin_div_reinvestment);
CREATE INDEX idx_scheme_details_nav_available ON t_scheme_details USING btree (scheme_code) WHERE (is_active = true);

-- t_scheme_aliases indexes
CREATE INDEX idx_scheme_aliases_lookup ON t_scheme_aliases USING btree (alias_name_normalized) WHERE (is_active = true);
CREATE INDEX idx_scheme_aliases_scheme ON t_scheme_aliases USING btree (scheme_id, is_active);
CREATE INDEX idx_scheme_aliases_active ON t_scheme_aliases USING btree (is_active, created_at DESC);

-- Performance indexes for JOINs and text search (Migration 007)
CREATE INDEX IF NOT EXISTS idx_scheme_aliases_scheme_id_active ON t_scheme_aliases USING btree (scheme_id, is_active) WHERE (is_active = true);
CREATE INDEX IF NOT EXISTS idx_scheme_aliases_alias_name_text ON t_scheme_aliases USING btree (alias_name) WHERE (is_active = true);

-- Conditional indexes for t_scheme_bookmarks (may not have scheme_code column)
DO $$
BEGIN
    -- Always create these indexes if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 't_scheme_bookmarks') THEN
        CREATE INDEX IF NOT EXISTS idx_scheme_bookmarks_tenant ON t_scheme_bookmarks USING btree (tenant_id, is_live, is_active);
        CREATE INDEX IF NOT EXISTS idx_scheme_bookmarks_user ON t_scheme_bookmarks USING btree (user_id, is_active);

        -- Performance index for text search on bookmarks (Migration 007)
        CREATE INDEX IF NOT EXISTS idx_scheme_bookmarks_search_fields ON t_scheme_bookmarks USING btree (scheme_name, scheme_code, amc_name) WHERE (is_active = true);

        -- Check if scheme_code column exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 't_scheme_bookmarks'
            AND column_name = 'scheme_code'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_scheme_bookmarks_scheme ON t_scheme_bookmarks USING btree (scheme_code);
            RAISE NOTICE '✓ Created all indexes for t_scheme_bookmarks';
        ELSE
            RAISE NOTICE '⊘ Skipping idx_scheme_bookmarks_scheme - column scheme_code does not exist';
        END IF;
    ELSE
        RAISE NOTICE '⊘ Skipping t_scheme_bookmarks indexes - table does not exist';
    END IF;
END $$;

CREATE INDEX idx_nav_data_scheme_live ON t_nav_data USING btree (scheme_code, is_live);
CREATE INDEX idx_nav_data_scheme_date_live ON t_nav_data USING btree (scheme_code, nav_date, is_live);
CREATE INDEX idx_nav_data_date_range_metrics ON t_nav_data USING btree (nav_date, metrics_calculated_at) WHERE (metrics_calculated_at IS NOT NULL);
CREATE INDEX idx_nav_data_metrics_calculated ON t_nav_data USING btree (metrics_calculated_at) WHERE (metrics_calculated_at IS NOT NULL);
CREATE INDEX idx_nav_data_missing_metrics ON t_nav_data USING btree (scheme_code, nav_date) WHERE (metrics_calculated_at IS NULL);
CREATE INDEX idx_nav_data_scheme_latest_metrics ON t_nav_data USING btree (scheme_code, nav_date DESC, metrics_calculated_at);

CREATE INDEX idx_nav_jobs_status ON t_nav_download_jobs USING btree (status);
CREATE INDEX idx_nav_jobs_scheduled ON t_nav_download_jobs USING btree (scheduled_date);
CREATE INDEX idx_nav_jobs_type ON t_nav_download_jobs USING btree (job_type);
CREATE INDEX idx_nav_jobs_pending ON t_nav_download_jobs USING btree (status, scheduled_date) WHERE ((status)::text = 'pending'::text);

CREATE INDEX idx_nav_scheduler_active ON t_nav_scheduler_configs USING btree (is_live) WHERE (is_live = true);

-- ============================================================================
-- 2.7: JTBD & GOALS INDEXES (CONDITIONAL)
-- Note: These tables may not exist in all environments
-- ============================================================================
DO $$
BEGIN
    -- t_jtbd_configurations indexes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 't_jtbd_configurations') THEN
        CREATE INDEX IF NOT EXISTS idx_jtbd_customer ON t_jtbd_configurations USING btree (customer_id);
        CREATE INDEX IF NOT EXISTS idx_jtbd_active ON t_jtbd_configurations USING btree (is_active) WHERE (is_active = true);
        RAISE NOTICE '✓ Created indexes for t_jtbd_configurations';
    ELSE
        RAISE NOTICE '⊘ Skipping t_jtbd_configurations indexes - table does not exist';
    END IF;

    -- t_customer_goals indexes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 't_customer_goals') THEN
        CREATE INDEX IF NOT EXISTS idx_goals_jtbd ON t_customer_goals USING btree (jtbd_id);
        CREATE INDEX IF NOT EXISTS idx_goals_customer ON t_customer_goals USING btree (customer_id);
        CREATE INDEX IF NOT EXISTS idx_goals_active ON t_customer_goals USING btree (is_active) WHERE (is_active = true);
        CREATE INDEX IF NOT EXISTS idx_goals_target_date ON t_customer_goals USING btree (target_date);
        CREATE INDEX IF NOT EXISTS idx_goals_priority ON t_customer_goals USING btree (priority);
        RAISE NOTICE '✓ Created indexes for t_customer_goals';
    ELSE
        RAISE NOTICE '⊘ Skipping t_customer_goals indexes - table does not exist';
    END IF;

    -- t_goal_allocations indexes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 't_goal_allocations') THEN
        CREATE INDEX IF NOT EXISTS idx_goal_allocations_goal ON t_goal_allocations USING btree (goal_id);
        CREATE INDEX IF NOT EXISTS idx_goal_allocations_portfolio ON t_goal_allocations USING btree (customer_id, scheme_code);
        RAISE NOTICE '✓ Created indexes for t_goal_allocations';
    ELSE
        RAISE NOTICE '⊘ Skipping t_goal_allocations indexes - table does not exist';
    END IF;

    -- t_goal_progress_snapshots indexes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 't_goal_progress_snapshots') THEN
        CREATE INDEX IF NOT EXISTS idx_goal_snapshots_goal ON t_goal_progress_snapshots USING btree (goal_id, snapshot_date DESC);
        CREATE INDEX IF NOT EXISTS idx_goal_snapshots_tenant ON t_goal_progress_snapshots USING btree (tenant_id, is_live, snapshot_date DESC);
        RAISE NOTICE '✓ Created indexes for t_goal_progress_snapshots';
    ELSE
        RAISE NOTICE '⊘ Skipping t_goal_progress_snapshots indexes - table does not exist';
    END IF;

    -- t_goal_alerts indexes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 't_goal_alerts') THEN
        CREATE INDEX IF NOT EXISTS idx_goal_alerts_goal ON t_goal_alerts USING btree (goal_id);
        CREATE INDEX IF NOT EXISTS idx_goal_alerts_unacknowledged ON t_goal_alerts USING btree (is_acknowledged, created_at DESC) WHERE (is_acknowledged = false);
        RAISE NOTICE '✓ Created indexes for t_goal_alerts';
    ELSE
        RAISE NOTICE '⊘ Skipping t_goal_alerts indexes - table does not exist';
    END IF;
END $$;

-- ============================================================================
-- 2.8: MARKET DATA INDEXES
-- Note: Market data tables are GLOBAL (no tenant_id/is_live)
-- ============================================================================
CREATE INDEX idx_market_indices_active ON t_market_indices USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_market_indices_category ON t_market_indices USING btree (category);
CREATE INDEX idx_market_indices_priority ON t_market_indices USING btree (priority DESC);
CREATE INDEX idx_market_indices_yahoo_symbol ON t_market_indices USING btree (yahoo_symbol);

CREATE INDEX idx_market_data_records_index_date ON t_market_data_records USING btree (index_id, date DESC);
CREATE INDEX idx_market_data_records_date ON t_market_data_records USING btree (date DESC);
CREATE INDEX idx_market_data_records_metrics_calculated_at ON t_market_data_records USING btree (metrics_calculated_at) WHERE (metrics_calculated_at IS NOT NULL);

CREATE INDEX idx_market_jobs_status ON t_market_download_jobs USING btree (status);
CREATE INDEX idx_market_jobs_index ON t_market_download_jobs USING btree (index_id);
CREATE INDEX idx_market_jobs_type ON t_market_download_jobs USING btree (job_type);
CREATE INDEX idx_market_jobs_created ON t_market_download_jobs USING btree (created_at DESC);

CREATE INDEX idx_market_scheduler_enabled ON t_market_eod_scheduler USING btree (is_enabled) WHERE (is_enabled = true);

-- ============================================================================
-- 2.9: CHAT & AI INDEXES
-- ============================================================================
CREATE INDEX idx_chat_sessions_tenant ON t_chat_sessions USING btree (tenant_id, is_live);
CREATE INDEX idx_chat_sessions_user ON t_chat_sessions USING btree (user_id);
CREATE INDEX idx_chat_sessions_created ON t_chat_sessions USING btree (created_at DESC);

CREATE INDEX idx_chat_messages_session ON t_chat_messages USING btree (session_id, created_at);
CREATE INDEX idx_chat_messages_tenant ON t_chat_messages USING btree (tenant_id, is_live);
CREATE INDEX idx_chat_messages_type ON t_chat_messages USING btree (message_type);

-- ============================================================================
-- 2.10: USER PREFERENCES INDEXES
-- ============================================================================
CREATE INDEX idx_user_chart_prefs_user ON t_user_chart_preferences USING btree (user_id);
CREATE INDEX idx_user_chart_prefs_index ON t_user_chart_preferences USING btree (index_id);
CREATE INDEX idx_user_chart_prefs_user_index ON t_user_chart_preferences USING btree (user_id, index_id);

-- ============================================================================
-- 2.11: DUPLICATE DETECTION INDEXES (NEW - Migration 006)
-- Purpose: Optimize duplicate check queries for filename, customer, and transaction detection
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Creating duplicate detection indexes...';
END $$;

-- Filename duplicate check (tenant + filename + size + created_at)
CREATE INDEX IF NOT EXISTS idx_file_uploads_duplicate_check 
ON t_file_uploads(tenant_id, is_live, original_filename, file_size, created_at DESC);

COMMENT ON INDEX idx_file_uploads_duplicate_check IS 'Optimizes filename duplicate check queries';

-- Customer PAN duplicate check (tenant-scoped, case-insensitive)
CREATE INDEX IF NOT EXISTS idx_customers_pan_upper 
ON t_customers(tenant_id, is_live, UPPER(pan))
WHERE pan IS NOT NULL AND is_active = true;

COMMENT ON INDEX idx_customers_pan_upper IS 'Optimizes customer PAN duplicate checks (tenant-scoped, case-insensitive)';

-- Email duplicate check (lowercase)
CREATE INDEX IF NOT EXISTS idx_contact_channels_email_lower 
ON t_contact_channels(channel_type, LOWER(channel_value))
WHERE channel_type = 'email' AND is_active = true;

COMMENT ON INDEX idx_contact_channels_email_lower IS 'Optimizes email duplicate checks (case-insensitive)';

-- Mobile duplicate check
CREATE INDEX IF NOT EXISTS idx_contact_channels_mobile 
ON t_contact_channels(channel_type, channel_value)
WHERE channel_type = 'mobile' AND is_active = true;

COMMENT ON INDEX idx_contact_channels_mobile IS 'Optimizes mobile duplicate checks';

-- Link contact_channels to contacts (for tenant filtering)
CREATE INDEX IF NOT EXISTS idx_contact_channels_contact_tenant 
ON t_contact_channels(contact_id, channel_type, is_active);

COMMENT ON INDEX idx_contact_channels_contact_tenant IS 'Optimizes join between contact_channels and contacts for duplicate checks';

-- Recent customers by tenant (for session duplicate check)
CREATE INDEX IF NOT EXISTS idx_customers_recent_by_tenant 
ON t_customers(tenant_id, is_live, created_at DESC, is_active);

COMMENT ON INDEX idx_customers_recent_by_tenant IS 'Optimizes session-level duplicate checks (ordered by creation date)';

-- Customer contact_id lookup
CREATE INDEX IF NOT EXISTS idx_customers_contact_id 
ON t_customers(contact_id, tenant_id, is_live, is_active);

COMMENT ON INDEX idx_customers_contact_id IS 'Optimizes customer lookup by contact_id for duplicate checks';

-- Transaction strict duplicate check (all match fields)
CREATE INDEX IF NOT EXISTS idx_transaction_strict_duplicate 
ON t_transaction_table(tenant_id, is_live, customer_id, scheme_code, txn_date, total_amount, units, nav)
WHERE is_active = true;

COMMENT ON INDEX idx_transaction_strict_duplicate IS 'Optimizes strict transaction duplicate checks (tenant-scoped)';

-- Folio_no in transaction duplicate check
CREATE INDEX IF NOT EXISTS idx_transaction_folio 
ON t_transaction_table(tenant_id, is_live, folio_no, txn_date)
WHERE folio_no IS NOT NULL AND is_active = true;

COMMENT ON INDEX idx_transaction_folio IS 'Optimizes transaction duplicate checks that include folio number';

-- Transaction potential duplicate check (partial match fields)
CREATE INDEX IF NOT EXISTS idx_transaction_potential_duplicate 
ON t_transaction_table(tenant_id, is_live, customer_id, scheme_code, txn_date, total_amount)
WHERE is_active = true;

COMMENT ON INDEX idx_transaction_potential_duplicate IS 'Optimizes potential transaction duplicate checks (tenant-scoped)';

-- Staging data session lookup
CREATE INDEX IF NOT EXISTS idx_staging_session_lookup 
ON t_import_staging_data(session_id, id);

COMMENT ON INDEX idx_staging_session_lookup IS 'Optimizes staging data lookups during duplicate checking';

-- GIN index for JSONB mapped_data (supports all JSONB operators)
CREATE INDEX IF NOT EXISTS idx_staging_mapped_data_gin 
ON t_import_staging_data USING GIN (mapped_data);

COMMENT ON INDEX idx_staging_mapped_data_gin IS 'GIN index for fast JSONB field access in duplicate checking';

DO $$
BEGIN
    RAISE NOTICE '✓ Created 14 duplicate detection indexes (13 from migration 006 + 1 hash-based from migration 001)';
END $$;

-- ============================================================================
-- JOB SCHEDULER & EXECUTION INDEXES
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Creating Job Scheduler & Execution indexes...';
END $$;

-- Portfolio snapshot config indexes
CREATE INDEX IF NOT EXISTS idx_snapshot_configs_tenant
ON t_portfolio_snapshot_configs(tenant_id, is_live);

CREATE INDEX IF NOT EXISTS idx_snapshot_configs_enabled
ON t_portfolio_snapshot_configs(is_enabled)
WHERE is_enabled = true;

CREATE INDEX IF NOT EXISTS idx_snapshot_configs_next_execution
ON t_portfolio_snapshot_configs(next_execution_at)
WHERE is_enabled = true AND next_execution_at IS NOT NULL;

-- Portfolio snapshot execution indexes
CREATE INDEX IF NOT EXISTS idx_snapshot_executions_config
ON t_portfolio_snapshot_executions(scheduler_config_id);

CREATE INDEX IF NOT EXISTS idx_snapshot_executions_tenant
ON t_portfolio_snapshot_executions(tenant_id, is_live, execution_time DESC);

CREATE INDEX IF NOT EXISTS idx_snapshot_executions_status
ON t_portfolio_snapshot_executions(status, execution_time DESC);

CREATE INDEX IF NOT EXISTS idx_snapshot_executions_month
ON t_portfolio_snapshot_executions(snapshot_month_end, tenant_id, is_live);

-- Generic job config indexes
CREATE INDEX IF NOT EXISTS idx_job_configs_tenant
ON t_job_scheduler_configs(tenant_id, is_live, job_type);

CREATE INDEX IF NOT EXISTS idx_job_configs_enabled
ON t_job_scheduler_configs(is_enabled)
WHERE is_enabled = true;

CREATE INDEX IF NOT EXISTS idx_job_configs_next_execution
ON t_job_scheduler_configs(next_execution_at)
WHERE is_enabled = true AND next_execution_at IS NOT NULL;

-- Generic job execution indexes
CREATE INDEX IF NOT EXISTS idx_job_executions_config
ON t_job_executions(scheduler_config_id);

CREATE INDEX IF NOT EXISTS idx_job_executions_tenant
ON t_job_executions(tenant_id, is_live, job_type, execution_time DESC);

CREATE INDEX IF NOT EXISTS idx_job_executions_status
ON t_job_executions(job_type, status, execution_time DESC);

-- Job types index
CREATE INDEX IF NOT EXISTS idx_job_types_active
ON m_job_types(is_active)
WHERE is_active = true;

DO $$
BEGIN
    RAISE NOTICE '✓ Created 14 job scheduler & execution indexes';
END $$;

-- ============================================================================
-- SECTION 3: TIMESTAMP UPDATE TRIGGERS
-- Note: Trigger functions are created in Section 1.5 above
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Creating updated_at timestamp triggers...';
    RAISE NOTICE 'Total triggers to create: 25';
END $$;

-- Core entity triggers
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON t_tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON t_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON t_contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON t_customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_bookmarks_updated_at BEFORE UPDATE ON t_customer_bookmarks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookmark_reasons_updated_at BEFORE UPDATE ON m_bookmark_reasons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Portfolio and transaction triggers
CREATE TRIGGER update_portfolio_updated_at BEFORE UPDATE ON t_customer_master_portfolio
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON t_transaction_table
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_txn_types_updated_at BEFORE UPDATE ON m_transaction_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Import and staging triggers
CREATE TRIGGER update_file_uploads_updated_at BEFORE UPDATE ON t_file_uploads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_import_sessions_updated_at BEFORE UPDATE ON t_import_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_staging_updated_at BEFORE UPDATE ON t_import_staging_data
    FOR EACH ROW EXECUTE FUNCTION update_staging_updated_at();

CREATE TRIGGER update_field_mappings_updated_at BEFORE UPDATE ON t_import_field_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Scheme and NAV triggers
CREATE TRIGGER update_scheme_masters_updated_at BEFORE UPDATE ON t_scheme_masters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheme_details_updated_at BEFORE UPDATE ON t_scheme_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheme_bookmarks_updated_at BEFORE UPDATE ON t_scheme_bookmarks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_update_scheme_alias_timestamp BEFORE UPDATE ON t_scheme_aliases
    FOR EACH ROW EXECUTE FUNCTION update_scheme_alias_timestamp();

CREATE TRIGGER trg_normalize_alias_name BEFORE INSERT OR UPDATE ON t_scheme_aliases
    FOR EACH ROW EXECUTE FUNCTION normalize_alias_name();

CREATE TRIGGER update_nav_data_updated_at BEFORE UPDATE ON t_nav_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nav_jobs_updated_at BEFORE UPDATE ON t_nav_download_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduler_configs_updated_at BEFORE UPDATE ON t_nav_scheduler_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- JTBD triggers (conditional - only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 't_jtbd_configurations') THEN
        CREATE TRIGGER update_jtbd_updated_at BEFORE UPDATE ON t_jtbd_configurations
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE '✓ Created trigger for t_jtbd_configurations';
    END IF;
END $$;

-- Market data triggers
CREATE TRIGGER trg_market_indices_updated_at BEFORE UPDATE ON t_market_indices
    FOR EACH ROW EXECUTE FUNCTION update_market_updated_at();

CREATE TRIGGER trg_market_data_updated_at BEFORE UPDATE ON t_market_data_records
    FOR EACH ROW EXECUTE FUNCTION update_market_updated_at();

CREATE TRIGGER trg_market_jobs_updated_at BEFORE UPDATE ON t_market_download_jobs
    FOR EACH ROW EXECUTE FUNCTION update_market_updated_at();

CREATE TRIGGER trg_market_scheduler_updated_at BEFORE UPDATE ON t_market_eod_scheduler
    FOR EACH ROW EXECUTE FUNCTION update_market_updated_at();

-- User preference triggers
CREATE TRIGGER update_user_chart_preferences_updated_at BEFORE UPDATE ON t_user_chart_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 4: VERIFICATION & COMPLETION
-- ============================================================================
DO $$
DECLARE
    v_trigger_count INTEGER;
    v_index_count INTEGER;
    v_duplicate_index_count INTEGER;
BEGIN
    -- Count triggers
    SELECT COUNT(*) INTO v_trigger_count
    FROM pg_trigger
    WHERE tgisinternal = false
    AND tgname NOT LIKE '%n8n%';

    -- Count custom indexes
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND (indexname LIKE 'idx_%' OR indexname LIKE 'trg_%');

    -- Count duplicate detection indexes
    SELECT COUNT(*) INTO v_duplicate_index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND (
        indexname LIKE '%duplicate%' 
        OR indexname IN (
            'idx_file_uploads_duplicate_check',
            'idx_file_uploads_hash',
            'idx_customers_pan_upper',
            'idx_contact_channels_email_lower',
            'idx_contact_channels_mobile',
            'idx_contact_channels_contact_tenant',
            'idx_customers_recent_by_tenant',
            'idx_customers_contact_id',
            'idx_transaction_strict_duplicate',
            'idx_transaction_folio',
            'idx_transaction_potential_duplicate',
            'idx_staging_session_lookup',
            'idx_staging_mapped_data_gin'
        )
    );

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Indexes and Triggers Complete';
    RAISE NOTICE 'Triggers created: %', v_trigger_count;
    RAISE NOTICE 'Total indexes created: %', v_index_count;
    RAISE NOTICE 'Duplicate detection indexes: %', v_duplicate_index_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration Updates Included:';
    RAISE NOTICE '  ✓ Added 14 duplicate detection indexes';
    RAISE NOTICE '    - 13 from Migration 006 (filename, PAN, email, mobile, transaction)';
    RAISE NOTICE '    - 1 from Migration 001 (file_hash for content-based detection)';
    RAISE NOTICE '  ✓ Indexes are tenant-scoped and optimized';
    RAISE NOTICE '  ✓ GIN index for JSONB mapped_data queries';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Performance optimizations ready!';
    RAISE NOTICE 'Next: Run 04_functions_views_policies.sql';
    RAISE NOTICE '========================================';
END $$;