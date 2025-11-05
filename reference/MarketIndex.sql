INSERT INTO t_market_indices (index_code, index_name, yahoo_symbol, category, priority, is_active, description) VALUES
('NSEI', 'Nifty 50', '^NSEI', 'broad', 1, true, 'Top 50 companies by market cap on NSE'),
('NSMIDCP', 'Nifty Next 50', '^NSMIDCP', 'broad', 2, true, 'Next 50 companies after Nifty 50'),
('CNX100', 'Nifty 100', '^CNX100', 'broad', 3, true, 'Top 100 companies - Nifty 50 + Next 50'),
('CNX200', 'Nifty 200', '^CNX200', 'broad', 4, true, 'Top 200 companies by market cap'),
('CNX500', 'Nifty 500', '^CNX500', 'broad', 5, true, 'Top 500 companies - broad market index'),
('NIFTYMID50', 'Nifty Midcap 50', '^NSEMDCP50', 'broad', 6, true, 'Top 50 mid-cap companies'),
('NIFTYMID100', 'Nifty Midcap 100', '^NSEMDCP100', 'broad', 7, true, 'Top 100 mid-cap companies'),
('NIFTYMID150', 'Nifty Midcap 150', '^NSEMDCP150', 'broad', 8, true, 'Top 150 mid-cap companies'),
('NIFTYSML50', 'Nifty Smallcap 50', '^NSMCP50', 'broad', 9, true, 'Top 50 small-cap companies'),
('NIFTYSML100', 'Nifty Smallcap 100', '^NSMCP100', 'broad', 10, true, 'Top 100 small-cap companies'),
('NIFTYSML250', 'Nifty Smallcap 250', '^NSMCP250', 'broad', 11, true, 'Top 250 small-cap companies'),
('NIFTYMICRO250', 'Nifty Microcap 250', '^CNXMICRO', 'broad', 12, true, 'Top 250 micro-cap companies'),
('NIFTYLRGMID250', 'Nifty LargeMidcap 250', '^CNXLRGMID', 'broad', 13, true, 'Large and mid-cap companies combined'),
('NIFTYTM', 'Nifty Total Market', '^NIFTYTM', 'broad', 14, true, 'Represents entire NSE market'),
('INDIAVIX', 'India VIX', '^INDIAVIX', 'broad', 15, true, 'Volatility Index - market fear gauge');

-- ============================================================================
-- SECTORAL INDICES (Priority 20-39)
-- ============================================================================

INSERT INTO t_market_indices (index_code, index_name, yahoo_symbol, category, priority, is_active, description) VALUES
('BANKNIFTY', 'Nifty Bank', '^NSEBANK', 'sectoral', 20, true, 'Banking sector index'),
('NIFTYIT', 'Nifty IT', '^CNXIT', 'sectoral', 21, true, 'Information Technology sector'),
('NIFTYAUTO', 'Nifty Auto', '^CNXAUTO', 'sectoral', 22, true, 'Automobile sector index'),
('NIFTYFMCG', 'Nifty FMCG', '^CNXFMCG', 'sectoral', 23, true, 'Fast Moving Consumer Goods sector'),
('NIFTYPHARMA', 'Nifty Pharma', '^CNXPHARMA', 'sectoral', 24, true, 'Pharmaceutical sector index'),
('NIFTYMETAL', 'Nifty Metal', '^CNXMETAL', 'sectoral', 25, true, 'Metals and mining sector'),
('NIFTYREALTY', 'Nifty Realty', '^CNXREALTY', 'sectoral', 26, true, 'Real estate sector index'),
('NIFTYENERGY', 'Nifty Energy', '^CNXENERGY', 'sectoral', 27, true, 'Energy sector index'),
('NIFTYFINSRV', 'Nifty Financial Services', '^CNXFIN', 'sectoral', 28, true, 'Financial services sector'),
('NIFTYMEDIA', 'Nifty Media', '^CNXMEDIA', 'sectoral', 29, true, 'Media and entertainment sector'),
('NIFTYPVTBANK', 'Nifty Private Bank', '^NIFTYPVTBANK', 'sectoral', 30, true, 'Private sector banks'),
('NIFTYPSUBANK', 'Nifty PSU Bank', '^NIFTYPSUBANK', 'sectoral', 31, true, 'Public sector banks'),
('NIFTYOILGAS', 'Nifty Oil & Gas', '^CNXOILGAS', 'sectoral', 32, true, 'Oil and gas sector'),
('NIFTYHEALTH', 'Nifty Healthcare', '^CNXHEALTH', 'sectoral', 33, true, 'Healthcare sector index'),
('NIFTYCONSDUR', 'Nifty Consumer Durables', '^CNXCONSDUR', 'sectoral', 34, true, 'Consumer durables sector'),
('NIFTYCOMMODITIES', 'Nifty Commodities', '^CNXCOMMODITIES', 'sectoral', 35, true, 'Commodities sector index'),
('NIFTYINFRA', 'Nifty Infrastructure', '^CNXINFRA', 'sectoral', 36, true, 'Infrastructure sector'),
('NIFTYSERV', 'Nifty Services', '^CNXSERVICE', 'sectoral', 37, true, 'Services sector index'),
('NIFTYMNC', 'Nifty MNC', '^NIFTYMNC', 'sectoral', 38, true, 'Multinational corporations'),
('NIFTYPSE', 'Nifty PSE', '^NIFTYPSE', 'sectoral', 39, true, 'Public sector enterprises');

