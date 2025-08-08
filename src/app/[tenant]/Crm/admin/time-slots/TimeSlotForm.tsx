"use client";

import React, { forwardRef, useImperativeHandle, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  TextField,
  Box,
  Grid,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Define the form values schema using zod
const timeSlotSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  is_active: z.boolean().default(true),
});

// Form values type from the schema
export type TimeSlotFormValues = z.infer<typeof timeSlotSchema>;

// Form props interface
interface TimeSlotFormProps {
  defaultValues?: Partial<TimeSlotFormValues>;
  onSubmit: (data: TimeSlotFormValues) => void;
  isSubmitting?: boolean;
  isEditMode?: boolean;
  isViewMode?: boolean;
}

// Export the type for the ref to be used in parent components
export interface TimeSlotFormRef {
  submitForm: () => void;
}

const TimeSlotForm = forwardRef<TimeSlotFormRef, TimeSlotFormProps>(({ 
  defaultValues = {
    name: '',
    start_time: '09:00',
    end_time: '18:00',
    is_active: true
  },
  onSubmit,
  isSubmitting = false,
  isEditMode = false,
  isViewMode = false
}, ref) => {
  const { t } = useTranslation();
  
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<TimeSlotFormValues>({
    resolver: zodResolver(timeSlotSchema),
    defaultValues: defaultValues as TimeSlotFormValues
  });
  
  // Update form values when defaultValues change (for edit mode)
  useEffect(() => {
    if (defaultValues) {
      reset(defaultValues as TimeSlotFormValues);
    }
  }, [JSON.stringify(defaultValues), reset]);

  // Custom submit handler
  const handleFormSubmit = (data: TimeSlotFormValues) => {
    onSubmit(data);
  };

  // Expose the submitForm method to the parent component through the ref
  useImperativeHandle(ref, () => ({
    submitForm: () => {
      handleSubmit(handleFormSubmit)();
    }
  }));

  return (
    <Box component="form" onSubmit={handleSubmit(handleFormSubmit)} noValidate>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <Controller
            name="name"
            control={control}
            rules={{ required: 'Name is required' }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                size='small'
                label={t('Name')}
                variant="outlined"
                error={!!errors.name}
                helperText={errors.name?.message}
                disabled={isViewMode}
              />
            )}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <Controller
            name="start_time"
            control={control}
            rules={{
              required: 'Start time is required',
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                type="time"
                size='small'
                label={t('Start Time')}
                variant="outlined"
                error={!!errors.start_time}
                helperText={errors.start_time?.message}
                disabled={isViewMode}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            )}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <Controller
            name="end_time"
            control={control}
            rules={{
              required: 'End time is required',
              validate: (value, formValues) => {
                if (value <= formValues.start_time) {
                  return 'End time must be after start time';
                }
                return true;
              }
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                type="time"
                size='small'
                label={t('End Time')}
                variant="outlined"
                error={!!errors.end_time}
                helperText={errors.end_time?.message}
                disabled={isViewMode}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            )}
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Controller
            name="is_active"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    disabled={isViewMode}
                  />
                }
                label={t('Status')}
              />
            )}
          />
        </Grid>
      </Grid>
    </Box>
  );
});

// Add display name for better debugging
TimeSlotForm.displayName = 'TimeSlotForm';

export default TimeSlotForm;
