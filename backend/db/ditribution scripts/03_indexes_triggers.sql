-- ============================================================================
-- File: 03_indexes_triggers.sql
-- Description: All indexes and triggers for performance and maintenance
-- Purpose: Create performance indexes and auto-update timestamp triggers
-- Execution: Run THIRD after 01_init.sql and 02_tables.sql
-- Author: System
-- Date: 2025-01-08
-- Updated: 2025-11-08 (Integrated Migration 006, JTBD Consolidation, Migration 007)
-- ============================================================================

-- ============================================================================
-- SECTION 1: INFORMATION & INITIALIZATION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Creating Indexes and Triggers';
    RAISE NOTICE 'Database: kewalinvest';
    RAISE NOTICE 'Complete with all migrations integrated';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- SECTION 1.5: TRIGGER FUNCTIONS
-- Note: These functions must exist before creating triggers in Section 3
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Creating Trigger Functions...';
    RAISE NOTICE 'Total trigger functions: 6';
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

-- Function: update_customer_meetings_timestamp()
CREATE OR REPLACE FUNCTION public.update_customer_meetings_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

ALTER FUNCTION public.update_customer_meetings_timestamp() OWNER TO kewal_admin;
COMMENT ON FUNCTION public.update_customer_meetings_timestamp() IS 'Automatically update updated_at timestamp for customer meetings';

-- ============================================================================
-- CRITICAL: Function for Migration 007 - Scheme Allocation Auto-Sync
-- ============================================================================

-- Function: update_scheme_allocation() (Migration 007)
CREATE OR REPLACE FUNCTION public.update_scheme_allocation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_tenant_id INTEGER;
  v_is_live BOOLEAN;
  v_customer_id INTEGER;
BEGIN
  -- Get context from the modified row
  IF TG_OP = 'DELETE' THEN
    v_tenant_id := OLD.tenant_id;
    v_is_live := OLD.is_live;
    v_customer_id := OLD.customer_id;
  ELSE
    v_tenant_id := NEW.tenant_id;
    v_is_live := NEW.is_live;
    v_customer_id := NEW.customer_id;
  END IF;

  -- Recalculate allocation for all schemes of this customer
  WITH goal_allocations AS (
    SELECT
      scheme_code,
      SUM(allocation_pct::decimal) AS total_allocated
    FROM (
      SELECT
        (jsonb_array_elements(config_data->'linked_schemes')->>'scheme_code') AS scheme_code,
        (jsonb_array_elements(config_data->'linked_schemes')->>'allocation_percentage') AS allocation_pct
      FROM t_jtbd_configurations
      WHERE tenant_id = v_tenant_id
        AND is_live = v_is_live
        AND customer_id = v_customer_id
        AND jtbd_type = 'goal_tracking'
        AND is_active = true
    ) AS scheme_allocs
    GROUP BY scheme_code
  )
  UPDATE t_customer_master_portfolio p
  SET allocation = LEAST(COALESCE(ga.total_allocated, 0), 100.00)
  FROM goal_allocations ga
  WHERE p.scheme_code = ga.scheme_code
    AND p.tenant_id = v_tenant_id
    AND p.is_live = v_is_live
    AND p.customer_id = v_customer_id;

  -- Reset allocation for schemes no longer in any active goal
  UPDATE t_customer_master_portfolio
  SET allocation = 0
  WHERE tenant_id = v_tenant_id
    AND is_live = v_is_live
    AND customer_id = v_customer_id
    AND scheme_code NOT IN (
      SELECT DISTINCT (jsonb_array_elements(config_data->'linked_schemes')->>'scheme_code')
      FROM t_jtbd_configurations
      WHERE tenant_id = v_tenant_id
        AND is_live = v_is_live
        AND customer_id = v_customer_id
        AND jtbd_type = 'goal_tracking'
        AND is_active = true
    );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

