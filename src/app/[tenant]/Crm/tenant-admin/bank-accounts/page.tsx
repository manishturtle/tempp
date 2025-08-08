"use client";

import React, { useState, useEffect } from 'react';
import { Box, Button, IconButton, Typography, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { GridColDef } from '@mui/x-data-grid';
import { useRouter, useParams } from 'next/navigation';
import ContentCard from '../../../../components/common/ContentCard';
import CustomDataGrid from '../../../../components/common/CustomDataGrid';
import AnimatedDrawer from '../../../../components/common/AnimatedDrawer';
import BankAccountForm from '../../../../components/TenantAdmin/payment_services/BankAccountForm';
import { DrawerProvider } from '../../../../contexts/DrawerContext';
import { getBankAccounts, getBankAccount, createBankAccount, updateBankAccount, BankAccount } from '../../../../services/bankAccountService';

const BankAccountsPage = () => {
  const router = useRouter();
  const params = useParams();
  const tenantSlug  = params.tenant as string;

  // Bank accounts data state
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
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
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [formData, setFormData] = useState<Partial<BankAccount>>({});

  useEffect(() => {
    fetchBankAccounts();
  }, []);

  const fetchBankAccounts = async () => {
    try {
      setLoading(true);
      const response = await getBankAccounts(tenantSlug);
      setBankAccounts(response.results);
      setRowCount(response.count);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (searchValue: string) => {
    setSearchTerm(searchValue);
    // If needed, implement filtering logic here or make API call with search param
  };

  const handleViewChange = (view: 'list' | 'grid') => {
    setViewMode(view);
  };

  const handleAddNew = () => {
    setDrawerMode('add');
    setSelectedAccount(null);
    setFormData({});
    setDrawerOpen(true);
  };

  const handleEdit = async (id: number) => {
    setLoading(true);
    try {
      const account = await getBankAccount(id.toString(), tenantSlug);
      setSelectedAccount(account);
      setFormData(account);
      setDrawerMode('edit');
      setDrawerOpen(true);
    } catch (error) {
      console.error('Error fetching bank account details:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleView = async (id: number) => {
    setLoading(true);
    try {
      const account = await getBankAccount(id.toString(), tenantSlug);
      setSelectedAccount(account);
      setFormData(account);
      setDrawerMode('view');
      setDrawerOpen(true);
    } catch (error) {
      console.error('Error fetching bank account details:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedAccount(null);
    setFormData({});
    setDrawerMode('view'); // Reset to view mode when closing
  };
  
  const handleFormChange = (data: Partial<BankAccount>) => {
    setFormData(data);
  };
  
  const handleSave = async () => {
    setLoading(true);
    try {
      if (drawerMode === 'add') {
        // Add client_id and company_id if needed from context
        await createBankAccount(formData as Omit<BankAccount, 'id'>, tenantSlug);
      } else if (drawerMode === 'edit' && selectedAccount) {
        await updateBankAccount(selectedAccount.id.toString(), formData, tenantSlug);
      }
      
      // Refresh the data
      await fetchBankAccounts();
      
      // Close the drawer
      handleCloseDrawer();
    } catch (error) {
      console.error('Error saving bank account:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns: GridColDef[] = [
    { 
      field: 'id', 
      headerName: 'ID', 
      width: 70 
    },
    { 
      field: 'bank_name', 
      headerName: 'Bank Name', 
      flex: 1 
    },
    { 
      field: 'account_holder_name', 
      headerName: 'Account Holder', 
      flex: 1 
    },
    { 
      field: 'account_number', 
      headerName: 'Account Number', 
      flex: 1 
    },
    { 
      field: 'ifsc_code', 
      headerName: 'IFSC Code', 
      flex: 1 
    },
    { 
      field: 'is_active', 
      headerName: 'Status', 
      width: 120,
      renderCell: (params) => (
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

  const columnOptions = columns.map((col) => ({
    field: col.field,
    headerName: col.headerName as string,
  }));

  const tabOptions = [
    { value: 'all', label: 'All', count: rowCount },
    { 
      value: 'active', 
      label: 'Active', 
      count: bankAccounts.filter(account => account.is_active).length 
    },
    { 
      value: 'inactive', 
      label: 'Inactive', 
      count: bankAccounts.filter(account => !account.is_active).length 
    },
  ];

  return (
    <DrawerProvider>
      <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Bank Accounts</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={handleAddNew}
        >
          Add New Account
        </Button>
      </Box>
      
      <ContentCard
        onSearch={handleSearch}
        onViewChange={handleViewChange}
        filterOptions={[
          { field: 'bank_name', label: 'Bank Name', type: 'text' },
          { field: 'account_holder_name', label: 'Account Holder', type: 'text' },
          { field: 'is_active', label: 'Status', type: 'boolean' },
        ]}
        columnOptions={columnOptions}
        tabOptions={tabOptions}
        activeTab="all"
      >
        <CustomDataGrid
          rows={bankAccounts}
          columns={columns}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          onRowClick={(params) => {
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
        title={drawerMode === 'add' ? 'Add New Bank Account' : drawerMode === 'edit' ? 'Edit Bank Account' : 'Bank Account Details'}
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
        <BankAccountForm 
          initialValues={formData}
          onFormChange={handleFormChange}
          readOnly={drawerMode === 'view'}
        />
      </AnimatedDrawer>
    </Box>
    </DrawerProvider>
  );
};

export default BankAccountsPage;
