// backend/src/routes/transaction.routes.ts

import express from 'express';
import { TransactionController } from '../controllers/transaction.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();
const transactionController = new TransactionController();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/transactions/summary
 * Get transaction summary statistics
 * Must be before /:id route to avoid conflict
 */
router.get('/summary', transactionController.getTransactionSummary);

/**
 * GET /api/transactions
 * Get list of transactions with filters and pagination
 * Query params:
 *   - customer_id: Filter by customer
 *   - scheme_code: Filter by scheme
 *   - start_date: Filter by start date (YYYY-MM-DD)
 *   - end_date: Filter by end date (YYYY-MM-DD)
 *   - txn_type_id: Filter by transaction type
 *   - is_potential_duplicate: Filter duplicates only (true/false)
 *   - portfolio_flag: Filter by portfolio inclusion (true/false)
 *   - page: Page number (default: 1)
 *   - page_size: Records per page (default: 100)
 *   - sort_by: Sort field (default: txn_date)
 *   - sort_order: Sort direction (asc/desc, default: desc)
 */
router.get('/', transactionController.getTransactions);

/**
 * GET /api/transactions/:id
 * Get transaction by ID with full details including staging data
 */
router.get('/:id', transactionController.getTransactionById);

/**
 * POST /api/transactions
 * Create new transaction (manual entry)
 * Body: {
 *   customer_id: number,
 *   scheme_code: string,
 *   scheme_name: string,
 *   folio_no?: string,
 *   txn_type_id: number,
 *   txn_date: string (YYYY-MM-DD),
 *   total_amount: number,
 *   units: number,
 *   nav: number,
 *   stamp_duty?: number
 * }
 */
router.post('/', transactionController.createTransaction);

/**
 * PUT /api/transactions/:id
 * Update transaction
 * Body: {
 *   scheme_name?: string,
 *   folio_no?: string,
 *   txn_type_id?: number,
 *   txn_date?: string,
 *   total_amount?: number,
 *   units?: number,
 *   nav?: number,
 *   stamp_duty?: number,
 *   portfolio_flag?: boolean,
 *   is_active?: boolean
 * }
 */
router.put('/:id', transactionController.updateTransaction);

/**
 * PATCH /api/transactions/:id/portfolio-flag
 * Toggle portfolio flag to include/exclude from totals
 * Body: {
 *   portfolio_flag: boolean
 * }
 */
router.patch('/:id/portfolio-flag', transactionController.updatePortfolioFlag);

/**
 * DELETE /api/transactions/:id
 * Delete transaction (soft delete)
 */
router.delete('/:id', transactionController.deleteTransaction);

export default router;