import React from 'react';
import { MuiColorInput } from 'mui-color-input';
import { FormControl, FormLabel, Box } from '@mui/material';

interface ColorPickerProps {
  /**
   * The current color value
   */
  value: string;
  /**
   * Callback fired when the color value changes
   * @param color - The new color value
   */
  onChange: (color: string) => void;
  /**
   * Label for the color picker
   */
  label?: string;
  /**
   * Whether the color picker is disabled
   */
  disabled?: boolean;
  /**
   * Whether the field is required
   */
  required?: boolean;
  /**
   * Color format to use
   */
  format?: 'hex' | 'hex8' | 'rgb' | 'hsl' | 'hsv';
  /**
   * Whether to hide the alpha channel controls
   */
  isAlphaHidden?: boolean;
  /**
   * Fallback color value for invalid inputs
   */
  fallbackValue?: string;
  /**
   * Size of the input
   */
  size?: 'small' | 'medium';
  /**
   * Whether to show the color preview
   */
  showPreview?: boolean;
}

/**
 * ColorPicker component using mui-color-input
 * A Material-UI compatible color input field with color picker functionality
 */
export function ColorPicker({
  value,
  onChange,
  label,
  disabled = false,
  required = false,
  format = 'hex',
  isAlphaHidden = false,
  fallbackValue = '#000000',
  size = 'medium',
  showPreview = true,
}: ColorPickerProps) {
  return (
    <FormControl fullWidth disabled={disabled}>
      {label && (
        <FormLabel component="legend" required={required} sx={{ mb: 1 }}>
          {label}
        </FormLabel>
      )}
        <MuiColorInput
          value={value}
          onChange={onChange}
          format={format}
          isAlphaHidden={isAlphaHidden}
          fallbackValue={fallbackValue}
          disabled={disabled}
          size={size}
          fullWidth
          sx={{
            '& .MuiInputBase-input': {
              textTransform: 'uppercase',
            },
          }}
        />
    </FormControl>
  );
}

export default ColorPicker;
