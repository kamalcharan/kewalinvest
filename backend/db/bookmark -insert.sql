============================================================================
-- Insert Bookmarks for Tenant ID = 4 (Using NUMERIC scheme_code matching)
-- Description: Matches schemes by scheme_code (numeric codes like 131578)
-- Date: 2025-01-24
-- ============================================================================

DO $$
DECLARE
    v_user_id INTEGER;
    v_tenant_id INTEGER := 2;
    v_inserted_count INTEGER := 0;
    v_skipped_count INTEGER := 0;
BEGIN
    -- Get first active user for tenant 4
    SELECT id INTO v_user_id
    FROM t_users
    WHERE tenant_id = v_tenant_id
      AND is_active = true
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No user found for tenant_id = %. Please create a user first.', v_tenant_id;
    END IF;

    RAISE NOTICE 'Using user_id: % for tenant_id: %', v_user_id, v_tenant_id;

    -- Insert bookmarks by matching numeric scheme_code from t_scheme_details
    INSERT INTO t_scheme_bookmarks (tenant_id, user_id, scheme_id, scheme_code, scheme_name, amc_name, is_live, is_active, daily_download_enabled)
    SELECT 
        v_tenant_id,
        v_user_id,
        sd.id,  -- Use the actual scheme_id (primary key) from t_scheme_details
        sd.scheme_code,  -- Use scheme_code from master
        COALESCE(sd.scheme_name, schemes_to_add.scheme_name),
        COALESCE(sd.amc_name, schemes_to_add.amc_name),
        true,
        true,
        false
    FROM (VALUES
        ('131578', 'INF579M01878', '360 One Focused Fund (G)', '360 One'),
        ('152800', 'INF209KC1159', 'Aditya Birla SL Nifty India Defence Index Fund Reg (G)', 'Aditya Birla SL'),
        ('112087', 'INF209K01256', 'Axis Arbitrage Fund (G)', 'Axis'),
        ('152804', 'INF846K010X6', 'Axis Consumption Fund Reg (G)', 'Axis'),
        ('115068', 'INF846K01917', 'Axis Dynamic Bond Fund (G) Direct', 'Axis'),
        ('112323', 'INF846K01131', 'Axis ELSS Tax Saver Fund (G)', 'Axis'),
        ('115897', 'INF846K01AL3', 'Axis Gold Fund (G)', 'Axis'),
        ('112277', 'INF846K01164', 'Axis Large Cap Fund (G)', 'Axis'),
        ('120465', 'INF846K01DP8', 'Axis Large Cap Fund (G) Direct', 'Axis'),
        ('120389', 'INF846K01CX4', 'Axis Liquid Fund (G) Direct', 'Axis'),
        ('114564', 'INF846K01859', 'Axis Midcap Fund (G)', 'Axis'),
        ('120505', 'INF846K01EH3', 'Axis Midcap Fund (G) Direct', 'Axis'),
        ('113064', 'INF846K01768', 'Axis Multi Asset Allocation Fund Reg (G)', 'Axis'),
        ('149383', 'INF846K013E0', 'Axis Multi Cap Fund (G) Direct', 'Axis'),
        ('146678', 'INF846K01O23', 'Axis Overnight Fund (G)', 'Axis'),
        ('125350', 'INF846K01K01', 'Axis Small Cap Fund Reg (G)', 'Axis'),
        ('112214', 'INF846K01537', 'Axis Treasury Advantage Fund (G) Direct', 'Axis'),
        ('144759', 'INF846K01G23', 'Axis Ultra Short Duration Fund Reg (G)', 'Axis'),
        ('149167', 'INF846K013C4', 'Axis Value Fund Reg (G)', 'Axis'),
        ('108845', 'INF194K01649', 'Bandhan Arbitrage Fund Reg (G)', 'Bandhan'),
        ('152877', 'INF194KB1IP8', 'Bandhan Business Cycle Fund Reg (G)', 'Bandhan'),
        ('108690', 'INF194K01VX9', 'Bandhan Liquid Fund Reg (G)', 'Bandhan'),
        ('152326', 'INF194KB1HJ3', 'Bandhan Multi Asset Allocation Fund Reg (G)', 'Bandhan'),
        ('112152', 'INF760K01241', 'Canara Robeco Consumer Trends Fund Reg.plan (G)', 'Canara Robeco'),
        ('106166', 'INF760K01050', 'Canara Robeco Equity Hybrid Fund Reg (G)', 'Canara Robeco'),
        ('148884', 'INF760K01JT0', 'Canara Robeco Focused Fund Reg (G)', 'Canara Robeco'),
        ('101588', 'INF760K01324', 'Canara Robeco Income Fund Reg (G)', 'Canara Robeco'),
        ('103390', 'INF760K01274', 'Canara Robeco Infrastructure Fund Reg (G)', 'Canara Robeco'),
        ('102920', 'INF760K01167', 'Canara Robeco Large and Mid Cap Fund Reg (G)', 'Canara Robeco'),
        ('152447', 'INF760K01KU6', 'Canara Robeco Manufacturing Fund Reg (G)', 'Canara Robeco'),
        ('115077', 'INF760K01BM2', 'Canara Robeco Short Duration Fund Reg (G)', 'Canara Robeco'),
        ('146127', 'INF760K01JF9', 'Canara Robeco Small Cap Fund Reg (G)', 'Canara Robeco'),
        ('109371', 'INF760K01DC9', 'Canara Robeco Ultra Short Term Fund Reg.plan (G)', 'Canara Robeco'),
        ('105875', 'INF740K01037', 'DSP Flexi Cap Fund Reg (G)', 'DSP'),
        ('108202', 'INF740K01060', 'DSP Natural Resources & New Energy Reg (G)', 'DSP'),
        ('112108', 'INF754K01202', 'Edelweiss Aggressive Hybrid Fund (G)', 'Edelweiss'),
        ('130205', 'INF754K01EF3', 'Edelweiss Arbitrage Fund Reg (G)', 'Edelweiss'),
        ('153255', 'INF754K01UC6', 'Edelweiss Consumption Fund (G)', 'Edelweiss'),
        ('140355', 'INF843K01KN5', 'Edelweiss Flexi Cap Fund Reg (G)', 'Edelweiss'),
        ('150382', 'INF754K01OL0', 'Edelweiss Focused Fund Reg (G)', 'Edelweiss'),
        ('140182', 'INF754K01GZ6', 'Edelweiss Liquid Fund Reg (G)', 'Edelweiss'),
        ('140225', 'INF843K01013', 'Edelweiss Mid Cap Fund Reg (G)', 'Edelweiss'),
        ('140229', 'INF843K01344', 'Edelweiss Money Market Fund Reg (G)', 'Edelweiss'),
        ('152095', 'INF754K01RW0', 'Edelweiss Multi Cap Fund Reg (G)', 'Edelweiss'),
        ('152988', 'INF754K01TJ3', 'Edelweiss Nifty500 Multicap Momentum Quality 50 Index Fund Reg (G)', 'Edelweiss'),
        ('146193', 'INF754K01JJ4', 'Edelweiss Small Cap Fund (G)', 'Edelweiss'),
        ('152439', 'INF754K01SG1', 'Edelweiss Technology Fund Reg (G)', 'Edelweiss'),
        ('105817', 'INF090I01981', 'Franklin India Focused Equity Fund (G)', 'Franklin India'),
        ('105758', 'INF179K01CR2', 'HDFC Mid Cap Fund (G)', 'HDFC'),
        ('152512', 'INF0R8701111', 'Helios Balanced Advantage Fund Reg (G)', 'Helios'),
        ('152682', 'INF0R8701178', 'Helios Financial Services Fund Reg (G)', 'Helios'),
        ('152136', 'INF0R8701012', 'Helios Flexi Cap Fund Reg (G)', 'Helios'),
        ('152943', 'INF0R8701236', 'Helios Large & Mid Cap Fund Reg (G)', 'Helios'),
        ('153327', 'INF0R8701293', 'Helios Mid Cap Fund Reg (G)', 'Helios'),
        ('152153', 'INF0R8701095', 'Helios Overnight Fund Reg (G)', 'Helios'),
        ('112096', 'INF109K01GN9', 'ICICI Pru All Seasons Bond Fund (G)', 'ICICI Pru'),
        ('102137', 'INF109K01837', 'ICICI Pru Asset Allocator Fund (FOF) (G)', 'ICICI Pru'),
        ('109445', 'INF109K01BU5', 'ICICI Pru Banking and Financial Services Fund Reg (G)', 'ICICI Pru'),
        ('146950', 'INF109KC1YA0', 'ICICI Pru Bharat Consumption Fund (G)', 'ICICI Pru'),
        ('148653', 'INF109KC1O90', 'ICICI Pru Business Cycle Fund Reg (G)', 'ICICI Pru'),
        ('100354', 'INF109K01464', 'ICICI Pru ELSS Tax Saver Fund Reg (G)', 'ICICI Pru'),
        ('100356', 'INF109K01480', 'ICICI Pru Equity & Debt Fund (G)', 'ICICI Pru'),
        ('148989', 'INF109KC1Q80', 'ICICI Pru Flexicap Fund Reg (G)', 'ICICI Pru'),
        ('101802', 'INF109K01AX1', 'ICICI Pru Floating Interest Fund (G)', 'ICICI Pru'),
        ('100352', 'INF109K01415', 'ICICI Pru FMCG Fund (G)', 'ICICI Pru'),
        ('111957', 'INF109K01BZ4', 'ICICI Pru Focused Equity Fund Reg (G)', 'ICICI Pru'),
        ('150308', 'INF109KC17B9', 'ICICI Pru Housing Opp Fund (G)', 'ICICI Pru'),
        ('145896', 'INF109KC1RE6', 'ICICI Pru India Opportunities Fund (G)', 'ICICI Pru'),
        ('145897', 'INF109KC1RH9', 'ICICI Pru India Opportunities Fund (G) Direct', 'ICICI Pru'),
        ('151579', 'INF109KC19S9', 'ICICI Pru Innovation Fund Reg (G)', 'ICICI Pru'),
        ('100349', 'INF109K01431', 'ICICI Pru Large & Mid Cap Fund Reg (G)', 'ICICI Pru'),
        ('103340', 'INF109K01VQ1', 'ICICI Pru Liquid Fund (G)', 'ICICI Pru'),
        ('145077', 'INF109KC1LG4', 'ICICI Pru Manufacturing Fund Reg (G)', 'ICICI Pru'),
        ('102528', 'INF109K01AN2', 'ICICI Pru MidCap Fund (G)', 'ICICI Pru'),
        ('147345', 'INF109KC1D69', 'ICICI Pru MNC Fund Reg (G)', 'ICICI Pru'),
        ('101144', 'INF109K01761', 'ICICI Pru Multi Asset Fund (G)', 'ICICI Pru'),
        ('101228', 'INF109K01613', 'ICICI Pru Multicap Fund Reg (G)', 'ICICI Pru'),
        ('149439', 'INF109KC1X81', 'ICICI Pru Passive Multi Asset Fund OF Fund (G)', 'ICICI Pru'),
        ('143873', 'INF109KC1GE9', 'ICICI Pru Pharma Healthcare And Diagnostics Fund (G)', 'ICICI Pru'),
        ('150538', 'INF109KC19H2', 'ICICI Pru PSU Equity Fund Reg (G)', 'ICICI Pru'),
        ('115833', 'INF109K01TK8', 'ICICI Pru Regular Gold Savings Reg (G)', 'ICICI Pru'),
        ('102330', 'INF109K01902', 'ICICI Pru Regular Savings Fund (G)', 'ICICI Pru'),
        ('101797', 'INF109K01AB7', 'ICICI Pru Savings Fund (G)', 'ICICI Pru'),
        ('106823', 'INF109K01BI0', 'ICICI Pru Smallcap Fund Reg (G)', 'ICICI Pru'),
        ('100363', 'INF109K01506', 'ICICI Pru Technology Fund (G)', 'ICICI Pru'),
        ('102135', 'INF109K01852', 'ICICI Pru Thematic Advantage Fund (FOF) (G)', 'ICICI Pru'),
        ('150684', 'INF109KC19J8', 'ICICI Pru Transportation and Logistics Fund Reg (G)', 'ICICI Pru'),
        ('115092', 'INF109K01TP7', 'ICICI Pru Ultra Short Term Fund Reg (G)', 'ICICI Pru'),
        ('100221', 'INF192K01544', 'JM Aggressive Hybrid Fund (G)', 'JM'),
        ('100234', 'INF192K01882', 'JM Liquid Fund (G)', 'JM'),
        ('152612', 'INF192K01NE0', 'JM Small Cap Fund Reg (G)', 'JM'),
        ('151381', 'INF174KA1MA7', 'Kotak Banking & Financial Services Fund Reg (G)', 'Kotak'),
        ('105968', 'INF174K01302', 'Kotak Equity Arbitrage Fund (G)', 'Kotak'),
        ('147477', 'INF174KA1EK3', 'Kotak Focused Equity Fund (G)', 'Kotak'),
        ('149841', 'INF174KA1IF4', 'Kotak Manufacture in India Fund (G) Direct', 'Kotak'),
        ('149840', 'INF174KA1IC1', 'Kotak Manufacture in India Fund Reg (G)', 'Kotak'),
        ('152065', 'INF174KA1PA0', 'Kotak Multicap Fund (G)', 'Kotak'),
        ('102591', 'INF174K01FD6', 'Kotak Savings Fund (G)', 'Kotak'),
        ('102875', 'INF174K01211', 'Kotak Smallcap Fund (G)', 'Kotak'),
        ('147447', 'INF174V01754', 'Mahindra Manulife Aggressive Hybrid Fund (G)', 'Mahindra Manulife'),
        ('149404', 'INF174V01BB6', 'Mahindra Manulife Balanced Advantage Fund Reg (G)', 'Mahindra Manulife'),
        ('148571', 'INF174V01AD4', 'Mahindra Manulife Focused Fund Reg (G)', 'Mahindra Manulife'),
        ('140620', 'INF174V01218', 'Mahindra Manulife Low Duration Fund Reg (G)', 'Mahindra Manulife'),
        ('141224', 'INF174V01317', 'Mahindra Manulife Multi Asset Allocation Fund Reg (G)', 'Mahindra Manulife'),
        ('147734', 'INF174V01853', 'Mahindra Manulife Ultra Short Duration Fund Reg (G)', 'Mahindra Manulife'),
        ('148459', 'INF204KB16V0', 'Nippon India Multi-Asset Allocation Fund Reg (G)', 'Nippon India'),
        ('148959', 'INF879O01209', 'Parag Parikh Conservative Hybrid Fund (G) Direct', 'Parag Parikh'),
        ('147482', 'INF879O01092', 'Parag Parikh ELSS Tax Saver Fund (G)', 'Parag Parikh'),
        ('122639', 'INF879O01027', 'Parag Parikh Flexi Cap Fund (G) Direct', 'Parag Parikh'),
        ('122640', 'INF879O01019', 'Parag Parikh Flexi Cap Fund Reg (G)', 'Parag Parikh'),
        ('143260', 'INF879O01035', 'Parag Parikh Liquid Fund (G)', 'Parag Parikh'),
        ('152383', 'INF663L01X88', 'PGIM India Large and Mid Cap Fund Reg (G)', 'PGIM India'),
        ('125305', 'INF663L01DZ4', 'PGIM India Midcap Fund Reg (G)', 'PGIM India'),
        ('149020', 'INF663L01W30', 'PGIM India Small Cap Fund Reg (G)', 'PGIM India'),
        ('101070', 'INF966L01267', 'Quant Absolute Fund (G)', 'Quant'),
        ('151714', 'INF966L01BO9', 'Quant Dynamic Asset Allocation Fund Reg (G)', 'Quant'),
        ('103225', 'INF966L01317', 'Quant Liquid Fund (G)', 'Quant'),
        ('101065', 'INF966L01176', 'Quant MidCap Fund (G)', 'Quant'),
        ('101072', 'INF966L01200', 'Quant Multi Asset Allocation Fund (G)', 'Quant'),
        ('100177', 'INF966L01AA0', 'Quant Small Cap Fund (G)', 'Quant'),
        ('133858', 'INF200KA1473', 'SBI Banking & Financial Services Fund Reg (G)', 'SBI'),
        ('152418', 'INF200KB1092', 'SBI Energy Opportunities Fund Reg (G)', 'SBI'),
        ('102765', 'INF200K01388', 'SBI Focused Equity Fund Reg (G)', 'SBI'),
        ('103024', 'INF200K01305', 'SBI Large & Midcap Fund Reg (G)', 'SBI'),
        ('125494', 'INF200K01T28', 'SBI Small Cap Fund Reg (G)', 'SBI'),
        ('120577', 'INF200K01VS4', 'SBI Technology Opportunities Fund Reg (G)', 'SBI'),
        ('102328', 'INF277K01626', 'Tata Mid Cap Fund Reg (G)', 'Tata'),
        ('151235', 'INF277KA1703', 'Tata Multi Asset Allocation Fund Reg (G)', 'Tata'),
        ('145208', 'INF277K015O2', 'Tata Smallcap Fund Reg (G)', 'Tata'),
        ('146070', 'INF277K016S1', 'Tata Ultra Short Term Fund (G)', 'Tata'),
        ('142035', 'INF582M01DI0', 'Union Balanced Advantage Fund (G)', 'Union'),
        ('151903', 'INF582M01JA4', 'Union Innovation & Opportunities Fund Reg (G)', 'Union'),
        ('147748', 'INF582M01GD4', 'Union Large & MidCap Fund (G)', 'Union'),
        ('149116', 'INF582M01HO9', 'Union Money Market Fund (G)', 'Union'),
        ('129647', 'INF582M01BY1', 'Union Small Cap Fund Reg (G)', 'Union'),
        ('145471', 'INF582M01EO6', 'Union Value Fund (G)', 'Union'),
        ('104075', 'INF789FB1RJ0', 'UTI Arbitrage Fund (G)', 'UTI'),
        ('100668', 'INF189A01053', 'UTI Flexi Cap Fund Reg (G)', 'UTI'),
        ('102012', 'INF789F01PH1', 'UTI Liquid Fund Reg (G)', 'UTI'),
        ('111599', 'INF789F01AP6', 'UTI Multi Asset Allocation Fund Reg (G)', 'UTI'),
        ('102532', 'INF789F01570', 'UTI Ultra Short Duration Fund (G)', 'UTI'),
        ('152850', 'INF03VN01928', 'WhiteOak Capital Arbitrage Fund Reg (G)', 'WhiteOak Capital'),
        ('152133', 'INF03VN01811', 'WhiteOak Capital Balanced Advantage Fund Reg (G)', 'WhiteOak Capital'),
        ('152322', 'INF03VN01852', 'WhiteOak Capital Banking & Financial Services Fund Reg (G)', 'WhiteOak Capital'),
        ('150589', 'INF03VN01647', 'WhiteOak Capital ELSS Tax Saver Fund Reg (G)', 'WhiteOak Capital'),
        ('150346', 'INF03VN01530', 'WhiteOak Capital Flexi Cap Fund (G)', 'WhiteOak Capital'),
        ('152225', 'INF03VN01837', 'WhiteOak Capital Large & Mid Cap Fund Reg (G)', 'WhiteOak Capital'),
        ('145968', 'INF03VN01126', 'WhiteOak Capital Liquid Fund (G)', 'WhiteOak Capital'),
        ('150583', 'INF03VN01563', 'WhiteOak Capital Mid Cap Fund Reg (G)', 'WhiteOak Capital'),
        ('152072', 'INF03VN01795', 'WhiteOak Capital Multi Asset Allocation Fund Reg (G)', 'WhiteOak Capital'),
        ('147307', 'INF03VN01282', 'WhiteOak Capital Ultra Short Duration Fund (G)', 'WhiteOak Capital'),
        ('103131', 'INF179K01AP0', 'HDFC Multi Asset Fund (G)', 'HDFC'),
        ('152361', 'INF0S5R01034', 'Old Bridge Focused Fund Reg (G)', 'Old Bridge'),
        ('130496', 'INF179KA1RT1', 'HDFC Large And Mid Cap Fund Reg (G)', 'HDFC'),
        ('141927', 'INF846K01B51', 'Axis Flexi cap Fund (G)', 'Axis'),
        ('119646', 'INF209K01VT3', 'Aditya Birla SL MNC Fund Reg (G)', 'Aditya Birla SL'),
        ('118278', 'INF760K01EI4', 'Canara Robeco Large Cap Fund (G)', 'Canara Robeco'),
        ('117560', 'INF846K01CH7', 'Axis Focused Fund Reg (G)', 'Axis'),
        ('147929', 'INF846K01W56', 'Axis ESG Integration Strategy Fund Reg (G)', 'Axis'),
        ('112210', 'INF846K01412', 'Axis Liquid Fund (G)', 'Axis'),
        ('147568', 'INF846K01R46', 'Axis Money Market Fund (G)', 'Axis'),
        ('115676', 'INF200K01HA1', 'SBI Gold Fund Reg (G)', 'SBI'),
        ('101758', 'INF109K01654', 'ICICI Pru Short Term Fund (G)', 'ICICI Pru'),
        ('102141', 'INF109K01878', 'ICICI Pru Debt Management Fund (G)', 'ICICI Pru'),
        ('120576', 'INF200K01VR6', 'SBI Consumption Opportunities Fund (G)', 'SBI'),
        ('102503', 'INF200K01636', 'SBI Savings Fund Reg (G)', 'SBI'),
        ('134644', 'INF200KA1DA4', 'SBI Equity Savings Fund Reg (G)', 'SBI'),
        ('116894', 'INF846K01BP2', 'Axis Strategic Bond Fund (G)', 'Axis'),
        ('106597', 'INF740K01250', 'DSP World Gold FoF Reg (G)', 'DSP'),
        ('112293', 'INF740K01730', 'DSP World Mining FoF Reg (G)', 'DSP'),
        ('102053', 'INF200K01719', 'SBI Magnum Medium Duration Fund Reg (G)', 'SBI'),
        ('133836', 'INF663L01FJ3', 'PGIM India Flexi Cap Fund (G)', 'PGIM India'),
        ('138343', 'INF223J01FK8', 'PGIM India Ultra Short Duration Fund (G)', 'PGIM India'),
        ('100473', 'INF090I01809', 'Franklin India Prima Fund (G)', 'Franklin India'),
        ('103633', 'INF109K01TX1', 'ICICI Pru Money Market Fund Reg (G)', 'ICICI Pru'),
        ('144393', 'INF846K01E90', 'Axis Aggressive Hybrid Fund (G)', 'Axis'),
        ('145040', 'INF179KB11R3', 'HDFC Ultra Short Term Fund Reg (G)', 'HDFC'),
        ('138523', 'INF223J01AU8', 'PGIM India Global Equity Opportunities FoF (G)', 'PGIM India'),
        ('149382', 'INF846K016E3', 'Axis Multi Cap Fund Reg (G)', 'Axis'),
        ('106231', 'INF200K01HZ8', 'SBI Short Term Debt Fund Reg (G)', 'SBI'),
        ('149088', 'INF760K01JZ7', 'Canara Robeco Value Fund Reg (G)', 'Canara Robeco'),
        ('138288', 'INF223J01BP6', 'PGIM India Liquid Fund (G)', 'PGIM India'),
        ('112342', 'INF109K01RT3', 'ICICI Pru Banking and PSU Debt Fund Reg (G)', 'ICICI Pru'),
        ('104513', 'INF966L01341', 'Quant Large and Mid Cap Fund (G)', 'Quant'),
        ('150929', 'INF109KC18L6', 'ICICI Pru Nifty Pharma Index Fund Reg (G)', 'ICICI Pru'),
        ('148071', 'INF582M01GM5', 'Union MidCap Fund Reg (G)', 'Union'),
        ('149068', 'INF277KA1190', 'Tata Business Cycle Fund Reg (G)', 'Tata'),
        ('103819', 'INF740K01094', 'DSP Large & Mid Cap Fund Reg (G)', 'DSP'),
        ('152786', 'INF582M01JU2', 'Union Multi Asset Allocation Fund Reg (G)', 'Union')
    ) AS schemes_to_add(scheme_code, isin, scheme_name, amc_name)
    INNER JOIN t_scheme_details sd ON sd.scheme_code = schemes_to_add.scheme_code
    WHERE sd.is_active = true
    ON CONFLICT (tenant_id, scheme_id, is_live)
    DO UPDATE SET
        user_id = EXCLUDED.user_id,
        scheme_code = EXCLUDED.scheme_code,
        scheme_name = EXCLUDED.scheme_name,
        amc_name = EXCLUDED.amc_name,
        is_active = EXCLUDED.is_active,
        daily_download_enabled = EXCLUDED.daily_download_enabled,
        updated_at = CURRENT_TIMESTAMP;

    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

    RAISE NOTICE 'Successfully inserted/updated % bookmarks for tenant_id: %', v_inserted_count, v_tenant_id;

END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify the insertions
SELECT
    COUNT(*) as total_bookmarks,
    COUNT(DISTINCT amc_name) as unique_amcs,
    COUNT(DISTINCT scheme_id) as unique_schemes
FROM t_scheme_bookmarks
WHERE tenant_id = 2 AND is_live = true;

-- Show breakdown by AMC
SELECT
    amc_name,
    COUNT(*) as scheme_count
FROM t_scheme_bookmarks
WHERE tenant_id = 2 AND is_live = true
GROUP BY amc_name
ORDER BY scheme_count DESC;