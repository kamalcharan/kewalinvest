-- Migration: Add performance metrics columns to t_nav_data
-- These columns are required for storing calculated metrics and tracking calculation status

-- Check if columns exist before adding (idempotent migration)
DO $$
BEGIN
    -- Performance metrics columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_nav_data' AND column_name = 'daily_return') THEN
        ALTER TABLE t_nav_data ADD COLUMN daily_return NUMERIC(10,4);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_nav_data' AND column_name = 'return_1w') THEN
        ALTER TABLE t_nav_data ADD COLUMN return_1w NUMERIC(10,4);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_nav_data' AND column_name = 'return_1m') THEN
        ALTER TABLE t_nav_data ADD COLUMN return_1m NUMERIC(10,4);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_nav_data' AND column_name = 'return_3m') THEN
        ALTER TABLE t_nav_data ADD COLUMN return_3m NUMERIC(10,4);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_nav_data' AND column_name = 'return_6m') THEN
        ALTER TABLE t_nav_data ADD COLUMN return_6m NUMERIC(10,4);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_nav_data' AND column_name = 'return_1y') THEN
        ALTER TABLE t_nav_data ADD COLUMN return_1y NUMERIC(10,4);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_nav_data' AND column_name = 'return_ytd') THEN
        ALTER TABLE t_nav_data ADD COLUMN return_ytd NUMERIC(10,4);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_nav_data' AND column_name = 'return_all') THEN
        ALTER TABLE t_nav_data ADD COLUMN return_all NUMERIC(10,4);
    END IF;

    -- Volatility metrics
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_nav_data' AND column_name = 'sd_7d') THEN
        ALTER TABLE t_nav_data ADD COLUMN sd_7d NUMERIC(10,4);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_nav_data' AND column_name = 'sd_14d') THEN
        ALTER TABLE t_nav_data ADD COLUMN sd_14d NUMERIC(10,4);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_nav_data' AND column_name = 'sd_21d') THEN
        ALTER TABLE t_nav_data ADD COLUMN sd_21d NUMERIC(10,4);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_nav_data' AND column_name = 'sd_42d') THEN
        ALTER TABLE t_nav_data ADD COLUMN sd_42d NUMERIC(10,4);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_nav_data' AND column_name = 'sd_3m') THEN
        ALTER TABLE t_nav_data ADD COLUMN sd_3m NUMERIC(10,4);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_nav_data' AND column_name = 'sd_6m') THEN
        ALTER TABLE t_nav_data ADD COLUMN sd_6m NUMERIC(10,4);
    END IF;

    -- Count columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_nav_data' AND column_name = 'count_3m') THEN
        ALTER TABLE t_nav_data ADD COLUMN count_3m INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_nav_data' AND column_name = 'count_42d') THEN
        ALTER TABLE t_nav_data ADD COLUMN count_42d INTEGER;
    END IF;

    -- Risk metrics
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_nav_data' AND column_name = 'sharpe_ratio') THEN
        ALTER TABLE t_nav_data ADD COLUMN sharpe_ratio NUMERIC(10,4);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_nav_data' AND column_name = 'max_drawdown') THEN
        ALTER TABLE t_nav_data ADD COLUMN max_drawdown NUMERIC(10,4);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_nav_data' AND column_name = 'total_risk') THEN
        ALTER TABLE t_nav_data ADD COLUMN total_risk NUMERIC(10,4);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_nav_data' AND column_name = 'cagr') THEN
        ALTER TABLE t_nav_data ADD COLUMN cagr NUMERIC(10,4);
    END IF;

    -- Metrics calculation tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_nav_data' AND column_name = 'metrics_calculated_at') THEN
        ALTER TABLE t_nav_data ADD COLUMN metrics_calculated_at TIMESTAMP;
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN t_nav_data.daily_return IS 'Daily return percentage';
COMMENT ON COLUMN t_nav_data.return_1w IS '1 week return percentage';
COMMENT ON COLUMN t_nav_data.return_1m IS '1 month return percentage';
COMMENT ON COLUMN t_nav_data.return_3m IS '3 month return percentage';
COMMENT ON COLUMN t_nav_data.return_6m IS '6 month return percentage';
COMMENT ON COLUMN t_nav_data.return_1y IS '1 year return percentage';
COMMENT ON COLUMN t_nav_data.return_ytd IS 'Year-to-date return percentage';
COMMENT ON COLUMN t_nav_data.return_all IS 'All-time return percentage from inception';
COMMENT ON COLUMN t_nav_data.sd_7d IS '7-day standard deviation (volatility)';
COMMENT ON COLUMN t_nav_data.sd_14d IS '14-day standard deviation';
COMMENT ON COLUMN t_nav_data.sd_21d IS '21-day standard deviation';
COMMENT ON COLUMN t_nav_data.sd_42d IS '42-day standard deviation';
COMMENT ON COLUMN t_nav_data.sd_3m IS '3-month standard deviation';
COMMENT ON COLUMN t_nav_data.sd_6m IS '6-month standard deviation';
COMMENT ON COLUMN t_nav_data.count_3m IS 'Number of trading days in 3-month period';
COMMENT ON COLUMN t_nav_data.count_42d IS 'Number of trading days in 42-day period';
COMMENT ON COLUMN t_nav_data.sharpe_ratio IS 'Sharpe ratio (risk-adjusted return)';
COMMENT ON COLUMN t_nav_data.max_drawdown IS 'Maximum drawdown percentage';
COMMENT ON COLUMN t_nav_data.total_risk IS 'Combined risk score';
COMMENT ON COLUMN t_nav_data.cagr IS 'Compound Annual Growth Rate';
COMMENT ON COLUMN t_nav_data.metrics_calculated_at IS 'Timestamp when metrics were last calculated';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_nav_data_metrics_calculated ON t_nav_data (scheme_id, nav_date, metrics_calculated_at) WHERE metrics_calculated_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nav_data_missing_metrics ON t_nav_data (scheme_id, nav_date, is_live) WHERE metrics_calculated_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_nav_data_date_range_metrics ON t_nav_data (nav_date, scheme_id, is_live) WHERE metrics_calculated_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nav_data_scheme_latest_metrics ON t_nav_data (scheme_id, nav_date DESC, is_live) WHERE metrics_calculated_at IS NOT NULL;

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 028_add_nav_metrics_columns completed successfully';
END $$;
