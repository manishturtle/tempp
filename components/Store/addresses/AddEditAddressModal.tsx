'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useTheme,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { Address } from '@/app/types/store/addressTypes';
import { AddressForm } from './AddressForm';
import { AddressFormData } from './addressValidations';
import { useAddAddress, useUpdateAddress } from '@/app/hooks/api/store/useAddresses';

/**
 * Props for the AddEditAddressModal component
 */
interface AddEditAddressModalProps {
  /** Controls whether the modal is open */
  open: boolean;
  /** Callback function to close the modal */
  onClose: () => void;
  /** Address data for editing (optional) */
  addressToEdit?: Address;
  /** Callback function called after successful save */
  onAddressSaved: () => void;
}

/**
 * Modal component for adding or editing an address
 */
export function AddEditAddressModal({
  open,
  onClose,
  addressToEdit,
  onAddressSaved
}: AddEditAddressModalProps): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  
  // Initialize mutation hooks
  const addAddressMutation = useAddAddress();
  const updateAddressMutation = useUpdateAddress();
  
  // Determine if the form is in a loading state
  const isLoading = addAddressMutation.isPending || updateAddressMutation.isPending;
  
  /**
   * Map Address to AddressFormData for editing
   */
  const mapAddressToFormData = (address: Address): AddressFormData => {
    return {
      fullName: address.fullName,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || '',
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      phoneNumber: address.phoneNumber
    };
  };
  
  /**
   * Handle form submission
   */
  const handleSubmit = async (formData: AddressFormData): Promise<void> => {
    try {
      if (addressToEdit) {
        // Update existing address
        await updateAddressMutation.mutateAsync({
          ...addressToEdit,
          ...formData
        });
        console.log('Address updated successfully');
      } else {
        // Add new address
        await addAddressMutation.mutateAsync(formData);
        console.log('Address added successfully');
      }
      
      // Call callbacks on success
      onAddressSaved();
      onClose();
      
      // Success notification would go here
      // Example: toast.success(t('addressBook.notifications.addressSaved'));
    } catch (error) {
      console.error('Error saving address:', error);
      // Error notification would go here
      // Example: toast.error(t('addressBook.notifications.errorSavingAddress'));
    }
  };
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="address-dialog-title"
      TransitionProps={{
        timeout: 300
      }}
      PaperProps={{
        sx: {
          borderRadius: theme.shape.borderRadius,
          boxShadow: theme.shadows[10],
          overflow: 'hidden',
          maxHeight: { xs: '100%', sm: '90vh' }
        }
      }}
      sx={{
        '& .MuiDialog-paper': {
          m: { xs: 1, sm: 2 }
        }
      }}
    >
      <DialogTitle 
        id="address-dialog-title" 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          px: { xs: 2, sm: 3 },
          py: 2,
          borderBottom: `1px solid ${theme.palette.divider}`
        }}
      >
        {addressToEdit 
          ? t('addressBook.editAddress', 'Edit Address') 
          : t('addressBook.addAddress', 'Add Address')}
        <IconButton
          aria-label={t('common.close', 'Close')}
          onClick={onClose}
          size="small"
          sx={{ 
            marginRight: -1,
            transition: 'all 0.2s',
            '&:hover': { color: theme.palette.primary.main }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent 
        sx={{ 
          px: { xs: 2, sm: 3 }, 
          py: { xs: 2, sm: 3 },
          overflowY: 'auto' 
        }}
      >
        <AddressForm
          onSubmit={handleSubmit}
          initialData={addressToEdit ? mapAddressToFormData(addressToEdit) : undefined}
          isLoading={isLoading}
          submitButtonText={
            addressToEdit
              ? t('addressBook.saveChanges', 'Save Changes')
              : t('addressBook.addAddress', 'Add Address')
          }
        />
      </DialogContent>
    </Dialog>
  );
}
