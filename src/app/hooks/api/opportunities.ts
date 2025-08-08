/**
 * Opportunity API Hooks
 *
 * React Query hooks for opportunity-related API endpoints
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { apiEndpoints } from "@/lib/api";
import serviceApi, { serviceApiEndpoints } from "@/lib/serviceApi";
import {
  Opportunity,
  OpportunityRole,
  OpportunityStatus,
  OpportunityType,
  OpportunityLeadSource,
} from "@/app/types/opportunities";
import { Account, ApiContact } from "@/app/types/customers";
import { getAuthHeaders } from "./auth";
// Staff user type definition from API
export interface StaffUser {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  current_user: number;
  users: any[];
}

export interface TaskUpdateData {
  status?: string;
  assigned_agent_id?: number | null;
}

export interface SubtaskUpdateData {
  status?: string;
  assigned_agent_id?: number | null;
  subtask_start_date?: string | null;
  subtask_end_date?: string | null;
}

interface OpportunityRolesResponse {
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
  results: OpportunityRole[];
  active_count?: number;
  inactive_count?: number;
}

interface OpportunityStatusesResponse {
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

interface OpportunityTypesResponse {
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
  results: OpportunityType[];
  active_count?: number;
  inactive_count?: number;
}

interface OpportunityLeadSourcesResponse {
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
  results: OpportunityLeadSource[];
  active_count?: number;
  inactive_count?: number;
}

interface OpportunitiesResponse {
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

interface FetchOpportunitiesParams {
  page?: number;
  page_size?: number;
  status?: boolean;
  ordering?: string;
  search?: string;
  all_records?: boolean;
}

interface ServiceSubCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ServiceSubCategoriesResponse {
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
  results: ServiceSubCategory[];
}

interface FetchRolesParams {
  page?: number;
  page_size?: number;
  status?: boolean;
  ordering?: string;
  search?: string;
  all_records?: boolean;
}

interface FetchStatusesParams {
  page?: number;
  page_size?: number;
  status?: boolean;
  ordering?: string;
  search?: string;
  all_records?: boolean;
}

interface FetchTypesParams {
  page?: number;
  page_size?: number;
  status?: boolean;
  ordering?: string;
  search?: string;
  all_records?: boolean;
}

interface FetchLeadSourcesParams {
  page?: number;
  page_size?: number;
  status?: boolean;
  ordering?: string;
  search?: string;
  all_records?: boolean;
}


/**
 * Hook to fetch a single opportunity by ID
 * @param id - Opportunity ID
 * @param enabled - Whether the query should be enabled
 */
export const useFetchOpportunity = (
  id: string | number | null | undefined, 
  enabled: boolean = true
) => {
  return useQuery<Opportunity>({
    queryKey: ["opportunity", id],
    queryFn: async () => {
      if (!id) throw new Error("Opportunity ID is required");

      const response = await api.get(
        apiEndpoints.opportunities.opportunities.detail(id),
        {
          headers: await getAuthHeaders(),
        }
      );
      return response.data;
    },
    enabled: enabled && !!id,
  });
}

/**
 * Hook to fetch opportunity roles with optional pagination and filtering
 */
export const useFetchOpportunityRoles = (params: FetchRolesParams = {}) => {
  return useQuery<OpportunityRolesResponse>({
    queryKey: ["opportunityRoles", params],
    queryFn: async () => {
      const { page = 1, page_size = 50, status, ordering, search } = params;

      const response = await api.get(
        apiEndpoints.opportunities.roles.list({
          page,
          page_size,
          status,
          ordering,
          search,
        }),
        {
          headers: getAuthHeaders(),
        }
      );
      return response.data;
    },
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new data
  });
};

/**
 * Hook to fetch a single opportunity role by ID
 * @param id - Opportunity role ID
 */
export const useFetchOpportunityRole = (
  id: string | number | null | undefined
) => {
  return useQuery<OpportunityRole>({
    queryKey: ["opportunityRole", id],
    queryFn: async () => {
      if (!id) throw new Error("Opportunity role ID is required");
      const response = await api.get(
        apiEndpoints.opportunities.roles.detail(id),
        {
          headers: getAuthHeaders(),
        }
      );
      return response.data;
    },
    enabled: !!id, // Only run query if ID is provided
  });
};

