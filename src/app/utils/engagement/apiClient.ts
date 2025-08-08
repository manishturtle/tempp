'use client';

/**
 * API Client
 * This file contains the axios instance used for API calls
 */

import axios from 'axios';
// import { ENGAGEMENT_API_BASE_URL, getToken, getAuthHeader } from '../constants/apiConstants';
import {ENGAGEMENT_API_BASE_URL} from '../../../utils/constants';
import { getAuthHeaders } from '@/app/hooks/api/auth';


// Create an axios instance with default config
const apiClient = axios.create({
  baseURL: ENGAGEMENT_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    // Get token and auth header from centralized configuration
    const token = getAuthHeaders().token;
    
    // Only add Authorization header if token exists
    if (token) {
      config.headers.Authorization = token;
    } else {
      console.warn('No authentication token found. API requests may fail.');
    }
    
    // If you need to add tenant-specific headers, you can do it here
    // The tenant context is typically derived from the JWT on the backend
    // or passed in the URL path in your existing implementation
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor for global error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle global errors
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('API Error Response:', error.response.data);
      console.error('Status:', error.response.status);
      
      // Handle specific status codes
      if (error.response.status === 401) {
        // Unauthorized - could redirect to login or refresh token
        console.error('Unauthorized access. You may need to log in again.');
        // You could trigger a logout or token refresh here
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('API No Response:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('API Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
