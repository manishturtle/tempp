'use client';

import React from 'react';
import { Box, Typography, ToggleButtonGroup, ToggleButton, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface VariantSelectorProps {
  label: string;
  options: string[];
  selectedValue: string;
  onChange: (value: string) => void;
  type?: 'color' | 'text';
}

/**
 * Component for selecting product variants like color, size, model, etc.
 * 
 * @param props - Component props
 * @returns React component
 */
export const VariantSelector = ({
  label,
  options,
  selectedValue,
  onChange,
  type = 'text'
}: VariantSelectorProps): React.ReactElement => {
  const { t } = useTranslation('common');
  const theme = useTheme();

  const handleChange = (_event: React.MouseEvent<HTMLElement>, newValue: string) => {
    // Only update if a value is selected (prevents deselection)
    if (newValue !== null) {
      onChange(newValue);
    }
  };

  const getColorCode = (colorName: string): string => {
    const colorMap: Record<string, string> = {
      black: '#000000',
      white: '#FFFFFF',
      blue: '#2196F3',
      red: '#F44336',
      green: '#4CAF50',
      yellow: '#FFEB3B',
      orange: '#FF9800',
      purple: '#9C27B0',
      pink: '#E91E63',
      gray: '#9E9E9E',
      brown: '#795548',
      silver: '#BDBDBD',
      gold: '#FFD700'
    };
    
    return colorMap[colorName.toLowerCase()] || '#CCCCCC';
  };

  return (
    <Box mb={3}>
      <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
        {label}
      </Typography>
      
      {type === 'color' ? (
        <Box display="flex" gap={1}>
          {options.map((option) => (
            <Box
              key={option}
              onClick={() => onChange(option)}
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: getColorCode(option),
                border: `2px solid ${selectedValue === option 
                  ? theme.palette.primary.main 
                  : theme.palette.divider}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: selectedValue === option ? `0 0 0 2px ${theme.palette.background.paper}, 0 0 0 4px ${theme.palette.primary.main}` : 'none',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: `0 4px 8px rgba(0,0,0,0.1)`
                }
              }}
            >
              {selectedValue === option && (
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    backgroundColor: option.toLowerCase() === 'white' ? 'black' : 'white',
                    opacity: 0.6
                  }}
                />
              )}
            </Box>
          ))}
        </Box>
      ) : (
        <ToggleButtonGroup
          value={selectedValue}
          exclusive
          onChange={handleChange}
          aria-label={`${label} selection`}
          sx={{
            '& .MuiToggleButton-root': {
              borderRadius: theme.shape.borderRadius,
              px: 2,
              py: 0.75,
              textTransform: 'none',
              fontWeight: 500,
              borderColor: theme.palette.divider,
              color: theme.palette.text.primary,
              '&.Mui-selected': {
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                '&:hover': {
                  backgroundColor: theme.palette.primary.dark,
                }
              },
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              }
            }
          }}
        >
          {options.map((option) => (
            <ToggleButton key={option} value={option}>
              {option}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      )}
    </Box>
  );
};
