/**
 * Marketing Service
 * Handles all API calls for the marketing section
 */

import apiClient from '../utils/engagement/apiClient';
import { Contact, MarketingList, ListMember, PaginatedResponse, ListType } from '../types/engagement/marketing';
import { ContactFormData, ListFormData } from '../types/engagement/schemas';

/**
 * Get contacts with optional pagination, search, and filters
 * @param tenantSlug The tenant's unique slug
 * @param page Page number for pagination
 * @param search Search term
 * @param filters Additional filters
 * @returns Promise with paginated contacts data
 */
export const getContacts = async (
  tenantSlug: string,
  page: number = 1,
  search: string = '',
  filters?: Record<string, any>
): Promise<PaginatedResponse<Contact>> => {
  try {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    
    if (search) {
      params.append('search', search);
    }
    
    if (filters) {
      for (const key in filters) {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          params.append(key, filters[key].toString());
        }
      }
    }
    
    const response = await apiClient.get<PaginatedResponse<Contact>>(
      `/api/${tenantSlug}/marketing/contacts/?${params.toString()}`
    );
    
    return response.data;
  } catch (error) {
    console.error('Error fetching contacts:', error);
    throw error;
  }
};

/**
 * Get a single contact by ID
 * @param tenantSlug The tenant's unique slug
 * @param contactId Contact ID
 * @returns Promise with contact data
 */
export const getContactById = async (
  tenantSlug: string,
  contactId: number
): Promise<Contact> => {
  try {
    const response = await apiClient.get<Contact>(
      `/api/${tenantSlug}/marketing/contacts/${contactId}/`
    );
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching contact ${contactId}:`, error);
    throw error;
  }
};

/**
 * Create a new contact
 * @param tenantSlug The tenant's unique slug
 * @param data Contact data
 * @returns Promise with created contact data
 */
export const createContact = async (
  tenantSlug: string,
  data: ContactFormData
): Promise<Contact> => {
  try {
    const response = await apiClient.post<Contact>(
      `/api/${tenantSlug}/marketing/contacts/`,
      data
    );
    return response.data;
  } catch (error) {
    console.error('Error creating contact:', error);
    throw error;
  }
};

/**
 * Create multiple contacts at once
 * @param tenantSlug The tenant's unique slug
 * @param contacts Array of contact data objects
 * @returns Promise with bulk creation result
 */
export const bulkCreateContacts = async (
  tenantSlug: string,
  contacts: ContactFormData[]
): Promise<{
  status: string;
  created_count: number;
  created_contacts: Contact[];
  error_count: number;
  errors: any[];
}> => {
  try {
    const response = await apiClient.post(
      `/api/${tenantSlug}/marketing/contacts/bulk_create/`,
      contacts
    );
    return response.data;
  } catch (error) {
    console.error('Error bulk creating contacts:', error);
    throw error;
  }
};

/**
 * Upload a file with contacts for bulk creation
 * @param tenantSlug The tenant's unique slug
 * @param file The file to upload (CSV)
 * @returns Promise with bulk creation result
 */
export const uploadContactsFile = async (
  tenantSlug: string,
  file: File
): Promise<{
  status: string;
  created_count: number;
  created_contacts: Contact[];
  error_count: number;
  errors: any[];
}> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post(
      `/api/${tenantSlug}/marketing/contacts/bulk_create/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error uploading contacts file:', error);
    throw error;
  }
};

/**
 * Update an existing contact
 * @param tenantSlug The tenant's unique slug
 * @param contactId Contact ID
 * @param data Updated contact data
 * @returns Promise with updated contact data
 */
export const updateContact = async (
  tenantSlug: string,
  contactId: number,
  data: Partial<ContactFormData>
): Promise<Contact> => {
  try {
    // Filter out undefined values
    const filteredData = Object.entries(data).reduce<Partial<ContactFormData>>((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key as keyof Partial<ContactFormData>] = value;
      }
      return acc;
    }, {});
    
    const response = await apiClient.patch<Contact>(
      `/api/${tenantSlug}/marketing/contacts/${contactId}/`,
      filteredData
    );
    
    return response.data;
  } catch (error) {
    console.error(`Error updating contact ${contactId}:`, error);
    throw error;
  }
};

/**
 * Delete a contact
 * @param tenantSlug The tenant's unique slug
 * @param contactId Contact ID
 * @returns Promise<void>
 */
export const deleteContact = async (
  tenantSlug: string,
  contactId: number
): Promise<void> => {
  try {
    await apiClient.delete(`/api/${tenantSlug}/marketing/contacts/${contactId}/`);
  } catch (error) {
    console.error(`Error deleting contact ${contactId}:`, error);
    throw error;
  }
};

