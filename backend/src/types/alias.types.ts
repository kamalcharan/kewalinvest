// backend/src/types/alias.types.ts

export interface Alias {
  id: number;
  tenant_id: number;
  alias_name: string;
  description?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface AliasMember {
  customer_id: number;
  contact_id: number;
  name: string;
  iwell_code?: string;
  email?: string;
  mobile?: string;
  is_primary: boolean;
  added_at: string;
  current_value?: number;
}

export interface AliasWithMembers extends Alias {
  member_count: number;
  primary_customer_name?: string;
  total_aum: number;
  members?: AliasMember[];
}

export interface AliasPortfolioSummary {
  alias_id: number;
  alias_name: string;
  total_members: number;
  total_invested: number;
  total_current_value: number;
  total_returns: number;
  total_return_percentage: number;
  members: AliasMemberPortfolio[];
}

export interface AliasMemberPortfolio {
  customer_id: number;
  name: string;
  iwell_code?: string;
  is_primary: boolean;
  total_invested: number;
  current_value: number;
  returns: number;
  return_percentage: number;
  scheme_count: number;
  portfolio_percentage: number;
}

export interface AliasAssetAllocation {
  alias_id: number;
  total_value: number;
  allocations: AliasAssetCategory[];
  by_member: AliasMemberAllocation[];
}

export interface AliasAssetCategory {
  category: string;
  value: number;
  percentage: number;
  scheme_count: number;
}

export interface AliasMemberAllocation {
  customer_id: number;
  name: string;
  iwell_code?: string;
  allocations: {
    category: string;
    value: number;
    percentage: number;
  }[];
}

export interface AliasGoalSummary {
  total_goals: number;
  total_target_amount: number;
  total_current_value: number;
  on_track_count: number;
  behind_count: number;
  ahead_count: number;
  goals_by_member: {
    customer_id: number;
    name: string;
    goal_count: number;
    total_target: number;
    current_value: number;
  }[];
}

export interface AliasMeetingSummary {
  total_meetings: number;
  upcoming_count: number;
  completed_count: number;
  next_meeting?: {
    customer_id: number;
    customer_name: string;
    meeting_date: string;
    meeting_type: string;
  };
  meetings_by_member: {
    customer_id: number;
    name: string;
    meeting_count: number;
    last_meeting_date?: string;
  }[];
}

// Request types
export interface CreateAliasRequest {
  alias_name: string;
  description?: string;
  customer_ids: number[];
  primary_customer_id: number;
}

export interface UpdateAliasRequest {
  alias_name?: string;
  description?: string;
  primary_customer_id?: number;
}

export interface AddAliasMembersRequest {
  customer_ids: number[];
}

export interface RemoveAliasMembersRequest {
  customer_ids: number[];
}

// API Response Types
export interface GetAliasesResponse {
  success: boolean;
  data?: AliasWithMembers[];
  pagination?: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
  error?: string;
}

export interface GetAliasResponse {
  success: boolean;
  data?: AliasWithMembers;
  error?: string;
}

export interface GetAliasMembersResponse {
  success: boolean;
  data?: AliasMember[];
  error?: string;
}

export interface GetAliasPortfolioResponse {
  success: boolean;
  data?: AliasPortfolioSummary;
  error?: string;
}

export interface GetAliasAssetAllocationResponse {
  success: boolean;
  data?: AliasAssetAllocation;
  error?: string;
}

export interface GetAliasGoalSummaryResponse {
  success: boolean;
  data?: AliasGoalSummary;
  error?: string;
}

export interface GetAliasMeetingSummaryResponse {
  success: boolean;
  data?: AliasMeetingSummary;
  error?: string;
}

export interface CreateAliasResponse {
  success: boolean;
  data?: Alias;
  error?: string;
}

export interface UpdateAliasResponse {
  success: boolean;
  data?: Alias;
  error?: string;
}

export interface DeleteAliasResponse {
  success: boolean;
  message?: string;
  error?: string;
}
