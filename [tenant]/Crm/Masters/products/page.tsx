'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { 
  Box, Typography, Button, Tooltip, IconButton,
  Stack, Chip, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, Alert, Snackbar
} from '@mui/material';
import { 
  DataGrid, GridColDef, GridRenderCellParams,
  GridActionsCellItem, GridSortModel
} from '@mui/x-data-grid';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

// Import hooks and components
import { useFetchProducts, useDeleteProduct } from '@/app/hooks/api/products';
import { useFetchCategories } from '@/app/hooks/api/catalogue';
import { ProductType } from '@/app/types/products';
import Loader from '@/app/components/common/Loader';
import Notification from '@/app/components/common/Notification';
import useNotification from '@/app/hooks/useNotification';
import { formatDateTime } from '@/app/utils/dateUtils';
import CustomDataGrid from '@/app/components/common/CustomDataGrid';
import ContentCard from '@/app/components/common/ContentCard';
import ConfirmDialog from '@/app/components/common/ConfirmDialog';
import { useProductContext } from '@/app/contexts/ProductContext';

// Types and Interfaces
interface FilterOption {
  field: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number';
  options?: { value: any; label: string; }[];
}

interface TabOption {
  value: string;
  label: string;
  count: number;
}

interface ColumnOption {
  field: string;
  headerName: string;
}

interface FilterState {
  field: keyof ProcessedProduct;
  value: string;
  type: 'text' | 'select' | 'date' | 'number';
}

interface ProductListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ProductListItem[];
}

interface ProductListItem {
  id: number;
  name: string;
  sku: string;
  product_type: string;
  display_price: number;
  currency_code: string;
  is_active: boolean;
  pre_order_available: boolean;
  pre_order_date: string | null;
  created_at: string;
  updated_at: string;
  category_details: { name: string } | null;
  subcategory_details: { name: string } | null;
  division_details: { name: string } | null;
  uom_details: { name: string } | null;
  productstatus_details: { name: string } | null;
  created_by_details: { username: string } | null;
  updated_by_details: { username: string } | null;
}

interface ProcessedProduct extends ProductListItem {
  categoryName: string;
  subcategoryName: string;
  divisionName: string;
  uomName: string;
  productStatus: string;
  status: string;
  isPreOrderText: string;
  formattedPrice: string;
  createdByUsername: string;
  updatedByUsername: string;
  formattedCreatedAt: string;
  formattedUpdatedAt: string;
}

interface PaginationModel {
  page: number;
  pageSize: number;
}

// Constants
const productTypeOptions = [
  { value: ProductType.REGULAR, label: 'Regular' },
  { value: ProductType.PARENT, label: 'Parent' },
  { value: ProductType.VARIANT, label: 'Variant' },
  { value: ProductType.KIT, label: 'Kit' }
];

const filterOptions: FilterOption[] = [
  { field: 'name', label: 'Product Name', type: 'text' },
  { field: 'sku', label: 'Product SKU', type: 'text' },
  { field: 'product_type', label: 'Product Type', type: 'select', options: productTypeOptions },
  { field: 'categoryName', label: 'Category', type: 'text' },
  { field: 'subcategoryName', label: 'Subcategory', type: 'text' },
  { field: 'divisionName', label: 'Division', type: 'text' },
  { field: 'uomName', label: 'UOM', type: 'text' },
  { field: 'productStatus', label: 'Product Status', type: 'text' },
  { field: 'status', label: 'Status', type: 'text' },
  { field: 'currency_code', label: 'Currency', type: 'text' },
  { field: 'display_price', label: 'Price', type: 'number' },
  { field: 'compare_at_price', label: 'Compare Price', type: 'number' },
  { field: 'quantity_on_hand', label: 'Stock', type: 'number' },
  { field: 'is_active', label: 'Active', type: 'select', options: [
    { value: 'true', label: 'Yes' },
    { value: 'false', label: 'No' }
  ]},
  { field: 'pre_order_available', label: 'Pre-Order', type: 'select', options: [
    { value: 'true', label: 'Yes' },
    { value: 'false', label: 'No' }
  ]},
  { field: 'pre_order_date', label: 'Pre-Order Date', type: 'date' },
  { field: 'createdByUsername', label: 'Created By', type: 'text' },
  { field: 'updatedByUsername', label: 'Updated By', type: 'text' },
  { field: 'formattedCreatedAt', label: 'Created At', type: 'date' },
  { field: 'formattedUpdatedAt', label: 'Updated At', type: 'date' }
];

