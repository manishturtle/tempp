import { AxiosResponse } from 'axios';
import axiosInstance from './axiosInstance';

// Define interfaces for the service ticket data structure
export interface Requester {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  allow_portal_access: boolean;
}

export interface Agent {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  phone_number: string;
  is_admin: boolean;
  allow_portal_access: boolean;
}

export interface Function {
  id: number;
  name: string;
  description: string;
  status: string;
  sop_details: {
    id: number;
    sop_group: {
      id: number;
      process: {
        id: number;
        name: string;
        description: string;
        status: string;
        audience: string;
        created_at: string;
        updated_at: string;
      };
      base_name: string;
      created_at: string;
      updated_at: string;
    };
    sop_name: string;
    version_number: number;
    description: string;
    effective_date: string | null;
    status: string;
    allow_step_reordering: boolean;
    created_at: string;
    updated_at: string;
  };
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
}

export interface ServiceCategory {
  id: number;
  name: string;
  description: string;
  status: string;
  function: Function;
  created_at: string;
  updated_at: string;
}

export interface ServiceSubCategory {
  id: number;
  name: string;
  description: string;
  status: string;
  service_category: ServiceCategory;
  created_at: string;
  updated_at: string;
}

export interface SourceStep {
  id: number;
  name: string;
  description: string;
  sequence: number;
  step_type: string;
  step_configuration: any;
}

export interface SOPStepObject {
  id: number;
  object_type: string;
  object_name: string;
  sequence: number;
  object_configuration: any;
}

export interface FormFieldDefinition {
  id: number;
  field_name: string;
  field_type: string;
  field_attributes: any;
}

export interface SubtaskField {
  id: number;
  subtask: number;
  source_form_field: FormFieldDefinition;
  field_name: string;
  field_type: string;
  field_attributes: any;
  field_value: any;
  client_id: string;
  company_id: string;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
}

export interface ServiceTicketSubtask {
  id: number;
  task: number;
  sop_step_object: SOPStepObject | null;
  assigned_agent: Agent | null;
  assigned_agent_id: number | null;
  subtask_name: string;
  sequence: number;
  subtask_start_date: string | null;
  subtask_end_date: string | null;
  status: string;
  subtask_type: string | null;
  subtask_configuration: any;
  client_id: string;
  company_id: string;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
  form_fields: SubtaskField[];
}

export interface ServiceTicketTask {
  id: number;
  service_ticket: number;
  source_step: SourceStep | null;
  assigned_agent: Agent | null;
  assigned_agent_id: number | null;
  task_name: string;
  sequence: number;
  status: string;
  allow_subtask_reordering: boolean;
  visible: boolean;
  client_id: string;
  company_id: string;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
  subtasks: ServiceTicketSubtask[];
}

export interface ServiceTicket {
  id: number;
  service_user: Requester;
  assigned_agent: Agent;
  service_sub_category: ServiceSubCategory;
  client_id: string;
  company_id: string;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
  ticket_id: string;
  subject: string;
  body: string;
  status: string;
  priority: string;
  target_resolution_date: string;
  resolved_at: string | null;
  closed_at: string | null;
  executed_sop: number;
  tasks: ServiceTicketTask[];
  requester_email: string;
  requester_first_name: string;
  requester_last_name: string;
}

export interface ServiceTicketResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ServiceTicket[];
}

/**
 * Service for managing service tickets
 */
export interface FileUploadResponse {
  success: boolean;
  file_id: number;
  storage_url: string;
  file_name: string;
}

export interface FileDownloadResponse {
  signed_url: string;
  file_name: string;
  disposition: string;
  message?: string;
  available_files?: Array<{id: number, name: string}>;
}

export interface FileDeleteResponse {
  success: boolean;
  message: string;
  remaining_files: number;
}

export interface Contact {
  id: number;
  account_name: string;
  account_legal_name: string;
  first_name: string;
  last_name: string;
  email_display: string;
  user_id: number | null;
}

