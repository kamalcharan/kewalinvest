-- ============================================================================
-- File: 03_indexes_triggers.sql
-- Description: All indexes and triggers for performance and automation
-- Purpose: Optimize queries and automate timestamp updates
-- Execution: Run THIRD after 02_tables.sql
-- Author: System
-- Date: 2025-01-08
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
-- NOTE: Fixed from pan_encrypted/iwell_code_encrypted to pan/iwell_code
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
-- ----------------------------------------------------------------------------
CREATE INDEX idx_portfolio_customer ON t_customer_master_portfolio(customer_id);
CREATE INDEX idx_portfolio_scheme ON t_customer_master_portfolio(scheme_code);
CREATE INDEX idx_portfolio_folio ON t_customer_master_portfolio(folio_no);
CREATE INDEX idx_portfolio_tenant ON t_customer_master_portfolio(tenant_id, is_live);
CREATE INDEX idx_portfolio_active ON t_customer_master_portfolio(customer_id, is_active) 
    WHERE is_active = true;

-- ----------------------------------------------------------------------------
-- INDEXES: t_transaction_table
-- ----------------------------------------------------------------------------
CREATE INDEX idx_transactions_customer ON t_transaction_table(customer_id);
CREATE INDEX idx_transactions_scheme ON t_transaction_table(scheme_code);
CREATE INDEX idx_transactions_date ON t_transaction_table(txn_date DESC);
CREATE INDEX idx_transactions_customer_date ON t_transaction_table(customer_id, txn_date DESC);
CREATE INDEX idx_transactions_folio ON t_transaction_table(folio_no);
CREATE INDEX idx_transactions_portfolio_flag ON t_transaction_table(portfolio_flag) 
    WHERE portfolio_flag = true;
CREATE INDEX idx_transactions_tenant ON t_transaction_table(tenant_id, is_live);

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
-- SECTION 8: TRIGGER FUNCTIONS
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
-- SECTION 9: CREATE TRIGGERS
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
-- ----------------------------------------------------------------------------
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

-- ============================================================================
-- SECTION 10: ANALYZE TABLES FOR QUERY PLANNER
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
    RAISE NOTICE 'Next: Run 04_functions_views_policies.sql';
    RAISE NOTICE '========================================';
END $$;