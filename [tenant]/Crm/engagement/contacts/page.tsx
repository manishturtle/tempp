'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { 
  Container, 
  Typography, 
  Box, 
  Button, 
  TextField,
  InputAdornment,
  IconButton,
  Menu,
  MenuItem,
  Snackbar,
  Alert,
  Paper,
  Tab,
  Tabs,
  Grid,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

import { GridColDef } from '@mui/x-data-grid';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useQueryClient } from '@tanstack/react-query';
import { useGetContacts, useDeleteContact, useCreateContact, useUpdateContact, useGetContactById, useUploadContactsFile, useBulkCreateContacts, useDownloadContacts } from '../../../../hooks/engagement/marketing/useContacts';
import { useDebounce } from '../../../../hooks/engagement/useDebounce';
import { Contact } from '../../../../types/engagement/marketing';
import { contactFormSchema } from '../../../../types/engagement/schemas';
import ConfirmDialog from '../../../../components/common/ConfirmDialog';
import CustomDataGrid from '../../../../components/common/CustomDataGrid';
import ContentCard from '../../../../components/common/ContentCard';
import AnimatedDrawer from '../../../../components/common/AnimatedDrawer';
// import CustomerUploadDialog from '../../../../components/common/CustomerUploadDialog';
import CustomerUploadDialog from '../../../../components/common/CustomerUploadDialog';
import { DrawerProvider } from '../../../../contexts/DrawerContext';
import ContactViewContent from '../../../../components/Engagement/marketing/contacts/ContactViewContent';

// Type for contact form values
type ContactFormValues = z.infer<typeof contactFormSchema>;

