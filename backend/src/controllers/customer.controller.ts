// backend/src/controllers/customer.controller.ts

import { Request, Response } from 'express';
import { CustomerService } from '../services/customer.service';
import {
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CustomerSearchParams,
  CreateAddressRequest
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
   */
  getCustomers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const params = req.query as CustomerSearchParams;

      const result = await this.customerService.getCustomers(
        user!.tenant_id,
        isLive,
        params
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
   */
  getCustomerStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      const stats = await this.customerService.getCustomerStats(
        user!.tenant_id,
        isLive
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
        customerId
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

      // ADD THIS LOGGING  
    console.log('=== CREATE CUSTOMER DEBUG ===');
    console.log('Create Data:', JSON.stringify(data, null, 2));
    console.log('Address in create:', data.address);
    console.log('========================');

      // Validation
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
  try {
    const { user, environment } = req;
    const isLive = environment === 'live';
    const customerId = parseInt(req.params.id);
    const { addresses, ...customerData } = req.body as UpdateCustomerRequest & { addresses?: any[] };

// ADD THIS LOGGING
    console.log('=== UPDATE DEBUG START ===');
    console.log('Customer ID:', customerId);
    console.log('Addresses received:', JSON.stringify(addresses, null, 2));
    console.log('Addresses length:', addresses?.length || 'undefined');
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

    // Update customer data
    await this.customerService.updateCustomer(
      user!.tenant_id,
      isLive,
      customerId,
      customerData
    );

    // Handle addresses if provided
    if (addresses && Array.isArray(addresses) && addresses.length > 0) {
      for (const address of addresses) {
        try {
          if (address.id) {
            // Skip existing address updates for now - can be implemented later if needed
            console.log('Existing address update not implemented for id:', address.id);
          } else {
            // Add new address
            await this.customerService.addAddress(
              user!.tenant_id,
              isLive,
              customerId,
              address
            );
          }
        } catch (addressError: any) {
          console.error('Error processing address:', addressError);
          // Continue with other addresses instead of failing the entire request
        }
      }
    }

    // Fetch updated customer data with addresses
    const updatedCustomer = await this.customerService.getCustomer(
      user!.tenant_id,
      isLive,
      customerId
    );

    res.json({
      success: true,
      data: updatedCustomer,
      message: 'Customer updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating customer:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update customer'
    });
  }
};




  /**
   * Delete customer (soft delete)
   */
  deleteCustomer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

      await this.customerService.deleteCustomer(
        user!.tenant_id,
        isLive,
        customerId
      );

      res.json({
        success: true,
        message: 'Customer deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete customer'
      });
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

      // Validation
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
      // Implementation for updating address
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
      // Implementation for deleting address
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
}