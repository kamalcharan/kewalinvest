// backend/src/routes/market.routes.ts
// Market Data API Routes

import { Router } from 'express';
import { MarketController } from '../controllers/market.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { environmentMiddleware } from '../middleware/environment.middleware';

const router = Router();
const marketController = new MarketController();

// Apply middleware (FIXED - was missing)
router.use(authMiddleware);
router.use(environmentMiddleware);

// ==================== INDEX ROUTES ====================

/**
 * @route   GET /api/market/indices
 * @desc    Get all market indices with filtering
 * @query   search, category, download_status, page, page_size
 * @access  Private
 */
router.get('/indices', marketController.getAllIndices);

/**
 * @route   GET /api/market/indices/:id
 * @desc    Get specific index details
 * @param   id - Index ID
 * @access  Private
 */
router.get('/indices/:id', marketController.getIndexById);

// ==================== DATA ROUTES ====================

/**
 * @route   GET /api/market/data/:indexId
 * @desc    Get market data for an index with date range filtering
 * @param   indexId - Index ID
 * @query   start_date, end_date, page, page_size
 * @access  Private
 */
router.get('/data/:indexId', marketController.getMarketData);

/**
 * @route   GET /api/market/data/:indexId/latest
 * @desc    Get latest market data for an index
 * @param   indexId - Index ID
 * @access  Private
 */
router.get('/data/:indexId/latest', marketController.getLatestData);

/**
 * @route   DELETE /api/market/data/:indexId
 * @desc    Delete all data for an index
 * @param   indexId - Index ID
 * @access  Private
 */
router.delete('/data/:indexId', marketController.deleteAllData);

// ==================== DOWNLOAD ROUTES ====================

/**
 * @route   POST /api/market/download/historical
 * @desc    Trigger historical data download for an index
 * @body    { index_id, start_date, end_date, skip_existing }
 * @access  Private
 */
router.post('/download/historical', marketController.downloadHistorical);

/**
 * @route   POST /api/market/download/eod
 * @desc    Trigger EOD download for a specific index
 * @body    { index_id }
 * @access  Private
 */
router.post('/download/eod', marketController.downloadEOD);

/**
 * @route   POST /api/market/download/eod-all
 * @desc    Trigger EOD download for all indices (scheduler)
 * @access  Private
 */
router.post('/download/eod-all', marketController.downloadEODAll);

// ==================== STATISTICS & HEALTH ====================

/**
 * @route   GET /api/market/statistics
 * @desc    Get market data statistics
 * @access  Private
 */
router.get('/statistics', marketController.getStatistics);

/**
 * @route   GET /api/market/detailed-status
 * @desc    Get detailed status for all indices including download, metrics, and gaps
 * @desc    Used by Cruise Control -> Market Downloads UI
 * @access  Private
 */
router.get('/detailed-status', marketController.getDetailedStatus);

/**
 * @route   GET /api/market/health
 * @desc    Health check and Yahoo Finance connection test
 * @access  Private
 */
router.get('/health', marketController.healthCheck);

export default router;