-- Migration 033: Course Correction System
-- Purpose: Track scheme code migrations for individual customers with rollback capability
-- Date: 2026-01-08
-- Approach: One customer at a time (individual migrations)

-- ============================================================================
-- TABLE: t_course_corrections
-- Tracks each customer's scheme code migration separately
-- ============================================================================

CREATE TABLE IF NOT EXISTS t_course_corrections (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
    is_live BOOLEAN DEFAULT true,

    -- Customer being migrated
    customer_id INTEGER NOT NULL REFERENCES t_customers(id),
    customer_name VARCHAR(255), -- Denormalized for display

    -- Scheme change details
    source_scheme_code VARCHAR(100) NOT NULL,
    source_scheme_name VARCHAR(500),
    target_scheme_code VARCHAR(100) NOT NULL,
    target_scheme_name VARCHAR(500),

    -- Impact summary for this customer
    transaction_count INTEGER DEFAULT 0,
    total_invested DECIMAL(15,2) DEFAULT 0,

    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rolled_back', 'failed')),

    -- Rollback data - stores original transaction data
    -- Format: { "transactions": [{ "id": 123, "original_scheme_code": "152065" }, ...] }
    rollback_data JSONB,

    -- Audit fields
    notes TEXT,
    error_message TEXT,
    created_by INTEGER REFERENCES t_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    executed_at TIMESTAMP,
    rolled_back_at TIMESTAMP,
    rolled_back_by INTEGER REFERENCES t_users(id),

    -- Snapshot regeneration tracking
    snapshot_regenerated BOOLEAN DEFAULT false,
    snapshot_regenerated_at TIMESTAMP
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- For listing migrations by tenant
CREATE INDEX idx_course_corrections_tenant
ON t_course_corrections(tenant_id, is_live, created_at DESC);

-- For finding migrations by customer
CREATE INDEX idx_course_corrections_customer
ON t_course_corrections(customer_id);

-- For finding migrations by scheme code
CREATE INDEX idx_course_corrections_source_scheme
ON t_course_corrections(source_scheme_code);

-- For filtering by status
CREATE INDEX idx_course_corrections_status
ON t_course_corrections(tenant_id, status);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE t_course_corrections IS 'Tracks individual customer scheme code migrations with rollback capability';
COMMENT ON COLUMN t_course_corrections.source_scheme_code IS 'Original (wrong) scheme code';
COMMENT ON COLUMN t_course_corrections.target_scheme_code IS 'New (correct) scheme code';
COMMENT ON COLUMN t_course_corrections.rollback_data IS 'JSONB storing original transaction data for rollback';
COMMENT ON COLUMN t_course_corrections.status IS 'pending=created, completed=executed, rolled_back=reverted, failed=error';

-- ============================================================================
-- HELPER VIEW: v_course_correction_summary
-- Provides summary of migrations grouped by source/target scheme
-- ============================================================================

CREATE OR REPLACE VIEW v_course_correction_summary AS
SELECT
    tenant_id,
    is_live,
    source_scheme_code,
    source_scheme_name,
    target_scheme_code,
    target_scheme_name,
    COUNT(*) as total_migrations,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'rolled_back') as rolled_back_count,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
    SUM(transaction_count) as total_transactions,
    SUM(total_invested) as total_invested,
    MIN(created_at) as first_migration,
    MAX(created_at) as last_migration
FROM t_course_corrections
GROUP BY tenant_id, is_live, source_scheme_code, source_scheme_name, target_scheme_code, target_scheme_name;

COMMENT ON VIEW v_course_correction_summary IS 'Summary view of course corrections grouped by scheme code pair';

-- ============================================================================
-- FUNCTION: Get impacted customers for a scheme code
-- Returns list of customers with transaction counts
-- ============================================================================

