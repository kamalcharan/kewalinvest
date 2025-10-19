-- ==========================================
-- MARKET INDICES MASTER SEED DATA
-- NSE Indices with Yahoo Finance Symbols
-- ==========================================

-- Clear existing data (optional - comment out for production)
-- TRUNCATE TABLE t_market_data_records CASCADE;
-- DELETE FROM t_market_indices;

-- ==========================================
-- BROAD MARKET INDICES (Priority 1-15)
-- ==========================================

INSERT INTO t_market_indices (index_code, index_name, yahoo_symbol, category, description, priority) VALUES
('NSEI', 'Nifty 50', '^NSEI', 'broad', 'Flagship index of NSE, represents top 50 large-cap companies', 1),
('NSENEXT50', 'Nifty Next 50', '^NSMIDCP', 'broad', 'Represents the next 50 companies after Nifty 50', 2),
('CNX100', 'Nifty 100', '^CNX100', 'broad', 'Combines Nifty 50 and Nifty Next 50', 3),
('CNX200', 'Nifty 200', '^CNX200', 'broad', 'Top 200 companies from NSE', 4),
('CNX500', 'Nifty 500', '^CNX500', 'broad', 'Broad market index covering 95% of free float market cap', 5),
('NIFTY_MIDCAP_50', 'Nifty Midcap 50', '^NSEMDCP50', 'broad', 'Top 50 mid-cap companies', 6),
('NIFTY_MIDCAP_100', 'Nifty Midcap 100', '^NSEMDCP100', 'broad', 'Top 100 mid-cap companies', 7),
('NIFTY_MIDCAP_150', 'Nifty Midcap 150', '^NIFTY_MIDCAP_150.NS', 'broad', 'Top 150 mid-cap companies', 8),
('NIFTY_SMLCAP_50', 'Nifty Smallcap 50', '^NIFTY_SMLCAP_50.NS', 'broad', 'Top 50 small-cap companies', 9),
('NIFTY_SMLCAP_100', 'Nifty Smallcap 100', '^NIFTY_SMLCAP_100.NS', 'broad', 'Top 100 small-cap companies', 10),
('NIFTY_SMLCAP_250', 'Nifty Smallcap 250', '^NIFTY_SMLCAP_250.NS', 'broad', 'Top 250 small-cap companies', 11),
('NIFTY_MICROCAP250', 'Nifty Microcap 250', '^NIFTY_MICROCAP250.NS', 'broad', 'Microcap segment of the market', 12),
('NIFTY_LM250', 'Nifty LargeMidcap 250', '^NIFTY_LM250.NS', 'broad', 'Large and mid-cap companies', 13),
('NIFTY_TOTAL_MKT', 'Nifty Total Market', '^NIFTY_TOTAL_MKT.NS', 'broad', 'Represents the entire Indian equity market', 14),
('INDIAVIX', 'India VIX', '^INDIAVIX', 'broad', 'Volatility index - Market fear gauge', 15)
ON CONFLICT (index_code) DO NOTHING;

-- ==========================================
-- SECTORAL INDICES (Priority 20-39)
-- ==========================================

INSERT INTO t_market_indices (index_code, index_name, yahoo_symbol, category, description, priority) VALUES
('NIFTYBANK', 'Nifty Bank', '^NSEBANK', 'sectoral', 'Banking sector index', 20),
('CNXIT', 'Nifty IT', '^CNXIT', 'sectoral', 'Information Technology sector', 21),
('CNXAUTO', 'Nifty Auto', '^CNXAUTO', 'sectoral', 'Automobile and auto component companies', 22),
('CNXFMCG', 'Nifty FMCG', '^CNXFMCG', 'sectoral', 'Fast Moving Consumer Goods', 23),
('CNXPHARMA', 'Nifty Pharma', '^CNXPHARMA', 'sectoral', 'Pharmaceutical companies', 24),
('CNXMETAL', 'Nifty Metal', '^CNXMETAL', 'sectoral', 'Metal and mining companies', 25),
('CNXREALTY', 'Nifty Realty', '^CNXREALTY', 'sectoral', 'Real estate companies', 26),
('CNXENERGY', 'Nifty Energy', '^CNXENERGY', 'sectoral', 'Energy sector companies', 27),
('CNXFINANCE', 'Nifty Financial Services', '^CNXFINANCE', 'sectoral', 'Financial services sector', 28),
('CNXMEDIA', 'Nifty Media', '^CNXMEDIA', 'sectoral', 'Media and entertainment companies', 29),
('NIFTY_PVT_BANK', 'Nifty Private Bank', '^NIFTY_PVT_BANK.NS', 'sectoral', 'Private sector banks', 30),
('NIFTY_PSU_BANK', 'Nifty PSU Bank', '^NIFTY_PSU_BANK.NS', 'sectoral', 'Public sector banks', 31),
('NIFTY_OIL_AND_GAS', 'Nifty Oil & Gas', '^NIFTY_OIL_AND_GAS.NS', 'sectoral', 'Oil and gas companies', 32),
('NIFTY_HEALTHCARE', 'Nifty Healthcare', '^NIFTY_HEALTHCARE.NS', 'sectoral', 'Healthcare sector', 33),
('NIFTY_CONSR_DURBL', 'Nifty Consumer Durables', '^NIFTY_CONSR_DURBL.NS', 'sectoral', 'Consumer durable goods', 34),
('NIFTY_COMMODITIES', 'Nifty Commodities', '^NIFTY_COMMODITIES.NS', 'sectoral', 'Commodity-related companies', 35),
('NIFTY_INFRA', 'Nifty Infrastructure', '^NIFTY_INFRA.NS', 'sectoral', 'Infrastructure companies', 36),
('NIFTY_SERV_SECTOR', 'Nifty Services Sector', '^NIFTY_SERV_SECTOR.NS', 'sectoral', 'Service sector companies', 37),
('NIFTY_MNC', 'Nifty MNC', '^NIFTY_MNC.NS', 'sectoral', 'Multinational companies', 38),
('NIFTY_PSE', 'Nifty PSE', '^NIFTY_PSE.NS', 'sectoral', 'Public sector enterprises', 39)
ON CONFLICT (index_code) DO NOTHING;

