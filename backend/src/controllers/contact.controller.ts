// backend/src/controllers/contact.controller.ts
import { Request, Response } from 'express';
import { pool } from '../config/database';
import { ContactService } from '../services/contact.service';
import { SimpleLogger } from '../services/simpleLogger.service';

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: number;
    tenant_id: number;
  };
  environment?: 'live' | 'test';
}

export class ContactController {
  
  getContacts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      
      const {
        search,
        prefix,
        is_active,
        page = 1,
        page_size = 20,
        sort_by = 'name',
        sort_order = 'asc'
      } = req.query;

      const whereConditions: string[] = [
        'c.tenant_id = $1',
        'c.is_live = $2'
      ];
      const queryParams: any[] = [user!.tenant_id, isLive];
      let paramIndex = 3;

      if (search && typeof search === 'string' && search.trim()) {
        whereConditions.push(`LOWER(c.name) LIKE LOWER($${paramIndex})`);
        queryParams.push(`%${search.trim()}%`);
        paramIndex++;
      }

      if (prefix && typeof prefix === 'string') {
        whereConditions.push(`c.prefix = $${paramIndex}`);
        queryParams.push(prefix);
        paramIndex++;
      }

      if (is_active === 'true' || is_active === 'false') {
        whereConditions.push(`c.is_active = $${paramIndex}`);
        queryParams.push(is_active === 'true');
        paramIndex++;
      }

      const validSortFields = ['name', 'created_at', 'updated_at', 'prefix'];
      const sortField = validSortFields.includes(sort_by as string) ? sort_by : 'name';
      const sortDirection = sort_order === 'desc' ? 'DESC' : 'ASC';

      const offset = (Number(page) - 1) * Number(page_size);

      const contactsQuery = `
        SELECT 
          c.*,
          COUNT(*) OVER() as total_count,
          COALESCE(c.is_customer, false) as is_customer,
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

      queryParams.push(Number(page_size), offset);
      const result = await pool.query(contactsQuery, queryParams);
      const contacts = result.rows;

      // Fetch channels for all contacts
      if (contacts.length > 0) {
        const contactIds = contacts.map((c: any) => c.id);
        const channelsQuery = `
          SELECT * FROM t_contact_channels 
          WHERE contact_id = ANY($1) AND is_live = $2 AND is_active = true
          ORDER BY contact_id, is_primary DESC, created_at
        `;
        const channelsResult = await pool.query(channelsQuery, [contactIds, isLive]);
        const channels = channelsResult.rows;

        // Group channels by contact
        const channelsByContact = new Map();
        channels.forEach((channel: any) => {
          if (!channelsByContact.has(channel.contact_id)) {
            channelsByContact.set(channel.contact_id, []);
          }
          channelsByContact.get(channel.contact_id).push(channel);
        });

        // Attach channels to contacts
        contacts.forEach((contact: any) => {
          contact.channels = channelsByContact.get(contact.id) || [];
        });
      }

      const total = contacts.length > 0 ? parseInt(contacts[0].total_count) : 0;
      const totalPages = Math.ceil(total / Number(page_size));

      res.json({
        success: true,
        data: {
          contacts: contacts,
          total,
          page: Number(page),
          page_size: Number(page_size),
          total_pages: totalPages,
          has_next: Number(page) < totalPages,
          has_prev: Number(page) > 1
        }
      });
    } catch (error: any) {
      console.error('Error getting contacts:', error);
      SimpleLogger.error('ContactController', 'Failed to retrieve contacts list', 'getContacts', { 
        tenantId: req.user?.tenant_id, 
        environment: req.environment, 
        searchParams: req.query,
        error: error.message 
      }, req.user?.user_id, req.user?.tenant_id, error.stack);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get contacts'
      });
    }
  };

  getContactStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      
      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE is_active = true) as active,
          COUNT(*) FILTER (WHERE is_active = false) as inactive,
          COUNT(*) FILTER (WHERE is_customer = true) as customers,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as recent
        FROM t_contacts c
        WHERE c.tenant_id = $1 AND c.is_live = $2
      `;

      const result = await pool.query(query, [user!.tenant_id, isLive]);
      const stats = result.rows[0];

