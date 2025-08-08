import { Box, Typography, Button, useTheme } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

type AuditLog = {
  id: number;
  title: string;
  description: string;
  timestamp: string;
  isWarning?: boolean;
};

export const SecurityAuditCard = () => {
  const theme = useTheme();

  const auditLogs: AuditLog[] = [
    {
      id: 1,
      title: 'Failed Login Attempts (24H)',
      description: '3',
      isWarning: true,
      timestamp: '',
    },
    {
      id: 2,
      title: 'You invited',
      description: 'john.doe@tenant.com',
      timestamp: 'June 15, 2025 at 10:30 AM',
    },
    {
      id: 3,
      title: 'CRM User limit exceeded notification sent',
      description: '',
      timestamp: 'June 14, 2025 at 03:15 PM',
    },
    {
      id: 4,
      title: 'Password policy updated',
      description: '',
      timestamp: 'June 14, 2025 at 09:00 AM',
    },
    {
      id: 5,
      title: 'Added new payment method',
      description: '',
      timestamp: 'June 14, 2025 at 02:00 PM',
    },
  ];

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        p: 3,
        borderRadius: 2,
        boxShadow: 1,
        height: '100%',
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" fontWeight={600}>
          Security & Audit
        </Typography>
        <Button
          endIcon={<OpenInNewIcon fontSize="small" />}
          size="small"
          sx={{ color: theme.palette.primary.main }}
        >
          View Full Security Audit Log
        </Button>
      </Box>

      <Box>
        {auditLogs.map((log, index) => (
          <Box key={log.id} mb={index < auditLogs.length - 1 ? 2 : 0}>
            {log.isWarning ? (
              <Box
                sx={{
                  bgcolor: theme.palette.error.light,
                  p: 2,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ErrorOutlineIcon
                  sx={{ color: "white", mr: 1 }}
                  fontSize="small"
                />
                <Box>
                  <Typography variant="body2" fontWeight={500} color="white">
                    {log.title}: <span style={{ fontWeight: 700 }}>{log.description}</span>
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Box>
                <Typography variant="body2" color="text.primary">
                  {log.title}{' '}
                  {log.description && (
                    <span style={{ fontWeight: 500 }}>{log.description}</span>
                  )}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {log.timestamp}
                </Typography>
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
};
