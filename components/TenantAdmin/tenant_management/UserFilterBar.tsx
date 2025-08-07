import React, { useState } from 'react';
import { Box, Button, InputAdornment, TextField, Paper } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

interface FilterOption {
  id: string;
  label: string;
}

interface UserFilterBarProps {
  /**
   * Callback when status filter changes
   */
  onStatusFilterChange: (status: string) => void;
  /**
   * Callback when role filter changes
   */
  onRoleFilterChange: (role: string) => void;
  /**
   * Callback when application filter changes
   */
  onAppFilterChange: (app: string) => void;
  /**
   * Callback when search query changes
   */
  onSearchChange: (query: string) => void;
  /**
   * Available status options
   */
  statusOptions: FilterOption[];
  /**
   * Available role options
   */
  roleOptions: FilterOption[];
  /**
   * Available application options
   */
  appOptions: FilterOption[];
}

/**
 * Filter bar component for users page with status, role and application filters
 */
export const UserFilterBar: React.FC<UserFilterBarProps> = ({
  onStatusFilterChange,
  onRoleFilterChange,
  onAppFilterChange,
  onSearchChange,
  statusOptions,
  roleOptions,
  appOptions
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatusFilter, setActiveStatusFilter] = useState('all');
  const [activeRoleFilter, setActiveRoleFilter] = useState('all');
  const [activeAppFilter, setActiveAppFilter] = useState('all');

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchQuery(value);
    onSearchChange(value);
  };

  const handleStatusFilter = (status: string) => {
    setActiveStatusFilter(status);
    onStatusFilterChange(status);
  };

  const handleRoleFilter = (role: string) => {
    setActiveRoleFilter(role);
    onRoleFilterChange(role);
  };

  const handleAppFilter = (app: string) => {
    setActiveAppFilter(app);
    onAppFilterChange(app);
  };

  return (
    <Paper sx={{ 
      p: 2, 
      mb: 3, 
      display: 'flex', 
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: { xs: 'wrap', md: 'nowrap' },
      gap: 2,
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      borderRadius: '8px'
    }}>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button 
          variant={activeStatusFilter === 'all' ? 'contained' : 'outlined'}
          color={activeStatusFilter === 'all' ? 'primary' : 'inherit'}
          onClick={() => handleStatusFilter('all')}
          size="small"
          sx={{ 
            bgcolor: activeStatusFilter === 'all' ? 'primary.main' : 'grey.100',
            color: activeStatusFilter === 'all' ? 'white' : 'text.secondary',
            borderColor: 'transparent',
            textTransform: 'none',
            '&:hover': {
              bgcolor: activeStatusFilter === 'all' ? 'primary.dark' : 'grey.200',
              borderColor: 'transparent',
            }
          }}
        >
          All Status
        </Button>
        
        <Button 
          variant={activeRoleFilter === 'all' ? 'contained' : 'outlined'}
          color={activeRoleFilter === 'all' ? 'primary' : 'inherit'}
          onClick={() => handleRoleFilter('all')}
          size="small"
          sx={{ 
            bgcolor: activeRoleFilter === 'all' ? 'primary.main' : 'grey.100',
            color: activeRoleFilter === 'all' ? 'white' : 'text.secondary',
            borderColor: 'transparent',
            textTransform: 'none',
            '&:hover': {
              bgcolor: activeRoleFilter === 'all' ? 'primary.dark' : 'grey.200',
              borderColor: 'transparent',
            }
          }}
        >
          All Roles
        </Button>
        
        <Button 
          variant={activeAppFilter === 'all' ? 'contained' : 'outlined'}
          color={activeAppFilter === 'all' ? 'primary' : 'inherit'}
          onClick={() => handleAppFilter('all')}
          size="small"
          sx={{ 
            bgcolor: activeAppFilter === 'all' ? 'primary.main' : 'grey.100',
            color: activeAppFilter === 'all' ? 'white' : 'text.secondary',
            borderColor: 'transparent',
            textTransform: 'none',
            '&:hover': {
              bgcolor: activeAppFilter === 'all' ? 'primary.dark' : 'grey.200',
              borderColor: 'transparent',
            }
          }}
        >
          All applications
        </Button>
      </Box>
      
      <TextField
        placeholder="Search users..."
        size="small"
        value={searchQuery}
        onChange={handleSearch}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            </InputAdornment>
          ),
        }}
        sx={{
          minWidth: { xs: '100%', md: '250px' },
          '& .MuiOutlinedInput-root': {
            borderRadius: 1,
          }
        }}
      />
    </Paper>
  );
};

export default UserFilterBar;
