// backend/src/controllers/transaction.controller.ts

import { Request, Response } from 'express';
import { TransactionService } from '../services/transaction.service';
import { TransactionFilters } from '../types/transaction.types';

interface AuthRequest extends Request {
  user?: {
    user_id: number;
    username: string;
    email: string;
    tenant_id: number;
  };
}

export class TransactionController {
  private transactionService: TransactionService;

  constructor() {
    this.transactionService = new TransactionService();
  }

  /**
   * GET /api/transactions
   * Get list of transactions with filters
   */
  getTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const isLive = req.headers['x-environment'] === 'live';

      const filters: TransactionFilters = {
        customer_id: req.query.customer_id ? parseInt(req.query.customer_id as string) : undefined,
        scheme_code: req.query.scheme_code as string,
        start_date: req.query.start_date as string,
        end_date: req.query.end_date as string,
        txn_type_id: req.query.txn_type_id ? parseInt(req.query.txn_type_id as string) : undefined,
        is_potential_duplicate: req.query.is_potential_duplicate === 'true' ? true : 
                               req.query.is_potential_duplicate === 'false' ? false : undefined,
        portfolio_flag: req.query.portfolio_flag === 'true' ? true :
                       req.query.portfolio_flag === 'false' ? false : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        page_size: req.query.page_size ? parseInt(req.query.page_size as string) : 100,
        sort_by: req.query.sort_by as string || 'txn_date',
        sort_order: (req.query.sort_order as 'asc' | 'desc') || 'desc'
      };

      const result = await this.transactionService.getTransactions(
        user.tenant_id,
        isLive,
        filters
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Error getting transactions:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get transactions'
      });
    }
  };

  /**
   * GET /api/transactions/:id
   * Get transaction by ID with full details
   */
  getTransactionById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const isLive = req.headers['x-environment'] === 'live';

      if (!id || isNaN(parseInt(id))) {
        res.status(400).json({
          success: false,
          error: 'Invalid transaction ID'
        });
        return;
      }

      const transaction = await this.transactionService.getTransactionById(
        user.tenant_id,
        isLive,
        parseInt(id)
      );

      if (!transaction) {
        res.status(404).json({
          success: false,
          error: 'Transaction not found'
        });
        return;
      }

      res.json({
        success: true,
        data: transaction
      });
    } catch (error: any) {
      console.error('Error getting transaction:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get transaction'
      });
    }
  };

  /**
   * POST /api/transactions
   * Create new transaction (manual entry)
   */
  createTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const isLive = req.headers['x-environment'] === 'live';

      // Validate required fields
      const requiredFields = ['customer_id', 'scheme_code', 'scheme_name', 'txn_type_id', 'txn_date', 'total_amount', 'units', 'nav'];
      const missingFields = requiredFields.filter(field => !req.body[field]);

      if (missingFields.length > 0) {
        res.status(400).json({
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}`
        });
        return;
      }

      const transaction = await this.transactionService.createTransaction(
        user.tenant_id,
        isLive,
        req.body,
        user.user_id
      );

      res.status(201).json({
        success: true,
        data: transaction,
        message: 'Transaction created successfully'
      });
    } catch (error: any) {
      console.error('Error creating transaction:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create transaction'
      });
    }
  };

  /**
   * PUT /api/transactions/:id
   * Update transaction
   */
  updateTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const isLive = req.headers['x-environment'] === 'live';

      if (!id || isNaN(parseInt(id))) {
        res.status(400).json({
          success: false,
          error: 'Invalid transaction ID'
        });
        return;
      }

      const transaction = await this.transactionService.updateTransaction(
        user.tenant_id,
        isLive,
        parseInt(id),
        req.body
      );

      if (!transaction) {
        res.status(404).json({
          success: false,
          error: 'Transaction not found'
        });
        return;
      }

      res.json({
        success: true,
        data: transaction,
        message: 'Transaction updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating transaction:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update transaction'
      });
    }
  };

  /**
   * PATCH /api/transactions/:id/portfolio-flag
   * Toggle portfolio flag to include/exclude from totals
   */
  updatePortfolioFlag = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const isLive = req.headers['x-environment'] === 'live';

      if (!id || isNaN(parseInt(id))) {
        res.status(400).json({
          success: false,
          error: 'Invalid transaction ID'
        });
        return;
      }

      if (typeof req.body.portfolio_flag !== 'boolean') {
        res.status(400).json({
          success: false,
          error: 'portfolio_flag must be a boolean value'
        });
        return;
      }

      const result = await this.transactionService.updatePortfolioFlag(
        user.tenant_id,
        isLive,
        parseInt(id),
        { portfolio_flag: req.body.portfolio_flag }
      );

      if (!result) {
        res.status(404).json({
          success: false,
          error: 'Transaction not found'
        });
        return;
      }

      res.json({
        success: true,
        data: result,
        message: 'Portfolio flag updated. Totals will be recalculated.'
      });
    } catch (error: any) {
      console.error('Error updating portfolio flag:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update portfolio flag'
      });
    }
  };

  /**
   * DELETE /api/transactions/:id
   * Delete transaction (soft delete)
   */
  deleteTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const isLive = req.headers['x-environment'] === 'live';

      if (!id || isNaN(parseInt(id))) {
        res.status(400).json({
          success: false,
          error: 'Invalid transaction ID'
        });
        return;
      }

      const success = await this.transactionService.deleteTransaction(
        user.tenant_id,
        isLive,
        parseInt(id)
      );

      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Transaction not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Transaction deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting transaction:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete transaction'
      });
    }
  };

  /**
   * GET /api/transactions/summary
   * Get transaction summary statistics
   */
  getTransactionSummary = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const isLive = req.headers['x-environment'] === 'live';

      const filters: TransactionFilters = {
        customer_id: req.query.customer_id ? parseInt(req.query.customer_id as string) : undefined,
        scheme_code: req.query.scheme_code as string,
        start_date: req.query.start_date as string,
        end_date: req.query.end_date as string
      };

      const summary = await this.transactionService.getTransactionSummary(
        user.tenant_id,
        isLive,
        filters
      );

      res.json({
        success: true,
        data: summary
      });
    } catch (error: any) {
      console.error('Error getting transaction summary:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get transaction summary'
      });
    }
  };
}