/**
 * Opportunity Types
 * 
 * TypeScript interfaces for opportunity-related data models
 */

/**
 * Opportunity Stage Type
 * Represents the type of a sales pipeline stage
 */
export type OpportunityStageType = 'OPEN' | 'CLOSED_WON' | 'CLOSED_LOST';

/**
 * Opportunity Stage Interface
 * Represents a stage in the sales pipeline
 */
export interface OpportunityStage {
  id: string | number;
  name: string;
  type: OpportunityStageType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
}

/**
 * Opportunity Status Interface
 * Represents a status that can be assigned to opportunities
 */
export interface OpportunityStatus {
  id: string | number;
  name: string;
  desc?: string;
  status: boolean;
  type: OpportunityStageType;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
}


/**
 * Opportunity Role Interface
 * Represents a role that can be assigned to team members in an opportunity
 */
export interface OpportunityRole {
  id: string | number;
  name: string;
  desc?: string;
  status: boolean;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
}

/**
 * Opportunity Type Interface
 * Represents a type that can be assigned to opportunities
 */
export interface OpportunityType {
  id: string | number;
  name: string;
  desc?: string;
  status: boolean;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
}

/**
 * Opportunity Lead Source Interface
 * Represents a lead source that can be assigned to opportunities
 */
export interface OpportunityLeadSource {
  id: string | number;
  name: string;
  desc?: string;
  status: boolean;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
}

export interface Opportunity {
  id: string | number;
  name: string;
  account: any; // Detailed account data when fetched
  account_id: string | number; // For write operations
  primary_contact?: any; // Detailed contact data when fetched
  primary_contact_id?: string | number; // For write operations
  amount: number;
  close_date: string;
  status_id: string | number; // For write operations
  service_sub_category_id: string | number; // For write operations
  team_members_data?: [];
  team_members?: [];
  owner: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
}

/**
 * OpportunityStagesResponse Interface
 * Response structure for opportunity stages list API
 */
export interface OpportunityStagesResponse {
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
  results: OpportunityStage[];
  active_count?: number;
  inactive_count?: number;
}

/**
 * OpportunityResponse Interface
 * Response structure for opportunities list API
 */
export interface OpportunitiesResponse {
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
  results: Opportunity[];
  active_count?: number;
  inactive_count?: number;
}

/**
 * Sale Process Stage Interface
 * Represents a stage within a sales process
 */
export interface SaleProcessStage {
  id: string | number;
  stage: number;
  stage_name: string;
  stage_type: OpportunityStageType;
  order: number;
  probability: number;
  forecast_category: string;
}

/**
 * Sale Process Interface
 * Represents a sales process that defines a series of stages
 */
export interface SaleProcess {
  id: string | number;
  name: string;
  description?: string;
  is_active: boolean;
  stages?: SaleProcessStage[];
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
}

/**
 * SaleProcessesResponse Interface
 * Response structure for sale processes list API
 */
export interface SaleProcessesResponse {
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
  results: SaleProcess[];
  active_count?: number;
  inactive_count?: number;
}

export interface OpportunityStatusesResponse {
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
  results: OpportunityStatus[];
  active_count?: number;
  inactive_count?: number;
}