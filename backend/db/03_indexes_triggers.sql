-- ============================================================================
-- File: 03_indexes_triggers.sql
-- Description: All indexes and triggers for performance and maintenance
-- Purpose: Create performance indexes and auto-update timestamp triggers
-- Execution: Run THIRD after 01_init.sql and 02_tables.sql
-- Author: System
-- Date: 2025-01-08
-- Updated: 2025-10-22 (COMPLETE REGENERATION - 100% coverage from current_schema_utf8.sql)
-- ============================================================================

-- ============================================================================
-- SECTION 1: INFORMATION & INITIALIZATION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Creating Indexes and Triggers';
    RAISE NOTICE 'Database: kewalinvest';
    RAISE NOTICE 'Complete regeneration with 100%% coverage';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- SECTION 2: PERFORMANCE INDEXES
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Creating performance indexes...';
    RAISE NOTICE 'Total indexes to create: 165';
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

-- Materialized view indexes (t_customer_portfolio_totals)
CREATE INDEX idx_portfolio_totals_customer ON t_customer_portfolio_totals USING btree (customer_id);
CREATE INDEX idx_portfolio_totals_scheme ON t_customer_portfolio_totals USING btree (scheme_code);
CREATE INDEX idx_portfolio_totals_tenant ON t_customer_portfolio_totals USING btree (tenant_id, is_live);
CREATE INDEX idx_portfolio_totals_category ON t_customer_portfolio_totals USING btree (category);
CREATE INDEX idx_portfolio_totals_value ON t_customer_portfolio_totals USING btree (current_value DESC);

-- Materialized view indexes (v_portfolio_current)
CREATE INDEX idx_portfolio_current_tenant_customer ON v_portfolio_current USING btree (tenant_id, customer_id);
CREATE INDEX idx_portfolio_current_scheme_code ON v_portfolio_current USING btree (scheme_code);

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

CREATE INDEX idx_import_sessions_tenant_type ON t_import_sessions USING btree (tenant_id, import_type, is_live);
CREATE INDEX idx_import_sessions_type ON t_import_sessions USING btree (import_type);
CREATE INDEX idx_import_sessions_status ON t_import_sessions USING btree (status);
CREATE INDEX idx_import_sessions_file ON t_import_sessions USING btree (file_upload_id);
CREATE INDEX idx_import_sessions_processing ON t_import_sessions USING btree (status)
    WHERE ((status)::text = ANY ((ARRAY['processing'::character varying, 'pending'::character varying])::text[]));
CREATE INDEX idx_import_sessions_staged ON t_import_sessions USING btree (status) WHERE ((status)::text = 'staged'::text);
CREATE INDEX idx_import_sessions_n8n_execution ON t_import_sessions USING btree (n8n_execution_id) WHERE (n8n_execution_id IS NOT NULL);
CREATE INDEX idx_sessions_cleanup ON t_import_sessions USING btree (status, processing_completed_at)
    WHERE ((status)::text = ANY ((ARRAY['completed'::character varying, 'completed_with_errors'::character varying, 'cancelled'::character varying])::text[]));

CREATE INDEX idx_staging_tenant ON t_import_staging_data USING btree (tenant_id, is_live);
CREATE INDEX idx_staging_processing_status ON t_import_staging_data USING btree (processing_status);
CREATE INDEX idx_staging_pending ON t_import_staging_data USING btree (processing_status, import_type) WHERE ((processing_status)::text = 'pending'::text);
CREATE INDEX idx_staging_session_status ON t_import_staging_data USING btree (session_id, processing_status);
CREATE INDEX idx_staging_session_processing ON t_import_staging_data USING btree (session_id)
    WHERE ((processing_status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying])::text[]));
CREATE INDEX idx_staging_view_support ON t_import_staging_data USING btree (session_id, processing_status);
CREATE INDEX idx_staging_created_record ON t_import_staging_data USING btree (created_record_type, created_record_id)
    WHERE (created_record_id IS NOT NULL);

CREATE INDEX idx_field_mappings_type ON t_import_field_mappings USING btree (tenant_id, import_type, is_live);
CREATE INDEX idx_field_mappings_active ON t_import_field_mappings USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_field_mappings_default ON t_import_field_mappings USING btree (import_type, is_default) WHERE (is_default = true);

