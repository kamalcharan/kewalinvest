// backend/src/services/jtbd.dashboard.service.ts

import { Pool } from 'pg';
import { pool } from '../config/database';

// Types for dashboard
export type CommunicationStatus = 'pending' | 'scheduled' | 'sent' | 'failed' | 'cancelled';
export type CommunicationChannel = 'email' | 'whatsapp' | 'sms';

export interface JTBDWithCommunication {
  // Base JTBD fields
  id: number;
  tenant_id: number;
  is_live: boolean;
  customer_id: number;
  jtbd_type: 'portfolio_alert' | 'time_based' | 'profile_trigger';
  title: string;
  description?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  config_data: any;
  next_alert_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: number;

  // Customer info
  customer_name: string;
  customer_email?: string;
  customer_mobile?: string;

  // Communication fields (DUMMY DATA)
  communication_status: CommunicationStatus;
  communication_channel: CommunicationChannel;
  communication_sent_at?: string;
  communication_scheduled_at?: string;
  communication_read?: boolean;
  communication_clicked?: boolean;
  communication_error?: string;
}

export interface DashboardAlert {
  id: number;
  title: string;
  customer_id: number;
  customer_name: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  jtbd_type: 'portfolio_alert' | 'time_based' | 'profile_trigger';
  next_alert_date: string;
  communication_status: CommunicationStatus;
}

export interface AlertsByDate {
  alert_date: string;
  alert_count: number;
  alerts: DashboardAlert[];
}

