// backend/src/services/contact.service.ts

import { Pool } from 'pg';
import { pool } from '../config/database';
import { CustomerService } from './customer.service';

// Type definitions (temporary - should be in separate files)
interface Contact {
  id: number;
  tenant_id: number;
  is_live: boolean;
  prefix: string;
  name: string;
  is_customer?: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  channels?: ContactChannel[];
  channel_count?: number;
  customer_id?: number;
  primary_channel?: ContactChannel;
  email?: string;
  mobile?: string;
}

interface ContactChannel {
  id: number;
  contact_id: number;
  tenant_id: number;
  is_live: boolean;
  channel_type: string;
  channel_value: string;
  channel_subtype: string;
  is_primary: boolean;
  is_active: boolean;
}

interface CreateContactRequest {
  prefix: string;
  name: string;
  channels: Array<{
    channel_type: string;
    channel_value: string;
    channel_subtype?: string;
    is_primary?: boolean;
  }>;
}

interface UpdateContactRequest {
  prefix?: string;
  name?: string;
  is_active?: boolean;
}

interface ContactSearchParams {
  search?: string;
  prefix?: string;
  channel_type?: string;
  has_customer?: boolean;
  is_active?: boolean;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: string;
}

interface ContactListResponse {
  contacts: Contact[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

interface CreateChannelRequest {
  channel_type: string;
  channel_value: string;
  channel_subtype?: string;
  is_primary?: boolean;
}

interface UpdateChannelRequest {
  channel_type?: string;
  channel_value?: string;
  channel_subtype?: string;
  is_active?: boolean;
  is_primary?: boolean;
}

interface ConvertToCustomerRequest {
  [key: string]: any;
}

export class ContactService {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  // ==================== CONTACT OPERATIONS ====================

  /**
   * Get contacts with filtering and pagination
   */
  async getContacts(
    tenantId: number, 
    isLive: boolean, 
    params: ContactSearchParams
  ): Promise<ContactListResponse> {
    try {
      const {
        search,
        prefix,
        channel_type,
        has_customer,
        is_active,
        page = 1,
        page_size = 20,
        sort_by = 'name',
        sort_order = 'asc'
      } = params;

      const whereConditions: string[] = [
        'c.tenant_id = $1',
        'c.is_live = $2'
      ];
      const queryParams: any[] = [tenantId, isLive];
      let paramIndex = 3;

      if (search && search.trim()) {
        whereConditions.push(`(
          LOWER(c.name) LIKE LOWER($${paramIndex}) OR 
          EXISTS (
            SELECT 1 FROM t_contact_channels ch 
            WHERE ch.contact_id = c.id 
            AND ch.is_live = $2 
            AND ch.is_active = true
            AND LOWER(ch.channel_value) LIKE LOWER($${paramIndex})
          )
        )`);
        queryParams.push(`%${search.trim()}%`);
        paramIndex++;
      }

      if (prefix) {
        whereConditions.push(`c.prefix = $${paramIndex}`);
        queryParams.push(prefix);
        paramIndex++;
      }

      if (channel_type) {
        whereConditions.push(`EXISTS (
          SELECT 1 FROM t_contact_channels ch 
          WHERE ch.contact_id = c.id 
          AND ch.is_live = $2 
          AND ch.is_active = true
          AND ch.channel_type = $${paramIndex}
        )`);
        queryParams.push(channel_type);
        paramIndex++;
      }

      if (has_customer !== undefined) {
        if (has_customer) {
          whereConditions.push(`EXISTS (
            SELECT 1 FROM t_customers cust 
            WHERE cust.contact_id = c.id 
            AND cust.is_live = $2 
            AND cust.is_active = true
          )`);
        } else {
          whereConditions.push(`NOT EXISTS (
            SELECT 1 FROM t_customers cust 
            WHERE cust.contact_id = c.id 
            AND cust.is_live = $2 
            AND cust.is_active = true
          )`);
        }
      }

      if (is_active !== undefined) {
        whereConditions.push(`c.is_active = $${paramIndex}`);
        queryParams.push(is_active);
        paramIndex++;
      }

      const validSortFields = ['name', 'created_at', 'updated_at', 'prefix'];
      const sortField = validSortFields.includes(sort_by) ? sort_by : 'name';
      const sortDirection = sort_order === 'desc' ? 'DESC' : 'ASC';

      const offset = (page - 1) * page_size;

      const contactsQuery = `
        SELECT 
          c.*,
          COUNT(*) OVER() as total_count,
          EXISTS (
            SELECT 1 FROM t_customers cust 
            WHERE cust.contact_id = c.id 
            AND cust.is_live = $2 
            AND cust.is_active = true
          ) as is_customer,
          (
            SELECT cust.id FROM t_customers cust 
            WHERE cust.contact_id = c.id 
            AND cust.is_live = $2 
            AND cust.is_active = true
            LIMIT 1
          ) as customer_id,
          (
            SELECT COUNT(*) FROM t_contact_channels ch 
            WHERE ch.contact_id = c.id 
            AND ch.is_live = $2 
            AND ch.is_active = true
          ) as channel_count
        FROM t_contacts c
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY c.${sortField} ${sortDirection}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(page_size, offset);

      const result = await this.db.query(contactsQuery, queryParams);
      const contacts = result.rows;

      const contactsWithChannels = await this.attachChannelsToContacts(contacts, isLive);

      const total = contacts.length > 0 ? parseInt(contacts[0].total_count) : 0;
      const totalPages = Math.ceil(total / page_size);

      return {
        contacts: contactsWithChannels,
        total,
        page,
        page_size,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1
      };
    } catch (error) {
      console.error('Error getting contacts:', error);
      throw error;
    }
  }

  /**
   * Get a single contact by ID
   */
  async getContact(
    tenantId: number, 
    isLive: boolean, 
    contactId: number
  ): Promise<Contact | null> {
    try {
      const query = `
        SELECT c.*,
          EXISTS (
            SELECT 1 FROM t_customers cust 
            WHERE cust.contact_id = c.id 
            AND cust.is_live = $2 
            AND cust.is_active = true
          ) as is_customer,
          (
            SELECT cust.id FROM t_customers cust 
            WHERE cust.contact_id = c.id 
            AND cust.is_live = $2 
            AND cust.is_active = true
            LIMIT 1
          ) as customer_id
        FROM t_contacts c
        WHERE c.tenant_id = $1 AND c.is_live = $2 AND c.id = $3
      `;

      const result = await this.db.query(query, [tenantId, isLive, contactId]);

      if (result.rows.length === 0) {
        return null;
      }

      const contacts = await this.attachChannelsToContacts([result.rows[0]], isLive);
      return contacts[0];
    } catch (error) {
      console.error('Error getting contact:', error);
      throw error;
    }
  }

  /**
   * Create a new contact with channels
   */
  async createContact(
    tenantId: number, 
    isLive: boolean, 
    contactData: CreateContactRequest, 
    createdBy: number
  ): Promise<Contact> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Check for duplicates
      const emailChannels = contactData.channels.filter((ch: any) => ch.channel_type === 'email');
      const mobileChannels = contactData.channels.filter((ch: any) => ch.channel_type === 'mobile');

      for (const emailChannel of emailChannels) {
        const exists = await this.checkContactExists(tenantId, isLive, emailChannel.channel_value);
        if (exists.exists) {
          throw {
            code: 'DUPLICATE_CONTACT',
            message: `Contact with email ${emailChannel.channel_value} already exists`,
            details: { existing_contact: exists.contact }
          };
        }
      }

      for (const mobileChannel of mobileChannels) {
        const exists = await this.checkContactExists(tenantId, isLive, undefined, mobileChannel.channel_value);
        if (exists.exists) {
          throw {
            code: 'DUPLICATE_CONTACT',
            message: `Contact with mobile ${mobileChannel.channel_value} already exists`,
            details: { existing_contact: exists.contact }
          };
        }
      }

      // Insert contact
      const contactQuery = `
        INSERT INTO t_contacts (tenant_id, is_live, prefix, name, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      const contactResult = await client.query(contactQuery, [
        tenantId,
        isLive,
        contactData.prefix,
        contactData.name,
        createdBy
      ]);

      const contact = contactResult.rows[0];

      // Insert channels
      for (const channelData of contactData.channels) {
        await this.addChannelInternal(client, contact.id, tenantId, isLive, channelData);
      }

      await client.query('COMMIT');

      const result = await this.attachChannelsToContacts([contact], isLive);
      return result[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating contact:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update a contact
   */
  async updateContact(
    tenantId: number, 
    isLive: boolean, 
    contactId: number, 
    updateData: UpdateContactRequest
  ): Promise<Contact> {
    try {
      const updateFields: string[] = [];
      const queryParams: any[] = [tenantId, isLive, contactId];
      let paramIndex = 4;

      if (updateData.prefix !== undefined) {
        updateFields.push(`prefix = $${paramIndex}`);
        queryParams.push(updateData.prefix);
        paramIndex++;
      }

      if (updateData.name !== undefined) {
        updateFields.push(`name = $${paramIndex}`);
        queryParams.push(updateData.name);
        paramIndex++;
      }

      if (updateData.is_active !== undefined) {
        updateFields.push(`is_active = $${paramIndex}`);
        queryParams.push(updateData.is_active);
        paramIndex++;
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');

      if (updateFields.length === 1) {
        throw new Error('No fields to update');
      }

      const query = `
        UPDATE t_contacts 
        SET ${updateFields.join(', ')}
        WHERE tenant_id = $1 AND is_live = $2 AND id = $3
        RETURNING *
      `;

      const result = await this.db.query(query, queryParams);

      if (result.rows.length === 0) {
        throw { code: 'CONTACT_NOT_FOUND', message: 'Contact not found' };
      }

      const contacts = await this.attachChannelsToContacts([result.rows[0]], isLive);
      return contacts[0];
    } catch (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
  }

  /**
   * Soft delete a contact
   */
  async deleteContact(
    tenantId: number, 
    isLive: boolean, 
    contactId: number
  ): Promise<void> {
    try {
      const query = `
        UPDATE t_contacts 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $1 AND is_live = $2 AND id = $3
      `;

      const result = await this.db.query(query, [tenantId, isLive, contactId]);

      if (result.rowCount === 0) {
        throw { code: 'CONTACT_NOT_FOUND', message: 'Contact not found' };
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
      throw error;
    }
  }

  // ==================== CHANNEL OPERATIONS ====================

  /**
   * Add communication channel to contact
   */
  async addChannel(
    tenantId: number,
    isLive: boolean,
    contactId: number,
    channelData: Omit<CreateChannelRequest, 'contact_id'>
  ): Promise<ContactChannel> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Verify contact exists
      const contactCheck = await client.query(
        'SELECT id FROM t_contacts WHERE id = $1 AND tenant_id = $2 AND is_live = $3 AND is_active = true',
        [contactId, tenantId, isLive]
      );

      if (contactCheck.rows.length === 0) {
        throw { code: 'CONTACT_NOT_FOUND', message: 'Contact not found' };
      }

      const channel = await this.addChannelInternal(client, contactId, tenantId, isLive, channelData);

      await client.query('COMMIT');
      return channel;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error adding channel:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update communication channel
   */
  async updateChannel(
    tenantId: number,
    isLive: boolean,
    channelId: number,
    updateData: UpdateChannelRequest
  ): Promise<ContactChannel> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      const currentChannelQuery = await client.query(
        'SELECT * FROM t_contact_channels WHERE id = $1 AND tenant_id = $2 AND is_live = $3',
        [channelId, tenantId, isLive]
      );

      if (currentChannelQuery.rows.length === 0) {
        throw { code: 'CHANNEL_NOT_FOUND', message: 'Channel not found' };
      }

      const currentChannel = currentChannelQuery.rows[0];

      const updateFields: string[] = [];
      const queryParams: any[] = [channelId, tenantId, isLive];
      let paramIndex = 4;

      if (updateData.channel_type !== undefined) {
        updateFields.push(`channel_type = $${paramIndex}`);
        queryParams.push(updateData.channel_type);
        paramIndex++;
      }

      if (updateData.channel_value !== undefined) {
        if (updateData.channel_value !== currentChannel.channel_value) {
          const duplicateCheck = await client.query(
            `SELECT id FROM t_contact_channels 
             WHERE contact_id = $1 AND tenant_id = $2 AND is_live = $3 
             AND channel_type = $4 AND channel_value = $5 AND is_active = true AND id != $6`,
            [
              currentChannel.contact_id, 
              tenantId, 
              isLive, 
              updateData.channel_type || currentChannel.channel_type,
              updateData.channel_value,
              channelId
            ]
          );

          if (duplicateCheck.rows.length > 0) {
            throw { 
              code: 'DUPLICATE_CHANNEL', 
              message: `Channel with this value already exists for the contact` 
            };
          }
        }

        updateFields.push(`channel_value = $${paramIndex}`);
        queryParams.push(updateData.channel_value);
        paramIndex++;
      }

      if (updateData.channel_subtype !== undefined) {
        updateFields.push(`channel_subtype = $${paramIndex}`);
        queryParams.push(updateData.channel_subtype);
        paramIndex++;
      }

      if (updateData.is_active !== undefined) {
        updateFields.push(`is_active = $${paramIndex}`);
        queryParams.push(updateData.is_active);
        paramIndex++;
      }

      if (updateData.is_primary !== undefined) {
        if (updateData.is_primary) {
          await client.query(
            `UPDATE t_contact_channels 
             SET is_primary = false 
             WHERE contact_id = $1 AND tenant_id = $2 AND is_live = $3 
             AND channel_type = $4 AND is_active = true AND id != $5`,
            [
              currentChannel.contact_id, 
              tenantId, 
              isLive, 
              updateData.channel_type || currentChannel.channel_type,
              channelId
            ]
          );
        }

        updateFields.push(`is_primary = $${paramIndex}`);
        queryParams.push(updateData.is_primary);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      const updateQuery = `
        UPDATE t_contact_channels 
        SET ${updateFields.join(', ')}
        WHERE id = $1 AND tenant_id = $2 AND is_live = $3
        RETURNING *
      `;

      const result = await client.query(updateQuery, queryParams);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating channel:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Soft delete communication channel
   */
  async deleteChannel(
    tenantId: number,
    isLive: boolean,
    channelId: number
  ): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      const channelQuery = await client.query(
        'SELECT * FROM t_contact_channels WHERE id = $1 AND tenant_id = $2 AND is_live = $3',
        [channelId, tenantId, isLive]
      );

      if (channelQuery.rows.length === 0) {
        throw { code: 'CHANNEL_NOT_FOUND', message: 'Channel not found' };
      }

      const channel = channelQuery.rows[0];

      const activeChannelsCount = await client.query(
        'SELECT COUNT(*) as count FROM t_contact_channels WHERE contact_id = $1 AND tenant_id = $2 AND is_live = $3 AND is_active = true',
        [channel.contact_id, tenantId, isLive]
      );

      if (parseInt(activeChannelsCount.rows[0].count) <= 1) {
        throw { 
          code: 'LAST_CHANNEL', 
          message: 'Cannot delete the last communication channel. A contact must have at least one active channel.' 
        };
      }

      await client.query(
        'UPDATE t_contact_channels SET is_active = false WHERE id = $1 AND tenant_id = $2 AND is_live = $3',
        [channelId, tenantId, isLive]
      );

      if (channel.is_primary) {
        const otherChannelQuery = await client.query(
          `SELECT id FROM t_contact_channels 
           WHERE contact_id = $1 AND tenant_id = $2 AND is_live = $3 
           AND channel_type = $4 AND is_active = true AND id != $5
           ORDER BY created_at
           LIMIT 1`,
          [channel.contact_id, tenantId, isLive, channel.channel_type, channelId]
        );

        if (otherChannelQuery.rows.length > 0) {
          await client.query(
            'UPDATE t_contact_channels SET is_primary = true WHERE id = $1',
            [otherChannelQuery.rows[0].id]
          );
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error deleting channel:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Set channel as primary for its type
   */
  async setPrimaryChannel(
    tenantId: number,
    isLive: boolean,
    contactId: number,
    channelId: number
  ): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      const channelQuery = await client.query(
        'SELECT * FROM t_contact_channels WHERE id = $1 AND contact_id = $2 AND tenant_id = $3 AND is_live = $4 AND is_active = true',
        [channelId, contactId, tenantId, isLive]
      );

      if (channelQuery.rows.length === 0) {
        throw { code: 'CHANNEL_NOT_FOUND', message: 'Channel not found' };
      }

      const channel = channelQuery.rows[0];

      await client.query(
        `UPDATE t_contact_channels 
         SET is_primary = false 
         WHERE contact_id = $1 AND tenant_id = $2 AND is_live = $3 
         AND channel_type = $4 AND is_active = true`,
        [contactId, tenantId, isLive, channel.channel_type]
      );

      await client.query(
        'UPDATE t_contact_channels SET is_primary = true WHERE id = $1',
        [channelId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error setting primary channel:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ==================== UTILITY OPERATIONS ====================

  async getContactStats(tenantId: number, isLive: boolean) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE is_active = true) as active,
          COUNT(*) FILTER (WHERE is_active = false) as inactive,
          COUNT(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM t_customers cust 
            WHERE cust.contact_id = c.id 
            AND cust.is_live = $2 
            AND cust.is_active = true
          )) as customers,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as recent
        FROM t_contacts c
        WHERE c.tenant_id = $1 AND c.is_live = $2
      `;

      const result = await this.db.query(query, [tenantId, isLive]);
      const stats = result.rows[0];

      return {
        total: parseInt(stats.total),
        active: parseInt(stats.active),
        inactive: parseInt(stats.inactive),
        customers: parseInt(stats.customers),
        recent: parseInt(stats.recent)
      };
    } catch (error) {
      console.error('Error getting contact stats:', error);
      throw error;
    }
  }

  async searchContacts(tenantId: number, isLive: boolean, query: string): Promise<Contact[]> {
    try {
      const searchQuery = `
        SELECT DISTINCT c.*,
          EXISTS (
            SELECT 1 FROM t_customers cust 
            WHERE cust.contact_id = c.id 
            AND cust.is_live = $2 
            AND cust.is_active = true
          ) as is_customer
        FROM t_contacts c
        LEFT JOIN t_contact_channels ch ON ch.contact_id = c.id 
          AND ch.is_live = $2 AND ch.is_active = true
        WHERE c.tenant_id = $1 
          AND c.is_live = $2 
          AND c.is_active = true
          AND (
            LOWER(c.name) LIKE LOWER($3) OR 
            LOWER(ch.channel_value) LIKE LOWER($3)
          )
        ORDER BY c.name
        LIMIT 50
      `;

      const result = await this.db.query(searchQuery, [tenantId, isLive, `%${query}%`]);
      return await this.attachChannelsToContacts(result.rows, isLive);
    } catch (error) {
      console.error('Error searching contacts:', error);
      throw error;
    }
  }

  async checkContactExists(tenantId: number, isLive: boolean, email?: string, mobile?: string) {
    try {
      if (!email && !mobile) {
        return { exists: false };
      }

      const conditions: string[] = [];
      const params: any[] = [tenantId, isLive];
      let paramIndex = 3;

      if (email) {
        conditions.push(`(ch.channel_type = 'email' AND LOWER(ch.channel_value) = LOWER($${paramIndex}))`);
        params.push(email);
        paramIndex++;
      }

      if (mobile) {
        conditions.push(`(ch.channel_type = 'mobile' AND ch.channel_value = $${paramIndex})`);
        params.push(mobile);
        paramIndex++;
      }

      const query = `
        SELECT DISTINCT c.*
        FROM t_contacts c
        JOIN t_contact_channels ch ON ch.contact_id = c.id
        WHERE c.tenant_id = $1 
          AND c.is_live = $2 
          AND c.is_active = true
          AND ch.is_live = $2 
          AND ch.is_active = true
          AND (${conditions.join(' OR ')})
        LIMIT 1
      `;

      const result = await this.db.query(query, params);

      if (result.rows.length > 0) {
        const contact = await this.attachChannelsToContacts([result.rows[0]], isLive);
        return { exists: true, contact: contact[0] };
      }

      return { exists: false };
    } catch (error) {
      console.error('Error checking contact existence:', error);
      throw error;
    }
  }

  /**
   * Convert contact to customer
   */
  async convertToCustomer(
    tenantId: number,
    isLive: boolean,
    contactId: number,
    data: ConvertToCustomerRequest,
    userId: number
  ): Promise<any> {
    try {
      const customerService = new CustomerService();
      const customer = await customerService.convertContactToCustomer(
        tenantId,
        isLive,
        contactId,
        data,
        userId
      );
      return customer;
    } catch (error) {
      console.error('Error converting contact to customer:', error);
      throw error;
    }
  }

  // ==================== PRIVATE HELPERS ====================

  private async addChannelInternal(client: any, contactId: number, tenantId: number, isLive: boolean, channelData: any): Promise<ContactChannel> {
    const duplicateCheck = await client.query(
      `SELECT id FROM t_contact_channels 
       WHERE contact_id = $1 AND tenant_id = $2 AND is_live = $3 
       AND channel_type = $4 AND channel_value = $5 AND is_active = true`,
      [contactId, tenantId, isLive, channelData.channel_type, channelData.channel_value]
    );

    if (duplicateCheck.rows.length > 0) {
      throw { 
        code: 'DUPLICATE_CHANNEL', 
        message: `${channelData.channel_type} channel with value ${channelData.channel_value} already exists for this contact` 
      };
    }

    if (channelData.is_primary) {
      await client.query(
        `UPDATE t_contact_channels 
         SET is_primary = false 
         WHERE contact_id = $1 AND tenant_id = $2 AND is_live = $3 
         AND channel_type = $4 AND is_active = true`,
        [contactId, tenantId, isLive, channelData.channel_type]
      );
    }

    const insertQuery = `
      INSERT INTO t_contact_channels 
      (contact_id, tenant_id, is_live, channel_type, channel_value, channel_subtype, is_primary)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await client.query(insertQuery, [
      contactId,
      tenantId,
      isLive,
      channelData.channel_type,
      channelData.channel_value,
      channelData.channel_subtype,
      channelData.is_primary
    ]);

    return result.rows[0];
  }

  private async attachChannelsToContacts(contacts: any[], isLive: boolean): Promise<Contact[]> {
    if (contacts.length === 0) return [];

    const contactIds = contacts.map((c: any) => c.id);
    
    const channelsQuery = `
      SELECT * FROM t_contact_channels 
      WHERE contact_id = ANY($1) AND is_live = $2 AND is_active = true
      ORDER BY contact_id, is_primary DESC, created_at
    `;

    const channelsResult = await this.db.query(channelsQuery, [contactIds, isLive]);
    const channels = channelsResult.rows;

    const channelsByContact = new Map();
    channels.forEach((channel: any) => {
      if (!channelsByContact.has(channel.contact_id)) {
        channelsByContact.set(channel.contact_id, []);
      }
      channelsByContact.get(channel.contact_id).push(channel);
    });

    return contacts.map((contact: any) => ({
      ...contact,
      channels: channelsByContact.get(contact.id) || [],
      primary_channel: channelsByContact.get(contact.id)?.find((ch: any) => ch.is_primary),
      channel_count: channelsByContact.get(contact.id)?.length || 0,
      email: channelsByContact.get(contact.id)?.find((ch: any) => ch.channel_type === 'email' && ch.is_primary)?.channel_value,
      mobile: channelsByContact.get(contact.id)?.find((ch: any) => ch.channel_type === 'mobile' && ch.is_primary)?.channel_value
    }));
  }
}