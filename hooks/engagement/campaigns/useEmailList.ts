'use client';

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_BASE_URL, getToken, getAuthHeader, handleMissingToken, MARKETING_API } from '../../../constants/apiConstants';

/**
 * Interface for email list metadata
 */
export interface EmailList {
  id: number;
  name: string;
  source: string;
  created_at: string;
  count: number;
}

/**
 * Interface for available email lists response
 */
export interface EmailListsResponse {
  lists: EmailList[];
}

/**
 * Interface for email list details response
 */
export interface EmailListDetailsResponse {
  id: number;
  name: string;
  emails: string[];
}

/**
 * Hook to fetch available email lists
 */
export const useAvailableEmailLists = (tenantSlug: string) => {
  return useQuery({
    queryKey: ['availableEmailLists', tenantSlug],
    queryFn: async () => {
      const token = getToken();
      
      // If no token is available, redirect to login
      if (!token) {
        handleMissingToken();
        return [];
      }
      
      try {
        // Use centralized endpoint from apiConstants
        const response = await axios.get<EmailListsResponse>(
          MARKETING_API.EMAIL_LISTS(tenantSlug),
          { headers: getAuthHeader() }
        );
        
        console.log('Fetched available email lists:', response.data.lists);
        return response.data.lists || [];
      } catch (error) {
        console.error('Error fetching available email lists:', error);
        // Return mock data for testing
        return [
          { id: 1, name: 'Marketing List - May 2025', source: 'Marketing Platform', created_at: '2025-05-20T10:30:00Z', count: 5 },
          { id: 2, name: 'Customer Feedback Survey', source: 'Feedback System', created_at: '2025-05-21T14:15:00Z', count: 8 },
          { id: 3, name: 'Product Launch Announcement', source: 'CRM System', created_at: '2025-05-22T09:45:00Z', count: 12 }
        ];
      }
    },
    // Refresh every 5 minutes
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to fetch emails from a specific list
 */
export const useEmailListDetails = (tenantSlug: string, listId: number | null) => {
  return useQuery({
    queryKey: ['emailListDetails', tenantSlug, listId],
    queryFn: async () => {
      if (!listId) return { id: 0, name: '', emails: [] };
      
      const token = getToken();
      
      // If no token is available, redirect to login
      if (!token) {
        handleMissingToken();
        return { id: 0, name: '', emails: [] };
      }
      
      try {
        // Use centralized endpoint from apiConstants
        const response = await axios.get<EmailListDetailsResponse>(
          MARKETING_API.EMAIL_LIST_DETAILS(tenantSlug, listId),
          { headers: getAuthHeader() }
        );
        
        console.log(`Fetched email list ${listId} details:`, response.data);
        return response.data;
      } catch (error) {
        console.error(`Error fetching email list ${listId} details:`, error);
        // Return mock data based on the list ID
        if (listId === 1) {
          return {
            id: 1,
            name: 'Marketing List - May 2025',
            emails: [
              'customer1@example.com',
              'customer2@example.com',
              'customer3@example.com',
              'customer4@example.com',
              'customer5@example.com'
            ]
          };
        } else if (listId === 2) {
          return {
            id: 2,
            name: 'Customer Feedback Survey',
            emails: [
              'feedback1@example.com',
              'feedback2@example.com',
              'feedback3@example.com',
              'feedback4@example.com',
              'feedback5@example.com',
              'feedback6@example.com',
              'feedback7@example.com',
              'feedback8@example.com'
            ]
          };
        } else {
          return {
            id: 3,
            name: 'Product Launch Announcement',
            emails: [
              'launch1@example.com',
              'launch2@example.com',
              'launch3@example.com',
              'launch4@example.com',
              'launch5@example.com',
              'launch6@example.com',
              'launch7@example.com',
              'launch8@example.com',
              'launch9@example.com',
              'launch10@example.com',
              'launch11@example.com',
              'launch12@example.com'
            ]
          };
        }
      }
    },
    enabled: !!listId,
    // Refresh every 5 minutes
    staleTime: 5 * 60 * 1000,
  });
};
