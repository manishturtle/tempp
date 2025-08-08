"use client";

/**
 * Customer Groups Listing Page
 * 
 * Page component for listing, filtering, and managing customer groups
 */
import React, { useState, useMemo } from 'react';
import { Typography, Box, Button, Breadcrumbs, Link as MuiLink, Tooltip ,IconButton} from '@mui/material';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import CustomDataGrid from '@/app/components/common/CustomDataGrid';
import ContentCard from '@/app/components/common/ContentCard';
import { useTranslation } from 'react-i18next';
import { useFetchCustomerGroups, useDeleteCustomerGroup } from '@/app/hooks/api/pricing';
import { CustomerGroup, User } from '@/app/types/pricing';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useRouter } from 'next/navigation';
import ConfirmDialog from '@/app/components/common/ConfirmDialog';
import { formatDateTime } from '@/app/utils/dateUtils';
import Loader from '@/app/components/common/Loader';
import Notification from '@/app/components/common/Notification';
import useNotification from '@/app/hooks/useNotification';
import Link from 'next/link';

interface CustomerGroupExtended extends CustomerGroup {
  created_by?: User;
  updated_by?: User;
}

// Type for the processed row data
interface ProcessedCustomerGroup extends CustomerGroupExtended {
  formattedCreatedAt: string;
  formattedUpdatedAt: string;
  createdByUsername: string;
  updatedByUsername: string;
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalRecords: number;
  }
}

// Type for filter state
interface FilterState {
  field: string;
  operator: string;
  value: any;
}

