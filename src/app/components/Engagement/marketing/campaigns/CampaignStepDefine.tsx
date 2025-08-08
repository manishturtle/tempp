'use client';

import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormHelperText from '@mui/material/FormHelperText';
import Typography from '@mui/material/Typography';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
// import { useTranslation } from 'react-i18next';
import { CampaignWizardFormData } from './NewCampaignFormWizard'; // Adjust path if needed
import { ChannelType } from '../../../../types/engagement/marketing'; // Adjust path

const CampaignStepDefine: React.FC = () => {
  // const { t } = useTranslation();
  const { control, formState: { errors } } = useFormContext<CampaignWizardFormData>();

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {/* t('campaigns.wizard.define.title', 'Define Campaign Basics') */}
        Define Campaign Basics
      </Typography>
      <Grid container spacing={2} sx={{mt:1}}>
        <Grid item xs={12}>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={"Campaign Name"} // t('campaigns.form.name')
                fullWidth
                required
                error={!!errors.name}
                helperText={errors.name?.message}
              />
            )}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth error={!!errors.campaign_channel_type} disabled>
            <InputLabel id="campaign-channel-type-label">{"Channel Type"}</InputLabel> {/* t('campaigns.form.channelType') */}
            <Controller
              name="campaign_channel_type"
              control={control}
              render={({ field }) => (
                <Select {...field} labelId="campaign-channel-type-label" label={"Channel Type"}>
                  <MenuItem value={'EMAIL' as ChannelType}>Email</MenuItem>
                </Select>
              )}
            />
            {errors.campaign_channel_type && <FormHelperText>{errors.campaign_channel_type.message}</FormHelperText>}
             <FormHelperText>Only Email campaigns are supported in this version.</FormHelperText>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Controller
            name="sender_identifier"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={"Sender Email Address"} // t('campaigns.form.senderEmail')
                fullWidth
                required
                type="email"
                error={!!errors.sender_identifier}
                helperText={errors.sender_identifier?.message || "e.g., newsletter@example.com"}
              />
            )}
          />
        </Grid>
        {/* Add sender_name field if needed, e.g., "My Company Newsletter" */}
      </Grid>
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6}>
          <Controller
            name="scheduled_at"
            control={control}
            render={({ field: { onChange, value, ...field } }) => (
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DateTimePicker
                  {...field}
                  label="Schedule Campaign"
                  value={value ? new Date(value) : null}
                  onChange={(newValue) => {
                    if (!newValue) {
                      onChange(null);
                      return;
                    }
                    
                    // Format the date to YYYY-MM-DDTHH:mm:ss+HH:mm
                    const pad = (num: number) => num.toString().padStart(2, '0');
                    const tzOffset = -newValue.getTimezoneOffset();
                    const tzSign = tzOffset >= 0 ? '+' : '-';
                    const tzHours = Math.floor(Math.abs(tzOffset) / 60);
                    const tzMinutes = Math.abs(tzOffset) % 60;
                    
                    const formattedDate = `${newValue.getFullYear()}-${pad(newValue.getMonth() + 1)}-${pad(newValue.getDate())}` +
                      `T${pad(newValue.getHours())}:${pad(newValue.getMinutes())}:00` +
                      `${tzSign}${pad(tzHours)}:${pad(tzMinutes)}`;
                    
                    console.log('Formatted scheduled_at:', formattedDate);
                    onChange(formattedDate);
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!errors.scheduled_at,
                      helperText: errors.scheduled_at?.message || 'Leave empty to send immediately',
                    },
                  }}
                />
              </LocalizationProvider>
            )}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default CampaignStepDefine;
