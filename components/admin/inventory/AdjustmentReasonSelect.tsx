/**
 * AdjustmentReasonSelect component
 * 
 * A reusable dropdown component for selecting adjustment reasons
 * in inventory adjustment forms.
 */
import React from 'react';
import { 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  FormHelperText,
  CircularProgress,
  Box,
  useTheme,
  SelectChangeEvent
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAdjustmentReasons } from '@/app/hooks/api/inventory';
import { AdjustmentReason } from '@/app/types/inventory';

interface AdjustmentReasonSelectProps {
  value: number | '';
  onChange: (value: number) => void;
  adjustmentType?: 'INCREASE' | 'DECREASE';
  error?: string;
  disabled?: boolean;
  required?: boolean;
  label?: string;
}

/**
 * Dropdown component for selecting adjustment reasons
 */
export const AdjustmentReasonSelect: React.FC<AdjustmentReasonSelectProps> = ({
  value,
  onChange,
  adjustmentType,
  error,
  disabled = false,
  required = true,
  label,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  
  // Fetch adjustment reasons with optional filtering by adjustment type
  const { reasons, isLoading, isError } = useAdjustmentReasons({
    is_active: true,
    adjustment_type: adjustmentType,
    page_size: 100,
  });

  // Handle select change
  const handleChange = (event: SelectChangeEvent<number | string>) => {
    onChange(event.target.value as number);
  };

  // Determine label text
  const labelText = label || t('inventory.adjustmentReason', 'Adjustment Reason');

  return (
    <FormControl 
      fullWidth 
      variant="outlined" 
      error={!!error} 
      disabled={disabled || isLoading}
      required={required}
    >
      <InputLabel id="adjustment-reason-select-label">{labelText}</InputLabel>
      
      <Select
        labelId="adjustment-reason-select-label"
        id="adjustment-reason-select"
        value={value}
        onChange={handleChange}
        label={labelText}
        MenuProps={{
          PaperProps: {
            style: {
              maxHeight: theme.spacing(37.5), // 300px / 8px = 37.5
            },
          },
        }}
      >
        {isLoading ? (
          <MenuItem disabled>
            <Box display="flex" alignItems="center" justifyContent="center" p={theme.spacing(2)}>
              <CircularProgress size={24} />
            </Box>
          </MenuItem>
        ) : isError ? (
          <MenuItem disabled>
            {t('common.errors.loadingFailed', 'Failed to load {{resource}}', { resource: 'reasons' })}
          </MenuItem>
        ) : reasons.length === 0 ? (
          <MenuItem disabled>
            {t('common.noResults', 'No results found')}
          </MenuItem>
        ) : (
          <>
            {!required && (
              <MenuItem value="">
                <em>{t('common.none', 'None')}</em>
              </MenuItem>
            )}
            
            {reasons.map((reason: AdjustmentReason) => (
              <MenuItem key={reason.id} value={reason.id}>
                {reason.name}
                {reason.description && (
                  <Box 
                    component="span" 
                    sx={{ 
                      color: 'text.secondary', 
                      ml: theme.spacing(1), 
                      fontSize: theme.typography.caption.fontSize 
                    }}
                  >
                    ({reason.description})
                  </Box>
                )}
              </MenuItem>
            ))}
          </>
        )}
      </Select>
      
      {error && <FormHelperText>{error}</FormHelperText>}
    </FormControl>
  );
};

export default AdjustmentReasonSelect;
