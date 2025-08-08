import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { apiEndpoints } from '@/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';

/**
 * Custom hook to fetch and cache the current user data
 * Uses TanStack Query for caching and state management
 * Depends on authentication state from AuthContext
 */
export function useCurrentUser() {
  const { isAuthenticated, token } = useAuth();
  
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        const response = await api.get(apiEndpoints.auth.me);
        return response.data;
      } catch (error) {
        console.error('Error fetching current user:', error);
        throw error;
      }
    },
    // Only fetch if user is authenticated and has a token
    enabled: isAuthenticated && !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