export default function CustomerGroupsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  
  const [confirmDelete, setConfirmDelete] = useState<{open: boolean, id: number | null}>({
    open: false,
    id: null
  });
  
  // Pagination state
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });
  
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<{start: Date | null, end: Date | null}>({
    start: null,
    end: null
  });
  const [activeFilters, setActiveFilters] = useState<FilterState[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'id', 'name', 'code', 'description', 'is_active', 
    'formattedCreatedAt', 'createdByUsername', 
    'formattedUpdatedAt', 'updatedByUsername'
  ]);
  const [activeTab, setActiveTab] = useState('all');

  const { data, isLoading, error } = useFetchCustomerGroups({
    page: paginationModel.page + 1, // API uses 1-based pagination
    pageSize: paginationModel.pageSize
  });
  const { mutate: deleteCustomerGroup, isPending: isDeleting } = useDeleteCustomerGroup();
  
  // Process the data to include formatted dates and usernames
  const processedRows = useMemo(() => {
    if (!data || !data.results || data.results.length === 0) return [];
    
    const paginationData = {
      page: paginationModel.page + 1, // API uses 1-based pagination
      pageSize: paginationModel.pageSize,
      totalPages: Math.ceil((data.count || 0) / (paginationModel.pageSize || 10)),
      totalRecords: data.count || 0
    };
    
    return data.results.map((group: CustomerGroupExtended) => ({
      ...group,
      formattedCreatedAt: formatDateTime(group.created_at),
      formattedUpdatedAt: formatDateTime(group.updated_at),
      createdByUsername: group.created_by?.username || '-',
      updatedByUsername: group.updated_by?.username || '-',
      pagination: paginationData
    }));
  }, [data]);

  // Filter data based on search term and filters
  const filteredData = useMemo(() => {
    let filtered = processedRows;
    
    // Apply search term filter
    if (searchTerm.trim()) {
      const lowerCaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(group => 
        group.name.toLowerCase().includes(lowerCaseSearch) ||
        group.code.toLowerCase().includes(lowerCaseSearch) ||
        (group.description && group.description.toLowerCase().includes(lowerCaseSearch))
      );
    }
    
    // Apply active filters
    if (activeFilters.length > 0) {
      filtered = filtered.filter(group => {
        return activeFilters.every(filter => {
          const value = group[filter.field as keyof typeof group];
          
          switch (filter.operator) {
            case 'equals':
              return value === filter.value;
            case 'contains':
              return typeof value === 'string' && value.toLowerCase().includes(String(filter.value).toLowerCase());
            case 'greaterThan':
              return typeof value === 'number' && value > Number(filter.value);
            case 'lessThan':
              return typeof value === 'number' && value < Number(filter.value);
            case 'between':
              if (filter.field === 'created_at' || filter.field === 'updated_at') {
                const date = new Date(String(value));
                const startDate = filter.value.start instanceof Date ? filter.value.start : new Date(filter.value.start);
                const endDate = filter.value.end instanceof Date ? filter.value.end : new Date(filter.value.end);
                return date >= startDate && date <= endDate;
              }
              return false;
            default:
              return true;
          }
        });
      });
    }
    
    return filtered;
  }, [processedRows, searchTerm, activeFilters]);

  // Handle search from ContentCard
  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  // Handle view change from ContentCard
  const handleViewChange = (newView: 'list' | 'grid') => {
    setView(newView);
  };

  // Handle date filter change from ContentCard
  const handleDateFilterChange = (start: Date | null, end: Date | null) => {
    setDateRange({ start, end });
    // Apply date filtering logic here if needed
  };

  // Handle filter change from ContentCard
  const handleFilterChange = (filters: FilterState[]) => {
    setActiveFilters(filters);
  };

  // Handle pagination change
  const handlePaginationModelChange = (model: any) => {
    setPaginationModel(model);
  };

  // Handle tab change
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    
    // Apply filter based on tab
    if (newTab === 'all') {
      // Remove any status filter
      setActiveFilters(activeFilters.filter(filter => filter.field !== 'is_active'));
    } else if (newTab === 'active') {
      // Add or update status filter to show only active
      const newFilters = activeFilters.filter(filter => filter.field !== 'is_active');
      newFilters.push({
        field: 'is_active',
        operator: 'equals',
        value: true  // Use boolean true instead of string
      });
      setActiveFilters(newFilters);
    } else if (newTab === 'inactive') {
      // Add or update status filter to show only inactive
      const newFilters = activeFilters.filter(filter => filter.field !== 'is_active');
      newFilters.push({
        field: 'is_active',
        operator: 'equals',
        value: false  // Use boolean false instead of string
      });
      setActiveFilters(newFilters);
    }
  };

  const handleEdit = (id: number) => {
    router.push(`/Masters/pricing/customer-groups/edit/${id}`);
  };

  const handleDelete = (id: number) => {
    setConfirmDelete({ open: true, id });
  };

  const confirmDeleteAction = () => {
    if (confirmDelete.id) {
      deleteCustomerGroup(confirmDelete.id, {
        onSuccess: () => {
          showSuccess(t('Customer Group Deleted Successfully'));
          setConfirmDelete({ open: false, id: null });
        },
        onError: (error) => {
          console.error('Error deleting customer group:', error);
          showError(t('pricing.customerGroup.deleteError', 'Error deleting customer group'));
          setConfirmDelete({ open: false, id: null });
        }
      });
    }
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
 
    { field: 'name', headerName: "Group Name", flex: 1 },
    { field: 'code', headerName: "Code", width: 100 },
    { field: 'description', headerName: "Description", width: 200 },
    { 
      field: 'is_active', 
      headerName: "Status", 
      width: 100,
      renderCell: (params) => {
        const isActive = params.value as boolean;
        let status = isActive ? 'Active' : 'Inactive';
        let textColor = isActive ? '#00a854' : '#f44336'; // Green for Active, Red for Inactive
        
        return (
          <Box sx={{ 
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start'
          }}>
            <Typography variant="body2" sx={{ color: textColor, fontWeight: 500 }}>
              {status}
            </Typography>
          </Box>
        );
      }
    },
    { 
      field: 'formattedCreatedAt', 
      headerName: "Created At", 
      width: 150
    },
    { 
      field: 'createdByUsername', 
      headerName: "Created By", 
      width: 120
    },
    { 
      field: 'formattedUpdatedAt', 
      headerName: "Updated At", 
      width: 150
    },
    { 
      field: 'updatedByUsername', 
      headerName: "Updated By", 
      width: 120
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams<ProcessedCustomerGroup>) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Edit">
            <IconButton
              size="small"
              color="primary"
              onClick={() => handleEdit(params.row.id)}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              onClick={() => handleDelete(params.row.id)}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )
    },
  ];

  // Define filter options
  const filterOptions = [
    {
      field: 'name',
      label: t('name'),
      type: 'text' as const
    },
    {
      field: 'code',
      label: t('code'),
      type: 'text' as const
    },
    {
      field: 'is_active',
      label: t('status'),
      type: 'boolean' as const
    },
    {
      field: 'created_at',
      label: t('createdAt'),
      type: 'date' as const
    },
    {
      field: 'updated_at',
      label: t('updatedAt'),
      type: 'date' as const
    }
  ];

  // Define column options for visibility control
  const columnOptions = columns.map(col => ({
    field: col.field,
    headerName: col.headerName as string
  }));

  // Define tab options
  const tabOptions = [
    { 
      value: 'all', 
      label: t('all'), 
      count: processedRows.length 
    },
    { 
      value: 'active', 
      label: t('active'), 
      count: processedRows.filter(row => row.is_active).length 
    },
    { 
      value: 'inactive', 
      label: t('inactive'), 
      count: processedRows.filter(row => !row.is_active).length 
    }
  ];

  if (isLoading) return <Loader />;

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error" variant="h6">
          {t('error.loading', 'Error loading data. Please try again.')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box >
  
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          {t('Customer Groups')}
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={() => router.push('/Masters/pricing/customer-groups/add')}
        >
          {t('add', 'Add')}
        </Button>
      </Box>

      <ContentCard 
        onSearch={handleSearch}
        onViewChange={handleViewChange}
        onFilterChange={handleFilterChange}
        onColumnsChange={setVisibleColumns}
        onTabChange={handleTabChange}
        filterOptions={filterOptions}
        columnOptions={columnOptions}
        tabOptions={tabOptions}
      >
        {view === 'list' ? (
          <CustomDataGrid
            rows={processedRows}
            columns={columns.filter(col => visibleColumns.includes(col.field))}
            paginationModel={paginationModel}
            onPaginationModelChange={(model) => {
              setPaginationModel(model);
              handlePaginationModelChange(model);
            }}
            pageSizeOptions={[5, 10, 25]}
            checkboxSelection={true}
            disableRowSelectionOnClick
            autoHeight
            loading={isLoading}
            rowCount={data?.count || 0}
          />
        ) : (
          // Grid view can be implemented here
          <Box sx={{ p: 3 }}>
            <Typography variant="body1" color="text.secondary" align="center">
              Grid view is not implemented yet
            </Typography>
          </Box>
        )}
      </ContentCard>

      <ConfirmDialog
        open={confirmDelete.open}
        title={t('Delete Customer Group')}
        content={t('Delete Customer Group Confirmation')}
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete({ open: false, id: null })}
        isLoading={isDeleting}
      />

      <Notification
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={hideNotification}
      />
    </Box>
  );
}