/**
 * Get lists with optional pagination, search, and includeInternal flag
 * @param tenantSlug The tenant's unique slug
 * @param page Page number for pagination
 * @param search Search term
 * @param includeInternal Whether to include internal lists
 * @returns Promise with paginated lists data
 */
export const getLists = async (
  tenantSlug: string,
  page: number = 1,
  search: string = '',
  includeInternal: boolean = false
): Promise<PaginatedResponse<MarketingList>> => {
  try {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    
    if (search) {
      params.append('search', search);
    }
    
    if (includeInternal) {
      params.append('include_internal', 'true');
    }
    
    const response = await apiClient.get<PaginatedResponse<MarketingList>>(
      `/api/${tenantSlug}/marketing/lists/?${params.toString()}`
    );
    
    return response.data;
  } catch (error) {
    console.error('Error fetching lists:', error);
    throw error;
  }
};

/**
 * Get a single list by ID
 * @param tenantSlug The tenant's unique slug
 * @param listId List ID
 * @returns Promise with list data
 */
export const getListById = async (
  tenantSlug: string,
  listId: number
): Promise<MarketingList> => {
  try {
    const response = await apiClient.get<MarketingList>(
      `/api/${tenantSlug}/marketing/lists/${listId}/`
    );
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching list ${listId}:`, error);
    throw error;
  }
};

/**
 * Create a new list
 * @param tenantSlug The tenant's unique slug
 * @param data List data
 * @returns Promise with created list data
 */
export const createList = async (
  tenantSlug: string,
  data: ListFormData
): Promise<MarketingList> => {
  try {
    // Ensure list_type is properly typed
    const typedData = {
      ...data,
      list_type: data.list_type as 'STATIC' | 'DYNAMIC_SEGMENT'
    };
    
    // Create the list first
    const response = await apiClient.post<MarketingList>(
      `/api/${tenantSlug}/marketing/lists/`,
      typedData
    );
    
    const createdList = response.data;
    
    // If there are initial contacts and the list is STATIC, add them to the list
    if (data.initial_contacts && data.initial_contacts.length > 0 && data.list_type === 'STATIC') {
      try {
        await addMembersToList(tenantSlug, createdList.id, data.initial_contacts);
        console.log(`Added ${data.initial_contacts.length} contacts to list ${createdList.id}`);
      } catch (addError) {
        console.error('Error adding initial contacts to list:', addError);
        // We don't throw here because the list was already created successfully
      }
    }
    
    return createdList;
  } catch (error) {
    console.error('Error creating list:', error);
    throw error;
  }
};

/**
 * Update an existing list
 * @param tenantSlug The tenant's unique slug
 * @param listId List ID
 * @param data Updated list data
 * @returns Promise with updated list data
 */
export const updateList = async (
  tenantSlug: string,
  listId: number,
  data: Partial<ListFormData>
): Promise<MarketingList> => {
  try {
    // Create a new object with properly typed fields
    const filteredData: Partial<ListFormData> = {};
    
    if (data.name !== undefined) {
      filteredData.name = data.name;
    }
    
    if (data.description !== undefined) {
      filteredData.description = data.description;
    }
    
    if (data.list_type !== undefined) {
      // Explicitly cast to the correct type
      filteredData.list_type = data.list_type as ListType;
    }
    
    // Create a properly typed payload
    const payload: {
      name?: string;
      description?: string | null;
      list_type?: ListType;
    } = {};
    
    if (filteredData.name !== undefined) {
      payload.name = filteredData.name;
    }
    
    if (filteredData.description !== undefined) {
      payload.description = filteredData.description;
    }
    
    if (filteredData.list_type !== undefined) {
      payload.list_type = filteredData.list_type as ListType;
    }
    
    const response = await apiClient.patch<MarketingList>(
      `/api/${tenantSlug}/marketing/lists/${listId}/`,
      payload
    );
    
    return response.data;
  } catch (error) {
    console.error(`Error updating list ${listId}:`, error);
    throw error;
  }
};

/**
 * Delete a list
 * @param tenantSlug The tenant's unique slug
 * @param listId List ID
 * @returns Promise<void>
 */
export const deleteList = async (
  tenantSlug: string,
  listId: number
): Promise<void> => {
  try {
    await apiClient.delete(`/api/${tenantSlug}/marketing/lists/${listId}/`);
  } catch (error) {
    console.error(`Error deleting list ${listId}:`, error);
    throw error;
  }
};

/**
 * Get list members with optional pagination and search
 * @param tenantSlug The tenant's unique slug
 * @param listId List ID
 * @param page Page number for pagination
 * @param search Search term
 * @returns Promise with paginated list members data
 */
export const getListMembers = async (
  tenantSlug: string,
  listId: number,
  page: number = 1,
  search: string = ''
): Promise<PaginatedResponse<ListMember>> => {
  try {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    
    if (search) {
      params.append('search', search);
    }
    
    const response = await apiClient.get<PaginatedResponse<ListMember>>(
      `/api/${tenantSlug}/marketing/lists/${listId}/members/?${params.toString()}`
    );
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching members for list ${listId}:`, error);
    throw error;
  }
};

