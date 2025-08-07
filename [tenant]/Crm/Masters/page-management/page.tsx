'use client';

/**
 * Page Management Component
 * 
 * Provides interface to manage landing pages
 */
import React, { useState, useMemo, useRef } from 'react';
import { 
  Typography, 
  Box, 
  Button, 
  Container, 
  Paper, 
  Chip, 
  Tooltip, 
  IconButton,
  Grid,
  TextField,
  FormControlLabel,
  Switch,
  CircularProgress 
} from '@mui/material';
import { GridColDef, GridRenderCellParams, GridRowParams } from '@mui/x-data-grid';
import CustomDataGrid from '@/app/components/common/CustomDataGrid';
import ContentCard, { FilterOption } from '@/app/components/common/ContentCard';
import { useTranslation } from 'react-i18next';
import { useAdminLandingPages, useDeleteLandingPage, useCreateLandingPage, useUpdateLandingPage, type LandingPage } from '@/app/hooks/api/admin/landing-pages';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useRouter, useParams } from 'next/navigation';
import { format as formatDate } from 'date-fns';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import AnimatedDrawer from '@/app/components/common/AnimatedDrawer';
import { DrawerProvider, useDrawer } from '@/app/contexts/DrawerContext';
import ConfirmDialog from '@/app/components/common/ConfirmDialog';
import Notification from '@/app/components/common/Notification';
import SpaceDashboardIcon from '@mui/icons-material/SpaceDashboard';
// Zod schema for the form
const pageSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
  slug: z.string().min(1, { message: 'Slug is required' })
    .regex(/^[a-z0-9-]+$/, { message: 'Slug can only contain lowercase letters, numbers, and hyphens' }),
  meta_description: z.string().default(''),
  is_active: z.boolean().default(false)
});

type PageFormData = z.infer<typeof pageSchema>;

// Type for filter state
interface FilterState {
  field: string;
  operator: string;
  value: any;
}

/**
 * Wrapper component that provides the DrawerContext
 */
export default function PageManagementPageWrapper(): React.ReactElement {
  return (
    <DrawerProvider>
      <PageManagementPage />
    </DrawerProvider>
  );
}

/**
 * Page Management Component - Main page
 */
