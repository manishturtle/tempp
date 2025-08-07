import React from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';

interface CustomSnackbarProps {
  open: boolean;
  message: string;
  severity: AlertColor;
  onClose: () => void;
  autoHideDuration?: number;
}

const CustomSnackbar: React.FC<CustomSnackbarProps> = ({
  open,
  message,
  severity,
  onClose,
  autoHideDuration = 6000,
}) => {
  const handleClose = (event: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    onClose();
  };

  return (
    <Snackbar 
      open={open} 
      autoHideDuration={autoHideDuration} 
      onClose={handleClose} 
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      sx={{ '& .MuiSnackbar-anchorOriginTopRight': { top: '24px' } }}
    >
      <Alert 
        onClose={onClose} 
        severity={severity}
        variant="filled" 
        sx={{ 
          width: '100%',
          '& .MuiAlert-message': { whiteSpace: 'pre-line' }
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};

export default CustomSnackbar;