CREATE OR REPLACE FUNCTION get_scheme_impact_analysis(
    p_tenant_id INTEGER,
    p_is_live BOOLEAN,
    p_scheme_code VARCHAR(100)
)
RETURNS TABLE (
    customer_id INTEGER,
    customer_name VARCHAR(255),
    transaction_count BIGINT,
    total_invested DECIMAL(15,2),
    first_transaction_date DATE,
    last_transaction_date DATE,
    already_migrated BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id as customer_id,
        co.name as customer_name,
        COUNT(t.id) as transaction_count,
        COALESCE(SUM(t.amount), 0) as total_invested,
        MIN(t.transaction_date)::DATE as first_transaction_date,
        MAX(t.transaction_date)::DATE as last_transaction_date,
        EXISTS (
            SELECT 1 FROM t_course_corrections cc
            WHERE cc.customer_id = c.id
              AND cc.source_scheme_code = p_scheme_code
              AND cc.status = 'completed'
              AND cc.tenant_id = p_tenant_id
              AND cc.is_live = p_is_live
        ) as already_migrated
    FROM t_transaction_table t
    JOIN t_customers c ON c.id = t.customer_id
    JOIN t_contacts co ON co.id = c.contact_id
    WHERE t.scheme_code = p_scheme_code
      AND t.tenant_id = p_tenant_id
      AND t.is_live = p_is_live
    GROUP BY c.id, co.name
    ORDER BY co.name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_scheme_impact_analysis IS 'Returns customers impacted by a scheme code with transaction summary';

-- ============================================================================
-- FUNCTION: Execute course correction for a single customer
-- Migrates transactions and stores rollback data
-- ============================================================================

CREATE OR REPLACE FUNCTION execute_course_correction(
    p_correction_id INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_correction t_course_corrections%ROWTYPE;
    v_rollback_data JSONB;
    v_updated_count INTEGER;
BEGIN
    -- Get the correction record
    SELECT * INTO v_correction
    FROM t_course_corrections
    WHERE id = p_correction_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Correction record not found');
    END IF;

    IF v_correction.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Correction is not in pending status');
    END IF;

    -- Build rollback data - capture current state of transactions
    SELECT jsonb_build_object(
        'transactions', jsonb_agg(
            jsonb_build_object(
                'id', t.id,
                'original_scheme_code', t.scheme_code,
                'original_scheme_name', t.scheme_name
            )
        )
    ) INTO v_rollback_data
    FROM t_transaction_table t
    WHERE t.customer_id = v_correction.customer_id
      AND t.scheme_code = v_correction.source_scheme_code
      AND t.tenant_id = v_correction.tenant_id
      AND t.is_live = v_correction.is_live;

    -- Update transactions to new scheme code
    UPDATE t_transaction_table
    SET scheme_code = v_correction.target_scheme_code,
        updated_at = CURRENT_TIMESTAMP
    WHERE customer_id = v_correction.customer_id
      AND scheme_code = v_correction.source_scheme_code
      AND tenant_id = v_correction.tenant_id
      AND is_live = v_correction.is_live;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    -- Update the correction record
    UPDATE t_course_corrections
    SET status = 'completed',
        rollback_data = v_rollback_data,
        transaction_count = v_updated_count,
        executed_at = CURRENT_TIMESTAMP
    WHERE id = p_correction_id;

    RETURN jsonb_build_object(
        'success', true,
        'updated_transactions', v_updated_count,
        'message', 'Migration completed successfully'
    );

EXCEPTION WHEN OTHERS THEN
    -- Mark as failed
    UPDATE t_course_corrections
    SET status = 'failed',
        error_message = SQLERRM
    WHERE id = p_correction_id;

    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION execute_course_correction IS 'Executes a pending course correction, updating transactions and storing rollback data';

-- ============================================================================
-- FUNCTION: Rollback course correction
-- Restores transactions to original scheme code
-- ============================================================================

CREATE OR REPLACE FUNCTION rollback_course_correction(
    p_correction_id INTEGER,
    p_user_id INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_correction t_course_corrections%ROWTYPE;
    v_transaction JSONB;
    v_updated_count INTEGER := 0;
BEGIN
    -- Get the correction record
    SELECT * INTO v_correction
    FROM t_course_corrections
    WHERE id = p_correction_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Correction record not found');
    END IF;

    IF v_correction.status != 'completed' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Can only rollback completed corrections');
    END IF;

    IF v_correction.rollback_data IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No rollback data available');
    END IF;

    -- Restore each transaction to original scheme code
    FOR v_transaction IN SELECT * FROM jsonb_array_elements(v_correction.rollback_data->'transactions')
    LOOP
        UPDATE t_transaction_table
        SET scheme_code = v_transaction->>'original_scheme_code',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = (v_transaction->>'id')::INTEGER;

        v_updated_count := v_updated_count + 1;
    END LOOP;

    -- Update the correction record
    UPDATE t_course_corrections
    SET status = 'rolled_back',
        rolled_back_at = CURRENT_TIMESTAMP,
        rolled_back_by = p_user_id,
        snapshot_regenerated = false -- Need to regenerate after rollback
    WHERE id = p_correction_id;

    RETURN jsonb_build_object(
        'success', true,
        'restored_transactions', v_updated_count,
        'message', 'Rollback completed successfully'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rollback_course_correction IS 'Rolls back a completed course correction, restoring original scheme codes';
