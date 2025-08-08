'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import * as marketingService from '../../../services/marketingService';
import * as marketingService from '../../../services_engagement/marketingService';
import { ContactFormData } from '../../../types/engagement/schemas';

// Simple notification helpers - can be replaced with a proper notification system later
const showSuccessNotification = (message: string) => console.log('SUCCESS:', message);
const showErrorNotification = (message: string) => console.error('ERROR:', message);

/**
 * Hook to fetch contacts with pagination, search, and filtering
 */
export const useGetContacts = (tenantSlug: string, page: number = 1, search: string = '', filters?: Record<string, any>) => {
  return useQuery({
    queryKey: ['contacts', tenantSlug, { page, search, filters: filters ? JSON.stringify(filters) : '' }],
    queryFn: () => marketingService.getContacts(tenantSlug, page, search, filters),
    placeholderData: (previousData) => previousData, // For smoother pagination (replaces keepPreviousData in v4+)
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!tenantSlug,
  });
};

/**
 * Hook to fetch a single contact by ID
 */
export const useGetContactById = (tenantSlug: string, contactId?: number) => {
  return useQuery({
    queryKey: ['contact', tenantSlug, contactId],
    queryFn: () => {
      if (!contactId) {
        return Promise.reject(new Error('Contact ID is not defined.'));
      }
      return marketingService.getContactById(tenantSlug, contactId);
    },
    enabled: !!tenantSlug && !!contactId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to create a new contact
 */
export const useCreateContact = (tenantSlug: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: ContactFormData) => marketingService.createContact(tenantSlug, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contacts', tenantSlug] });
      showSuccessNotification('Contact created successfully');
    },
    onError: (error: any) => {
      showErrorNotification(`Failed to create contact: ${error.message}`);
    }
  });
};

/**
 * Hook to bulk create contacts from an array of contact data
 */
export const useBulkCreateContacts = (tenantSlug: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (contacts: ContactFormData[]) => marketingService.bulkCreateContacts(tenantSlug, contacts),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contacts', tenantSlug] });
      showSuccessNotification(`Successfully created ${data.created_count} contacts`);
      return data;
    },
    onError: (error: any) => {
      showErrorNotification(`Failed to create contacts: ${error.message}`);
      throw error;
    }
  });
};

/**
 * Hook to upload a file of contacts (CSV)
 */
export const useUploadContactsFile = (tenantSlug: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (file: File) => marketingService.uploadContactsFile(tenantSlug, file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contacts', tenantSlug] });
      showSuccessNotification(`Successfully created ${data.created_count} contacts from file`);
      if (data.error_count > 0) {
        showErrorNotification(`${data.error_count} contacts had errors and were not created`);
      }
      return data;
    },
    onError: (error: any) => {
      showErrorNotification(`Failed to upload contacts file: ${error.message}`);
      throw error;
    }
  });
};

/**
 * Hook to update an existing contact
 */
export const useUpdateContact = (tenantSlug: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ contactId, data }: { contactId: number; data: Partial<ContactFormData> }) =>
      marketingService.updateContact(tenantSlug, contactId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contacts', tenantSlug] });
      queryClient.invalidateQueries({ queryKey: ['contact', tenantSlug, variables.contactId] });
      showSuccessNotification(`Contact '${data.email_address || data.phone_number}' updated successfully!`);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message || "Failed to update contact.";
      showErrorNotification(errorMessage);
    },
  });
};

/**
 * Hook to delete a contact
 */
export const useDeleteContact = (tenantSlug: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (contactId: number) => marketingService.deleteContact(tenantSlug, contactId),
    onSuccess: (_, contactId) => {
      queryClient.invalidateQueries({ queryKey: ['contacts', tenantSlug] });
      queryClient.removeQueries({ queryKey: ['contact', tenantSlug, contactId] }); // Also remove specific contact cache
      showSuccessNotification(`Contact (ID: ${contactId}) deleted successfully!`);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message || "Failed to delete contact.";
      showErrorNotification(errorMessage);
    },
  });
};

/**
 * Hook to download contacts as CSV
 */
export const useDownloadContacts = (tenantSlug: string) => {
  return useMutation({
    mutationFn: async (contactIds?: number[]) => {
      try {
        const blob = await marketingService.downloadContacts(tenantSlug, contactIds);
        
        // Create a URL for the blob
        const url = window.URL.createObjectURL(blob);
        
        // Create a temporary link element
        const link = document.createElement('a');
        link.href = url;
        link.download = `contacts_${new Date().toISOString().split('T')[0]}.csv`;
        
        // Append to the document, click it, and remove it
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL object
        window.URL.revokeObjectURL(url);
        
        return { success: true };
      } catch (error) {
        console.error('Error downloading contacts:', error);
        throw error;
      }
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message || "Failed to download contacts.";
      showErrorNotification(errorMessage);
    },
  });
};
