-- ==========================================
-- MARKET DATA DOWNLOADER - DATABASE SCHEMA
-- ==========================================

-- TABLE 1: Market Indices Master
CREATE TABLE IF NOT EXISTS t_market_indices (
  id SERIAL PRIMARY KEY,
  index_code VARCHAR(50) UNIQUE NOT NULL,           -- e.g., "NSEI", "NSEBANK"
  index_name VARCHAR(200) NOT NULL,                 -- e.g., "Nifty 50", "Nifty Bank"
  yahoo_symbol VARCHAR(50) NOT NULL,                -- e.g., "^NSEI", "^NSEBANK"
  category VARCHAR(50) NOT NULL,                    -- "broad", "sectoral", "thematic"
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,                       -- For display ordering
  
  -- Download Status Tracking
  total_records INTEGER DEFAULT 0,
  earliest_date DATE,
  latest_date DATE,
  last_download_status VARCHAR(20),                 -- "success", "failed", "pending", "in_progress"
  last_download_at TIMESTAMP,
  last_download_error TEXT,
  historical_data_available BOOLEAN DEFAULT false,
  
  -- EOD Retry Logic
  next_eod_retry_at TIMESTAMP,
  eod_retry_count INTEGER DEFAULT 0,
  last_successful_eod_download_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE 2: Market Data Records (OHLCV)
CREATE TABLE IF NOT EXISTS t_market_data_records (
  id SERIAL PRIMARY KEY,
  index_id INTEGER NOT NULL REFERENCES t_market_indices(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- OHLCV Data
  open DECIMAL(15, 2) NOT NULL,
  high DECIMAL(15, 2) NOT NULL,
  low DECIMAL(15, 2) NOT NULL,
  close DECIMAL(15, 2) NOT NULL,
  volume BIGINT,
  adj_close DECIMAL(15, 2),                         -- Adjusted close
  
  -- Metadata
  data_source VARCHAR(50) DEFAULT 'yahoo_finance',  -- "yahoo_finance", "google_finance"
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(index_id, date)                            -- Prevent duplicate dates for same index
);

-- TABLE 3: Market Download Jobs
CREATE TABLE IF NOT EXISTS t_market_download_jobs (
  id SERIAL PRIMARY KEY,
  job_type VARCHAR(20) NOT NULL,                    -- "historical", "eod", "manual"
  index_id INTEGER NOT NULL REFERENCES t_market_indices(id) ON DELETE CASCADE,
  
  -- Date Range (for historical downloads)
  start_date DATE,
  end_date DATE,
  
  -- Job Status
  status VARCHAR(20) DEFAULT 'pending',             -- "pending", "running", "completed", "failed", "cancelled"
  error_details TEXT,
  
  -- Results
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  execution_time_ms INTEGER,
  
  -- Metadata
  triggered_by VARCHAR(50),                         -- "user", "scheduler", "retry"
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- TABLE 4: Market Download Activity Log (Audit Trail)
CREATE TABLE IF NOT EXISTS t_market_download_logs (
  id SERIAL PRIMARY KEY,
  index_id INTEGER REFERENCES t_market_indices(id) ON DELETE CASCADE,
  job_id INTEGER REFERENCES t_market_download_jobs(id) ON DELETE SET NULL,
  
  download_type VARCHAR(20),                        -- "historical", "eod", "manual"
  status VARCHAR(20),                               -- "started", "completed", "failed"
  records_processed INTEGER DEFAULT 0,
  date_range_start DATE,
  date_range_end DATE,
  error_message TEXT,
  duration_seconds INTEGER,
  triggered_by VARCHAR(50),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE 5: EOD Scheduler Config (Global)
CREATE TABLE IF NOT EXISTS t_market_eod_scheduler (
  id SERIAL PRIMARY KEY,
  is_enabled BOOLEAN DEFAULT true,
  
  -- Schedule Config
  download_time TIME DEFAULT '20:00:00',            -- 8:00 PM IST
  retry_interval_minutes INTEGER DEFAULT 30,
  max_retries INTEGER DEFAULT 6,                    -- Until 11:00 PM
  retry_cutoff_time TIME DEFAULT '23:00:00',        -- 11:00 PM IST
  
  -- Execution Tracking
  last_execution_at TIMESTAMP,
  next_execution_at TIMESTAMP,
  execution_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default scheduler config
INSERT INTO t_market_eod_scheduler (is_enabled, download_time, retry_interval_minutes, max_retries)
VALUES (true, '20:00:00', 30, 6)
ON CONFLICT DO NOTHING;

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- Market Data Records - Optimized for date range queries
CREATE INDEX idx_market_data_index_date ON t_market_data_records(index_id, date DESC);
CREATE INDEX idx_market_data_date ON t_market_data_records(date DESC);

-- Market Indices - Optimized for status queries
CREATE INDEX idx_market_indices_status ON t_market_indices(last_download_status);
CREATE INDEX idx_market_indices_active ON t_market_indices(is_active);
CREATE INDEX idx_market_indices_category ON t_market_indices(category);

-- Download Jobs - Optimized for status queries
CREATE INDEX idx_market_jobs_status ON t_market_download_jobs(status, created_at DESC);
CREATE INDEX idx_market_jobs_index ON t_market_download_jobs(index_id, created_at DESC);

-- Download Logs - Optimized for audit queries
CREATE INDEX idx_market_logs_index ON t_market_download_logs(index_id, created_at DESC);

-- ==========================================
-- TRIGGERS FOR UPDATED_AT
-- ==========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_market_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER trg_market_indices_updated_at
  BEFORE UPDATE ON t_market_indices
  FOR EACH ROW
  EXECUTE FUNCTION update_market_updated_at();

CREATE TRIGGER trg_market_data_updated_at
  BEFORE UPDATE ON t_market_data_records
  FOR EACH ROW
  EXECUTE FUNCTION update_market_updated_at();

CREATE TRIGGER trg_market_jobs_updated_at
  BEFORE UPDATE ON t_market_download_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_market_updated_at();

CREATE TRIGGER trg_market_scheduler_updated_at
  BEFORE UPDATE ON t_market_eod_scheduler
  FOR EACH ROW
  EXECUTE FUNCTION update_market_updated_at();

-- ==========================================
-- COMMENTS
-- ==========================================

COMMENT ON TABLE t_market_indices IS 'Master table for NSE market indices with Yahoo Finance integration';
COMMENT ON TABLE t_market_data_records IS 'Historical OHLCV data for market indices';
COMMENT ON TABLE t_market_download_jobs IS 'Tracks download jobs for market data';
COMMENT ON TABLE t_market_download_logs IS 'Audit log for all download activities';
COMMENT ON TABLE t_market_eod_scheduler IS 'Global EOD scheduler configuration';

COMMENT ON COLUMN t_market_indices.yahoo_symbol IS 'Yahoo Finance symbol (e.g., ^NSEI for Nifty 50)';
COMMENT ON COLUMN t_market_indices.eod_retry_count IS 'Current retry count for today EOD download (resets daily)';
COMMENT ON COLUMN t_market_data_records.adj_close IS 'Adjusted close price (for splits/dividends)';