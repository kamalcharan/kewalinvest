// frontend/src/types/family.types.ts

export interface FamilyMember {
  customer_id: number;
  contact_id: number;
  name: string;
  iwell_code: string;
  email?: string;
  mobile?: string;
  is_family_head: boolean;
  family_head_name?: string;
  family_head_iwell_code?: string;
  onboarding_status?: string;
  created_at: string;
}

export interface FamilyPortfolioSummary {
  family_head_iwell_code: string;
  family_head_name: string;
  total_members: number;
  total_invested: number;
  total_current_value: number;
  total_returns: number;
  total_return_percentage: number;
  day_change: number;
  day_change_percentage: number;
  members: FamilyMemberPortfolio[];
}

export interface FamilyMemberPortfolio {
  customer_id: number;
  name: string;
  iwell_code: string;
  is_family_head: boolean;
  total_invested: number;
  current_value: number;
  returns: number;
  return_percentage: number;
  scheme_count: number;
  portfolio_percentage: number;
}

export interface FamilyAssetAllocation {
  family_head_iwell_code: string;
  total_value: number;
  allocations: FamilyAssetCategory[];
  by_member: FamilyMemberAllocation[];
}

export interface FamilyAssetCategory {
  category: string;
  value: number;
  percentage: number;
  scheme_count: number;
}

export interface FamilyMemberAllocation {
  customer_id: number;
  name: string;
  iwell_code: string;
  allocations: {
    category: string;
    value: number;
    percentage: number;
  }[];
}

export interface FamilyGoalSummary {
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

export interface FamilyMeetingSummary {
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