const columnOptions: ColumnOption[] = [
  { field: 'name', headerName: 'Product Name' },
  { field: 'sku', headerName: 'Product SKU' },
  { field: 'product_type', headerName: 'Product Type' },
  { field: 'categoryName', headerName: 'Product Category' },
  { field: 'subcategoryName', headerName: 'Product Subcategory' },
  { field: 'divisionName', headerName: 'Product Division' },
  { field: 'uomName', headerName: 'Product UOM' },
  { field: 'productStatus', headerName: 'Product Status' },
  { field: 'status', headerName: 'Status' },
  { field: 'currency_code', headerName: 'Product Currency' },
  { field: 'display_price', headerName: 'Product Price' },
  { field: 'compare_at_price', headerName: 'Product Compare Price' },
  { field: 'quantity_on_hand', headerName: 'Product Stock' },
  { field: 'is_active', headerName: 'Product Active' },
  { field: 'pre_order_available', headerName: 'Product Pre Order' },
  { field: 'pre_order_date', headerName: 'Product Pre Order Date' },
  { field: 'createdByUsername', headerName: 'Created By' },
  { field: 'formattedCreatedAt', headerName: 'Created At' },
  { field: 'updatedByUsername', headerName: 'Updated By' },
  { field: 'formattedUpdatedAt', headerName: 'Updated At' },
  { field: 'actions', headerName: 'Actions' }
];

const tabOptions: TabOption[] = [
  { value: 'all', label: 'All', count: 0 },
  { value: 'active', label: 'Active', count: 0 },
  { value: 'inactive', label: 'Inactive', count: 0 }
];

const formatPrice = (price: number, currencyCode: string) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currencyCode || 'INR'
  }).format(price || 0)
}

const processRows = (data: ProductListItem[]): ProcessedProduct[] => {
  return data
    .map((item) => ({
      ...item,
      categoryName: item.category_details?.name || 'N/A',
      subcategoryName: item.subcategory_details?.name || 'N/A',
      divisionName: item.division_details?.name || 'N/A',
      uomName: item.uom_details?.name || 'N/A',
      productStatus: item.productstatus_details?.name || 'N/A',
      status: item.is_active ? 'Active' : 'Inactive',
      isPreOrderText: item.pre_order_available ? 'Yes' : 'No',
      formattedPrice: formatPrice(item.display_price, item.currency_code),
      createdByUsername: item.created_by_details?.username || 'N/A',
      updatedByUsername: item.updated_by_details?.username || 'N/A',
      formattedCreatedAt: dayjs(item.created_at).format('YYYY-MM-DD HH:mm:ss'),
      formattedUpdatedAt: dayjs(item.updated_at).format('YYYY-MM-DD HH:mm:ss')
    }))
    .sort((a, b) => {
      // First sort by updated_at in descending order
      const dateComparison = dayjs(b.updated_at).unix() - dayjs(a.updated_at).unix();
      if (dateComparison !== 0) return dateComparison;
      
      // If updated_at is the same, sort by id in descending order
      return b.id - a.id;
    });
};

