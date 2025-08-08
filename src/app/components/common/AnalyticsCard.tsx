"use client";

/**
 * AnalyticsCard Component
 * 
 * A reusable card component for displaying analytics metrics with title, value, percentage change, and icon
 */
import React from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Skeleton,
  alpha
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { useTranslation } from 'react-i18next';

interface AnalyticsCardProps {
  /**
   * The title of the analytics card
   */
  title: string;
  
  /**
   * The main value to display (will be formatted with toLocaleString if number)
   */
  value: number | string;
  
  /**
   * The percentage change (positive or negative)
   */
  percentChange?: number;
  
  /**
   * Icon to display in the card
   */
  icon: React.ReactNode;
  
  /**
   * Primary color for the icon background and percentage
   */
  color?: string;
  
  /**
   * Background color for the icon
   */
  bgColor?: string;
  
  /**
   * Whether the card is in a loading state
   */
  isLoading?: boolean;
  
  /**
   * Optional suffix to display after the value (e.g., %, $)
   */
  suffix?: string;
  
  /**
   * Optional prefix to display before the value (e.g., $)
   */
  prefix?: string;
  
  /**
   * Optional click handler for the card
   */
  onClick?: () => void;
  
  /**
   * Optional custom class name
   */
  className?: string;

  /**
   * Optional subtitle to display below the main value
   */
  subtitle?: string;
}

export const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title,
  value,
  percentChange,
  icon,
  color = 'primary.main',
  bgColor,
  isLoading = false,
  suffix,
  prefix = '',
  onClick,
  className,
  subtitle
}) => {
  const { t } = useTranslation();
  
  // Determine if percentage change is positive, negative, or neutral
  const isPositive = percentChange && percentChange > 0;
  const isNegative = percentChange && percentChange < 0;
  
  // Format the percentage for display
  const formattedPercentage = percentChange 
    ? `${isPositive ? '+' : ''}${percentChange.toFixed(1)}%` 
    : null;
  
  // Determine percentage text color
  const percentageColor = isPositive 
    ? 'success.main' 
    : isNegative 
      ? 'error.main' 
      : 'text.secondary';

  return (
    <Card 
      elevation={0}
      onClick={onClick}
      className={className}
      sx={(theme) => ({ 
        borderRadius: theme.shape.borderRadius,
        border: '1px solid',
        borderColor: 'divider',
        height: '100%',
        backgroundColor: 'background.paper',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[2]
        } : {}
      })}
    >
      <CardContent sx={(theme) => ({ p: theme.spacing(3) })}>
        {/* Title row with icon */}
        <Box sx={(theme) => ({ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
        })}>
          <Typography 
            variant="subtitle2" 
            color="text.secondary"
            sx={(theme) => ({ 
              fontWeight: 500,
              fontSize: theme.typography.subtitle2.fontSize 
            })}
          >
            {title}
          </Typography>
          
          {/* Icon with background */}
          <Box 
            sx={(theme) => {
              // Safely extract color parts
              const [colorName, colorVariant = 'main'] = (color || 'primary.main').split('.');
              
              // Use type assertion for palette access
              const safeColorName = colorName as keyof typeof theme.palette;
              const paletteColor = theme.palette[safeColorName];
              
              // Create background color - use provided bgColor or generate from theme
              let backgroundColor;
              
              if (bgColor) {
                // Use provided bgColor if available
                backgroundColor = bgColor;
              } else if (paletteColor && typeof paletteColor === 'object') {
                // Use color from theme palette with alpha
                const baseColor = paletteColor[colorVariant as keyof typeof paletteColor] as string;
                backgroundColor = alpha(baseColor, 0.12);
              } else if (colorName === 'primary' || colorName === 'secondary') {
                // For primary/secondary, use the theme's color with alpha
                backgroundColor = alpha(theme.palette[colorName].main, 0.12);
              } else {
                // Fallback to a theme color based on mode
                const fallbackColor = theme.palette.mode === 'dark' 
                  ? theme.palette.grey[800] 
                  : theme.palette.grey[200];
                backgroundColor = fallbackColor;
              }
              
              return { 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: theme.spacing(1.5),
                width: theme.spacing(6),  
                height: theme.spacing(6), 
                fontSize: theme.typography.h5.fontSize,
                borderRadius: '50%',
                bgcolor: backgroundColor,
                color: color
              };
            }}
          >
            {icon}
          </Box>
        </Box>

        {/* Value and percentage section */}
        <Box sx={(theme) => ({ 
          display: 'flex', 
          alignItems: 'center',
        })}>
          {isLoading ? (
            <Skeleton variant="rectangular" width="60%" height={40} />
          ) : (
            <Box sx={(theme) => ({ 
              display: 'flex', 
              alignItems: 'center' 
            })}>
              <Typography 
                variant="h4" 
                component="div" 
                sx={(theme) => ({ 
                  fontWeight: theme.typography.fontWeightBold,
                  color: 'text.primary',
                  display: 'flex',
                  alignItems: 'baseline'
                })}
              >
                {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix && (
                  <Box component="span" sx={(theme) => ({ ml: theme.spacing(0.5) })}>
                    {suffix}
                  </Box>
                )}
              </Typography>
              
              {/* Percentage change - next to the count */}
              {percentChange !== undefined && (
                <Box 
                  sx={(theme) => ({ 
                    display: 'flex', 
                    alignItems: 'center',
                    ml: theme.spacing(1.5)
                  })}
                >
                  {isPositive ? (
                    <TrendingUpIcon 
                      fontSize="small" 
                      sx={(theme) => ({ color: 'success.main', mr: theme.spacing(0.5) })} 
                    />
                  ) : isNegative ? (
                    <TrendingDownIcon 
                      fontSize="small" 
                      sx={(theme) => ({ color: 'error.main', mr: theme.spacing(0.5) })} 
                    />
                  ) : null}
                  
                  <Typography 
                    variant="body2" 
                    sx={(theme) => ({ 
                      color: percentageColor,
                      fontWeight: theme.typography.fontWeightMedium
                    })}
                  >
                    {formattedPercentage}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>
        
        {/* Subtitle section */}
        {subtitle && (
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={(theme) => ({ 
              mt: theme.spacing(1),
              fontWeight: theme.typography.fontWeightRegular
            })}
          >
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default AnalyticsCard;
