// backend/src/services/meeting.service.ts

import { Pool } from 'pg';
import { pool } from '../config/database';
import {
  CustomerMeeting,
  CreateMeetingRequest,
  UpdateMeetingRequest,
  CompleteMeetingRequest,
  CancelMeetingRequest,
  MeetingFilters,
  CustomerMeetingSummary,
  UpcomingMeeting
} from '../types/meeting.types';

export class MeetingService {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  // ==================== CREATE ====================

  /**
   * Create new customer meeting
   */
  async createMeeting(
    tenantId: number,
    isLive: boolean,
    data: CreateMeetingRequest,
    createdBy: number
  ): Promise<CustomerMeeting> {
    const query = `
      INSERT INTO t_customer_meetings (
        tenant_id, is_live, customer_id, meeting_type, meeting_mode,
        scheduled_date, scheduled_time, duration_minutes,
        meeting_location, meeting_link, agenda, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'scheduled', $12)
      RETURNING *
    `;

    const values = [
      tenantId,
      isLive,
      data.customer_id,
      data.meeting_type,
      data.meeting_mode,
      data.scheduled_date,
      data.scheduled_time,
      data.duration_minutes || 60,
      data.meeting_location || null,
      data.meeting_link || null,
      data.agenda || null,
      createdBy
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  // ==================== READ ====================

  /**
   * Get meeting by ID
   */
  async getMeetingById(
    tenantId: number,
    isLive: boolean,
    meetingId: number
  ): Promise<CustomerMeeting | null> {
    const query = `
      SELECT * FROM t_customer_meetings
      WHERE tenant_id = $1 AND is_live = $2 AND id = $3
    `;

    const result = await this.db.query(query, [tenantId, isLive, meetingId]);
    return result.rows[0] || null;
  }

  /**
   * Get meetings with filters and pagination
   */
  async getMeetings(
    tenantId: number,
    isLive: boolean,
    filters: MeetingFilters
  ): Promise<{
    meetings: CustomerMeeting[];
    pagination: {
      page: number;
      page_size: number;
      total: number;
      total_pages: number;
    };
  }> {
    const page = filters.page || 1;
    const pageSize = filters.page_size || 20;
    const offset = (page - 1) * pageSize;

    // Build WHERE conditions
    const conditions: string[] = ['tenant_id = $1', 'is_live = $2'];
    const params: any[] = [tenantId, isLive];
    let paramIndex = 3;

    if (filters.customer_id) {
      conditions.push(`customer_id = $${paramIndex}`);
      params.push(filters.customer_id);
      paramIndex++;
    }

    if (filters.meeting_type) {
      conditions.push(`meeting_type = $${paramIndex}`);
      params.push(filters.meeting_type);
      paramIndex++;
    }

    if (filters.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.from_date) {
      conditions.push(`scheduled_date >= $${paramIndex}`);
      params.push(filters.from_date);
      paramIndex++;
    }

    if (filters.to_date) {
      conditions.push(`scheduled_date <= $${paramIndex}`);
      params.push(filters.to_date);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Count total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM t_customer_meetings
      WHERE ${whereClause}
    `;
    const countResult = await this.db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated data
    const dataQuery = `
      SELECT *
      FROM t_customer_meetings
      WHERE ${whereClause}
      ORDER BY scheduled_date DESC, scheduled_time DESC, created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const dataResult = await this.db.query(dataQuery, [...params, pageSize, offset]);

    return {
      meetings: dataResult.rows,
      pagination: {
        page,
        page_size: pageSize,
        total,
        total_pages: Math.ceil(total / pageSize)
      }
    };
  }

  /**
   * Get customer meeting summary
   */
  async getCustomerMeetingSummary(
    tenantId: number,
    isLive: boolean,
    customerId: number
  ): Promise<CustomerMeetingSummary> {
    // Get counts
    const countsQuery = `
      SELECT
        COUNT(*) as total_meetings,
        COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_count,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count
      FROM t_customer_meetings
      WHERE tenant_id = $1 AND is_live = $2 AND customer_id = $3
    `;
    const countsResult = await this.db.query(countsQuery, [tenantId, isLive, customerId]);
    const counts = countsResult.rows[0];

    // Get next meeting
    const nextMeetingQuery = `
      SELECT id, scheduled_date, scheduled_time, meeting_type,
             DATE_PART('day', scheduled_date::timestamp - CURRENT_DATE) as days_until
      FROM t_customer_meetings
      WHERE tenant_id = $1 AND is_live = $2 AND customer_id = $3
        AND status = 'scheduled'
        AND scheduled_date >= CURRENT_DATE
      ORDER BY scheduled_date ASC, scheduled_time ASC
      LIMIT 1
    `;
    const nextMeetingResult = await this.db.query(nextMeetingQuery, [tenantId, isLive, customerId]);

    // Get last completed meeting
    const lastMeetingQuery = `
      SELECT id, completed_at, meeting_type,
             DATE_PART('day', CURRENT_DATE - completed_at::date) as days_ago
      FROM t_customer_meetings
      WHERE tenant_id = $1 AND is_live = $2 AND customer_id = $3
        AND status = 'completed'
        AND completed_at IS NOT NULL
      ORDER BY completed_at DESC
      LIMIT 1
    `;
    const lastMeetingResult = await this.db.query(lastMeetingQuery, [tenantId, isLive, customerId]);

    return {
      customer_id: customerId,
      total_meetings: parseInt(counts.total_meetings),
      scheduled_count: parseInt(counts.scheduled_count),
      completed_count: parseInt(counts.completed_count),
      cancelled_count: parseInt(counts.cancelled_count),
      next_meeting: nextMeetingResult.rows[0] ? {
        id: nextMeetingResult.rows[0].id,
        scheduled_date: nextMeetingResult.rows[0].scheduled_date,
        scheduled_time: nextMeetingResult.rows[0].scheduled_time,
        meeting_type: nextMeetingResult.rows[0].meeting_type,
        days_until: parseInt(nextMeetingResult.rows[0].days_until)
      } : undefined,
      last_meeting: lastMeetingResult.rows[0] ? {
        id: lastMeetingResult.rows[0].id,
        completed_at: lastMeetingResult.rows[0].completed_at,
        meeting_type: lastMeetingResult.rows[0].meeting_type,
        days_ago: parseInt(lastMeetingResult.rows[0].days_ago)
      } : undefined
    };
  }

  /**
   * Get upcoming meetings across all customers
   * For dashboard view
   */
  async getUpcomingMeetings(
    tenantId: number,
    isLive: boolean,
    daysAhead: number = 30
  ): Promise<UpcomingMeeting[]> {
    const query = `
      SELECT
        m.id,
        m.customer_id,
        c.name as customer_name,
        m.meeting_type,
        m.scheduled_date,
        m.scheduled_time,
        DATE_PART('day', m.scheduled_date::timestamp - CURRENT_DATE) as days_until,
        (m.scheduled_date = CURRENT_DATE) as is_today,
        (m.scheduled_date = CURRENT_DATE + INTERVAL '1 day') as is_tomorrow,
        (m.scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days') as is_this_week
      FROM t_customer_meetings m
      JOIN t_customers c ON c.id = m.customer_id AND c.tenant_id = m.tenant_id AND c.is_live = m.is_live
      WHERE m.tenant_id = $1
        AND m.is_live = $2
        AND m.status = 'scheduled'
        AND m.scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${daysAhead} days'
      ORDER BY m.scheduled_date ASC, m.scheduled_time ASC
    `;

    const result = await this.db.query(query, [tenantId, isLive]);

    return result.rows.map(row => ({
      id: row.id,
      customer_id: row.customer_id,
      customer_name: row.customer_name,
      meeting_type: row.meeting_type,
      scheduled_date: row.scheduled_date,
      scheduled_time: row.scheduled_time,
      days_until: parseInt(row.days_until),
      is_today: row.is_today,
      is_tomorrow: row.is_tomorrow,
      is_this_week: row.is_this_week
    }));
  }

  // ==================== UPDATE ====================

  /**
   * Update meeting details
   */
  async updateMeeting(
    tenantId: number,
    isLive: boolean,
    meetingId: number,
    data: UpdateMeetingRequest
  ): Promise<CustomerMeeting> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.meeting_type !== undefined) {
      updates.push(`meeting_type = $${paramIndex}`);
      params.push(data.meeting_type);
      paramIndex++;
    }

    if (data.meeting_mode !== undefined) {
      updates.push(`meeting_mode = $${paramIndex}`);
      params.push(data.meeting_mode);
      paramIndex++;
    }

    if (data.scheduled_date !== undefined) {
      updates.push(`scheduled_date = $${paramIndex}`);
      params.push(data.scheduled_date);
      paramIndex++;
    }

    if (data.scheduled_time !== undefined) {
      updates.push(`scheduled_time = $${paramIndex}`);
      params.push(data.scheduled_time);
      paramIndex++;
    }

    if (data.duration_minutes !== undefined) {
      updates.push(`duration_minutes = $${paramIndex}`);
      params.push(data.duration_minutes);
      paramIndex++;
    }

    if (data.meeting_location !== undefined) {
      updates.push(`meeting_location = $${paramIndex}`);
      params.push(data.meeting_location);
      paramIndex++;
    }

    if (data.meeting_link !== undefined) {
      updates.push(`meeting_link = $${paramIndex}`);
      params.push(data.meeting_link);
      paramIndex++;
    }

    if (data.agenda !== undefined) {
      updates.push(`agenda = $${paramIndex}`);
      params.push(data.agenda);
      paramIndex++;
    }

    if (data.notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      params.push(data.notes);
      paramIndex++;
    }

    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      params.push(data.status);
      paramIndex++;
    }

    updates.push(`updated_at = NOW()`);

    const query = `
      UPDATE t_customer_meetings
      SET ${updates.join(', ')}
      WHERE tenant_id = $${paramIndex}
        AND is_live = $${paramIndex + 1}
        AND id = $${paramIndex + 2}
      RETURNING *
    `;

    params.push(tenantId, isLive, meetingId);
    const result = await this.db.query(query, params);

    if (result.rows.length === 0) {
      throw new Error('Meeting not found');
    }

    return result.rows[0];
  }

