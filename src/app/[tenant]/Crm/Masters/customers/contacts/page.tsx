"use client";

/**
 * Contacts List Page
 * 
 * Main page component for listing, filtering, and managing contacts
 */
import React, { useState, useCallback, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Link,
  Chip,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { DrawerProvider, useDrawer } from '@/app/contexts/DrawerContext';
import { ApiContact } from '@/app/types/customers';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ContentCard, { FilterOption, FilterState } from '@/app/components/common/ContentCard';
import CustomDataGrid from '@/app/components/common/CustomDataGrid';
import AnimatedDrawer from '@/app/components/common/AnimatedDrawer';
import { GridColDef, GridActionsCellItem, GridRowParams, GridSortModel, GridPaginationModel, GridRowSelectionModel, GridRenderCellParams } from '@mui/x-data-grid';
import { useFetchContacts } from '@/app/hooks/api/customers';
import { ContactForm, ContactFormData } from '@/app/components/admin/customers/forms/ContactForm';
import useNotification from '@/app/hooks/useNotification';

// Wrapper component that provides the DrawerContext
export default function ContactsPageWrapper() {
  return (
    <DrawerProvider>
      <ContactsPage />
    </DrawerProvider>
  );
}

// Main component for the contacts list page
function ContactsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { openDrawer, closeDrawer } = useDrawer();
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  
  // Form ref for submitting the form from outside
  const formRef = useRef<{ submitForm: () => void } | null>(null);
  
  // Local state for drawer management
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit' | 'view'>('add');
  const [isViewMode, setIsViewMode] = useState(false);
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>([]);
  
  // State for active sidebar item
  const [activeSidebarItem, setActiveSidebarItem] = useState<string>('view');
  
  // State for view filter, pagination, sorting, search
  const [viewFilter, setViewFilter] = useState<'my' | 'all'>('my');
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 50
  });
  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: 'last_name', sort: 'asc' }
  ]);
  
  // View and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'fullName', 'account_name', 'email', 'work_phone', 'owner_name', 'status', 'actions'
  ]);
  
  // State for selected contact (for edit/view mode)
  const [selectedContact, setSelectedContact] = useState<ContactFormData | null>(null);
  
  // Fetch contacts using the custom hook
  const {
    data: contactsData,
    isLoading,
    isError
  } = useFetchContacts({
    page: paginationModel.page + 1,
    page_size: paginationModel.pageSize,
    // owner_id: viewFilter === 'my' ? currentUser?.id : undefined,
    search: searchTerm || undefined,
    ordering: sortModel.length > 0 ?
      (sortModel[0].sort === 'desc' ? `-${sortModel[0].field}` : sortModel[0].field) :
      undefined
  });
  
  // Handler for view filter change
  const handleViewFilterChange = useCallback((event: React.MouseEvent<HTMLElement>, newFilter: 'my' | 'all') => {
    if (newFilter !== null) {
      setViewFilter(newFilter);
    }
  }, []);
  
  // Handler for search
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);
  
  // Handler for viewing a contact
  const handleView = useCallback((contact: ApiContact) => {
    // Convert ApiContact to ContactFormData
    const formData: ContactFormData = {
      id: contact.id,
      first_name: contact.first_name,
      last_name: contact.last_name || undefined,
      email: contact.email || undefined,
      secondary_email: contact.secondary_email || undefined,
      mobile_phone: contact.mobile_phone || undefined,
      work_phone: contact.work_phone || undefined,
      job_title: contact.job_title || undefined,
      department: contact.department || undefined,
      status: contact.status,
      owner: contact.owner?.id,
      description: contact.description || undefined,
      is_primary: contact.is_primary,
      email_opt_out: contact.email_opt_out,
      do_not_call: contact.do_not_call,
      sms_opt_out: contact.sms_opt_out,
      account_id: contact.account?.id
    };
    setSelectedContact(formData);
    setDrawerMode('view');
    setIsViewMode(true);
    setDrawerOpen(true);
    setActiveSidebarItem('view');
  }, []);
  
  // Handler for editing a contact
  const handleEdit = useCallback((contact: ApiContact) => {
    // Convert ApiContact to ContactFormData
    const formData: ContactFormData = {
      id: contact.id,
      first_name: contact.first_name,
      last_name: contact.last_name || undefined,
      email: contact.email || undefined,
      secondary_email: contact.secondary_email || undefined,
      mobile_phone: contact.mobile_phone || undefined,
      work_phone: contact.work_phone || undefined,
      job_title: contact.job_title || undefined,
      department: contact.department || undefined,
      status: contact.status,
      owner: contact.owner?.id,
      description: contact.description || undefined,
      is_primary: contact.is_primary,
      email_opt_out: contact.email_opt_out,
      do_not_call: contact.do_not_call,
      sms_opt_out: contact.sms_opt_out,
      account_id: contact.account?.id
    };
    setSelectedContact(formData);
    setDrawerMode('edit');
    setIsViewMode(false);
    setDrawerOpen(true);
  }, []);
  
  // Handler for creating a new contact
  const handleCreate = useCallback(() => {
    setSelectedContact(null);
    setDrawerMode('add');
    setIsViewMode(false);
    setDrawerOpen(true);
  }, []);
  
  // Handler for drawer close
  const handleDrawerClose = useCallback(() => {
    setSelectedContact(null);
    setDrawerOpen(false);
    setIsViewMode(false);
    setDrawerMode('add');
  }, []);
  
  // State for form submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Handler for contact form submission
  const handleContactFormSubmit = useCallback((data: ContactFormData) => {
    // Form submission is handled in the form component
    // Just close the drawer here
    setDrawerOpen(false);
    // Show success notification
    showSuccess(t('contactForm.saveSuccess'));
    // Invalidate queries to refetch data
    queryClient.invalidateQueries({ queryKey: ['contacts'] });
  }, [queryClient, showSuccess, t]);
  
  // Handle form save
  const handleSave = useCallback(() => {
    const submitButton = document.getElementById('contact-form-submit');
    if (submitButton) {
      submitButton.click();
    }
  }, []);
  
  // Sidebar icons for AnimatedDrawer
  const drawerSidebarIcons = [
    {
      id: 'view',
      icon: <VisibilityIcon />,
      tooltip: t('common.view'),
      onClick: () => {
        setIsViewMode(true);
        setDrawerMode('view');
        setActiveSidebarItem('view');
      }
    },
    {
      id: 'edit',
      icon: <EditIcon />,
      tooltip: t('common.edit'),
      onClick: () => {
        setIsViewMode(false);
        setDrawerMode('edit');
        setActiveSidebarItem('edit');
      }
    }
  ];
  
  // DataGrid column definitions
  const columns: GridColDef[] = [
    {
      field: 'fullName',
      headerName: t('contactFields.name'),
      flex: 1,
      valueGetter: (params: { row?: any }) => {
        try {
          if (!params || !params.row) return '';
          const row = params.row as ApiContact;
          return row.full_name || `${row.first_name || ''} ${row.last_name || ''}`.trim();
        } catch (error) {
          return '';
        }
      },
      renderCell: (params: { row?: any; value?: any }) => {
        try {
          if (!params || !params.row) return <Typography>N/A</Typography>;
          const row = params.row as ApiContact;
          const displayName = row.full_name || `${row.first_name || ''} ${row.last_name || ''}`.trim();
          
          return (
            <Link 
              component="button"
              sx={{ textAlign: 'left' }}
              onClick={() => handleView(row)}
            >
              {displayName || 'N/A'}
            </Link>
          );
        } catch (error) {
          return <Typography>N/A</Typography>;
        }
      }
    },
    {
      field: 'account_name',
      headerName: t('contactFields.accountName'),
      flex: 1,
      valueGetter: (params: { row?: any }) => {
        try {
          if (!params || !params.row) return '';
          const row = params.row as ApiContact;
          return row.account?.name || '';
        } catch (error) {
          return '';
        }
      },
      renderCell: (params: { row?: any; value?: any }) => {
        try {
          if (!params || !params.row) return <Typography>N/A</Typography>;
          const row = params.row as ApiContact;
          return row.account ? (
            <Link component={NextLink} href={`/Masters/customers/accounts/${row.account.id}`}>
              {row.account.name}
            </Link>
          ) : <Typography>N/A</Typography>;
        } catch (error) {
          return <Typography>N/A</Typography>;
        }
      }
    },
    {
      field: 'email',
      headerName: t('contactFields.email'),
      flex: 1.5,
      renderCell: (params: { row?: any; value?: any }) => {
        try {
          if (!params || !params.value) return <Typography></Typography>;
          return (
            <Link href={`mailto:${params.value}`}>{params.value}</Link>
          );
        } catch (error) {
          return <Typography></Typography>;
        }
      }
    },
    {
      field: 'work_phone',
      headerName: t('contactFields.workPhone'),
      width: 150,
      renderCell: (params: { row?: any; value?: any }) => {
        try {
          if (!params || !params.value) return <Typography></Typography>;
          return (
            <Link href={`tel:${params.value}`}>{params.value}</Link>
          );
        } catch (error) {
          return <Typography></Typography>;
        }
      }
    },
    {
      field: 'owner_name',
      headerName: t('contactFields.owner'),
      width: 150,
      valueGetter: (params: { row?: any }) => {
        try {
          if (!params || !params.row) return 'N/A';
          const row = params.row as ApiContact;
          return row.owner?.full_name || 'N/A';
        } catch (error) {
          return 'N/A';
        }
      },
      renderCell: (params: { row?: any; value?: any }) => {
        try {
          return <Typography variant="body2">{params.value || 'N/A'}</Typography>;
        } catch (error) {
          return <Typography variant="body2">N/A</Typography>;
        }
      }
    },
    {
      field: 'status',
      headerName: t('contactFields.status'),
      width: 100,
      renderCell: (params: { row?: any; value?: any }) => {
        try {
          return (
            <Chip 
              label={params.value || 'N/A'} 
              size="small"
              color={params.value === 'Active' ? 'success' : 'default'}
            />
          );
        } catch (error) {
          return <Chip label="N/A" size="small" />;
        }
      }
    }
  ];
  
  // Filter options for ContentCard
  const filterOptions: FilterOption[] = [
    {
      field: 'status',
      label: t('contactFields.status'),
      type: 'select',
      options: [
        { value: '', label: t('filterStatuses.all') },
        { value: 'Active', label: t('filterStatuses.active') },
        { value: 'Inactive', label: t('filterStatuses.inactive') }
      ]
    }
  ];
  
  // Column options for ContentCard
  const columnOptions = [
    { field: 'fullName', headerName: t('contactFields.name') },
    { field: 'account_name', headerName: t('contactFields.accountName') },
    { field: 'email', headerName: t('contactFields.email') },
    { field: 'work_phone', headerName: t('contactFields.workPhone') },
    { field: 'owner_name', headerName: t('contactFields.owner') },
    { field: 'status', headerName: t('contactFields.status') },
    { field: 'actions', headerName: t('common.actions.actions') }
  ];
  
  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          {t('contactList.title')}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ToggleButtonGroup
            value={viewFilter}
            exclusive
            onChange={handleViewFilterChange}
            aria-label="contact view filter"
            size="small"
          >
            <ToggleButton value="my" aria-label="my contacts">
              {t('contactList.myContacts')}
            </ToggleButton>
            <ToggleButton value="all" aria-label="all contacts">
              {t('contactList.allContacts')}
            </ToggleButton>
          </ToggleButtonGroup>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleCreate}
          >
            {t('contactList.newContactButton')}
          </Button>
        </Box>
      </Box>
      
      {/* Main Content */}
      <ContentCard
        onSearch={handleSearch}
        onViewChange={() => {}}
        onFilterChange={() => {}}
        onColumnsChange={setVisibleColumns}
        onTabChange={() => {}}
        filterOptions={filterOptions}
        columnOptions={columnOptions}
        tabOptions={[]}
      >
        <CustomDataGrid
          rows={contactsData?.results || []}
          columns={columns.filter(col => visibleColumns.includes(col.field))}
          rowCount={contactsData?.count || 0}
          loading={isLoading}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          paginationMode="server"
          checkboxSelection={true}
          disableRowSelectionOnClick={false}
          autoHeight
          getRowId={(row) => row.id}
          rowSelectionModel={rowSelectionModel}
          onRowSelectionModelChange={(newSelection) => {
            setRowSelectionModel(newSelection);
          }}
          onRowClick={(params) => {
            handleView(params.row as ApiContact);
          }}
        />
      </ContentCard>
      
      {/* Contact Form Drawer */}
      <AnimatedDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        title={
          isViewMode
            ? t('contactForm.viewTitle')
            : drawerMode === 'add'
            ? t('contactForm.createTitle')
            : t('contactForm.editTitle')
        }
        onSave={isViewMode ? undefined : handleSave}
        initialWidth={550}
        expandedWidth={550}
        sidebarIcons={drawerMode !== 'add' ? drawerSidebarIcons : undefined}
        defaultSidebarItem={drawerMode !== 'add' ? activeSidebarItem : undefined}
      >
        <ContactForm
          initialData={selectedContact || undefined}
          isViewMode={isViewMode}
          isSubmitting={isSubmitting}
          onSubmit={handleContactFormSubmit}
          onCancel={closeDrawer}
        />
      </AnimatedDrawer>
    </Box>
  );
}
