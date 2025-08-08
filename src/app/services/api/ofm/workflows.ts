import api from '@/app/services/api';
import type {
  InitialWorkflowCreatePayload,
  WorkflowVersionConfigPayload,
  FulfillmentWorkflow,
  WorkflowVersion,
  WorkflowVersionConfig,
} from '@/app/types/ofm';

interface CreateWorkflowPayload {
  name: string;
  description?: string;
  is_active?: boolean;
  is_default?: boolean;
  initial_version_config: WorkflowVersionConfig;
}

interface SaveWorkflowVersionPayload {
  description?: string;
  steps: {
    id: string;
    step_name: string;
    step_type: string;
    is_required: boolean;
    base_template: number;
    sequence_order: number;
    fields: {
      predefined_field_id: number;
      field_name: string;
      field_type: string;
      is_required: boolean;
      display_order: number;
      options?: { value: string; label: string }[];
    }[];
  }[];
}

const BASE_URL = '/api/yash/ofm/workflows/';

export async function createWorkflowWithInitialVersion(
  payload: CreateWorkflowPayload
): Promise<FulfillmentWorkflow> {
  const response = await fetch(`${BASE_URL}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(JSON.stringify(error));
  }

  return response.json();
}

export async function saveNewWorkflowVersion(
  workflowId: string,
  payload: SaveWorkflowVersionPayload
): Promise<WorkflowVersion> {
  const response = await api.post(`${BASE_URL}/${workflowId}/versions/save_version`, payload);
  return response.data;
}

export async function getWorkflow(workflowId: string): Promise<FulfillmentWorkflow> {
  const response = await api.get(`${BASE_URL}/${workflowId}`);
  return response.data;
}

export async function getWorkflowVersion(
  workflowId: string,
  versionId: string
): Promise<WorkflowVersion> {
  const response = await api.get(`${BASE_URL}/${workflowId}/versions/${versionId}`);
  return response.data;
}
