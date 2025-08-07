import { Box, Typography, Button, useTheme } from '@mui/material';

export const BillingInfo = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        mt: 4,
        pt: 3,
        borderTop: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <Box>
        <Typography variant="body2" color="text.secondary">
          Billing Information
        </Typography>
        <Typography variant="body2" color="text.primary">
          Next Bill Due: July 1, 2025 • Estimated Amount: $1,249.00
        </Typography>
      </Box>
      <Button
        variant="text"
        size="small"
        sx={{ color: theme.palette.primary.main }}
      >
        Manage Billing & Invoices
      </Button>
    </Box>
  );
};
