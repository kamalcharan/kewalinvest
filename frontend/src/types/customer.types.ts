// frontend/src/types/customer.types.ts

// Import necessary types from contact types
import { ChannelType, ContactChannelFormData } from './contact.types';

// Enums and Types
export type ContactPrefix = 'Mr' | 'Mrs' | 'Ms' | 'Dr' | 'Prof' | 'Sri';
export type CustomerPrefix = ContactPrefix;
export type SurvivalStatus = 'alive' | 'deceased';
export type OnboardingStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type AddressType = 'home' | 'office' | 'other' | 'residential' | 'mailing' | 'permanent' | 'temporary';

// Customer base interface
export interface Customer {
  id: number;
  contact_id: number;
  tenant_id: number;
  is_live: boolean;
  is_active: boolean;
  
  // Personal details
  prefix: CustomerPrefix;
  name: string;
  pan?: string;
  iwell_code?: string;
  date_of_birth?: string;
  anniversary_date?: string;
  age?: number;
  
  // Survival status
  survival_status: SurvivalStatus;
  date_of_death?: string;
  
  // Family details
  family_head_name?: string;
  family_head_iwell_code?: string;
  
  // Referral
  referred_by?: number;
  referred_by_name?: string;
  
  // Onboarding
  onboarding_form_id?: number;
  onboarding_status: OnboardingStatus;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: number;
}

// Customer with contact info - channels come from backend as simple types
export interface CustomerWithContact extends Customer {
  channels?: Array<{
    id: number;
    channel_type: string;  // From backend as string
    channel_value: string;
    channel_subtype?: string;  // From backend as optional string
    is_primary: boolean;
    is_active: boolean;
  }>;
  addresses?: CustomerAddress[];
  primary_email?: string;
  primary_mobile?: string;
  address_count?: number;
}

// Address interface
export interface CustomerAddress {
  id: number;
  customer_id: number;
  tenant_id?: number;
  is_live?: boolean;
  is_active: boolean;
  address_type: AddressType;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  is_primary: boolean;
  created_at: string;
  updated_at?: string;
}

// Form data interface - uses Contact's channel type directly
export interface CustomerFormData {
  // Contact fields
  prefix: CustomerPrefix;
  name: string;
  channels: ContactChannelFormData[];  // Use Contact's type directly for form
  
  // Customer fields
  pan: string;
  iwell_code: string;
  date_of_birth: string;
  anniversary_date: string;
  family_head_name: string;
  family_head_iwell_code: string;
  referred_by_name: string;
  survival_status: SurvivalStatus;
  date_of_death?: string;
  onboarding_status: OnboardingStatus;
  addresses: CustomerAddress[];
}

// Form errors interface
export interface CustomerFormErrors {
  // General error
  general?: string;
  
  // Contact errors
  prefix?: string;
  name?: string;
  channels?: Record<number, {
    channel_value?: string;
    channel_type?: string;
  }>;
  
  // Customer errors
  pan?: string;
  iwell_code?: string;
  date_of_birth?: string;
  anniversary_date?: string;
  date_of_death?: string;
  family_head_name?: string;
  family_head_iwell_code?: string;
  referred_by_name?: string;
  survival_status?: string;
  onboarding_status?: string;
  
  // Address errors
  addresses?: Record<number, {
    address_line1?: string;
    city?: string;
    state?: string;
    pincode?: string;
    address_type?: string;
  }>;
}

// Create/Update request interfaces - for backend API
export interface CreateCustomerRequest {
  prefix: CustomerPrefix;
  name: string;
  channels: Array<{
    channel_type: ChannelType;
    channel_value: string;
    channel_subtype?: string;
    is_primary: boolean;
  }>;
  pan?: string;
  iwell_code?: string;
  date_of_birth?: string;
  anniversary_date?: string;
  family_head_name?: string;
  family_head_iwell_code?: string;
  referred_by_name?: string;
  address?: Omit<CustomerAddress, 'id' | 'customer_id' | 'created_at' | 'updated_at'>;
}

export interface UpdateCustomerRequest {
  prefix?: CustomerPrefix;
  name?: string;
  pan?: string;
  iwell_code?: string;
  date_of_birth?: string;
  anniversary_date?: string;
  survival_status?: SurvivalStatus;
  date_of_death?: string;
  family_head_name?: string;
  family_head_iwell_code?: string;
  onboarding_status?: OnboardingStatus;
}

export interface ConvertToCustomerRequest {
  pan?: string;
  iwell_code?: string;
  date_of_birth?: string;
  anniversary_date?: string;
  family_head_name?: string;
  family_head_iwell_code?: string;
  referred_by_name?: string;
  address?: {
    address_type: AddressType;
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
    is_primary: boolean;
    is_active: boolean;
  };
}

// Address request interfaces
export interface CreateAddressRequest {
  address_type: AddressType;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  is_primary: boolean;
  is_active?: boolean;
}

export interface UpdateAddressRequest {
  address_type?: AddressType;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  is_primary?: boolean;
  is_active?: boolean;
}

// Search/List interfaces
export interface CustomerSearchParams {
  page?: number;
  page_size?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  survival_status?: SurvivalStatus;
  onboarding_status?: OnboardingStatus;
  has_address?: boolean;
  has_pan?: boolean;
  birthday_month?: number;
  anniversary_month?: number;
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

// Statistics interface
export interface CustomerStats {
  total: number;
  active: number;
  inactive: number;
  with_addresses: number;
  with_pan: number;
  birthdays_this_month: number;
  anniversaries_this_month: number;
}

// Import/Export types
export interface CustomerImportData {
  prefix: CustomerPrefix;
  name: string;
  email?: string;
  mobile?: string;
  pan?: string;
  iwell_code?: string;
  date_of_birth?: string;
  anniversary_date?: string;
  family_head_name?: string;
  family_head_iwell_code?: string;
  referred_by_name?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface CustomerExportData extends CustomerImportData {
  id: number;
  created_at: string;
  updated_at: string;
  survival_status: string;
  onboarding_status: string;
}