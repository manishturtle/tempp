import { FC } from 'react';
import { Box, Typography, Button, Chip, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import NoteAddIcon from '@mui/icons-material/NoteAdd';

interface AccountDetailHeaderProps {
  account: any; // Replace with proper Account interface
  tabButtons?: any[];
}

/**
 * Header component for the Account Detail page
 * Displays account name, status, and action buttons
 */
export const AccountDetailHeader: FC<AccountDetailHeaderProps> = ({ account, tabButtons = [] }) => {
  const { t } = useTranslation();

  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      mb: 3,
      flexDirection: { xs: 'column', sm: 'row' },
      gap: { xs: 2, sm: 0 }
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h4" component="h1">
          {account.name}
        </Typography>
        <Chip 
          label={account.status} 
          color={account.status === 'Active' ? 'success' : 'default'} 
          size="small"
          sx={{ textTransform: 'capitalize' }}
        />
      </Box>
      
      <Stack direction="row" spacing={1}>
        <Button 
          variant="outlined" 
          startIcon={<EditIcon />}
          size="small"
        >
          {t('common.actions.edit')}
        </Button>
        <Button 
          variant="outlined" 
          startIcon={<DeleteIcon />}
          size="small"
          color="error"
        >
          {t('common.actions.delete')}
        </Button>
        
      
      </Stack>
    </Box>
  );
};
