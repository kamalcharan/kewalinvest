// backend/src/services/customerLookup.service.ts
import { Pool } from 'pg';
import { pool } from '../config/database';

export class CustomerLookupService {
  private db: Pool;
  
  constructor() {
    this.db = pool;
  }
  
  /**
   * Find customer by plain text IWELL code
   * NO ENCRYPTION - Direct plain text comparison
   */
  async findCustomerByIwellCode(
    iwellCodePlain: string,
    tenantId: number,
    isLive: boolean
  ): Promise<number | null> {
    try {
      const upperIwell = iwellCodePlain.toUpperCase();
      
      // Query plain text iwell_code directly
      const query = `
        SELECT id 
        FROM t_customers
        WHERE tenant_id = $1 
          AND is_live = $2 
          AND is_active = true
          AND UPPER(iwell_code) = $3
      `;
      
      const result = await this.db.query(query, [tenantId, isLive, upperIwell]);
      
      if (result.rows.length > 0) {
        return result.rows[0].id;
      }
      
      return null;
    } catch (error) {
      console.error('Error finding customer by IWELL code:', error);
      throw error;
    }
  }
  
  /**
   * Find customer by PAN (plain text)
   */
  async findCustomerByPAN(
    pan: string,
    tenantId: number,
    isLive: boolean
  ): Promise<number | null> {
    try {
      const upperPAN = pan.toUpperCase();
      
      const query = `
        SELECT id 
        FROM t_customers
        WHERE tenant_id = $1 
          AND is_live = $2 
          AND is_active = true
          AND UPPER(pan) = $3
      `;
      
      const result = await this.db.query(query, [tenantId, isLive, upperPAN]);
      
      if (result.rows.length > 0) {
        return result.rows[0].id;
      }
      
      return null;
    } catch (error) {
      console.error('Error finding customer by PAN:', error);
      throw error;
    }
  }
  
  /**
   * Find customer by contact ID
   */
  async findCustomerByContactId(
    contactId: number,
    tenantId: number,
    isLive: boolean
  ): Promise<number | null> {
    try {
      const query = `
        SELECT id 
        FROM t_customers
        WHERE contact_id = $1
          AND tenant_id = $2 
          AND is_live = $3 
          AND is_active = true
      `;
      
      const result = await this.db.query(query, [contactId, tenantId, isLive]);
      
      if (result.rows.length > 0) {
        return result.rows[0].id;
      }
      
      return null;
    } catch (error) {
      console.error('Error finding customer by contact ID:', error);
      throw error;
    }
  }
}