-- ============================================================================
-- File: 03_indexes_triggers.sql
-- Description: All indexes and triggers for performance and maintenance
-- Purpose: Create performance indexes and auto-update timestamp triggers
-- Execution: Run THIRD after 01_init.sql and 02_tables.sql
-- Author: System
-- Date: 2025-01-08
-- Updated: 2025-10-22 (Synced with live database schema - current_schema.sql)
-- ============================================================================

-- ============================================================================
-- SECTION 1: INFORMATION & INITIALIZATION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Creating Indexes and Triggers';
    RAISE NOTICE 'Database: kewalinvest';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- SECTION 2: TRIGGER FUNCTIONS
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Creating trigger functions...';
END $$;

-- ----------------------------------------------------------------------------
-- FUNCTION: update_updated_at_column
-- Description: Generic trigger function to update updated_at timestamp
-- Usage: Attached to tables via triggers
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column IS 'Auto-update updated_at column on row modification';

-- ----------------------------------------------------------------------------
-- FUNCTION: update_staging_updated_at
-- Description: Specialized trigger function for staging table updates
-- Usage: Attached to t_import_staging_data table
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_staging_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_staging_updated_at IS 'Auto-update updated_at for staging records';

-- ----------------------------------------------------------------------------
-- FUNCTION: update_market_updated_at
-- Description: Specialized trigger function for market data updates
-- Usage: Attached to market data tables
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_market_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_market_updated_at IS 'Auto-update updated_at for market data records';

-- ============================================================================
-- SECTION 3: TIMESTAMP UPDATE TRIGGERS
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Creating updated_at timestamp triggers...';
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

CREATE TRIGGER update_monthly_snapshots_updated_at BEFORE UPDATE ON t_monthly_portfolio_snapshots
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
CREATE TRIGGER update_user_chart_prefs_updated_at BEFORE UPDATE ON t_user_chart_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 4: PERFORMANCE INDEXES
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Creating performance indexes...';
END $$;

-- ============================================================================
-- 4.1: TENANT & USER INDEXES
-- ============================================================================
CREATE INDEX idx_tenants_active ON t_tenants(is_active);
CREATE INDEX idx_tenants_code ON t_tenants(tenant_code) WHERE (is_active = true);

CREATE INDEX idx_users_email ON t_users(email);
CREATE INDEX idx_users_tenant ON t_users(tenant_id);
CREATE INDEX idx_users_tenant_active ON t_users(tenant_id, is_active) WHERE (is_active = true);
CREATE INDEX idx_users_environment ON t_users(environment_preference, is_live);

-- ============================================================================
-- 4.2: CONTACT & CUSTOMER INDEXES
-- ============================================================================
CREATE INDEX idx_contacts_tenant ON t_contacts(tenant_id, is_live);
CREATE INDEX idx_contacts_is_customer ON t_contacts(is_customer) WHERE (is_customer = true);
CREATE INDEX idx_contacts_name ON t_contacts(name);
CREATE INDEX idx_contacts_active ON t_contacts(tenant_id, is_active, is_live);

CREATE INDEX idx_channels_contact ON t_contact_channels(contact_id);
CREATE INDEX idx_channels_email ON t_contact_channels(channel_value)
    WHERE (channel_type = 'email' AND is_active = true);
CREATE INDEX idx_channels_mobile ON t_contact_channels(channel_value)
    WHERE (channel_type = 'mobile' AND is_active = true);
CREATE INDEX idx_channels_type_value ON t_contact_channels(channel_type, channel_value);
CREATE INDEX idx_channels_primary ON t_contact_channels(contact_id, channel_type, is_primary)
    WHERE (is_primary = true);

CREATE INDEX idx_customers_tenant ON t_customers(tenant_id, is_live);
CREATE INDEX idx_customers_contact ON t_customers(contact_id);
CREATE INDEX idx_customers_active ON t_customers(tenant_id, is_active, is_live);
CREATE INDEX idx_customers_pan ON t_customers(pan)
    WHERE (is_live = true AND pan IS NOT NULL);
CREATE INDEX idx_customers_iwell_code ON t_customers(iwell_code)
    WHERE (is_live = true AND iwell_code IS NOT NULL);
