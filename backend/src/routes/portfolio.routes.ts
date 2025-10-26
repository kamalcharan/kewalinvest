// backend/src/routes/portfolio.routes.ts

import express from 'express';
import { PortfolioController } from '../controllers/portfolio.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();
const portfolioController = new PortfolioController();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/portfolio/holdings
 * Get portfolio holdings with filters
 * Must be before /:customerId route to avoid conflict
 * Query params:
 *   - customer_id: Filter by customer
 *   - scheme_code: Filter by scheme
 *   - category: Filter by category
 *   - sub_category: Filter by sub-category
 *   - min_value: Minimum current value
 *   - max_value: Maximum current value
 *   - sort_by: Sort field (default: current_value)
 *   - sort_order: Sort direction (asc/desc, default: desc)
 */
router.get('/holdings', portfolioController.getPortfolioHoldings);

/**
 * GET /api/portfolio/statistics
 * Get portfolio statistics across all customers
 * Must be before /:customerId route to avoid conflict
 */
router.get('/statistics', portfolioController.getPortfolioStatistics);

/**
 * POST /api/portfolio/refresh
 * Manually refresh portfolio totals materialized view
 * Must be before /:customerId route to avoid conflict
 * Body (optional): {
 *   customer_id?: number,
 *   scheme_code?: string,
 *   force?: boolean
 * }
 */
router.post('/refresh', portfolioController.refreshPortfolioTotals);

/**
 * GET /api/portfolio/:customerId
 * Get customer's complete portfolio
 * Returns: {
 *   customer_id: number,
 *   customer_name: string,
 *   summary: {...},
 *   holdings: [...],
 *   allocation: [...]
 * }
 */
router.get('/:customerId', portfolioController.getCustomerPortfolio);

/**
 * GET /api/portfolio/:customerId/totals
 * Get portfolio totals only (faster query)
 * Returns summary without holdings and allocation
 */
router.get('/:customerId/totals', portfolioController.getPortfolioTotals);

/**
 * GET /api/portfolio/:customerId/scheme/:schemeCode
 * Get scheme portfolio details with transactions
 * Returns detailed information for a specific scheme holding
 * including recent transactions and statistics
 */
router.get('/:customerId/scheme/:schemeCode', portfolioController.getSchemePortfolioDetails);

/**
 * GET /api/portfolio/:customerId/monthly-units
 * Get monthly units tracking for a customer/scheme
 * Query params:
 *   - scheme_code: Required - Scheme code to track
 *   - months: Optional - Number of months (default: 12)
 * Returns monthly units movement (opening, closing, added, redeemed)
 */
router.get('/:customerId/monthly-units', portfolioController.getMonthlyUnits);

/**
 * GET /api/portfolio/:customerId/monthly-nav
 * Get monthly NAV performance for a customer/scheme
 * Query params:
 *   - scheme_code: Required - Scheme code to track
 *   - months: Optional - Number of months (default: 12)
 * Returns monthly NAV statistics (opening, closing, high, low, change %)
 */
router.get('/:customerId/monthly-nav', portfolioController.getMonthlyNAV);

/**
 * GET /api/portfolio/:customerId/monthly-market-value
 * Get monthly market value for a customer/scheme
 * Formula: Previous Month NAV × Current Month Units
 * Query params:
 *   - scheme_code: Required - Scheme code to track
 *   - months: Optional - Number of months (default: 12)
 * Returns monthly market values, invested amounts, and profit/loss
 */
router.get('/:customerId/monthly-market-value', portfolioController.getMonthlyMarketValue);

export default router;