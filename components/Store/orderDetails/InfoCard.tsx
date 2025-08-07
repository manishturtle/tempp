'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Paper, 
  Typography, 
  useTheme,
  SxProps,
  Theme 
} from '@mui/material';

/**
 * Props for the InfoCard component
 */
interface InfoCardProps {
  /** Translation key for the card title */
  titleKey: string;
  /** React children to render inside the card */
  children: React.ReactNode;
  /** Optional MUI sx props to customize the card */
  sx?: SxProps<Theme>;
}

/**
 * InfoCard component
 * 
 * A reusable card component for displaying information sections like
 * shipping info, billing info, payment method, etc.
 * 
 * @param props Component props
 * @returns React component
 */
export const InfoCard: React.FC<InfoCardProps> = ({ titleKey, children, sx }) => {
  const { t } = useTranslation('common');
  const theme = useTheme();

  return (
    <Paper 
      elevation={0}
      sx={{ 
        padding: theme.spacing(2.5), 
        height: '100%',
        border: `${theme.palette.mode === 'dark' ? 1 : 1}px solid ${theme.palette.divider}`,
        borderRadius: theme.shape.borderRadius,
        ...sx 
      }}
    >
      <Typography variant="h6" component="h3" gutterBottom fontWeight={500}>
        {t(titleKey)}
      </Typography>
      {children}
    </Paper>
  );
};

export default InfoCard;
