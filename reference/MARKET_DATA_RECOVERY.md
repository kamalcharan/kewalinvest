# Market Data System - Complete Recovery Guide

## 🚨 DB Crashed - Quick Recovery Steps

Your database crashed and lost market data. Follow these steps to restore the Market Data system.

---

## 📊 Market Data Tables Overview

### 1. **t_market_indices** (Master Table)
Stores the list of NSE market indices with Yahoo Finance integration.

**Key Columns:**
- `index_code` - NSE index code (e.g., 'NSEI', 'NIFTYBANK')
- `index_name` - Display name (e.g., 'Nifty 50', 'Nifty Bank')
- `yahoo_symbol` - Yahoo Finance symbol (e.g., '^NSEI', '^NSEBANK')
- `category` - 'broad', 'sectoral', or 'thematic'
- `priority` - Display order (1-54)
- `is_active` - Whether to download data for this index
- `total_records` - Count of historical records
- `earliest_date`, `latest_date` - Date range of data
- `historical_data_available` - Boolean flag

### 2. **t_market_data_records** (Historical Data)
Stores daily OHLC data for each index.

**Key Columns:**
- `index_id` - Foreign key to t_market_indices
- `date` - Trading date
- `open`, `high`, `low`, `close` - Price points
- `volume` - Trading volume
- `adj_close` - Adjusted closing price
- `daily_return` - Daily return percentage
- `return_1w`, `return_1m`, `return_3m`, `return_6m`, `return_1y` - Period returns
- `sd_7d`, `sd_14d`, `sd_21d`, `sd_42d` - Standard deviations
- `sharpe_ratio` - Risk-adjusted return
- `max_drawdown` - Maximum peak-to-trough decline

### 3. **t_market_download_jobs** (Job Tracking)
Tracks download jobs (historical & EOD).

**Key Columns:**
- `job_type` - 'historical' or 'eod'
- `index_id` - Which index was downloaded
- `status` - 'pending', 'running', 'completed', 'failed'
- `records_inserted`, `records_updated`, `records_skipped` - Statistics

### 4. **t_market_download_logs** (Audit Trail)
Audit log for all download activities.

### 5. **t_market_eod_scheduler** (Scheduler Config)
Global configuration for EOD (End-of-Day) downloads.

**Key Settings:**
- `download_time` - When to download (default: 20:00)
- `retry_interval_minutes` - Retry interval (default: 30 min)
- `max_retries` - Maximum retries (default: 6)
- `retry_cutoff_time` - Stop retrying after this time (default: 23:00)

---

## 🔧 Recovery Script

Run this script to restore market indices seed data:

```bash
# Navigate to the database scripts directory
cd /home/user/kewalinvest/backend/db/backupscripts

# Run the seed script
psql -U your_username -d kewalinvest -f market_indices_seed.sql
```

Or run it directly:

```bash
psql -U your_username -d kewalinvest << 'EOF'
-- Run the market indices seed script content
\i /home/user/kewalinvest/backend/db/backupscripts/market_indices_seed.sql
EOF
```

---

## 📋 Seed Data Summary

The seed data includes **54 market indices** across 3 categories:

### **Broad Market Indices (15 indices)**
Priority 1-15:
1. Nifty 50 (^NSEI)
2. Nifty Next 50 (^NSMIDCP)
3. Nifty 100 (^CNX100)
4. Nifty 200 (^CNX200)
5. Nifty 500 (^CNX500)
6. Nifty Midcap 50/100/150
7. Nifty Smallcap 50/100/250
8. Nifty Microcap 250
9. Nifty LargeMidcap 250
10. Nifty Total Market
11. India VIX (Volatility Index)

### **Sectoral Indices (20 indices)**
Priority 20-39:
- Nifty Bank, IT, Auto, FMCG, Pharma
- Nifty Metal, Realty, Energy
- Nifty Financial Services, Media
- Nifty Private Bank, PSU Bank
- Nifty Oil & Gas, Healthcare
- Nifty Consumer Durables, Commodities
- Nifty Infrastructure, Services
- Nifty MNC, PSE

### **Thematic Indices (19 indices)**
Priority 40-54:
- Nifty Dividend Opportunities 50
- Nifty Growth Sectors 15
- Nifty India Consumption/Digital/Manufacturing
- Nifty Housing, Transport, Mobility
- Nifty MidSmallcap 400
- Nifty Quality 30, Alpha 50, Low Volatility 30
- Nifty CPSE, SME Emerge, Rural

---

## 🔍 Verification Queries

After running the seed script, verify the data:

### Check Total Indices
```sql
SELECT COUNT(*) as total_indices
FROM t_market_indices
WHERE is_active = true;
-- Expected: 54 indices
```

### View by Category
```sql
SELECT
  category,
  COUNT(*) as total,
  STRING_AGG(index_name, ', ' ORDER BY priority) as indices
FROM t_market_indices
WHERE is_active = true
GROUP BY category
ORDER BY
  CASE category
    WHEN 'broad' THEN 1
    WHEN 'sectoral' THEN 2
    WHEN 'thematic' THEN 3
  END;
```

### List All Indices
```sql
SELECT
  priority,
  index_code,
  index_name,
  yahoo_symbol,
  category,
  is_active
FROM t_market_indices
ORDER BY priority;
```

