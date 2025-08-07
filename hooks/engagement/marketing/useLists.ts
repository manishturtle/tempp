'use client';

import { useQuery, useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import * as marketingService from '../../../services_engagement/marketingService';
import { MarketingList, ListMember, Contact } from '../../../types/engagement/marketing';
import { ListFormData } from '../../../types/engagement/schemas';

// Simple notification helpers - can be replaced with a proper notification system later
const showSuccessNotification = (message: string) => console.log('SUCCESS:', message);
const showErrorNotification = (message: string) => console.error('ERROR:', message);

/**
 * Hook to fetch lists with pagination, search, and filtering
 */
export const useGetLists = (tenantSlug: string, page: number = 1, search: string = '', includeInternal: boolean = false) => {
  return useQuery({
    queryKey: ['lists', tenantSlug, { page, search, includeInternal }],
    queryFn: () => marketingService.getLists(tenantSlug, page, search, includeInternal),
    placeholderData: (previousData) => previousData, // For smoother pagination (replaces keepPreviousData in v4+)
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!tenantSlug,
  });
};

/**
 * Hook to fetch a single list by ID
 */
export const useGetListById = (tenantSlug: string, listId?: number) => {
  return useQuery({
    queryKey: ['list', tenantSlug, listId],
    queryFn: () => {
      if (!listId) {
        return Promise.reject(new Error('List ID is not defined.'));
      }
      return marketingService.getListById(tenantSlug, listId);
    },
    enabled: !!tenantSlug && !!listId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to create a new list
 */
export const useCreateList = (tenantSlug: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: ListFormData) => marketingService.createList(tenantSlug, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lists', tenantSlug] });
      showSuccessNotification(`List '${data.name}' created successfully!`);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || error.response?.data?.name?.[0] || error.response?.data?.message || error.message || "Failed to create list.";
      showErrorNotification(errorMessage);
    },
  });
};

/**
 * Hook to update an existing list
 */
export const useUpdateList = (tenantSlug: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ listId, data }: { listId: number; data: Partial<ListFormData> }) =>
      marketingService.updateList(tenantSlug, listId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lists', tenantSlug] });
      queryClient.invalidateQueries({ queryKey: ['list', tenantSlug, variables.listId] });
      showSuccessNotification(`List '${data.name}' updated successfully!`);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || error.response?.data?.name?.[0] || error.response?.data?.message || error.message || "Failed to update list.";
      showErrorNotification(errorMessage);
    },
  });
};

/**
 * Hook to delete a list
 */
export const useDeleteList = (tenantSlug: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (listId: number) => marketingService.deleteList(tenantSlug, listId),
    onSuccess: (_, listId) => {
      queryClient.invalidateQueries({ queryKey: ['lists', tenantSlug] });
      queryClient.removeQueries({ queryKey: ['list', tenantSlug, listId] });
      queryClient.removeQueries({ queryKey: ['listMembers', tenantSlug, listId] }); // Also remove members if cached
      showSuccessNotification(`List (ID: ${listId}) deleted successfully!`);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message || "Failed to delete list.";
      showErrorNotification(errorMessage);
    },
  });
};

/**
 * Hook to fetch list members with pagination and search
 */
export const useGetListMembers = (tenantSlug: string, listId?: number, page: number = 1, search: string = '') => {
  const queryKey: QueryKey = ['listMembers', tenantSlug, listId, { page, search }];
  return useQuery({
    queryKey,
    queryFn: () => {
      if (!listId) {
        return Promise.reject(new Error('List ID is not defined for fetching members.'));
      }
      return marketingService.getListMembers(tenantSlug, listId, page, search);
    },
    placeholderData: (previousData) => previousData, // For smoother pagination
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!tenantSlug && !!listId,
  });
};

/**
 * Hook to add members to a list
 */