export const serviceTicketsApi = {
  /**
   * Get all contacts
   * @returns Promise with contacts array
   */
  getAllContacts(): Promise<Contact[]> {
    return axiosInstance.get('/all/contacts/')
      .then((response: AxiosResponse<Contact[]>) => response.data);
  },
  /**
   * Get all service tickets (paginated)
   * @param page Page number
   * @param pageSize Number of items per page
   * @returns Promise with service tickets data
   */
  getTickets: async (
    page = 1,
    pageSize = 10
  ): Promise<ServiceTicketResponse> => {
    const response = await axiosInstance.get("/service-tickets/tickets/", {
      params: {
        page,
        page_size: pageSize,
      },
    });
    return response.data;
  },

  /**
   * Get a single service ticket by ID
   * @param id Service ticket ID
   * @returns Promise with service ticket data
   */
  getTicketById: async (id: number): Promise<ServiceTicket> => {
    const response = await axiosInstance.get(`/service-tickets/tickets/${id}/`);
    return response.data;
  },

  /**
   * Create a new service ticket
   * @param data Service ticket data
   * @returns Promise with created service ticket
   */
  createTicket: async (
    data: Partial<ServiceTicket>
  ): Promise<ServiceTicket> => {
    const response = await axiosInstance.post(
      "/service-tickets/tickets/",
      data
    );
    return response.data;
  },

  /**
   * Update a service ticket
   * @param id Service ticket ID
   * @param data Updated service ticket data
   * @returns Promise with updated service ticket
   */
  updateTicket: async (
    id: number,
    data: Partial<ServiceTicket>
  ): Promise<ServiceTicket> => {
    const response = await axiosInstance.patch(
      `/service-tickets/tickets/${id}/`,
      data
    );
    return response.data;
  },

  /**
   * Delete a service ticket
   * @param id Service ticket ID
   * @returns Promise with delete confirmation
   */
  deleteTicket: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/service-tickets/tickets/${id}/`);
  },

  /**
   * Create a new task for a service ticket
   * @param data Task data
   * @returns Promise with created task
   */
  createTask: async (
    data: Partial<ServiceTicketTask>
  ): Promise<ServiceTicketTask> => {
    const response = await axiosInstance.post("/service-tickets/tasks/", data);
    return response.data;
  },

  /**
   * Update a task
   * @param id Task ID
   * @param data Updated task data
   * @returns Promise with updated task
   */
  updateTask: async (
    id: number,
    data: Partial<ServiceTicketTask>
  ): Promise<ServiceTicketTask> => {
    const response = await axiosInstance.patch(
      `/service-tickets/tasks/${id}/`,
      data
    );
    return response.data;
  },

  /**
   * Delete a task
   * @param id Task ID
   * @returns Promise with delete confirmation
   */
  deleteTask: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/service-tickets/tasks/${id}/`);
  },

  /**
   * Create a new subtask for a task
   * @param data Subtask data
   * @returns Promise with created subtask
   */
  createSubtask: async (
    data: Partial<ServiceTicketSubtask>
  ): Promise<ServiceTicketSubtask> => {
    const response = await axiosInstance.post(
      "/service-tickets/subtasks/",
      data
    );
    return response.data;
  },

  /**
   * Update a subtask
   * @param id Subtask ID
   * @param data Updated subtask data
   * @returns Promise with updated subtask
   */
  updateSubtask: async (
    id: number,
    data: Partial<ServiceTicketSubtask>
  ): Promise<ServiceTicketSubtask> => {
    const response = await axiosInstance.patch(
      `/service-tickets/subtasks/${id}/`,
      data
    );
    return response.data;
  },

  /**
   * Delete a subtask
   * @param id Subtask ID
   * @returns Promise with delete confirmation
   */
  deleteSubtask: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/service-tickets/subtasks/${id}/`);
  },

  /**
   * Reorder tasks for a service ticket
   * @param data Object containing service_ticket_id and task_order array
   * @returns Promise with success message
   */
  reorderTasks: async (data: {
    service_ticket_id: number;
    task_order: number[];
  }): Promise<{ message: string }> => {
    const response = await axiosInstance.post(
      "/service-tickets/tasks/reorder/",
      data
    );
    return response.data;
  },

  /**
   * Reorder subtasks within a task
   * @param data Object containing task_id and subtask_order array
   * @returns Promise with success message
   */
  reorderSubtasks: async (data: {
    task_id: number;
    subtask_order: number[];
  }): Promise<{ message: string }> => {
    const response = await axiosInstance.post(
      "/service-tickets/subtasks/reorder/",
      data
    );
    return response.data;
  },

  /**
   * Update multiple subtask form fields' values in a single request
   * @param fields Array of field objects with id and field_value
   * @returns Promise with success message and updated fields
   */
  updateSubtaskFields(fields: {
    id: number;
    field_value: any;
    has_file_uploads?: boolean;
  }[]): Promise<{
    success: boolean;
    updated_fields: number[];
    total_updated: number;
    failed_updates?: { id: number; error: string }[];
  }> {
    return axiosInstance.put(`/service-tickets/fields/update-fields/`, {
      fields,
    });
  },

  /**
   * Upload a file for a form field
   * @param fieldId ID of the form field
   * @param file File object to upload
   * @param fileName Optional file name to use (defaults to file.name)
   * @returns Promise with upload result
   */
  uploadFieldFile(fieldId: number, file: File, fileName?: string): Promise<FileUploadResponse> {
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('field_id', fieldId.toString());
    formData.append('file', file, fileName || file.name);
    
    return axiosInstance.post('/service-tickets/fields/upload-file/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Download a file for a form field
   * @param fieldId ID of the form field
   * @param options Optional parameters (fileId, inline)
   * @returns Promise with download result
   */
  downloadFieldFile(fieldId: number, options?: { fileId?: number; inline?: boolean }) {
    const params: Record<string, string> = {};
    
    // Add optional parameters
    if (options?.fileId !== undefined) {
      params.file_id = options.fileId.toString();
    }
    if (options?.inline !== undefined) {
      params.inline = options.inline.toString();
    }
    
    return axiosInstance.get(`/service-tickets/fields/${fieldId}/download-file/`, { params });
  },
  
  deleteFieldFile(fileId: number) {
    return axiosInstance.delete(`/service-tickets/fields/delete-file/${fileId}/`);
  },

};

export default serviceTicketsApi;