/**
 * Hook to create a new opportunity role
 */
export const useCreateOpportunityRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roleData: Partial<OpportunityRole>) => {
      const response = await api.post(
        apiEndpoints.opportunities.roles.list(),
        roleData,
        {
          headers: getAuthHeaders(),
        }
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate opportunity roles query cache to refresh the data
      queryClient.invalidateQueries({ queryKey: ["opportunityRoles"] });
    },
  });
};

/**
 * Hook to update an existing opportunity role
 */
export const useUpdateOpportunityRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...roleData
    }: Partial<OpportunityRole> & { id: string | number }) => {
      const response = await api.put(
        apiEndpoints.opportunities.roles.detail(id),
        roleData,
        {
          headers: getAuthHeaders(),
        }
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["opportunityRoles"] });
      queryClient.invalidateQueries({
        queryKey: ["opportunityRole", variables.id],
      });
    },
  });
};

/**
 * Hook to delete an opportunity role
 */
export const useDeleteOpportunityRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string | number) => {
      await api.delete(apiEndpoints.opportunities.roles.detail(id), {
        headers: getAuthHeaders(),
      });
      return id;
    },
    onSuccess: () => {
      // Invalidate opportunity roles query cache to refresh the data
      queryClient.invalidateQueries({ queryKey: ["opportunityRoles"] });
    },
  });
};

/**
 * Hook to toggle opportunity role status
 */
export const useToggleOpportunityRoleStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string | number;
      status: boolean;
    }) => {
      const response = await api.patch(
        apiEndpoints.opportunities.roles.detail(id),
        { status },
        {
          headers: getAuthHeaders(),
        }
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["opportunityRoles"] });
      queryClient.invalidateQueries({
        queryKey: ["opportunityRole", variables.id],
      });
    },
  });
};

/**
 * Hook to fetch opportunity statuses with optional pagination and filtering
 * @param params - Query parameters for filtering, pagination, etc.
 */
export const useFetchOpportunityStatuses = (
  params: FetchStatusesParams = {}
) => {
  return useQuery<OpportunityStatusesResponse>({
    queryKey: ["opportunityStatuses", params],
    queryFn: async () => {
      const { page = 1, page_size = 50, status, ordering, search } = params;

      const response = await api.get(
        apiEndpoints.opportunities.statuses.list({
          page,
          page_size,
          status,
          ordering,
          search,
        }),
        {
          headers: getAuthHeaders(),
        }
      );
      return response.data;
    },
    placeholderData: (previousData) => previousData,
  });
};

/**
 * Hook to fetch a single opportunity status by ID
 * @param id - Opportunity status ID
 */
export const useFetchOpportunityStatus = (
  id: string | number | null | undefined
) => {
  return useQuery<OpportunityStatus>({
    queryKey: ["opportunityStatus", id],
    queryFn: async () => {
      if (!id) throw new Error("Opportunity Status ID is required");
      const response = await api.get(
        apiEndpoints.opportunities.statuses.detail(id),
        {
          headers: getAuthHeaders(),
        }
      );
      return response.data;
    },
    enabled: !!id,
  });
};

/**
 * Hook to create a new opportunity status
 */
export const useCreateOpportunityStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<OpportunityStatus>) => {
      const response = await api.post(
        apiEndpoints.opportunities.statuses.list(),
        data,
        {
          headers: getAuthHeaders(),
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunityStatuses"] });
    },
  });
};

/**
 * Hook to update an existing opportunity status
 */
export const useUpdateOpportunityStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: Partial<OpportunityStatus> & { id: string | number }) => {
      const response = await api.put(
        apiEndpoints.opportunities.statuses.detail(id),
        data,
        {
          headers: getAuthHeaders(),
        }
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["opportunityStatuses"] });
      queryClient.invalidateQueries({
        queryKey: ["opportunityStatus", variables.id],
      });
    },
  });
};

/**
 * Hook to delete an opportunity status
 */
