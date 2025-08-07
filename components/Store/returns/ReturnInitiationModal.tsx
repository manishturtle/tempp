'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import useNotification from '@/app/hooks/useNotification';
import { useSubmitReturnRequest } from '@/app/hooks/api/store/useSubmitReturnRequest';
import { ReturnRequestPayload } from '@/app/hooks/api/store/rmaService';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  Divider,
  IconButton,
  CircularProgress,
  Paper,
  Grid,
  Checkbox,
  Avatar,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

import { returnRequestFormSchema, ReturnRequestFormData } from './returnRequestValidations';

/**
 * ReturnableOrderItem interface represents an order item eligible for return
 */
interface ReturnableOrderItem {
  id: string;
  productId: string;
  name: string;
  sku: string;
  variantInfo?: string;
  imageUrl?: string;
  orderedQuantity: number;
  eligibleQuantity: number;
  unitPrice: number;
  unitPriceFormatted: string;
}

/**
 * ReturnReason interface for the available return reasons
 */
interface ReturnReason {
  id: string;
  name: string;
  description?: string;
}

/**
 * PreferredResolution interface for the available resolution options
 */
interface PreferredResolution {
  id: string;
  name: string;
  description?: string;
}

/**
 * Map form data to the format expected by the API
 * 
 * @param formData - Form data from React Hook Form
 * @returns Data in the format expected by the API
 */
const mapFormDataToApiFormat = (formData: ReturnRequestFormData): {
  itemsToReturn: Array<{
    itemId: string;
    quantity: number;
    reasonId: string;
  }>;
  comments?: string;
  preferredResolutionId?: string;
} => {
  return {
    itemsToReturn: formData.items
      .filter(item => item.selected && item.quantityToReturn > 0)
      .map(item => ({
        itemId: item.itemId,
        quantity: item.quantityToReturn,
        reasonId: item.reason || '',
      })),
    comments: formData.additionalComments,
    preferredResolutionId: formData.preferredResolutionId,
  };
}

/**
 * Props for the ReturnInitiationModal component
 */
interface ReturnInitiationModalProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  orderDisplayId: string;
  items: ReturnableOrderItem[];
  returnReasons: ReturnReason[];
  preferredResolutions?: PreferredResolution[];
}

/**
 * ReturnInitiationModal component for initiating a return request
 * 
 * @param props Component props
 * @returns React component
 */
