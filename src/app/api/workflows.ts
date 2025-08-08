import { API_BASE_URL } from '@/config';
import type { CreateWorkflowPayload } from '@/types/ofm';

export async function createWorkflow(data: CreateWorkflowPayload) {
  const response = await fetch(`${API_BASE_URL}/workflows/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to create workflow');
  }

  return response.json();
}

export async function getWorkflow(id: string) {
  const response = await fetch(`${API_BASE_URL}/workflows/${id}/`);

  if (!response.ok) {
    throw new Error('Failed to fetch workflow');
  }

  return response.json();
}

export async function updateWorkflow(id: string, data: Partial<CreateWorkflowPayload>) {
  const response = await fetch(`${API_BASE_URL}/workflows/${id}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to update workflow');
  }

  return response.json();
}

export async function deleteWorkflow(id: string) {
  const response = await fetch(`${API_BASE_URL}/workflows/${id}/`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete workflow');
  }
}

export async function getWorkflows(params?: Record<string, any>) {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
  }

  const response = await fetch(
    `${API_BASE_URL}/workflows/?${searchParams.toString()}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch workflows');
  }

  return response.json();
}

export async function saveWorkflowVersion(
  workflowId: string,
  data: { description: string; steps: any[] }
) {
  const response = await fetch(
    `${API_BASE_URL}/workflows/${workflowId}/versions/save_version/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to save workflow version');
  }

  return response.json();
}
