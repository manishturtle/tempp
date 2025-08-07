/**
 * Reusable notification component using Snackbar and Alert
 */
import React from 'react';
import { Snackbar, Alert, AlertColor, Typography } from '@mui/material';

interface NotificationProps {
  open: boolean;
  message: string;
  title?: string;
  severity: AlertColor;
  onClose: () => void;
  autoHideDuration?: number;
}

const Notification: React.FC<NotificationProps> = ({
  open,
  message,
  title,
  severity,
  onClose,
  autoHideDuration = 5000,
}) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Alert 
        onClose={onClose} 
        severity={severity} 
        sx={(theme) => ({
          width: '100%',
          borderRadius: theme.shape.borderRadius,
          padding: theme.spacing(1, 2),
          '& .MuiAlert-message': {
            padding: theme.spacing(0.5, 0)
          }
        })}
        variant="filled"
        elevation={6}
      >
        {title && (
          <Typography variant="subtitle2" fontWeight="bold">
            {title}
          </Typography>
        )}
        <Typography variant="body2">
          {message}
        </Typography>
      </Alert>
    </Snackbar>
  );
};

export default Notification;
