import { PaginatedResponse as BasePaginatedResponse } from './common';
import type { Node as ReactFlowNode } from 'reactflow';

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Base interfaces
export interface BaseModel {
  id: number;
  created_at: string;
  updated_at: string;
}

export interface Position {
  x: number;
  y: number;
}

// Node interface
export type Node<T = any> = ReactFlowNode<T>;

// Edge interface
export interface Edge {
  id: string;
  source: string;
  target: string;
  type?: string;
}

// Node Change interface
export interface NodeChange {
  id: string;
  type: 'position' | 'dimensions' | 'select' | 'remove';
  position?: { x: number; y: number };
  dimensions?: { width: number; height: number };
  selected?: boolean;
}

// Edge Change interface
export interface EdgeChange {
  id: string;
  type: 'select' | 'remove';
  selected?: boolean;
}

// Workflow interfaces
export interface Workflow extends BaseModel {
  name: string;
  description: string;
  is_active: boolean;
  is_default: boolean;
  active_version: WorkflowVersion;
  versions_count: number;
  versions: WorkflowVersion[];
}

export interface FulfillmentWorkflow extends BaseModel {
  name: string;
  description?: string;
  is_active: boolean;
  is_default: boolean;
}

export interface WorkflowStepField {
  predefined_field_id: string;
  field_name: string;
  field_type: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'DATETIME' | 'TEXTAREA' | 'DROPDOWN' | 'USER_LOOKUP';
  is_required: boolean;
  display_order: number;
  options?: { value: string; label: string }[];
  help_text?: string;
  value?: string;
  is_hidden?: boolean;
}

export interface WorkflowStep {
  id: string;
  step_name: string;
  step_type: string;
  is_required: boolean;
  base_template: number;
  sequence_order: number;
  configured_fields: WorkflowStepField[];
  fields: WorkflowStepField[];
  notes_enabled?: boolean;
  flag_enabled?: boolean;
}

export interface WorkflowStepUI extends Node<WorkflowStep> {
  step_name: string;
  step_type: string;
  is_required: boolean;
  display_order: number;
  predefined_template_id: string;
  base_template: number;
  sequence_order: number;
  fields: WorkflowStepField[];
  configured_fields: WorkflowStepField[];
}

export interface WorkflowVersion {
  id: string;
  workflow_id: string;
  version_number: number;
  is_active: boolean;
  created_at: string;
  created_by: string;
  notes: string;
  config: WorkflowVersionConfig;
}

export interface WorkflowStepConfig {
  predefined_template_id: number;
  step_name: string;
  display_order: number;
  fields: WorkflowStepFieldConfig[];
  notification_template_ids?: string[];
}

export interface WorkflowStepFieldConfig {
  predefined_field_id?: number;
  field_name: string;
  field_type: string;
  is_required: boolean;
  display_order: number;
  options?: { value: string; label: string }[];
  help_text?: string;
}

export interface WorkflowVersionConfig {
  description: string;
  enable_partial_fulfillment: boolean;
  max_hold_time_days: number;
  steps: WorkflowStepConfig[];
}

export interface WorkflowSettings {
  enablePartialFulfillment: boolean;
  maxHoldTimeDays: number;
}

// Template interfaces
export interface Template {
  id: string;
  category: string;
  description: string;
  display_name: string;
  system_name: string;
  fields: TemplateField[];
}

export interface TemplateField {
  id: string;
  name: string;
  type: string;
  required: boolean;
  default_value?: { value: string; label: string };
}

export interface PredefinedTemplate extends Omit<Template, 'id' | 'category' | 'description' | 'fields'> {
  id: number;
  category?: string;
  description?: string;
  display_name: string;
  system_name: string;
  system_trigger_type?: string;
  fields: PredefinedField[];
}

export interface PredefinedField {
  id: number;
  system_name: string;
  default_label: string;
  field_type: string;
  default_is_mandatory: boolean;
  default_is_optional?: boolean;
  sequence_order: number;
  default_options?: { value: string; label: string }[] | any;
  description?: string;
}

// Workflow Types
export interface WorkflowVersionConfigPayload {
  enable_partial_fulfillment: boolean;
  max_hold_time_days: number;
  notes?: string;
  steps: StepConfigPayload[];
}

export interface StepConfigPayload {
  predefined_template_id: number;
  step_name: string;
  display_order: number;
  fields: FieldConfigPayload[];
  notification_template_ids?: string[];
}

export interface FieldConfigPayload {
  predefined_field_id: number;
  field_name: string;
  field_type: string;
  is_required: boolean;
  validation_regex?: string;
  default_value?: any;
  options?: { value: string; label: string }[];
  help_text?: string;
  display_order: number;
}

export interface NotificationLinkPayload {
  cns_template_id: string;
}

export interface InitialWorkflowCreatePayload {
  name: string;
  description: string;
  is_active: boolean;
  is_default: boolean;
  initial_version_config: WorkflowVersionConfig;
}

export interface AuditLogEntry {
  id: number;
  workflow_version: {
    id: string;
    version_number: number;
  };
  change_timestamp: string;
  user_id: string | null;
  change_description: string;
  change_details?: {
    workflow_name?: string;
    num_steps?: number;
    version_number?: number;
    [key: string]: any;
  };
}

export interface AuditLogFilters {
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  page?: number;
  pageSize?: number;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  ordering?: string;
}

export interface WorkflowListParams extends ListParams {
  is_active?: boolean;
  is_default?: boolean;
}

export interface CreateWorkflowPayload {
  name: string;
  description?: string;
  initial_version: {
    description?: string;
    steps: {
      step_name: string;
      predefined_template_id: string;
      display_order: number;
      fields: {
        predefined_field_id: number;
        field_name: string;
        field_type: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'DATETIME' | 'TEXTAREA' | 'DROPDOWN' | 'USER_LOOKUP';
        is_required: boolean;
        display_order: number;
        options?: string[];
        help_text?: string;
      }[];
    }[];
  };
}

export interface CreateWorkflowParams {
  name: string;
  description?: string;
  is_active?: boolean;
  is_default?: boolean;
  initial_version_config: WorkflowVersionConfig;
}

export interface UpdateWorkflowParams {
  name?: string;
  description?: string;
  is_default?: boolean;
  is_active?: boolean;
}

export interface CreateVersionParams {
  description?: string;
  steps: WorkflowStep[];
}

export interface WorkflowAuditLog {
  id: number;
  workflow_id: number;
  version_id: number;
  action: string;
  details: any;
  created_at: string;
  created_by: number;
}

export interface WorkflowVersionAuditLog {
  id: number;
  workflow_version: {
    id: number;
    workflow: {
      id: number;
      name: string;
      description: string;
      is_active: boolean;
      is_default: boolean;
      created_at: string;
      updated_at: string;
      created_by: number;
      updated_by: number;
    };
    version_number: number;
    notes: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    created_by: number;
    updated_by: number;
  };
  change_timestamp: string;
  user_id: string;
  change_description: string;
  change_details: {
    num_steps: number;
    new_version?: number;
    workflow_name: string;
    previous_version?: number;
    version_number?: number;
  };
}

export interface WorkflowVersionAuditLogResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: WorkflowVersionAuditLog[];
}

export interface WorkflowCreateResponse {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  initial_version: WorkflowVersion;
}

export interface StepNodeData {
  id: string;
  step_name: string;
  step_type: string;
  is_required: boolean;
  template?: {
    id: number;
    name: string;
  };
  fields: WorkflowStepFieldConfig[];
  notification_template_ids?: string[];
  sequence_order: number;
}