export const useDeleteOpportunityStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string | number) => {
      await api.delete(apiEndpoints.opportunities.statuses.detail(id), {
        headers: getAuthHeaders(),
      });
      return id;
    },
    onSuccess: () => {
      // Invalidate opportunity statuses query cache to refresh the data
      queryClient.invalidateQueries({ queryKey: ["opportunityStatuses"] });
    },
  });
};

/**
 * Hook to toggle opportunity status status
 */
export const useToggleOpportunityStatusStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string | number;
      status: boolean;
    }) => {
      const response = await api.patch(
        apiEndpoints.opportunities.statuses.detail(id),
        {
          status,
        },
        {
          headers: await getAuthHeaders(),
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunityStatuses"] });
    },
  });
};

/**
 * Hook to fetch opportunity types with optional pagination and filtering
 * @param params - Query parameters for filtering, pagination, etc.
 */
export const useFetchOpportunityTypes = (params: FetchTypesParams = {}) => {
  return useQuery<OpportunityTypesResponse>({
    queryKey: ["opportunityTypes", params],
    queryFn: async () => {
      const response = await api.get(
        apiEndpoints.opportunities.types.list(params),
        {
          headers: await getAuthHeaders(),
        }
      );
      return response.data;
    },
    placeholderData: (previousData) => previousData,
  });
};

/**
 * Hook to fetch a single opportunity type by ID
 * @param id - Opportunity type ID
 */
export const useFetchOpportunityType = (
  id: string | number | null | undefined
) => {
  return useQuery<OpportunityType>({
    queryKey: ["opportunityType", id],
    queryFn: async () => {
      if (!id) throw new Error("Opportunity type ID is required");
      const response = await api.get(
        apiEndpoints.opportunities.types.detail(id),
        {
          headers: await getAuthHeaders(),
        }
      );
      return response.data;
    },
    enabled: !!id,
  });
};

/**
 * Hook to create a new opportunity type
 */
export const useCreateOpportunityType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<OpportunityType>) => {
      const response = await api.post(
        apiEndpoints.opportunities.types.list(),
        data,
        {
          headers: await getAuthHeaders(),
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunityTypes"] });
    },
  });
};

/**
 * Hook to update an existing opportunity type
 */
export const useUpdateOpportunityType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: { id: string | number } & Partial<OpportunityType>) => {
      const response = await api.patch(
        apiEndpoints.opportunities.types.detail(id),
        data,
        {
          headers: await getAuthHeaders(),
        }
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["opportunityTypes"] });
      queryClient.invalidateQueries({
        queryKey: ["opportunityType", variables.id],
      });
    },
  });
};

/**
 * Hook to delete an opportunity type
 */
export const useDeleteOpportunityType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string | number) => {
      const response = await api.delete(
        apiEndpoints.opportunities.types.detail(id),
        {
          headers: await getAuthHeaders(),
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunityTypes"] });
    },
  });
};

/**
 * Hook to toggle opportunity type status
 */
export const useToggleOpportunityTypeStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string | number;
      status: boolean;
    }) => {
      const response = await api.patch(
        apiEndpoints.opportunities.types.detail(id),
        {
          status,
        },
        {
          headers: await getAuthHeaders(),
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunityTypes"] });
    },
  });
};

/**
 * Hook for fetching all opportunity lead sources without pagination
 * @returns All opportunity lead sources
 */
export const useFetchAllOpportunityLeadSources = () => {
  return useQuery<OpportunityLeadSource[]>({
    queryKey: ["allOpportunityLeadSources"],
    queryFn: async () => {
      const response = await api.get(
        apiEndpoints.opportunities.leadSources.list({ all_records: true }),
        {
          headers: await getAuthHeaders(),
        }
      );
      return response.data.results;
    },
  });
};

/**
 * Hook to fetch all accounts (without pagination)
 */
export const useFetchAllAccounts = () => {
  return useQuery<Account[]>({
    queryKey: ["allAccounts"],
    queryFn: async () => {
      const response = await api.get(
        apiEndpoints.lookupData.accounts(),
        {
          headers: await getAuthHeaders(),
        }
      );
      return response.data;
    },
  });
};

