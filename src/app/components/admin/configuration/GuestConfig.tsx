"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Autocomplete,
  TextField,
  Button,
  Alert,
  Card,
  CardContent,
  CircularProgress
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { useCustomerGroupSellingChannels } from "@/app/hooks/api/storeadmin/customerGroupSellingChannels";
import { CustomerGroupSellingChannel } from "@/app/hooks/api/storeadmin/customerGroupSellingChannels";
import { useGuestConfigs, useBulkCreateGuestConfigs, useBulkUpdateGuestConfigs, GuestConfigInput } from "@/app/hooks/api/storeadmin/guestConfig";

interface GuestConfigFormData {
  web: number | null;
  mobile: number | null;
  pos: number | null;
}

const GuestConfig: React.FC = () => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Fetch customer group selling channels for autocomplete options
  const { data: sellingChannels, isLoading: isLoadingChannels } = useCustomerGroupSellingChannels();
  
  // Fetch existing guest configs
  const { data: guestConfigs, isLoading: isLoadingGuestConfigs } = useGuestConfigs();
  
  // Bulk create and update mutations
  const bulkCreateMutation = useBulkCreateGuestConfigs();
  const bulkUpdateMutation = useBulkUpdateGuestConfigs();
  
  // Filter channels by selling channel ID
  const webChannels = sellingChannels?.filter(channel => channel.selling_channel_id === 3) || [];
  const mobileChannels = sellingChannels?.filter(channel => channel.selling_channel_id === 4) || [];
  const posChannels = sellingChannels?.filter(channel => channel.selling_channel_id === 2) || [];
  
  // Form setup
  const { control, handleSubmit, reset } = useForm<GuestConfigFormData>({
    defaultValues: {
      web: null,
      mobile: null,
      pos: null
    }
  });
  
  // Populate form with existing guest config data
  React.useEffect(() => {
    if (guestConfigs && sellingChannels) {
      const webConfig = guestConfigs.find(config => config.selling_channel_id === 3);
      const mobileConfig = guestConfigs.find(config => config.selling_channel_id === 4);
      const posConfig = guestConfigs.find(config => config.selling_channel_id === 2);
      
      // Find the corresponding selling channel by customer_group_id and selling_channel_id
      const webChannelOption = webConfig ? sellingChannels.find(channel => 
        channel.customer_group_id === webConfig.customer_group_id && channel.selling_channel_id === 3
      ) : null;
      
      const mobileChannelOption = mobileConfig ? sellingChannels.find(channel => 
        channel.customer_group_id === mobileConfig.customer_group_id && channel.selling_channel_id === 4
      ) : null;
      
      const posChannelOption = posConfig ? sellingChannels.find(channel => 
        channel.customer_group_id === posConfig.customer_group_id && channel.selling_channel_id === 2
      ) : null;
      
      reset({
        web: webChannelOption ? webChannelOption.id : null,
        mobile: mobileChannelOption ? mobileChannelOption.id : null,
        pos: posChannelOption ? posChannelOption.id : null
      });
    }
  }, [guestConfigs, sellingChannels, reset]);
  
  const onSubmit = async (data: GuestConfigFormData) => {
    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    
    try {
      // Prepare data for bulk operations
      const configsToProcess: GuestConfigInput[] = [];
      
      // Web config
      if (data.web) {
        const webSegment = findSellingChannelById(data.web);
        if (webSegment) {
          const existingWebConfig = guestConfigs?.find(config => config.selling_channel_id === 3);
          configsToProcess.push({
            id: existingWebConfig?.id,
            selling_channel_id: webSegment.selling_channel_id,
            customer_group_id: webSegment.customer_group_id,
            segment_id: webSegment.id
          });
        }
      }
      
      // Mobile config
      if (data.mobile) {
        const mobileSegment = findSellingChannelById(data.mobile);
        if (mobileSegment) {
          const existingMobileConfig = guestConfigs?.find(config => config.selling_channel_id === 4);
          configsToProcess.push({
            id: existingMobileConfig?.id,
            selling_channel_id: mobileSegment.selling_channel_id,
            customer_group_id: mobileSegment.customer_group_id,
            segment_id: mobileSegment.id
          });
        }
      }
      
      // POS config
      if (data.pos) {
        const posSegment = findSellingChannelById(data.pos);
        if (posSegment) {
          const existingPosConfig = guestConfigs?.find(config => config.selling_channel_id === 2);
          configsToProcess.push({
            id: existingPosConfig?.id,
            selling_channel_id: posSegment.selling_channel_id,
            customer_group_id: posSegment.customer_group_id,
            segment_id: posSegment.id
          });
        }
      }
      
      // Determine if we need to create or update
      const hasExistingConfigs = guestConfigs && guestConfigs.length > 0;
      
      if (hasExistingConfigs) {
        // Use bulk update
        await bulkUpdateMutation.mutateAsync(configsToProcess);
        console.log('Bulk updated guest configs:', configsToProcess);
      } else {
        // Use bulk create
        await bulkCreateMutation.mutateAsync(configsToProcess);
        console.log('Bulk created guest configs:', configsToProcess);
      }
      
      setSuccessMessage("Guest configuration saved successfully");
    } catch (error) {
      console.error("Error saving guest configuration:", error);
      setErrorMessage("Failed to save guest configuration");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to find selling channel by ID
  const findSellingChannelById = (id: number | null) => {
    if (!id || !sellingChannels) return null;
    return sellingChannels.find(channel => channel.id === id) || null;
  };
  
  
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }} gutterBottom>Guest Segment Configuration</Typography>
        
        {(isLoadingChannels || isLoadingGuestConfigs) ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {successMessage && (
              <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>
            )}
            
            {errorMessage && (
              <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert>
            )}
            
            <Grid container spacing={3}>
              {/* Web Segment */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Controller
                  name="web"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      options={webChannels}
                      getOptionLabel={(option) => 
                        typeof option === 'object' ? `${option.customer_group_name}` : ''}
                      value={findSellingChannelById(field.value)}
                      onChange={(_, newValue) => {
                        field.onChange(newValue ? newValue.id : null);
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Web"
                          variant="outlined"
                          fullWidth
                        />
                      )}
                    />
                  )}
                />
              </Grid>
              
              {/* Mobile Segment */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Controller
                  name="mobile"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      options={mobileChannels}
                      getOptionLabel={(option) => 
                        typeof option === 'object' ? `${option.customer_group_name}` : ''}
                      value={findSellingChannelById(field.value)}
                      onChange={(_, newValue) => {
                        field.onChange(newValue ? newValue.id : null);
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Mobile"
                          variant="outlined"
                          fullWidth
                        />
                      )}
                    />
                  )}
                />
              </Grid>
              
              {/* POS Segment */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Controller
                  name="pos"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      options={posChannels}
                      getOptionLabel={(option) => 
                        typeof option === 'object' ? `${option.customer_group_name}` : ''}
                      value={findSellingChannelById(field.value)}
                      onChange={(_, newValue) => {
                        field.onChange(newValue ? newValue.id : null);
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="POS"
                          variant="outlined"
                          fullWidth
                        />
                      )}
                    />
                  )}
                />
              </Grid>
              
              {/* Submit Button */}
              <Grid size={{ xs: 12 }}>
                <Box display="flex" justifyContent="flex-end">
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={isSubmitting || bulkCreateMutation.isPending || bulkUpdateMutation.isPending}
                  >
                    {(isSubmitting || bulkCreateMutation.isPending || bulkUpdateMutation.isPending) ? (
                      <>Saving... <CircularProgress size={20} sx={{ ml: 1 }} /></>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default GuestConfig;
