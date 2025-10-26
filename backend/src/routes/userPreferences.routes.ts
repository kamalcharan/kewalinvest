// backend/src/routes/userPreferences.routes.ts
import { Router } from 'express';
import { userPreferencesController } from '../controllers/userPreferencesController';
import { authMiddleware } from '../middleware/auth.middleware';
import { environmentMiddleware } from '../middleware/environment.middleware';

const router = Router();

// Apply middleware to all routes
router.use(authMiddleware);
router.use(environmentMiddleware);

// Chart preference routes
// Get all chart preferences for authenticated user
router.get('/chart', userPreferencesController.getAllPreferences);

// Get chart preference for specific index
router.get('/chart/:indexId', userPreferencesController.getChartPreference);

// Save/update chart preference for specific index
router.post('/chart/:indexId', userPreferencesController.saveChartPreference);

// Delete chart preference for specific index (revert to theme default)
router.delete('/chart/:indexId', userPreferencesController.deleteChartPreference);

// Default comparison index routes
// Get default comparison index for authenticated user
router.get('/default-comparison-index', userPreferencesController.getDefaultComparisonIndex);

// Set default comparison index for authenticated user
router.post('/default-comparison-index', userPreferencesController.setDefaultComparisonIndex);

export default router;