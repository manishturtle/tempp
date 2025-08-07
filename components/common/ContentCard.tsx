"use client";

import React, { useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  TextField, 
  Divider, 
  IconButton, 
  Popover, 
  MenuItem,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Button,
  Select,
  FormControl,
  InputLabel,
  ListItemText,
  OutlinedInput,
  SelectChangeEvent,
  Chip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ViewListIcon from '@mui/icons-material/ViewList';
import GridViewIcon from '@mui/icons-material/GridView';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';

// Component-specific constants
const POPOVER_WIDTH_MEDIUM = 400;
const POPOVER_WIDTH_SMALL = 250;
const BADGE_SIZE = 16;

// Define filter types
export interface FilterOption {
  field: string;
  label: string;
  type: 'text' | 'select' | 'boolean' | 'date' | 'number';
  options?: { value: string; label: string }[];
}

export interface FilterState {
  field: string;
  value: any;
  operator: string; // 'equals', 'contains', 'greaterThan', 'lessThan', etc.
}

interface ContentCardProps {
  children: React.ReactNode;
  sx?: any;
  onSearch?: (searchTerm: string) => void;
  onViewChange?: (view: 'list' | 'grid') => void;
  onFilterChange?: (filters: FilterState[]) => void;
  onColumnsChange?: (visibleColumns: string[]) => void;
  onTabChange?: (tabValue: string) => void;
  filterOptions?: FilterOption[];
  columnOptions?: { field: string; headerName: string; }[];
  tabOptions?: { value: string; label: string; count: number; }[];
  activeTab?: string;
}

const ContentCard: React.FC<ContentCardProps> = ({ 
  children, 
  sx = {},
  onSearch,
  onViewChange,
  onFilterChange,
  onColumnsChange,
  onTabChange,
  filterOptions = [],
  columnOptions = [],
  tabOptions = [
    { value: 'all', label: 'All', count: 0 },
    { value: 'active', label: 'Active', count: 0 },
    { value: 'inactive', label: 'Inactive', count: 0 }
  ],
  activeTab = 'all'
}) => {
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [activeTabState, setActiveTabState] = useState(activeTab);
  
  // Filter states
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [activeFilters, setActiveFilters] = useState<FilterState[]>([]);
  const [tempFilters, setTempFilters] = useState<FilterState[]>([]);
  const [selectedFilterField, setSelectedFilterField] = useState<string>('');
  const [filterOperator, setFilterOperator] = useState<string>('equals');
  const [filterValue, setFilterValue] = useState<any>('');
  const [startDateValue, setStartDateValue] = useState<Date | null>(null);
  const [endDateValue, setEndDateValue] = useState<Date | null>(null);
  
  // Column visibility states
  const [columnsAnchorEl, setColumnsAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(columnOptions.map(col => col.field));
  
  const filterOpen = Boolean(filterAnchorEl);
  const columnsOpen = Boolean(columnsAnchorEl);

  // Handle search change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  // Handle view change
  const handleViewChange = (newView: 'list' | 'grid') => {
    setView(newView);
    if (onViewChange) {
      onViewChange(newView);
    }
  };

  // Handle filter click
  const handleFilterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setFilterAnchorEl(event.currentTarget);
    setTempFilters([...activeFilters]);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
    setSelectedFilterField('');
    setFilterOperator('equals');
    setFilterValue('');
    setStartDateValue(null);
    setEndDateValue(null);
  };

  const handleFilterApply = () => {
    setActiveFilters(tempFilters);
    if (onFilterChange) {
      onFilterChange(tempFilters);
    }
    handleFilterClose();
  };

  const handleFilterReset = () => {
    setTempFilters([]);
    setActiveFilters([]);
    if (onFilterChange) {
      onFilterChange([]);
    }
    handleFilterClose();
  };

  const handleAddFilter = () => {
    if (selectedFilterField && filterOperator && (filterValue !== '' || (filterOperator === 'between' && startDateValue && endDateValue))) {
      const newFilter: FilterState = {
        field: selectedFilterField,
        operator: filterOperator,
        value: filterOperator === 'between' ? { start: startDateValue, end: endDateValue } : filterValue
      };
      
      setTempFilters([...tempFilters, newFilter]);
      setSelectedFilterField('');
      setFilterOperator('equals');
      setFilterValue('');
      setStartDateValue(null);
      setEndDateValue(null);
    }
  };

  const handleRemoveFilter = (index: number) => {
    const updatedFilters = [...tempFilters];
    updatedFilters.splice(index, 1);
    setTempFilters(updatedFilters);
    
    // Apply the changes to activeFilters and notify parent
    setActiveFilters(updatedFilters);
    if (onFilterChange) {
      onFilterChange(updatedFilters);
    }
  };

  const getOperatorOptions = (type: string) => {
    switch (type) {
      case 'text':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'contains', label: 'Contains' },
          { value: 'startsWith', label: 'Starts with' },
          { value: 'endsWith', label: 'Ends with' }
        ];
      case 'number':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'greaterThan', label: 'Greater than' },
          { value: 'lessThan', label: 'Less than' },
          { value: 'between', label: 'Between' }
        ];
      case 'date':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'before', label: 'Before' },
          { value: 'after', label: 'After' },
          { value: 'between', label: 'Between' }
        ];
      case 'boolean':
        return [
          { value: 'equals', label: 'Equals' }
        ];
      case 'select':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'notEquals', label: 'Not equals' }
        ];
      default:
        return [
          { value: 'equals', label: 'Equals' }
        ];
    }
  };

  const renderFilterValueInput = (field: string, type: string, operator: string) => {
    const selectedOption = filterOptions.find(option => option.field === field);
    
    if (!selectedOption) return null;
    
    switch (type) {
      case 'text':
        return (
          <TextField
            size="small"
            fullWidth
            placeholder="Enter value"
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
          />
        );
      case 'number':
        return (
          <TextField
            size="small"
            fullWidth
            type="number"
            placeholder="Enter value"
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
          />
        );
      case 'date':
        return (
          <TextField
            size="small"
            fullWidth
            type="date"
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
          />
        );
      case 'boolean':
        return (
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={filterValue === true}
                  onChange={(e) => setFilterValue(e.target.checked)}
                />
              }
              label="True"
            />
          </FormGroup>
        );
      case 'select':
        return (
          <FormControl fullWidth size="small">
            <Select
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              displayEmpty
              renderValue={(selected) => {
                if (!selected) {
                  return <Typography color="text.secondary">Select option</Typography>;
                }
                
                const option = selectedOption.options?.find(opt => opt.value === selected);
                return option ? option.label : selected;
              }}
            >
              {selectedOption.options?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      default:
        return (
          <TextField
            size="small"
            fullWidth
            placeholder="Enter value"
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
          />
        );
    }
  };

  // Handle column visibility
  const handleColumnsClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setColumnsAnchorEl(event.currentTarget);
  };

  const handleColumnsClose = () => {
    setColumnsAnchorEl(null);
  };

  const handleColumnToggle = (field: string) => {
    let newVisibleColumns: string[];
    
    if (visibleColumns.includes(field)) {
      // Don't allow hiding all columns - at least one must remain visible
      if (visibleColumns.length <= 1) return;
      newVisibleColumns = visibleColumns.filter(col => col !== field);
    } else {
      newVisibleColumns = [...visibleColumns, field];
    }
    
    setVisibleColumns(newVisibleColumns);
    
    if (onColumnsChange) {
      onColumnsChange(newVisibleColumns);
    }
  };

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setActiveTabState(newValue);
    if (onTabChange) {
      onTabChange(newValue);
    }
  };

  // Action controls to be displayed in the card header
  const actionControls = (
    <Box sx={(theme) => ({ 
      display: 'flex', 
      gap: { xs: theme.spacing(1), sm: theme.spacing(2) }, 
      alignItems: 'center',
      flexWrap: { xs: 'wrap', sm: 'nowrap' },
      justifyContent: { xs: 'flex-end', sm: 'flex-end' },
      mt: { xs: theme.spacing(1), sm: 0 }
    })}>
      {/* Search and filter group */}
      <Box sx={(theme) => ({ 
        display: 'flex', 
        alignItems: 'center',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: theme.shape.borderRadius / 2,
        flexGrow: { xs: 1, sm: 0 },
        maxWidth: { xs: '100%', sm: 'auto' }
      })}>
        <IconButton
          size="small"
          onClick={() => setShowSearch(!showSearch)}
          sx={{ color: searchTerm ? 'primary.main' : 'text.secondary' }}
        >
          <SearchIcon fontSize="small" />
        </IconButton>
        {showSearch && (
          <TextField
            placeholder="Search..."
            size="small"
            value={searchTerm}
            onChange={handleSearchChange}
            variant="standard"
            InputProps={{
              disableUnderline: true
            }}
            sx={(theme) => ({ 
              ml: theme.spacing(1), 
              width: { xs: 'calc(100% - 40px)', sm: 150 } 
            })}
          />
        )}
        <Divider orientation="vertical" flexItem  />
        <IconButton
          size="small"
          onClick={handleFilterClick}
          sx={(theme) => ({ 
            color: activeFilters.length > 0 ? 'primary.main' : 'text.secondary',
            bgcolor: activeFilters.length > 0 ? theme.palette.action.hover : 'transparent'
          })}
        >
          <FilterListIcon fontSize="small" />
          {activeFilters.length > 0 && (
            <Typography 
              variant="caption" 
              sx={(theme) => ({ 
                position: 'absolute', 
                top: -2, 
                right: -2, 
                bgcolor: 'primary.main',
                color: theme.palette.primary.contrastText,
                borderRadius: '50%',
                width: BADGE_SIZE,
                height: BADGE_SIZE,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              })}
            >
              {activeFilters.length}
            </Typography>
          )}
        </IconButton>
        <Popover
          open={filterOpen}
          anchorEl={filterAnchorEl}
          onClose={handleFilterClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          PaperProps={{
            sx: (theme) => ({ width: POPOVER_WIDTH_MEDIUM, p: theme.spacing(2) })
          }}
        >
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Filters</Typography>
            
            {/* Active filters */}
            {tempFilters.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Active Filters</Typography>
                {tempFilters.map((filter, index) => {
                  const fieldOption = filterOptions.find(option => option.field === filter.field);
                  const operatorOption = fieldOption ? 
                    getOperatorOptions(fieldOption.type).find(op => op.value === filter.operator) : 
                    null;
                  
                  let valueDisplay = filter.value;
                  if (fieldOption?.type === 'select' && fieldOption.options) {
                    const option = fieldOption.options.find(opt => opt.value === filter.value);
                    if (option) valueDisplay = option.label;
                  } else if (fieldOption?.type === 'boolean') {
                    valueDisplay = filter.value ? 'True' : 'False';
                  } else if (fieldOption?.type === 'date' && filter.operator === 'between') {
                    valueDisplay = `${filter.value.start.toLocaleDateString()} - ${filter.value.end.toLocaleDateString()}`;
                  }
                  
                  return (
                    <Box 
                      key={index} 
                      sx={(theme) => ({ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        bgcolor: theme.palette.action.hover,
                        borderRadius: theme.shape.borderRadius / 2,
                        p: theme.spacing(1),
                        mb: theme.spacing(1)
                      })}
                    >
                      <Typography variant="body2">
                        {fieldOption?.label || filter.field} {operatorOption?.label || filter.operator} {valueDisplay}
                      </Typography>
                      <IconButton size="small" onClick={() => handleRemoveFilter(index)}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  );
                })}
              </Box>
            )}
            
            {/* Add new filter */}
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Add Filter</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {/* Field selection */}
              <FormControl fullWidth size="small">
                <InputLabel>Field</InputLabel>
                <Select
                  value={selectedFilterField}
                  onChange={(e) => {
                    setSelectedFilterField(e.target.value);
                    setFilterOperator('equals');
                    setFilterValue('');
                    setStartDateValue(null);
                    setEndDateValue(null);
                  }}
                  label="Field"
                >
                  {filterOptions.map((option) => (
                    <MenuItem key={option.field} value={option.field}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {/* Operator selection */}
              {selectedFilterField && (
                <FormControl fullWidth size="small">
                  <InputLabel>Operator</InputLabel>
                  <Select
                    value={filterOperator}
                    onChange={(e) => {
                      setFilterOperator(e.target.value);
                      setFilterValue('');
                      setStartDateValue(null);
                      setEndDateValue(null);
                    }}
                    label="Operator"
                  >
                    {getOperatorOptions(
                      filterOptions.find(option => option.field === selectedFilterField)?.type || 'text'
                    ).map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              
              {/* Value input */}
              {selectedFilterField && filterOperator && (
                <Box sx={{ mb: 1 }}>
                  {filterOperator === 'between' && filterOptions.find(option => option.field === selectedFilterField)?.type === 'date' ? (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" gutterBottom>Start Date</Typography>
                      <TextField
                        fullWidth
                        size="small"
                        type="date"
                        value={startDateValue ? startDateValue.toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                          try {
                            const date = e.target.value ? new Date(e.target.value) : null;
                            setStartDateValue(date);
                          } catch (error) {
                            console.error('Error parsing start date:', error);
                          }
                        }}
                        InputLabelProps={{ shrink: true }}
                        sx={{ mb: 1 }}
                      />
                      <Typography variant="caption" gutterBottom>End Date</Typography>
                      <TextField
                        fullWidth
                        size="small"
                        type="date"
                        value={endDateValue ? endDateValue.toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                          try {
                            const date = e.target.value ? new Date(e.target.value) : null;
                            setEndDateValue(date);
                          } catch (error) {
                            console.error('Error parsing end date:', error);
                          }
                        }}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Box>
                  ) : (
                    renderFilterValueInput(
                      selectedFilterField,
                      filterOptions.find(option => option.field === selectedFilterField)?.type || 'text',
                      filterOperator
                    )
                  )}
                </Box>
              )}
              
              {/* Add button */}
              <Button 
                variant="outlined" 
                size="small" 
                onClick={handleAddFilter}
                disabled={
                  !selectedFilterField || 
                  !filterOperator || 
                  (filterOperator === 'between' && filterOptions.find(option => option.field === selectedFilterField)?.type === 'date' 
                    ? !startDateValue || !endDateValue 
                    : filterValue === '')
                }
              >
                Add Filter
              </Button>
            </Box>
            
            {/* Action buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
              <Button 
                variant="outlined" 
                size="small" 
                onClick={handleFilterReset}
                disabled={tempFilters.length === 0}
              >
                Reset
              </Button>
              <Button 
                variant="contained" 
                size="small" 
                onClick={handleFilterApply}
                disabled={tempFilters.length === 0}
              >
                Apply Filters
              </Button>
            </Box>
          </Box>
        </Popover>
      </Box>
      
      {/* View toggle */}
      <Box sx={(theme) => ({ 
        display: 'flex', 
        alignItems: 'center',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: theme.shape.borderRadius / 2,
      })}>
        <IconButton
          size="small"
          onClick={() => handleViewChange('list')}
          sx={(theme) => ({ 
            color: view === 'list' ? 'primary.main' : 'text.secondary',
            bgcolor: view === 'list' ? theme.palette.action.hover : 'transparent'
          })}
        >
          <ViewListIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => handleViewChange('grid')}
          sx={(theme) => ({ 
            color: view === 'grid' ? 'primary.main' : 'text.secondary',
            bgcolor: view === 'grid' ? theme.palette.action.hover : 'transparent'
          })}
        >
          <GridViewIcon fontSize="small" />
        </IconButton>
      </Box>
      
      {/* Column visibility toggle */}
      {columnOptions.length > 0 && (
        <Box sx={(theme) => ({ 
          display: 'flex', 
          alignItems: 'center',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: theme.shape.borderRadius / 2,
        })}>
          <IconButton
            size="small"
            onClick={handleColumnsClick}
            sx={{ color: 'text.secondary' }}
          >
            <ViewColumnIcon fontSize="small" />
          </IconButton>
          <Popover
            open={columnsOpen}
            anchorEl={columnsAnchorEl}
            onClose={handleColumnsClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
            PaperProps={{
              sx: (theme) => ({ width: POPOVER_WIDTH_SMALL, p: theme.spacing(2) })
            }}
          >
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Column Visibility</Typography>
              <FormGroup>
                {columnOptions.map((column) => (
                  <FormControlLabel
                    key={column.field}
                    control={
                      <Checkbox
                        checked={visibleColumns.includes(column.field)}
                        onChange={() => handleColumnToggle(column.field)}
                        disabled={visibleColumns.length === 1 && visibleColumns.includes(column.field)}
                      />
                    }
                    label={column.headerName}
                  />
                ))}
              </FormGroup>
            </Box>
          </Popover>
        </Box>
      )}
   
    </Box>
  );

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        ...sx
      }}
    >
      {/* Card header with filter chips and action controls */}
      <Box sx={{ borderBottom: 1, border:"none" }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', sm: 'center' }, 
          px: 2, 
          py: 1.5 
        }}>
          <Box sx={{ 
            display: 'flex', 
            gap: 1,
            flexWrap: 'wrap',
            mb: { xs: 1, sm: 0 }
          }}>
            {tabOptions.map((tab) => (
              <Chip 
                key={tab.value} 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body2">{tab.label}</Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        ml: 0.5, 
                        bgcolor: activeTabState === tab.value ? 'primary.main' : 'action.selected',
                        color: activeTabState === tab.value ? 'primary.contrastText' : 'text.primary',
                        borderRadius: '50%',
                        width: 20,
                        height: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {tab.count}
                    </Typography>
                  </Box>
                }
                onClick={() => handleTabChange({} as React.SyntheticEvent, tab.value)}
                color={activeTabState === tab.value ? "primary" : "default"}
                variant={activeTabState === tab.value ? "filled" : "outlined"}
                sx={(theme) => ({ 
                  borderRadius: 1,
                  height: 32,
                  '& .MuiChip-label': {
                    px: 1.5,
                    py: 0.5
                  },
                  ...(activeTabState === tab.value && {
                    '&:hover': {
                      bgcolor: theme.palette.primary.light,
                      color: theme.palette.primary.contrastText
                    }
                  })
                })}
              />
            ))}
          </Box>
          {actionControls}
        </Box>
      </Box>

      {/* Active filters display */}
      {activeFilters.length > 0 && (
        <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Active Filters:
          </Typography>
          {activeFilters.map((filter, index) => {
            const fieldOption = filterOptions.find(option => option.field === filter.field);
            const operatorOption = fieldOption ? 
              getOperatorOptions(fieldOption.type).find(op => op.value === filter.operator) : 
              null;
            
            let valueDisplay = filter.value;
            if (fieldOption?.type === 'select' && fieldOption.options) {
              const option = fieldOption.options.find(opt => opt.value === filter.value);
              if (option) valueDisplay = option.label;
            } else if (fieldOption?.type === 'boolean') {
              valueDisplay = filter.value ? 'True' : 'False';
            } else if (fieldOption?.type === 'date' && filter.operator === 'between') {
              valueDisplay = `${filter.value.start.toLocaleDateString()} - ${filter.value.end.toLocaleDateString()}`;
            }
            
            return (
              <Box 
                key={index} 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  mb: 1
                }}
              >
                <Typography variant="body2">
                  {fieldOption?.label || filter.field} {operatorOption?.label || filter.operator} {valueDisplay}
                </Typography>
                <IconButton size="small" onClick={() => handleRemoveFilter(index)}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            );
          })}
        </Box>
      )}
      
      <Box sx={{ p: 2, flex: 1 }}>
        {children}
      </Box>
    </Paper>
  );
};

export default ContentCard;