  /**
   * Mark meeting as completed
   */
  async completeMeeting(
    tenantId: number,
    isLive: boolean,
    meetingId: number,
    data: CompleteMeetingRequest
  ): Promise<CustomerMeeting> {
    const query = `
      UPDATE t_customer_meetings
      SET status = 'completed',
          completed_at = $1,
          notes = COALESCE($2, notes),
          outcome = $3,
          updated_at = NOW()
      WHERE tenant_id = $4 AND is_live = $5 AND id = $6
      RETURNING *
    `;

    const completedAt = data.completed_at || new Date().toISOString();
    const result = await this.db.query(query, [
      completedAt,
      data.notes || null,
      data.outcome || null,
      tenantId,
      isLive,
      meetingId
    ]);

    if (result.rows.length === 0) {
      throw new Error('Meeting not found');
    }

    return result.rows[0];
  }

  /**
   * Cancel meeting
   */
  async cancelMeeting(
    tenantId: number,
    isLive: boolean,
    meetingId: number,
    data: CancelMeetingRequest
  ): Promise<CustomerMeeting> {
    const query = `
      UPDATE t_customer_meetings
      SET status = 'cancelled',
          cancelled_at = NOW(),
          cancellation_reason = $1,
          updated_at = NOW()
      WHERE tenant_id = $2 AND is_live = $3 AND id = $4
      RETURNING *
    `;

    const result = await this.db.query(query, [
      data.cancellation_reason,
      tenantId,
      isLive,
      meetingId
    ]);

    if (result.rows.length === 0) {
      throw new Error('Meeting not found');
    }

    return result.rows[0];
  }

  // ==================== DELETE ====================

  /**
   * Delete meeting
   */
  async deleteMeeting(
    tenantId: number,
    isLive: boolean,
    meetingId: number
  ): Promise<void> {
    const query = `
      DELETE FROM t_customer_meetings
      WHERE tenant_id = $1 AND is_live = $2 AND id = $3
    `;

    const result = await this.db.query(query, [tenantId, isLive, meetingId]);

    if (result.rowCount === 0) {
      throw new Error('Meeting not found');
    }
  }
}