function ContactsPage() {
  const params = useParams();
  const router = useRouter();
  const tenant = params?.tenant as string;
  
  // State for pagination, search, and UI controls
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  // State for row selection
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  
  // State for contact actions
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Component state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [currentContact, setCurrentContact] = useState<Contact | null>(null);
  
  // Upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  
  // Get search params for handling edit from URL
  const searchParams = useSearchParams();
  const editContactId = searchParams.get('edit');
  
  // State for notifications
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });
  
  // Mutations for contact operations
  const createContactMutation = useCreateContact(tenant);
  const updateContactMutation = useUpdateContact(tenant);
  const { data: contactDetails, isLoading: isLoadingContactDetails } = useGetContactById(
    tenant, 
    selectedContactId !== null ? selectedContactId : undefined
  );

  // Fetch contacts data
  const { 
    data: contactsData, 
    isLoading, 
    isError, 
    error 
  } = useGetContacts(tenant, page + 1, debouncedSearchTerm);
  
  // Delete contact mutation
  const deleteContactMutation = useDeleteContact(tenant);
  
  // Upload contacts file mutation
  const uploadContactsFileMutation = useUploadContactsFile(tenant);
  
  // Download contacts mutation
  const downloadContactsMutation = useDownloadContacts(tenant);

  // Handle pagination change
  const handlePaginationModelChange = (model: { page: number, pageSize: number }) => {
    setPage(model.page);
    setPageSize(model.pageSize);
  };

  // Handle search change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0); // Reset to first page on search
  };

  // Handle menu open
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, contactId: number) => {
    setAnchorEl(event.currentTarget);
    setSelectedContactId(contactId);
  };

  // Handle menu close
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Handle create contact
  const handleCreateContact = () => {
    setEditMode(false);
    setCurrentContact(null);
    setDrawerOpen(true);
  };

  // Handle edit contact
  const handleEditContact = () => {
    if (selectedContactId) {
      setEditMode(true);
      setCurrentContact(contactDetails || null);
      setDrawerOpen(true);
    }
    handleMenuClose();
  };
  
  // Handle view contact details
  const handleViewContact = () => {
    if (selectedContactId) {
      setViewMode(true);
      setEditMode(false);
      setCurrentContact(contactDetails || null);
      setDrawerOpen(true);
    }
    handleMenuClose();
  };
  
  // Handle drawer close
  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setCurrentContact(null);
    setViewMode(false);
    setEditMode(false);
  };
  
  // We're now handling selection through the checkbox column

  // Handle download selected contacts
  const handleDownloadSelectedContacts = async () => {
    if (selectedRows.length === 0) {
      setSnackbar({
        open: true,
        message: 'Please select at least one contact to download',
        severity: 'warning',
      });
      return;
    }

    try {
      await downloadContactsMutation.mutateAsync(selectedRows);
      setSnackbar({
        open: true,
        message: `Downloading ${selectedRows.length} selected contact${selectedRows.length > 1 ? 's' : ''}`,
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Failed to download contacts: ${(error as Error)?.message || 'Unknown error'}`,
        severity: 'error',
      });
    }
  };
  
  // Handle download all contacts
  const handleDownloadAllContacts = async () => {
    try {
      await downloadContactsMutation.mutateAsync([]);  // Pass empty array to download all contacts
      setSnackbar({
        open: true,
        message: 'Downloading all contacts',
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Failed to download contacts: ${(error as Error)?.message || 'Unknown error'}`,
        severity: 'error',
      });
    }
  };
  
  // Handle form submission
  const handleFormSubmit = async (data: ContactFormValues) => {
    try {
      if (editMode && currentContact?.id) {
        await updateContactMutation.mutateAsync({
          contactId: currentContact.id,
          data: data
        });
        setSnackbar({
          open: true,
          message: 'Contact updated successfully',
          severity: 'success',
        });
      } else {
        await createContactMutation.mutateAsync(data);
        setSnackbar({
          open: true,
          message: 'Contact created successfully',
          severity: 'success',
        });
      }
      setDrawerOpen(false);
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Failed to ${editMode ? 'update' : 'create'} contact: ${(error as Error)?.message || 'Unknown error'}`,
        severity: 'error',
      });
    }
  };

  // Handle delete click
  const handleDeleteClick = () => {
    handleMenuClose();
    setDeleteDialogOpen(true);
  };

  // Handle confirm delete
  const handleConfirmDelete = async () => {
    if (selectedContactId) {
      try {
        await deleteContactMutation.mutateAsync(selectedContactId);
        setSnackbar({
          open: true,
          message: 'Contact deleted successfully',
          severity: 'success',
        });
      } catch (error) {
        setSnackbar({
          open: true,
          message: `Failed to delete contact: ${(error as Error)?.message || 'Unknown error'}`,
          severity: 'error',
        });
      }
    }
    setDeleteDialogOpen(false);
  };

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Column definitions for the data grid
  const columns: GridColDef[] = [
    {
      field: 'selection',
      headerName: '',
      width: 60,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderHeader: () => {
        const currentPageIds = contactsData?.results ? contactsData.results.map(contact => contact.id) : [];
        const allSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedRows.includes(id));
        
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <Checkbox
              size="small"
              checked={allSelected}
              indeterminate={currentPageIds.some(id => selectedRows.includes(id)) && !allSelected}
              onChange={() => {
                if (allSelected) {
                  // Deselect all on current page
                  setSelectedRows(selectedRows.filter(id => !currentPageIds.includes(id)));
                } else {
                  // Select all on current page
                  const newSelectedRows = [...selectedRows];
                  currentPageIds.forEach(id => {
                    if (!newSelectedRows.includes(id)) {
                      newSelectedRows.push(id);
                    }
                  });
                  setSelectedRows(newSelectedRows);
                }
              }}
              sx={{
                '&.Mui-checked': { color: '#1976d2' },
                '&.MuiCheckbox-indeterminate': { color: '#1976d2' }
              }}
            />
          </Box>
        );
      },
      renderCell: (params) => {
        const isSelected = selectedRows.includes(params.row.id);
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <Checkbox
              size="small"
              checked={isSelected}
              onChange={() => {
                if (isSelected) {
                  setSelectedRows(selectedRows.filter(id => id !== params.row.id));
                } else {
                  setSelectedRows([...selectedRows, params.row.id]);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              sx={{
                '&.Mui-checked': { color: '#1976d2' }
              }}
            />
          </Box>
        );
      },
    },
    {
      field: 'email_address',
      headerName: 'Email',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Typography variant="body2">
          {params.value || '-'}
        </Typography>
      ),
    },
    {
      field: 'email_validation_status',
      headerName: 'Email Status',
      flex: 1,
      minWidth: 120,
      renderCell: (params) => {
        let color = 'text.secondary';
        let chipColor = 'default';
        
        if (params.value === 'valid') {
          color = 'success.main';
          chipColor = 'success';
        } else if (params.value === 'invalid') {
          color = 'error.main';
          chipColor = 'error';
        } else if (params.value === 'risky') {
          color = 'warning.main';
          chipColor = 'warning';
        }
        
        return (
          <Chip
            label={params.value ? params.value.toUpperCase() : 'UNKNOWN'}
            size="small"
            color={chipColor as any}
            variant="outlined"
          />
        );
      },
    },
    {
      field: 'phone_number',
      headerName: 'Phone',
      flex: 1,
      minWidth: 150,
      renderCell: (params) => (
        <Typography variant="body2">
          {params.value || '-'}
        </Typography>
      ),
    },
    {
      field: 'first_name',
      headerName: 'First Name',
      flex: 1,
      minWidth: 120,
      renderCell: (params) => (
        <Typography variant="body2">
          {params.value || '-'}
        </Typography>
      ),
    },
    {
      field: 'last_name',
      headerName: 'Last Name',
      flex: 1,
      minWidth: 120,
      renderCell: (params) => (
        <Typography variant="body2">
          {params.value || '-'}
        </Typography>
      ),
    },
    {
      field: 'source',
      headerName: 'Source',
      flex: 1,
      minWidth: 120,
      renderCell: (params) => (
        <Typography variant="body2">
          {params.value || '-'}
        </Typography>
      ),
    },
    {
      field: 'created_at',
      headerName: 'Created At',
      flex: 1,
      minWidth: 180,
      renderCell: (params) => {
        const date = new Date(params.value);
        return (
          <Typography variant="body2">
            {date.toLocaleString()}
          </Typography>
        );
      },
    },
    // {
    //   field: 'actions',
    //   headerName: 'Actions',
    //   width: 100,
    //   sortable: false,
    //   renderCell: (params) => (
    //     <IconButton 
    //       onClick={(e) => handleMenuOpen(e, params.row.id)}
    //       size="small"
    //     >
    //       <MoreVertIcon fontSize="small" />
    //     </IconButton>
    //   ),
    // },
  ];

  // Filter options for ContentCard
  const filterOptions = [
    {
      field: 'email_address',
      label: 'Email',
      type: 'text' as const,
    },
    {
      field: 'phone_number',
      label: 'Phone',
      type: 'text' as const,
    },
    {
      field: 'first_name',
      label: 'First Name',
      type: 'text' as const,
    },
    {
      field: 'last_name',
      label: 'Last Name',
      type: 'text' as const,
    },
    {
      field: 'source',
      label: 'Source',
      type: 'text' as const,
    },
    {
      field: 'is_email_subscribed',
      label: 'Email Subscribed',
      type: 'boolean' as const,
    },
    {
      field: 'is_sms_opt_in',
      label: 'SMS Opt-in',
      type: 'boolean' as const,
    },
    {
      field: 'is_whatsapp_opt_in',
      label: 'WhatsApp Opt-in',
      type: 'boolean' as const,
    },
  ];

  // Tab options for ContentCard
  const tabOptions = [
    { value: 'all', label: 'All', count: contactsData?.count || 0 },
    { value: 'email_subscribed', label: 'Email Subscribed', count: 0 },
    { value: 'sms_opt_in', label: 'SMS Opt-in', count: 0 },
  ];

  // Form reference to access form methods from outside the form component
  const formRef = React.useRef<{
    submitForm: () => void;
  }>({ submitForm: () => {} });

  // Contact form component to be used in the drawer
  const ContactForm = () => {
    // Initialize form with contact data or defaults
    const initialValues = currentContact ? {
      email_address: currentContact.email_address || '',
      phone_number: currentContact.phone_number || '',
      first_name: currentContact.first_name || '',
      last_name: currentContact.last_name || '',
      source: currentContact.source || '',
      is_email_subscribed: currentContact.is_email_subscribed || false,
      is_sms_opt_in: currentContact.is_sms_opt_in || false,
      is_whatsapp_opt_in: currentContact.is_whatsapp_opt_in || false,
      custom_attributes: currentContact.custom_attributes || {}
    } : {
      email_address: '',
      phone_number: '',
      first_name: '',
      last_name: '',
      source: '',
      is_email_subscribed: false,
      is_sms_opt_in: false,
      is_whatsapp_opt_in: false,
      custom_attributes: {}
    };
    
    const { control, handleSubmit, formState: { errors } } = useForm<ContactFormValues>({
      resolver: zodResolver(contactFormSchema) as any,
      defaultValues: initialValues
    });
    
    const onSubmit: SubmitHandler<ContactFormValues> = (data) => {
      handleFormSubmit(data);
    };
    
    // Update the form reference to allow external submission
    React.useEffect(() => {
      formRef.current.submitForm = handleSubmit(onSubmit);
    }, [handleSubmit, onSubmit]);
    
    // We no longer need file upload state since we've removed the bulk upload functionality
    
    // We've removed all file upload handlers since we no longer need the bulk upload functionality
    
    const isPending = createContactMutation.isPending || updateContactMutation.isPending;
    
    return (
      <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Contact form header */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{editMode ? 'Edit Contact' : 'Add Contact'}</Typography>
        </Box>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2 }}>
          {/* Email Address */}
          <Box sx={{ gridColumn: 'span 12' }}>
            <Controller
              name="email_address"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Email Address"
                  variant="outlined"
                  fullWidth
                  error={!!errors.email_address}
                  helperText={errors.email_address?.message}
                  disabled={isPending}
                />
              )}
            />
          </Box>
          
          {/* Phone Number */}
          <Box sx={{ gridColumn: 'span 12' }}>
            <Controller
              name="phone_number"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Phone Number"
                  variant="outlined"
                  fullWidth
                  error={!!errors.phone_number}
                  helperText={errors.phone_number?.message}
                  disabled={isPending}
                />
              )}
            />
          </Box>
          
          {/* First Name */}
          <Box sx={{ gridColumn: 'span 6' }}>
            <Controller
              name="first_name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="First Name"
                  variant="outlined"
                  fullWidth
                  error={!!errors.first_name}
                  helperText={errors.first_name?.message}
                  disabled={isPending}
                />
              )}
            />
          </Box>
          
          {/* Last Name */}
          <Box sx={{ gridColumn: 'span 6' }}>
            <Controller
              name="last_name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Last Name"
                  variant="outlined"
                  fullWidth
                  error={!!errors.last_name}
                  helperText={errors.last_name?.message}
                  disabled={isPending}
                />
              )}
            />
          </Box>
          
          {/* Source */}
          <Box sx={{ gridColumn: 'span 12' }}>
            <Controller
              name="source"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Source"
                  variant="outlined"
                  fullWidth
                  error={!!errors.source}
                  helperText={errors.source?.message || 'Where did this contact come from?'}
                  disabled={isPending}
                />
              )}
            />
          </Box>
          
          {/* Subscription Options */}
          <Box sx={{ gridColumn: 'span 12' }}>
            <Typography variant="subtitle2" gutterBottom>
              Communication Preferences
            </Typography>
          </Box>
          
          {/* Email Subscription */}
          <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 4' } }}>
            <Controller
              name="is_email_subscribed"
              control={control}
              render={({ field: { onChange, value, ...field } }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!value}
                      onChange={onChange}
                      {...field}
                      disabled={isPending}
                    />
                  }
                  label="Email Subscribed"
                />
              )}
            />
          </Box>
          
          {/* SMS Opt-in */}
          <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 4' } }}>
            <Controller
              name="is_sms_opt_in"
              control={control}
              render={({ field: { onChange, value, ...field } }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!value}
                      onChange={onChange}
                      {...field}
                      disabled={isPending}
                    />
                  }
                  label="SMS Opt-in"
                />
              )}
            />
          </Box>
          
          {/* WhatsApp Opt-in */}
          <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 4' } }}>
            <Controller
              name="is_whatsapp_opt_in"
              control={control}
              render={({ field: { onChange, value, ...field } }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!value}
                      onChange={onChange}
                      {...field}
                      disabled={isPending}
                    />
                  }
                  label="WhatsApp Opt-in"
                />
              )}
            />
          </Box>
          
        </Box>
      </Box>
    );
  };

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0, mt: 0, pb: 0 }}>
        <Typography variant="h4" component="h1">
          Contacts
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<FileDownloadIcon />}
            onClick={() => {
              if (selectedRows.length > 0) {
                handleDownloadSelectedContacts();
              } else {
                handleDownloadAllContacts();
              }
            }}
            sx={{ 
              bgcolor: '#1976d2', 
              '&:hover': { bgcolor: '#1565c0' },
              borderRadius: '4px',
              textTransform: 'none',
            }}
            disabled={downloadContactsMutation.isPending}
          >
            {selectedRows.length > 0 ? `Download Selected (${selectedRows.length})` : 'Download All Contacts'}
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<CloudUploadIcon />}
            onClick={() => setUploadDialogOpen(true)}
            sx={{ 
              bgcolor: '#2e7d32', 
              '&:hover': { bgcolor: '#1b5e20' },
              borderRadius: '4px',
              textTransform: 'none',
            }}
          >
            Upload Contacts
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleCreateContact}
            sx={{ 
              bgcolor: '#f5821f', 
              '&:hover': { bgcolor: '#e67812' },
              borderRadius: '4px',
              textTransform: 'none',
            }}
          >
            Create Contact
          </Button>
        </Box>
      </Box>

      <ContentCard
        onSearch={setSearchTerm}
        filterOptions={filterOptions}
        tabOptions={tabOptions}
        onFilterChange={(filters) => {
          console.log('Filters changed:', filters);
          // Handle filter changes here
        }}
        sx={{ height: '100%', mt: 0.5 }}
      >
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 0.5 }}>
            <Typography>Loading contacts...</Typography>
          </Box>
        ) : isError ? (
          <Alert severity="error" sx={{ m: 0.5 }}>
            Error loading contacts: {(error as Error)?.message || 'Unknown error'}
          </Alert>
        ) : (
          <CustomDataGrid
            rows={contactsData?.results || []}
            columns={columns}
            paginationModel={{
              page,
              pageSize,
            }}
            onPaginationModelChange={handlePaginationModelChange}
            pageSizeOptions={[5, 10, 25, 50]}
            rowCount={contactsData?.count || 0}
            loading={isLoading}
            paginationMode="server"
            autoHeight
            disableRowSelectionOnClick
            getRowId={(row) => row.id}
            onRowClick={(params) => {
              const contact = contactsData?.results.find(contact => contact.id === params.id);
              if (contact) {
                setCurrentContact(contact);
                setSelectedContactId(contact.id);
                setViewMode(true);
                setEditMode(false);
                setDrawerOpen(true);
              }
            }}
          />
        )}
      </ContentCard>

      {/* Action Menu */}
      <Menu
        id="contact-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleViewContact}>
          <VisibilityIcon fontSize="small" sx={{ mr: 1 }} />
          View
        </MenuItem>
        <MenuItem onClick={handleEditContact}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDeleteClick}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Contact"
        content="Are you sure you want to delete this contact? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        isLoading={deleteContactMutation.isPending}
        confirmText="Delete"
      />

      {/* Customer Upload Dialog for bulk uploading contacts */}
      <CustomerUploadDialog
        open={uploadDialogOpen}
        onClose={(refresh) => {
          setUploadDialogOpen(false);
          if (refresh) {
            // Refresh the contacts data
            queryClient.invalidateQueries({ queryKey: ['contacts', tenant] });
          }
        }}
        title="Upload Contacts"
        templateUrl={`/api/${tenant}/marketing/contacts/download-template/`}
        validateEndpoint={`/api/${tenant}/marketing/contacts/validate-upload/`}
        processEndpoint={`/api/${tenant}/marketing/contacts/bulk-upload/process/`}
        type="contacts"
        customUploadHandler={(file, formData) => {
          // Use our uploadContactsFile mutation
          return uploadContactsFileMutation.mutateAsync(file);
        }}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      
      {/* Contact Form/View Drawer */}
      <AnimatedDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        title={viewMode ? 'Contact Details' : (editMode ? 'Edit Contact' : 'Create Contact')}
        onSave={viewMode ? undefined : () => formRef.current.submitForm()}
        saveDisabled={createContactMutation.isPending || updateContactMutation.isPending}
        disableBackdropClick={createContactMutation.isPending || updateContactMutation.isPending}
        sidebarIcons={
          currentContact ? [
            {
              id: 'view',
              icon: <VisibilityIcon />,
              tooltip: 'View Contact',
              onClick: () => {
                setViewMode(true);
                setEditMode(false);
              }
            },
            {
              id: 'edit',
              icon: <EditIcon />,
              tooltip: 'Edit Contact',
              onClick: () => {
                setViewMode(false);
                setEditMode(true);
              }
            },
            {
              id: 'delete',
              icon: <DeleteIcon />,
              tooltip: 'Delete Contact',
              onClick: () => {
                if (currentContact) {
                  setSelectedContactId(currentContact.id);
                  setDeleteDialogOpen(true);
                  setDrawerOpen(false);
                }
              }
            }
          ] : []
        }
      >
        {viewMode && contactDetails ? (
          <ContactViewContent contact={contactDetails} />
        ) : (
          <ContactForm />
        )}
      </AnimatedDrawer>
    </>
  );
}

// Wrap the ContactsPage with DrawerProvider to provide drawer context
export default function Page() {
  return (
    <DrawerProvider>
      <ContactsPage />
    </DrawerProvider>
  );
}
