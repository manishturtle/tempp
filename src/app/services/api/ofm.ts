import api from '@/services/api';
import { 
  PaginatedResponse,
  FulfillmentWorkflow,
  WorkflowVersion,
  PredefinedTemplate,
  WorkflowListParams,
  CreateWorkflowParams,
  UpdateWorkflowParams,
  CreateVersionParams
} from '../../types/ofm';

const BASE_URL = '/ofm';

// Workflow endpoints
export const fetchWorkflows = async (params?: WorkflowListParams): Promise<PaginatedResponse<FulfillmentWorkflow>> => {
  const response = await api.get(`${BASE_URL}/workflows/`, { params });
  return response.data;
};

export const fetchWorkflowDetail = async (id: string): Promise<FulfillmentWorkflow> => {
  const response = await api.get(`${BASE_URL}/workflows/${id}/`);
  return response.data;
};

export const createWorkflow = async (data: CreateWorkflowParams): Promise<FulfillmentWorkflow> => {
  const response = await api.post(`${BASE_URL}/workflows/`, data);
  return response.data;
};

export const updateWorkflow = async (id: string, data: UpdateWorkflowParams): Promise<FulfillmentWorkflow> => {
  const response = await api.patch(`${BASE_URL}/workflows/${id}/`, data);
  return response.data;
};

export const deleteWorkflow = async (id: string): Promise<void> => {
  await api.delete(`${BASE_URL}/workflows/${id}/`);
};

// Workflow Version endpoints
export const fetchWorkflowVersions = async (workflowId: string, params?: WorkflowListParams): Promise<PaginatedResponse<WorkflowVersion>> => {
  const response = await api.get(`${BASE_URL}/workflows/${workflowId}/versions/`, { params });
  return response.data;
};

export const fetchWorkflowVersion = async (workflowId: string, versionId: string): Promise<WorkflowVersion> => {
  const response = await api.get(`${BASE_URL}/workflows/${workflowId}/versions/${versionId}/`);
  return response.data;
};

export const createWorkflowVersion = async (workflowId: string, data: CreateVersionParams): Promise<WorkflowVersion> => {
  const response = await api.post(`${BASE_URL}/workflows/${workflowId}/versions/save_version/`, data);
  return response.data;
};

// Template endpoints
export const fetchPredefinedTemplates = async (params?: WorkflowListParams): Promise<PaginatedResponse<PredefinedTemplate>> => {
  const response = await api.get(`${BASE_URL}/predefined-templates/`, { params });
  return response.data;
};

export const fetchPredefinedTemplate = async (id: string): Promise<PredefinedTemplate> => {
  const response = await api.get(`${BASE_URL}/predefined-templates/${id}/`);
  return response.data;
};

export const fetchPredefinedTemplateDetail = async (id: string): Promise<PredefinedTemplate> => {
  const response = await api.get(`${BASE_URL}/predefined-templates/${id}/detail/`);
  return response.data;
};