-- ==========================================
-- THEMATIC INDICES (Priority 40-54)
-- ==========================================

INSERT INTO t_market_indices (index_code, index_name, yahoo_symbol, category, description, priority) VALUES
('NIFTY_DIV_OPPS_50', 'Nifty Dividend Opportunities 50', '^NIFTY_DIV_OPPS_50.NS', 'thematic', 'High dividend yield companies', 40),
('NIFTY_GROWSECT_15', 'Nifty Growth Sectors 15', '^NIFTY_GROWSECT_15.NS', 'thematic', 'Growth-oriented sectors', 41),
('NIFTY_CONSUMPTION', 'Nifty India Consumption', '^NIFTY_CONSUMPTION.NS', 'thematic', 'Consumption-driven companies', 42),
('NIFTY_INDIA_DIGITAL', 'Nifty India Digital', '^NIFTY_INDIA_DIGITAL.NS', 'thematic', 'Digital economy companies', 43),
('NIFTY_INDIA_MFG', 'Nifty India Manufacturing', '^NIFTY_INDIA_MFG.NS', 'thematic', 'Manufacturing sector focus', 44),
('NIFTY_HOUSING', 'Nifty Housing', '^NIFTY_HOUSING.NS', 'thematic', 'Housing and real estate related', 45),
('NIFTY_TRANSPORT', 'Nifty Transportation & Logistics', '^NIFTY_TRANSPORT.NS', 'thematic', 'Transport and logistics', 46),
('NIFTY_MIDSML_400', 'Nifty MidSmallcap 400', '^NIFTY_MIDSML_400.NS', 'thematic', 'Mid and small-cap blend', 47),
('NIFTY100_QUALTY30', 'Nifty100 Quality 30', '^NIFTY100_QUALTY30.NS', 'thematic', 'Quality factor-based index', 48),
('NIFTY_ALPHA_50', 'Nifty Alpha 50', '^NIFTY_ALPHA_50.NS', 'thematic', 'Alpha generation stocks', 49),
('NIFTY100_LOWVOL30', 'Nifty100 Low Volatility 30', '^NIFTY100_LOWVOL30.NS', 'thematic', 'Low volatility stocks', 50),
('NIFTY_CPSE', 'Nifty CPSE', '^NIFTY_CPSE.NS', 'thematic', 'Central public sector enterprises', 51),
('NIFTY_SME_EMERGE', 'Nifty SME Emerge', '^NIFTY_SME_EMERGE.NS', 'thematic', 'SME sector companies', 52),
('NIFTY_RURAL', 'Nifty Rural', '^NIFTY_RURAL.NS', 'thematic', 'Rural economy focused', 53),
('NIFTY_MOBILITY', 'Nifty Mobility', '^NIFTY_MOBILITY.NS', 'thematic', 'Mobility and transportation', 54)
ON CONFLICT (index_code) DO NOTHING;

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Show all indices grouped by category
SELECT 
  category,
  COUNT(*) as total_indices,
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

-- Show indices with their Yahoo symbols
SELECT 
  priority,
  index_code,
  index_name,
  yahoo_symbol,
  category,
  is_active
FROM t_market_indices
ORDER BY priority;

-- Statistics
SELECT 
  'Total Indices' as metric,
  COUNT(*)::TEXT as value
FROM t_market_indices
WHERE is_active = true
UNION ALL
SELECT 
  'Broad Market' as metric,
  COUNT(*)::TEXT as value
FROM t_market_indices
WHERE is_active = true AND category = 'broad'
UNION ALL
SELECT 
  'Sectoral' as metric,
  COUNT(*)::TEXT as value
FROM t_market_indices
WHERE is_active = true AND category = 'sectoral'
UNION ALL
SELECT 
  'Thematic' as metric,
  COUNT(*)::TEXT as value
FROM t_market_indices
WHERE is_active = true AND category = 'thematic';