import { FC } from 'react';
import { 
  Grid, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  FormHelperText, 
  Checkbox, 
  FormControlLabel,
  Typography,
  Stack,
  Button
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Controller, Control, FieldErrors, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import EntityAutocomplete from '@/app/components/common/Autocomplete/EntityAutocomplete';
import { entityEndpoints } from '@/app/components/common/Autocomplete/apiEndpoints';

// Zod schema for contact validation
export const contactSchema = z.object({
  id: z.string().optional(),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().optional().or(z.literal('')),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  secondary_email: z.string().email('Invalid email address').optional().or(z.literal('')),
  mobile_phone: z.string().optional().or(z.literal('')),
  work_phone: z.string().optional().or(z.literal('')),
  job_title: z.string().optional().or(z.literal('')),
  department: z.string().optional().or(z.literal('')),
  status: z.string().min(1, 'Status is required'),
  owner: z.string().optional().nullable(),
  description: z.string().optional().or(z.literal('')),
  is_primary: z.boolean().optional(),
  email_opt_out: z.boolean().optional(),
  do_not_call: z.boolean().optional(),
  sms_opt_out: z.boolean().optional(),
  account_id: z.string().optional().or(z.literal(''))
});

// Contact form data type - derived from the Zod schema to ensure compatibility
export type ContactFormData = z.infer<typeof contactSchema>;

export type ContactFormProps = {
  initialData?: ContactFormData;
  onSubmit?: (data: ContactFormData) => void;
  onCancel?: () => void;
  externalControl?: Control<any>;
  externalErrors?: FieldErrors<ContactFormData>;
  isViewMode?: boolean;
  isSubmitting?: boolean;
  showOwnerField?: boolean;
};

/**
 * Reusable contact form component
 */
export const ContactForm: FC<ContactFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  externalControl,
  externalErrors,
  isViewMode = false,
  isSubmitting = false,
  showOwnerField = true
}) => {
  const { t } = useTranslation();
  
  // Default values for the form
  const defaultValues = {
    first_name: '',
    last_name: '',
    email: '',
    secondary_email: '',
    mobile_phone: '',
    work_phone: '',
    job_title: '',
    department: '',
    status: 'Active',
    owner: '',
    description: '',
    is_primary: false,
    email_opt_out: false,
    do_not_call: false,
    sms_opt_out: false,
    account_id: '',
    ...initialData
  } as ContactFormData;
  
  // Initialize form with react-hook-form if not provided externally
  const { 
    control: internalControl, 
    handleSubmit, 
    formState: { errors: internalErrors } 
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema) as any,
    defaultValues
  });

  // Use either external or internal control and errors
  const control = externalControl || internalControl;
  const errors = externalErrors || internalErrors;

  // Handle form submission
  const handleFormSubmit = onSubmit ? handleSubmit((data) => {
    onSubmit(data);
  }) : undefined;

  return (
    <form onSubmit={handleFormSubmit}>
      <Grid container spacing={2}>
      {/* Basic Information */}
      <Grid size={{ xs: 12 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          {t('Basic Information')}
        </Typography>
      </Grid>
      {/* First Name */}
      <Grid size={{ xs: 12, sm: 6 }}>
        <Controller
          name="first_name"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label={t('First Name') + ' *'}
              fullWidth
              size="small"
              required
              disabled={isViewMode}
              error={!!errors.first_name}
              helperText={errors.first_name ? t(errors.first_name.message || 'field.required') : ''}
            />
          )}
        />
      </Grid>
      
      {/* Last Name */}
      <Grid size={{ xs: 12, sm: 6 }}>
        <Controller
          name="last_name"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label={t('Last Name')}
              fullWidth
              size="small"
              disabled={isViewMode}
              error={!!errors.last_name}
              helperText={errors.last_name ? t(errors.last_name.message || '') : ''}
            />
          )}
        />
      </Grid>
      
      {/* Email */}
      <Grid size={{ xs: 12, sm: 6 }}>
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label={t('Email')}
              fullWidth
              size="small"
              type="email"
              disabled={isViewMode}
              error={!!errors.email}
              helperText={errors.email ? t(errors.email.message || '') : ''}
            />
          )}
        />
      </Grid>
      
      {/* Secondary Email */}
      <Grid size={{ xs: 12, sm: 6 }}>
        <Controller
          name="secondary_email"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label={t('Secondary Email')}
              fullWidth
              size="small"
              type="email"
              disabled={isViewMode}
              error={!!errors.secondary_email}
              helperText={errors.secondary_email ? t(errors.secondary_email.message || '') : ''}
            />
          )}
        />
      </Grid>
      
      {/* Contact Information */}
      <Grid size={{ xs: 12 }} sx={{ mt: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          {t('Contact Information')}
        </Typography>
      </Grid>
      
      {/* Mobile Phone */}
      <Grid size={{ xs: 12, sm: 6 }}>
        <Controller
          name="mobile_phone"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label={t('Mobile Phone')}
              fullWidth
              size="small"
              disabled={isViewMode}
              error={!!errors.mobile_phone}
              helperText={errors.mobile_phone ? t(errors.mobile_phone.message || '') : ''}
            />
          )}
        />
      </Grid>
      
      {/* Work Phone */}
      <Grid size={{ xs: 12, sm: 6 }}>
        <Controller
          name="work_phone"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label={t('Work Phone')}
              fullWidth
              size="small"
              disabled={isViewMode}
              error={!!errors.work_phone}
              helperText={errors.work_phone ? t(errors.work_phone.message || '') : ''}
            />
          )}
        />
      </Grid>
      
      {/* Job Title */}
      <Grid size={{ xs: 12, sm: 6 }}>
        <Controller
          name="job_title"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label={t('Job Title')}
              fullWidth
              size="small"
              disabled={isViewMode}
              error={!!errors.job_title}
              helperText={errors.job_title ? t(errors.job_title.message || '') : ''}
            />
          )}
        />
      </Grid>
      
      {/* Department */}
      <Grid size={{ xs: 12, sm: 6 }}>
        <Controller
          name="department"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label={t('Department')}
              fullWidth
              size="small"
              disabled={isViewMode}
              error={!!errors.department}
              helperText={errors.department ? t(errors.department.message || '') : ''}
            />
          )}
        />
      </Grid>
      
      {/* Status */}
      <Grid size={{ xs: 12, sm: 6 }}>
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth size="small" error={!!errors.status} disabled={isViewMode}>
              <InputLabel id="contact-status-label">{t('Status')} *</InputLabel>
              <Select
                {...field}
                labelId="contact-status-label"
                label={t('Status') + ' *'}
                size="small"
                disabled={isViewMode}
              >
                <MenuItem value="Active">{t('Active')}</MenuItem>
                <MenuItem value="Inactive">{t('Inactive')}</MenuItem>
              </Select>
              {errors.status && (
                <FormHelperText>{t(errors.status.message || 'field.required')}</FormHelperText>
              )}
            </FormControl>
          )}
        />
      </Grid>
      
      {/* Owner */}
      {showOwnerField && (
        <Grid size={{ xs: 12, sm: 6 }}>
          <Controller
            name="owner"
            control={control}
            render={({ field: { onChange, value, ...restField } }) => (
              <EntityAutocomplete
                {...restField}
                apiEndpoint={entityEndpoints.users}
                label={t('Owner')}
                value={value}
                onChange={onChange}
                disabled={isViewMode}
                error={!!errors.owner}
                helperText={errors.owner ? t(errors.owner.message || '') : ''}
                control={control}
              />
            )}
          />
        </Grid>
      )}
      
      {/* Communication Preferences */}
      <Grid size={{ xs: 12 }} sx={{ mt: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          {t('Communication Preferences')}
        </Typography>
      </Grid>
      
      {/* Checkboxes */}
      <Grid size={{ xs: 12 }}>
        <Stack spacing={1}>
          <Controller
            name="is_primary"
            control={control}
            render={({ field: { value, onChange, ...field } }) => (
              <FormControlLabel
                control={
                  <Checkbox
                    {...field}
                    checked={!!value}
                    onChange={(e) => onChange(e.target.checked)}
                    disabled={isViewMode}
                  />
                }
                label={t('Set as Primary Contact')}
              />
            )}
          />
          <Controller
            name="email_opt_out"
            control={control}
            render={({ field: { value, onChange, ...field } }) => (
              <FormControlLabel
                control={
                  <Checkbox
                    {...field}
                    checked={!!value}
                    onChange={(e) => onChange(e.target.checked)}
                    disabled={isViewMode}
                  />
                }
                label={t('Email Opt Out')}
              />
            )}
          />
          <Controller
            name="do_not_call"
            control={control}
            render={({ field: { value, onChange, ...field } }) => (
              <FormControlLabel
                control={
                  <Checkbox
                    {...field}
                    checked={!!value}
                    onChange={(e) => onChange(e.target.checked)}
                    disabled={isViewMode}
                  />
                }
                label={t('Do Not Call')}
              />
            )}
          />
          <Controller
            name="sms_opt_out"
            control={control}
            render={({ field: { value, onChange, ...field } }) => (
              <FormControlLabel
                control={
                  <Checkbox
                    {...field}
                    checked={!!value}
                    onChange={(e) => onChange(e.target.checked)}
                    disabled={isViewMode}
                  />
                }
                label={t('SMS Opt Out')}
              />
            )}
          />
        </Stack>
      </Grid>
      
      {/* Description */}
      <Grid size={{ xs: 12 }}>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label={t('Description')}
              fullWidth
              multiline
              rows={4}
              size="small"
              disabled={isViewMode}
              error={!!errors.description}
              helperText={errors.description ? t(errors.description.message || '') : ''}
            />
          )}
        />
      </Grid>
      </Grid>
      
      {/* Hidden submit button that can be triggered programmatically */}
      <Button 
        id="contact-form-submit" 
        type="submit" 
        sx={{ display: 'none' }}
        disabled={isSubmitting}
      >
        {t('Submit')}
      </Button>
    </form>
  );
};

export default ContactForm;
