import { useState } from 'react';

/**
 * Hook for displaying notifications
 * This is a simple implementation that could be expanded to use a toast library
 */
export const useNotification = () => {
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    visible: boolean;
  } | null>(null);

  const showSuccess = (message: string) => {
    setNotification({
      type: 'success',
      message,
      visible: true,
    });
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  const showError = (message: string, error?: any) => {
    console.error('Error:', message, error);
    
    // Extract error message from various error formats
    let errorMessage = message;
    
    if (error) {
      if (typeof error === 'string') {
        errorMessage = `${message}: ${error}`;
      } else if (error.message) {
        errorMessage = `${message}: ${error.message}`;
      } else if (error.response?.data?.detail) {
        errorMessage = `${message}: ${error.response.data.detail}`;
      } else if (error.response?.data?.message) {
        errorMessage = `${message}: ${error.response.data.message}`;
      } else if (error.response?.data?.error) {
        errorMessage = `${message}: ${error.response.data.error}`;
      }
    }
    
    setNotification({
      type: 'error',
      message: errorMessage,
      visible: true,
    });
    
    // Auto-hide after 8 seconds (errors stay longer)
    setTimeout(() => {
      setNotification(null);
    }, 8000);
  };

  const showInfo = (message: string) => {
    setNotification({
      type: 'info',
      message,
      visible: true,
    });
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  const showWarning = (message: string) => {
    setNotification({
      type: 'warning',
      message,
      visible: true,
    });
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  const hideNotification = () => {
    setNotification(null);
  };

  return {
    notification,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    hideNotification,
  };
};
