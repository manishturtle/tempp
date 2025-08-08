"use client";

import React, { useEffect, useState } from 'react';
import { 
  DataGrid, 
  GridColDef, 
  GridRowSelectionModel,
  GridPaginationModel,
  GridRowParams,
  GridCallbackDetails,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarDensitySelector,
  GridToolbarExportContainer,
  GridCsvExportMenuItem,
  GridPrintExportMenuItem,
  GridExportMenuItemProps
} from '@mui/x-data-grid';
import { Box, Button, Divider } from '@mui/material';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import FilterListIcon from '@mui/icons-material/FilterList';
import DensityMediumIcon from '@mui/icons-material/DensityMedium';
import FileDownloadIcon from '@mui/icons-material/FileDownload';



interface CustomDataGridProps {
  rows: any[];
  columns: GridColDef[];
  paginationModel?: GridPaginationModel;
  onPaginationModelChange?: (model: GridPaginationModel) => void;
  pageSizeOptions?: number[];
  rowSelectionModel?: GridRowSelectionModel;
  onRowSelectionModelChange?: (
    rowSelectionModel: GridRowSelectionModel,
    details: GridCallbackDetails
  ) => void;
  onRowClick?: (params: GridRowParams) => void;
  loading?: boolean;
  checkboxSelection?: boolean;
  disableRowSelectionOnClick?: boolean;
  autoHeight?: boolean;
  getRowId?: (row: any) => string | number;
  className?: string;
  hideToolbar?: boolean;
  viewMode?: 'list' | 'grid';
  density?: 'compact' | 'standard' | 'comfortable';
  // Server-side pagination properties
  rowCount?: number;
  paginationMode?: 'server' | 'client';
}

const CustomDataGrid: React.FC<CustomDataGridProps> = ({
  rows,
  columns,
  paginationModel,
  onPaginationModelChange,
  pageSizeOptions = [5, 10, 20],
  rowSelectionModel,
  onRowSelectionModelChange,
  onRowClick,
  loading = false,
  checkboxSelection = false,
  disableRowSelectionOnClick = false,
  autoHeight = true,
  getRowId,
  className,
  hideToolbar = false,
  viewMode = 'grid',
  density: propDensity,
  // Server-side pagination properties
  rowCount,
  paginationMode = 'server'
}) => {
  // Use state for density instead of calculating it during render
  const [density, setDensity] = useState(propDensity || (viewMode === 'list' ? 'compact' : 'standard'));
  
  // Update density when viewMode or propDensity changes
  useEffect(() => {
    setDensity(propDensity || (viewMode === 'list' ? 'compact' : 'standard'));
  }, [viewMode, propDensity]);
  
  return (
    <DataGrid
      rows={rows}
      columns={columns}
      paginationModel={paginationModel}
      onPaginationModelChange={onPaginationModelChange}
      pageSizeOptions={pageSizeOptions}
      autoHeight={autoHeight}
      checkboxSelection={checkboxSelection}
      disableRowSelectionOnClick={disableRowSelectionOnClick}
      rowSelectionModel={rowSelectionModel}
      onRowSelectionModelChange={onRowSelectionModelChange}
      onRowClick={onRowClick}
      loading={loading}
      getRowId={getRowId}
      className={className}
      // slots={{
      //   toolbar: hideToolbar ? undefined : CustomToolbar,
      // }}
      density={density}
      // Server-side pagination properties
      rowCount={rowCount}
      paginationMode={paginationMode || 'server'}
      sx={(theme) => ({
        // Only keep layout-specific styles that aren't covered by global theme
        '& .MuiDataGrid-root': {
          border: 'none',
        },
        '& .MuiDataGrid-cell': {
          // Only keep layout-specific styles, not appearance styles
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center',
        },
        '& .MuiDataGrid-cell:focus': {
          outline: 'none',
        },
        // Keep minimal necessary styles for checkboxes if needed
        '& .MuiDataGrid-checkboxInput': {
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }
        // All other styles now inherited from global theme
      })}
    />
  );
};

export default CustomDataGrid;
