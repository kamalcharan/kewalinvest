// backend/src/routes/customer.routes.ts

import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { environmentMiddleware } from '../middleware/environment.middleware';

const router = Router();
const customerController = new CustomerController();

// Apply middleware
router.use(authMiddleware);
router.use(environmentMiddleware);

// Customer routes
router.get('/', customerController.getCustomers);
router.get('/stats', customerController.getCustomerStats);
router.post('/', customerController.createCustomer);
router.get('/:id', customerController.getCustomer);
router.put('/:id', customerController.updateCustomer);
router.delete('/:id', customerController.deleteCustomer);

// Address routes
router.post('/:id/addresses', customerController.addAddress);
router.put('/:id/addresses/:addressId', customerController.updateAddress);
router.delete('/:id/addresses/:addressId', customerController.deleteAddress);

export default router;