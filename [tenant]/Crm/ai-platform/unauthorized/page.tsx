'use client';

import { useSearchParams } from 'next/navigation';
import { Alert, AlertTitle, Typography, Box, Button } from '@mui/material';
import Link from 'next/link';

type ErrorType = 'ip_restricted' | 'domain_restricted' | 'user_not_found' | 'generic';

interface ErrorConfig {
  title: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  showContact: boolean;
}

const errorConfigs: Record<ErrorType, ErrorConfig> = {
  ip_restricted: {
    title: 'IP Address Not Allowed',
    message: 'Your IP address is not authorized to access this application. Please contact your system administrator for assistance.',
    severity: 'error',
    showContact: true,
  },
  domain_restricted: {
    title: 'Domain Not Allowed',
    message: 'Access from this domain is not permitted. Please use an approved domain to access the application.',
    severity: 'warning',
    showContact: true,
  },
  user_not_found: {
    title: 'User Not Found',
    message: 'The requested user account could not be found. Please check your login details and try again.',
    severity: 'error',
    showContact: false,
  },
  generic: {
    title: 'Access Denied',
    message: 'You do not have permission to access this resource. Please contact your system administrator if you believe this is an error.',
    severity: 'error',
    showContact: true,
  },
};

export default function UnauthorizedPage() {
  const searchParams = useSearchParams();
  const errorType = (searchParams.get('error') || 'generic') as ErrorType;
  const errorDetails = searchParams.get('details') || '';
  const config = errorConfigs[errorType] || errorConfigs.generic;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        p: 3,
        bgcolor: 'background.default',
      }}
    >
      <Box
        sx={{
          maxWidth: 600,
          width: '100%',
          p: 4,
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 3,
        }}
      >
        <Alert severity={config.severity} sx={{ mb: 3 }}>
          <AlertTitle sx={{ fontWeight: 'bold' }}>{config.title}</AlertTitle>
          <Typography variant="body1" component="div">
            {config.message}
          </Typography>
          {errorDetails && (
            <Typography variant="body2" sx={{ mt: 1, fontFamily: 'monospace' }}>
              {errorDetails}
            </Typography>
          )}
        </Alert>

        {config.showContact && (
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Need help? Contact our support team at support@example.com
            </Typography>
          </Box>
        )}

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            component={Link}
            href="/"
            sx={{ textTransform: 'none' }}
          >
            Return to Home
          </Button>
        </Box>
      </Box>
    </Box>
  );
}