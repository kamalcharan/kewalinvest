// backend/src/controllers/meeting.controller.ts

import { Request, Response } from 'express';
import { MeetingService } from '../services/meeting.service';
import {
  CreateMeetingRequest,
  UpdateMeetingRequest,
  CompleteMeetingRequest,
  CancelMeetingRequest,
  MeetingFilters
} from '../types/meeting.types';

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: number;
    tenant_id: number;
  };
  environment?: 'live' | 'test';
}

export class MeetingController {
  private meetingService: MeetingService;

  constructor() {
    this.meetingService = new MeetingService();
  }

  // ==================== CREATE ====================

  /**
   * Create new meeting
   * POST /api/meetings
   */
  createMeeting = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const data: CreateMeetingRequest = req.body;

      // Validation
      if (!data.customer_id || !data.meeting_type || !data.meeting_mode ||
          !data.scheduled_date || !data.scheduled_time) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: customer_id, meeting_type, meeting_mode, scheduled_date, scheduled_time'
        });
        return;
      }

      const meeting = await this.meetingService.createMeeting(
        user!.tenant_id,
        isLive,
        data,
        user!.user_id
      );

      res.status(201).json({
        success: true,
        data: meeting
      });
    } catch (error: any) {
      console.error('Error creating meeting:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create meeting'
      });
    }
  };

  // ==================== READ ====================

  /**
   * Get meeting by ID
   * GET /api/meetings/:id
   */
  getMeeting = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const meetingId = parseInt(req.params.id);

      if (isNaN(meetingId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid meeting ID'
        });
        return;
      }

      const meeting = await this.meetingService.getMeetingById(
        user!.tenant_id,
        isLive,
        meetingId
      );

      if (!meeting) {
        res.status(404).json({
          success: false,
          error: 'Meeting not found'
        });
        return;
      }

      res.json({
        success: true,
        data: meeting
      });
    } catch (error: any) {
      console.error('Error getting meeting:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get meeting'
      });
    }
  };

  /**
   * Get meetings with filters
   * GET /api/meetings
   */
  getMeetings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      const filters: MeetingFilters = {
        customer_id: req.query.customer_id ? parseInt(req.query.customer_id as string) : undefined,
        meeting_type: req.query.meeting_type as any,
        status: req.query.status as any,
        from_date: req.query.from_date as string,
        to_date: req.query.to_date as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        page_size: req.query.page_size ? parseInt(req.query.page_size as string) : 20
      };

      const result = await this.meetingService.getMeetings(
        user!.tenant_id,
        isLive,
        filters
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Error getting meetings:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get meetings'
      });
    }
  };

  /**
   * Get customer meeting summary
   * GET /api/meetings/customer/:customerId/summary
   */
  getCustomerMeetingSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const customerId = parseInt(req.params.customerId);

      if (isNaN(customerId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid customer ID'
        });
        return;
      }

      const summary = await this.meetingService.getCustomerMeetingSummary(
        user!.tenant_id,
        isLive,
        customerId
      );

      res.json({
        success: true,
        data: summary
      });
    } catch (error: any) {
      console.error('Error getting meeting summary:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get meeting summary'
      });
    }
  };

  /**
   * Get upcoming meetings dashboard
   * GET /api/meetings/upcoming
   */
  getUpcomingMeetings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const daysAhead = req.query.days_ahead ? parseInt(req.query.days_ahead as string) : 30;

      const meetings = await this.meetingService.getUpcomingMeetings(
        user!.tenant_id,
        isLive,
        daysAhead
      );

      res.json({
        success: true,
        data: meetings
      });
    } catch (error: any) {
      console.error('Error getting upcoming meetings:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get upcoming meetings'
      });
    }
  };

  // ==================== UPDATE ====================

  /**
   * Update meeting
   * PUT /api/meetings/:id
   */
  updateMeeting = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const meetingId = parseInt(req.params.id);
      const data: UpdateMeetingRequest = req.body;

      if (isNaN(meetingId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid meeting ID'
        });
        return;
      }

      const meeting = await this.meetingService.updateMeeting(
        user!.tenant_id,
        isLive,
        meetingId,
        data
      );

      res.json({
        success: true,
        data: meeting
      });
    } catch (error: any) {
      console.error('Error updating meeting:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update meeting'
      });
    }
  };

  /**
   * Complete meeting
   * POST /api/meetings/:id/complete
   */
  completeMeeting = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const meetingId = parseInt(req.params.id);
      const data: CompleteMeetingRequest = req.body;

      if (isNaN(meetingId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid meeting ID'
        });
        return;
      }

      const meeting = await this.meetingService.completeMeeting(
        user!.tenant_id,
        isLive,
        meetingId,
        data
      );

      res.json({
        success: true,
        data: meeting,
        message: 'Meeting marked as completed'
      });
    } catch (error: any) {
      console.error('Error completing meeting:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to complete meeting'
      });
    }
  };

  /**
   * Cancel meeting
   * POST /api/meetings/:id/cancel
   */
  cancelMeeting = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const meetingId = parseInt(req.params.id);
      const data: CancelMeetingRequest = req.body;

      if (isNaN(meetingId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid meeting ID'
        });
        return;
      }

      if (!data.cancellation_reason) {
        res.status(400).json({
          success: false,
          error: 'Cancellation reason is required'
        });
        return;
      }

      const meeting = await this.meetingService.cancelMeeting(
        user!.tenant_id,
        isLive,
        meetingId,
        data
      );

      res.json({
        success: true,
        data: meeting,
        message: 'Meeting cancelled'
      });
    } catch (error: any) {
      console.error('Error cancelling meeting:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to cancel meeting'
      });
    }
  };

  // ==================== DELETE ====================

  /**
   * Delete meeting
   * DELETE /api/meetings/:id
   */
  deleteMeeting = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const meetingId = parseInt(req.params.id);

      if (isNaN(meetingId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid meeting ID'
        });
        return;
      }

      await this.meetingService.deleteMeeting(
        user!.tenant_id,
        isLive,
        meetingId
      );

      res.json({
        success: true,
        message: 'Meeting deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting meeting:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete meeting'
      });
    }
  };
}
