import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';

interface UserStatCardProps {
  /**
   * The icon to display in the card
   */
  icon: React.ReactNode;
  /**
   * The background color for the icon container
   */
  iconBgColor: string;
  /**
   * The color of the icon
   */
  iconColor: string;
  /**
   * The value to display (number or text)
   */
  value: string | number;
  /**
   * The label describing what the stat represents
   */
  label: string;
}

const IconWrapper = styled(Box)(({ theme }) => ({
  borderRadius: '9999px',
  padding: theme.spacing(1.5),
  marginRight: theme.spacing(2),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

/**
 * UserStatCard component displays a statistic with an icon, value, and description
 */
export const UserStatCard: React.FC<UserStatCardProps> = ({
  icon,
  iconBgColor,
  iconColor,
  value,
  label,
}) => {
  return (
    <Paper
      sx={{
        display: 'flex',
        alignItems: 'center',
        padding: 2,
        borderRadius: 1,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      }}
    >
      <IconWrapper sx={{ backgroundColor: iconBgColor }}>
        <Box sx={{ color: iconColor }}>{icon}</Box>
      </IconWrapper>
      <Box>
        <Typography variant="h5" fontWeight="fontWeightSemibold" color="text.primary">
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Box>
    </Paper>
  );
};

export default UserStatCard;