CREATE INDEX idx_customers_dob ON t_customers(date_of_birth) WHERE (date_of_birth IS NOT NULL);
CREATE INDEX idx_customers_survival ON t_customers(survival_status) WHERE (is_active = true);
CREATE INDEX idx_customers_onboarding ON t_customers(onboarding_status) WHERE (is_active = true);
CREATE INDEX idx_customers_referred_by ON t_customers(referred_by) WHERE (referred_by IS NOT NULL);
CREATE INDEX idx_customers_jtbd_setup ON t_customers(has_jtbd_setup) WHERE (has_jtbd_setup = true);

CREATE INDEX idx_addresses_customer ON t_customer_addresses(customer_id);
CREATE INDEX idx_addresses_primary ON t_customer_addresses(customer_id, is_primary) WHERE (is_primary = true);
CREATE INDEX idx_addresses_city ON t_customer_addresses(city);
CREATE INDEX idx_addresses_pincode ON t_customer_addresses(pincode);

-- ============================================================================
-- 4.3: CUSTOMER BOOKMARKS INDEXES
-- ============================================================================
CREATE INDEX idx_customer_bookmarks_user ON t_customer_bookmarks(user_id, tenant_id, is_live, is_active);
CREATE INDEX idx_customer_bookmarks_customer ON t_customer_bookmarks(customer_id, is_active);
CREATE INDEX idx_customer_bookmarks_tenant ON t_customer_bookmarks(tenant_id, is_live, is_active);
CREATE INDEX idx_customer_bookmarks_reason ON t_customer_bookmarks(reason_id) WHERE (reason_id IS NOT NULL);
CREATE INDEX idx_customer_bookmarks_active ON t_customer_bookmarks(is_active, created_at DESC) WHERE (is_active = true);

CREATE INDEX idx_bookmark_reasons_tenant ON m_bookmark_reasons(tenant_id, is_live, is_active);
CREATE INDEX idx_bookmark_reasons_active ON m_bookmark_reasons(tenant_id, is_live, display_order) WHERE (is_active = true);
CREATE INDEX idx_bookmark_reasons_code ON m_bookmark_reasons(tenant_id, is_live, reason_code);

-- ============================================================================
-- 4.4: PORTFOLIO & TRANSACTION INDEXES
-- ============================================================================
CREATE INDEX idx_portfolio_tenant ON t_customer_master_portfolio(tenant_id, is_live);
CREATE INDEX idx_portfolio_customer ON t_customer_master_portfolio(customer_id);
CREATE INDEX idx_portfolio_scheme ON t_customer_master_portfolio(scheme_code);
CREATE INDEX idx_portfolio_folio ON t_customer_master_portfolio(folio_no);
CREATE INDEX idx_portfolio_category ON t_customer_master_portfolio(category);
CREATE INDEX idx_portfolio_fund_name ON t_customer_master_portfolio(fund_name);
CREATE INDEX idx_portfolio_active ON t_customer_master_portfolio(customer_id, is_active) WHERE (is_active = true);

-- Materialized view indexes
CREATE UNIQUE INDEX idx_portfolio_totals_pk ON t_customer_portfolio_totals(customer_id, scheme_code, tenant_id, is_live);
CREATE INDEX idx_portfolio_totals_customer ON t_customer_portfolio_totals(customer_id);
CREATE INDEX idx_portfolio_totals_scheme ON t_customer_portfolio_totals(scheme_code);
CREATE INDEX idx_portfolio_totals_tenant ON t_customer_portfolio_totals(tenant_id, is_live);
CREATE INDEX idx_portfolio_totals_category ON t_customer_portfolio_totals(category);
CREATE INDEX idx_portfolio_totals_value ON t_customer_portfolio_totals(current_value DESC);

-- Portfolio current view indexes
CREATE INDEX idx_portfolio_current_tenant_customer ON v_portfolio_current(tenant_id, customer_id);
CREATE INDEX idx_portfolio_current_scheme_code ON v_portfolio_current(scheme_code);
CREATE UNIQUE INDEX idx_portfolio_current_unique ON v_portfolio_current(tenant_id, customer_id, scheme_code);

