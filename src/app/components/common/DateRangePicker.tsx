'use client';

import { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Popover, 
  Button, 
  InputAdornment,
  Stack,
  Typography
} from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  label?: string;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  disabled?: boolean;
  maxDate?: Date | null; // Optional max date, defaults to today
  onFilterChange?: () => void; // Callback when filter is applied
}

export default function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  label = 'Date Range',
  size = 'small',
  fullWidth = false,
  disabled = false,
  maxDate = null, // Default to null, will use today in the component
  onFilterChange
}: DateRangePickerProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [startDateStr, setStartDateStr] = useState<string>('');
  const [endDateStr, setEndDateStr] = useState<string>('');
  const [maxDateStr, setMaxDateStr] = useState<string>('');

  // Set max date to today if not provided
  useEffect(() => {
    const today = new Date();
    const formattedToday = formatDateToString(maxDate || today);
    setMaxDateStr(formattedToday);
  }, [maxDate]);

  // Helper function to format Date to YYYY-MM-DD string
  const formatDateToString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Convert Date objects to strings for the input fields
  useEffect(() => {
    if (startDate) {
      setStartDateStr(formatDateToString(startDate));
    } else {
      setStartDateStr('');
    }
  }, [startDate]);

  useEffect(() => {
    if (endDate) {
      setEndDateStr(formatDateToString(endDate));
    } else {
      setEndDateStr('');
    }
  }, [endDate]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (!disabled) {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleApply = () => {
    if (onFilterChange) {
      onFilterChange();
    }
    handleClose();
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value;
    setStartDateStr(dateStr);

    if (dateStr) {
      const newDate = new Date(dateStr);
      onStartDateChange(newDate);
    } else {
      onStartDateChange(null);
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value;
    setEndDateStr(dateStr);

    if (dateStr) {
      const newDate = new Date(dateStr);
      onEndDateChange(newDate);
    } else {
      onEndDateChange(null);
    }
  };

  const open = Boolean(anchorEl);
  const id = open ? 'date-range-popover' : undefined;

  // Format the date range for display
  const getDisplayValue = () => {
    if (!startDate && !endDate) return '';

    const formatDate = (date: Date | null) => {
      if (!date) return '';
      return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    };

    const start = startDate ? formatDate(startDate) : '';
    const end = endDate ? formatDate(endDate) : '';

    if (start && end) {
      return `${start} - ${end}`;
    } else if (start) {
      return `${start} - `;
    } else if (end) {
      return ` - ${end}`;
    }

    return '';
  };

  return (
    <>
      <TextField
        label={label}
        value={getDisplayValue()}
        onClick={handleClick}
        size={size}
        fullWidth={fullWidth}
        disabled={disabled}
        InputProps={{
          readOnly: true,
          startAdornment: (
            <InputAdornment position="start">
              <CalendarTodayIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: (theme) => ({
            borderRadius: theme.shape.borderRadiusMedium,
            boxShadow: theme.shadows[3]
          })
        }}
      >
        <Box sx={(theme) => ({ 
          p: theme.spacing(2), 
          width: 300,
          borderRadius: theme.shape.borderRadiusMedium
        })}>
          <Stack spacing={2}>
            <Typography variant="subtitle2">Select Date Range</Typography>

            <TextField
              label="Start Date"
              type="date"
              value={startDateStr}
              onChange={handleStartDateChange}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              inputProps={{
                max: maxDateStr // Limit to max date (today by default)
              }}
            />

            <TextField
              label="End Date"
              type="date"
              value={endDateStr}
              onChange={handleEndDateChange}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              inputProps={{
                min: startDateStr, // Prevent selecting end date before start date
                max: maxDateStr // Limit to max date (today by default)
              }}
            />

            <Box sx={(theme) => ({ 
              display: 'flex', 
              justifyContent: 'flex-end', 
              gap: theme.spacing(1), 
              mt: theme.spacing(1) 
            })}>
              <Button variant="outlined" size="small" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="contained" size="small" onClick={handleApply}>
                Apply
              </Button>
            </Box>
          </Stack>
        </Box>
      </Popover>
    </>
  );
}
