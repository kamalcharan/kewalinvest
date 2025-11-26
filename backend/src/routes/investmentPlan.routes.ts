// backend/src/routes/investmentPlan.routes.ts
// Routes for Investment Plan API (Release 1.1 - Phase 1)

import { Router } from 'express';
import { investmentPlanController } from '../controllers/investmentPlan.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { environmentMiddleware } from '../middleware/environment.middleware';

const router = Router();

// Apply middleware
router.use(authMiddleware);
router.use(environmentMiddleware);

/**
 * POST /api/customers/:customerId/investments
 * Create new investment plan for customer
 * Body: { asset_type_id, principal_amount, start_date, has_started, duration_months?, duration_years?, investment_type, recurring_amount?, investment_frequency?, custom_assumption_rate?, scheme_code?, notes? }
 */
router.post('/customers/:customerId/investments', investmentPlanController.createInvestmentPlan);

/**
 * GET /api/customers/:customerId/investments
 * Get all investment plans for a customer
 */
router.get('/customers/:customerId/investments', investmentPlanController.getCustomerInvestmentPlans);

/**
 * GET /api/customers/:customerId/investments/:id
 * Get single investment plan by ID
 */
router.get('/customers/:customerId/investments/:id', investmentPlanController.getInvestmentPlanById);

/**
 * PUT /api/customers/:customerId/investments/:id
 * Update investment plan
 * Body: { principal_amount?, start_date?, has_started?, duration_months?, duration_years?, investment_type?, recurring_amount?, investment_frequency?, custom_assumption_rate?, notes? }
 */
router.put('/customers/:customerId/investments/:id', investmentPlanController.updateInvestmentPlan);

/**
 * DELETE /api/customers/:customerId/investments/:id
 * Delete investment plan (soft delete)
 */
router.delete('/customers/:customerId/investments/:id', investmentPlanController.deleteInvestmentPlan);

/**
 * PATCH /api/customers/:customerId/investments/:id/toggle-alerts
 * Toggle alerts enabled/disabled for an investment plan
 */
router.patch('/customers/:customerId/investments/:id/toggle-alerts', investmentPlanController.toggleAlerts);

/**
 * GET /api/family/:familyHeadId/investments
 * Get family investment summary (aggregated across family members)
 * familyHeadId = iwell_code of family head
 */
router.get('/family/:familyHeadId/investments', investmentPlanController.getFamilyInvestments);

/**
 * POST /api/family/:familyHeadId/investments/bulk
 * Bulk assign investment plans to all family members
 * familyHeadId = iwell_code of family head
 * Body: Same as single investment plan creation
 */
router.post('/family/:familyHeadId/investments/bulk', investmentPlanController.bulkAssignToFamily);

export default router;