CREATE INDEX idx_import_logs_tenant ON t_import_logs USING btree (tenant_id, is_live);
CREATE INDEX idx_import_logs_type ON t_import_logs USING btree (import_type);
CREATE INDEX idx_import_logs_file ON t_import_logs USING btree (file_upload_id);

CREATE INDEX idx_record_results_session ON t_import_record_results USING btree (import_session_id);
CREATE INDEX idx_record_results_status ON t_import_record_results USING btree (status);
CREATE INDEX idx_record_results_customer ON t_import_record_results USING btree (created_customer_id) WHERE (created_customer_id IS NOT NULL);

-- ============================================================================
-- 2.6: SCHEME & NAV INDEXES
-- ============================================================================
CREATE INDEX idx_scheme_masters_type ON t_scheme_masters USING btree (master_type);
CREATE INDEX idx_scheme_masters_active ON t_scheme_masters USING btree (master_type, is_active) WHERE (is_active = true);
CREATE INDEX idx_scheme_masters_code ON t_scheme_masters USING btree (code);

CREATE INDEX idx_scheme_details_code ON t_scheme_details USING btree (scheme_code);
CREATE INDEX idx_scheme_details_name ON t_scheme_details USING btree (scheme_name);
CREATE INDEX idx_scheme_details_amc ON t_scheme_details USING btree (amc_name);
CREATE INDEX idx_scheme_details_type ON t_scheme_details USING btree (scheme_type_id);
CREATE INDEX idx_scheme_details_category ON t_scheme_details USING btree (scheme_category_id);
CREATE INDEX idx_scheme_details_active ON t_scheme_details USING btree (tenant_id, is_active, is_live);
CREATE INDEX idx_scheme_details_nav_available ON t_scheme_details USING btree (historical_data_available, is_active)
    WHERE ((historical_data_available = true) AND (is_active = true));

CREATE INDEX idx_bookmarks_user ON t_scheme_bookmarks USING btree (user_id, tenant_id, is_live);
CREATE INDEX idx_bookmarks_scheme ON t_scheme_bookmarks USING btree (scheme_id);
CREATE INDEX idx_bookmarks_active ON t_scheme_bookmarks USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_bookmarks_daily_download ON t_scheme_bookmarks USING btree (daily_download_enabled) WHERE (daily_download_enabled = true);
CREATE INDEX idx_bookmarks_tenant_live_active ON t_scheme_bookmarks USING btree (tenant_id, is_live, is_active) WHERE (is_active = true);

CREATE INDEX idx_nav_data_scheme_date ON t_nav_data USING btree (scheme_id, nav_date DESC);
CREATE INDEX idx_nav_code_date ON t_nav_data USING btree (scheme_code, nav_date DESC);
CREATE INDEX idx_nav_data_date ON t_nav_data USING btree (nav_date DESC);
CREATE INDEX idx_nav_date ON t_nav_data USING btree (nav_date DESC);
CREATE INDEX idx_nav_scheme_date ON t_nav_data USING btree (scheme_id, nav_date DESC);
CREATE INDEX idx_nav_source ON t_nav_data USING btree (data_source);
CREATE INDEX idx_nav_data_date_range_metrics ON t_nav_data USING btree (nav_date, scheme_id, is_live) WHERE (metrics_calculated_at IS NOT NULL);
CREATE INDEX idx_nav_data_metrics_calculated ON t_nav_data USING btree (scheme_id, nav_date, metrics_calculated_at) WHERE (metrics_calculated_at IS NOT NULL);
CREATE INDEX idx_nav_data_missing_metrics ON t_nav_data USING btree (scheme_id, nav_date, is_live) WHERE (metrics_calculated_at IS NULL);
CREATE INDEX idx_nav_data_scheme_date_live ON t_nav_data USING btree (scheme_id, nav_date, is_live);
CREATE INDEX idx_nav_data_scheme_latest_metrics ON t_nav_data USING btree (scheme_id, nav_date DESC, is_live) WHERE (metrics_calculated_at IS NOT NULL);
CREATE INDEX idx_nav_data_scheme_live ON t_nav_data USING btree (scheme_id, is_live, nav_date DESC);