function PageManagementPage(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  
  // Use drawer context
  const drawerContext = useDrawer();
  
  // Local state for drawer management
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit'>('add');
  const [selectedPage, setSelectedPage] = useState<LandingPage | null>(null);
  const [slugEdited, setSlugEdited] = useState<boolean>(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [pageToDelete, setPageToDelete] = React.useState<LandingPage | null>(null);
  
  // Notification state
  const [notification, setNotification] = React.useState({
    open: false,
    message: '',
    title: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });
  
  // Format error message from ApiError
  const formatErrorMessage = (error: any): string => {
    if (!error?.response?.data?.details) {
      return t('landingPages.notifications.genericError');
    }
    
    const details = error.response.data.details;
    if (typeof details === 'string') {
      return details;
    }
    
    // Convert Record<string, string[]> to string
    return Object.entries(details)
      .map(([field, messages]) => {
        if (Array.isArray(messages)) {
          return `${field}: ${messages.join(', ')}`;
        }
        return `${field}: ${messages}`;
      })
      .join('; ');
  };
  
  // Close notification
  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };
  
  // State for active sidebar item
  const [activeSidebarItem, setActiveSidebarItem] = useState<string>('view');
  
  // Form ref for submitting the form from outside
  const formRef = useRef<{ submitForm: () => void } | null>(null);
  
  // Drawer sidebar icons for view/edit modes
  const drawerSidebarIcons = useMemo(() => {
    // If in add mode, return empty array
    if (drawerMode === 'add') {
      return [];
    }
    
    // Otherwise, return the icons for edit mode
    return [
      { 
        id: 'view', 
        icon: <VisibilityIcon />, 
        tooltip: t('view'), 
        onClick: () => {
          setIsViewMode(true);
          setActiveSidebarItem('view');
          drawerContext.setActiveSidebarItem('view');
        }
      },
      { 
        id: 'edit', 
        icon: <EditIcon />, 
        tooltip: t('edit'), 
        onClick: () => {
          setIsViewMode(false);
          setActiveSidebarItem('edit');
          drawerContext.setActiveSidebarItem('edit');
        }
      },
      {
        id: 'content',
        icon: <span style={{ fontSize: '18px' }}><SpaceDashboardIcon /></span>,
        tooltip: t('content'),
        onClick: () => {
          // Navigate to content page
          if (selectedPage?.slug) {
            router.push(`/${params.tenant}/Crm/Masters/page-management/content/${selectedPage.slug}`);
          }
        }
      }
    ];
  }, [drawerMode, t, drawerContext, router, params.tenant, selectedPage?.slug]);
  
  // View and filter states
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeFilters, setActiveFilters] = useState<FilterState[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'title', 'slug', 'is_active', 'updated_at', 'actions'
  ]);
  const [activeTab, setActiveTab] = useState('all');
  
  // API hooks
  const { data: paginatedData, isLoading, error, refetch } = useAdminLandingPages();
  const deleteMutation = useDeleteLandingPage();
  const createMutation = useCreateLandingPage();
  const updateMutation = useUpdateLandingPage();
  
  // Form setup
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
    reset
  } = useForm<PageFormData>({
    resolver: zodResolver(pageSchema),
    defaultValues: {
      title: '',
      slug: '',
      meta_description: '',
      is_active: false
    }
  });
  
  // Auto-generate slug from title if slug is not manually edited
  const watchTitle = watch('title');
  
  React.useEffect(() => {
    if (!slugEdited && watchTitle) {
      setValue('slug', watchTitle
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Keep only lowercase alphanumeric, spaces, and hyphens
        .replace(/\s+/g, '-')        // Replace spaces with hyphens
        .replace(/-+/g, '-')         // Replace multiple hyphens with a single hyphen
        .replace(/^-+|-+$/g, '')); // Remove leading and trailing hyphens
    }
  }, [watchTitle, setValue, slugEdited]);
  
  // Handle form submission
  const onSubmit = handleSubmit((data) => {
    if (drawerMode === 'add') {
      // For create, we directly submit the form data
      createMutation.mutate({
        title: data.title,
        slug: data.slug,
        meta_description: data.meta_description,
        is_active: data.is_active
      }, {
        onSuccess: () => {
          setDrawerOpen(false);
          reset({
            title: '',
            slug: '',
            meta_description: '',
            is_active: false
          });
          refetch();
          setNotification({
            open: true,
            title: t('notifications.success'),
            message: t('landingPages.notifications.createSuccess'),
            severity: 'success'
          });
        },
        onError: (error) => {
          console.error('Error creating landing page:', error);
          setNotification({
            open: true,
            title: t('notifications.error'),
            message: formatErrorMessage(error) || t('landingPages.notifications.createError'),
            severity: 'error'
          });
        }
      });
    } else {
      // For update, we need slug + payload structure
      if (selectedPage?.slug) {
        updateMutation.mutate({
          id: selectedPage.slug, // Using slug as the identifier
          payload: {
            title: data.title,
            slug: data.slug,
            meta_description: data.meta_description,
            is_active: data.is_active
          }
        }, {
          onSuccess: () => {
            setDrawerOpen(false);
            reset({
              title: '',
              slug: '',
              meta_description: '',
              is_active: false
            });
            refetch();
            setNotification({
              open: true,
              title: t('notifications.success'),
              message: t('landingPages.notifications.updateSuccess'),
              severity: 'success'
            });
          },
          onError: (error) => {
            console.error('Error updating landing page:', error);
            setNotification({
              open: true,
              title: t('notifications.error'),
              message: formatErrorMessage(error) || t('landingPages.notifications.updateError'),
              severity: 'error'
            });
          }
        });
      }
    }
  });
  
  // Handle opening the drawer for adding a new page
  const handleOpenDrawerForAdd = (): void => {
    setDrawerMode('add');
    setSelectedPage(null);
    setSlugEdited(false);
    setIsViewMode(false);
    // Make sure form is completely reset to default values
    reset({
      title: '',
      slug: '',
      meta_description: '',
      is_active: false
    });
    setDrawerOpen(true);
  };
  
  // Handle opening the drawer for editing a page
  const handleOpenDrawerForEdit = (page: LandingPage): void => {
    setDrawerMode('edit');
    setSelectedPage(page);
    setSlugEdited(true); // Don't auto-generate slug when editing
    setIsViewMode(false); // Make sure we're in edit mode
    setActiveSidebarItem('edit');
    
    // Reset form with page data
    reset({
      title: page.title,
      slug: page.slug,
      meta_description: page.meta_description || '',
      is_active: page.is_active !== undefined ? page.is_active : false
    });
    
    setDrawerOpen(true);
  };
  
  // Handle closing the drawer
  const handleCloseDrawer = (): void => {
    setDrawerOpen(false);
    setIsViewMode(false); // Reset view mode when drawer is closed
  };
  
  // Handle opening drawer in view mode
  const handleOpenDrawerForView = (page: LandingPage): void => {
    setDrawerMode('edit'); // Still use edit mode for existing record
    setSelectedPage(page);
    setSlugEdited(true); // Don't auto-generate slug
    setIsViewMode(true); // Set to view mode
    setActiveSidebarItem('view');
    reset({
      title: page.title,
      slug: page.slug,
      meta_description: page.meta_description || '',
      is_active: page.is_active
    });
    setDrawerOpen(true);
  };
  
  // Handle row click to open drawer in view mode
  const handleRowClick = (params: GridRowParams): void => {
    const page = params.row as LandingPage;
    handleOpenDrawerForView(page);
  };
  
  // Process data for display
  const landingPages = useMemo(() => {
    if (!paginatedData) return [];
    return paginatedData.results || [];
  }, [paginatedData]);
  
  // Filter options for ContentCard
  const filterOptions: FilterOption[] = [
    {
      field: 'title',
      label: t('landingPages.title'),
      type: 'text',
    },
    {
      field: 'slug',
      label: t('landingPages.slug'),
      type: 'text',
    },
    {
      field: 'is_active',
      label: t('landingPages.status'),
      type: 'boolean',
    }
  ];
  
  // Column definitions for DataGrid
  const columns: GridColDef[] = [
    { 
      field: 'title', 
      headerName: t('landingPages.title'), 
      flex: 1,
      type: 'string'
    },
    { 
      field: 'slug', 
      headerName: t('landingPages.slug'), 
      flex: 1,
      type: 'string'
    },
    { 
      field: 'is_active', 
      headerName: t('landingPages.status'), 
      headerAlign: 'left',
      width: 120,
      type: 'boolean',
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value !== false ? t('status.active') : t('status.inactive')}
          color={params.value !== false ? 'success' : 'default'}
          size="small"
        />
      ) 
    },
    { 
      field: 'actions', 
      headerName: t('Actions'),
      headerAlign: 'center', 
      align: 'center',
      width: 120,
      sortable: false,
      type: 'actions',
      renderCell: (params: GridRenderCellParams) => {
        const page = params.row as LandingPage;
        
        return (
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
            <Tooltip title={t('actions.delete')}>
              <IconButton
                size="small"
                onClick={(e) => handleDeleteClick(page, e)}
                color="error"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        );
      }
    }
  ];
  
  // Handle delete confirmation
  const handleDeleteClick = (page: LandingPage, e: React.MouseEvent) => {
    e.stopPropagation();
    setPageToDelete(page);
    setDeleteConfirmOpen(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (pageToDelete) {
      deleteMutation.mutate(pageToDelete.slug, {
        onSuccess: () => {
          console.log(`Page ${pageToDelete.title} successfully deleted`);
          refetch();
          setDeleteConfirmOpen(false);
          setPageToDelete(null);
        },
        onError: (error) => {
          console.error('Error deleting page:', error);
          console.log('Error details:', error.response?.data);
          setDeleteConfirmOpen(false);
          setPageToDelete(null);
        }
      });
    }
  };

  // Handle delete cancel
  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setPageToDelete(null);
  };

  // Handle search from ContentCard
  const handleSearch = (term: string): void => {
    setSearchTerm(term);
  };
  
  // Handle view change from ContentCard
  const handleViewChange = (newView: 'list' | 'grid'): void => {
    setView(newView);
  };
  
  // Handle filter change from ContentCard
  const handleFilterChange = (filters: FilterState[]): void => {
    setActiveFilters(filters);
  };
  
  // Handle tab change from ContentCard
  const handleTabChange = (newTab: string): void => {
    setActiveTab(newTab);
  };
  
  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">{t('pageManagement.title')}</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenDrawerForAdd}
        >
          {t('pageManagement.createPage')}
        </Button>
      </Box>
      
        <ContentCard
          onSearch={handleSearch}
          onViewChange={handleViewChange}
          onFilterChange={handleFilterChange}
          onTabChange={handleTabChange}
          filterOptions={filterOptions}
          columnOptions={columns.map(col => ({ field: col.field, headerName: col.headerName as string }))}
          activeTab={activeTab}
          tabOptions={[
            { value: 'all', label: t('common.all'), count: landingPages.length },
          ]}
        >
          <CustomDataGrid
            rows={landingPages}
            columns={columns}
            loading={isLoading}
            autoHeight
            getRowId={(row) => row.id}
            onRowClick={handleRowClick}
            viewMode={view}
            paginationMode="client"
            pageSizeOptions={[5, 10, 25]}
            disableRowSelectionOnClick
          />
        </ContentCard>
      
      <ConfirmDialog
        open={deleteConfirmOpen}
        title={t('confirmations.deleteTitle')}
        content={t('confirmations.deletePage', { title: pageToDelete?.title })}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isLoading={deleteMutation.isPending}
        confirmText={t('delete')}
        cancelText={t('cancel')}
      />
      
      <Notification
        open={notification.open}
        title={notification.title}
        message={notification.message}
        severity={notification.severity}
        onClose={handleCloseNotification}
      />
      
      {/* Animated Drawer for Create/Edit Page */}
      <AnimatedDrawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        title={drawerMode === 'add' ? t('pageManagement.createPage') : t('pageManagement.editPage')}
        onSave={onSubmit}
        initialWidth={550}
        expandedWidth={550}
        saveDisabled={createMutation.isPending || updateMutation.isPending || isViewMode}
        sidebarIcons={drawerSidebarIcons}
        defaultSidebarItem="view"
      >
        <form>
          <Grid container spacing={3} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <Controller
                name="title"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={t('landingPages.title')}
                    fullWidth
                    size='small'
                    disabled={isViewMode}
                    error={!!errors.title && !isViewMode}
                    helperText={!isViewMode ? errors.title?.message : undefined}
                    InputProps={{
                      readOnly: isViewMode
                    }}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Controller
                name="slug"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={t('landingPages.slug')}
                    fullWidth
                    size='small'
                    disabled={isViewMode}
                    error={!!errors.slug && !isViewMode}
                    helperText={!isViewMode ? (errors.slug?.message || t('landingPages.slugHelperText')) : undefined}
                    onChange={(e) => {
                      if (!isViewMode) {
                        field.onChange(e);
                        setSlugEdited(true);
                      }
                    }}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Controller
                name="meta_description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={t('landingPages.metaDescription')}
                    fullWidth
                    size='small'
                    disabled={isViewMode}
                    multiline
                    rows={4}
                    error={!!errors.meta_description && !isViewMode}
                    helperText={!isViewMode ? errors.meta_description?.message : undefined}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Controller
                name="is_active"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={value}
                        onChange={(e) => !isViewMode && onChange(e.target.checked)}
                        disabled={isViewMode}
                      />
                    }
                    label={t('landingPages.published')}
                  />
                )}
              />
            </Grid>
          </Grid>
        </form>
        
        {(createMutation.isPending || updateMutation.isPending) && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
      </AnimatedDrawer>
    </>
  );
}