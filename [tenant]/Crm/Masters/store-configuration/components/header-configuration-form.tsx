import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Grid,
  IconButton,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

import {
  useAdminHeaderConfiguration,
  useUpdateHeaderConfiguration,
} from '@/app/hooks/api/admin/site-config';
import { useFetchActiveDivisionHierarchy } from '@/app/hooks/api/catalogue';

// Kept the original Division interface
interface Division {
  id: string;
  name: string;
}

// State for the two lists remains the same
interface TransferListState {
  available: Division[];
  displayed: Division[];
}

/**
 * Header Configuration Form Component
 * Allows admin to manage which divisions appear in the header and in what order.
 * UI has been updated to match the user-provided image, including reordering and fixed-height scrollable lists.
 */
export function HeaderConfigurationForm(): React.ReactElement {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // The main state for our two lists
  const [transferList, setTransferList] = useState<TransferListState>({
    available: [],
    displayed: [],
  });
  
  // New state to track the selected item in the right list for reordering
  const [selectedItem, setSelectedItem] = useState<Division | null>(null);

  // API Hooks remain unchanged
  const { data: headerConfig, isLoading: isHeaderLoading, error: headerError } = useAdminHeaderConfiguration();
  const { data: divisionHierarchy, isLoading: isDivisionsLoading, error: divisionsError } = useFetchActiveDivisionHierarchy();
  const updateHeaderMutation = useUpdateHeaderConfiguration();

  // Effect for handling submission success/error remains the same
  useEffect(() => {
    if (updateHeaderMutation.isSuccess) {
      setIsSubmitting(false);
      setSuccessMessage(t('storeConfiguration.header.saveSuccess', 'Configuration saved successfully!'));
      setTimeout(() => setSuccessMessage(''), 3000);
    } else if (updateHeaderMutation.isError) {
      setIsSubmitting(false);
    }
  }, [updateHeaderMutation.isSuccess, updateHeaderMutation.isError, t]);

  // Effect to initialize the lists when data loads
  useEffect(() => {
    if (headerConfig && divisionHierarchy) {
      const allDivisions: Division[] = divisionHierarchy.map((div) => ({
        id: String(div.id),
        name: div.name,
      }));
      
      const displayedMap = new Map(
        headerConfig.divisions.map((div) => [String(div.id), div])
      );
      
      const displayedList = headerConfig.divisions
        .map(div => ({ id: String(div.id), name: div.name }))
        .filter(div => allDivisions.some(d => d.id === div.id));
        
      const displayedIds = new Set(displayedList.map(div => div.id));
      const availableList = allDivisions.filter((div) => !displayedIds.has(div.id));
      
      setTransferList({
        available: availableList,
        displayed: displayedList,
      });
    }
  }, [headerConfig, divisionHierarchy]);

  // Moves an item from the "Available" list to the "Displayed" list
  const handleAdd = (itemToAdd: Division): void => {
    setTransferList((prev) => ({
      available: prev.available.filter((item) => item.id !== itemToAdd.id),
      displayed: [...prev.displayed, itemToAdd],
    }));
  };
  
  // Moves an item from the "Displayed" list to the "Available" list
  const handleRemove = (itemToRemove: Division): void => {
    setTransferList((prev) => ({
      available: [...prev.available, itemToRemove],
      displayed: prev.displayed.filter((item) => item.id !== itemToRemove.id),
    }));
    if (selectedItem?.id === itemToRemove.id) {
      setSelectedItem(null);
    }
  };

  // Handles reordering the "Displayed" list
  const moveItem = (direction: 'up' | 'down'): void => {
    if (!selectedItem) return;

    const currentIndex = transferList.displayed.findIndex(item => item.id === selectedItem.id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= transferList.displayed.length) return;

    const newDisplayed = [...transferList.displayed];
    const [movedItem] = newDisplayed.splice(currentIndex, 1);
    newDisplayed.splice(newIndex, 0, movedItem);

    setTransferList({ ...transferList, displayed: newDisplayed });
  };

  // The save handler remains functionally identical
  const handleSave = (): void => {
    setIsSubmitting(true);
    const divisionIds = transferList.displayed.map((div) => div.id);
    updateHeaderMutation.mutate({ division_ids: divisionIds });
  };

  if (isHeaderLoading || isDivisionsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (headerError || divisionsError) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {t('error.failedToLoadData', 'Failed to load configuration data.')}
      </Alert>
    );
  }
  
  const selectedIndex = selectedItem ? transferList.displayed.findIndex(i => i.id === selectedItem.id) : -1;

  return (
    <Box>
       {/* Section Header with Save Button */}
       <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
           <Box>
                <Typography variant="h5" component="h1" gutterBottom>
                    {t('storeConfiguration.header.megaMenuTitle', 'Header & Mega Menu Configuration')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {t('storeConfiguration.header.megaMenuDescription', 'Configure your site\'s header navigation and mega menu content')}
                </Typography>
            </Box>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? t('actions.saving', 'Saving...') : t('actions.saveChanges', 'Save Changes')}
            </Button>
       </Box>

       {successMessage && (
         <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage('')}>
           {successMessage}
         </Alert>
       )}

      {/* Main Configuration Card */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t('storeConfiguration.header.divisionDisplayOrderTitle', 'Set Division Display & Order')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {t('storeConfiguration.header.selectionInstructions', 'Select which divisions appear in the main header and set their display order. The first 5 will be visible, others will be in a \'More\' menu.')}
          </Typography>

          <Grid container spacing={2} justifyContent="center" alignItems="stretch">
            {/* Available Divisions List */}
            <Grid size={{ xs: 12, md: 5 }}>
                <Paper 
                    variant="outlined" 
                    sx={{ 
                        height: 400,
                        display: 'flex',
                        flexDirection: 'column',
                        borderColor: '#ccc' // UPDATE: Darker border
                    }}
                >
                    <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: '#ccc' }}>
                         <Typography variant="subtitle1" fontWeight="bold">{t('storeConfiguration.header.availableDivisions', 'Available Divisions')}</Typography>
                         <Typography variant="body2" color="text.secondary">{`${transferList.available.length} ${t('common.items', 'Items')}`}</Typography>
                    </Box>
                    <List dense sx={{ flexGrow: 1, overflow: 'auto', p: 0 }}>
                        {transferList.available.map(item => (
                            <ListItem
                                key={item.id}
                                secondaryAction={
                                    <IconButton edge="end" aria-label="add" onClick={() => handleAdd(item)}>
                                        <AddCircleOutlineIcon />
                                    </IconButton>
                                }
                                sx={{ borderBottom: '1px solid', borderColor: '#ccc', '&:last-child': { borderBottom: 'none' } }}
                            >
                                <ListItemText primary={item.name} />
                            </ListItem>
                        ))}
                    </List>
                </Paper>
            </Grid>

            {/* Action Buttons Column */}
            <Grid size={{ xs: 12, md: 2 }} sx={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <IconButton aria-label="move up" onClick={() => moveItem('up')} disabled={selectedIndex < 1}>
                    <ArrowUpwardIcon />
                </IconButton>
                <IconButton aria-label="move down" onClick={() => moveItem('down')} disabled={selectedIndex === -1 || selectedIndex >= transferList.displayed.length - 1}>
                    <ArrowDownwardIcon />
                </IconButton>
            </Grid>

            {/* Displayed in Header List */}
            <Grid size={{ xs: 12, md: 5 }}>
                 <Paper 
                    variant="outlined" 
                    sx={{ 
                        height: 400,
                        display: 'flex',
                        flexDirection: 'column',
                        borderColor: '#ccc' // UPDATE: Darker border
                    }}
                 >
                     <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: '#ccc' }}>
                         <Typography variant="subtitle1" fontWeight="bold">{t('storeConfiguration.header.displayedInHeader', 'Displayed in Header')}</Typography>
                         <Typography variant="body2" color="text.secondary">{`${transferList.displayed.length} ${t('common.items', 'Items')}`}</Typography>
                    </Box>
                     <List dense sx={{ flexGrow: 1, overflow: 'auto', p: 0 }}>
                        {transferList.displayed.map((item, index) => (
                             <ListItem
                                key={item.id}
                                selected={selectedItem?.id === item.id}
                                onClick={() => setSelectedItem(item)}
                                secondaryAction={
                                    <IconButton edge="end" aria-label="remove" onClick={() => handleRemove(item)}>
                                        <RemoveCircleOutlineIcon />
                                    </IconButton>
                                }
                                sx={{ 
                                    borderBottom: '1px solid', 
                                    borderColor: '#ccc', 
                                    '&:last-child': { borderBottom: 'none' },
                                    cursor: 'pointer',
                                    '&.Mui-selected': {
                                        backgroundColor: 'action.selected',
                                        '&:hover': {
                                            backgroundColor: 'action.hover'
                                        }
                                    }
                                }}
                            >
                               <ListItemIcon sx={{ minWidth: 32, color: 'text.secondary' }}>{index + 1}</ListItemIcon>
                               <ListItemText primary={item.name} />
                           </ListItem>
                        ))}
                     </List>
                 </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}