"use client";

/**
 * Custom hook for managing notifications
 */
import { useState } from 'react';
import { AlertColor } from '@mui/material';

interface NotificationState {
  open: boolean;
  message: string;
  title?: string;
  severity: AlertColor;
}

interface NotificationOptions {
  title?: string;
  message: string;
  type: AlertColor;
}

const useNotification = () => {
  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    message: '',
    title: '',
    severity: 'info',
  });

  const showNotification = (options: NotificationOptions | string, severity?: AlertColor) => {
    if (typeof options === 'string') {
      // Handle the old format (string message, severity)
      setNotification({
        open: true,
        message: options,
        severity: severity || 'info',
      });
    } else {
      // Handle the new format (object with title, message, type)
      setNotification({
        open: true,
        title: options.title,
        message: options.message,
        severity: options.type,
      });
    }
  };

  const hideNotification = () => {
    setNotification((prev) => ({
      ...prev,
      open: false,
    }));
  };

  const showSuccess = (message: string) => {
    showNotification(message, 'success');
  };

  const showError = (message: string) => {
    showNotification(message, 'error');
  };

  const showWarning = (message: string) => {
    showNotification(message, 'warning');
  };

  const showInfo = (message: string) => {
    showNotification(message, 'info');
  };

  return {
    notification,
    showNotification,
    hideNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};

export default useNotification;
