// backend/src/routes/jtbd.unified.routes.ts
// Unified JTBD Routes - Handles both configurations and executions

import { Router } from 'express';
import { JTBDUnifiedController } from '../controllers/jtbd.unified.controller';
import { authenticate } from '../middleware/auth.middleware';
import { environmentMiddleware } from '../middleware/environment.middleware';

const router = Router();
const jtbdController = new JTBDUnifiedController();

// Apply authentication and environment middleware to all routes
router.use(authenticate);
router.use(environmentMiddleware);

// ============================================================================
// CONFIGURATION ROUTES
// ============================================================================

// List configurations (bot-friendly filtering)
// GET /api/jtbd/config?customer_id=123&category=alert&type=portfolio_alert&status=active
router.get('/config', jtbdController.getConfigs);

// Create configuration
router.post('/config', jtbdController.createConfig);

// Get single configuration
router.get('/config/:id', jtbdController.getConfig);

// Update configuration
router.patch('/config/:id', jtbdController.updateConfig);

// Delete configuration
router.delete('/config/:id', jtbdController.deleteConfig);

// ============================================================================
// EXECUTION ROUTES
// ============================================================================

// List executions (bot-friendly filtering)
// GET /api/jtbd/execution?customer_id=123&type=client_meeting&status=planned&from_date=2025-01-01
router.get('/execution', jtbdController.getExecutions);

// Upcoming executions (dashboard view)
// GET /api/jtbd/upcoming?days=30&type=client_meeting
router.get('/upcoming', jtbdController.getUpcoming);

// Create execution (meeting, SIP plan instance, etc.)
router.post('/execution', jtbdController.createExecution);

// Get single execution
router.get('/execution/:id', jtbdController.getExecution);

// Update execution
router.patch('/execution/:id', jtbdController.updateExecution);

// Complete execution
router.post('/execution/:id/complete', jtbdController.completeExecution);

// Cancel execution
router.post('/execution/:id/cancel', jtbdController.cancelExecution);

// Delete execution
router.delete('/execution/:id', jtbdController.deleteExecution);

// ============================================================================
// SUMMARY/DASHBOARD ROUTES
// ============================================================================

// Customer comprehensive summary (configs + executions)
// GET /api/jtbd/customer/:customerId/summary
router.get('/customer/:customerId/summary', jtbdController.getCustomerSummary);

// ============================================================================
// BOT-FRIENDLY QUERY EXAMPLES
// ============================================================================

/*
Example Bot Queries:

1. "Show all meetings next week"
   GET /api/jtbd/execution?type=client_meeting&from_date=2025-01-06&to_date=2025-01-12

2. "Who didn't execute this month's SIP?"
   GET /api/jtbd/execution?type=goal_sip_plan&status=not_executed&from_date=2025-01-01&to_date=2025-01-31

3. "Show overdue tasks"
   GET /api/jtbd/execution?status=due&to_date=2025-01-05

4. "Get all goals for customer 123"
   GET /api/jtbd/config?customer_id=123&category=transactional&type=goal_tracking

5. "Show all pending meetings for customer 456"
   GET /api/jtbd/execution?customer_id=456&type=client_meeting&status=planned

6. "Get upcoming portfolio alerts"
   GET /api/jtbd/upcoming?days=7&type=portfolio_alert

7. "Show all high priority tasks"
   GET /api/jtbd/execution?priority=high&status=planned
*/

export default router;