-- Transaction indexes
CREATE INDEX idx_transactions_tenant ON t_transaction_table(tenant_id, is_live);
CREATE INDEX idx_transactions_customer ON t_transaction_table(customer_id);
CREATE INDEX idx_transactions_scheme ON t_transaction_table(scheme_code);
CREATE INDEX idx_transactions_folio ON t_transaction_table(folio_no);
CREATE INDEX idx_transactions_date ON t_transaction_table(txn_date DESC);
CREATE INDEX idx_transactions_customer_date ON t_transaction_table(customer_id, txn_date DESC);
CREATE INDEX idx_transactions_portfolio_flag ON t_transaction_table(portfolio_flag) WHERE (portfolio_flag = true);
CREATE INDEX idx_transaction_duplicates ON t_transaction_table(is_potential_duplicate) WHERE (is_potential_duplicate = true);
CREATE INDEX idx_transaction_staging_record ON t_transaction_table(staging_record_id);
CREATE INDEX idx_transaction_import_session ON t_transaction_table(import_session_id);
CREATE INDEX idx_transaction_scheme_id ON t_transaction_table(scheme_id);

CREATE INDEX idx_txn_types_active ON m_transaction_types(is_active) WHERE (is_active = true);
CREATE INDEX idx_txn_types_code ON m_transaction_types(txn_code);
CREATE INDEX idx_txn_types_type ON m_transaction_types(txn_type);

-- Monthly portfolio snapshots indexes
CREATE INDEX idx_monthly_snapshots_customer ON t_monthly_portfolio_snapshots(customer_id, snapshot_month_end DESC);
CREATE INDEX idx_monthly_snapshots_tenant ON t_monthly_portfolio_snapshots(tenant_id, is_live);
CREATE INDEX idx_monthly_snapshots_date ON t_monthly_portfolio_snapshots(snapshot_month_end DESC);
CREATE UNIQUE INDEX idx_monthly_snapshots_unique ON t_monthly_portfolio_snapshots(tenant_id, is_live, customer_id, snapshot_month_end);

-- ============================================================================
-- 4.5: IMPORT & STAGING INDEXES
-- ============================================================================
CREATE INDEX idx_file_uploads_tenant ON t_file_uploads(tenant_id, is_live);
CREATE INDEX idx_file_uploads_type ON t_file_uploads(file_type);
CREATE INDEX idx_file_uploads_status ON t_file_uploads(processing_status);
CREATE INDEX idx_file_uploads_customer ON t_file_uploads(customer_id) WHERE (customer_id IS NOT NULL);

CREATE INDEX idx_import_sessions_tenant_type ON t_import_sessions(tenant_id, import_type, is_live);
CREATE INDEX idx_import_sessions_type ON t_import_sessions(import_type);
CREATE INDEX idx_import_sessions_status ON t_import_sessions(status);
CREATE INDEX idx_import_sessions_file ON t_import_sessions(file_upload_id);
CREATE INDEX idx_import_sessions_processing ON t_import_sessions(status)
    WHERE (status IN ('processing', 'pending'));
CREATE INDEX idx_import_sessions_staged ON t_import_sessions(status) WHERE (status = 'staged');
CREATE INDEX idx_import_sessions_n8n_execution ON t_import_sessions(n8n_execution_id) WHERE (n8n_execution_id IS NOT NULL);
CREATE INDEX idx_sessions_cleanup ON t_import_sessions(status, processing_completed_at)
    WHERE (status IN ('completed', 'completed_with_errors', 'cancelled'));

CREATE INDEX idx_staging_tenant ON t_import_staging_data(tenant_id, is_live);
CREATE INDEX idx_staging_processing_status ON t_import_staging_data(processing_status);
CREATE INDEX idx_staging_pending ON t_import_staging_data(processing_status, import_type) WHERE (processing_status = 'pending');
CREATE INDEX idx_staging_session_status ON t_import_staging_data(session_id, processing_status);
CREATE INDEX idx_staging_session_processing ON t_import_staging_data(session_id)
    WHERE (processing_status IN ('pending', 'processing'));
CREATE INDEX idx_staging_view_support ON t_import_staging_data(session_id, processing_status);
CREATE INDEX idx_staging_created_record ON t_import_staging_data(created_record_type, created_record_id)
    WHERE (created_record_id IS NOT NULL);

CREATE INDEX idx_field_mappings_type ON t_import_field_mappings(tenant_id, import_type, is_live);
CREATE INDEX idx_field_mappings_active ON t_import_field_mappings(is_active) WHERE (is_active = true);
CREATE INDEX idx_field_mappings_default ON t_import_field_mappings(import_type, is_default) WHERE (is_default = true);

CREATE INDEX idx_import_logs_tenant ON t_import_logs(tenant_id, is_live);
CREATE INDEX idx_import_logs_type ON t_import_logs(import_type);
CREATE INDEX idx_import_logs_file ON t_import_logs(file_upload_id);

