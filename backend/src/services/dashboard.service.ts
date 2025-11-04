// backend/src/services/dashboard.service.ts

import { Pool } from 'pg';
import { pool } from '../config/database';

export interface DashboardStatistics {
  total_customers: number;
  total_goals: number;
  bookmarked_goals: number;
  goals_behind: number;
  upcoming_meetings_count: number;
  pending_alerts: number;
}

export interface GoalDeviation {
  id: number;
  customer_id: number;
  customer_name: string;
  goal_type: string;
  goal_config: any;
  current_value: number | null;
  target_value: number | null;
  target_date: string | null;
  deviation_percentage: number;
  status: string;
  days_remaining: number | null;
  is_bookmarked: boolean;
}

export interface UpcomingMeeting {
  id: number;
  customer_id: number;
  customer_name: string;
  meeting_type: string;
  meeting_mode: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  meeting_location: string | null;
  meeting_link: string | null;
  agenda: string | null;
  days_until: number;
}

export interface DashboardAlert {
  id: number;
  type: string;
  severity: string;
  message: string;
  customer_id: number | null;
  customer_name: string | null;
  created_at: string;
}

export class DashboardService {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  /**
   * Get overall dashboard statistics
   */
  async getDashboardStatistics(
    tenantId: number,
    isLive: boolean
  ): Promise<DashboardStatistics> {
    // Total customers
    const customersQuery = `
      SELECT COUNT(*) as count
      FROM t_customers
      WHERE tenant_id = $1 AND is_live = $2 AND status = 'active'
    `;
    const customersResult = await this.db.query(customersQuery, [tenantId, isLive]);

    // Total goals and bookmarked goals
    const goalsQuery = `
      SELECT
        COUNT(*) as total_goals,
        COUNT(CASE WHEN is_bookmarked = true THEN 1 END) as bookmarked_goals,
        COUNT(CASE WHEN tracking_status = 'BEHIND' THEN 1 END) as goals_behind
      FROM t_goals
      WHERE tenant_id = $1 AND is_live = $2 AND status = 'active'
    `;
    const goalsResult = await this.db.query(goalsQuery, [tenantId, isLive]);

    // Upcoming meetings (next 30 days)
    const meetingsQuery = `
      SELECT COUNT(*) as count
      FROM t_customer_meetings
      WHERE tenant_id = $1 AND is_live = $2
        AND status = 'scheduled'
        AND scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
    `;
    const meetingsResult = await this.db.query(meetingsQuery, [tenantId, isLive]);

    return {
      total_customers: parseInt(customersResult.rows[0].count),
      total_goals: parseInt(goalsResult.rows[0].total_goals),
      bookmarked_goals: parseInt(goalsResult.rows[0].bookmarked_goals),
      goals_behind: parseInt(goalsResult.rows[0].goals_behind),
      upcoming_meetings_count: parseInt(meetingsResult.rows[0].count),
      pending_alerts: 0 // TODO: Implement when alert system is complete
    };
  }

  /**
   * Get top goal deviations (goals that are behind/at risk)
   */
  async getGoalDeviations(
    tenantId: number,
    isLive: boolean,
    limit: number = 10
  ): Promise<GoalDeviation[]> {
    const query = `
      SELECT
        g.id,
        g.customer_id,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        g.goal_type,
        g.goal_config,
        g.current_value,
        g.target_value,
        g.target_date,
        g.tracking_status as status,
        g.is_bookmarked,
        CASE
          WHEN g.target_date IS NOT NULL
          THEN DATE_PART('day', g.target_date::timestamp - CURRENT_DATE::timestamp)
          ELSE NULL
        END as days_remaining,
        CASE
          WHEN g.target_value > 0 AND g.current_value IS NOT NULL
          THEN ((g.current_value - g.target_value) / g.target_value * 100)
          ELSE 0
        END as deviation_percentage
      FROM t_goals g
      INNER JOIN t_customers c ON c.id = g.customer_id AND c.tenant_id = g.tenant_id AND c.is_live = g.is_live
      WHERE g.tenant_id = $1
        AND g.is_live = $2
        AND g.status = 'active'
        AND g.is_bookmarked = true
        AND g.tracking_status IN ('BEHIND', 'AT_RISK')
      ORDER BY
        CASE g.tracking_status
          WHEN 'BEHIND' THEN 1
          WHEN 'AT_RISK' THEN 2
          ELSE 3
        END,
        ABS(
          CASE
            WHEN g.target_value > 0 AND g.current_value IS NOT NULL
            THEN ((g.current_value - g.target_value) / g.target_value * 100)
            ELSE 0
          END
        ) DESC
      LIMIT $3
    `;

    const result = await this.db.query(query, [tenantId, isLive, limit]);
    return result.rows;
  }