      res.json({
        success: true,
        data: {
          total: parseInt(stats.total),
          active: parseInt(stats.active),
          inactive: parseInt(stats.inactive),
          customers: parseInt(stats.customers),
          recent: parseInt(stats.recent)
        }
      });
    } catch (error: any) {
      console.error('Error getting contact stats:', error);
      SimpleLogger.error('ContactController', 'Failed to retrieve contact statistics', 'getContactStats', { 
        tenantId: req.user?.tenant_id, 
        environment: req.environment, 
        error: error.message 
      }, req.user?.user_id, req.user?.tenant_id, error.stack);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get contact statistics'
      });
    }
  };

  createContact = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { user, environment } = req;
      const isLive = environment === 'live';
      const { prefix, name, channels, is_customer = false } = req.body;

      // Validate input
      if (!name || !prefix) {
        res.status(400).json({
          success: false,
          error: 'Name and prefix are required'
        });
        return;
      }

      if (!channels || channels.length === 0) {
        res.status(400).json({
          success: false,
          error: 'At least one communication channel is required'
        });
        return;
      }

      // Insert contact
      const contactQuery = `
        INSERT INTO t_contacts (tenant_id, is_live, prefix, name, is_customer, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const contactResult = await client.query(contactQuery, [
        user!.tenant_id,
        isLive,
        prefix,
        name,
        is_customer,
        user!.user_id
      ]);

      const contact = contactResult.rows[0];

      // Insert channels
      const insertedChannels = [];
      for (const channelData of channels) {
        const isPrimary = channelData.is_primary || false;

        const channelQuery = `
          INSERT INTO t_contact_channels 
          (contact_id, tenant_id, is_live, channel_type, channel_value, channel_subtype, is_primary)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;

        const channelResult = await client.query(channelQuery, [
          contact.id,
          user!.tenant_id,
          isLive,
          channelData.channel_type,
          channelData.channel_value,
          channelData.channel_subtype || 'personal',
          isPrimary
        ]);

        insertedChannels.push(channelResult.rows[0]);
      }

      await client.query('COMMIT');

      // Return contact with channels
      contact.channels = insertedChannels;
      contact.channel_count = insertedChannels.length;

      res.status(201).json({
        success: true,
        data: contact,
        message: 'Contact created successfully'
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error creating contact:', error);
      SimpleLogger.error('ContactController', 'Failed to create new contact', 'createContact', { 
        tenantId: req.user?.tenant_id, 
        contactName: req.body.name, 
        channelCount: req.body.channels?.length || 0,
        error: error.message 
      }, req.user?.user_id, req.user?.tenant_id, error.stack);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create contact'
      });
    } finally {
      client.release();
    }
  };

  getContact = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const contactId = parseInt(req.params.id);

      if (isNaN(contactId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid contact ID'
        });
        return;
      }

      const query = `
        SELECT c.*, 
          COALESCE(c.is_customer, false) as is_customer,
          (
            SELECT COUNT(*) FROM t_contact_channels ch 
            WHERE ch.contact_id = c.id 
            AND ch.is_live = $2 
            AND ch.is_active = true
          ) as channel_count
        FROM t_contacts c
        WHERE c.tenant_id = $1 AND c.is_live = $2 AND c.id = $3
      `;

      const result = await pool.query(query, [user!.tenant_id, isLive, contactId]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Contact not found'
        });
        return;
      }

      const contact = result.rows[0];

      // Fetch channels
      const channelsQuery = `
        SELECT * FROM t_contact_channels 
        WHERE contact_id = $1 AND is_live = $2 AND is_active = true
        ORDER BY is_primary DESC, created_at
      `;
      const channelsResult = await pool.query(channelsQuery, [contactId, isLive]);
      contact.channels = channelsResult.rows;

      res.json({
        success: true,
        data: contact
      });
    } catch (error: any) {
      console.error('Error getting contact:', error);
      SimpleLogger.error('ContactController', 'Failed to retrieve contact details', 'getContact', { 
        contactId: req.params.id, 
        tenantId: req.user?.tenant_id, 
        error: error.message 
      }, req.user?.user_id, req.user?.tenant_id, error.stack);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get contact'
      });
    }
  };

  updateContact = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { user, environment } = req;
      const isLive = environment === 'live';
      const contactId = parseInt(req.params.id);
      const { prefix, name, is_active, is_customer, channels } = req.body;

      if (isNaN(contactId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid contact ID'
        });
        return;
      }

      // Update contact basic info
      const updateFields: string[] = [];
      const queryParams: any[] = [user!.tenant_id, isLive, contactId];
      let paramIndex = 4;

      if (prefix !== undefined) {
        updateFields.push(`prefix = $${paramIndex}`);
        queryParams.push(prefix);
        paramIndex++;
      }

      if (name !== undefined) {
        updateFields.push(`name = $${paramIndex}`);
        queryParams.push(name);
        paramIndex++;
      }

      if (is_active !== undefined) {
        updateFields.push(`is_active = $${paramIndex}`);
        queryParams.push(is_active);
        paramIndex++;
      }

      if (is_customer !== undefined) {
        updateFields.push(`is_customer = $${paramIndex}`);
        queryParams.push(is_customer);
        paramIndex++;
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');

      const query = `
        UPDATE t_contacts 
        SET ${updateFields.join(', ')}
        WHERE tenant_id = $1 AND is_live = $2 AND id = $3
        RETURNING *
      `;

      const result = await client.query(query, queryParams);

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({
          success: false,
          error: 'Contact not found'
        });
        return;
      }

      const contact = result.rows[0];

      // Handle channel updates if provided
      if (channels && Array.isArray(channels)) {
        // Get existing channels
        const existingChannelsResult = await client.query(
          'SELECT id FROM t_contact_channels WHERE contact_id = $1 AND is_live = $2 AND is_active = true',
          [contactId, isLive]
        );
        const existingChannelIds = existingChannelsResult.rows.map((row: any) => row.id);

        // Process each channel
        const updatedChannels = [];
        for (const channelData of channels) {
          if (channelData.id && existingChannelIds.includes(channelData.id)) {
            // Update existing channel
            const updateChannelQuery = `
              UPDATE t_contact_channels 
              SET channel_type = $1, channel_value = $2, channel_subtype = $3, is_primary = $4
              WHERE id = $5 AND contact_id = $6 AND is_live = $7
              RETURNING *
            `;
            const updateResult = await client.query(updateChannelQuery, [
              channelData.channel_type,
              channelData.channel_value,
              channelData.channel_subtype || 'personal',
              channelData.is_primary || false,
              channelData.id,
              contactId,
              isLive
            ]);
            if (updateResult.rows.length > 0) {
              updatedChannels.push(updateResult.rows[0]);
            }
          } else if (!channelData.id) {
            // Insert new channel
            const insertChannelQuery = `
              INSERT INTO t_contact_channels 
              (contact_id, tenant_id, is_live, channel_type, channel_value, channel_subtype, is_primary)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
              RETURNING *
            `;
            const insertResult = await client.query(insertChannelQuery, [
              contactId,
              user!.tenant_id,
              isLive,
              channelData.channel_type,
              channelData.channel_value,
              channelData.channel_subtype || 'personal',
              channelData.is_primary || false
            ]);
            updatedChannels.push(insertResult.rows[0]);
          }
        }

        contact.channels = updatedChannels;
      } else {
        // Fetch existing channels if not updating
        const channelsResult = await client.query(
          'SELECT * FROM t_contact_channels WHERE contact_id = $1 AND is_live = $2 AND is_active = true ORDER BY is_primary DESC, created_at',
          [contactId, isLive]
        );
        contact.channels = channelsResult.rows;
      }

      await client.query('COMMIT');

      contact.channel_count = contact.channels ? contact.channels.length : 0;

      res.json({
        success: true,
        data: contact,
        message: 'Contact updated successfully'
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error updating contact:', error);
      SimpleLogger.error('ContactController', 'Failed to update contact', 'updateContact', { 
        contactId: req.params.id, 
        tenantId: req.user?.tenant_id, 
        updates: Object.keys(req.body),
        error: error.message 
      }, req.user?.user_id, req.user?.tenant_id, error.stack);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update contact'
      });
    } finally {
      client.release();
    }
  };

  deleteContact = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const contactId = parseInt(req.params.id);

      if (isNaN(contactId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid contact ID'
        });
        return;
      }

      const query = `
        UPDATE t_contacts 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $1 AND is_live = $2 AND id = $3
      `;

      const result = await pool.query(query, [user!.tenant_id, isLive, contactId]);

      if (result.rowCount === 0) {
        res.status(404).json({
          success: false,
          error: 'Contact not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Contact deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting contact:', error);
      SimpleLogger.error('ContactController', 'Failed to delete contact', 'deleteContact', { 
        contactId: req.params.id, 
        tenantId: req.user?.tenant_id, 
        error: error.message 
      }, req.user?.user_id, req.user?.tenant_id, error.stack);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete contact'
      });
    }
  };

  // Channel-specific operations
  addChannel = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { user, environment } = req;
      const isLive = environment === 'live';
      const contactId = parseInt(req.params.id);
      const channelData = req.body;

      if (isNaN(contactId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid contact ID'
        });
        return;
      }

      // Verify contact exists
      const contactCheck = await client.query(
        'SELECT id FROM t_contacts WHERE id = $1 AND tenant_id = $2 AND is_live = $3 AND is_active = true',
        [contactId, user!.tenant_id, isLive]
      );

      if (contactCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({
          success: false,
          error: 'Contact not found'
        });
        return;
      }

      // Insert channel
      const channelQuery = `
        INSERT INTO t_contact_channels 
        (contact_id, tenant_id, is_live, channel_type, channel_value, channel_subtype, is_primary)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const channelResult = await client.query(channelQuery, [
        contactId,
        user!.tenant_id,
        isLive,
        channelData.channel_type,
        channelData.channel_value,
        channelData.channel_subtype || 'personal',
        channelData.is_primary || false
      ]);

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        data: channelResult.rows[0],
        message: 'Channel added successfully'
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error adding channel:', error);
      SimpleLogger.error('ContactController', 'Failed to add contact channel', 'addChannel', { 
        contactId: req.params.id, 
        channelType: req.body.channel_type,
        tenantId: req.user?.tenant_id, 
        error: error.message 
      }, req.user?.user_id, req.user?.tenant_id, error.stack);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to add channel'
      });
    } finally {
      client.release();
    }
  };

  updateChannel = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const contactId = parseInt(req.params.id);
      const channelId = parseInt(req.params.channelId);
      const updateData = req.body;

      if (isNaN(contactId) || isNaN(channelId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid contact or channel ID'
        });
        return;
      }

      const updateQuery = `
        UPDATE t_contact_channels 
        SET channel_type = $1, channel_value = $2, channel_subtype = $3, is_primary = $4
        WHERE id = $5 AND contact_id = $6 AND tenant_id = $7 AND is_live = $8
        RETURNING *
      `;

      const result = await pool.query(updateQuery, [
        updateData.channel_type,
        updateData.channel_value,
        updateData.channel_subtype || 'personal',
        updateData.is_primary || false,
        channelId,
        contactId,
        user!.tenant_id,
        isLive
      ]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Channel not found'
        });
        return;
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Channel updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating channel:', error);
      SimpleLogger.error('ContactController', 'Failed to update contact channel', 'updateChannel', { 
        contactId: req.params.id, 
        channelId: req.params.channelId,
        tenantId: req.user?.tenant_id, 
        error: error.message 
      }, req.user?.user_id, req.user?.tenant_id, error.stack);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update channel'
      });
    }
  };

  deleteChannel = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const contactId = parseInt(req.params.id);
      const channelId = parseInt(req.params.channelId);

      if (isNaN(contactId) || isNaN(channelId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid contact or channel ID'
        });
        return;
      }

      const deleteQuery = `
        UPDATE t_contact_channels 
        SET is_active = false
        WHERE id = $1 AND contact_id = $2 AND tenant_id = $3 AND is_live = $4
      `;

      const result = await pool.query(deleteQuery, [
        channelId,
        contactId,
        user!.tenant_id,
        isLive
      ]);

      if (result.rowCount === 0) {
        res.status(404).json({
          success: false,
          error: 'Channel not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Channel deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting channel:', error);
      SimpleLogger.error('ContactController', 'Failed to delete contact channel', 'deleteChannel', { 
        contactId: req.params.id, 
        channelId: req.params.channelId,
        tenantId: req.user?.tenant_id, 
        error: error.message 
      }, req.user?.user_id, req.user?.tenant_id, error.stack);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete channel'
      });
    }
  };

  // Simple placeholder methods - keep as is
  searchContacts = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.json({ success: true, data: [], message: 'Search not implemented yet' });
  };

  checkContactExists = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.json({ success: true, data: { exists: false }, message: 'Check not implemented yet' });
  };

  exportContacts = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.json({ success: true, data: { export_url: '/exports/contacts.csv' }, message: 'Export not implemented yet' });
  };

  bulkAction = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.json({ success: true, data: { affected_count: 0 }, message: 'Bulk actions not implemented yet' });
  };

  /**
   * Convert contact to customer
   */
  convertToCustomer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const contactId = parseInt(req.params.id);
      const data = req.body;

      if (isNaN(contactId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid contact ID'
        });
        return;
      }

      const contactService = new ContactService();
      const customer = await contactService.convertToCustomer(
        user!.tenant_id,
        isLive,
        contactId,
        data,
        user!.user_id
      );

      res.status(201).json({
        success: true,
        data: customer,
        message: 'Contact successfully converted to customer'
      });
    } catch (error: any) {
      console.error('Error converting contact to customer:', error);
      SimpleLogger.error('ContactController', 'Contact to customer conversion failed', 'convertToCustomer', { 
        contactId: req.params.id, 
        tenantId: req.user?.tenant_id, 
        error: error.message 
      }, req.user?.user_id, req.user?.tenant_id, error.stack);
      
      if (error.message === 'Contact not found') {
        res.status(404).json({
          success: false,
          error: 'Contact not found'
        });
      } else if (error.message === 'Contact is already a customer') {
        res.status(400).json({
          success: false,
          error: 'Contact is already a customer'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to convert contact to customer'
        });
      }
    }
  };
}