// Removed duplicate useFetchContactsByAccount - using the one at line ~897

/**
 * Hook to fetch all staff users
 */
export const useFetchStaffUsers = () => {
  return useQuery<StaffUser[]>({
    queryKey: ["staffUsers"],
    queryFn: async () => {
      const response = await api.get(
        apiEndpoints.lookupData.staffUsers(),
        {
          headers: await getAuthHeaders(),
        }
      );
      return response.data;
    },
  });
};

/**
 * Hook to create a new opportunity
 */
export const useCreateOpportunity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (opportunityData: Partial<Opportunity>) => {
      const response = await api.post(
        apiEndpoints.opportunities.opportunities.create(),
        opportunityData,
        {
          headers: await getAuthHeaders(),
        }
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate opportunities query cache to refresh the data
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });
};

/**
 * Hook to update an existing opportunity
 */
export const useUpdateOpportunity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...opportunityData
    }: Partial<Opportunity> & { id: string | number }) => {
      const response = await api.put(
        apiEndpoints.opportunities.opportunities.update(id),
        opportunityData,
        {
          headers: await getAuthHeaders(),
        }
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      queryClient.invalidateQueries({
        queryKey: ["opportunity", variables.id],
      });
    },
  });
};

/**
 * Hook to fetch opportunity lead sources with optional pagination and filtering
 * @param params - Query parameters for filtering, pagination, etc.
 */
export const useFetchOpportunityLeadSources = (
  params: FetchLeadSourcesParams = {}
) => {
  return useQuery<OpportunityLeadSourcesResponse>({
    queryKey: ["opportunityLeadSources", params],
    queryFn: async () => {
      const response = await api.get(
        apiEndpoints.opportunities.leadSources.list(params),
        {
          headers: await getAuthHeaders(),
        }
      );
      return response.data;
    },
    placeholderData: (previousData) => previousData,
  });
};

/**
 * Hook to fetch a single opportunity lead source by ID
 * @param id - Opportunity lead source ID
 */
export const useFetchOpportunityLeadSource = (
  id: string | number | null | undefined
) => {
  return useQuery<OpportunityLeadSource>({
    queryKey: ["opportunityLeadSource", id],
    queryFn: async () => {
      if (!id) throw new Error("Opportunity lead source ID is required");
      const response = await api.get(
        apiEndpoints.opportunities.leadSources.detail(id),
        {
          headers: await getAuthHeaders(),
        }
      );
      return response.data;
    },
    enabled: !!id,
  });
};

/**
 * Hook to create a new opportunity lead source
 */
export const useCreateOpportunityLeadSource = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<OpportunityLeadSource>) => {
      const response = await api.post(
        apiEndpoints.opportunities.leadSources.list(),
        data,
        {
          headers: await getAuthHeaders(),
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunityLeadSources"] });
    },
  });
};

/**
 * Hook to update an existing opportunity lead source
 */
export const useUpdateOpportunityLeadSource = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: { id: string | number } & Partial<OpportunityLeadSource>) => {
      const response = await api.patch(
        apiEndpoints.opportunities.leadSources.detail(id),
        data,
        {
          headers: await getAuthHeaders(),
        }
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["opportunityLeadSources"] });
      queryClient.invalidateQueries({
        queryKey: ["opportunityLeadSource", variables.id],
      });
    },
  });
};

/**
 * Hook to delete an opportunity lead source
 */
export const useDeleteOpportunityLeadSource = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string | number) => {
      const response = await api.delete(
        apiEndpoints.opportunities.leadSources.detail(id),
        {
          headers: await getAuthHeaders(),
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunityLeadSources"] });
    },
  });
};

/**
 * Hook to fetch contacts for a specific account without pagination
 * @param accountId - The ID of the account to fetch contacts for
 * @returns All contacts belonging to the specified account
 */
export function useFetchContactsByAccount(accountId: string | number | null) {
  return useQuery<ApiContact[], Error>({
    queryKey: ["contacts", "by-account", accountId],
    queryFn: async () => {
      if (!accountId) return [];

      const response = await api.get(
        apiEndpoints.lookupData.contacts(accountId),
        { headers: await getAuthHeaders() }
      );
      return response.data;
    },
    enabled: !!accountId, // Only run this query if accountId is provided
  });
}

