'use client';

import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import { 
  Box,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Card,
  CardContent,
  Stack,
  Skeleton,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CloseIcon from '@mui/icons-material/Close';
import { SavedAddress } from '@/app/types/store/checkout';

interface SavedAddressProps {
  addresses: SavedAddress[] | undefined;
  selectedAddressId: string | null;
  onChange: (addressId: string | null) => void;
  isLoading?: boolean;
}

export const SavedAddressSelector: FC<SavedAddressProps> = ({
  addresses,
  selectedAddressId,
  onChange,
  isLoading = false
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  
  // State to control address selection dialog
  const [showAddressSelector, setShowAddressSelector] = useState(false);
  
  // Handle address selection
  const handleAddressSelect = (addressId: string | null) => {
    onChange(addressId);
    setShowAddressSelector(false);
  };
  
  // Find the selected address object
  const selectedAddress = addresses?.find(addr => addr.id === selectedAddressId);
  
  // Handle showing the address selector dialog
  const handleShowAddressSelector = () => {
    setShowAddressSelector(true);
  };
  
  // Handle closing the dialog
  const handleCloseDialog = () => {
    setShowAddressSelector(false);
  };
  
  // Show loading skeleton
  if (isLoading) {
    return (
      <Box sx={{ mt: theme.spacing(2) }}>
        <Typography variant="h6" gutterBottom>
          {t('common:store.checkout.savedAddresses')}
        </Typography>
        <Skeleton variant="rectangular" height={150} width="100%" />
      </Box>
    );
  }
  
  // No addresses available
  if (!addresses || addresses.length === 0) {
    return null;
  }
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('common:store.checkout.savedAddresses')}
      </Typography>
      
      {/* Main address card - shows selected address or prompt to select one */}
      {selectedAddress ? (
        <Card 
          sx={{
            width: '100%',
            borderColor: theme.palette.primary.main,
            borderWidth: '1px',
            borderStyle: 'solid',
            boxShadow: theme.shadows[1],
            position: 'relative',
          }}
        >
          <CardContent sx={{ p: theme.spacing(3), '&:last-child': { pb: theme.spacing(3) } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: theme.typography.fontWeightBold }}>
                  {selectedAddress.full_name}
                  {selectedAddress.is_default && (
                    <Box 
                      component="span" 
                      sx={{ 
                        ml: 1, 
                        px: 1, 
                        py: 0.5, 
                        bgcolor: theme.palette.primary.main, 
                        color: theme.palette.primary.contrastText,
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                      }}
                    >
                      {t('common:default')}
                    </Box>
                  )}
                </Typography>
              </Box>
              
              <Button 
                variant="outlined" 
                size="small" 
                onClick={handleShowAddressSelector}
                startIcon={<EditIcon />}
                sx={{ minWidth: 'auto' }}
              >
                {t('common:change')}
              </Button>
            </Box>
            
            <Box >
              <Typography variant="body2">
              {t('common:field.address')}: {selectedAddress.address_line1}
                {selectedAddress.address_line2 && <span>, {selectedAddress.address_line2}</span>},
                {' '}{selectedAddress.city}, {selectedAddress.state}, {selectedAddress.postal_code}, {selectedAddress.country}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {t('common:field.phone')}: {selectedAddress.phone_number || '-'}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ mb: 2 }}>
          <Button 
            variant="outlined" 
            onClick={handleShowAddressSelector}
            startIcon={<LocationOnIcon />}
            fullWidth
            sx={{ py: 2 }}
          >
            {t('common:store.checkout.selectAddress')}
          </Button>
        </Box>
      )}
      
      {/* Enter new address option */}
      <Box sx={{ width: '100%', mt: 2 }}>
        <FormControlLabel
          value="new"
          control={
            <Radio 
              checked={!selectedAddressId}
              onChange={() => onChange(null)}
              size="small" 
            />
          }
          label={t('common:store.checkout.useNewAddress')}
        />
      </Box>
      
      {/* Address selection dialog */}
      <Dialog 
        open={showAddressSelector} 
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {t('common:store.checkout.selectSavedAddress')}
          <IconButton
            aria-label="close"
            onClick={handleCloseDialog}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent dividers>
          <Grid container spacing={2}>
            {addresses.map((address) => (
              <Grid item xs={12} sm={6} md={4} key={address.id}>
                <Card 
                  sx={{
                    height: '100%',
                    borderColor: selectedAddressId === address.id 
                      ? theme.palette.primary.main 
                      : theme.palette.divider,
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    boxShadow: 'none',
                    transition: theme.transitions.create(['border-color']),
                    cursor: 'pointer',
                    '&:hover': {
                      borderColor: theme.palette.primary.light,
                      bgcolor: theme.palette.action.hover
                    }
                  }}
                  onClick={() => handleAddressSelect(address.id)}
                >
                  <CardContent sx={{ p: theme.spacing(2), '&:last-child': { pb: theme.spacing(2) } }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: theme.typography.fontWeightBold }}>
                      {address.full_name}
                      {address.is_default && (
                        <Box 
                          component="span" 
                          sx={{ 
                            ml: 1, 
                            px: 1, 
                            py: 0.5, 
                            bgcolor: theme.palette.primary.main, 
                            color: theme.palette.primary.contrastText,
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 'bold',
                            textTransform: 'uppercase'
                          }}
                        >
                          {t('common:default')}
                        </Box>
                      )}
                    </Typography>
                    
                    <Box sx={{ mt: theme.spacing(1) }}>
                      <Typography variant="body2" fontSize="0.75rem">
                        {address.address_line1}
                        {address.address_line2 && <span>, {address.address_line2}</span>},
                        {' '}{address.city}, {address.state}, {address.postal_code}, {address.country}
                      </Typography>
                      <Typography variant="body2" fontSize="0.75rem" sx={{ mt: 0.5 }}>
                        {t('common:field.phone')}: {address.phone_number || '-'}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('common:actions.cancel')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
