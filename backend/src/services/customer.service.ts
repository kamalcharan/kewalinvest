// backend/src/services/customer.service.ts

import { Pool } from 'pg';
import { pool } from '../config/database';
import {
  CustomerWithContact,
  CustomerAddress,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CreateAddressRequest,
  CustomerSearchParams,
  CustomerListResponse,
  CustomerStats,
  ConvertToCustomerRequest,
  BookmarkReason,
  CustomerBookmark,
  CreateBookmarkRequest,
  UpdateBookmarkRequest
} from '../types/customer.types';

export class CustomerService {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  /**
   * Get customers with filtering and pagination
   * UPDATED: Added bookmark LEFT JOIN and filters
   */
  async getCustomers(
    tenantId: number,
    isLive: boolean,
    params: CustomerSearchParams,
    userId?: number  // NEW: Optional userId for bookmark filtering
  ): Promise<CustomerListResponse> {
    try {
      const {
        search,
        survival_status,
        onboarding_status,
        has_address,
        is_active,
        is_bookmarked,      // NEW
        bookmark_reason,    // NEW
        page = 1,
        page_size = 20,
        sort_by = 'c.name',
        sort_order = 'asc'
      } = params;

      const whereConditions: string[] = [
        'cust.tenant_id = $1',
        'cust.is_live = $2'
      ];
      const queryParams: any[] = [tenantId, isLive];
      let paramIndex = 3;

      // Active/Inactive filter
      if (is_active !== undefined) {
        whereConditions.push(`cust.is_active = $${paramIndex}`);
        queryParams.push(is_active);
        paramIndex++;
      }

      // Search filter - name, family_head_name, and iwell_code
      if (search && search.trim()) {
        whereConditions.push(`(
          LOWER(c.name) LIKE LOWER($${paramIndex}) OR
          LOWER(cust.family_head_name) LIKE LOWER($${paramIndex}) OR
          CAST(cust.iwell_code AS TEXT) LIKE $${paramIndex}
        )`);
        queryParams.push(`%${search.trim()}%`);
        paramIndex++;
      }

      if (survival_status) {
        whereConditions.push(`cust.survival_status = $${paramIndex}`);
        queryParams.push(survival_status);
        paramIndex++;
      }

      if (onboarding_status) {
        whereConditions.push(`cust.onboarding_status = $${paramIndex}`);
        queryParams.push(onboarding_status);
        paramIndex++;
      }

      if (has_address !== undefined) {
        if (has_address) {
          whereConditions.push(`EXISTS (
            SELECT 1 FROM t_customer_addresses addr
            WHERE addr.customer_id = cust.id
            AND addr.is_live = $2
            AND addr.is_active = true
          )`);
        } else {
          whereConditions.push(`NOT EXISTS (
            SELECT 1 FROM t_customer_addresses addr
            WHERE addr.customer_id = cust.id
            AND addr.is_live = $2
            AND addr.is_active = true
          )`);
        }
      }

      // NEW: Bookmark filters
      if (is_bookmarked !== undefined && userId) {
        if (is_bookmarked) {
          whereConditions.push(`EXISTS (
            SELECT 1 FROM t_customer_bookmarks bm
            WHERE bm.customer_id = cust.id
            AND bm.user_id = $${paramIndex}
            AND bm.tenant_id = $1
            AND bm.is_live = $2
            AND bm.is_active = true
          )`);
          queryParams.push(userId);
          paramIndex++;
        } else {
          whereConditions.push(`NOT EXISTS (
            SELECT 1 FROM t_customer_bookmarks bm
            WHERE bm.customer_id = cust.id
            AND bm.user_id = $${paramIndex}
            AND bm.tenant_id = $1
            AND bm.is_live = $2
            AND bm.is_active = true
          )`);
          queryParams.push(userId);
          paramIndex++;
        }
      }

      if (bookmark_reason && userId) {
        whereConditions.push(`EXISTS (
          SELECT 1 FROM t_customer_bookmarks bm
          JOIN m_bookmark_reasons br ON br.id = bm.reason_id
          WHERE bm.customer_id = cust.id
          AND bm.user_id = $${paramIndex}
          AND bm.tenant_id = $1
          AND bm.is_live = $2
          AND bm.is_active = true
          AND br.reason_code = $${paramIndex + 1}
        )`);
        queryParams.push(userId, bookmark_reason);
        paramIndex += 2;
      }

      const offset = (page - 1) * page_size;

      // UPDATED: Added bookmark LEFT JOIN
      const query = `
        SELECT 
          cust.*,
          c.prefix,
          c.name,
          c.is_active as contact_is_active,
          c.created_at as contact_created_at,
          COUNT(*) OVER() as total_count,
          (
            SELECT COUNT(*) FROM t_customer_addresses addr
            WHERE addr.customer_id = cust.id
            AND addr.is_live = $2
            AND addr.is_active = true
          ) as address_count,
          CASE 
            WHEN cust.date_of_birth IS NOT NULL 
            THEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, cust.date_of_birth))
            ELSE NULL 
          END as age,
          bm.id as bookmark_id,
          bm.reason_id as bookmark_reason_id,
          bm.custom_reason as bookmark_custom_reason,
          bm.notes as bookmark_notes,
          br.reason_code as bookmark_reason_code,
          br.reason_label as bookmark_reason_label,
          CASE WHEN bm.id IS NOT NULL THEN true ELSE false END as is_bookmarked
        FROM t_customers cust
        JOIN t_contacts c ON c.id = cust.contact_id
        LEFT JOIN t_customer_bookmarks bm ON bm.customer_id = cust.id 
          AND bm.user_id = $${paramIndex}
          AND bm.tenant_id = $1
          AND bm.is_live = $2
          AND bm.is_active = true
        LEFT JOIN m_bookmark_reasons br ON br.id = bm.reason_id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY ${sort_by} ${sort_order}
        LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
      `;

      queryParams.push(userId || null, page_size, offset);
      const result = await this.db.query(query, queryParams);
      
      const customers = await this.processCustomerRows(result.rows, isLive);
      const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
      const totalPages = Math.ceil(total / page_size);

      return {
        customers,
        total,
        page,
        page_size,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1
      };
    } catch (error) {
      console.error('Error getting customers:', error);
      throw error;
    }
  }