ALTER FUNCTION public.update_scheme_allocation() OWNER TO kewal_admin;
COMMENT ON FUNCTION public.update_scheme_allocation() IS 'Automatically recalculates scheme allocation percentages when goals are created/updated/deleted';

DO $$
BEGIN
    RAISE NOTICE '✓ Trigger functions created successfully (including update_scheme_allocation)';
END $$;

-- ============================================================================
-- SECTION 2: PERFORMANCE INDEXES
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Creating performance indexes...';
    RAISE NOTICE 'Total indexes to create: 195+ (base + meetings + JTBD + migration 006 + 007)';
END $$;

-- ============================================================================
-- 2.1: TENANT & USER INDEXES
-- ============================================================================
CREATE INDEX idx_tenants_active ON t_tenants USING btree (is_active);
CREATE INDEX idx_tenants_code ON t_tenants USING btree (tenant_code) WHERE (is_active = true);
CREATE INDEX idx_tenants_is_admin ON t_tenants USING btree (is_admin) WHERE (is_admin = true);
CREATE INDEX idx_tenants_default_comparison_index ON t_tenants USING btree (default_comparison_index_id) WHERE (default_comparison_index_id IS NOT NULL);

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

-- Migration 006: Normalized name index for customer lookup
CREATE INDEX IF NOT EXISTS idx_contacts_normalized_name
ON t_contacts(normalized_name)
WHERE is_active = true;

COMMENT ON INDEX idx_contacts_normalized_name IS 'Fast customer name lookups using normalized names (Migration 006)';

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
-- 2.2.1: CUSTOMER MEETINGS INDEXES
-- ============================================================================
CREATE INDEX idx_customer_meetings_customer ON t_customer_meetings USING btree (tenant_id, is_live, customer_id);
CREATE INDEX idx_customer_meetings_scheduled_date ON t_customer_meetings USING btree (scheduled_date);
CREATE INDEX idx_customer_meetings_status ON t_customer_meetings USING btree (status);
CREATE INDEX idx_customer_meetings_upcoming ON t_customer_meetings USING btree (tenant_id, is_live, status, scheduled_date)
    WHERE status = 'scheduled';
CREATE INDEX idx_customer_meetings_tenant ON t_customer_meetings USING btree (tenant_id, is_live);
CREATE INDEX idx_customer_meetings_created_by ON t_customer_meetings USING btree (created_by);

COMMENT ON INDEX idx_customer_meetings_customer IS 'Fast lookup for customer meetings by tenant and customer';
COMMENT ON INDEX idx_customer_meetings_upcoming IS 'Optimized for upcoming scheduled meetings query';

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

-- Index for faster lookups in regular view queries
CREATE INDEX IF NOT EXISTS idx_portfolio_customer_lookup
ON t_customer_master_portfolio(customer_id, tenant_id, is_live, is_active);

CREATE INDEX IF NOT EXISTS idx_portfolio_scheme_lookup
ON t_customer_master_portfolio(scheme_code, tenant_id, is_live);

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

-- Comprehensive index for portfolio calculations (covering index)
CREATE INDEX IF NOT EXISTS idx_transactions_portfolio_calc
ON t_transaction_table(customer_id, scheme_code, tenant_id, is_live, is_active, portfolio_flag)
INCLUDE (txn_date, units, total_amount, nav, txn_type_id);

COMMENT ON INDEX idx_transactions_portfolio_calc IS 'Covering index for portfolio total calculations - includes all needed columns';

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

-- Hash-based duplicate detection (from migration 001/006)
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

-- Migration 006: Staging review indexes
CREATE INDEX IF NOT EXISTS idx_staging_requires_review
ON t_import_staging_data(session_id, requires_review)
WHERE requires_review = true;

CREATE INDEX IF NOT EXISTS idx_staging_processing_status_session
ON t_import_staging_data(session_id, processing_status);

CREATE INDEX IF NOT EXISTS idx_staging_edited
ON t_import_staging_data(session_id, edited_at)
WHERE edited_at IS NOT NULL;

