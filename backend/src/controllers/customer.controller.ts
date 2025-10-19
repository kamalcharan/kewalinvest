// backend/src/controllers/customer.controller.ts

import { Request, Response } from 'express';
import { pool } from '../config/database';
import { CustomerService } from '../services/customer.service';
import {
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CustomerSearchParams,
  CreateAddressRequest,
  CreateBookmarkRequest,
  UpdateBookmarkRequest
} from '../types/customer.types';

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: number;
    tenant_id: number;
  };
  environment?: 'live' | 'test';
}

export class CustomerController {
  private customerService: CustomerService;

  constructor() {
    this.customerService = new CustomerService();
  }

  /**
   * Get all customers with pagination
   * UPDATED: Now passes userId for bookmark data
   */
  getCustomers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const params = req.query as CustomerSearchParams;

      const result = await this.customerService.getCustomers(
        user!.tenant_id,
        isLive,
        params,
        user!.user_id  // NEW: Pass userId
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Error getting customers:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get customers'
      });
    }
  };

  /**
   * Get customer statistics
   * UPDATED: Now passes userId for bookmark stats
   */
  getCustomerStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      const stats = await this.customerService.getCustomerStats(
        user!.tenant_id,
        isLive,
        user!.user_id  // NEW: Pass userId
      );

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Error getting customer stats:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get customer statistics'
      });
    }
  };

  /**
   * Get single customer by ID
   * UPDATED: Now passes userId for bookmark data
   */
  getCustomer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const customerId = parseInt(req.params.id);

      if (isNaN(customerId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid customer ID'
        });
        return;
      }

      const customer = await this.customerService.getCustomer(
        user!.tenant_id,
        isLive,
        customerId,
        user!.user_id  // NEW: Pass userId
      );

      if (!customer) {
        res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
        return;
      }

      res.json({
        success: true,
        data: customer
      });
    } catch (error: any) {
      console.error('Error getting customer:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get customer'
      });
    }
  };

  /**
   * Create new customer
   */
  createCustomer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const data = req.body as CreateCustomerRequest;

      console.log('=== CREATE CUSTOMER DEBUG ===');
      console.log('Create Data:', JSON.stringify(data, null, 2));
      console.log('Address in create:', data.address);
      console.log('========================');

      if (!data.contact_id && !data.name) {
        res.status(400).json({
          success: false,
          error: 'Either contact_id or name is required'
        });
        return;
      }

      const customer = await this.customerService.createCustomer(
        user!.tenant_id,
        isLive,
        data,
        user!.user_id
      );

      res.status(201).json({
        success: true,
        data: customer,
        message: 'Customer created successfully'
      });
    } catch (error: any) {
      console.error('Error creating customer:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create customer'
      });
    }
  };

  /**
   * Update customer
   */
  updateCustomer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { user, environment } = req;
      const isLive = environment === 'live';
      const customerId = parseInt(req.params.id);
      const { addresses, is_active, ...customerData } = req.body as UpdateCustomerRequest & { addresses?: any[]; is_active?: boolean };

      console.log('=== UPDATE DEBUG START ===');
      console.log('Customer ID:', customerId);
      console.log('Addresses received:', JSON.stringify(addresses, null, 2));
      console.log('Addresses length:', addresses?.length || 'undefined');
      console.log('is_active:', is_active);
      console.log('=== UPDATE DEBUG END ===');

      if (isNaN(customerId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid customer ID'
        });
        return;
      }

      // Validate survival status logic
      if (customerData.survival_status === 'deceased' && !customerData.date_of_death) {
        res.status(400).json({
          success: false,
          error: 'Date of death is required when marking as deceased'
        });
        return;
      }

      // Get customer to find contact_id before update
      const customerCheck = await client.query(
        'SELECT contact_id FROM t_customers WHERE id = $1 AND tenant_id = $2 AND is_live = $3',
        [customerId, user!.tenant_id, isLive]
      );

      if (customerCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
        return;
      }

      const contactId = customerCheck.rows[0].contact_id;

      // Update customer data (including is_active if provided)
      const updateData = is_active !== undefined 
        ? { ...customerData, is_active } 
        : customerData;
        
      await this.customerService.updateCustomer(
        user!.tenant_id,
        isLive,
        customerId,
        updateData
      );

      // CASCADE: If is_active changed, update linked contact
      if (is_active !== undefined) {
        await client.query(
          `UPDATE t_contacts
           SET is_active = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2 AND tenant_id = $3 AND is_live = $4`,
          [is_active, contactId, user!.tenant_id, isLive]
        );
      }

      // Handle addresses if provided
      if (addresses && Array.isArray(addresses) && addresses.length > 0) {
        for (const address of addresses) {
          try {
            if (address.id) {
              console.log('Existing address update not implemented for id:', address.id);
            } else {
              await this.customerService.addAddress(
                user!.tenant_id,
                isLive,
                customerId,
                address
              );
            }
          } catch (addressError: any) {
            console.error('Error processing address:', addressError);
          }
        }
      }

      await client.query('COMMIT');

      // Fetch updated customer data with addresses
      const updatedCustomer = await this.customerService.getCustomer(
        user!.tenant_id,
        isLive,
        customerId,
        user!.user_id  // NEW: Pass userId
      );

      res.json({
        success: true,
        data: updatedCustomer,
        message: 'Customer updated successfully'
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error updating customer:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update customer'
      });
    } finally {
      client.release();
    }
  };

  /**
   * Delete customer (soft delete) - MODIFIED: Added cascade to contact
   */
  deleteCustomer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { user, environment } = req;
      const isLive = environment === 'live';
      const customerId = parseInt(req.params.id);

      if (isNaN(customerId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid customer ID'
        });
        return;
      }

      // Get customer to find contact_id
      const customerCheck = await client.query(
        'SELECT contact_id FROM t_customers WHERE id = $1 AND tenant_id = $2 AND is_live = $3',
        [customerId, user!.tenant_id, isLive]
      );

      if (customerCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
        return;
      }

      const contactId = customerCheck.rows[0].contact_id;

      // Deactivate customer
      await this.customerService.deleteCustomer(
        user!.tenant_id,
        isLive,
        customerId
      );

      // CASCADE: Also deactivate linked contact
      await client.query(
        `UPDATE t_contacts
         SET is_active = false, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND tenant_id = $2 AND is_live = $3`,
        [contactId, user!.tenant_id, isLive]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Customer deactivated successfully'
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error deleting customer:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete customer'
      });
    } finally {
      client.release();
    }
  };

  /**
   * Activate customer - NEW METHOD
   */
  activateCustomer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { user, environment } = req;
      const isLive = environment === 'live';
      const customerId = parseInt(req.params.id);

      if (isNaN(customerId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid customer ID'
        });
        return;
      }

      // Get customer to find contact_id
      const customerCheck = await client.query(
        'SELECT contact_id FROM t_customers WHERE id = $1 AND tenant_id = $2 AND is_live = $3',
        [customerId, user!.tenant_id, isLive]
      );

      if (customerCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
        return;
      }

      const contactId = customerCheck.rows[0].contact_id;

      // Activate the customer
      await client.query(
        `UPDATE t_customers 
         SET is_active = true, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND tenant_id = $2 AND is_live = $3`,
        [customerId, user!.tenant_id, isLive]
      );

      // CASCADE: Also activate linked contact
      await client.query(
        `UPDATE t_contacts
         SET is_active = true, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND tenant_id = $2 AND is_live = $3`,
        [contactId, user!.tenant_id, isLive]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Customer activated successfully'
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error activating customer:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to activate customer'
      });
    } finally {
      client.release();
    }
  };

  /**
   * Add customer address
   */
  addAddress = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const customerId = parseInt(req.params.id);
      const data = req.body as CreateAddressRequest;

      if (isNaN(customerId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid customer ID'
        });
        return;
      }

      if (!data.address_line1 || !data.city || !data.state || !data.pincode) {
        res.status(400).json({
          success: false,
          error: 'Address line 1, city, state, and pincode are required'
        });
        return;
      }

      const address = await this.customerService.addAddress(
        user!.tenant_id,
        isLive,
        customerId,
        data
      );

      res.status(201).json({
        success: true,
        data: address,
        message: 'Address added successfully'
      });
    } catch (error: any) {
      console.error('Error adding address:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to add address'
      });
    }
  };

  /**
   * Update customer address
   */
  updateAddress = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        message: 'Address update not implemented yet'
      });
    } catch (error: any) {
      console.error('Error updating address:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update address'
      });
    }
  };

  /**
   * Delete customer address
   */
  deleteAddress = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        message: 'Address deletion not implemented yet'
      });
    } catch (error: any) {
      console.error('Error deleting address:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete address'
      });
    }
  };

  /**
   * Get customer's JTBD summary (for displaying badges/status)
   * GET /api/customers/:id/jtbd-summary
   */
  getCustomerJTBDSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const customerId = parseInt(req.params.id);

      if (isNaN(customerId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid customer ID'
        });
        return;
      }

      // Query JTBD summary
      const query = `
        SELECT 
          customer_id,
          COUNT(*) as jtbd_count,
          MIN(next_alert_date) as next_alert_date,
          COUNT(*) FILTER (WHERE priority = 'critical') as critical_count,
          COUNT(*) FILTER (WHERE priority = 'high') as high_count,
          COUNT(*) FILTER (WHERE is_active = true) as active_count
        FROM t_jtbd_configurations
        WHERE tenant_id = $1 AND is_live = $2 AND customer_id = $3
        GROUP BY customer_id
      `;

      const result = await pool.query(query, [user!.tenant_id, isLive, customerId]);

      if (result.rows.length === 0) {
        // No JTBD configured for this customer
        res.json({
          success: true,
          data: {
            customer_id: customerId,
            jtbd_count: 0,
            jtbd_setup_status: 'not_setup',
            next_alert_date: null,
            critical_count: 0,
            high_count: 0,
            active_count: 0
          }
        });
        return;
      }

      const row = result.rows[0];

      res.json({
        success: true,
        data: {
          customer_id: customerId,
          jtbd_count: parseInt(row.jtbd_count) || 0,
          jtbd_setup_status: parseInt(row.jtbd_count) > 0 ? 'active' : 'not_setup',
          next_alert_date: row.next_alert_date,
          critical_count: parseInt(row.critical_count) || 0,
          high_count: parseInt(row.high_count) || 0,
          active_count: parseInt(row.active_count) || 0
        }
      });
    } catch (error: any) {
      console.error('Error getting customer JTBD summary:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get customer JTBD summary'
      });
    }
  };

  // ==================== BOOKMARK ENDPOINTS (NEW) ====================

  /**
   * Get bookmark reasons for tenant
   * GET /api/customers/bookmark-reasons
   */
  getBookmarkReasons = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      const reasons = await this.customerService.getBookmarkReasons(
        user!.tenant_id,
        isLive
      );

      res.json({
        success: true,
        data: {
          reasons,
          total: reasons.length
        }
      });
    } catch (error: any) {
      console.error('Error getting bookmark reasons:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get bookmark reasons'
      });
    }
  };

  /**
   * Add bookmark to customer
   * POST /api/customers/:id/bookmark
   */
  addBookmark = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const customerId = parseInt(req.params.id);
      const data = req.body as CreateBookmarkRequest;

      if (isNaN(customerId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid customer ID'
        });
        return;
      }

      // Validate that either reason_id or custom_reason is provided
      if (!data.reason_id && !data.custom_reason) {
        res.status(400).json({
          success: false,
          error: 'Either reason_id or custom_reason must be provided'
        });
        return;
      }

      const bookmark = await this.customerService.addBookmark(
        user!.tenant_id,
        isLive,
        customerId,
        user!.user_id,
        data
      );

      res.status(201).json({
        success: true,
        data: bookmark,
        message: 'Customer bookmarked successfully'
      });
    } catch (error: any) {
      console.error('Error adding bookmark:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to add bookmark'
      });
    }
  };

  /**
   * Remove bookmark from customer
   * DELETE /api/customers/:id/bookmark
   */
  removeBookmark = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const customerId = parseInt(req.params.id);

      if (isNaN(customerId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid customer ID'
        });
        return;
      }

      await this.customerService.removeBookmark(
        user!.tenant_id,
        isLive,
        customerId,
        user!.user_id
      );

      res.json({
        success: true,
        message: 'Bookmark removed successfully'
      });
    } catch (error: any) {
      console.error('Error removing bookmark:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to remove bookmark'
      });
    }
  };

  /**
   * Update bookmark
   * PATCH /api/customers/:id/bookmark
   */
  updateBookmark = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const customerId = parseInt(req.params.id);
      const data = req.body as UpdateBookmarkRequest;

      if (isNaN(customerId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid customer ID'
        });
        return;
      }

      const bookmark = await this.customerService.updateBookmark(
        user!.tenant_id,
        isLive,
        customerId,
        user!.user_id,
        data
      );

      res.json({
        success: true,
        data: bookmark,
        message: 'Bookmark updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating bookmark:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update bookmark'
      });
    }
  };
}