/**
 * Add members to a list
 * @param tenantSlug The tenant's unique slug
 * @param listId List ID
 * @param contactIds Array of contact IDs to add
 * @returns Promise with success message
 */
export const addMembersToList = async (
  tenantSlug: string,
  listId: number,
  contactIds: number[]
): Promise<{ message: string }> => {
  try {
    const response = await apiClient.post<{ message: string }>(
      `/api/${tenantSlug}/marketing/lists/${listId}/add-members/`,
      { contact_ids: contactIds }
    );
    
    return response.data;
  } catch (error) {
    console.error(`Error adding members to list ${listId}:`, error);
    throw error;
  }
};

/**
 * Remove members from a list
 * @param tenantSlug The tenant's unique slug
 * @param listId List ID
 * @param contactIds Array of contact IDs to remove
 * @returns Promise with success message
 */
export const removeMembersFromList = async (
  tenantSlug: string,
  listId: number,
  contactIds: number[]
): Promise<{ message: string }> => {
  try {
    const response = await apiClient.post(
      `/api/${tenantSlug}/marketing/lists/${listId}/remove_members/`,
      { contact_ids: contactIds }
    );
    return response.data;
  } catch (error) {
    console.error(`Error removing members from list ${listId}:`, error);
    throw error;
  }
};

/**
 * Upload a file with contacts to add to a list
 * @param tenantSlug The tenant's unique slug
 * @param listId List ID
 * @param file The file to upload (CSV or Excel)
 * @returns Promise with bulk import result
 */
export const uploadContactsToList = async (
  tenantSlug: string,
  listId: number,
  file: File
): Promise<{
  status: string;
  list_id: number;
  list_name: string;
  created_count: number;
  existing_count: number;
  error_count: number;
  added_to_list: number;
  already_in_list: number;
  errors: any[];
}> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post(
      `/api/${tenantSlug}/marketing/lists/${listId}/upload-contacts/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error uploading contacts to list ${listId}:`, error);
    throw error;
  }
};

/**
 * Create a new list with contacts from a file in one operation
 * @param tenantSlug The tenant's unique slug
 * @param name List name
 * @param description List description (optional)
 * @param listType List type (STATIC or DYNAMIC_SEGMENT)
 * @param file The file to upload (CSV or Excel)
 * @returns Promise with creation and import result
 */
export const createListWithFile = async (
  tenantSlug: string,
  name: string,
  description: string,
  listType: string,
  file: File
): Promise<{
  status: string;
  list_id: number;
  list_name: string;
  created_count: number;
  existing_count: number;
  error_count: number;
  added_to_list: number;
  contact_ids: number[];
  list: any;
  errors: any[];
}> => {
  try {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('list_type', listType);
    formData.append('file', file);
    
    const response = await apiClient.post(
      `/api/${tenantSlug}/marketing/lists/create-with-file/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error creating list with file:', error);
    throw error;
  }
};

/**
 * Download a list as CSV
 * @param tenantSlug The tenant's unique slug
 * @param listId List ID
 * @returns Promise with blob data for download
 */
export const downloadList = async (
  tenantSlug: string,
  listId: number
): Promise<Blob> => {
  try {
    const response = await apiClient.get(
      `/api/${tenantSlug}/marketing/lists/${listId}/download/`,
      {
        responseType: 'blob'
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error downloading list ${listId}:`, error);
    throw error;
  }
};

/**
 * Download contacts as CSV
 * @param tenantSlug The tenant's unique slug
 * @param contactIds Optional array of contact IDs to download. If not provided, all contacts will be downloaded.
 * @returns Promise with blob data for download
 */
 export const downloadContacts = async (
  tenantSlug: string,
  contactIds?: number[]
): Promise<Blob> => {
  try {
    if (contactIds && contactIds.length > 0) {
      // If specific contact IDs are provided, use POST request
      const response = await apiClient.post(
        `/api/${tenantSlug}/marketing/contacts/download/`,
        { contact_ids: contactIds },
        {
          responseType: 'blob'
        }
      );
      return response.data;
    } else {
      // Otherwise, use GET request to download all contacts
      const response = await apiClient.get(
        `/api/${tenantSlug}/marketing/contacts/download/`,
        {
          responseType: 'blob'
        }
      );
      return response.data;
    }
  } catch (error) {
    console.error(`Error downloading contacts:`, error);
    throw error;
  }
};
