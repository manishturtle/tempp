'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Container, 
  Box, 
  Typography, 
  Button, 
  Grid, 
  CircularProgress, 
  Alert,
  Paper,
  useTheme,
  Snackbar
} from '@mui/material';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import AddressCard from '@/app/components/Store/addresses/AddressCard';
import { AddEditAddressModal } from '@/app/components/Store/addresses/AddEditAddressModal';
import ConfirmDialog from '@/app/components/common/ConfirmDialog';
import { AddressService, useDeleteAddress, useSetDefaultShipping, useSetDefaultBilling } from '@/app/hooks/api/store/useAddresses';
import { Address, ApiAddress } from '@/app/types/store/addressTypes';

// Using the Address interface imported from addressTypes.ts

/**
 * AddressBookPage component
 * Displays the user's saved shipping and billing addresses
 * 
 * @returns {React.ReactElement} The AddressBookPage component
 */
// Custom Alert component for notifications
const AlertNotification = React.forwardRef<HTMLDivElement, AlertProps>((props, ref) => {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

export default function AddressBookPage(): React.ReactElement {
  const { t } = useTranslation('common');
  const theme = useTheme();
  
  // State for modal control
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingAddress, setEditingAddress] = useState<ApiAddress | null>(null);
  
  // State for delete confirmation
  const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [addressToDeleteId, setAddressToDeleteId] = useState<string | null>(null);
  
  // State for tracking loading addresses in set default operations
  const [loadingDefaultAddressId, setLoadingDefaultAddressId] = useState<string | null>(null);
  
  // State for notifications
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({ open: false, message: '', severity: 'info' });
  
  // State for addresses
  const [addresses, setAddresses] = useState<ApiAddress[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Helper function to convert ApiAddress to Address for compatibility
  const convertToAddress = (apiAddress: ApiAddress): Address => {
    return {
      id: apiAddress.id,
      full_name: apiAddress.fullName,
      address_line1: apiAddress.addressLine1,
      address_line2: apiAddress.addressLine2 || '',
      city: apiAddress.city,
      state: apiAddress.state,
      postal_code: apiAddress.postalCode,
      country: apiAddress.country,
      phone_number: apiAddress.phoneNumber,
      is_default: apiAddress.isDefaultShipping || apiAddress.isDefaultBilling,
      address_type: apiAddress.address_type,
      // Include camelCase properties
      fullName: apiAddress.fullName,
      addressLine1: apiAddress.addressLine1,
      addressLine2: apiAddress.addressLine2,
      postalCode: apiAddress.postalCode,
      phoneNumber: apiAddress.phoneNumber,
      isDefaultShipping: apiAddress.isDefaultShipping,
      isDefaultBilling: apiAddress.isDefaultBilling
    };
  };
  
  // Fetch addresses using the service
  const fetchAddresses = async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      const data = await AddressService.getAddress();
      setAddresses(data);
    } catch (err) {
      console.error('Error fetching addresses:', err);
      setIsError(true);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Refetch function for external use
  const refetch = () => {
    fetchAddresses();
  };
  
  // Initial fetch
  useEffect(() => {
    fetchAddresses();
  }, []);
  
  // Initialize mutation hooks
  const deleteAddressMutation = useDeleteAddress();
  const setDefaultShippingMutation = useSetDefaultShipping();
  const setDefaultBillingMutation = useSetDefaultBilling();
  
  // Notification handlers
  const showNotification = (message: string, severity: 'success' | 'error' | 'info' | 'warning'): void => {
    setNotification({
      open: true,
      message,
      severity
    });
  };
  
  const handleCloseNotification = (): void => {
    setNotification(prev => ({ ...prev, open: false }));
  };
  
  // Handlers
  const handleAddAddress = (): void => {
    setEditingAddress(null); // No address to edit (creating new)
    setIsModalOpen(true);
  };
  
  const handleEditAddress = (address: ApiAddress): void => {
    setEditingAddress(address);
    setIsModalOpen(true);
  };
  
  const handleDeleteAddress = (addressId: string): void => {
    setAddressToDeleteId(addressId);
    setDeleteConfirmOpen(true);
  };
  
  const handleConfirmDelete = async (): Promise<void> => {
    if (!addressToDeleteId) return;
    
    try {
      await deleteAddressMutation.mutateAsync(addressToDeleteId);
      showNotification(t('addressBook.notifications.addressDeleted', 'Address deleted successfully'), 'success');
      setDeleteConfirmOpen(false);
    } catch (error) {
      console.error('Error deleting address:', error);
      showNotification(t('addressBook.notifications.errorDeletingAddress', 'Error deleting address'), 'error');
    } finally {
      setAddressToDeleteId(null);
    }
  };
  
  const handleSetDefaultShipping = async (addressId: string): Promise<void> => {
    try {
      setLoadingDefaultAddressId(addressId);
      await setDefaultShippingMutation.mutateAsync(addressId);
      showNotification(t('addressBook.notifications.defaultShippingSet', 'Address set as default shipping'), 'success');
    } catch (error) {
      console.error('Error setting default shipping address:', error);
      showNotification(t('addressBook.notifications.errorSettingDefault', 'Error setting address as default'), 'error');
    } finally {
      setLoadingDefaultAddressId(null);
    }
  };
  
  const handleSetDefaultBilling = async (addressId: string): Promise<void> => {
    try {
      setLoadingDefaultAddressId(addressId);
      await setDefaultBillingMutation.mutateAsync(addressId);
      showNotification(t('addressBook.notifications.defaultBillingSet', 'Address set as default billing'), 'success');
    } catch (error) {
      console.error('Error setting default billing address:', error);
      showNotification(t('addressBook.notifications.errorSettingDefault', 'Error setting address as default'), 'error');
    } finally {
      setLoadingDefaultAddressId(null);
    }
  };
  
  return (
    <Container maxWidth="xl" sx={{p: theme.spacing(2)}}>
      {/* Page Header */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: theme.spacing(3)
        }}
      >
        <Typography 
          variant="h4" 
          component="h1"
          sx={{ fontWeight: 600 }}
        >
          {t('addressBook.title', 'Address Book')}
        </Typography>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddAddress}
          sx={{ fontWeight: 500 }}
        >
          {t('addressBook.addNewAddress', 'Address')}
        </Button>
      </Box>
      
      {/* Main Content Area */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: theme.spacing(4) }}>
          <CircularProgress />
        </Box>
      ) : isError ? (
        <Alert severity="error" sx={{ mt: theme.spacing(2) }}>
          {t('common.error.fetchFailed', 'Failed to fetch {{resource}}', { resource: t('addressBook.addresses', 'addresses') })}
          {error instanceof Error && <Box sx={{ mt: 1 }}>{error.message}</Box>}
        </Alert>
      ) : addresses && addresses.length > 0 ? (
        <Box sx={{ mt: theme.spacing(2) }}>
          {/* Shipping Addresses Section */}
          <Paper sx={{ p: 2, mb: theme.spacing(3) }}>
            <Typography variant="h6" gutterBottom>
              {t('addressBook.shippingAddresses', 'Shipping Addresses')}
            </Typography>
            <Grid container spacing={{ xs: 2, sm: 3 }}>
              {addresses
                .filter(address => address.address_type === 'SHIPPING')
                .map((apiAddress) => {
                  const address = convertToAddress(apiAddress);
                  return (
                    <Grid item xs={12} md={3} key={apiAddress.id}>
                      <AddressCard
                        address={address}
                        onEdit={() => handleEditAddress(apiAddress)}
                        onDelete={handleDeleteAddress}
                        onSetDefaultShipping={!apiAddress.isDefaultShipping ? handleSetDefaultShipping : undefined}
                        onSetDefaultBilling={undefined}
                        isLoading={loadingDefaultAddressId === apiAddress.id}
                      />
                    </Grid>
                  );
                })}
              {addresses.filter(address => address.address_type === 'SHIPPING').length === 0 && (
                <Grid item xs={12}>
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('addressBook.noShippingAddresses', 'No shipping addresses found')}
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Paper>
          
          {/* Billing Addresses Section */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {t('addressBook.billingAddresses', 'Billing Addresses')}
            </Typography>
            <Grid container spacing={{ xs: 2, sm: 3 }}>
              {addresses
                .filter(address => address.address_type === 'BILLING')
                .map((apiAddress) => {
                  // Convert ApiAddress to Address for compatibility with AddressCard
                  const address: Address = {
                    id: apiAddress.id,
                    full_name: apiAddress.fullName,
                    address_line1: apiAddress.addressLine1,
                    address_line2: apiAddress.addressLine2 || '',
                    city: apiAddress.city,
                    state: apiAddress.state,
                    postal_code: apiAddress.postalCode,
                    country: apiAddress.country,
                    phone_number: apiAddress.phoneNumber,
                    is_default: apiAddress.isDefaultBilling,
                    address_type: apiAddress.address_type,
                    // Include camelCase properties
                    fullName: apiAddress.fullName,
                    addressLine1: apiAddress.addressLine1,
                    addressLine2: apiAddress.addressLine2,
                    postalCode: apiAddress.postalCode,
                    phoneNumber: apiAddress.phoneNumber,
                    isDefaultShipping: false,
                    isDefaultBilling: apiAddress.isDefaultBilling
                  };
                  return (
                    <Grid item xs={12} md={3} key={apiAddress.id}>
                      <AddressCard
                        address={address}
                        onEdit={() => handleEditAddress(apiAddress)}
                        onDelete={handleDeleteAddress}
                        onSetDefaultShipping={undefined}
                        onSetDefaultBilling={!apiAddress.isDefaultBilling ? handleSetDefaultBilling : undefined}
                        isLoading={loadingDefaultAddressId === apiAddress.id}
                      />
                    </Grid>
                  );
                })}
              {addresses.filter(address => address.address_type === 'BILLING').length === 0 && (
                <Grid item xs={12}>
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('addressBook.noBillingAddresses', 'No billing addresses found')}
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Box>
      ) : (
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            justifyContent: 'center',
            py: theme.spacing(8),
            textAlign: 'center', 
          }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {t('addressBook.noAddressesFound', 'No addresses found')}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {t('addressBook.addFirstAddress', 'Add your first address to get started')}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddAddress}
            sx={{ mt: theme.spacing(2) }}
          >
            {t('addressBook.addNewAddress', 'Add New Address')}
          </Button>
        </Box>
      )}
      
      {/* Address Edit/Add Modal */}
      <AddEditAddressModal 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        addressToEdit={editingAddress ? convertToAddress(editingAddress) : undefined} 
        onAddressSaved={() => {
          showNotification(t('addressBook.notifications.addressSaved', 'Address saved successfully'), 'success');
          // Query invalidation should handle refetching, but we could add an explicit refetch if needed
          refetch(); // Use explicit refetch to ensure we get the latest data
        }} 
      />
      
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteConfirmOpen}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('addressBook.deleteConfirm.title', 'Delete Address')}
        content={t('addressBook.deleteConfirm.message', 'Are you sure you want to delete this address? This action cannot be undone.')}
        confirmText={t('common.delete', 'Delete')}
        isLoading={deleteAddressMutation.isPending}
      />
      
      {/* Notification Snackbar */}
      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000} 
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <AlertNotification 
          onClose={handleCloseNotification} 
          severity={notification.severity}
        >
          {notification.message}
        </AlertNotification>
      </Snackbar>
    </Container>
  );
}
