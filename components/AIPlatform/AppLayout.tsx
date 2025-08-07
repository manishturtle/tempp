'use client';

import { Box, Container } from '@mui/material';
import NewHeader from './Header';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh'}}>
      <NewHeader />
      <Container 
        component="main" 
        maxWidth={false} 
        sx={{ 
          flex: 1, 
          py: 3,
          px: { xs: 2, sm: 3, md: 4 },
          backgroundColor: 'background.default'
        }}
      >
        {children}
      </Container>
    </Box>
  );
}