export const ReturnInitiationModal: React.FC<ReturnInitiationModalProps> = (props) => {
  const { t } = useTranslation('common');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const notification = useNotification();
  const submitReturnMutation = useSubmitReturnRequest();
  
  // Initialize form with react-hook-form
  const { control, handleSubmit, trigger, setValue, watch, reset, formState } = useForm<ReturnRequestFormData>({
    resolver: zodResolver(returnRequestFormSchema),
    defaultValues: {
      items: props.items.map((item) => ({
        itemId: item.id,
        productId: item.productId,
        name: item.name,
        orderedQuantity: item.orderedQuantity,
        eligibleQuantity: item.eligibleQuantity,
        unitPriceFormatted: item.unitPriceFormatted,
        quantityToReturn: 0,
        imageUrl: item.imageUrl,
        variantInfo: item.variantInfo,
        selected: false,
        reason: '',
        sku: item.sku
      })),
      additionalComments: '',
      preferredResolutionId: props.preferredResolutions && props.preferredResolutions.length > 0 
        ? props.preferredResolutions[0].id 
        : undefined
    }
  });
  
  const { fields } = useFieldArray({ control, name: 'items' });
  
  /**
   * Handle the form submission
   */
  // State for general form error message
  const [generalError, setGeneralError] = useState<string | null>(null);

  const onSubmitForm = async (data: ReturnRequestFormData) => {
    try {
      // Clear any previous general errors
      setGeneralError(null);
      setIsSubmitting(true);
      
      // Filter out only selected items with quantity > 0
      const itemsToSubmit = data.items
        .filter(item => item.selected && item.quantityToReturn > 0)
        .map(item => ({
          order_item_id: parseInt(item.itemId, 10), // Convert to number and use correct field name
          quantity: item.quantityToReturn,
          reason: item.reason!, // Assert reason is present due to schema refine
        }));

      if (itemsToSubmit.length === 0) {
        // This should be caught by the schema, but as a fallback
        notification.showNotification({
          message: t('returns.initiation.validation.noItemsSelectedError'),
          type: 'error'
        });
        return;
      }

      // Create payload matching backend expectations
      const payload: ReturnRequestPayload = {
        order_id: parseInt(props.orderId, 10), // Convert to number and use correct field name
        items: itemsToSubmit, // Use correct field name
        comments: data.additionalComments || undefined,
        preferred_resolution_id: data.preferredResolutionId || undefined // Use correct field name
      };

      // Submit the return request
      await submitReturnMutation.mutateAsync(payload);
      props.onClose();
    } catch (error) {
      console.error('Error submitting return request:', error);
      // Set general error message
      setGeneralError(t('orders.returns.initiation.notifications.error'));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      maxWidth="md"
      fullWidth={true}
      fullScreen={isMobile}
      aria-labelledby="return-initiation-dialog-title"
      PaperProps={{
        sx: {
          maxHeight: '90vh',
          borderRadius: { xs: 0, sm: theme.shape.borderRadius + 'px' }
        }
      }}
    >
      <DialogTitle 
        id="return-initiation-dialog-title" 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          px: { xs: 2, sm: 3 },
          py: 2,
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {t('detail.initiation.modalTitle', { orderId: props.orderDisplayId })}
        </Typography>
        <IconButton 
          aria-label={t('common.close')} 
          onClick={props.onClose}
          edge="end"
          sx={{ color: 'text.secondary' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent 
        dividers 
        sx={{ 
          p: { xs: 2, sm: 3 },
          overflow: 'auto',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: '4px',
          }
        }}
      >
        {/* General Error Alert */}
        {generalError && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            onClose={() => setGeneralError(null)}
          >
            {generalError}
          </Alert>
        )}
        
        {/* Instructions */}
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          {t('detail.initiation.instructions')}
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        {/* Item Selection Area */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
            {t('detail.initiation.selectItems')}
          </Typography>
          
          {fields.map((field, index) => (
            <Paper 
              key={field.id} 
              elevation={0}
              sx={{ 
                p: { xs: 1, sm: 1.5 }, 
                mb: 1.5, 
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }
              }}
            >
              <Grid container spacing={{ xs: 1, sm: 2 }} alignItems="flex-start">
                {/* Column 1: Checkbox & Image */}
                <Grid item xs={12} sm={1}>
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'row', sm: 'column' }, 
                    alignItems: 'center',
                    justifyContent: { xs: 'flex-start', sm: 'center' }
                  }}>
                    <Controller
                      name={`items.${index}.selected`}
                      control={control}
                      render={({ field: checkboxField }) => (
                        <Checkbox
                          checked={checkboxField.value}
                          onChange={(e) => {
                            checkboxField.onChange(e.target.checked);
                            
                            // When selected, set quantity to 1 (if current is 0)
                            // When deselected, set quantity to 0
                            const currentQty = watch(`items.${index}.quantityToReturn`);
                            const newQty = e.target.checked ? (currentQty || 1) : 0;
                            
                            setValue(`items.${index}.quantityToReturn`, newQty);
                            
                            // Clear reason when deselected
                            if (!e.target.checked) {
                              setValue(`items.${index}.reason`, '');
                            }
                            
                            // Trigger validation
                            trigger([`items.${index}.quantityToReturn`, `items.${index}.reason`]);
                          }}
                          sx={{ 
                            color: 'primary.main',
                            '&.Mui-checked': {
                              color: 'primary.main',
                            }
                          }}
                        />
                      )}
                    />
                    <Avatar 
                      src={field.imageUrl} 
                      variant="rounded" 
                      alt={field.name}
                      sx={{ 
                        width: { xs: 50, sm: 60 }, 
                        height: { xs: 50, sm: 60 },
                        ml: { xs: 1, sm: 0 },
                        mt: { xs: 0, sm: 1 },
                        border: '1px solid',
                        borderColor: 'divider'
                      }}
                    />
                  </Box>
                </Grid>
                
                {/* Column 2: Product Details */}
                <Grid item xs={12} sm={5}>
                  <Typography variant="subtitle2" fontWeight="medium" sx={{ mb: 0.5 }}>
                    {field.name}
                  </Typography>
                  {field.variantInfo && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                      {field.variantInfo}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                    {t('common.sku')}: {field.sku}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {t('detail.initiation.orderedQty')}: {field.orderedQuantity}
                  </Typography>
                </Grid>
                
                {/* Column 3: Return Quantity */}
                <Grid item xs={6} sm={3}>
                  <Controller
                    name={`items.${index}.quantityToReturn`}
                    control={control}
                    render={({ field: qtyField }) => (
                      <TextField
                        {...qtyField}
                        label={t('detail.initiation.returnQtyLabel')}
                        size="small"
                        type="number"
                        fullWidth
                        value={qtyField.value || ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                          qtyField.onChange(value);
                          
                          // If quantity is set to 0, deselect the item
                          if (value === 0) {
                            setValue(`items.${index}.selected`, false);
                            setValue(`items.${index}.reason`, '');
                          } else if (value > 0) {
                            // If quantity is > 0, make sure item is selected
                            setValue(`items.${index}.selected`, true);
                          }
                          
                          trigger([`items.${index}.selected`, `items.${index}.reason`]);
                        }}
                        InputProps={{
                          inputProps: { 
                            min: 0, 
                            max: field.eligibleQuantity,
                            'aria-label': t('detail.initiation.returnQtyLabel')
                          }
                        }}
                        disabled={!watch(`items.${index}.selected`)}
                        error={!!formState.errors.items?.[index]?.quantityToReturn}
                        helperText={formState.errors.items?.[index]?.quantityToReturn?.message ? 
                          t(formState.errors.items?.[index]?.quantityToReturn?.message as string) : ''}
                        sx={{
                          '& .MuiFormHelperText-root': {
                            color: 'error.main',
                            marginLeft: 0
                          }
                        }}
                      />
                    )}
                  />
                </Grid>
                
                {/* Column 4: Price */}
                <Grid item xs={6} sm={3} sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" fontWeight="medium" sx={{ color: 'primary.main' }}>
                    {field.unitPriceFormatted}
                  </Typography>
                </Grid>
                
                {/* Reason Dropdown - Full Width */}
                <Grid item xs={12} mt={1}>
                  <Controller
                    name={`items.${index}.reason`}
                    control={control}
                    render={({ field: reasonField }) => (
                      <FormControl 
                        fullWidth 
                        error={!!formState.errors.items?.[index]?.reason}
                        size="small"
                      >
                        <InputLabel id={`reason-label-${index}`}>
                          {t('detail.initiation.reasonLabel')}
                        </InputLabel>
                        <Select
                          {...reasonField}
                          labelId={`reason-label-${index}`}
                          label={t('detail.initiation.reasonLabel')}
                          disabled={!watch(`items.${index}.selected`) || watch(`items.${index}.quantityToReturn`) === 0}
                          inputProps={{
                            'aria-label': t('detail.initiation.reasonLabel')
                          }}
                        >
                          {props.returnReasons.map((reason) => (
                            <MenuItem key={reason.id} value={reason.id}>
                              {reason.name}
                            </MenuItem>
                          ))}
                        </Select>
                        {formState.errors.items?.[index]?.reason && (
                          <FormHelperText sx={{ marginLeft: 0 }}>
                            {formState.errors.items?.[index]?.reason?.message ? 
                              t(formState.errors.items?.[index]?.reason?.message as string) : ''}
                          </FormHelperText>
                        )}
                      </FormControl>
                    )}
                  />
                </Grid>
              </Grid>
            </Paper>
          ))}
          
          {fields.length === 0 && (
            <Box sx={{ 
              my: 2, 
              p: 3, 
              textAlign: 'center', 
              border: '1px dashed', 
              borderColor: 'divider',
              borderRadius: 1
            }}>
              <Typography variant="body2" color="text.secondary">
                {t('orders.detail.initiation.noEligibleItems')}
              </Typography>
            </Box>
          )}
          
          {formState.errors.root?.message && (
            <Alert 
              severity="error" 
              sx={{ mt: 2 }}
              variant="outlined"
            >
              {t(formState.errors.root.message as string)}
            </Alert>
          )}
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        {/* Additional Comments Section */}
        <Box sx={{ marginTop: theme.spacing(3) }}>
          <Typography variant="subtitle1" gutterBottom>
            {t('orders.returns.initiation.additionalCommentsTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t('orders.returns.initiation.additionalCommentsInstructions')}
          </Typography>
          <Controller
            name="additionalComments"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('detail.initiation.commentsLabelOptional', 'Comments (Optional)')}
                multiline
                rows={3}
                fullWidth
                variant="outlined"
                error={!!formState.errors.additionalComments}
                helperText={formState.errors.additionalComments?.message ? t(formState.errors.additionalComments.message) : ''}
              />
            )}
          />
        </Box>
        
        {/* Preferred Resolution Section - Only if preferredResolutions exists */}
        {props.preferredResolutions && props.preferredResolutions.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ marginTop: theme.spacing(3) }}>
              <Typography variant="subtitle1" gutterBottom>
                {t('orders.returns.initiation.preferredResolutionTitle')}
              </Typography>
              <Controller
                name="preferredResolutionId"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!formState.errors.preferredResolutionId}>
                    <InputLabel id="preferred-resolution-label">
                      {t('orders.returns.initiation.preferredResolutionLabel', 'Preferred Resolution')}
                    </InputLabel>
                    <Select
                      {...field}
                      labelId="preferred-resolution-label"
                      label={t('orders.returns.initiation.preferredResolutionLabel', 'Preferred Resolution')}
                    >
                      {props.preferredResolutions?.map((resolution) => (
                        <MenuItem key={resolution.id} value={resolution.id}>
                          {resolution.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {formState.errors.preferredResolutionId && (
                      <FormHelperText>
                        {formState.errors.preferredResolutionId.message ? t(formState.errors.preferredResolutionId.message) : ''}
                      </FormHelperText>
                    )}
                  </FormControl>
                )}
              />
            </Box>
          </>
        )}
        
        {/* Return Summary Section */}
        {(() => {
          const watchedItems = watch('items');
          const selectedItems = watchedItems.filter(item => item.selected && item.quantityToReturn > 0);
          
          if (selectedItems.length === 0) return null;
          
          return (
            <Box 
              sx={{ 
                marginTop: theme.spacing(3), 
                padding: theme.spacing(2), 
                border: '1px solid ' + theme.palette.divider, 
                borderRadius: theme.shape.borderRadius,
                backgroundColor: 'background.paper',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              <Typography variant="subtitle1" gutterBottom>
                {t('orders.returns.initiation.summary.title')}
              </Typography>
              
              {selectedItems.map((item, index) => {
                const reason = props.returnReasons.find(r => r.id === item.reason);
                return (
                  <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                    {t('orders.returns.initiation.summary.itemLine', { 
                      itemName: item.name, 
                      quantity: item.quantityToReturn, 
                      reason: reason ? reason.name : '' 
                    })}
                  </Typography>
                );
              })}
              
              {/* Optional: Estimated refund calculation if available */}
              {/* Uncomment and implement if refund calculation is available
              <Typography variant="body1" fontWeight="medium" mt={1}>
                {t('returns.initiation.summary.estimatedRefund')}: {calculatedRefundAmountFormatted}
              </Typography>
              */}
            </Box>
          );
        })()} 
      </DialogContent>
      
      <DialogActions sx={{ 
        px: { xs: 2, sm: 3 }, 
        py: 2, 
        justifyContent: 'space-between',
        borderTop: '1px solid',
        borderColor: 'divider'
      }}>
        <Button 
          onClick={props.onClose}
          variant="outlined"
          sx={{ 
            minWidth: '100px',
            color: 'text.primary',
            borderColor: 'divider'
          }}
        >
          {t('common.cancel')}
        </Button>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          onClick={handleSubmit(onSubmitForm)}
          disabled={isSubmitting || submitReturnMutation.isPending}
          startIcon={(isSubmitting || submitReturnMutation.isPending) ? <CircularProgress size={20} color="inherit" /> : null}
          sx={{ 
            minWidth: '150px',
            fontWeight: 500,
            boxShadow: 2
          }}
        >
          {(isSubmitting || submitReturnMutation.isPending) ? 
            t('common.submitting') : 
            t('detail.initiation.submitButton')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReturnInitiationModal;