CREATE INDEX idx_nav_jobs_scheduled ON t_nav_download_jobs USING btree (scheduled_date);
CREATE INDEX idx_nav_jobs_status ON t_nav_download_jobs USING btree (status);
CREATE INDEX idx_nav_jobs_type ON t_nav_download_jobs USING btree (job_type);
CREATE INDEX idx_nav_jobs_pending ON t_nav_download_jobs USING btree (status, scheduled_date) WHERE ((status)::text = 'pending'::text);

CREATE INDEX idx_scheduler_configs_tenant_user ON t_nav_scheduler_configs USING btree (tenant_id, user_id, is_live);
CREATE INDEX idx_scheduler_configs_enabled ON t_nav_scheduler_configs USING btree (is_enabled) WHERE (is_enabled = true);
CREATE INDEX idx_scheduler_configs_next_execution ON t_nav_scheduler_configs USING btree (next_execution_at) WHERE (is_enabled = true);

CREATE INDEX idx_nav_schedule_executions_config_id ON t_nav_schedule_executions USING btree (scheduler_config_id);
CREATE INDEX idx_nav_schedule_executions_status ON t_nav_schedule_executions USING btree (status);
CREATE INDEX idx_nav_schedule_executions_time ON t_nav_schedule_executions USING btree (execution_time);

-- ============================================================================
-- 2.7: JTBD INDEXES
-- ============================================================================
CREATE INDEX idx_jtbd_customer ON t_jtbd_configurations USING btree (customer_id, tenant_id, is_live);
CREATE INDEX idx_jtbd_active ON t_jtbd_configurations USING btree (is_active, tenant_id, is_live);
CREATE INDEX idx_jtbd_type ON t_jtbd_configurations USING btree (jtbd_type);
CREATE INDEX idx_jtbd_priority ON t_jtbd_configurations USING btree (priority, is_active);
CREATE INDEX idx_jtbd_next_date ON t_jtbd_configurations USING btree (next_alert_date) WHERE (is_active = true);

CREATE INDEX idx_goal_alerts_goal ON t_goal_alerts USING btree (goal_id, created_at DESC);
CREATE INDEX idx_goal_alerts_unacknowledged ON t_goal_alerts USING btree (customer_id, is_acknowledged) WHERE (is_acknowledged = false);

CREATE INDEX idx_goal_snapshots_goal ON t_goal_progress_snapshots USING btree (goal_id, snapshot_date DESC);
CREATE INDEX idx_goal_snapshots_tenant ON t_goal_progress_snapshots USING btree (tenant_id, is_live);

-- ============================================================================
-- 2.8: SYSTEM LOGS INDEXES
-- ============================================================================
CREATE INDEX idx_system_logs_created_at ON t_system_logs USING btree (created_at DESC);
CREATE INDEX idx_system_logs_level ON t_system_logs USING btree (level);
CREATE INDEX idx_system_logs_level_created_at ON t_system_logs USING btree (level, created_at DESC);
CREATE INDEX idx_system_logs_source ON t_system_logs USING btree (source);
CREATE INDEX idx_system_logs_tenant_id ON t_system_logs USING btree (tenant_id);
CREATE INDEX idx_system_logs_user_id ON t_system_logs USING btree (user_id);

-- ============================================================================
-- 2.9: MARKET DATA INDEXES
-- ============================================================================
CREATE INDEX idx_market_indices_active ON t_market_indices USING btree (is_active);
CREATE INDEX idx_market_indices_category ON t_market_indices USING btree (category);
CREATE INDEX idx_market_indices_status ON t_market_indices USING btree (last_download_status);

CREATE INDEX idx_market_data_index_date ON t_market_data_records USING btree (index_id, date DESC);
CREATE INDEX idx_market_data_date ON t_market_data_records USING btree (date DESC);
CREATE INDEX idx_market_data_records_index_date ON t_market_data_records USING btree (index_id, date DESC);
CREATE INDEX idx_market_data_records_metrics_calculated_at ON t_market_data_records USING btree (metrics_calculated_at DESC);

