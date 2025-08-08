import { Box, Button, Typography, useTheme } from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';

export const UserManagementCard = () => {
  const theme = useTheme();

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
      <Typography variant="h6" fontWeight={600} mb={2}>
        User Management
      </Typography>
      
      <Typography variant="body2" color="text.secondary" mb={1}>
        User Distribution by Application
      </Typography>
      
      <Box display="flex" alignItems="flex-end" height={80} mb={3} gap={1}>
        <Box
          sx={{
            bgcolor: theme.palette.primary.main,
            width: '25%',
            height: '60%',
            borderRadius: '4px 4px 0 0',
          }}
        />
        <Box
          sx={{
            bgcolor: theme.palette.secondary.main,
            width: '25%',
            height: '40%',
            borderRadius: '4px 4px 0 0',
          }}
        />
        <Box
          sx={{
            bgcolor: theme.palette.info.main,
            width: '25%',
            height: '70%',
            borderRadius: '4px 4px 0 0',
          }}
        />
        <Box
          sx={{
            bgcolor: theme.palette.success.main,
            width: '25%',
            height: '50%',
            borderRadius: '4px 4px 0 0',
          }}
        />
      </Box>
      
      <Box display="flex" justifyContent="space-around" mb={3}>
        {['CRM', 'HR', 'Finance', 'Supply'].map((app, index) => (
          <Box key={app} display="flex" alignItems="center">
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: [
                  theme.palette.primary.main,
                  theme.palette.secondary.main,
                  theme.palette.info.main,
                  theme.palette.success.main,
                ][index],
                mr: 0.5,
              }}
            />
            <Typography variant="caption" color="text.secondary">
              {app}
            </Typography>
          </Box>
        ))}
      </Box>
      
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="body2" color="text.secondary">
          Pending Invitations <span style={{ color: theme.palette.text.primary, fontWeight: 500 }}>2</span>
        </Typography>
        <Button size="small" sx={{ color: theme.palette.primary.main, textTransform: 'none' }}>
          Manage
        </Button>
      </Box>
      
      <Button
        fullWidth
        variant="contained"
        startIcon={<PersonAddIcon />}
        sx={{ mb: 1.5, py: 1.5 }}
      >
        Invite New User
      </Button>
      
      <Button
        fullWidth
        variant="outlined"
        startIcon={<ManageAccountsIcon />}
        sx={{ py: 1.5 }}
      >
        Manage User Access & Roles
      </Button>
    </Box>
  );
};
