'use client';

import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Chip, IconButton } from '@mui/material';
import { GridRenderCellParams } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useRouter, useParams } from 'next/navigation';
import ContentCard from "../../../../components/common/ContentCard";
import CustomDataGrid from "../../../../components/common/CustomDataGrid";
import AnimatedDrawer from "../../../../components/common/AnimatedDrawer";
import PaymentGatewayForm from "../../../../components/TenantAdmin/payment_services/PaymentGatewayForm";
import { DrawerProvider } from "../../../../contexts/DrawerContext";
import { getPaymentGateways, getPaymentGateway, createPaymentGateway, updatePaymentGateway, PaymentGateway } from "../../../../services/paymentGatewayService";
import { formatDateTime } from '../../../../utils/dateUtils';

const PaymentGatewayPage = () => {
  const router = useRouter();
  const params = useParams();
  const tenantSlug  = params.tenant as string;

  // Payment gateways data state
  const [paymentGateways, setPaymentGateways] = useState<PaymentGateway[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });
  const [rowCount, setRowCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit' | 'view'>('view');
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);
  const [formData, setFormData] = useState<Partial<PaymentGateway>>({});

  useEffect(() => {
    fetchPaymentGateways();
  }, []);

  const fetchPaymentGateways = async () => {
    try {
      setLoading(true);
      const response = await getPaymentGateways(tenantSlug);
      setPaymentGateways(response.results);
      setRowCount(response.count);
    } catch (error) {
      console.error('Error fetching payment gateways:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleViewChange = (view: 'list' | 'grid') => {
    setViewMode(view);
  };

  const handleAddNew = () => {
    setDrawerMode('add');
    setSelectedGateway(null);
    setFormData({});
    setDrawerOpen(true);
  };

  const handleEdit = async (id: number) => {
    setLoading(true);
    try {
      const gateway = await getPaymentGateway(id.toString(), tenantSlug);
      setSelectedGateway(gateway);
      setFormData(gateway);
      setDrawerMode('edit');
      setDrawerOpen(true);
    } catch (error) {
      console.error('Error fetching payment gateway details:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleView = async (id: number) => {
    setLoading(true);
    try {
      const gateway = await getPaymentGateway(id.toString(), tenantSlug);
      setSelectedGateway(gateway);
      setFormData(gateway);
      setDrawerMode('view');
      setDrawerOpen(true);
    } catch (error) {
      console.error('Error fetching payment gateway details:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCloseDrawer = () => {
    // Reset to view mode first
    setDrawerMode('view');
    // Then close the drawer and clear the selection
    setDrawerOpen(false);
    setSelectedGateway(null);
    setFormData({});
  };
  
  const handleFormChange = (data: Partial<PaymentGateway>) => {
    setFormData(data);
  };
  
  const handleSave = async () => {
    setLoading(true);
    try {
      if (drawerMode === 'add') {
        await createPaymentGateway(formData as Omit<PaymentGateway, 'id'>, tenantSlug);
      } else if (drawerMode === 'edit' && selectedGateway) {
        await updatePaymentGateway(selectedGateway.id.toString(), formData, tenantSlug);
      }
      
      // Refresh the data
      await fetchPaymentGateways();
      
      // Close the drawer
      handleCloseDrawer();
      
    } catch (error) {
      console.error('Error saving payment gateway:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { 
      field: 'gateway_name', 
      headerName: 'Gateway Name', 
      flex: 1 
    },
    { 
      field: 'merchant_id', 
      headerName: 'Merchant ID', 
      width: 150 
    },
    { 
      field: 'mdr_percentage', 
      headerName: 'MDR (%)', 
      width: 100 
    },
    { 
      field: 'mdr_fixed_fee', 
      headerName: 'Fixed Fee', 
      width: 100 
    },
    { 
      field: 'is_active', 
      headerName: 'Status', 
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip 
          label={params.value ? 'Active' : 'Inactive'} 
          color={params.value ? 'success' : 'default'} 
          size="small" 
          variant="outlined"
        />
      )
    },
    { 
      field: 'created_at', 
      headerName: 'Created At', 
      width: 180,
    },
    { 
      field: 'updated_at', 
      headerName: 'Updated At', 
      width: 180,
    }
  ];

  const columnOptions = columns.map((column) => ({
    field: column.field,
    headerName: column.headerName,
    hide: false,
  }));

  const tabOptions = [
    { value: 'all', label: 'All', count: rowCount },
    { 
      value: 'active', 
      label: 'Active', 
      count: paymentGateways.filter(gateway => gateway.is_active).length 
    },
    { 
      value: 'inactive', 
      label: 'Inactive', 
      count: paymentGateways.filter(gateway => !gateway.is_active).length 
    },
  ];

  return (
    <DrawerProvider>
      <Box sx={{ width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
          <Typography variant="h4" component="h1">Payment Gateways</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddNew}
          >
            Add New
          </Button>
        </Box>
        
        <ContentCard
          onSearch={handleSearch}
          onViewChange={handleViewChange}
          filterOptions={[
            { field: 'gateway_name', label: 'Gateway Name', type: 'text' },
            { field: 'is_active', label: 'Status', type: 'boolean' },
          ]}
        >
          <CustomDataGrid
            rows={paymentGateways}
            columns={columns}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            onRowClick={(params) => {
              // Explicitly set view mode and ensure other states are reset
              setDrawerMode('view');
              handleView(params.row.id);
            }}
            pageSizeOptions={[5, 10, 20]}
            rowCount={rowCount}
            paginationMode="server"
            autoHeight
            getRowId={(row) => row.id}
            viewMode={viewMode}
            disableRowSelectionOnClick
            loading={loading}
          />
        </ContentCard>

        {/* AnimatedDrawer Component */}
        <AnimatedDrawer
          open={drawerOpen}
          onClose={handleCloseDrawer}
          title={drawerMode === 'add' ? 'Add New Payment Gateway' : drawerMode === 'edit' ? 'Edit Payment Gateway' : 'Payment Gateway Details'}
          onSave={drawerMode !== 'view' ? handleSave : undefined}
          saveDisabled={loading}
          initialWidth={550}
          expandedWidth={550}
          disableBackdropClick={drawerMode !== 'view'} // Only allow backdrop click to close for view mode
          sidebarIcons={
            drawerMode === 'add' ? [] : [
              {
                id: 'view',
                icon: <VisibilityIcon />,
                tooltip: 'View',
                onClick: () => {
                  setDrawerMode('view');
                }
              },
              {
                id: 'edit',
                icon: <EditIcon />,
                tooltip: 'Edit',
                onClick: () => {
                  setDrawerMode('edit');
                }
              }
            ]
          }
        >
          {/* Form content */}
          <PaymentGatewayForm 
            initialValues={formData}
            onFormChange={handleFormChange}
            tenantSlug={tenantSlug}
            readOnly={drawerMode === 'view'}
          />
        </AnimatedDrawer>
      </Box>
    </DrawerProvider>
  );
};

export default PaymentGatewayPage;
