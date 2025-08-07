'use client';

import React from 'react';
import { Box, Typography, Tooltip, IconButton, Chip, Stack } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { 
  getSubStatusDisplayInfo, 
  getSubStatusDisplayWithColor, 
} from '../../../utils/engagement/evsStatusMappings';

interface StatusDisplayProps {
  subStatus: string | null | undefined;
  variant?: 'chip' | 'text';
  size?: 'small' | 'medium';
  showTooltip?: boolean;
  iconPosition?: 'right' | 'bottom';
}

/**
 * A reusable component that displays a user-friendly status text or chip
 * with an optional tooltip explaining the status.
 */
export const StatusDisplay: React.FC<StatusDisplayProps> = ({
  subStatus,
  variant = 'text',
  size = 'small',
  showTooltip = true,
  iconPosition = 'right'
}) => {
  const { displayInfo, color } = getSubStatusDisplayWithColor(subStatus);
  
  // For text variant
  if (variant === 'text') {
    return (
      <Stack 
        direction={iconPosition === 'right' ? "row" : "column"} 
        alignItems={iconPosition === 'right' ? "center" : "flex-start"}
        spacing={0.5}
      >
        <Typography 
          variant={size === 'small' ? "body2" : "body1"} 
          color={`${color}.main`}
        >
          {displayInfo.displayString}
        </Typography>
        {showTooltip && (
          <Tooltip title={displayInfo.tooltipContent} arrow>
            <IconButton size="small" sx={{ p: 0 }}>
              <InfoOutlinedIcon fontSize="small" color="action" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    );
  }
  
  // For chip variant
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Chip 
        label={displayInfo.displayString} 
        color={color as any}
        size={size}
      />
      {showTooltip && (
        <Tooltip title={displayInfo.tooltipContent} arrow placement="right">
          <IconButton size="small" sx={{ ml: 0.5, p: 0 }}>
            <InfoOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};

interface JobStatusProps {
  status: string;
  variant?: 'chip' | 'text';
  size?: 'small' | 'medium';
}

/**
 * A component specifically for job statuses with appropriate styling.
 */
export const JobStatusDisplay: React.FC<JobStatusProps> = ({
  status,
  variant = 'chip',
  size = 'small'
}) => {
  let color = 'default';
  let tooltipContent = '';
  
  switch (status) {
    case 'Completed':
      color = 'success';
      tooltipContent = 'The job has successfully processed all emails.';
      break;
    case 'Failed':
      color = 'error';
      tooltipContent = 'The job encountered an error and could not be completed.';
      break;
    case 'Processing':
      color = 'primary';
      tooltipContent = 'The job is currently being processed.';
      break;
    case 'Queued':
      color = 'warning';
      tooltipContent = 'The job is in the queue and will be processed soon.';
      break;
    case 'PartiallyCompleted_OutOfCredits':
      color = 'warning';
      tooltipContent = 'The job was stopped because you ran out of credits. Add more credits to continue.';
      status = 'Partially Completed';
      break;
    default:
      tooltipContent = `Status: ${status}`;
  }
  
  if (variant === 'text') {
    return (
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <Typography variant={size === 'small' ? "body2" : "body1"} color={`${color}.main`}>
          {status}
        </Typography>
        <Tooltip title={tooltipContent} arrow>
          <IconButton size="small" sx={{ p: 0 }}>
            <InfoOutlinedIcon fontSize="small" color="action" />
          </IconButton>
        </Tooltip>
      </Stack>
    );
  }
  
  return (
    <Chip 
      label={status} 
      color={color as any}
      size={size}
      variant="outlined"
    />
  );
};
