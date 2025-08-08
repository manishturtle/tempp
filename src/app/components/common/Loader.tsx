/**
 * Reusable loader component
 */
import React from 'react';
import { Box, CircularProgress, Typography, alpha } from '@mui/material';

interface LoaderProps {
  size?: number;
  message?: string;
  fullScreen?: boolean;
}

const Loader: React.FC<LoaderProps> = ({
  size = 40,
  message = 'Loading...',
  fullScreen = false,
}) => {
  const content = (
    <Box
      sx={(theme) => ({
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: theme.spacing(2),
        p: theme.spacing(3)
      })}
    >
      <CircularProgress size={size} />
      {message && <Typography variant="body2" color="text.secondary">{message}</Typography>}
    </Box>
  );

  if (fullScreen) {
    return (
      <Box
        sx={(theme) => ({
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: alpha(theme.palette.background.default, 0.8),
          zIndex: theme.zIndex.modal + 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        })}
      >
        {content}
      </Box>
    );
  }

  return content;
};

export default Loader;
