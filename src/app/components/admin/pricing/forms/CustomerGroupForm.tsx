/**
 * Customer Group Form Component
 * 
 * Form for creating and editing customer groups
 */
import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  TextField,
  FormControlLabel,
  Switch,
  Button,
  Grid,
  Paper,
  FormHelperText
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { customerGroupSchema, CustomerGroupFormValues } from '../schemas';

interface CustomerGroupFormProps {
  defaultValues?: Partial<CustomerGroupFormValues>;
  onSubmit: (data: CustomerGroupFormValues) => void;
  isSubmitting?: boolean;
  isEditMode?: boolean; // Determines if we're in edit mode
  readOnly?: boolean; // Determines if the form is in read-only mode
}

const CustomerGroupForm: React.FC<CustomerGroupFormProps> = ({
  defaultValues = {
    name: '',
    code: '',
    description: '',
    is_active: true
  },
  onSubmit,
  isSubmitting = false,
  isEditMode = false, // Default to add mode
  readOnly = false // Default to editable
}) => {
  const { t } = useTranslation();
  
  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<CustomerGroupFormValues>({
    resolver: zodResolver(customerGroupSchema),
    defaultValues: defaultValues as CustomerGroupFormValues
  });

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Group Name"
                  fullWidth
                  size='small'
                  required
                  error={!readOnly && !!errors.name}
                  helperText={!readOnly && errors.name?.message}
                  disabled={readOnly}
                  InputProps={{
                    readOnly: readOnly
                  }}
                />
              )}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Controller
              name="code"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Code"
                  fullWidth
                  size='small'
                  required
                  error={!readOnly && !!errors.code}
                  helperText={!readOnly && errors.code?.message}
                  disabled={readOnly}
                  InputProps={{
                    readOnly: readOnly
                  }}
                />
              )}
            />
          </Grid>
          
          <Grid item xs={12}>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Description"
                  fullWidth
                  size='small'
                  multiline
                  rows={3}
                  error={!readOnly && !!errors.description}
                  helperText={!readOnly && errors.description?.message}
                  disabled={readOnly}
                  InputProps={{
                    readOnly: readOnly
                  }}
                />
              )}
            />
          </Grid>
          
          {/* Only show the active toggle in edit mode */}
          {isEditMode && (
            <Grid item xs={12}>
              <Controller
                name="is_active"
                control={control}
                render={({ field: { value, onChange, ...field } }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={value}
                        onChange={onChange}
                        disabled={readOnly}
                        {...field}
                      />
                    }
                    label="Active"
                  />
                )}
              />
              {!readOnly && errors.is_active && (
                <FormHelperText error>{errors.is_active.message}</FormHelperText>
              )}
            </Grid>
          )}
          
          {!readOnly && (
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving" : "Save"}
                </Button>
              </Box>
            </Grid>
          )}
        </Grid>
      </Box>
    </Paper>
  );
};

export default CustomerGroupForm;
