// backend/src/types/customer.types.ts

import { Contact, ContactChannel } from './contact.types';

export interface Customer {
  id: number;
  contact_id: number;
  tenant_id: number;
  is_live: boolean;
  is_active: boolean;
  
  // Encrypted fields (will be decrypted when fetched)
  pan?: string;
  iwell_code?: string;
  
  // Personal details
  date_of_birth?: string;
  anniversary_date?: string;
  age?: number; // Computed field
  
  // Survival status
  survival_status: 'alive' | 'deceased';
  date_of_death?: string;
  
  // Family details
  family_head_name?: string;
  family_head_iwell_code?: string;
  
  // Referral
  referred_by?: number;
  referred_by_name?: string;
  referred_by_contact?: Contact;
  
  // Onboarding
  onboarding_form_id?: number;
  onboarding_status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  
  // System fields
  created_at: string;
  updated_at: string;
  created_by?: number;
  
  // Relations
  contact?: Contact;
  addresses?: CustomerAddress[];
}

export interface CustomerAddress {
  id: number;
  customer_id: number;
  tenant_id: number;
  is_live: boolean;
  is_active: boolean;
  
  address_type: 'residential' | 'office' | 'mailing' | 'permanent' | 'temporary' | 'other';
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  
  is_primary: boolean;
  created_at: string;
}

export interface CustomerWithContact extends Customer {
  // Contact fields
  prefix: string;
  name: string;
  channels: ContactChannel[];
  primary_email?: string;
  primary_mobile?: string;
  channel_count: number;
}

export interface CreateCustomerRequest {
  contact_id?: number; // If converting existing contact
  
  // If creating new contact + customer
  prefix?: string;
  name?: string;
  channels?: Array<{
    channel_type: string;
    channel_value: string;
    channel_subtype?: string;
    is_primary?: boolean;
  }>;
  
  // Customer specific fields
  pan?: string;
  iwell_code?: string;
  date_of_birth?: string;
  anniversary_date?: string;
  family_head_name?: string;
  family_head_iwell_code?: string;
  referred_by?: number;
  referred_by_name?: string;
  
  // Optional initial address
  address?: Omit<CustomerAddress, 'id' | 'customer_id' | 'tenant_id' | 'is_live' | 'created_at'>;
}

export interface UpdateCustomerRequest {
  // Customer fields
  pan?: string;
  iwell_code?: string;
  date_of_birth?: string;
  anniversary_date?: string;
  survival_status?: 'alive' | 'deceased';
  date_of_death?: string;
  family_head_name?: string;
  family_head_iwell_code?: string;
  referred_by?: number;
  referred_by_name?: string;
  onboarding_status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  is_active?: boolean;
}

export interface CreateAddressRequest {
  address_type: 'residential' | 'office' | 'mailing' | 'permanent' | 'temporary' | 'other';
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  country?: string;
  pincode: string;
  is_primary?: boolean;
}

export interface UpdateAddressRequest extends Partial<CreateAddressRequest> {
  is_active?: boolean;
}

export interface CustomerListResponse {
  customers: CustomerWithContact[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface CustomerSearchParams {
  search?: string;
  pan?: string; // Will search encrypted
  iwell_code?: string; // Will search encrypted
  survival_status?: 'alive' | 'deceased';
  onboarding_status?: string;
  has_address?: boolean;
  referred_by?: number;
  date_of_birth_from?: string;
  date_of_birth_to?: string;
  created_from?: string;
  created_to?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface CustomerStats {
  total: number;
  active: number;
  inactive: number;
  alive: number;
  deceased: number;
  with_pan: number;
  with_addresses: number;
  onboarding_pending: number;
  onboarding_completed: number;
  recent_30_days: number;
}

export interface ConvertToCustomerRequest {
  pan?: string;
  iwell_code?: string;
  date_of_birth?: string;
  anniversary_date?: string;
  family_head_name?: string;
  family_head_iwell_code?: string;
  referred_by?: number;
  referred_by_name?: string;
  address?: CreateAddressRequest;
}

// Import related types
export interface CustomerImportRow {
  // Contact fields
  prefix?: string;
  name: string;
  email?: string;
  mobile?: string;
  whatsapp?: string;
  
  // Customer fields
  pan?: string;
  iwell_code?: string;
  date_of_birth?: string;
  anniversary_date?: string;
  family_head_name?: string;
  family_head_iwell_code?: string;
  referred_by_name?: string;
  
  // Address fields
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  address_type?: string;
}

export interface ImportResult {
  success: boolean;
  total_rows: number;
  processed: number;
  created: number;
  updated: number;
  failed: number;
  errors: Array<{
    row: number;
    errors: string[];
    data: any;
  }>;
  file_id?: number;
}