  /**
   * Get upcoming meetings (next 30 days)
   */
  async getUpcomingMeetings(
    tenantId: number,
    isLive: boolean,
    limit: number = 10
  ): Promise<UpcomingMeeting[]> {
    const query = `
      SELECT
        m.id,
        m.customer_id,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        m.meeting_type,
        m.meeting_mode,
        m.scheduled_date,
        m.scheduled_time,
        m.duration_minutes,
        m.meeting_location,
        m.meeting_link,
        m.agenda,
        DATE_PART('day', m.scheduled_date::timestamp - CURRENT_DATE::timestamp) as days_until
      FROM t_customer_meetings m
      INNER JOIN t_customers c ON c.id = m.customer_id AND c.tenant_id = m.tenant_id AND c.is_live = m.is_live
      WHERE m.tenant_id = $1
        AND m.is_live = $2
        AND m.status = 'scheduled'
        AND m.scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      ORDER BY m.scheduled_date ASC, m.scheduled_time ASC
      LIMIT $3
    `;

    const result = await this.db.query(query, [tenantId, isLive, limit]);
    return result.rows;
  }

  /**
   * Get all bookmarked goals for exploration
   */
  async getBookmarkedGoals(
    tenantId: number,
    isLive: boolean,
    filters?: {
      status?: string;
      tracking_status?: string;
      page?: number;
      page_size?: number;
    }
  ): Promise<{
    goals: GoalDeviation[];
    pagination: {
      page: number;
      page_size: number;
      total: number;
      total_pages: number;
    };
  }> {
    const page = filters?.page || 1;
    const pageSize = filters?.page_size || 20;
    const offset = (page - 1) * pageSize;

    let whereConditions = `
      WHERE g.tenant_id = $1
        AND g.is_live = $2
        AND g.is_bookmarked = true
    `;

    const queryParams: any[] = [tenantId, isLive];
    let paramCounter = 3;

    if (filters?.status) {
      whereConditions += ` AND g.status = $${paramCounter}`;
      queryParams.push(filters.status);
      paramCounter++;
    }

    if (filters?.tracking_status) {
      whereConditions += ` AND g.tracking_status = $${paramCounter}`;
      queryParams.push(filters.tracking_status);
      paramCounter++;
    }

    // Count total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM t_goals g
      ${whereConditions}
    `;
    const countResult = await this.db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get goals
    const goalsQuery = `
      SELECT
        g.id,
        g.customer_id,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        g.goal_type,
        g.goal_config,
        g.current_value,
        g.target_value,
        g.target_date,
        g.tracking_status as status,
        g.is_bookmarked,
        CASE
          WHEN g.target_date IS NOT NULL
          THEN DATE_PART('day', g.target_date::timestamp - CURRENT_DATE::timestamp)
          ELSE NULL
        END as days_remaining,
        CASE
          WHEN g.target_value > 0 AND g.current_value IS NOT NULL
          THEN ((g.current_value - g.target_value) / g.target_value * 100)
          ELSE 0
        END as deviation_percentage
      FROM t_goals g
      INNER JOIN t_customers c ON c.id = g.customer_id AND c.tenant_id = g.tenant_id AND c.is_live = g.is_live
      ${whereConditions}
      ORDER BY g.created_at DESC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;

    queryParams.push(pageSize, offset);
    const goalsResult = await this.db.query(goalsQuery, queryParams);

    return {
      goals: goalsResult.rows,
      pagination: {
        page,
        page_size: pageSize,
        total,
        total_pages: Math.ceil(total / pageSize)
      }
    };
  }

  /**
   * Get dashboard alerts (placeholder for now)
   */
  async getDashboardAlerts(
    tenantId: number,
    isLive: boolean,
    limit: number = 5
  ): Promise<DashboardAlert[]> {
    // TODO: Implement when alert system is complete
    // For now, return goal-based alerts

    const query = `
      SELECT
        g.id,
        'GOAL_DEVIATION' as type,
        CASE
          WHEN g.tracking_status = 'BEHIND' THEN 'high'
          WHEN g.tracking_status = 'AT_RISK' THEN 'medium'
          ELSE 'low'
        END as severity,
        CONCAT('Goal "', (g.goal_config->>'goal_name')::text, '" for ', c.first_name, ' ', c.last_name, ' is ', g.tracking_status) as message,
        g.customer_id,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        g.updated_at as created_at
      FROM t_goals g
      INNER JOIN t_customers c ON c.id = g.customer_id AND c.tenant_id = g.tenant_id AND c.is_live = g.is_live
      WHERE g.tenant_id = $1
        AND g.is_live = $2
        AND g.status = 'active'
        AND g.tracking_status IN ('BEHIND', 'AT_RISK')
      ORDER BY
        CASE g.tracking_status
          WHEN 'BEHIND' THEN 1
          WHEN 'AT_RISK' THEN 2
          ELSE 3
        END,
        g.updated_at DESC
      LIMIT $3
    `;

    const result = await this.db.query(query, [tenantId, isLive, limit]);
    return result.rows;
  }
}
