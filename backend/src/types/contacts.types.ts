// backend/src/types/contact.types.ts
export interface Contact {
  id: number;
  tenant_id: number;
  is_live: boolean;
  is_active: boolean;
  prefix: string;
  name: string;
  created_at: string;
  updated_at: string;
  created_by?: number;
  is_customer: boolean;
  customer_id?: number;
  channel_count: number;
  channels?: ContactChannel[];
}

export interface ContactChannel {
  id: number;
  contact_id: number;
  tenant_id: number;
  is_live: boolean;
  is_active: boolean;
  channel_type: string;
  channel_value: string;
  channel_subtype: string;
  is_primary: boolean;
  created_at: string;
}

export interface ContactListResponse {
  contacts: Contact[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ContactSearchParams {
  search?: string;
  prefix?: string;
  channel_type?: string;
  has_customer?: boolean;
  is_active?: boolean;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}