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

  /**
   * Find customer by name (normalized) with optional PAN tiebreaker
   * Uses the normalize_customer_name() SQL function for exact matching
   *
   * @returns Object with customerId and match details, or null if no match/ambiguous
   */
  async findCustomerByNameWithPAN(
    customerName: string,
    pan: string | null | undefined,
    tenantId: number,
    isLive: boolean
  ): Promise<{
    customerId: number | null;
    matchType: 'exact_name' | 'name_with_pan' | 'ambiguous' | 'not_found';
    matchCount: number;
    ambiguousMatches?: Array<{ id: number; name: string; pan: string | null }>;
  }> {
    try {
      // Query using normalized_name column (uses the SQL function via computed column)
      const query = `
        SELECT
          c.id,
          ct.name,
          ct.pan
        FROM t_customers c
        INNER JOIN t_contacts ct ON ct.id = c.contact_id
        WHERE c.tenant_id = $1
          AND c.is_live = $2
          AND c.is_active = true
          AND ct.is_active = true
          AND ct.normalized_name = normalize_customer_name($3)
      `;

      const result = await this.db.query(query, [tenantId, isLive, customerName]);

      // No matches found
      if (result.rows.length === 0) {
        return {
          customerId: null,
          matchType: 'not_found',
          matchCount: 0
        };
      }

      // Single match - return immediately
      if (result.rows.length === 1) {
        return {
          customerId: result.rows[0].id,
          matchType: 'exact_name',
          matchCount: 1
        };
      }

      // Multiple matches - use PAN as tiebreaker if available
      if (pan) {
        const upperPAN = pan.toUpperCase();
        const panMatch = result.rows.find(row =>
          row.pan && row.pan.toUpperCase() === upperPAN
        );

        if (panMatch) {
          return {
            customerId: panMatch.id,
            matchType: 'name_with_pan',
            matchCount: result.rows.length
          };
        }
      }

      // Multiple matches and no PAN to resolve - ambiguous
      return {
        customerId: null,
        matchType: 'ambiguous',
        matchCount: result.rows.length,
        ambiguousMatches: result.rows.map(row => ({
          id: row.id,
          name: row.name,
          pan: row.pan
        }))
      };

    } catch (error) {
      console.error('Error finding customer by name:', error);
      throw error;
    }
  }

  /**
   * Find customer for transaction import - orchestrates lookup based on method
   *
   * @param lookupMethod - 'iwell_code', 'customer_name', or 'both'
   * @param data - Object containing iwell_code, customer_name, and pan fields
   * @returns Lookup result with customer ID and match metadata
   */
  async findCustomerForTransaction(
    lookupMethod: 'iwell_code' | 'customer_name' | 'both',
    data: {
      iwell_code?: string;
      customer_name?: string;
      pan?: string;
    },
    tenantId: number,
    isLive: boolean
  ): Promise<{
    customerId: number | null;
    matchType: string;
    matchConfidence: 'high' | 'medium' | 'low' | 'ambiguous' | 'not_found';
    ambiguousMatches?: Array<{ id: number; name: string; pan: string | null }>;
    errorMessage?: string;
  }> {
    try {
      // Method 1: IWELL code only
      if (lookupMethod === 'iwell_code') {
        if (!data.iwell_code) {
          return {
            customerId: null,
            matchType: 'iwell_code',
            matchConfidence: 'not_found',
            errorMessage: 'IWELL code is required but not provided'
          };
        }

        const customerId = await this.findCustomerByIwellCode(
          data.iwell_code,
          tenantId,
          isLive
        );

        if (customerId) {
          return {
            customerId,
            matchType: 'exact_iwell',
            matchConfidence: 'high'
          };
        }

        return {
          customerId: null,
          matchType: 'iwell_code',
          matchConfidence: 'not_found',
          errorMessage: `No customer found with IWELL code: ${data.iwell_code}`
        };
      }

      // Method 2: Customer name only
      if (lookupMethod === 'customer_name') {
        if (!data.customer_name) {
          return {
            customerId: null,
            matchType: 'customer_name',
            matchConfidence: 'not_found',
            errorMessage: 'Customer name is required but not provided'
          };
        }

        const nameResult = await this.findCustomerByNameWithPAN(
          data.customer_name,
          data.pan,
          tenantId,
          isLive
        );

        if (nameResult.matchType === 'exact_name') {
          return {
            customerId: nameResult.customerId,
            matchType: 'exact_name',
            matchConfidence: 'high'
          };
        }

        if (nameResult.matchType === 'name_with_pan') {
          return {
            customerId: nameResult.customerId,
            matchType: 'name_with_pan',
            matchConfidence: 'high'
          };
        }

        if (nameResult.matchType === 'ambiguous') {
          return {
            customerId: null,
            matchType: 'customer_name',
            matchConfidence: 'ambiguous',
            ambiguousMatches: nameResult.ambiguousMatches,
            errorMessage: data.pan
              ? `Multiple customers found with name "${data.customer_name}" and none match PAN ${data.pan}`
              : `Multiple customers found with name "${data.customer_name}". PAN required for tiebreaker`
          };
        }

        return {
          customerId: null,
          matchType: 'customer_name',
          matchConfidence: 'not_found',
          errorMessage: `No customer found with name: ${data.customer_name}`
        };
      }

      // Method 3: Both (try IWELL first, fallback to name)
      if (lookupMethod === 'both') {
        // Try IWELL code first if available
        if (data.iwell_code) {
          const iwellCustomerId = await this.findCustomerByIwellCode(
            data.iwell_code,
            tenantId,
            isLive
          );

          if (iwellCustomerId) {
            return {
              customerId: iwellCustomerId,
              matchType: 'exact_iwell',
              matchConfidence: 'high'
            };
          }
        }

        // Fallback to name if IWELL not found
        if (data.customer_name) {
          const nameResult = await this.findCustomerByNameWithPAN(
            data.customer_name,
            data.pan,
            tenantId,
            isLive
          );

          if (nameResult.matchType === 'exact_name') {
            return {
              customerId: nameResult.customerId,
              matchType: 'exact_name_fallback',
              matchConfidence: 'medium'
            };
          }

          if (nameResult.matchType === 'name_with_pan') {
            return {
              customerId: nameResult.customerId,
              matchType: 'name_with_pan_fallback',
              matchConfidence: 'medium'
            };
          }

          if (nameResult.matchType === 'ambiguous') {
            return {
              customerId: null,
              matchType: 'both',
              matchConfidence: 'ambiguous',
              ambiguousMatches: nameResult.ambiguousMatches,
              errorMessage: `IWELL code "${data.iwell_code}" not found. Multiple customers found with name "${data.customer_name}". ${data.pan ? 'None match PAN ' + data.pan : 'PAN required for tiebreaker'}`
            };
          }
        }

        // Neither IWELL nor name worked
        return {
          customerId: null,
          matchType: 'both',
          matchConfidence: 'not_found',
          errorMessage: `No customer found with ${data.iwell_code ? 'IWELL code "' + data.iwell_code + '"' : ''} ${data.iwell_code && data.customer_name ? 'or' : ''} ${data.customer_name ? 'name "' + data.customer_name + '"' : ''}`
        };
      }

      // Invalid method
      return {
        customerId: null,
        matchType: 'invalid',
        matchConfidence: 'not_found',
        errorMessage: `Invalid lookup method: ${lookupMethod}`
      };

    } catch (error) {
      console.error('Error in findCustomerForTransaction:', error);
      throw error;
    }
  }
}