  /**
   * Get single customer by ID
   * UPDATED: Added bookmark LEFT JOIN
   */
  async getCustomer(
    tenantId: number,
    isLive: boolean,
    customerId: number,
    userId?: number  // NEW: Optional userId for bookmark data
  ): Promise<CustomerWithContact | null> {
    try {
      const query = `
        SELECT 
          cust.*,
          c.prefix,
          c.name,
          c.is_active as contact_is_active,
          CASE 
            WHEN cust.date_of_birth IS NOT NULL 
            THEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, cust.date_of_birth))
            ELSE NULL 
          END as age,
          bm.id as bookmark_id,
          bm.reason_id as bookmark_reason_id,
          bm.custom_reason as bookmark_custom_reason,
          bm.notes as bookmark_notes,
          br.reason_code as bookmark_reason_code,
          br.reason_label as bookmark_reason_label,
          CASE WHEN bm.id IS NOT NULL THEN true ELSE false END as is_bookmarked
        FROM t_customers cust
        JOIN t_contacts c ON c.id = cust.contact_id
        LEFT JOIN t_customer_bookmarks bm ON bm.customer_id = cust.id 
          AND bm.user_id = $4
          AND bm.tenant_id = $2
          AND bm.is_live = $3
          AND bm.is_active = true
        LEFT JOIN m_bookmark_reasons br ON br.id = bm.reason_id
        WHERE cust.id = $1 AND cust.tenant_id = $2 AND cust.is_live = $3
      `;

      const result = await this.db.query(query, [customerId, tenantId, isLive, userId || null]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const customers = await this.processCustomerRows([result.rows[0]], isLive);
      return customers[0];
    } catch (error) {
      console.error('Error getting customer:', error);
      throw error;
    }
  }

  /**
   * Create new customer (with optional new contact)
   */
  async createCustomer(
    tenantId: number,
    isLive: boolean,
    data: CreateCustomerRequest,
    createdBy: number
  ): Promise<CustomerWithContact> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      let contactId = data.contact_id;

      // If no contact_id provided, create new contact first
      if (!contactId && data.name) {
        const contactQuery = `
          INSERT INTO t_contacts (tenant_id, is_live, prefix, name, created_by)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `;
        
        const contactResult = await client.query(contactQuery, [
          tenantId,
          isLive,
          data.prefix || 'Mr',
          data.name,
          createdBy
        ]);
        
        contactId = contactResult.rows[0].id;

        // Add channels if provided
        if (data.channels && data.channels.length > 0) {
          for (const channel of data.channels) {
            await client.query(
              `INSERT INTO t_contact_channels 
               (contact_id, tenant_id, is_live, channel_type, channel_value, channel_subtype, is_primary)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                contactId,
                tenantId,
                isLive,
                channel.channel_type,
                channel.channel_value,
                channel.channel_subtype || 'personal',
                channel.is_primary || false
              ]
            );
          }
        }
      }

      // Check if customer already exists for this contact
      const existingCheck = await client.query(
        'SELECT id FROM t_customers WHERE contact_id = $1 AND tenant_id = $2 AND is_live = $3',
        [contactId, tenantId, isLive]
      );

      if (existingCheck.rows.length > 0) {
        throw new Error('Customer already exists for this contact');
      }

      const pan = data.pan || null;
      const iwellCode = data.iwell_code || null;

      // Insert customer
      const customerQuery = `
        INSERT INTO t_customers (
          contact_id, tenant_id, is_live,
          pan, iwell_code,
          date_of_birth, anniversary_date,
          family_head_name, family_head_iwell_code,
          referred_by, referred_by_name,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `;

      const customerResult = await client.query(customerQuery, [
        contactId,
        tenantId,
        isLive,
        pan,
        iwellCode,
        data.date_of_birth,
        data.anniversary_date,
        data.family_head_name,
        data.family_head_iwell_code,
        data.referred_by,
        data.referred_by_name,
        createdBy
      ]);

      const customerId = customerResult.rows[0].id;

      // Add address if provided
      if (data.address) {
        await this.addAddressInternal(
          client,
          customerId,
          tenantId,
          isLive,
          data.address
        );
      }

      await client.query('COMMIT');

      // Fetch and return complete customer data
      const customer = await this.getCustomer(tenantId, isLive, customerId);
      if (!customer) {
        throw new Error('Failed to retrieve created customer');
      }

      return customer;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating customer:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Convert existing contact to customer
   */
  async convertContactToCustomer(
    tenantId: number,
    isLive: boolean,
    contactId: number,
    data: ConvertToCustomerRequest,
    createdBy: number
  ): Promise<CustomerWithContact> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Check if contact exists
      const contactCheck = await client.query(
        'SELECT id, name FROM t_contacts WHERE id = $1 AND tenant_id = $2 AND is_live = $3 AND is_active = true',
        [contactId, tenantId, isLive]
      );

      if (contactCheck.rows.length === 0) {
        throw new Error('Contact not found');
      }

      // Check if already a customer
      const existingCheck = await client.query(
        'SELECT id FROM t_customers WHERE contact_id = $1 AND tenant_id = $2 AND is_live = $3',
        [contactId, tenantId, isLive]
      );

      if (existingCheck.rows.length > 0) {
        throw new Error('Contact is already a customer');
      }

      const pan = data.pan || null;
      const iwellCode = data.iwell_code || null;

      // Insert customer record
      const customerQuery = `
        INSERT INTO t_customers (
          contact_id, tenant_id, is_live,
          pan, iwell_code,
          date_of_birth, anniversary_date,
          family_head_name, family_head_iwell_code,
          referred_by, referred_by_name,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `;

      const customerResult = await client.query(customerQuery, [
        contactId,
        tenantId,
        isLive,
        pan,
        iwellCode,
        data.date_of_birth,
        data.anniversary_date,
        data.family_head_name,
        data.family_head_iwell_code,
        data.referred_by,
        data.referred_by_name,
        createdBy
      ]);

      const customerId = customerResult.rows[0].id;

      // Add address if provided
      if (data.address) {
        await this.addAddressInternal(
          client,
          customerId,
          tenantId,
          isLive,
          data.address
        );
      }

      await client.query('COMMIT');

      // Fetch and return complete customer data
      const customer = await this.getCustomer(tenantId, isLive, customerId);
      if (!customer) {
        throw new Error('Failed to retrieve converted customer');
      }

      return customer;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error converting contact to customer:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update customer
   */
  async updateCustomer(
    tenantId: number,
    isLive: boolean,
    customerId: number,
    data: UpdateCustomerRequest & { address?: CreateAddressRequest }
  ): Promise<CustomerWithContact> {
    try {
      const updateFields: string[] = [];
      const queryParams: any[] = [customerId, tenantId, isLive];
      let paramIndex = 4;

      if (data.pan !== undefined) {
        updateFields.push(`pan = $${paramIndex}`);
        queryParams.push(data.pan || null);
        paramIndex++;
      }

      if (data.iwell_code !== undefined) {
        updateFields.push(`iwell_code = $${paramIndex}`);
        queryParams.push(data.iwell_code || null);
        paramIndex++;
      }

      if (data.date_of_birth !== undefined) {
        updateFields.push(`date_of_birth = $${paramIndex}`);
        queryParams.push(data.date_of_birth);
        paramIndex++;
      }

      if (data.anniversary_date !== undefined) {
        updateFields.push(`anniversary_date = $${paramIndex}`);
        queryParams.push(data.anniversary_date);
        paramIndex++;
      }

      if (data.survival_status !== undefined) {
        updateFields.push(`survival_status = $${paramIndex}`);
        queryParams.push(data.survival_status);
        paramIndex++;
      }

      if (data.date_of_death !== undefined) {
        updateFields.push(`date_of_death = $${paramIndex}`);
        queryParams.push(data.date_of_death);
        paramIndex++;
      }

      if (data.family_head_name !== undefined) {
        updateFields.push(`family_head_name = $${paramIndex}`);
        queryParams.push(data.family_head_name);
        paramIndex++;
      }

      if (data.family_head_iwell_code !== undefined) {
        updateFields.push(`family_head_iwell_code = $${paramIndex}`);
        queryParams.push(data.family_head_iwell_code);
        paramIndex++;
      }

      if (data.onboarding_status !== undefined) {
        updateFields.push(`onboarding_status = $${paramIndex}`);
        queryParams.push(data.onboarding_status);
        paramIndex++;
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');

      const query = `
        UPDATE t_customers 
        SET ${updateFields.join(', ')}
        WHERE id = $1 AND tenant_id = $2 AND is_live = $3
        RETURNING id
      `;

      const result = await this.db.query(query, queryParams);
      
      if (result.rows.length === 0) {
        throw new Error('Customer not found');
      }

      const customer = await this.getCustomer(tenantId, isLive, customerId);
      if (!customer) {
        throw new Error('Failed to retrieve updated customer');
      }

      return customer;
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  }

  /**
   * Delete customer (soft delete) - cascades to contact
   */
  async deleteCustomer(
    tenantId: number,
    isLive: boolean,
    customerId: number
  ): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Get contact_id before deactivating
      const customerResult = await client.query(
        'SELECT contact_id FROM t_customers WHERE id = $1 AND tenant_id = $2 AND is_live = $3',
        [customerId, tenantId, isLive]
      );

      if (customerResult.rows.length === 0) {
        throw new Error('Customer not found');
      }

      const contactId = customerResult.rows[0].contact_id;

      // Deactivate customer
      await client.query(
        `UPDATE t_customers 
         SET is_active = false, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND tenant_id = $2 AND is_live = $3`,
        [customerId, tenantId, isLive]
      );

      // Cascade: Deactivate associated contact
      await client.query(
        `UPDATE t_contacts 
         SET is_active = false, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND tenant_id = $2 AND is_live = $3`,
        [contactId, tenantId, isLive]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error deleting customer:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Activate customer - cascades to contact
   */
  async activateCustomer(
    tenantId: number,
    isLive: boolean,
    customerId: number
  ): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Get contact_id before activating
      const customerResult = await client.query(
        'SELECT contact_id FROM t_customers WHERE id = $1 AND tenant_id = $2 AND is_live = $3',
        [customerId, tenantId, isLive]
      );

      if (customerResult.rows.length === 0) {
        throw new Error('Customer not found');
      }

      const contactId = customerResult.rows[0].contact_id;

      // Activate customer
      await client.query(
        `UPDATE t_customers 
         SET is_active = true, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND tenant_id = $2 AND is_live = $3`,
        [customerId, tenantId, isLive]
      );

      // Cascade: Activate associated contact
      await client.query(
        `UPDATE t_contacts 
         SET is_active = true, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND tenant_id = $2 AND is_live = $3`,
        [contactId, tenantId, isLive]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error activating customer:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Add customer address
   */
  async addAddress(
    tenantId: number,
    isLive: boolean,
    customerId: number,
    data: CreateAddressRequest
  ): Promise<CustomerAddress> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      const address = await this.addAddressInternal(
        client,
        customerId,
        tenantId,
        isLive,
        data
      );
      
      await client.query('COMMIT');
      return address;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error adding address:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get customer statistics
   * UPDATED: Added bookmarked count
   */
  async getCustomerStats(
    tenantId: number,
    isLive: boolean,
    userId?: number  // NEW: Optional userId for bookmark stats
  ): Promise<CustomerStats> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE is_active = true) as active,
          COUNT(*) FILTER (WHERE is_active = false) as inactive,
          COUNT(*) FILTER (WHERE survival_status = 'alive') as alive,
          COUNT(*) FILTER (WHERE survival_status = 'deceased') as deceased,
          COUNT(*) FILTER (WHERE pan IS NOT NULL) as with_pan,
          COUNT(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM t_customer_addresses addr
            WHERE addr.customer_id = cust.id
            AND addr.is_live = $2
            AND addr.is_active = true
          )) as with_addresses,
          COUNT(*) FILTER (WHERE onboarding_status = 'pending') as onboarding_pending,
          COUNT(*) FILTER (WHERE onboarding_status = 'completed') as onboarding_completed,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as recent_30_days,
          COUNT(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM t_customer_bookmarks bm
            WHERE bm.customer_id = cust.id
            AND bm.user_id = $3
            AND bm.tenant_id = $1
            AND bm.is_live = $2
            AND bm.is_active = true
          )) as bookmarked
        FROM t_customers cust
        WHERE cust.tenant_id = $1 AND cust.is_live = $2
      `;

      const result = await this.db.query(query, [tenantId, isLive, userId || null]);
      const stats = result.rows[0];

      return {
        total: parseInt(stats.total),
        active: parseInt(stats.active),
        inactive: parseInt(stats.inactive),
        alive: parseInt(stats.alive),
        deceased: parseInt(stats.deceased),
        with_pan: parseInt(stats.with_pan),
        with_addresses: parseInt(stats.with_addresses),
        onboarding_pending: parseInt(stats.onboarding_pending),
        onboarding_completed: parseInt(stats.onboarding_completed),
        recent_30_days: parseInt(stats.recent_30_days),
        bookmarked: parseInt(stats.bookmarked || 0)  // NEW
      };
    } catch (error) {
      console.error('Error getting customer stats:', error);
      throw error;
    }
  }

  // ==================== BOOKMARK METHODS (NEW) ====================

  /**
   * Get bookmark reasons for tenant
   */
  async getBookmarkReasons(
    tenantId: number,
    isLive: boolean
  ): Promise<BookmarkReason[]> {
    try {
      const query = `
        SELECT * FROM m_bookmark_reasons
        WHERE tenant_id = $1 AND is_live = $2 AND is_active = true
        ORDER BY display_order, reason_label
      `;

      const result = await this.db.query(query, [tenantId, isLive]);
      return result.rows;
    } catch (error) {
      console.error('Error getting bookmark reasons:', error);
      throw error;
    }
  }

  /**
   * Add bookmark to customer
   */
  async addBookmark(
    tenantId: number,
    isLive: boolean,
    customerId: number,
    userId: number,
    data: CreateBookmarkRequest
  ): Promise<CustomerBookmark> {
    try {
      // Check if customer exists
      const customerCheck = await this.db.query(
        'SELECT id FROM t_customers WHERE id = $1 AND tenant_id = $2 AND is_live = $3',
        [customerId, tenantId, isLive]
      );

      if (customerCheck.rows.length === 0) {
        throw new Error('Customer not found');
      }

      // Validate that either reason_id or custom_reason is provided
      if (!data.reason_id && !data.custom_reason) {
        throw new Error('Either reason_id or custom_reason must be provided');
      }

      // Insert or update bookmark (upsert)
      const query = `
        INSERT INTO t_customer_bookmarks (
          tenant_id, is_live, customer_id, user_id, 
          reason_id, custom_reason, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (tenant_id, is_live, customer_id, user_id)
        DO UPDATE SET
          reason_id = EXCLUDED.reason_id,
          custom_reason = EXCLUDED.custom_reason,
          notes = EXCLUDED.notes,
          is_active = true,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;

      const result = await this.db.query(query, [
        tenantId,
        isLive,
        customerId,
        userId,
        data.reason_id || null,
        data.custom_reason || null,
        data.notes || null
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('Error adding bookmark:', error);
      throw error;
    }
  }

  /**
   * Remove bookmark from customer (soft delete)
   */
  async removeBookmark(
    tenantId: number,
    isLive: boolean,
    customerId: number,
    userId: number
  ): Promise<void> {
    try {
      const query = `
        UPDATE t_customer_bookmarks
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $1 AND is_live = $2 
          AND customer_id = $3 AND user_id = $4
      `;

      await this.db.query(query, [tenantId, isLive, customerId, userId]);
    } catch (error) {
      console.error('Error removing bookmark:', error);
      throw error;
    }
  }

  /**
   * Update bookmark
   */
  async updateBookmark(
    tenantId: number,
    isLive: boolean,
    customerId: number,
    userId: number,
    data: UpdateBookmarkRequest
  ): Promise<CustomerBookmark> {
    try {
      const updateFields: string[] = ['updated_at = CURRENT_TIMESTAMP'];
      const queryParams: any[] = [tenantId, isLive, customerId, userId];
      let paramIndex = 5;

      if (data.reason_id !== undefined) {
        updateFields.push(`reason_id = $${paramIndex}`);
        queryParams.push(data.reason_id);
        paramIndex++;
      }

      if (data.custom_reason !== undefined) {
        updateFields.push(`custom_reason = $${paramIndex}`);
        queryParams.push(data.custom_reason);
        paramIndex++;
      }

      if (data.notes !== undefined) {
        updateFields.push(`notes = $${paramIndex}`);
        queryParams.push(data.notes);
        paramIndex++;
      }

      const query = `
        UPDATE t_customer_bookmarks
        SET ${updateFields.join(', ')}
        WHERE tenant_id = $1 AND is_live = $2 
          AND customer_id = $3 AND user_id = $4
          AND is_active = true
        RETURNING *
      `;

      const result = await this.db.query(query, queryParams);

      if (result.rows.length === 0) {
        throw new Error('Bookmark not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error updating bookmark:', error);
      throw error;
    }
  }

  // ==================== PRIVATE HELPERS ====================

  private async processCustomerRows(rows: any[], isLive: boolean): Promise<CustomerWithContact[]> {
    const customerIds = rows.map(r => r.id);
    
    if (customerIds.length === 0) return [];

    // Fetch addresses
    const addressesQuery = `
      SELECT * FROM t_customer_addresses
      WHERE customer_id = ANY($1) AND is_live = $2 AND is_active = true
      ORDER BY customer_id, is_primary DESC
    `;
    const addressesResult = await this.db.query(addressesQuery, [customerIds, isLive]);
    
    // Fetch channels
    const contactIds = rows.map(r => r.contact_id);
    const channelsQuery = `
      SELECT * FROM t_contact_channels
      WHERE contact_id = ANY($1) AND is_live = $2 AND is_active = true
      ORDER BY contact_id, is_primary DESC
    `;
    const channelsResult = await this.db.query(channelsQuery, [contactIds, isLive]);

    // Group by customer
    const addressesByCustomer = new Map();
    addressesResult.rows.forEach(addr => {
      if (!addressesByCustomer.has(addr.customer_id)) {
        addressesByCustomer.set(addr.customer_id, []);
      }
      addressesByCustomer.get(addr.customer_id).push(addr);
    });

    const channelsByContact = new Map();
    channelsResult.rows.forEach(ch => {
      if (!channelsByContact.has(ch.contact_id)) {
        channelsByContact.set(ch.contact_id, []);
      }
      channelsByContact.get(ch.contact_id).push(ch);
    });

    return rows.map(row => {
      const channels = channelsByContact.get(row.contact_id) || [];
      
      return {
        ...row,
        date_of_birth: row.date_of_birth ? new Date(row.date_of_birth).toISOString().split('T')[0] : null,
        anniversary_date: row.anniversary_date ? new Date(row.anniversary_date).toISOString().split('T')[0] : null,
        pan: row.pan,
        iwell_code: row.iwell_code,
        addresses: addressesByCustomer.get(row.id) || [],
        channels,
        primary_email: channels.find((ch: any) => ch.channel_type === 'email' && ch.is_primary)?.channel_value,
        primary_mobile: channels.find((ch: any) => ch.channel_type === 'mobile' && ch.is_primary)?.channel_value,
        channel_count: channels.length,
        // Bookmark fields (already in row from LEFT JOIN)
        is_bookmarked: row.is_bookmarked || false,
        bookmark_reason_id: row.bookmark_reason_id || null,
        bookmark_reason_code: row.bookmark_reason_code || null,
        bookmark_reason_label: row.bookmark_reason_label || null,
        bookmark_custom_reason: row.bookmark_custom_reason || null,
        bookmark_notes: row.bookmark_notes || null
      };
    });
  }

  private async addAddressInternal(
    client: any,
    customerId: number,
    tenantId: number,
    isLive: boolean,
    data: CreateAddressRequest | Omit<CustomerAddress, 'id' | 'customer_id' | 'tenant_id' | 'is_live' | 'created_at'>
  ): Promise<CustomerAddress> {
    // If setting as primary, unset other primaries
    if (data.is_primary) {
      await client.query(
        `UPDATE t_customer_addresses 
         SET is_primary = false 
         WHERE customer_id = $1 AND tenant_id = $2 AND is_live = $3`,
        [customerId, tenantId, isLive]
      );
    }

    const query = `
      INSERT INTO t_customer_addresses (
        customer_id, tenant_id, is_live,
        address_type, address_line1, address_line2,
        city, state, country, pincode, is_primary
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const result = await client.query(query, [
      customerId,
      tenantId,
      isLive,
      data.address_type,
      data.address_line1,
      data.address_line2,
      data.city,
      data.state,
      data.country || 'India',
      data.pincode,
      data.is_primary || false
    ]);

    return result.rows[0];
  }
}