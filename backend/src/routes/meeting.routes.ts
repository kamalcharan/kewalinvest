// backend/src/routes/meeting.routes.ts

import { Router } from 'express';
import { MeetingController } from '../controllers/meeting.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { environmentMiddleware } from '../middleware/environment.middleware';

const router = Router();
const meetingController = new MeetingController();

// Apply middleware
router.use(authMiddleware);
router.use(environmentMiddleware);

// CRUD operations
router.post('/', meetingController.createMeeting);
router.get('/', meetingController.getMeetings);
router.get('/upcoming', meetingController.getUpcomingMeetings);
router.get('/customer/:customerId/summary', meetingController.getCustomerMeetingSummary);
router.get('/:id', meetingController.getMeeting);
router.put('/:id', meetingController.updateMeeting);
router.delete('/:id', meetingController.deleteMeeting);

// Status updates
router.post('/:id/complete', meetingController.completeMeeting);
router.post('/:id/cancel', meetingController.cancelMeeting);

export default router;
