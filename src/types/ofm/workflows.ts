// Field definition type for workflow step fields
export interface FieldDefinition {
  id: number;
  predefined_field_id?: number;
  default_label?: string;
  custom_field_label?: string;
  field_type: string;
  field_options?: any[];
  is_mandatory: boolean;
  is_hidden: boolean;
  sequence_order: number;
}