CREATE INDEX idx_record_results_session ON t_import_record_results(import_session_id);
CREATE INDEX idx_record_results_status ON t_import_record_results(status);
CREATE INDEX idx_record_results_customer ON t_import_record_results(created_customer_id) WHERE (created_customer_id IS NOT NULL);

-- ============================================================================
-- 4.6: SCHEME & NAV INDEXES
-- ============================================================================
CREATE INDEX idx_scheme_masters_type ON t_scheme_masters(master_type);
CREATE INDEX idx_scheme_masters_active ON t_scheme_masters(master_type, is_active) WHERE (is_active = true);
CREATE INDEX idx_scheme_masters_code ON t_scheme_masters(code);

CREATE INDEX idx_scheme_details_code ON t_scheme_details(scheme_code);
CREATE INDEX idx_scheme_details_name ON t_scheme_details(scheme_name);
CREATE INDEX idx_scheme_details_amc ON t_scheme_details(amc_name);
CREATE INDEX idx_scheme_details_type ON t_scheme_details(scheme_type_id);
CREATE INDEX idx_scheme_details_category ON t_scheme_details(scheme_category_id);
CREATE INDEX idx_scheme_details_active ON t_scheme_details(tenant_id, is_active, is_live);

CREATE INDEX idx_bookmarks_user ON t_scheme_bookmarks(user_id, tenant_id, is_live);
CREATE INDEX idx_bookmarks_scheme ON t_scheme_bookmarks(scheme_id);
CREATE INDEX idx_bookmarks_active ON t_scheme_bookmarks(is_active) WHERE (is_active = true);
CREATE INDEX idx_bookmarks_daily_download ON t_scheme_bookmarks(daily_download_enabled) WHERE (daily_download_enabled = true);

CREATE INDEX idx_nav_data_scheme_date ON t_nav_data(scheme_id, nav_date DESC);
CREATE INDEX idx_nav_code_date ON t_nav_data(scheme_code, nav_date DESC);
CREATE INDEX idx_nav_data_date ON t_nav_data(nav_date DESC);
CREATE INDEX idx_nav_date ON t_nav_data(nav_date DESC);
CREATE INDEX idx_nav_scheme_date ON t_nav_data(scheme_id, nav_date DESC);
CREATE INDEX idx_nav_source ON t_nav_data(data_source);

CREATE INDEX idx_nav_jobs_scheduled ON t_nav_download_jobs(scheduled_date);
CREATE INDEX idx_nav_jobs_status ON t_nav_download_jobs(status);
CREATE INDEX idx_nav_jobs_type ON t_nav_download_jobs(job_type);
CREATE INDEX idx_nav_jobs_pending ON t_nav_download_jobs(status, scheduled_date) WHERE (status = 'pending');

CREATE INDEX idx_scheduler_configs_tenant_user ON t_nav_scheduler_configs(tenant_id, user_id, is_live);
CREATE INDEX idx_scheduler_configs_enabled ON t_nav_scheduler_configs(is_enabled) WHERE (is_enabled = true);
CREATE INDEX idx_scheduler_configs_next_execution ON t_nav_scheduler_configs(next_execution_at) WHERE (is_enabled = true);

CREATE INDEX idx_nav_schedule_executions_config_id ON t_nav_schedule_executions(scheduler_config_id);
CREATE INDEX idx_nav_schedule_executions_status ON t_nav_schedule_executions(status);
CREATE INDEX idx_nav_schedule_executions_time ON t_nav_schedule_executions(execution_time);

-- ============================================================================
-- 4.7: JTBD INDEXES
-- ============================================================================
CREATE INDEX idx_jtbd_customer ON t_jtbd_configurations(customer_id, tenant_id, is_live);
CREATE INDEX idx_jtbd_active ON t_jtbd_configurations(is_active, tenant_id, is_live);
CREATE INDEX idx_jtbd_type ON t_jtbd_configurations(jtbd_type);
CREATE INDEX idx_jtbd_priority ON t_jtbd_configurations(priority, is_active);
CREATE INDEX idx_jtbd_next_date ON t_jtbd_configurations(next_alert_date) WHERE (is_active = true);

CREATE INDEX idx_goal_alerts_goal ON t_goal_alerts(goal_id);
CREATE INDEX idx_goal_alerts_customer ON t_goal_alerts(customer_id);
CREATE INDEX idx_goal_alerts_tenant ON t_goal_alerts(tenant_id, is_live);
CREATE INDEX idx_goal_alerts_acknowledged ON t_goal_alerts(is_acknowledged) WHERE (is_acknowledged = false);