export const useAddMembersToList = (tenantSlug: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ listId, contactIds }: { listId: number; contactIds: number[] }) =>
      marketingService.addMembersToList(tenantSlug, listId, contactIds),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['listMembers', tenantSlug, variables.listId] });
      // Potentially update list details if it contains member count
      queryClient.invalidateQueries({ queryKey: ['list', tenantSlug, variables.listId] });
      showSuccessNotification(data.message || 'Members added successfully!');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "Failed to add members.";
      showErrorNotification(errorMessage);
    },
  });
};

/**
 * Hook to remove members from a list
 */
export const useRemoveMembersFromList = (tenantSlug: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ listId, contactIds }: { listId: number; contactIds: number[] }) => 
      marketingService.removeMembersFromList(tenantSlug, listId, contactIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['list-members', tenantSlug, variables.listId] });
      showSuccessNotification(`Successfully removed ${variables.contactIds.length} members from the list`);
    },
    onError: (error: any) => {
      showErrorNotification(`Failed to remove members from list: ${error.message}`);
    }
  });
};

/**
 * Hook to upload a file with contacts to add to a list
 */
export const useUploadContactsToList = (tenantSlug: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ listId, file }: { listId: number; file: File }) => 
      marketingService.uploadContactsToList(tenantSlug, listId, file),
    onSuccess: (data, variables) => {
      // Invalidate both lists and list members queries
      queryClient.invalidateQueries({ queryKey: ['lists', tenantSlug] });
      queryClient.invalidateQueries({ queryKey: ['list-members', tenantSlug, variables.listId] });
      
      // Show success message with more detailed information
      const successMessage = `
        Successfully processed contacts for list '${data.list_name}':


        • ${data.created_count} new contacts created
        • ${data.existing_count} existing contacts found
        • ${data.added_to_list} contacts added to the list
        • ${data.already_in_list} contacts were already in the list
      `;
      
      showSuccessNotification(successMessage.trim());
      
      if (data.error_count > 0) {
        showErrorNotification(`${data.error_count} contacts had errors and were not processed`);
      }
      
      return data;
    },
    onError: (error: any) => {
      showErrorNotification(`Failed to upload contacts to list: ${error.message}`);
      throw error;
    }
  });
};

/**
 * Hook to create a list with contacts from a file in one operation
 */
export const useCreateListWithFile = (tenantSlug: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ name, description, listType, file }: { 
      name: string; 
      description: string; 
      listType: string; 
      file: File 
    }) => marketingService.createListWithFile(tenantSlug, name, description, listType, file),
    onSuccess: (data) => {
      // Invalidate lists query to show the new list
      queryClient.invalidateQueries({ queryKey: ['lists', tenantSlug] });
      
      // Show success message with detailed information
      const successMessage = `
        Successfully created list '${data.list_name}' with contacts:


        • ${data.created_count} new contacts created
        • ${data.existing_count} existing contacts found
        • ${data.added_to_list} contacts added to the list
      `;
      
      showSuccessNotification(successMessage.trim());
      
      if (data.error_count > 0) {
        showErrorNotification(`${data.error_count} contacts had errors and were not processed`);
      }
      
      return data;
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message || 'Failed to create list with file';
      showErrorNotification(errorMessage);
      throw error;
    }
  });
};

/**
 * Hook to download a list as CSV
 */
export const useDownloadList = (tenantSlug: string) => {
  return useMutation({
    mutationFn: async (listId: number) => {
      try {
        const blob = await marketingService.downloadList(tenantSlug, listId);
        
        // Create a URL for the blob
        const url = window.URL.createObjectURL(blob);
        
        // Create a temporary link element
        const link = document.createElement('a');
        link.href = url;
        link.download = `list-${listId}.csv`;
        
        // Append to the document, click it, and remove it
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL object
        window.URL.revokeObjectURL(url);
        
        return { success: true };
      } catch (error) {
        console.error('Error downloading list:', error);
        throw error;
      }
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message || "Failed to download list.";
      showErrorNotification(errorMessage);
    },
  });
};