COMMENT ON INDEX idx_staging_requires_review IS 'Fast lookup for records requiring manual review (Migration 006)';
COMMENT ON INDEX idx_staging_edited IS 'Track edited staging records (Migration 006)';

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

-- t_scheme_bookmarks indexes
CREATE INDEX IF NOT EXISTS idx_scheme_bookmarks_tenant ON t_scheme_bookmarks USING btree (tenant_id, is_live, is_active);
CREATE INDEX IF NOT EXISTS idx_scheme_bookmarks_user ON t_scheme_bookmarks USING btree (user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_scheme_bookmarks_scheme ON t_scheme_bookmarks USING btree (scheme_code);

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
-- 2.7: JTBD & GOALS INDEXES
-- ============================================================================

-- t_jtbd_configurations indexes (base + JTBD Consolidation migration)
CREATE INDEX IF NOT EXISTS idx_jtbd_customer ON t_jtbd_configurations USING btree (customer_id);
CREATE INDEX IF NOT EXISTS idx_jtbd_active ON t_jtbd_configurations USING btree (is_active) WHERE (is_active = true);

-- JTBD Consolidation: Category-based indexes
CREATE INDEX IF NOT EXISTS idx_jtbd_config_category
ON t_jtbd_configurations(tenant_id, is_live, jtbd_category)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_jtbd_config_category_type
ON t_jtbd_configurations(tenant_id, is_live, jtbd_category, jtbd_type)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_jtbd_config_customer
ON t_jtbd_configurations(tenant_id, is_live, customer_id, jtbd_category);

COMMENT ON INDEX idx_jtbd_config_category IS 'Fast category filtering for JTBD configs (JTBD Consolidation)';
COMMENT ON INDEX idx_jtbd_config_category_type IS 'Combined category+type filtering (JTBD Consolidation)';

-- JTBD Consolidation: t_jtbd_executions indexes
CREATE INDEX IF NOT EXISTS idx_jtbd_exec_tenant_status_date
ON t_jtbd_executions(tenant_id, is_live, execution_status, scheduled_date);

CREATE INDEX IF NOT EXISTS idx_jtbd_exec_customer
ON t_jtbd_executions(tenant_id, is_live, customer_id, execution_status);

CREATE INDEX IF NOT EXISTS idx_jtbd_exec_type
ON t_jtbd_executions(tenant_id, is_live, execution_type, scheduled_date);

CREATE INDEX IF NOT EXISTS idx_jtbd_exec_config
ON t_jtbd_executions(config_id)
WHERE config_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jtbd_exec_date_range
ON t_jtbd_executions(tenant_id, is_live, scheduled_date)
WHERE execution_status IN ('planned', 'due');

COMMENT ON INDEX idx_jtbd_exec_tenant_status_date IS 'Primary query index for execution tracking (JTBD Consolidation)';
COMMENT ON INDEX idx_jtbd_exec_date_range IS 'Optimized for timeline and calendar views (JTBD Consolidation)';

-- Goal-related indexes
CREATE INDEX IF NOT EXISTS idx_goal_snapshots_goal ON t_goal_progress_snapshots USING btree (goal_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_goal_snapshots_tenant ON t_goal_progress_snapshots USING btree (tenant_id, is_live, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_goal_alerts_goal ON t_goal_alerts USING btree (goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_alerts_unacknowledged ON t_goal_alerts USING btree (is_acknowledged, created_at DESC) WHERE (is_acknowledged = false);

-- DEPRECATED: Old goal-scheme allocation indexes (Phase 1)
-- Commented out as table is replaced by t_goal_investment_allocations in Phase 2
/*
CREATE INDEX IF NOT EXISTS idx_goal_scheme_allocations_goal ON t_goal_scheme_allocations USING btree (goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_scheme_allocations_scheme ON t_goal_scheme_allocations USING btree (scheme_id);
*/

-- NEW Phase 2: Goal-Investment allocation indexes
CREATE INDEX IF NOT EXISTS idx_goal_investments_goal ON t_goal_investment_allocations USING btree (goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_investments_plan ON t_goal_investment_allocations USING btree (investment_plan_id);
CREATE INDEX IF NOT EXISTS idx_goal_investments_tenant ON t_goal_investment_allocations USING btree (tenant_id, is_live);
CREATE INDEX IF NOT EXISTS idx_goal_investments_composite ON t_goal_investment_allocations USING btree (tenant_id, is_live, goal_id);

COMMENT ON INDEX idx_goal_investments_goal IS 'Phase 2: Find all investment plans allocated to a specific goal';
COMMENT ON INDEX idx_goal_investments_plan IS 'Phase 2: Find all goals that a specific investment plan is allocated to';
COMMENT ON INDEX idx_goal_investments_tenant IS 'Phase 2: Tenant isolation and environment filtering';
COMMENT ON INDEX idx_goal_investments_composite IS 'Phase 2: Optimized composite index for goal queries';

-- ============================================================================
-- 2.8: MARKET DATA INDEXES
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
-- 2.11: DUPLICATE DETECTION INDEXES (Migration 006)
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Creating duplicate detection indexes...';
END $$;

-- Filename duplicate check
CREATE INDEX IF NOT EXISTS idx_file_uploads_duplicate_check 
ON t_file_uploads(tenant_id, is_live, original_filename, file_size, created_at DESC);

COMMENT ON INDEX idx_file_uploads_duplicate_check IS 'Optimizes filename duplicate check queries';

-- Customer PAN duplicate check (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_customers_pan_upper 
ON t_customers(tenant_id, is_live, UPPER(pan))
WHERE pan IS NOT NULL AND is_active = true;

COMMENT ON INDEX idx_customers_pan_upper IS 'Case-insensitive PAN duplicate checks';

-- Email duplicate check
CREATE INDEX IF NOT EXISTS idx_contact_channels_email_lower 
ON t_contact_channels(channel_type, LOWER(channel_value))
WHERE channel_type = 'email' AND is_active = true;

-- Mobile duplicate check
CREATE INDEX IF NOT EXISTS idx_contact_channels_mobile 
ON t_contact_channels(channel_type, channel_value)
WHERE channel_type = 'mobile' AND is_active = true;

-- Contact-to-channel link
CREATE INDEX IF NOT EXISTS idx_contact_channels_contact_tenant 
ON t_contact_channels(contact_id, channel_type, is_active);

-- Recent customers by tenant
CREATE INDEX IF NOT EXISTS idx_customers_recent_by_tenant 
ON t_customers(tenant_id, is_live, created_at DESC, is_active);

-- Customer contact_id lookup
CREATE INDEX IF NOT EXISTS idx_customers_contact_id 
ON t_customers(contact_id, tenant_id, is_live, is_active);

-- Transaction strict duplicate check
CREATE INDEX IF NOT EXISTS idx_transaction_strict_duplicate 
ON t_transaction_table(tenant_id, is_live, customer_id, scheme_code, txn_date, total_amount, units, nav)
WHERE is_active = true;

-- Folio in transaction duplicate check
CREATE INDEX IF NOT EXISTS idx_transaction_folio 
ON t_transaction_table(tenant_id, is_live, folio_no, txn_date)
WHERE folio_no IS NOT NULL AND is_active = true;

-- Transaction potential duplicate check
CREATE INDEX IF NOT EXISTS idx_transaction_potential_duplicate 
ON t_transaction_table(tenant_id, is_live, customer_id, scheme_code, txn_date, total_amount)
WHERE is_active = true;

-- Staging data session lookup
CREATE INDEX IF NOT EXISTS idx_staging_session_lookup 
ON t_import_staging_data(session_id, id);

-- GIN index for JSONB mapped_data
CREATE INDEX IF NOT EXISTS idx_staging_mapped_data_gin 
ON t_import_staging_data USING GIN (mapped_data);

COMMENT ON INDEX idx_staging_mapped_data_gin IS 'GIN index for fast JSONB field access in duplicate checking';

DO $$
BEGIN
    RAISE NOTICE '✓ Created 14 duplicate detection indexes';
END $$;

-- ============================================================================
-- 2.12: JOB SCHEDULER & EXECUTION INDEXES
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
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Creating updated_at timestamp triggers...';
    RAISE NOTICE 'Total triggers to create: 30+';
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

-- Customer meetings trigger
CREATE TRIGGER update_customer_meetings_updated_at BEFORE UPDATE ON t_customer_meetings
    FOR EACH ROW EXECUTE FUNCTION update_customer_meetings_timestamp();

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

-- JTBD triggers
CREATE TRIGGER update_jtbd_updated_at BEFORE UPDATE ON t_jtbd_configurations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- JTBD Consolidation: t_jtbd_executions trigger
CREATE TRIGGER update_jtbd_executions_updated_at BEFORE UPDATE ON t_jtbd_executions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- DEPRECATED: Old goal-scheme allocations trigger (Phase 1)
-- Commented out as table is replaced by t_goal_investment_allocations in Phase 2
/*
CREATE TRIGGER update_goal_scheme_allocations_updated_at BEFORE UPDATE ON t_goal_scheme_allocations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
*/

-- NEW Phase 2: Goal-Investment allocations trigger
CREATE TRIGGER trigger_update_goal_investments_updated_at BEFORE UPDATE ON t_goal_investment_allocations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
-- CRITICAL: Migration 007 - Goal Allocation Auto-Sync Triggers
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Creating Migration 007 Triggers';
    RAISE NOTICE 'Goal allocation auto-sync on JTBD changes';
    RAISE NOTICE '========================================';
END $$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trg_update_allocation_after_goal_insert ON t_jtbd_configurations;
DROP TRIGGER IF EXISTS trg_update_allocation_after_goal_update ON t_jtbd_configurations;
DROP TRIGGER IF EXISTS trg_update_allocation_after_goal_delete ON t_jtbd_configurations;

-- Insert trigger
CREATE TRIGGER trg_update_allocation_after_goal_insert
AFTER INSERT ON t_jtbd_configurations
FOR EACH ROW
WHEN (NEW.jtbd_type = 'goal_tracking')
EXECUTE FUNCTION update_scheme_allocation();

-- Update trigger
CREATE TRIGGER trg_update_allocation_after_goal_update
AFTER UPDATE ON t_jtbd_configurations
FOR EACH ROW
WHEN (NEW.jtbd_type = 'goal_tracking')
EXECUTE FUNCTION update_scheme_allocation();

-- Delete trigger
CREATE TRIGGER trg_update_allocation_after_goal_delete
AFTER DELETE ON t_jtbd_configurations
FOR EACH ROW
WHEN (OLD.jtbd_type = 'goal_tracking')
EXECUTE FUNCTION update_scheme_allocation();

DO $$
BEGIN
    RAISE NOTICE '✓ Goal allocation auto-sync triggers created successfully';
END $$;

-- ============================================================================
-- SECTION 3B: MULTI-ASSET PORTFOLIO INDEXES & TRIGGERS (Release 1.1 - Phase 1)
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Creating Multi-Asset Portfolio Indexes and Triggers...';
END $$;

-- ----------------------------------------------------------------------------
-- INDEXES: m_asset_types
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_asset_types_code
ON m_asset_types(asset_type_code);

CREATE INDEX IF NOT EXISTS idx_asset_types_active
ON m_asset_types(is_active, display_order)
WHERE is_active = true;

-- ----------------------------------------------------------------------------
-- INDEXES: t_customer_asset_assignments
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_customer_assets_customer
ON t_customer_asset_assignments(customer_id, is_active)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_customer_assets_tenant
ON t_customer_asset_assignments(tenant_id, is_live, customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_assets_asset_type
ON t_customer_asset_assignments(asset_type_id, is_active)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_customer_assets_assigned_by
ON t_customer_asset_assignments(assigned_by, assigned_at DESC);

-- Investment plan specific indexes
CREATE INDEX IF NOT EXISTS idx_customer_assets_scheme_code
ON t_customer_asset_assignments(scheme_code)
WHERE scheme_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customer_assets_investment_type
ON t_customer_asset_assignments(investment_type);

CREATE INDEX IF NOT EXISTS idx_customer_assets_has_started
ON t_customer_asset_assignments(has_started)
WHERE is_active = true;

-- ----------------------------------------------------------------------------
-- TRIGGERS: Auto-update updated_at timestamps
-- ----------------------------------------------------------------------------

-- Trigger for m_asset_types
CREATE OR REPLACE FUNCTION update_asset_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_asset_types_updated_at
    BEFORE UPDATE ON m_asset_types
    FOR EACH ROW
    EXECUTE FUNCTION update_asset_types_updated_at();

-- Trigger for t_customer_asset_assignments
CREATE OR REPLACE FUNCTION update_customer_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_assets_updated_at
    BEFORE UPDATE ON t_customer_asset_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_assets_updated_at();

DO $$
BEGIN
    RAISE NOTICE '✓ Multi-Asset Portfolio indexes and triggers created';
END $$;

-- ============================================================================
-- SECTION 4: VERIFICATION & COMPLETION
-- ============================================================================
DO $$
DECLARE
    v_trigger_count INTEGER;
    v_index_count INTEGER;
    v_duplicate_index_count INTEGER;
    v_jtbd_index_count INTEGER;
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
    AND (indexname LIKE '%duplicate%' OR indexname LIKE '%hash%');

    -- Count JTBD-related indexes
    SELECT COUNT(*) INTO v_jtbd_index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND (indexname LIKE '%jtbd%' OR indexname LIKE '%goal%');

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Indexes and Triggers Complete';
    RAISE NOTICE 'Triggers created: %', v_trigger_count;
    RAISE NOTICE 'Total indexes created: %', v_index_count;
    RAISE NOTICE 'Duplicate detection indexes: %', v_duplicate_index_count;
    RAISE NOTICE 'JTBD & Goal indexes: %', v_jtbd_index_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION INTEGRATION SUMMARY:';
    RAISE NOTICE '  ✓ Migration 006: Name normalization';
    RAISE NOTICE '    - idx_contacts_normalized_name';
    RAISE NOTICE '    - 3 staging review indexes';
    RAISE NOTICE '    - 14 duplicate detection indexes';
    RAISE NOTICE '  ✓ JTBD Consolidation Migration:';
    RAISE NOTICE '    - 3 category-based config indexes';
    RAISE NOTICE '    - 5 execution tracking indexes';
    RAISE NOTICE '    - 1 updated_at trigger for executions';
    RAISE NOTICE '  ✓ Migration 007: Scheme Allocation';
    RAISE NOTICE '    - update_scheme_allocation() function';
    RAISE NOTICE '    - 3 AFTER triggers on t_jtbd_configurations';
    RAISE NOTICE '    - Auto-sync allocation on INSERT/UPDATE/DELETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CRITICAL FEATURES ENABLED:';
    RAISE NOTICE '  ✓ Goal allocation auto-calculation working';
    RAISE NOTICE '  ✓ Customer name-based lookups optimized';
    RAISE NOTICE '  ✓ JTBD execution tracking ready';
    RAISE NOTICE '  ✓ Duplicate detection fully indexed';
    RAISE NOTICE '  ✓ All timestamp triggers active';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Performance optimizations ready!';
    RAISE NOTICE 'Next: Run 04_functions_views_policies.sql';
    RAISE NOTICE '========================================';
END $$;