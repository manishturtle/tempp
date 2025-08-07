'use client';

import { FC, useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Tooltip,
  Grid,
  Paper,
  IconButton,
  Card,
  CardContent
} from '@mui/material';
import { 
  DataGrid, 
  GridColDef, 
  GridActionsCellItem,
  GridRenderCellParams
} from '@mui/x-data-grid';
import { useTranslation } from 'react-i18next';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import api from '@/lib/api';
import { getAuthHeaders } from '@/app/hooks/api/auth';
import { AddressFormData } from '@/app/components/admin/customers/forms/AddressForm';
import Notification from '@/app/components/common/Notification';
import ConfirmDialog from '@/app/components/common/ConfirmDialog';

interface AddressesTabContentProps {
  accountId: string;
  addresses: any[]; // Use any type for API response data
  openAddressDrawer: (initialData?: any) => void;
}

/**
 * Addresses tab content component for the Account Detail page
 * Displays a data grid of associated addresses with actions to add/edit/delete
 */
const AddressesTabContent: FC<AddressesTabContentProps> = ({
  accountId,
  addresses = [],
  openAddressDrawer
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({ open: false, message: '', severity: 'info' });

  // Handle edit action
  const handleEdit = (addressData: AddressFormData): void => {
    openAddressDrawer(addressData);
  };

  // Set up delete mutation
  const deleteAddressMutation = useMutation({
    mutationFn: (addressId: string) => {
      setLoading(true);
      return api.delete(`addresses/${addressId}/`, {
        headers: getAuthHeaders()
      });
    },
    onSuccess: () => {
      // Invalidate the account detail query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['accountDetail', accountId] });
      
      // Show success notification
      setNotification({
        open: true,
        message: t('notifications.addressDeleted'),
        severity: 'success'
      });
      
      setLoading(false);
    },
    onError: (error: any) => {
      // Show error notification
      setNotification({
        open: true,
        message: `${t('notifications.addressDeleteFailed')}: ${error.message}`,
        severity: 'error'
      });
      
      setLoading(false);
    }
  });

  // Handle delete action
  const handleDelete = (addressId: string): void => {
    // Set the address to delete and open confirmation dialog
    setAddressToDelete(addressId);
    setConfirmDialogOpen(true);
  };
  
  // Handle confirm delete
  const handleConfirmDelete = (): void => {
    if (addressToDelete) {
      deleteAddressMutation.mutate(addressToDelete);
    }
    setConfirmDialogOpen(false);
  };
  
  // Handle cancel delete
  const handleCancelDelete = (): void => {
    setAddressToDelete(null);
    setConfirmDialogOpen(false);
  };

  // Custom NoRowsOverlay component
  const CustomNoRowsOverlay = () => (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      p: 4
    }}>
      <Typography variant="body1" color="text.secondary">
        {t('accountDetailPage.addressesTab.noAddresses')}
      </Typography>
    </Box>
  );

  // Define columns for the data grid
  const columns: GridColDef[] = [
    { 
      field: 'address_type', 
      headerName: t('addressFields.addressType'), 
      width: 120 
    },
    { 
      field: 'street_1', 
      headerName: t('addressFields.street1'), 
      flex: 1 
    },
    { 
      field: 'city', 
      headerName: t('addressFields.city'), 
      width: 150 
    },
    { 
      field: 'state_province', 
      headerName: t('addressFields.stateProvince'), 
      width: 120 
    },
    { 
      field: 'postal_code', 
      headerName: t('addressFields.postalCode'), 
      width: 100 
    },
    { 
      field: 'country', 
      headerName: t('addressFields.country'), 
      width: 100 
    },
    { 
      field: 'is_primary_billing', 
      headerName: t('addressFields.primaryBillingShort'), 
      width: 80, 
      type: 'boolean',
      renderCell: (params: GridRenderCellParams) => 
        params.value ? <CheckCircleOutlineIcon color="success" /> : null,
      renderHeader: () => (
        <Tooltip title={t('addressFields.primaryBilling')}>
          <span>{t('addressFields.primaryBillingShort')}</span>
        </Tooltip>
      )
    },
    { 
      field: 'is_primary_shipping', 
      headerName: t('addressFields.primaryShippingShort'), 
      width: 80, 
      type: 'boolean',
      renderCell: (params: GridRenderCellParams) => 
        params.value ? <CheckCircleOutlineIcon color="success" /> : null,
      renderHeader: () => (
        <Tooltip title={t('addressFields.primaryShipping')}>
          <span>{t('addressFields.primaryShippingShort')}</span>
        </Tooltip>
      )
    },
    { 
      field: 'actions', 
      headerName: t('common.actions'), 
      type: 'actions', 
      width: 80, 
      getActions: (params) => [
        <GridActionsCellItem 
          icon={<DeleteIcon />} 
          label={t('common.actions.delete')} 
          onClick={() => handleDelete(params.id as string)}
          showInMenu={false}
          aria-label={t('common.actions.delete')}
        />
      ]
    }
  ];

  // Handle notification close
  const handleNotificationClose = () => {
    setNotification({ ...notification, open: false });
  };

  // Find primary billing and shipping addresses
  const primaryBillingAddress = addresses?.find(addr => addr.is_primary_billing);
  const primaryShippingAddress = addresses?.find(addr => addr.is_primary_shipping);

  // Format address for display
  const formatAddress = (address: any) => {
    const lines = [];
    if (address.street_1) lines.push(address.street_1);
    if (address.street_2) lines.push(address.street_2);
    if (address.city && address.state_province) {
      lines.push(`${address.city}, ${address.state_province} ${address.postal_code}`);
    } else if (address.city) {
      lines.push(`${address.city} ${address.postal_code}`);
    }
    if (address.country) lines.push(address.country);
    return lines;
  };

  return (
    <Box sx={{ mt: 2 }}>
      {/* Header Section */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 2 
      }}>
        <Typography variant="h6">
          {t('accountDetailPage.addressesTab.title')}
        </Typography>
        <Button 
          variant="outlined" 
          size="small" 
          startIcon={<AddIcon />}
          onClick={() => openAddressDrawer()}
        >
          {t('accountDetailPage.addressesTab.newAddressButton')}
        </Button>
      </Box>

   

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {/* Primary Billing Address */}
        <Grid item xs={12} md={6}>
          <Card 
            variant="outlined" 
            sx={{ height: '100%', position: 'relative' }}
          >
            <CardContent sx={{ p: 2 }}>
              <Box 
                sx={{ 
                  display: 'inline-block', 
                  bgcolor: 'primary.main', 
                  color: 'primary.contrastText',
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1,
                  mb: 1,
                  fontSize: '0.75rem',
                  fontWeight: 'medium'
                }}
              >
                {t('addressFields.primaryBillingShort', 'Billing')}
              </Box>
              
              <IconButton 
                size="small" 
                sx={{ position: 'absolute', top: 8, right: 8 }}
                onClick={() => primaryBillingAddress && handleEdit(primaryBillingAddress)}
                aria-label={t('common.actions.edit')}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
              
              {primaryBillingAddress ? (
                <Box sx={{ mt: 1 }}>
                  <Grid container spacing={1}>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">
                        {t('addressFields.street1')}:
                      </Typography>
                    </Grid>
                    <Grid item xs={8}>
                      <Typography variant="body2">
                        {primaryBillingAddress.street_1 || '-'}
                      </Typography>
                    </Grid>
                    
                    {primaryBillingAddress.street_2 && (
                      <>
                        <Grid item xs={4}>
                          <Typography variant="body2" color="text.secondary">
                            {t('addressFields.street2')}:
                          </Typography>
                        </Grid>
                        <Grid item xs={8}>
                          <Typography variant="body2">
                            {primaryBillingAddress.street_2}
                          </Typography>
                        </Grid>
                      </>
                    )}
                    
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">
                        {t('addressFields.city')}:
                      </Typography>
                    </Grid>
                    <Grid item xs={8}>
                      <Typography variant="body2">
                        {primaryBillingAddress.city || '-'}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">
                        {t('addressFields.stateProvince')}:
                      </Typography>
                    </Grid>
                    <Grid item xs={8}>
                      <Typography variant="body2">
                        {primaryBillingAddress.state_province || '-'}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">
                        {t('addressFields.postalCode')}:
                      </Typography>
                    </Grid>
                    <Grid item xs={8}>
                      <Typography variant="body2">
                        {primaryBillingAddress.postal_code || '-'}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">
                        {t('addressFields.country')}:
                      </Typography>
                    </Grid>
                    <Grid item xs={8}>
                      <Typography variant="body2">
                        {primaryBillingAddress.country || '-'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px' }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('noAddressSet', 'No primary billing address set')}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Primary Shipping Address */}
        <Grid item xs={12} md={6}>
          <Card 
            variant="outlined" 
            sx={{ height: '100%', position: 'relative' }}
          >
            <CardContent sx={{ p: 2 }}>
              <Box 
                sx={{ 
                  display: 'inline-block', 
                  bgcolor: 'secondary.main', 
                  color: 'secondary.contrastText',
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1,
                  mb: 1,
                  fontSize: '0.75rem',
                  fontWeight: 'medium'
                }}
              >
                {t('addressFields.primaryShippingShort', 'Shipping')}
              </Box>
              
              <IconButton 
                size="small" 
                sx={{ position: 'absolute', top: 8, right: 8 }}
                onClick={() => primaryShippingAddress && handleEdit(primaryShippingAddress)}
                aria-label={t('common.actions.edit')}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
              
              {primaryShippingAddress ? (
                <Box sx={{ mt: 1 }}>
                  <Grid container spacing={1}>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">
                        {t('addressFields.street1')}:
                      </Typography>
                    </Grid>
                    <Grid item xs={8}>
                      <Typography variant="body2">
                        {primaryShippingAddress.street_1 || '-'}
                      </Typography>
                    </Grid>
                    
                    {primaryShippingAddress.street_2 && (
                      <>
                        <Grid item xs={4}>
                          <Typography variant="body2" color="text.secondary">
                            {t('addressFields.street2')}:
                          </Typography>
                        </Grid>
                        <Grid item xs={8}>
                          <Typography variant="body2">
                            {primaryShippingAddress.street_2}
                          </Typography>
                        </Grid>
                      </>
                    )}
                    
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">
                        {t('addressFields.city')}:
                      </Typography>
                    </Grid>
                    <Grid item xs={8}>
                      <Typography variant="body2">
                        {primaryShippingAddress.city || '-'}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">
                        {t('addressFields.stateProvince')}:
                      </Typography>
                    </Grid>
                    <Grid item xs={8}>
                      <Typography variant="body2">
                        {primaryShippingAddress.state_province || '-'}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">
                        {t('addressFields.postalCode')}:
                      </Typography>
                    </Grid>
                    <Grid item xs={8}>
                      <Typography variant="body2">
                        {primaryShippingAddress.postal_code || '-'}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">
                        {t('addressFields.country')}:
                      </Typography>
                    </Grid>
                    <Grid item xs={8}>
                      <Typography variant="body2">
                        {primaryShippingAddress.country || '-'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px' }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('noAddressSet', 'No primary shipping address set')}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* All Addresses Section */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        {t('accountDetailPage.addressesTab.allAddresses')}
      </Typography>

      {/* Data Grid */}
      <DataGrid
        rows={addresses || []}
        columns={columns}
        autoHeight
        hideFooter
        disableRowSelectionOnClick
        loading={loading}
        onRowClick={(params) => handleEdit(params.row as AddressFormData)}
        slots={{
          noRowsOverlay: CustomNoRowsOverlay
        }}
        sx={{
          border: 1,
          borderColor: 'divider',
          '& .MuiDataGrid-cell': {
            borderBottom: 1,
            borderColor: 'divider',
          },
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: 'background.paper',
            borderBottom: 2,
            borderColor: 'divider',
          },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: 'action.hover',
            cursor: 'pointer'
          }
        }}
      />

      {/* Notification */}
      <Notification
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={handleNotificationClose}
      />
      
      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialogOpen}
        title="Delete Address"
        content="Are you sure you want to delete this address? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isLoading={deleteAddressMutation.isPending}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </Box>
  );
};

export default AddressesTabContent;
