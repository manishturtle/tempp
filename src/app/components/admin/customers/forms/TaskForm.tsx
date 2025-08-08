import { FC } from 'react';
import { 
  Grid, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  FormHelperText,
  Typography,
  Stack,
  Button,
  Box
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Controller, Control, FieldErrors, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dayjs from 'dayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import EntityAutocomplete from '@/app/components/common/Autocomplete/EntityAutocomplete';
import { entityEndpoints } from '@/app/components/common/Autocomplete/apiEndpoints';

// Custom Zod schema for Dayjs objects
const dayjsSchema = z.custom<dayjs.Dayjs | null>((val) => {
  // Accept null values
  if (val === null) return true;
  // Check if it's a Dayjs object
  return dayjs.isDayjs(val);
}, { message: 'Invalid date format' }).nullable().optional();

// Zod schema for task validation
export const taskSchema = z.object({
  id: z.string().optional(),
  subject: z.string().min(1, 'Subject is required'),
  description: z.string().optional().or(z.literal('')),
  status: z.string().min(1, 'Status is required'),
  priority: z.string().min(1, 'Priority is required'),
  due_date: dayjsSchema,
  owner: z.string().optional().nullable(),
  account_id: z.string().optional().or(z.literal('')),
  contact_id: z.string().optional().or(z.literal('')),
  completed_at: dayjsSchema,
  completed_by: z.string().optional().nullable()
});

// Task form data type - derived from the Zod schema to ensure compatibility
export type TaskFormData = z.infer<typeof taskSchema>;

// API submission type with string dates
export interface TaskApiData extends Omit<TaskFormData, 'due_date' | 'completed_at'> {
  due_date: string | null;
  completed_at: string | null;
}

export type TaskFormProps = {
  initialData?: TaskFormData;
  onSubmit?: (data: TaskFormData | TaskApiData) => void;
  onCancel?: () => void;
  externalControl?: Control<any>;
  externalErrors?: FieldErrors<TaskFormData>;
  isViewMode?: boolean;
  isSubmitting?: boolean;
  showOwnerField?: boolean;
  accountId?: string;
  contactId?: string;
};

/**
 * Reusable task form component
 */
export const TaskForm: FC<TaskFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  externalControl,
  externalErrors,
  isViewMode = false,
  isSubmitting = false,
  showOwnerField = true,
  accountId,
  contactId
}) => {
  const { t } = useTranslation();
  
  // Convert string dates to dayjs objects if needed
  const processInitialData = (data: any) => {
    if (!data) return {};
    
    // Create a new object to avoid mutating the original
    const processed = { ...data };
    
    // Convert due_date string to dayjs object if it's a string
    if (processed.due_date && typeof processed.due_date === 'string') {
      try {
        processed.due_date = dayjs(processed.due_date);
        // Ensure it's a valid date
        if (!processed.due_date.isValid()) {
          processed.due_date = null;
        }
      } catch (error) {
        processed.due_date = null;
      }
    }
    
    // Convert completed_at string to dayjs object if it's a string
    if (processed.completed_at && typeof processed.completed_at === 'string') {
      try {
        processed.completed_at = dayjs(processed.completed_at);
        // Ensure it's a valid date
        if (!processed.completed_at.isValid()) {
          processed.completed_at = null;
        }
      } catch (error) {
        processed.completed_at = null;
      }
    }
    
    return processed;
  };
  
  // Default values for the form
  const defaultValues = {
    subject: '',
    description: '',
    status: 'not_started',
    priority: 'medium',
    due_date: null,
    owner: '',
    account_id: accountId || '',
    contact_id: contactId || '',
    completed_at: null,
    completed_by: null,
    ...processInitialData(initialData)
  } as TaskFormData;
  
  // Initialize form with react-hook-form if not provided externally
  const { 
    control: internalControl, 
    handleSubmit, 
    formState: { errors: internalErrors } 
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema) as any,
    defaultValues
  });

  // Use either external or internal control and errors
  const control = externalControl || internalControl;
  const errors = externalErrors || internalErrors;

  // Handle form submission
  const handleFormSubmit = onSubmit ? handleSubmit((data: TaskFormData) => {
    // Create a copy of the data to avoid mutating the original
    const processedData = { ...data };
    
    // Ensure contact_id is an empty string instead of null
    if (processedData.contact_id === null) {
      processedData.contact_id = '';
    }
    
    // Convert Dayjs objects to ISO strings for API submission
    const formattedData: TaskApiData = {
      ...processedData,
      due_date: processedData.due_date && dayjs.isDayjs(processedData.due_date) && processedData.due_date.isValid() 
        ? processedData.due_date.format('YYYY-MM-DD') 
        : null,
      completed_at: processedData.completed_at && dayjs.isDayjs(processedData.completed_at) && processedData.completed_at.isValid() 
        ? processedData.completed_at.format('YYYY-MM-DD') 
        : null
    };
    
    // Type assertion to handle the type mismatch
    onSubmit(formattedData as unknown as TaskFormData);
  }) : undefined;

  return (
    <form onSubmit={handleFormSubmit}>
      <Grid container spacing={2}>
        {/* Basic Information */}
        <Grid item xs={12}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            {t('tasks.basicInfo') || 'Basic Information'}
          </Typography>
        </Grid>
        
        {/* Subject */}
        <Grid item xs={12}>
          <Controller
            name="subject"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={(t('tasks.subject') || 'Subject') + ' *'}
                fullWidth
                size="small"
                required
                disabled={isViewMode}
                error={!!errors.subject}
                helperText={errors.subject ? t(errors.subject.message || '') : ''}
              />
            )}
          />
        </Grid>
        
        {/* Description */}
        <Grid item xs={12}>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('tasks.description') || 'Description'}
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
        
        {/* Status */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <FormControl 
                fullWidth 
                size="small" 
                error={!!errors.status}
                disabled={isViewMode}
              >
                <InputLabel id="status-label">{t('tasks.status') || 'Status' + ' *'}</InputLabel>
                <Select
                  {...field}
                  labelId="status-label"
                  label={(t('tasks.status') || 'Status') + ' *'}
                  disabled={isViewMode}
                >
                  <MenuItem value="not_started">{t('taskStatus.notStarted') || 'Not Started'}</MenuItem>
                  <MenuItem value="in_progress">{t('taskStatus.inProgress') || 'In Progress'}</MenuItem>
                  <MenuItem value="completed">{t('taskStatus.completed') || 'Completed'}</MenuItem>
                  <MenuItem value="deferred">{t('taskStatus.deferred') || 'Deferred'}</MenuItem>
                  <MenuItem value="cancelled">{t('taskStatus.cancelled') || 'Cancelled'}</MenuItem>
                </Select>
                {errors.status && (
                  <FormHelperText>{t(errors.status.message || '')}</FormHelperText>
                )}
              </FormControl>
            )}
          />
        </Grid>
        
        {/* Priority */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="priority"
            control={control}
            render={({ field }) => (
              <FormControl 
                fullWidth 
                size="small" 
                error={!!errors.priority}
                disabled={isViewMode}
              >
                <InputLabel id="priority-label">{t('tasks.priority') || 'Priority' + ' *'}</InputLabel>
                <Select
                  {...field}
                  labelId="priority-label"
                  label={(t('tasks.priority') || 'Priority') + ' *'}
                >
                  <MenuItem value="high">{t('priority.high') || 'High'}</MenuItem>
                  <MenuItem value="medium">{t('priority.medium') || 'Medium'}</MenuItem>
                  <MenuItem value="low">{t('priority.low') || 'Low'}</MenuItem>
                  <MenuItem value="urgent">{t('priority.urgent') || 'Urgent'}</MenuItem>
                </Select>
                {errors.priority && (
                  <FormHelperText>{t(errors.priority.message || '')}</FormHelperText>
                )}
              </FormControl>
            )}
          />
        </Grid>
        
        {/* Due Date */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="due_date"
            control={control}
            render={({ field }) => (
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label={t('tasks.dueDate') || 'Due Date'}
                  value={field.value && dayjs(field.value).isValid() ? dayjs(field.value) : null}
                  onChange={(date) => {
                    // Handle the Dayjs object conversion and validation
                    field.onChange(date && dayjs(date).isValid() ? date : null);
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: "small",
                      error: !!errors.due_date,
                      helperText: errors.due_date ? t(errors.due_date.message || '') : '',
                      disabled: isViewMode
                    }
                  }}
                />
              </LocalizationProvider>
            )}
          />
        </Grid>
        
        {/* Owner */}
        {showOwnerField && (
          <Grid item xs={12} sm={6}>
            <Controller
              name="owner"
              control={control}
              render={({ field: { onChange, value, ...restField } }) => (
                <EntityAutocomplete
                  {...restField}
                  apiEndpoint={entityEndpoints.users}
                  label={t('tasks.assignedTo') || 'Assignee'}
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
        
        {/* Related To */}
        <Grid item xs={12}>
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
            {t('tasks.relatedTo') || 'Related To'}
          </Typography>
        </Grid>
        
        {/* Account */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="account_id"
            control={control}
            render={({ field: { onChange, value, ...restField } }) => (
              <EntityAutocomplete
                {...restField}
                apiEndpoint={entityEndpoints.accounts}
                label={t('tasks.account') || 'Account'}
                value={value}
                onChange={onChange}
                disabled={isViewMode || !!accountId}
                error={!!errors.account_id}
                helperText={errors.account_id ? t(errors.account_id.message || '') : ''}
                control={control}
              />
            )}
          />
        </Grid>
        
        {/* Contact */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="contact_id"
            control={control}
            render={({ field: { onChange, value, ...restField } }) => (
              <EntityAutocomplete
                {...restField}
                apiEndpoint={entityEndpoints.contacts}
                label={t('tasks.contact') || 'Contact'}
                value={value}
                onChange={onChange}
                disabled={isViewMode || !!contactId}
                error={!!errors.contact_id}
                helperText={errors.contact_id ? t(errors.contact_id.message || '') : ''}
                control={control}
              />
            )}
          />
        </Grid>
        
        {/* Completion Information - Only shown in view mode for completed tasks */}
        {isViewMode && initialData?.status === 'completed' && (
          <>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
                {t('tasks.completionInfo') || 'Completion Information'}
              </Typography>
            </Grid>
            
            {/* Completed At */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="completed_at"
                control={control}
                render={({ field }) => (
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label={t('tasks.completedAt') || 'Completed At'}
                      value={field.value && dayjs(field.value).isValid() ? dayjs(field.value) : null}
                      onChange={(date) => {
                        // Handle the Dayjs object conversion and validation
                        field.onChange(date && dayjs(date).isValid() ? date : null);
                      }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: "small",
                          disabled: true
                        }
                      }}
                    />
                  </LocalizationProvider>
                )}
              />
            </Grid>
            
            {/* Completed By */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="completed_by"
                control={control}
                render={({ field: { value, ...restField } }) => (
                  <EntityAutocomplete
                    {...restField}
                    apiEndpoint={entityEndpoints.users}
                    label={t('Completed By')}
                    value={value || ''}
                    onChange={() => {}}
                    disabled={true}
                    control={control}
                  />
                )}
              />
            </Grid>
          </>
        )}
      </Grid>
      
      {/* Hidden submit button that can be triggered programmatically */}
      <Button 
        id="task-form-submit" 
        type="submit" 
        sx={{ display: 'none' }}
        disabled={isSubmitting}
      >
        {t('Submit')}
      </Button>
    </form>
  );
};

export default TaskForm;