-- ============================================================================
-- THEMATIC INDICES (Priority 40-54)
-- ============================================================================

INSERT INTO t_market_indices (index_code, index_name, yahoo_symbol, category, priority, is_active, description) VALUES
('NIFTYDIV50', 'Nifty Dividend Opportunities 50', '^NIFTYDIV50', 'thematic', 40, true, 'High dividend yielding stocks'),
('NIFTYGS15', 'Nifty Growth Sectors 15', '^NIFTYGS15', 'thematic', 41, true, 'Growth-oriented sectors'),
('NIFTYCONSUM', 'Nifty India Consumption', '^NIFTYCONSUM', 'thematic', 42, true, 'Consumption theme index'),
('NIFTYDIGITAL', 'Nifty India Digital', '^NIFTYDIGITAL', 'thematic', 43, true, 'Digital economy theme'),
('NIFTYMFG', 'Nifty India Manufacturing', '^NIFTYMFG', 'thematic', 44, true, 'Manufacturing theme index'),
('NIFTYHOUSING', 'Nifty Housing', '^NIFTYHOUSING', 'thematic', 45, true, 'Housing and real estate theme'),
('NIFTYTRANSPORT', 'Nifty Transport & Logistics', '^NIFTYTRANSPORT', 'thematic', 46, true, 'Transportation sector'),
('NIFTYMOBILITY', 'Nifty Mobility', '^NIFTYMOBILITY', 'thematic', 47, true, 'Mobility and transportation theme'),
('NIFTYMIDSML400', 'Nifty MidSmallcap 400', '^NIFTYMIDSML400', 'thematic', 48, true, 'Mid and small-cap combination'),
('NIFTYQLTY30', 'Nifty Quality 30', '^NIFTYQLTY30', 'thematic', 49, true, 'Quality stocks based on ROE, financial leverage, and earnings stability'),
('NIFTYALPHA50', 'Nifty Alpha 50', '^NIFTYALPHA50', 'thematic', 50, true, 'High alpha generating stocks'),
('NIFTYLOWVOL30', 'Nifty Low Volatility 30', '^NIFTYLOWVOL30', 'thematic', 51, true, 'Low volatility stocks'),
('NIFTYCPSE', 'Nifty CPSE', '^NIFTYCPSE', 'thematic', 52, true, 'Central Public Sector Enterprises'),
('NIFTYSME', 'Nifty SME Emerge', '^NIFTYSME', 'thematic', 53, true, 'Small and Medium Enterprises'),
('NIFTYRURAL', 'Nifty Rural', '^NIFTYRURAL', 'thematic', 54, true, 'Rural economy theme index');
