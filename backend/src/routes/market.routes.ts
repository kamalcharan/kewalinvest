// backend/src/routes/market.routes.ts
// Market Data API Routes

import { Router } from 'express';
import { MarketController } from '../controllers/market.controller';

const router = Router();
const marketController = new MarketController();

// ==================== INDEX ROUTES ====================

/**
 * @route   GET /api/market/indices
 * @desc    Get all market indices with filtering
 * @query   search, category, download_status, page, page_size
 * @access  Public/Private (based on your auth setup)
 */
router.get('/indices', marketController.getAllIndices);

/**
 * @route   GET /api/market/indices/:id
 * @desc    Get specific index details
 * @param   id - Index ID
 * @access  Public/Private
 */
router.get('/indices/:id', marketController.getIndexById);

// ==================== DATA ROUTES ====================

/**
 * @route   GET /api/market/data/:indexId
 * @desc    Get market data for an index with date range filtering
 * @param   indexId - Index ID
 * @query   start_date, end_date, page, page_size
 * @access  Public/Private
 */
router.get('/data/:indexId', marketController.getMarketData);

/**
 * @route   GET /api/market/data/:indexId/latest
 * @desc    Get latest market data for an index
 * @param   indexId - Index ID
 * @access  Public/Private
 */
router.get('/data/:indexId/latest', marketController.getLatestData);

/**
 * @route   DELETE /api/market/data/:indexId
 * @desc    Delete all data for an index
 * @param   indexId - Index ID
 * @access  Private (requires authentication)
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
 * @access  Private/Internal
 */
router.post('/download/eod-all', marketController.downloadEODAll);

// ==================== STATISTICS & HEALTH ====================

/**
 * @route   GET /api/market/statistics
 * @desc    Get market data statistics
 * @access  Public/Private
 */
router.get('/statistics', marketController.getStatistics);

/**
 * @route   GET /api/market/health
 * @desc    Health check and Yahoo Finance connection test
 * @access  Public
 */
router.get('/health', marketController.healthCheck);

export default router;