/**
 * Hook to toggle opportunity lead source status
 */
export const useToggleOpportunityLeadSourceStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string | number;
      status: boolean;
    }) => {
      const response = await api.patch(
        apiEndpoints.opportunities.leadSources.detail(id),
        {
          status,
        },
        {
          headers: await getAuthHeaders(),
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunityLeadSources"] });
    },
  });
};

/**
 * Hook for fetching all opportunity statuses without pagination
 * @returns All opportunity statuses
 */
export function useFetchAllOpportunityStatuses() {
  return useQuery<OpportunityStatus[], Error>({
    queryKey: ["opportunityStatuses", "all"],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      queryParams.append("all_records", "true");

      const url =
        apiEndpoints.opportunities.statuses.list({}) +
        "?" +
        queryParams.toString();
      const response = await api.get(url, {
        headers: await getAuthHeaders(),
      });

      return response.data.results || response.data;
    },
  });
}

/**
 * Hook for fetching all opportunity roles without pagination
 * @returns All opportunity roles
 */
export function useFetchAllOpportunityRoles() {
  return useQuery<OpportunityRole[], Error>({
    queryKey: ["opportunityRoles", "all"],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      queryParams.append("all_records", "true");

      const url =
        apiEndpoints.opportunities.roles.list({}) +
        "?" +
        queryParams.toString();
      const response = await api.get(url, {
        headers: await getAuthHeaders(),
      });

      return response.data.results || response.data;
    },
  });
}

/**
 * Hook to fetch opportunities with optional pagination and filtering
 * @param params - Query parameters for filtering, pagination, etc.
 */
export const useFetchOpportunities = (params: FetchOpportunitiesParams = {}) => {
  return useQuery<OpportunitiesResponse>({
    queryKey: ["opportunities", params],
    queryFn: async () => {
      const response = await api.get(
        apiEndpoints.opportunities.opportunities.list(params),
        {
          headers: await getAuthHeaders(),
        }
      );
      return response.data;
    },
    placeholderData: (previousData) => previousData,
  });
};

/**
 * Hook to delete an opportunity
 */
export const useDeleteOpportunity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string | number) => {
      const response = await api.delete(
        apiEndpoints.opportunities.opportunities.delete(id),
        {
          headers: await getAuthHeaders(),
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });
};

// These hooks are defined earlier in the file, so we're removing the duplicates

/**
 * Hook to fetch service subcategories from the service API
 */
export const useServiceSubCategories = () => {
  return useQuery<ServiceSubCategoriesResponse>({
    queryKey: ["service-sub-categories"],
    queryFn: async () => {
      try {
        const response = await serviceApi.get(
          serviceApiEndpoints.serviceSubCategories.list()
        );
        return response.data;
      } catch (error) {
        console.error("Error fetching service subcategories:", error);
        throw error;
      }
    }
  });
};

/**
 * Hook to update a task
 * 
 * @returns A mutation function to update task status and assigned agent
 */
export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation<any, Error, { id: number; data: TaskUpdateData }>({
    mutationFn: async ({ id, data }) => {
      const response = await serviceApi.patch(
        serviceApiEndpoints.tasks.update(id),
        data
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate relevant queries to refetch the updated data
      queryClient.invalidateQueries({ queryKey: ["opportunity"] });
    },
    onError: (error) => {
      console.error("Error updating task:", error);
    },
  });
};

/**
 * Hook to update a subtask
 * 
 * @returns A mutation function to update subtask status and assigned agent
 */
export const useUpdateSubtask = () => {
  const queryClient = useQueryClient();
  
  return useMutation<any, Error, { id: number; data: SubtaskUpdateData }>({
    mutationFn: async ({ id, data }) => {
      const response = await serviceApi.patch(
        serviceApiEndpoints.subtasks.update(id),
        data
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate relevant queries to refetch the updated data
      queryClient.invalidateQueries({ queryKey: ["opportunity"] });
    },
    onError: (error) => {
      console.error("Error updating subtask:", error);
    },
  });
};