export class JTBDDashboardService {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  /**
   * Generate dummy communication data for a JTBD alert
   */
  private generateCommunicationData(
    jtbd: any,
    index: number
  ): {
    communication_status: CommunicationStatus;
    communication_channel: CommunicationChannel;
    communication_sent_at?: string;
    communication_scheduled_at?: string;
    communication_read?: boolean;
    communication_clicked?: boolean;
    communication_error?: string;
  } {
    const today = new Date();
    const alertDate = jtbd.next_alert_date ? new Date(jtbd.next_alert_date) : null;

    if (!alertDate) {
      return {
        communication_status: 'pending',
        communication_channel: this.getChannelByIndex(index),
      };
    }

    // Calculate days until alert
    const daysUntil = Math.ceil(
      (alertDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Determine communication status based on days until alert
    let status: CommunicationStatus;
    let sentAt: string | undefined;
    let scheduledAt: string | undefined;
    let read: boolean | undefined;
    let clicked: boolean | undefined;
    let error: string | undefined;

    if (daysUntil < -7) {
      // More than 7 days past - sent
      status = 'sent';
      sentAt = new Date(alertDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
      read = Math.random() > 0.3; // 70% read rate
      clicked = read && Math.random() > 0.6; // 40% click rate if read
    } else if (daysUntil < 0) {
      // Past but within 7 days - sent or 10% failed
      if (Math.random() > 0.9) {
        status = 'failed';
        error = this.getRandomError();
      } else {
        status = 'sent';
        sentAt = new Date(alertDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
        read = Math.random() > 0.3;
        clicked = read && Math.random() > 0.6;
      }
    } else if (daysUntil <= 3) {
      // Within 3 days - scheduled
      status = 'scheduled';
      const scheduledDate = new Date(alertDate.getTime() - 2 * 24 * 60 * 60 * 1000);
      scheduledDate.setHours(9, 0, 0, 0); // 9 AM
      scheduledAt = scheduledDate.toISOString();
    } else {
      // More than 3 days away - pending
      status = 'pending';
    }

    return {
      communication_status: status,
      communication_channel: this.getChannelByIndex(index),
      communication_sent_at: sentAt,
      communication_scheduled_at: scheduledAt,
      communication_read: read,
      communication_clicked: clicked,
      communication_error: error,
    };
  }

  /**
   * Get communication channel based on index rotation
   */
  private getChannelByIndex(index: number): CommunicationChannel {
    const channels: CommunicationChannel[] = ['email', 'whatsapp', 'sms'];
    return channels[index % 3];
  }

  /**
   * Get random error message for failed communications
   */
  private getRandomError(): string {
    const errors = [
      'Invalid email address',
      'WhatsApp message delivery failed',
      'SMS sending failed - Invalid number',
      'Customer opted out of communications',
    ];
    return errors[Math.floor(Math.random() * errors.length)];
  }

  /**
   * Get upcoming alerts with communication status
   * FIXED: Proper date filtering with type casting and parameter tracking
   * ADDED: Custom date range support
   */
  async getUpcomingAlerts(
    tenantId: number,
    isLive: boolean,
    daysAhead: number = 30,
    priority?: 'critical' | 'high' | 'medium' | 'low',
    jtbdType?: 'portfolio_alert' | 'time_based' | 'profile_trigger',
    status?: 'pending' | 'overdue',
    startDate?: string,  // NEW: Custom start date (YYYY-MM-DD)
    endDate?: string     // NEW: Custom end date (YYYY-MM-DD)
  ): Promise<JTBDWithCommunication[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + daysAhead);

      let query = `
        SELECT 
          j.*,
          cont.name as customer_name,
          email_ch.channel_value as customer_email,
          mobile_ch.channel_value as customer_mobile
        FROM t_jtbd_configurations j
        JOIN t_customers c ON j.customer_id = c.id
        JOIN t_contacts cont ON c.contact_id = cont.id
        LEFT JOIN t_contact_channels email_ch ON cont.id = email_ch.contact_id 
          AND email_ch.channel_type = 'email' 
          AND email_ch.is_live = $2
          AND email_ch.is_active = true
        LEFT JOIN t_contact_channels mobile_ch ON cont.id = mobile_ch.contact_id 
          AND mobile_ch.channel_type = 'mobile' 
          AND mobile_ch.is_live = $2
          AND mobile_ch.is_active = true
        WHERE j.tenant_id = $1 
          AND j.is_live = $2 
          AND j.is_active = true
      `;

      const params: any[] = [tenantId, isLive];
      let paramIndex = 3;

      // FIXED: Date filtering with proper type casting and parameter tracking
      if (startDate && endDate) {
        // Custom date range provided
        query += ` AND j.next_alert_date >= $${paramIndex}::date AND j.next_alert_date <= $${paramIndex + 1}::date`;
        params.push(startDate, endDate);
        paramIndex += 2;
      } else if (status === 'overdue') {
        // Show overdue alerts (past dates)
        query += ` AND j.next_alert_date < $${paramIndex}::date`;
        params.push(today.toISOString().split('T')[0]);
        paramIndex++;
      } else {
        // Show all alerts from today up to daysAhead in the future
        query += ` AND j.next_alert_date >= $${paramIndex}::date AND j.next_alert_date <= $${paramIndex + 1}::date`;
        params.push(
          today.toISOString().split('T')[0],
          futureDate.toISOString().split('T')[0]
        );
        paramIndex += 2;
      }

      // Filter by priority
      if (priority) {
        query += ` AND j.priority = $${paramIndex}`;
        params.push(priority);
        paramIndex++;
      }

      // Filter by JTBD type
      if (jtbdType) {
        query += ` AND j.jtbd_type = $${paramIndex}`;
        params.push(jtbdType);
        paramIndex++;
      }

      query += ` ORDER BY j.next_alert_date ASC, j.priority DESC`;

      console.log('📊 Executing query with params:', { params, query: query.substring(0, 200) });

      const result = await this.db.query(query, params);

      console.log('✅ Query executed successfully, rows returned:', result.rows.length);

      // Add communication data to each alert
      return result.rows.map((row, index) => {
        const commData = this.generateCommunicationData(row, index);
        return {
          ...row,
          ...commData,
        };
      });
    } catch (error) {
      console.error('❌ Error getting upcoming alerts:', error);
      throw error;
    }
  }

  /**
   * Get alerts grouped by date
   * FIXED: Proper date type casting
   */
  async getAlertsByDate(
    tenantId: number,
    isLive: boolean,
    startDate: string,
    endDate: string
  ): Promise<AlertsByDate[]> {
    try {
      const query = `
        SELECT 
          j.id,
          j.title,
          j.customer_id,
          j.priority,
          j.jtbd_type,
          j.next_alert_date,
          cont.name as customer_name
        FROM t_jtbd_configurations j
        JOIN t_customers c ON j.customer_id = c.id
        JOIN t_contacts cont ON c.contact_id = cont.id
        WHERE j.tenant_id = $1 
          AND j.is_live = $2 
          AND j.is_active = true
          AND j.next_alert_date >= $3::date
          AND j.next_alert_date <= $4::date
        ORDER BY j.next_alert_date ASC
      `;

      const result = await this.db.query(query, [tenantId, isLive, startDate, endDate]);

      // Group by date
      const grouped = new Map<string, DashboardAlert[]>();

      result.rows.forEach((row, index) => {
        const alertDate = new Date(row.next_alert_date).toISOString().split('T')[0];
        
        const commData = this.generateCommunicationData(row, index);
        
        const alert: DashboardAlert = {
          id: row.id,
          title: row.title,
          customer_id: row.customer_id,
          customer_name: row.customer_name,
          priority: row.priority,
          jtbd_type: row.jtbd_type,
          next_alert_date: row.next_alert_date,
          communication_status: commData.communication_status,
        };

        if (!grouped.has(alertDate)) {
          grouped.set(alertDate, []);
        }
        grouped.get(alertDate)!.push(alert);
      });

      // Convert to array
      const alertsByDate: AlertsByDate[] = [];
      grouped.forEach((alerts, date) => {
        alertsByDate.push({
          alert_date: date,
          alert_count: alerts.length,
          alerts: alerts,
        });
      });

      // Sort by date
      alertsByDate.sort((a, b) => a.alert_date.localeCompare(b.alert_date));

      return alertsByDate;
    } catch (error) {
      console.error('Error getting alerts by date:', error);
      throw error;
    }
  }

  /**
   * Get communication queue filtered by status
   */
  async getCommunicationQueue(
    tenantId: number,
    isLive: boolean,
    commStatus?: 'pending' | 'scheduled' | 'sent' | 'failed',
    limit: number = 50
  ): Promise<JTBDWithCommunication[]> {
    try {
      const query = `
        SELECT 
          j.*,
          cont.name as customer_name,
          email_ch.channel_value as customer_email,
          mobile_ch.channel_value as customer_mobile
        FROM t_jtbd_configurations j
        JOIN t_customers c ON j.customer_id = c.id
        JOIN t_contacts cont ON c.contact_id = cont.id
        LEFT JOIN t_contact_channels email_ch ON cont.id = email_ch.contact_id 
          AND email_ch.channel_type = 'email' 
          AND email_ch.is_live = $2
          AND email_ch.is_active = true
        LEFT JOIN t_contact_channels mobile_ch ON cont.id = mobile_ch.contact_id 
          AND mobile_ch.channel_type = 'mobile' 
          AND mobile_ch.is_live = $2
          AND mobile_ch.is_active = true
        WHERE j.tenant_id = $1 
          AND j.is_live = $2 
          AND j.is_active = true
        ORDER BY j.next_alert_date ASC
        LIMIT $3
      `;

      const result = await this.db.query(query, [tenantId, isLive, limit]);

      // Add communication data and filter by status if specified
      let alerts = result.rows.map((row, index) => {
        const commData = this.generateCommunicationData(row, index);
        return {
          ...row,
          ...commData,
        };
      });

      // Filter by communication status if specified
      if (commStatus) {
        alerts = alerts.filter((alert) => alert.communication_status === commStatus);
      }

      return alerts;
    } catch (error) {
      console.error('Error getting communication queue:', error);
      throw error;
    }
  }

  /**
   * Get latest alerts for header dropdown
   * Returns the most recent alerts sorted by creation date
   */
  async getLatestAlerts(
    tenantId: number,
    isLive: boolean,
    limit: number = 10
  ): Promise<any[]> {
    try {
      const query = `
        SELECT
          j.id,
          j.customer_id,
          j.jtbd_type,
          j.jtbd_category,
          j.title,
          j.description,
          j.priority,
          j.next_alert_date,
          j.is_active,
          j.config_data,
          j.created_at,
          c.name AS customer_name
        FROM t_jtbd_configurations j
        LEFT JOIN t_customers cust ON cust.id = j.customer_id
        LEFT JOIN t_contacts c ON c.id = cust.contact_id
        WHERE j.tenant_id = $1
          AND j.is_live = $2
          AND j.is_active = true
        ORDER BY j.created_at DESC
        LIMIT $3
      `;

      const result = await this.db.query(query, [tenantId, isLive, limit]);

      return result.rows.map(row => ({
        ...row,
        notification_type: row.config_data?.notification_type || null,
        scheme_name: row.config_data?.scheme_name || null,
        is_new: this.isNewAlert(row.created_at)
      }));
    } catch (error) {
      console.error('Error getting latest alerts:', error);
      throw error;
    }
  }

  /**
   * Check if alert was created within the last 24 hours
   */
  private isNewAlert(createdAt: string): boolean {
    const now = new Date();
    const created = new Date(createdAt);
    const hoursDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  }
}