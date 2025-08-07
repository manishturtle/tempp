import { Box, BoxProps } from '@mui/material';
import { ReactNode } from 'react';

interface PageContainerProps extends BoxProps {
  children: ReactNode;
  maxWidth?: string | number;
}

export default function PageContainer({ 
  children, 
  maxWidth = 1200,
  ...props 
}: PageContainerProps) {
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        overflow: 'auto',
        p: 3,
        boxSizing: 'border-box',
      }}
      {...props}
    >
      <Box
        sx={{
          maxWidth: maxWidth,
          width: '100%',
          mx: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
