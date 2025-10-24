-- Insert scheme bookmarks for tenant_id = 4
-- This script creates bookmarks for all the schemes used by tenant 4
--
-- Prerequisites:
-- 1. All scheme_ids must exist in t_scheme_details table
-- 2. Tenant with id = 4 must exist in t_tenants table
-- 3. At least one user must exist for tenant_id = 4 in t_users table
--
-- Usage:
-- Before running, verify tenant has users:
--   SELECT user_id, user_name, email FROM t_users WHERE tenant_id = 4 LIMIT 5;
--
-- If no user exists, this script will use the first available user for tenant 4
-- You can modify @user_id to use a specific user_id if needed

-- Get the first user_id for tenant 4 (adjust if needed to use a specific user)
DO $$
DECLARE
    v_user_id INTEGER;
    v_tenant_id INTEGER := 4;
BEGIN
    -- Get first active user for tenant 4
    SELECT user_id INTO v_user_id
    FROM t_user
    WHERE tenant_id = v_tenant_id
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No user found for tenant_id = %. Please create a user first.', v_tenant_id;
    END IF;

    RAISE NOTICE 'Using user_id: % for tenant_id: %', v_user_id, v_tenant_id;

    -- Insert bookmarks for tenant 4
    -- Using ON CONFLICT to avoid duplicates based on unique constraint (tenant_id, scheme_id, is_live)

    INSERT INTO t_scheme_bookmarks (tenant_id, user_id, scheme_id, scheme_code, scheme_name, amc_name, is_live, is_active, daily_download_enabled)
    VALUES
        (v_tenant_id, v_user_id, 131578, 'INF579M01878', '360 One Focused Fund (G)', '360 One', true, true, false),
        (v_tenant_id, v_user_id, 152800, 'INF209KC1159', 'Aditya Birla SL Nifty India Defence Index Fund Reg (G)', 'Aditya Birla SL', true, true, false),
        (v_tenant_id, v_user_id, 112087, 'INF209K01256', 'Axis Arbitrage Fund (G)', 'Axis', true, true, false),
        (v_tenant_id, v_user_id, 152804, 'INF846K010X6', 'Axis Consumption Fund Reg (G)', 'Axis', true, true, false),
        (v_tenant_id, v_user_id, 115068, 'INF846K01917', 'Axis Dynamic Bond Fund (G) Direct', 'Axis', true, true, false),
        (v_tenant_id, v_user_id, 112323, 'INF846K01131', 'Axis ELSS Tax Saver Fund (G)', 'Axis', true, true, false),
        (v_tenant_id, v_user_id, 115897, 'INF846K01AL3', 'Axis Gold Fund (G)', 'Axis', true, true, false),
        (v_tenant_id, v_user_id, 112277, 'INF846K01164', 'Axis Large Cap Fund (G)', 'Axis', true, true, false),
        (v_tenant_id, v_user_id, 120465, 'INF846K01DP8', 'Axis Large Cap Fund (G) Direct', 'Axis', true, true, false),
        (v_tenant_id, v_user_id, 120389, 'INF846K01CX4', 'Axis Liquid Fund (G) Direct', 'Axis', true, true, false),
        (v_tenant_id, v_user_id, 114564, 'INF846K01859', 'Axis Midcap Fund (G)', 'Axis', true, true, false),
        (v_tenant_id, v_user_id, 120505, 'INF846K01EH3', 'Axis Midcap Fund (G) Direct', 'Axis', true, true, false),
        (v_tenant_id, v_user_id, 113064, 'INF846K01768', 'Axis Multi Asset Allocation Fund Reg (G)', 'Axis', true, true, false),
        (v_tenant_id, v_user_id, 149383, 'INF846K01300', 'Axis Multi Cap Fund (G) Direct', 'Axis', true, true, false),
        (v_tenant_id, v_user_id, 146678, 'INF846K01O23', 'Axis Overnight Fund (G)', 'Axis', true, true, false),
        (v_tenant_id, v_user_id, 125350, 'INF846K01K01', 'Axis Small Cap Fund Reg (G)', 'Axis', true, true, false),
        (v_tenant_id, v_user_id, 112214, 'INF846K01537', 'Axis Treasury Advantage Fund (G) Direct', 'Axis', true, true, false),
        (v_tenant_id, v_user_id, 144759, 'INF846K01G23', 'Axis Ultra Short Duration Fund Reg (G)', 'Axis', true, true, false),
        (v_tenant_id, v_user_id, 149167, 'INF846K013C4', 'Axis Value Fund Reg (G)', 'Axis', true, true, false),
        (v_tenant_id, v_user_id, 108845, 'INF194K01649', 'Bandhan Arbitrage Fund Reg (G)', 'Bandhan', true, true, false),
        (v_tenant_id, v_user_id, 152877, 'INF194KB1IP8', 'Bandhan Business Cycle Fund Reg (G)', 'Bandhan', true, true, false),
        (v_tenant_id, v_user_id, 108690, 'INF194K01VX9', 'Bandhan Liquid Fund Reg (G)', 'Bandhan', true, true, false),
        (v_tenant_id, v_user_id, 152326, 'INF194KB1HJ3', 'Bandhan Multi Asset Allocation Fund Reg (G)', 'Bandhan', true, true, false),
        (v_tenant_id, v_user_id, 112152, 'INF760K01241', 'Canara Robeco Consumer Trends Fund Reg.plan (G)', 'Canara Robeco', true, true, false),
        (v_tenant_id, v_user_id, 106166, 'INF760K01050', 'Canara Robeco Equity Hybrid Fund Reg (G)', 'Canara Robeco', true, true, false),
        (v_tenant_id, v_user_id, 148884, 'INF760K01JT0', 'Canara Robeco Focused Fund Reg (G)', 'Canara Robeco', true, true, false),
        (v_tenant_id, v_user_id, 101588, 'INF760K01324', 'Canara Robeco Income Fund Reg (G)', 'Canara Robeco', true, true, false),
        (v_tenant_id, v_user_id, 103390, 'INF760K01274', 'Canara Robeco Infrastructure Fund Reg (G)', 'Canara Robeco', true, true, false),
        (v_tenant_id, v_user_id, 102920, 'INF760K01167', 'Canara Robeco Large and Mid Cap Fund Reg (G)', 'Canara Robeco', true, true, false),
        (v_tenant_id, v_user_id, 152447, 'INF760K01KU6', 'Canara Robeco Manufacturing Fund Reg (G)', 'Canara Robeco', true, true, false),
        (v_tenant_id, v_user_id, 115077, 'INF760K01BM2', 'Canara Robeco Short Duration Fund Reg (G)', 'Canara Robeco', true, true, false),
        (v_tenant_id, v_user_id, 146127, 'INF760K01JF9', 'Canara Robeco Small Cap Fund Reg (G)', 'Canara Robeco', true, true, false),
        (v_tenant_id, v_user_id, 109371, 'INF760K01DC9', 'Canara Robeco Ultra Short Term Fund Reg.plan (G)', 'Canara Robeco', true, true, false),
        (v_tenant_id, v_user_id, 105875, 'INF740K01037', 'DSP Flexi Cap Fund Reg (G)', 'DSP', true, true, false),
        (v_tenant_id, v_user_id, 108202, 'INF740K01060', 'DSP Natural Resources & New Energy Reg (G)', 'DSP', true, true, false),
        (v_tenant_id, v_user_id, 112108, 'INF754K01202', 'Edelweiss Aggressive Hybrid Fund (G)', 'Edelweiss', true, true, false),
        (v_tenant_id, v_user_id, 130205, 'INF754K01EF3', 'Edelweiss Arbitrage Fund Reg (G)', 'Edelweiss', true, true, false),
        (v_tenant_id, v_user_id, 153255, 'INF754K01UC6', 'Edelweiss Consumption Fund (G)', 'Edelweiss', true, true, false),
        (v_tenant_id, v_user_id, 140355, 'INF843K01KN5', 'Edelweiss Flexi Cap Fund Reg (G)', 'Edelweiss', true, true, false),
        (v_tenant_id, v_user_id, 150382, 'INF754K01OL0', 'Edelweiss Focused Fund Reg (G)', 'Edelweiss', true, true, false),
        (v_tenant_id, v_user_id, 140182, 'INF754K01GZ6', 'Edelweiss Liquid Fund Reg (G)', 'Edelweiss', true, true, false),
        (v_tenant_id, v_user_id, 140225, 'INF843K01013', 'Edelweiss Mid Cap Fund Reg (G)', 'Edelweiss', true, true, false),
        (v_tenant_id, v_user_id, 140229, 'INF843K01344', 'Edelweiss Money Market Fund Reg (G)', 'Edelweiss', true, true, false),
        (v_tenant_id, v_user_id, 152095, 'INF754K01RW0', 'Edelweiss Multi Cap Fund Reg (G)', 'Edelweiss', true, true, false),
        (v_tenant_id, v_user_id, 152988, 'INF754K01TJ3', 'Edelweiss Nifty500 Multicap Momentum Quality 50 Index Fund Reg (G)', 'Edelweiss', true, true, false),
        (v_tenant_id, v_user_id, 146193, 'INF754K01JJ4', 'Edelweiss Small Cap Fund (G)', 'Edelweiss', true, true, false),
        (v_tenant_id, v_user_id, 152439, 'INF754K01SG1', 'Edelweiss Technology Fund Reg (G)', 'Edelweiss', true, true, false),
        (v_tenant_id, v_user_id, 105817, 'INF090I01981', 'Franklin India Focused Equity Fund (G)', 'Franklin India', true, true, false),
        (v_tenant_id, v_user_id, 105758, 'INF179K01CR2', 'HDFC Mid Cap Fund (G)', 'HDFC', true, true, false),
        (v_tenant_id, v_user_id, 152512, 'INF0R8701111', 'Helios Balanced Advantage Fund Reg (G)', 'Helios', true, true, false),
        (v_tenant_id, v_user_id, 152682, 'INF0R8701178', 'Helios Financial Services Fund Reg (G)', 'Helios', true, true, false),
        (v_tenant_id, v_user_id, 152136, 'INF0R8701012', 'Helios Flexi Cap Fund Reg (G)', 'Helios', true, true, false),
        (v_tenant_id, v_user_id, 152943, 'INF0R8701236', 'Helios Large & Mid Cap Fund Reg (G)', 'Helios', true, true, false),
        (v_tenant_id, v_user_id, 153327, 'INF0R8701293', 'Helios Mid Cap Fund Reg (G)', 'Helios', true, true, false),
        (v_tenant_id, v_user_id, 152153, 'INF0R8701095', 'Helios Overnight Fund Reg (G)', 'Helios', true, true, false),
        (v_tenant_id, v_user_id, 112096, 'INF109K01GN9', 'ICICI Pru All Seasons Bond Fund (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 102137, 'INF109K01837', 'ICICI Pru Asset Allocator Fund (FOF) (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 109445, 'INF109K01BU5', 'ICICI Pru Banking and Financial Services Fund Reg (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 146950, 'INF109KC1YA0', 'ICICI Pru Bharat Consumption Fund (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 148653, 'INF109KC1O90', 'ICICI Pru Business Cycle Fund Reg (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 100354, 'INF109K01464', 'ICICI Pru ELSS Tax Saver Fund Reg (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 100356, 'INF109K01480', 'ICICI Pru Equity & Debt Fund (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 148989, 'INF109KC1Q80', 'ICICI Pru Flexicap Fund Reg (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 101802, 'INF109K01AX1', 'ICICI Pru Floating Interest Fund (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 100352, 'INF109K01415', 'ICICI Pru FMCG Fund (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 111957, 'INF109K01BZ4', 'ICICI Pru Focused Equity Fund Reg (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 150308, 'INF109KC17B9', 'ICICI Pru Housing Opp Fund (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 145896, 'INF109KC1RE6', 'ICICI Pru India Opportunities Fund (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 145897, 'INF109KC1RH9', 'ICICI Pru India Opportunities Fund (G) Direct', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 151579, 'INF109KC19S9', 'ICICI Pru Innovation Fund Reg (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 100349, 'INF109K01431', 'ICICI Pru Large & Mid Cap Fund Reg (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 103340, 'INF109K01VQ1', 'ICICI Pru Liquid Fund (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 145077, 'INF109KC1LG4', 'ICICI Pru Manufacturing Fund Reg (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 102528, 'INF109K01AN2', 'ICICI Pru MidCap Fund (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 147345, 'INF109KC1D69', 'ICICI Pru MNC Fund Reg (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 101144, 'INF109K01761', 'ICICI Pru Multi Asset Fund (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 101228, 'INF109K01613', 'ICICI Pru Multicap Fund Reg (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 149439, 'INF109KC1X81', 'ICICI Pru Passive Multi Asset Fund OF Fund (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 143873, 'INF109KC1GE9', 'ICICI Pru Pharma Healthcare And Diagnostics Fund (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 150538, 'INF109KC19H2', 'ICICI Pru PSU Equity Fund Reg (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 115833, 'INF109K01TK8', 'ICICI Pru Regular Gold Savings Reg (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 102330, 'INF109K01902', 'ICICI Pru Regular Savings Fund (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 101797, 'INF109K01AB7', 'ICICI Pru Savings Fund (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 106823, 'INF109K01BI0', 'ICICI Pru Smallcap Fund Reg (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 100363, 'INF109K01506', 'ICICI Pru Technology Fund (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 102135, 'INF109K01852', 'ICICI Pru Thematic Advantage Fund (FOF) (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 150684, 'INF109KC19J8', 'ICICI Pru Transportation and Logistics Fund Reg (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 115092, 'INF109K01TP7', 'ICICI Pru Ultra Short Term Fund Reg (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 100221, 'INF192K01544', 'JM Aggressive Hybrid Fund (G)', 'JM', true, true, false),
        (v_tenant_id, v_user_id, 100234, 'INF192K01882', 'JM Liquid Fund (G)', 'JM', true, true, false),
        (v_tenant_id, v_user_id, 152612, 'INF192K01NE0', 'JM Small Cap Fund Reg (G)', 'JM', true, true, false),
        (v_tenant_id, v_user_id, 151381, 'INF174KA1MA7', 'Kotak Banking & Financial Services Fund Reg (G)', 'Kotak', true, true, false),
        (v_tenant_id, v_user_id, 105968, 'INF174K01302', 'Kotak Equity Arbitrage Fund (G)', 'Kotak', true, true, false),
        (v_tenant_id, v_user_id, 147477, 'INF174KA1EK3', 'Kotak Focused Equity Fund (G)', 'Kotak', true, true, false),
        (v_tenant_id, v_user_id, 149841, 'INF174KA1IF4', 'Kotak Manufacture in India Fund (G) Direct', 'Kotak', true, true, false),
        (v_tenant_id, v_user_id, 149840, 'INF174KA1IC1', 'Kotak Manufacture in India Fund Reg (G)', 'Kotak', true, true, false),
        (v_tenant_id, v_user_id, 152065, 'INF174KA1PA0', 'Kotak Multicap Fund (G)', 'Kotak', true, true, false),
        (v_tenant_id, v_user_id, 102591, 'INF174K01FD6', 'Kotak Savings Fund (G)', 'Kotak', true, true, false),
        (v_tenant_id, v_user_id, 102875, 'INF174K01211', 'Kotak Smallcap Fund (G)', 'Kotak', true, true, false),
        (v_tenant_id, v_user_id, 147447, 'INF174V01754', 'Mahindra Manulife Aggressive Hybrid Fund (G)', 'Mahindra Manulife', true, true, false),
        (v_tenant_id, v_user_id, 149404, 'INF174V01BB6', 'Mahindra Manulife Balanced Advantage Fund Reg (G)', 'Mahindra Manulife', true, true, false),
        (v_tenant_id, v_user_id, 148571, 'INF174V01AD4', 'Mahindra Manulife Focused Fund Reg (G)', 'Mahindra Manulife', true, true, false),
        (v_tenant_id, v_user_id, 140620, 'INF174V01218', 'Mahindra Manulife Low Duration Fund Reg (G)', 'Mahindra Manulife', true, true, false),
        (v_tenant_id, v_user_id, 141224, 'INF174V01317', 'Mahindra Manulife Multi Asset Allocation Fund Reg (G)', 'Mahindra Manulife', true, true, false),
        (v_tenant_id, v_user_id, 147734, 'INF174V01853', 'Mahindra Manulife Ultra Short Duration Fund Reg (G)', 'Mahindra Manulife', true, true, false),
        (v_tenant_id, v_user_id, 148459, 'INF204KB16V0', 'Nippon India Multi-Asset Asset', 'Nippon India', true, true, false),
        (v_tenant_id, v_user_id, 148959, 'INF879O01209', 'Parag Parikh Conservative Hybrid Fund (G) Direct', 'Parag Parikh', true, true, false),
        (v_tenant_id, v_user_id, 147482, 'INF879O01092', 'Parag Parikh ELSS Tax Saver Fund (G)', 'Parag Parikh', true, true, false),
        (v_tenant_id, v_user_id, 122639, 'INF879O01027', 'Parag Parikh Flexi Cap Fund (G) Direct', 'Parag Parikh', true, true, false),
        (v_tenant_id, v_user_id, 122640, 'INF879O01019', 'Parag Parikh Flexi Cap Fund Reg (G)', 'Parag Parikh', true, true, false),
        (v_tenant_id, v_user_id, 143260, 'INF879O01035', 'Parag Parikh Liquid Fund (G)', 'Parag Parikh', true, true, false),
        (v_tenant_id, v_user_id, 152383, 'INF663L01X88', 'PGIM India Large and Mid Cap Fund Reg (G)', 'PGIM India', true, true, false),
        (v_tenant_id, v_user_id, 125305, 'INF663L01DZ4', 'PGIM India Midcap Fund Reg (G)', 'PGIM India', true, true, false),
        (v_tenant_id, v_user_id, 149020, 'INF663L01W30', 'PGIM India Small Cap Fund Reg (G)', 'PGIM India', true, true, false),
        (v_tenant_id, v_user_id, 101070, 'INF966L01267', 'Quant Absolute Fund (G)', 'Quant', true, true, false),
        (v_tenant_id, v_user_id, 151714, 'INF966L01BO9', 'Quant Dynamic Asset Allocation Fund Reg (G)', 'Quant', true, true, false),
        (v_tenant_id, v_user_id, 103225, 'INF966L01317', 'Quant Liquid Fund (G)', 'Quant', true, true, false),
        (v_tenant_id, v_user_id, 101065, 'INF966L01176', 'Quant MidCap Fund (G)', 'Quant', true, true, false),
        (v_tenant_id, v_user_id, 101072, 'INF966L01200', 'Quant Multi Asset Allocation Fund (G)', 'Quant', true, true, false),
        (v_tenant_id, v_user_id, 100177, 'INF966L01AA0', 'Quant Small Cap Fund (G)', 'Quant', true, true, false),
        (v_tenant_id, v_user_id, 133858, 'INF200KA1473', 'SBI Banking & Financial Services Fund Reg (G)', 'SBI', true, true, false),
        (v_tenant_id, v_user_id, 152418, 'INF200KB1092', 'SBI Energy Opportunities Fund Reg (G)', 'SBI', true, true, false),
        (v_tenant_id, v_user_id, 102765, 'INF200K01388', 'SBI Focused Equity Fund Reg (G)', 'SBI', true, true, false),
        (v_tenant_id, v_user_id, 103024, 'INF200K01305', 'SBI Large & Midcap Fund Reg (G)', 'SBI', true, true, false),
        (v_tenant_id, v_user_id, 125494, 'INF200K01T28', 'SBI Small Cap Fund Reg (G)', 'SBI', true, true, false),
        (v_tenant_id, v_user_id, 120577, 'INF200K01VS4', 'SBI Technology Opportunities Fund Reg (G)', 'SBI', true, true, false),
        (v_tenant_id, v_user_id, 102328, 'INF277K01626', 'Tata Mid Cap Fund Reg (G)', 'Tata', true, true, false),
        (v_tenant_id, v_user_id, 151235, 'INF277KA1703', 'Tata Multi Asset Allocation Fund Reg (G)', 'Tata', true, true, false),
        (v_tenant_id, v_user_id, 145208, 'INF277K015O2', 'Tata Smallcap Fund Reg (G)', 'Tata', true, true, false),
        (v_tenant_id, v_user_id, 146070, 'INF277K016S1', 'Tata Ultra Short Term Fund (G)', 'Tata', true, true, false),
        (v_tenant_id, v_user_id, 142035, 'INF582M01DI0', 'Union Balanced Advantage Fund (G)', 'Union', true, true, false),
        (v_tenant_id, v_user_id, 151903, 'INF582M01JA4', 'Union Innovation & Opportunities Fund Reg (G)', 'Union', true, true, false),
        (v_tenant_id, v_user_id, 147748, 'INF582M01GD4', 'Union Large & MidCap Fund (G)', 'Union', true, true, false),
        (v_tenant_id, v_user_id, 149116, 'INF582M01HO9', 'Union Money Market Fund (G)', 'Union', true, true, false),
        (v_tenant_id, v_user_id, 129647, 'INF582M01BY1', 'Union Small Cap Fund Reg (G)', 'Union', true, true, false),
        (v_tenant_id, v_user_id, 145471, 'INF582M01EO6', 'Union Value Fund (G)', 'Union', true, true, false),
        (v_tenant_id, v_user_id, 104075, 'INF789FB1RJ0', 'UTI Arbitrage Fund (G)', 'UTI', true, true, false),
        (v_tenant_id, v_user_id, 100668, 'INF189A01053', 'UTI Flexi Cap Fund Reg (G)', 'UTI', true, true, false),
        (v_tenant_id, v_user_id, 102012, 'INF789F01PH1', 'UTI Liquid Fund Reg (G)', 'UTI', true, true, false),
        (v_tenant_id, v_user_id, 111599, 'INF789F01AP6', 'UTI Multi Asset Allocation Fund Reg (G)', 'UTI', true, true, false),
        (v_tenant_id, v_user_id, 102532, 'INF789F01570', 'UTI Ultra Short Duration Fund (G)', 'UTI', true, true, false),
        (v_tenant_id, v_user_id, 152850, 'INF03VN01928', 'WhiteOak Capital Arbitrage Fund Reg (G)', 'WhiteOak Capital', true, true, false),
        (v_tenant_id, v_user_id, 152133, 'INF03VN01811', 'WhiteOak Capital Balanced Advantage Fund Reg (G)', 'WhiteOak Capital', true, true, false),
        (v_tenant_id, v_user_id, 152322, 'INF03VN01852', 'WhiteOak Capital Banking & Financial Services Fund Reg (G)', 'WhiteOak Capital', true, true, false),
        (v_tenant_id, v_user_id, 150589, 'INF03VN01647', 'WhiteOak Capital ELSS Tax Saver Fund Reg (G)', 'WhiteOak Capital', true, true, false),
        (v_tenant_id, v_user_id, 150346, 'INF03VN01530', 'WhiteOak Capital Flexi Cap Fund (G)', 'WhiteOak Capital', true, true, false),
        (v_tenant_id, v_user_id, 152225, 'INF03VN01837', 'WhiteOak Capital Large & Mid Cap Fund Reg (G)', 'WhiteOak Capital', true, true, false),
        (v_tenant_id, v_user_id, 145968, 'INF03VN01126', 'WhiteOak Capital Liquid Fund (G)', 'WhiteOak Capital', true, true, false),
        (v_tenant_id, v_user_id, 150583, 'INF03VN01563', 'WhiteOak Capital Mid Cap Fund Reg (G)', 'WhiteOak Capital', true, true, false),
        (v_tenant_id, v_user_id, 152072, 'INF03VN01795', 'WhiteOak Capital Multi Asset Allocation Fund Reg (G)', 'WhiteOak Capital', true, true, false),
        (v_tenant_id, v_user_id, 147307, 'INF03VN01282', 'WhiteOak Capital Ultra Short Duration Fund (G)', 'WhiteOak Capital', true, true, false),
        (v_tenant_id, v_user_id, 103131, 'INF179K01AP0', 'HDFC Multi Asset Fund (G)', 'HDFC', true, true, false),
        (v_tenant_id, v_user_id, 152361, 'INF0S5R01034', 'Old Bridge Focused Fund Reg (G)', 'Old Bridge', true, true, false),
        (v_tenant_id, v_user_id, 130496, 'INF179KA1RT1', 'HDFC Large And Mid Cap Fund Reg (G)', 'HDFC', true, true, false),
        (v_tenant_id, v_user_id, 141927, 'INF846K01B51', 'Axis Flexi cap Fund (G)', 'Axis', true, true, false),
        (v_tenant_id, v_user_id, 119646, 'INF209K01VT3', 'Aditya Birla SL MNC Fund Reg (G)', 'Aditya Birla SL', true, true, false),
        (v_tenant_id, v_user_id, 118278, 'INF760K01EI4', 'Canara Robeco Large Cap Fund (G)', 'Canara Robeco', true, true, false),
        (v_tenant_id, v_user_id, 117560, 'INF846K01CH7', 'Axis Focused Fund Reg (G)', 'Axis', true, true, false),
        (v_tenant_id, v_user_id, 147929, 'INF846K01W56', 'Axis ESG Integration Strategy Fund Reg (G)', 'Axis', true, true, false),
        (v_tenant_id, v_user_id, 112210, 'INF846K01412', 'Axis Liquid Fund (G)', 'Axis', true, true, false),
        (v_tenant_id, v_user_id, 147568, 'INF846K01R46', 'Axis Money Market Fund (G)', 'Axis', true, true, false),
        (v_tenant_id, v_user_id, 115676, 'INF200K01HA1', 'SBI Gold Fund Reg (G)', 'SBI', true, true, false),
        (v_tenant_id, v_user_id, 101758, 'INF109K01654', 'ICICI Pru Short Term Fund (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 102141, 'INF109K01878', 'ICICI Pru Debt Management Fund (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 120576, 'INF200K01VR6', 'SBI Consumption Opportunities Fund (G)', 'SBI', true, true, false),
        (v_tenant_id, v_user_id, 102503, 'INF200K01636', 'SBI Savings Fund Reg (G)', 'SBI', true, true, false),
        (v_tenant_id, v_user_id, 134644, 'INF200KA1DA4', 'SBI Equity Savings Fund Reg (G)', 'SBI', true, true, false),
        (v_tenant_id, v_user_id, 116894, 'INF846K01BP2', 'Axis Strategic Bond Fund (G)', 'Axis', true, true, false),
        (v_tenant_id, v_user_id, 106597, 'INF740K01250', 'DSP World Gold FoF Reg (G)', 'DSP', true, true, false),
        (v_tenant_id, v_user_id, 112293, 'INF740K01730', 'DSP World Mining FoF Reg (G)', 'DSP', true, true, false),
        (v_tenant_id, v_user_id, 102053, 'INF200K01719', 'SBI Magnum Medium Duration Fund Reg (G)', 'SBI', true, true, false),
        (v_tenant_id, v_user_id, 133836, 'INF663L01FJ3', 'PGIM India Flexi Cap Fund (G)', 'PGIM India', true, true, false),
        (v_tenant_id, v_user_id, 138343, 'INF223J01FK8', 'PGIM India Ultra Short Duration Fund (G)', 'PGIM India', true, true, false),
        (v_tenant_id, v_user_id, 100473, 'INF090I01809', 'Franklin India Prima Fund (G)', 'Franklin India', true, true, false),
        (v_tenant_id, v_user_id, 103633, 'INF109K01TX1', 'ICICI Pru Money Market Fund Reg (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 144393, 'INF846K01E90', 'Axis Aggressive Hybrid Fund (G)', 'Axis', true, true, false),
        (v_tenant_id, v_user_id, 145040, 'INF179KB11R3', 'HDFC Ultra Short Term Fund Reg (G)', 'HDFC', true, true, false),
        (v_tenant_id, v_user_id, 138523, 'INF223J01AU8', 'PGIM India Global Equity Opportunities FoF (G)', 'PGIM India', true, true, false),
        (v_tenant_id, v_user_id, 149382, 'INF846K016E3', 'Axis Multi Cap Fund Reg (G)', 'Axis', true, true, false),
        (v_tenant_id, v_user_id, 106231, 'INF200K01HZ8', 'SBI Short Term Debt Fund Reg (G)', 'SBI', true, true, false),
        (v_tenant_id, v_user_id, 149088, 'INF760K01JZ7', 'Canara Robeco Value Fund Reg (G)', 'Canara Robeco', true, true, false),
        (v_tenant_id, v_user_id, 138288, 'INF223J01BP6', 'PGIM India Liquid Fund (G)', 'PGIM India', true, true, false),
        (v_tenant_id, v_user_id, 112342, 'INF109K01RT3', 'ICICI Pru Banking and PSU Debt Fund Reg (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 104513, 'INF966L01341', 'Quant Large and Mid Cap Fund (G)', 'Quant', true, true, false),
        (v_tenant_id, v_user_id, 150929, 'INF109KC18L6', 'ICICI Pru Nifty Pharma Index Fund Reg (G)', 'ICICI Pru', true, true, false),
        (v_tenant_id, v_user_id, 148071, 'INF582M01GM5', 'Union MidCap Fund Reg (G)', 'Union', true, true, false),
        (v_tenant_id, v_user_id, 149068, 'INF277KA1190', 'Tata Business Cycle Fund Reg (G)', 'Tata', true, true, false),
        (v_tenant_id, v_user_id, 103819, 'INF740K01094', 'DSP Large & Mid Cap Fund Reg (G)', 'DSP', true, true, false),
        (v_tenant_id, v_user_id, 152786, 'INF582M01JU2', 'Union Multi Asset Allocation Fund Reg (G)', 'Union', true, true, false)
    ON CONFLICT (tenant_id, scheme_id, is_live)
    DO UPDATE SET
        scheme_code = EXCLUDED.scheme_code,
        scheme_name = EXCLUDED.scheme_name,
        amc_name = EXCLUDED.amc_name,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP;

    RAISE NOTICE 'Successfully inserted/updated % bookmarks for tenant_id: %', 172, v_tenant_id;
END $$;

-- Verify the insertions
SELECT
    COUNT(*) as total_bookmarks,
    COUNT(DISTINCT amc_name) as unique_amcs,
    COUNT(DISTINCT scheme_id) as unique_schemes
FROM t_scheme_bookmarks
WHERE tenant_id = 4;

-- Show breakdown by AMC
SELECT
    amc_name,
    COUNT(*) as scheme_count
FROM t_scheme_bookmarks
WHERE tenant_id = 4
GROUP BY amc_name
ORDER BY scheme_count DESC;
