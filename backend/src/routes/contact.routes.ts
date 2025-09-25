// backend/src/routes/contact.routes.ts
import { Router } from 'express';
import { ContactController } from '../controllers/contact.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { environmentMiddleware } from '../middleware/environment.middleware';

const router = Router();
const contactController = new ContactController();

router.use(authMiddleware);
router.use(environmentMiddleware);

// Core contact routes that work
router.get('/', contactController.getContacts);
router.get('/stats', contactController.getContactStats);
router.post('/', contactController.createContact);
router.get('/:id', contactController.getContact);
router.put('/:id', contactController.updateContact);
router.delete('/:id', contactController.deleteContact);

// Convert contact to customer - ADD THIS LINE
router.post('/:id/convert-to-customer', contactController.convertToCustomer);

// Placeholder routes that return "not implemented" messages
router.get('/search/:query', contactController.searchContacts);
router.get('/check-exists', contactController.checkContactExists);
router.get('/export', contactController.exportContacts);
router.post('/bulk', contactController.bulkAction);

// Channel routes (returning not implemented for now)
router.post('/:id/channels', contactController.addChannel);

export default router;