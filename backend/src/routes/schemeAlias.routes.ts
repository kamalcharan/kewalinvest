// backend/src/routes/schemeAlias.routes.ts

import express from 'express';
import { SchemeAliasController } from '../controllers/schemeAlias.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();
const schemeAliasController = new SchemeAliasController();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/scheme-aliases/statistics
 * Get alias statistics for dashboard
 * Must be before /:id route to avoid conflict
 */
router.get('/statistics', schemeAliasController.getStatistics);

/**
 * POST /api/scheme-aliases/lookup
 * Lookup scheme by alias name (for testing/debugging)
 * Body: { alias_name: string }
 * Query: ?alias_name=xxx
 */
router.post('/lookup', schemeAliasController.lookupByAlias);

/**
 * POST /api/scheme-aliases/bulk
 * Bulk create multiple aliases for one scheme
 * Body: {
 *   scheme_code: string,
 *   aliases: string[],
 *   source?: 'manual' | 'import'
 * }
 */
router.post('/bulk', schemeAliasController.bulkCreateAliases);

/**
 * POST /api/scheme-aliases/backfill
 * Backfill missing aliases for all schemes
 * Auto-creates aliases from scheme_name and scheme_nav_name
 */
router.post('/backfill', schemeAliasController.backfillAliases);

/**
 * GET /api/scheme-aliases
 * Get list of aliases with optional filters
 * Query params:
 *   - scheme_id: Filter by specific scheme ID
 *   - scheme_code: Filter by scheme code
 *   - search: Search in alias name or scheme name
 *   - source: Filter by source (auto/manual/import)
 *   - is_active: Filter by active status (true/false)
 *   - page: Page number (default: 1)
 *   - page_size: Records per page (default: 100)
 */
router.get('/', schemeAliasController.getAliases);

/**
 * GET /api/scheme-aliases/:id
 * Get single alias by ID
 */
router.get('/:id', schemeAliasController.getAliasById);

/**
 * POST /api/scheme-aliases
 * Create new scheme alias
 * Body: {
 *   scheme_id?: number,          // Either scheme_id
 *   scheme_code?: string,        // OR scheme_code
 *   alias_name: string,          // Required: the alias to create
 *   source?: 'manual' | 'import' // Optional: defaults to 'manual'
 * }
 */
router.post('/', schemeAliasController.createAlias);

/**
 * PUT /api/scheme-aliases/:id
 * Update existing alias
 * Body: {
 *   alias_name?: string,
 *   is_active?: boolean
 * }
 */
router.put('/:id', schemeAliasController.updateAlias);

/**
 * DELETE /api/scheme-aliases/:id
 * Delete (deactivate) alias
 * Soft delete - sets is_active = false
 */
router.delete('/:id', schemeAliasController.deleteAlias);

export default router;
