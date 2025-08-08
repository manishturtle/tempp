import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  TextField,
  FormControl,
  FormHelperText,
  Switch,
  FormControlLabel,
  Typography,
  InputLabel
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useFetchAdjustmentReason, useCreateAdjustmentReason, useUpdateAdjustmentReason } from '@/app/hooks/api/inventory';
import Loader from '@/app/components/common/Loader';

// Validation schema
const adjustmentReasonSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

type AdjustmentReasonFormData = z.infer<typeof adjustmentReasonSchema>;

interface AdjustmentReasonFormProps {
  mode: 'add' | 'view' | 'edit';
  reasonId?: number | null;
  onSuccess?: () => void;
  onSubmit?: (data: AdjustmentReasonFormData) => void;
}

const AdjustmentReasonForm: React.FC<AdjustmentReasonFormProps> = ({ 
  mode, 
  reasonId, 
  onSuccess, 
  onSubmit 
}) => {
  const { t } = useTranslation();
  const isViewMode = mode === 'view';
  
  const { data: reasonData, isLoading } = useFetchAdjustmentReason(reasonId || 0, {
    enabled: mode !== 'add' && !!reasonId
  });

  const createReason = useCreateAdjustmentReason();
  const updateReason = useUpdateAdjustmentReason();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<AdjustmentReasonFormData>({
    resolver: zodResolver(adjustmentReasonSchema),
    defaultValues: {
      name: '',
      description: '',
      is_active: true,
    }
  });

  React.useEffect(() => {
    if (reasonData) {
      reset({
        name: reasonData.name,
        description: reasonData.description || '',
        is_active: reasonData.is_active,
      });
    }
  }, [reasonData, reset]);

  const handleSave = async (data: AdjustmentReasonFormData) => {
    try {
      if (mode === 'edit' && reasonId) {
        await updateReason.mutateAsync({ id: reasonId, ...data });
      } else {
        await createReason.mutateAsync(data);
      }
      onSuccess?.();
    } catch (error) {
      console.error('Error saving adjustment reason:', error);
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <Box component="form" id="adjustment-reason-form" onSubmit={handleSubmit(onSubmit || handleSave)}>
      <Controller
        name="name"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            size='small'
            label={t('adjustmentReasons.form.name', 'Reason Name')}
            error={!!errors.name}
            helperText={errors.name?.message}
            fullWidth
            disabled={isViewMode}
            required
            margin="normal"
          />
        )}
      />

      <Controller
        name="description"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            label={t('adjustmentReasons.form.description', 'Description')}
            error={!!errors.description}
            helperText={errors.description?.message}
            fullWidth
            multiline
            rows={4}
            disabled={isViewMode}
            margin="normal"
          />
        )}
      />

      <Controller
        name="is_active"
        control={control}
        render={({ field: { value, onChange } }) => (
          <FormControlLabel
            control={
              <Switch
                checked={value}
                onChange={(e) => onChange(e.target.checked)}
                disabled={isViewMode}
              />
            }
            label={t('adjustmentReasons.form.active', 'Active')}
          />
        )}
      />
    </Box>
  );
};

export default AdjustmentReasonForm;
