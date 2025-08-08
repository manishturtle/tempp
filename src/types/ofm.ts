export interface PredefinedTemplate {
  id: number;
  system_name: string;
  display_name: string;
  description: string;
  system_trigger_type: string;
  fields: PredefinedField[];
}

export interface WorkflowStepField {
  predefined_field_id?: string;
  field_name: string;
  field_type: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'DATETIME' | 'TEXTAREA' | 'DROPDOWN' | 'USER_LOOKUP';
  is_required: boolean;
  display_order: number;
  options?: { value: string; label: string }[];
  help_text?: string;
  value?: string;
  is_hidden?: boolean;
}

export interface PredefinedField extends Omit<WorkflowStepField, 'value' | 'is_hidden'> {}

export interface WorkflowStep {
  base_template: number;
  step_name: string;
  sequence_order: number;
  configured_fields: WorkflowStepField[];
}

export interface WorkflowVersion {
  enable_partial_fulfillment: boolean;
  max_hold_time_days: number;
  notes?: string;
  steps: WorkflowStep[];
}

export interface Workflow {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  is_default: boolean;
  versions: WorkflowVersion[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