export default function ProductsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const tenant = params.tenant as string;
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  const { setSelectedProductId } = useProductContext();
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [activeTab, setActiveTab] = useState('active');
  const [activeFilters, setActiveFilters] = useState<FilterState[]>([]);
  const [paginationModel, setPaginationModel] = useState<PaginationModel>({
    page: 0,
    pageSize: 50
  });
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    columnOptions.map(col => col.field)
  );
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    id: number | null;
  }>({
    open: false,
    id: null
  });

  // API hooks
  const {
    data: productsData,
    isPending: isLoading,
    isError,
    error,
    refetch
  } = useFetchProducts({
    search: searchTerm,
    page: paginationModel.page + 1, // Convert from 0-based to 1-based for API
    pageSize: paginationModel.pageSize,
  });

  // Delete product mutation
  const { mutate: deleteProduct, isPending: isDeleting } = useDeleteProduct();

  // Process data to add username fields directly and format dates
  const processedRows = useMemo(() => {
    if (!productsData) return [];
    
    // Handle both array response and paginated response structure
    const products = Array.isArray(productsData) ? productsData : productsData.results || [];
    
    // Cast products to our local ProductListItem type since we know the shape matches
    return processRows(products as unknown as ProductListItem[]);
  }, [productsData]);

  // Calculate tab counts
  const tabCounts = useMemo(() => {
    const total = productsData?.count || 0; // Ensure it's always a number
    const active = processedRows.filter(row => row.is_active).length;
    const inactive = processedRows.filter(row => !row.is_active).length;
    
    return {
      all: total,
      active,
      inactive
    };
  }, [processedRows, productsData?.count]);

  // Update tab options with counts
  const currentTabOptions = useMemo(() => {
    return tabOptions.map(tab => ({
      ...tab,
      count: tabCounts[tab.value as keyof typeof tabCounts] || 0 // Ensure count is always a number
    }));
  }, [tabCounts]);

  // Filter data based on search term, filters and active tab
  const filteredRows = useMemo(() => {
    return processedRows.filter(row => {
      // First check active tab
      if (activeTab === 'active' && !row.is_active) return false;
      if (activeTab === 'inactive' && row.is_active) return false;

      // Then check if row matches all active filters
      const matchesFilters = activeFilters.every(filter => {
        const value = row[filter.field];
        const filterValue = filter.value;

        if (!filterValue) return true;

        switch (filter.type) {
          case 'text':
            return value?.toString().toLowerCase().includes(filterValue.toLowerCase());
          
          case 'select':
            // Handle boolean values stored as strings
            if (filter.field === 'is_active' || filter.field === 'pre_order_available') {
              return value === (filterValue === 'true');
            }
            return value === filterValue;
          
          case 'number':
            const numValue = parseFloat(filterValue);
            return !isNaN(numValue) && value === numValue;
          
          case 'date':
            if (!value) return false;
            const filterDate = dayjs(filterValue).startOf('day');
            const rowDate = dayjs(value.toString()).startOf('day');
            return filterDate.isSame(rowDate);
          
          default:
            return true;
        }
      });

      // Check if row matches search term
      if (!searchTerm) return matchesFilters;

      // Search in all text fields
      type SearchableField = keyof Pick<ProcessedProduct, 
        | 'name' 
        | 'sku' 
        | 'product_type' 
        | 'categoryName' 
        | 'subcategoryName'
        | 'divisionName' 
        | 'uomName' 
        | 'productStatus' 
        | 'status'
        | 'currency_code'
        | 'createdByUsername' 
        | 'updatedByUsername'
      >;

      const searchableFields: SearchableField[] = [
        'name', 'sku', 'product_type', 'categoryName', 'subcategoryName',
        'divisionName', 'uomName', 'productStatus', 'status', 'currency_code',
        'createdByUsername', 'updatedByUsername'
      ];

      const matchesSearch = searchableFields.some(field => 
        row[field]?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      );

      return matchesFilters && matchesSearch;
    });
  }, [processedRows, activeFilters, searchTerm, activeTab]);

  // Event Handlers
  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleViewChange = (newView: 'list' | 'grid') => {
    setView(newView);
  };

  const handleFilterChange = (filters: FilterState[]) => {
    setActiveFilters(filters.map(filter => ({
      field: filter.field,
      value: filter.value,
      type: filter.type || 'text' // Default to text if type is not provided
    })));
  };

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
  };

  const handleDelete = (id: number) => {
    setConfirmDelete({ open: true, id });
  };

  const confirmDeleteAction = async () => {
    if (confirmDelete.id) {
      try {
        await deleteProduct(confirmDelete.id);
        showSuccess(t('products.deleteSuccess'));
        refetch();
      } catch (error) {
        showError(t('products.deleteError'));
      }
    }
    setConfirmDelete({ open: false, id: null });
  };

  // DataGrid columns definition
  const columns: GridColDef<ProcessedProduct>[] = [
    { 
      field: 'id', 
      headerName: t('productId'), 
      width: 70 
    },
    { 
      field: 'name', 
      headerName: t('productName'), 
      width: 200,
      flex: 1,
    },
    { 
      field: 'sku', 
      headerName: t('productSku'), 
      width: 120 
    },
    { 
      field: 'product_type', 
      headerName: t('productType'), 
      width: 120,
    },
    { 
      field: 'categoryName', 
      headerName: t('productCategory'), 
      width: 150,
    },
    { 
      field: 'subcategoryName', 
      headerName: t('productSubcategory'), 
      width: 150,
    },
    { 
      field: 'divisionName', 
      headerName: t('productDivision'), 
      width: 150,
    },
    { 
      field: 'uomName', 
      headerName: t('productUom'), 
      width: 100,
    },
    { 
      field: 'productStatus', 
      headerName: t('ProductStatus'), 
      width: 130,
    },
    { 
      field: 'status', 
      headerName: t('Status'), 
      width: 130,
    },
    { 
      field: 'currency_code', 
      headerName: t('productCurrency'), 
      width: 100
    },
    { 
      field: 'formattedPrice', 
      headerName: t('productPrice'), 
      width: 120,
    },
    { 
      field: 'compare_at_price', 
      headerName: t('productComparePrice'), 
      width: 120,
    },
    { 
      field: 'quantity_on_hand', 
      headerName: t('productStock'), 
      width: 100,
      type: 'number'
    },
    { 
      field: 'isPreOrderText', 
      headerName: t('productPreOrder'), 
      width: 120,
      renderCell: (params) => (
        <Chip 
          label={params.row.isPreOrderText}
          color={params.row.pre_order_available ? 'info' : 'default'}
          size="small"
        />
      )
    },
    { 
      field: 'pre_order_date', 
      headerName: t('productPreOrderDate'), 
      width: 150,
    },
    { 
      field: 'createdByUsername', 
      headerName: t('createdBy'), 
      width: 130,
    },
    { 
      field: 'formattedCreatedAt', 
      headerName: t('createdAt'), 
      width: 180,
    },
    { 
      field: 'updatedByUsername', 
      headerName: t('updatedBy'), 
      width: 130,
    },
    { 
      field: 'formattedUpdatedAt', 
      headerName: t('updatedAt'), 
      width: 180,
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: t('actions.actions'),
      width: 100,
      getActions: (params) => [
        <GridActionsCellItem
          key="delete"
          icon={<DeleteIcon />}
          label={t('common.delete')}
          onClick={() => setConfirmDelete({ open: true, id: Number(params.id) })}
        />
      ]
    }
  ];

  return (
    <Box >
      {/* Header */}
      <Stack 
        direction="row" 
        justifyContent="space-between" 
        alignItems="center" 
        sx={{ mb: 3 }}
      >
        <Typography variant="h4" component="h1">
          {t('Products')}
        </Typography>
        <Button
          component={Link}
          href={`/${tenant}/Crm/Masters/products/add`}
          variant="contained"
          startIcon={<AddIcon />}
        >
          {t('addProduct')}
        </Button>
      </Stack>

      {/* Error message */}
      {isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error instanceof Error ? error.message : t('common.errorOccurred')}
        </Alert>
      )}

      {/* Content Card with Search and Filters */}
      <ContentCard 
        onSearch={handleSearch}
        onViewChange={handleViewChange}
        onFilterChange={handleFilterChange as any} // TODO: Fix type in ContentCard component
        onColumnsChange={setVisibleColumns}
        onTabChange={handleTabChange}
        filterOptions={filterOptions}
        columnOptions={columnOptions}
        tabOptions={currentTabOptions}
      >
        {view === 'list' ? (
          <CustomDataGrid
            rows={filteredRows}
            columns={columns.filter(col => visibleColumns.includes(col.field))}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[5, 10, 25 ,50]}
            checkboxSelection={true}
            disableRowSelectionOnClick={false}
            autoHeight
            loading={isLoading}
            // Server-side pagination properties
            rowCount={productsData?.count || 0}
            paginationMode="server"
            onRowClick={(params) => {
              console.log('Row clicked:', params.row);
              setSelectedProductId(params.row.id);
              router.push(`/${tenant}/Crm/Masters/products/edit`);
            }}
          />
        ) : (
          // Grid view can be implemented here
          <Box sx={{ p: 3 }}>
            <Typography variant="body1" color="text.secondary" align="center">
              {t('gridViewNotImplemented')}
            </Typography>
          </Box>
        )}
      </ContentCard>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
            open={confirmDelete.open}
            title={t('deleteProduct')}
            content={t('deleteProductConfirm')}
            onConfirm={confirmDeleteAction}
            onCancel={() => setConfirmDelete({ open: false, id: null })}
            isLoading={isDeleting}
      />

      {/* Notification */}
      <Notification
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={() => hideNotification()}
      />
    </Box>
  );
}