CREATE INDEX idx_market_jobs_index ON t_market_download_jobs USING btree (index_id, created_at DESC);
CREATE INDEX idx_market_jobs_status ON t_market_download_jobs USING btree (status, created_at DESC);

CREATE INDEX idx_market_logs_index ON t_market_download_logs USING btree (index_id, created_at DESC);

-- ============================================================================
-- 2.10: CHAT INDEXES
-- ============================================================================
CREATE INDEX idx_chat_sessions_tenant ON t_chat_sessions USING btree (tenant_id, is_live);
CREATE INDEX idx_chat_sessions_user ON t_chat_sessions USING btree (user_id);
CREATE INDEX idx_chat_sessions_user_recent ON t_chat_sessions USING btree (user_id, created_at DESC);

CREATE INDEX idx_chat_messages_session ON t_chat_messages USING btree (session_id);
CREATE INDEX idx_chat_messages_session_time ON t_chat_messages USING btree (session_id, created_at);

-- ============================================================================
-- 2.11: USER PREFERENCE INDEXES
-- ============================================================================
CREATE INDEX idx_user_chart_prefs_user_index ON t_user_chart_preferences USING btree (user_id, index_id);

-- ============================================================================
-- 2.12: UNIQUE INDEXES FOR MATERIALIZED VIEWS
-- ============================================================================
-- Note: These UNIQUE indexes are required for CONCURRENT REFRESH of materialized views
CREATE UNIQUE INDEX idx_portfolio_totals_pk ON t_customer_portfolio_totals USING btree (customer_id, scheme_code, tenant_id, is_live);
CREATE UNIQUE INDEX idx_portfolio_current_unique ON v_portfolio_current USING btree (tenant_id, customer_id, scheme_code);

-- ============================================================================
-- SECTION 3: TIMESTAMP UPDATE TRIGGERS
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

CREATE TRIGGER update_nav_data_updated_at BEFORE UPDATE ON t_nav_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nav_jobs_updated_at BEFORE UPDATE ON t_nav_download_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduler_configs_updated_at BEFORE UPDATE ON t_nav_scheduler_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- JTBD triggers
CREATE TRIGGER update_jtbd_updated_at BEFORE UPDATE ON t_jtbd_configurations
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
-- SECTION 4: VERIFICATION & COMPLETION
-- ============================================================================
DO $$
DECLARE
    v_trigger_count INTEGER;
    v_index_count INTEGER;
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

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Indexes and Triggers Complete';
    RAISE NOTICE 'Triggers created: %', v_trigger_count;
    RAISE NOTICE 'Custom indexes created: %', v_index_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'COMPLETE REGENERATION with 100%% coverage';
    RAISE NOTICE 'Source: current_schema_utf8.sql';
    RAISE NOTICE 'All 165 indexes included';
    RAISE NOTICE 'All 25 triggers included';
    RAISE NOTICE 'Missing indexes from gap analysis: INCLUDED';
    RAISE NOTICE '  - idx_bookmarks_tenant_live_active';
    RAISE NOTICE '  - idx_goal_alerts_unacknowledged';
    RAISE NOTICE '  - idx_goal_snapshots_tenant';
    RAISE NOTICE '  - idx_market_data_records_index_date';
    RAISE NOTICE '  - idx_market_data_records_metrics_calculated_at';
    RAISE NOTICE '  - idx_monthly_snapshots';
    RAISE NOTICE '  - idx_nav_data_date_range_metrics';
    RAISE NOTICE '  - idx_nav_data_metrics_calculated';
    RAISE NOTICE '  - idx_nav_data_missing_metrics';
    RAISE NOTICE '  - idx_nav_data_scheme_date_live';
    RAISE NOTICE '  - idx_nav_data_scheme_latest_metrics';
    RAISE NOTICE '  - idx_nav_data_scheme_live';
    RAISE NOTICE '  - idx_scheme_details_nav_available';
    RAISE NOTICE '  - idx_tenants_is_admin';
    RAISE NOTICE '  - idx_user_chart_prefs_user_index';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Performance optimizations ready!';
    RAISE NOTICE 'Next: Run 04_functions_views_policies.sql';
    RAISE NOTICE '========================================';
END $$;