### Check Historical Data
```sql
SELECT
  mi.index_name,
  mi.total_records,
  mi.earliest_date,
  mi.latest_date,
  mi.historical_data_available
FROM t_market_indices mi
WHERE mi.total_records > 0
ORDER BY mi.priority;
```

---

## 📥 Download Historical Data

After restoring indices, you need to download historical market data.

### Option 1: Using Backend API
```bash
# Download all indices (this may take time)
curl -X POST http://localhost:8080/api/market/download-all-historical \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Tenant-ID: 1" \
  -H "X-Environment: live"

# Download specific index
curl -X POST http://localhost:8080/api/market/download-historical/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Tenant-ID: 1" \
  -H "X-Environment: live" \
  -d '{"start_date": "2020-01-01", "end_date": "2024-12-31"}'
```

### Option 2: Using Frontend
1. Navigate to Market Data page
2. Click "Download Historical Data" for each index
3. Specify date range (recommended: last 5 years)

### Option 3: Bulk Download Script
```bash
# Run the bulk download script (if available)
npm run download:market-data
```

---

## 🔄 Enable EOD (End-of-Day) Downloads

After historical data is loaded, enable automatic EOD downloads:

```sql
-- Insert EOD scheduler configuration
INSERT INTO t_market_eod_scheduler (
  is_enabled,
  download_time,
  retry_interval_minutes,
  max_retries,
  retry_cutoff_time
) VALUES (
  true,              -- Enable EOD downloads
  '20:00:00',       -- Download at 8 PM IST
  30,               -- Retry every 30 minutes if failed
  6,                -- Maximum 6 retries
  '23:00:00'        -- Stop retrying after 11 PM
)
ON CONFLICT DO NOTHING;
```

---

## 📊 How Market Data Works

### Data Flow:
1. **Seed Indices** → `t_market_indices` (master list)
2. **Download Historical** → Fetch data from Yahoo Finance
3. **Store Data** → `t_market_data_records` (OHLC + metrics)
4. **Calculate Returns** → Compute daily returns, SD, Sharpe ratio
5. **EOD Updates** → Automatic daily updates at 8 PM
6. **Job Tracking** → `t_market_download_jobs` (audit trail)

### Yahoo Finance Integration:
- Uses Yahoo Finance API to fetch NSE index data
- Symbol format: `^NSEI` for Nifty 50, `^NSEBANK` for Bank Nifty
- Fetches: Open, High, Low, Close, Volume, Adjusted Close
- Calculates: Returns (1w, 1m, 3m, 6m, 1y), Standard Deviations, Sharpe Ratio

### EOD Scheduler:
- Runs daily at configured time (default: 20:00 IST)
- Downloads latest data for all active indices
- Retries on failure with exponential backoff
- Logs all activities in `t_market_download_logs`

---

## 🚀 Quick Start After Recovery

1. **Run seed script** (restore indices master data)
   ```bash
   psql -d kewalinvest -f backend/db/backupscripts/market_indices_seed.sql
   ```

2. **Verify indices loaded**
   ```sql
   SELECT COUNT(*) FROM t_market_indices; -- Should be 54
   ```

3. **Download historical data** (via API or frontend)
   - Start with top 10 priority indices
   - Date range: Last 5 years recommended

4. **Enable EOD scheduler**
   ```sql
   INSERT INTO t_market_eod_scheduler (is_enabled) VALUES (true);
   ```

5. **Monitor downloads**
   ```sql
   SELECT * FROM t_market_download_jobs ORDER BY created_at DESC LIMIT 10;
   ```

---

## 🔍 Troubleshooting

### Issue: No indices showing in frontend
**Solution:** Run the seed script to populate `t_market_indices`

### Issue: Historical download fails
**Solution:**
- Check Yahoo Finance API availability
- Verify internet connectivity
- Check date range (Yahoo has limits)
- Review `t_market_download_logs` for error details

### Issue: EOD downloads not running
**Solution:**
- Check `t_market_eod_scheduler.is_enabled = true`
- Verify backend cron job is running
- Check system time matches IST
- Review scheduler logs

### Issue: Missing data for specific dates
**Solution:**
- Yahoo Finance doesn't provide data for holidays/weekends
- Run manual download for missing date ranges
- Check `t_market_data_records` for gaps

---

## 📝 Important Notes

1. **Data Source:** Yahoo Finance (free, no API key required)
2. **Rate Limits:** Be mindful of Yahoo's rate limits when bulk downloading
3. **Data Accuracy:** Yahoo Finance data is reliable but may have occasional gaps
4. **Storage:** Each index with 5 years of data ≈ 1250 records
5. **Total Storage:** 54 indices × 1250 records ≈ 67,500 records
6. **Backup:** Regular backups of `t_market_data_records` recommended

---

## 📞 Support

If you encounter issues after following this guide:
1. Check backend logs for detailed error messages
2. Verify database connectivity
3. Ensure required tables exist (run schema migrations)
4. Check Yahoo Finance API status: https://finance.yahoo.com

---

**Last Updated:** 2025-10-24
**Script Location:** `/home/user/kewalinvest/backend/db/backupscripts/market_indices_seed.sql`
