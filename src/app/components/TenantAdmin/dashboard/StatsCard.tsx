import { Box, Typography } from '@mui/material';
import { ReactNode } from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  progress?: {
    value: number;
    label: string;
    color: string;
  };
}

export const StatsCard = ({ title, value, icon, trend, progress }: StatsCardProps) => {
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        p: 3,
        borderRadius: 2,
        boxShadow: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h4" component="div" sx={{ mt: 1, fontWeight: 600 }}>
            {value}
          </Typography>
          {trend && (
            <Typography
              variant="caption"
              sx={{
                color: trend.isPositive ? 'success.main' : 'error.main',
                display: 'flex',
                alignItems: 'center',
                mt: 0.5,
              }}
            >
              {trend.value}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            bgcolor: 'primary.light',
            color: 'primary.main',
            p: 1.5,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
      </Box>
      {progress && (
        <Box sx={{ mt: 2 }}>
          <Box
            sx={{
              width: '100%',
              bgcolor: 'grey.200',
              borderRadius: 1,
              height: 6,
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                width: `${progress.value}%`,
                bgcolor: progress.color,
                height: '100%',
              }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary">
            {progress.label}
          </Typography>
        </Box>
      )}
    </Box>
  );
};
