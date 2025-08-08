"use client";

/**
 * Account Action Header Component
 * 
 * Displays action buttons and search functionality for the account list
 */
import * as React from 'react';
import { useState } from 'react';
import { Box, Button, Stack, TextField, InputAdornment, alpha } from '@mui/material';
import { useTranslation } from 'react-i18next';
import SearchIcon from '@mui/icons-material/Search';

interface AccountActionHeaderProps {
  onSearch?: (term: string) => void;
}

/**
 * Component for displaying action buttons and search for accounts
 */
export const AccountActionHeader = ({
  onSearch,
}: AccountActionHeaderProps): React.ReactElement => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchTerm(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  return (
    <TextField
      fullWidth
      placeholder={t('accountListPage.search')}
      value={searchTerm}
      onChange={handleSearchChange}
      variant="outlined"
      size="small"
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon color="action" />
          </InputAdornment>
        ),
        sx: {
          borderRadius: 1,
          bgcolor: 'background.paper',
          '&.MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: (theme) => alpha(theme.palette.divider, 0.8),
            },
            '&:hover fieldset': {
              borderColor: 'divider',
            },
            '&.Mui-focused fieldset': {
              borderColor: 'primary.main',
            },
          },
        },
      }}
    />
  );
};

export default AccountActionHeader;
