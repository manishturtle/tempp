'use client';

import React from 'react';
import { DataGrid, DataGridProps, GridColDef } from '@mui/x-data-grid';
import { Paper, SxProps, Theme } from '@mui/material';

export interface DataGridMUIProps extends Omit<DataGridProps, 'columns' | 'rows'> {
  /**
   * The array of column definitions for the DataGrid
   */
  columns: GridColDef[];
  /**
   * The array of row data to display in the DataGrid
   */
  rows: readonly any[];
  /**
   * Optional Paper elevation (default: 2)
   */
  elevation?: number;
  /**
   * Optional Paper padding (default: 2)
   */
  paperPadding?: number | string;
  /**
   * Optional Paper height (default: '100%')
   */
  paperHeight?: number | string;
  /**
   * Optional custom styles for the Paper component
   */
  paperSx?: SxProps<Theme>;
  /**
   * Optional custom styles for the DataGrid component
   */
  gridSx?: SxProps<Theme>;
}

/**
 * A reusable DataGrid component wrapped in a Paper with consistent styling
 */
const DataGridMUI: React.FC<DataGridMUIProps> = ({
  columns,
  rows,
  elevation = 2,
  paperPadding = 2,
  paperHeight = '100%',
  paperSx,
  gridSx,
  ...props
}) => {
  // Default styles for the DataGrid
  const defaultGridSx: SxProps<Theme> = {
    border: 'none',
    '& .MuiDataGrid-columnHeaders': {
      backgroundColor: 'background.paper',
      borderBottom: '1px solid',
      borderColor: 'divider',
    },
    '& .MuiDataGrid-cell': {
      borderBottom: '1px solid',
      borderColor: 'divider',
    },
    ...gridSx,
  };

  return (
    <Paper 
      elevation={elevation} 
      sx={{ 
        p: paperPadding, 
        height: paperHeight,
        display: 'flex',
        flexDirection: 'column',
        ...paperSx 
      }}
    >
      <DataGrid
        columns={columns}
        rows={rows}
        sx={defaultGridSx}
        {...props}
      />
    </Paper>
  );
};

export default DataGridMUI;