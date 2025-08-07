'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Paper, Typography, useTheme, Box } from '@mui/material';
import Link from 'next/link';

/**
 * QuickLinkItem component props interface
 */
interface QuickLinkItemProps {
  /**
   * Icon to display
   */
  icon: React.ReactElement;
  
  /**
   * i18n key for the link label
   */
  labelKey: string;
  
  /**
   * URL to navigate to when clicked
   */
  href: string;
  
  /**
   * Optional background color for the icon
   */
  iconBgColor?: string;
}

/**
 * QuickLinkItem component for dashboard navigation shortcuts
 * 
 * Displays an icon and a label in a card-like container that links to a specified route
 * 
 * @returns A clickable card with icon and label
 */
export function QuickLinkItem({ 
  icon, 
  labelKey, 
  href, 
  iconBgColor 
}: QuickLinkItemProps): React.ReactElement {
  const { t } = useTranslation('common');
  const theme = useTheme();
  
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <Paper
        elevation={0}
        sx={{
          padding: theme.spacing(1.5),
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: theme.spacing(16),
          cursor: 'pointer',
          border: `${theme.palette.mode === 'dark' ? 1 : 1}px solid ${theme.palette.divider}`,
          borderRadius: theme.shape.borderRadius,
          transition: theme.transitions.create(['box-shadow', 'transform'], {
            duration: theme.transitions.duration.shorter
          }),
          '&:hover': { 
            boxShadow: theme.shadows[4], 
            transform: `translateY(-${theme.spacing(0.25)})` 
          }
        }}
      >
        <Box
          sx={{
            bgcolor: iconBgColor || theme.palette.action.selected,
            width: theme.spacing(6),
            height: theme.spacing(6),
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: theme.spacing(1.5),
            color: theme.palette.getContrastText(iconBgColor || theme.palette.action.selected)
          }}
        >
          {icon}
        </Box>
        <Typography 
          variant="body2" 
          fontWeight="medium"
          sx={{ 
            mt: 'auto',
            display: '-webkit-box',
            overflow: 'hidden',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 2,
            lineHeight: 1.2,
            height: theme.spacing(4.8),
            textOverflow: 'ellipsis'
          }}
        >
          {t(labelKey)}
        </Typography>
      </Paper>
    </Link>
  );
}