CREATE INDEX idx_goal_snapshots_goal ON t_goal_progress_snapshots(goal_id, snapshot_date DESC);
CREATE INDEX idx_goal_snapshots_date ON t_goal_progress_snapshots(snapshot_date DESC);

-- ============================================================================
-- 4.8: SYSTEM LOGS INDEXES
-- ============================================================================
CREATE INDEX idx_system_logs_created_at ON t_system_logs(created_at DESC);
CREATE INDEX idx_system_logs_level ON t_system_logs(level);
CREATE INDEX idx_system_logs_level_created_at ON t_system_logs(level, created_at DESC);
CREATE INDEX idx_system_logs_source ON t_system_logs(source);
CREATE INDEX idx_system_logs_tenant_id ON t_system_logs(tenant_id);
CREATE INDEX idx_system_logs_user_id ON t_system_logs(user_id);

-- ============================================================================
-- 4.9: MARKET DATA INDEXES
-- ============================================================================
CREATE INDEX idx_market_indices_active ON t_market_indices(is_active);
CREATE INDEX idx_market_indices_category ON t_market_indices(category);
CREATE INDEX idx_market_indices_status ON t_market_indices(last_download_status);

CREATE INDEX idx_market_data_index_date ON t_market_data_records(index_id, date DESC);
CREATE INDEX idx_market_data_date ON t_market_data_records(date DESC);

CREATE INDEX idx_market_jobs_index ON t_market_download_jobs(index_id, created_at DESC);
CREATE INDEX idx_market_jobs_status ON t_market_download_jobs(status, created_at DESC);

CREATE INDEX idx_market_logs_index ON t_market_download_logs(index_id, created_at DESC);

-- ============================================================================
-- 4.10: CHAT INDEXES
-- ============================================================================
CREATE INDEX idx_chat_sessions_tenant ON t_chat_sessions(tenant_id, is_live);
CREATE INDEX idx_chat_sessions_user ON t_chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_user_recent ON t_chat_sessions(user_id, created_at DESC);

CREATE INDEX idx_chat_messages_session ON t_chat_messages(session_id);
CREATE INDEX idx_chat_messages_session_time ON t_chat_messages(session_id, created_at);

-- ============================================================================
-- 4.11: USER PREFERENCE INDEXES
-- ============================================================================
CREATE INDEX idx_user_chart_prefs_user ON t_user_chart_preferences(user_id);
CREATE INDEX idx_user_chart_prefs_index ON t_user_chart_preferences(index_id);
CREATE UNIQUE INDEX idx_user_chart_prefs_unique ON t_user_chart_preferences(user_id, index_id);

-- ============================================================================
-- SECTION 5: VERIFICATION & COMPLETION
-- ============================================================================
DO $$
DECLARE
    v_trigger_count INTEGER;
    v_index_count INTEGER;
    v_function_count INTEGER;
    rec RECORD;
BEGIN
    -- Count trigger functions
    SELECT COUNT(*) INTO v_function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN ('update_updated_at_column', 'update_staging_updated_at', 'update_market_updated_at');

    -- Count triggers
    SELECT COUNT(*) INTO v_trigger_count
    FROM pg_trigger
    WHERE tgisinternal = false;

    -- Count custom indexes
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND (indexname LIKE 'idx_%' OR indexname LIKE 'm_%' OR indexname LIKE 'trg_%');

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Indexes and Triggers Complete';
    RAISE NOTICE 'Trigger functions created: %', v_function_count;
    RAISE NOTICE 'Triggers created: %', v_trigger_count;
    RAISE NOTICE 'Custom indexes created: %', v_index_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Updates from current_schema.sql:';
    RAISE NOTICE '  - Added 3 trigger functions';
    RAISE NOTICE '  - Added trigger for t_monthly_portfolio_snapshots';
    RAISE NOTICE '  - Added trigger for t_user_chart_preferences';
    RAISE NOTICE '  - Added indexes for new tables';
    RAISE NOTICE '  - Added indexes for goal_alerts and goal_snapshots';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Performance optimizations ready!';
    RAISE NOTICE 'Next: Run 04_functions_views_policies.sql';
    RAISE NOTICE '========================================';
END $$;
