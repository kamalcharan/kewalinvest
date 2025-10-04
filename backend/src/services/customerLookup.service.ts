//backend/src/services/customerLookup.service.ts

import { Pool } from 'pg';
import { pool } from '../config/database';
import { EncryptionUtil } from '../utils/encryption.util';

export class CustomerLookupService {
  private db: Pool;
  
  constructor() {
    this.db = pool;
  }
  
  async findCustomerByIwellCode(
    iwellCodePlain: string,
    tenantId: number,
    isLive: boolean
  ): Promise<number | null> {
    try {
      const upperIwell = iwellCodePlain.toUpperCase();
      
      // Get all customers with encrypted IWELL codes
      const query = `
        SELECT id, iwell_code_encrypted 
        FROM t_customers
        WHERE tenant_id = $1 
          AND is_live = $2 
          AND is_active = true
          AND iwell_code_encrypted IS NOT NULL
      `;
      
      const result = await this.db.query(query, [tenantId, isLive]);
      
      // Decrypt each and compare
      for (const customer of result.rows) {
        try {
          const decrypted = EncryptionUtil.decrypt(customer.iwell_code_encrypted);
          if (decrypted === upperIwell) {
            return customer.id;
          }
        } catch (error) {
          // Skip customers with decryption errors
          continue;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error finding customer by IWELL code:', error);
      throw error;
    }
  }
}