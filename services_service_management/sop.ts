import { axiosInstance } from "./axiosInstance";

// Define interfaces for the SOP data structure
export interface SOP {
  id: number;
  sop_group: {
    id: number;
    process: {
      id: number;
      name: string;
      description: string;
      status: string;
      audience: string;
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
}

// Define SOP Asset interface
export interface SOPAsset {
  id: number;
  sop_step: number;
  asset_type: string;
  asset_url: string;
  sequence: number;
  title?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateStepData {
  step_name: string;
  sequence: number;
  estimated_duration: number;
  allow_subtask_reordering: boolean;
  visible?: boolean;
  prerequisite_steps?: number[];
  comments?: string;
  prerequisites?: string;
  postrequisites?: string;
}

// Define interfaces for step objects and forms
export interface FormField {
  id: number;
  field_name: string;
  field_type: string;
  display_order: number;
  field_attributes: {
    required?: boolean;
    field_label?: string;
    default_value?: string;
    validation?: string;
  };
}

export interface StepObject {
  id: number;
  sop_step: number;
  step_object_id: number | null;
  sequence: number;
  object_type: string;
  metadata: {
    name: string;
    description: string;
  };
  form_fields?: FormField[];
}

// Define interface for SOP Step data structure
export interface SOPStep {
  id: number;
  sop:
    | {
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
      }
    | number;
  sequence: number;
  step_name: string;
  comments: string;
  estimated_duration: number;
  allow_subtask_reordering: boolean;
  visible: boolean;
  prerequisites: string;
  postrequisites: string;
  prerequisite_steps: number[];
  step_objects: StepObject[];
  prerequisite_step_names: string[];
  available_prerequisite_steps: any[];
}

export interface SOPResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: SOP[];
}

const base_url_to_use = "/sops";

/**
 * Service for managing Standard Operating Procedures (SOPs)
 */

export const sopApi = {
  /**
   * Get all SOPs (paginated)
   * @param page Page number
   * @param pageSize Number of items per page
   * @returns Promise with SOPs data
   */
  getSOPs: async (
    page = 1,
    pageSize = 10,
    status?: string
  ): Promise<SOPResponse> => {
    const params: Record<string, any> = {
      page,
      page_size: pageSize,
    };

    if (status && status !== "all") {
      params.status = status;
    }

    const response = await axiosInstance.get(`${base_url_to_use}/sops/`, { params });
    return response.data;
  },

  /**
   * Get a single SOP by ID
   * @param id SOP ID
   * @returns Promise with SOP data
   */
  /**
   * Get all SOPs (no pagination)
   * @returns Promise with all SOPs data
   */
  getAllSOPs: async (): Promise<SOP[]> => {
    const response = await axiosInstance.get(`${base_url_to_use}/sops/all/`);
    return response.data;
  },

  getSOPById: async (id: number): Promise<SOP> => {
    const response = await axiosInstance.get(`${base_url_to_use}/sops/${id}/`);
    return response.data;
  },

  /**
   * Create a new SOP
   * @param data SOP data
   * @returns Promise with created SOP
   */
  createNewSOP: async (
    data: Partial<SOP>,
    process_id: number
  ): Promise<SOP> => {
    const response = await axiosInstance.post(
      `${base_url_to_use}/processes/${process_id}/sops/`,
      data
    );
    return response.data;
  },

  /**
   * Update a SOP
   * @param id SOP ID
   * @param data Updated SOP data
   * @returns Promise with updated SOP
   */
  updateSOP: async (id: number, data: Partial<SOP>): Promise<SOP> => {
    const response = await axiosInstance.patch(`${base_url_to_use}/sops/${id}/`, data);
    return response.data;
  },

  /**
   * Create a new version of an existing SOP
   * @param groupId SOP Group ID
   * @param data SOP data
   * @param baseVersionId ID of the SOP used as base for the new version
   * @returns Promise with created SOP version
   */
  createSOPVersion: async (
    groupId: number,
    data: Partial<SOP>,
    baseVersionId: number
  ): Promise<SOP> => {
    const payload = {
      ...data,
      base_version_id: baseVersionId,
    };
    const response = await axiosInstance.post(
      `${base_url_to_use}/sop-groups/${groupId}/versions/`,
      payload
    );
    return response.data;
  },

  /**
   * Delete a SOP
   * @param id SOP ID
   * @returns Promise with delete confirmation
   */
  deleteSOP: async (id: number): Promise<void> => {
    await axiosInstance.delete(`${base_url_to_use}/sops/${id}/`);
  },

  /**
   * Get all steps for a specific SOP
   * @param id SOP ID
   * @returns Promise with SOP steps data
   */
  getSOPSteps: async (
    id: number
  ): Promise<{
    count: number;
    next: string | null;
    previous: string | null;
    results: SOPStep[];
  }> => {
    const response = await axiosInstance.get(`${base_url_to_use}/sops/${id}/steps/`);
    return response.data;
  },

  /**
   * Reorder steps for a specific SOP
   * @param sopId SOP ID
   * @param steps Array of step IDs and their new sequence numbers
   * @returns Promise with success message
   */
  reorderSOPSteps: async (
    sopId: number,
    steps: { step_id: number; sequence: number }[]
  ): Promise<{
    message: string;
  }> => {
    return axiosInstance
      .post(`${base_url_to_use}/sops/${sopId}/steps/reorder/`, { steps })
      .then((response) => response.data);
  },

  /**
   * Delete a specific step from a SOP
   * @param sopId SOP ID
   * @param stepId Step ID to delete
   * @returns Promise with success message and sequence updated flag
   */
  deleteSOPStep: async (
    sopId: number,
    stepId: number
  ): Promise<{
    message: string;
    sequenced_updated: boolean;
  }> => {
    return axiosInstance
      .delete(`${base_url_to_use}/sops/${sopId}/steps/${stepId}/`)
      .then((response) => response.data);
  },

  /**
   * Create a step for a specific SOP
   * @param sopId SOP ID
   * @param stepData Data for the new step
   * @returns Promise with created step data
   */
  createSOPStep: async (
    sopId: number,
    stepData: CreateStepData
  ): Promise<SOPStep> => {
    const response = await axiosInstance.post(
      `${base_url_to_use}/sops/${sopId}/steps/`,
      stepData
    );
    return response.data;
  },

  /**
   * Update a specific step in a SOP
   * @param sopId SOP ID
   * @param stepId Step ID
   * @param stepData Updated step data
   * @returns Promise with updated step
   */
  updateSOPStep: async (
    sopId: number,
    stepId: number,
    stepData: Partial<CreateStepData>
  ): Promise<SOPStep> => {
    const response = await axiosInstance.put(
      `${base_url_to_use}/sops/${sopId}/steps/${stepId}/`,
      stepData
    );
    return response.data;
  },

  /**
   * Get a specific step by ID
   * @param stepId Step ID
   * @returns Promise with step data
   */
  getSOPStepById: async (stepId: number): Promise<SOPStep> => {
    const response = await axiosInstance.get(`${base_url_to_use}/steps/${stepId}/`);
    return response.data;
  },

  /**
   * Get assets for a specific SOP step
   * @param stepId Step ID
   * @returns Promise with assets data
   */
  getStepAssets: async (
    stepId: number
  ): Promise<{
    count: number;
    next: string | null;
    previous: string | null;
    results: SOPAsset[];
  }> => {
    const response = await axiosInstance.get(`${base_url_to_use}/steps/${stepId}/assets/`);
    return response.data;
  },

  /**
   * Create a new asset for a specific SOP step
   * @param stepId Step ID
   * @param assetData Asset data
   * @returns Promise with created asset
   */
  createStepAsset: async (
    stepId: number,
    assetData: FormData
  ): Promise<SOPAsset> => {
    const response = await axiosInstance.post(
      `${base_url_to_use}/steps/${stepId}/assets/`,
      assetData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data;
  },

  /**
   * Download an asset file via a signed URL
   * @param assetId Asset ID
   * @returns Promise with signed URL for download
   */
  downloadStepAsset: async (
    assetId: number
  ): Promise<{ signed_url: string }> => {
    const response = await axiosInstance.get(`${base_url_to_use}/assets/${assetId}/download/`);
    return response.data;
  },

  /**
   * Delete an asset from a step
   * @param assetId Asset ID
   * @returns Promise with success status
   */
  deleteStepAsset: async (assetId: number): Promise<void> => {
    await axiosInstance.delete(`${base_url_to_use}/assets/${assetId}/`);
  },

  getAllFieldTypes: async (): Promise<any> => {
    try {
      const response = await axiosInstance.get<any>(
        `${base_url_to_use}/field-attributes-schema/`
      );

      return response.data;
    } catch (error) {
      console.error("Error fetching field types:", error);
      throw error;
    }
  },

  createStepObjects: async (
    stepId: number,
    objectsData: any[]
  ): Promise<void> => {
    try {
      const response = await axiosInstance.post(
        `${base_url_to_use}/steps/${stepId}/objects/`,
        objectsData
      );
      return response.data;
    } catch (error) {
      console.error("Error creating step objects:", error);
      throw error;
    }
  },
};

export default sopApi;
