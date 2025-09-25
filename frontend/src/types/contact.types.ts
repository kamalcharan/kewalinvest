// frontend/src/types/contact.types.ts

// Base types
export type ContactPrefix = 'Mr' | 'Mrs' | 'Ms' | 'Dr' | 'Prof' | 'Sri';
export type ChannelType = 'email' | 'mobile' | 'whatsapp' | 'instagram' | 'twitter' | 'linkedin' | 'other';
export type ChannelSubtype = 'personal' | 'work' | 'other';

// Communication Channel Interface
export interface ContactChannel {
  id: number;
  contact_id: number;
  tenant_id: number;
  is_live: boolean;
  is_active: boolean;
  channel_type: ChannelType;
  channel_value: string;
  channel_subtype: ChannelSubtype;
  is_primary: boolean;
  created_at: string;
}

// Contact Interface
export interface Contact {
  id: number;
  tenant_id: number;
  is_live: boolean;
  is_active: boolean;
  prefix: ContactPrefix;
  name: string;
  created_at: string;
  updated_at: string;
  created_by: number;
  
  // Related data
  channels?: ContactChannel[];
  primary_channel?: ContactChannel;
  is_customer?: boolean;
  customer_id?: number;
  
  // Computed fields
  channel_count?: number;
  email?: string; // Primary email
  mobile?: string; // Primary mobile
}

// Form Data Types
export interface ContactFormData {
  prefix: ContactPrefix;
  name: string;
  channels: ContactChannelFormData[];
}

export interface ContactChannelFormData {
  id?: number; // For editing existing channels
  channel_type: ChannelType;
  channel_value: string;
  channel_subtype: ChannelSubtype;
  is_primary: boolean;
  _temp_id?: string; // For new channels in form
}

// API Request/Response Types
export interface CreateContactRequest {
  prefix: ContactPrefix;
  name: string;
  channels: Omit<ContactChannelFormData, 'id' | '_temp_id'>[];
}

export interface UpdateContactRequest {
  prefix?: ContactPrefix;
  name?: string;
  is_active?: boolean;
  is_customer?:boolean;
  channels?: Array<{
    id?: number;
    channel_type: ChannelType;
    channel_value: string;
    channel_subtype?: ChannelSubtype;
    is_primary?: boolean;
  }>;
}

export interface CreateChannelRequest {
  contact_id: number;
  channel_type: ChannelType;
  channel_value: string;
  channel_subtype: ChannelSubtype;
  is_primary: boolean;
}

export interface UpdateChannelRequest {
  channel_type?: ChannelType;
  channel_value?: string;
  channel_subtype?: ChannelSubtype;
  is_primary?: boolean;
  is_active?: boolean;
}

// Search and Filter Types
export interface ContactSearchParams {
  search?: string;
  prefix?: ContactPrefix;
  channel_type?: ChannelType;
  has_customer?: boolean;
  is_active?: boolean;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
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

// Bulk Operations
export interface BulkActionRequest {
  contact_ids: number[];
  action: 'activate' | 'deactivate' | 'delete' | 'export';
}

export interface BulkActionResponse {
  success: boolean;
  affected_count: number;
  errors?: string[];
  export_url?: string; // For export action
}

// Validation Types
export interface ContactValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface ContactFormErrors {
  prefix?: string;
  name?: string;
  channels?: {
    [index: number]: {
      channel_type?: string;
      channel_value?: string;
      channel_subtype?: string;
    };
  };
  general?: string;
}

// Filter and Sort Types
export interface ContactFilter {
  field: keyof Contact | keyof ContactChannel;
  operator: 'eq' | 'ne' | 'like' | 'in' | 'not_in';
  value: any;
}

export interface ContactSort {
  field: keyof Contact;
  direction: 'asc' | 'desc';
}

// Component Props Types
export interface ContactListProps {
  searchParams?: ContactSearchParams;
  onContactSelect?: (contact: Contact) => void;
  onContactEdit?: (contact: Contact) => void;
  onContactDelete?: (contact: Contact) => void;
  selectable?: boolean;
  selectedContacts?: number[];
  onSelectionChange?: (selectedIds: number[]) => void;
}

export interface ContactCardProps {
  contact: Contact;
  onEdit?: (contact: Contact) => void;
  onDelete?: (contact: Contact) => void;
  onViewDetails?: (contact: Contact) => void;
  onConvertToCustomer?: (contact: Contact) => void;
  selectable?: boolean;
  selected?: boolean;
  onSelectionChange?: (contactId: number, selected: boolean) => void;
}

export interface ContactFormProps {
  initialData?: Partial<ContactFormData>;
  onSubmit: (data: ContactFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit';
}

export interface ChannelFormProps {
  channels: ContactChannelFormData[];
  onChannelsChange: (channels: ContactChannelFormData[]) => void;
  errors?: ContactFormErrors['channels'];
}

// State Management Types
export interface ContactState {
  contacts: Contact[];
  selectedContact: Contact | null;
  isLoading: boolean;
  error: string | null;
  searchParams: ContactSearchParams;
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  selectedContactIds: number[];
}

export interface ContactActions {
  loadContacts: (params?: ContactSearchParams) => Promise<void>;
  createContact: (data: CreateContactRequest) => Promise<Contact>;
  updateContact: (id: number, data: UpdateContactRequest) => Promise<Contact>;
  deleteContact: (id: number) => Promise<void>;
  getContact: (id: number) => Promise<Contact>;
  searchContacts: (query: string) => Promise<Contact[]>;
  bulkAction: (request: BulkActionRequest) => Promise<BulkActionResponse>;
  addChannel: (request: CreateChannelRequest) => Promise<ContactChannel>;
  updateChannel: (id: number, data: UpdateChannelRequest) => Promise<ContactChannel>;
  deleteChannel: (id: number) => Promise<void>;
  setSelectedContact: (contact: Contact | null) => void;
  setSelectedContactIds: (ids: number[]) => void;
  clearError: () => void;
}

// Utility Types
export type ContactWithChannels = Contact & {
  channels: ContactChannel[];
};

export type ContactSummary = Pick<Contact, 'id' | 'name' | 'prefix'> & {
  primary_email?: string;
  primary_mobile?: string;
  channel_count: number;
  is_customer: boolean;
};

// Export types for easier imports
export type {
  Contact as ContactType,
  ContactChannel as ContactChannelType,
  ContactFormData as ContactFormDataType,
  ContactListResponse as ContactListResponseType
};