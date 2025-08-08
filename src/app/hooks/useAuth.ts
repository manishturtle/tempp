'use client';

import { useState, useEffect } from 'react';
import { setAuthToken } from '@/lib/api';

interface User {
  id: string;
  username: string;
  email: string;
  isStaff?: boolean;
}

/**
 * Hook for handling authentication state
 * 
 * @returns Authentication state and methods
 */
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Simulate checking authentication on mount
  useEffect(() => {
    const checkAuth = () => {
      // For demo purposes, we'll consider the user as authenticated
      // In a real app, you would check for a valid token in localStorage or cookies
      const token = localStorage.getItem('auth_token');
      
      if (token) {
        setAuthToken(token);
        setIsAuthenticated(true);
        
        // Set mock user data for now
        // In a real app, you would decode the JWT or fetch user profile
        setUser({
          id: '1',
          username: 'demo_user',
          email: 'demo@example.com',
        });
      } else {
        setAuthToken(null);
        setIsAuthenticated(false);
        setUser(null);
      }
      
      setIsLoading(false);
    };
    
    checkAuth();
  }, []);
  
  const login = (token: string, userData: User) => {
    localStorage.setItem('auth_token', token);
    setAuthToken(token);
    setIsAuthenticated(true);
    setUser(userData);
  };
  
  const logout = () => {
    localStorage.removeItem('auth_token');
    setAuthToken(null);
    setIsAuthenticated(false);
    setUser(null);
  };
  
  return {
    isAuthenticated,
    isLoading,
    user,
    login,
    logout
  };
}
