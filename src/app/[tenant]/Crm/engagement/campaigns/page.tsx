'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Box, 
  Typography, 
  Button, 
  Alert, 
  TextField, 
  InputAdornment, 
  Grid, 
  Card, 
  CardContent, 
  CardHeader, 
  Divider, 
  FormControl, 
  InputLabel, 
  Select, 
  FormHelperText, 
  IconButton,
  Tooltip,
  Chip,
  Stack,
  Menu as MuiMenu,
  MenuItem as MuiMenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Visibility as VisibilityIcon, 
  Schedule as ScheduleIcon,
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  BarChart as BarChartIcon
} from '@mui/icons-material';
import AnimatedDrawer from '../../../../components/common/AnimatedDrawer';
import ConfirmDialog from '../../../../components/common/ConfirmDialog';
import ContentCard, { FilterOption } from '../../../../components/common/ContentCard';
import CustomDataGrid, { GridRowParams } from '../../../../components/common/CustomDataGrid';
import Loader from '../../../../components/common/Loader';
// import CampaignDrawerForm from '../../../../components/marketing/campaigns/CampaignDrawerForm';
import CampaignDrawerForm from '../../../../components/Engagement/marketing/campaigns/CampaignDrawerForm';
import { useGetCampaigns, useDeleteCampaign, useUpdateCampaign, useGetCampaignById } from '../../../../hooks/engagement/marketing/useCampaigns';

import { useDebounce } from '../../../../hooks/engagement/useDebounce';
import { Campaign, ChannelType, CampaignStatus, MarketingList } from '../../../../types/engagement/marketing';
import { DrawerProvider, useDrawer } from '../../../../contexts/DrawerContext';
import { useGetLists } from '../../../../hooks/engagement/marketing/useLists';

// Define campaign statuses for filter dropdown
const campaignStatusesForFilter: { value: CampaignStatus | ''; label: string }[] = [
    { value: '', label: 'All Statuses' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'SCHEDULED', label: 'Scheduled' },
    { value: 'SENDING', label: 'Sending' },
    { value: 'SENT', label: 'Sent' },
    { value: 'COMPLETED', label: 'Completed'},
    { value: 'FAILED', label: 'Failed' },
    { value: 'ARCHIVED', label: 'Archived' },
];

const channelTypesForFilter: { value: ChannelType | ''; label: string }[] = [
    { value: '', label: 'All Channels' },
    { value: 'EMAIL', label: 'Email' },
    // { value: 'SMS', label: 'SMS (Soon)' },
    // { value: 'WHATSAPP', label: 'WhatsApp (Soon)' },
];

function CampaignsPage() {
  // const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const tenant = params?.tenant as string;
  const queryClient = useQueryClient();

  // State declarations
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [channelFilter, setChannelFilter] = useState<ChannelType | ''>('EMAIL'); // Default to EMAIL for MVP
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | ''>('');

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedCampaignForDelete, setSelectedCampaignForDelete] = useState<Campaign | null>(null);

  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const drawerContext = useDrawer();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [currentActionCampaign, setCurrentActionCampaign] = useState<Campaign | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { data: campaignsData, isLoading, error } = useGetCampaigns(
    tenant,
    page + 1, // API is 1-indexed
    debouncedSearchTerm,
    channelFilter || undefined,
    statusFilter || undefined
  );
  const deleteCampaignMutation = useDeleteCampaign(tenant);
  const updateCampaignMutation = useUpdateCampaign(tenant);
  
  
  // Get lists for target list selection in edit form
  const { data: listsData } = useGetLists(tenant, 1, "", true);

  const handlePageChange = (newPage: number) => setPage(newPage);
  const handleRowsPerPageChange = (newPageSize: number) => {
    setRowsPerPage(newPageSize);
    setPage(0);
  };
  const handleSearchChange = (searchTerm: string) => {
    setSearchTerm(searchTerm);
    setPage(0);
  };
  const handleChannelFilterChange = (event: any) => {
    setChannelFilter(event.target.value as ChannelType | '');
    setPage(0);
  };
  const handleStatusFilterChange = (event: any) => {
    setStatusFilter(event.target.value as CampaignStatus | '');
    setPage(0);
  };

  const handleCreateCampaign = () => {
    setCreateDrawerOpen(true);
  };

  const handleCampaignCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['campaigns', tenant] });
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, campaign: Campaign) => {
    setAnchorEl(event.currentTarget);
    setCurrentActionCampaign(campaign);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setCurrentActionCampaign(null);
  };

  // This function is already declared above

  const handleViewCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    drawerContext?.updateFormData({ campaign });
    drawerContext?.openDrawer('view');
    drawerContext?.setActiveSidebarItem('view');
    handleMenuClose();
  };

  const handleEditCampaign = (campaign: Campaign) => {
    console.log('Opening edit drawer for campaign:', campaign);
    setSelectedCampaign(campaign);
    drawerContext?.updateFormData({ 
      campaign,
      name: campaign.name,
      sender_identifier: campaign.sender_identifier || '',
      target_list_ids: campaign.target_lists_details?.map(list => list.list_id) || []
    });
    drawerContext?.openDrawer('edit');
    drawerContext?.setActiveSidebarItem('edit');
    handleMenuClose();
  };

  const handleSaveCampaign = async (formData: { name: string; sender_identifier: string; target_list_ids: number[] }) => {
    if (!selectedCampaign) return;
    
    // Only allow saving if campaign is in DRAFT status
    if (selectedCampaign.status !== 'DRAFT') {
      console.error('Only DRAFT campaigns can be edited');
      alert('Only DRAFT campaigns can be edited');
      return;
    }
    
    setIsSaving(true);
    try {
      // Update the campaign with PUT method - fix parameter name from campaignId to id
      await updateCampaignMutation.mutateAsync({
        id: selectedCampaign.id,
        data: formData
      });
      
      // Close drawer and show success message
      drawerContext?.closeDrawer();
      setSelectedCampaign(null);
      
      // Show success notification
      alert('Campaign updated successfully');
      
      // Refresh the campaigns list
      queryClient.invalidateQueries({ queryKey: ['campaigns', tenant] });
    } catch (error) {
      console.error('Error updating campaign:', error);
      alert(`Error updating campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDrawerClose = () => {
    drawerContext?.closeDrawer();
    setSelectedCampaign(null);
  };

  const handleDeleteInitiate = (campaign: Campaign) => {
    if (campaign.status === 'DRAFT') {
      setSelectedCampaignForDelete(campaign);
      setDeleteConfirmOpen(true);
    } else {
      alert("Only DRAFT campaigns can be deleted.");
    }
  };
  
  const handleDeleteConfirm = async () => {
    if (selectedCampaignForDelete) {
      try {
        await deleteCampaignMutation.mutateAsync(selectedCampaignForDelete.id);
        // Show success message
        alert(`Campaign "${selectedCampaignForDelete.name}" has been deleted successfully.`);
        // Refresh the campaigns list
        queryClient.invalidateQueries({ queryKey: ['campaigns', tenant] });
        setSelectedCampaignForDelete(null);
      } catch (error) {
        console.error('Error deleting campaign:', error);
        alert(`Error deleting campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    setDeleteConfirmOpen(false);
  };
  
  const handleDeleteCancel = () => {
    setSelectedCampaignForDelete(null);
    setDeleteConfirmOpen(false);
  };

  const handleDeleteSuccess = (message: string) => {
    // This could be used to show a success notification
    console.log(message);
  };

  const handleSendOrSchedule = (campaign: Campaign) => {
    // This would navigate to a specific scheduling/sending page or open a dialog
    // For Phase 3 (Campaign Execution). For now, just a placeholder.
    alert(`Send/Schedule action for campaign: ${campaign.name} (ID: ${campaign.id}) - To be implemented in Phase 3.`);
    router.push(`/${tenant}/Crm/engagement/campaigns/${campaign.id}/schedule`); // Placeholder for where scheduling UI might be
  };

  const handleViewReport = (campaign: Campaign) => {
    // This would navigate to the campaign analytics report page
    // For Phase 4. For now, just a placeholder.
    alert(`View report for campaign: ${campaign.name} (ID: ${campaign.id}) - To be implemented in Phase 4.`);
    router.push(`/${tenant}/Crm/engagement/campaigns/${campaign.id}/report`); // Placeholder
  };
  
  // const pageTitle = t('campaigns.pageTitle', 'Campaigns');
  const pageTitle = "Campaigns";

  // Define columns for the data grid
  const columns = useMemo(() => [
    { 
      field: 'name', 
      headerName: 'Campaign Name', 
      flex: 2,
      renderCell: (params: any) => (
        <Typography variant="body2" fontWeight="medium">
          {params.row.name || 'Unnamed Campaign'}
        </Typography>
      ) 
    },
    { 
      field: 'id', 
      headerName: 'ID', 
      width: 80,
      renderCell: (params: any) => (
        <Typography variant="caption" color="text.secondary">
          {params.row.id}
        </Typography>
      ) 
    },
    { 
      field: 'campaign_channel_type', 
      headerName: 'Channel', 
      flex: 1,
      renderCell: (params: any) => (
        <Chip 
          label={params.row.campaign_channel_type_display || params.row.campaign_channel_type} 
          size="small" 
          color={params.row.campaign_channel_type === 'EMAIL' ? 'primary' : 'default'}
          variant="outlined"
        />
      ) 
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      flex: 1,
      renderCell: (params: any) => (
        <Chip 
          label={params.row.status_display || params.row.status.toLowerCase()}
          color={
            params.row.status === 'DRAFT' ? 'default' :
            params.row.status === 'SCHEDULED' ? 'info' :
            params.row.status === 'SENDING' ? 'secondary' :
            params.row.status === 'SENT' || params.row.status === 'COMPLETED' ? 'success' :
            params.row.status === 'FAILED' ? 'error' : 'default'
          }
          size="small"
          variant="outlined"
        />
      ) 
    },
    { 
      field: 'scheduled_at', 
      headerName: 'Scheduled For', 
      flex: 1.5,
      renderCell: (params: any) => (
        <Typography variant="body2">
          {params.row.scheduled_at ? new Date(params.row.scheduled_at).toLocaleString() : 'Not scheduled'}
        </Typography>
      )
    },
    { 
      field: 'created_at', 
      headerName: 'Created', 
      flex: 1.5,
      renderCell: (params: any) => (
        <Typography variant="body2">
          {params.row.created_at ? new Date(params.row.created_at).toLocaleDateString() : 'N/A'}
        </Typography>
      )
    },
    {
      field: 'sender_identifier',
      headerName: 'Sender',
      flex: 1.5,
      renderCell: (params: any) => (
        <Typography variant="body2">
          {params.row.sender_identifier || 'N/A'}
        </Typography>
      )
    },
  ], [tenant]);

  // Filter options for the ContentCard
  const filterOptions: FilterOption[] = [
    {
      field: 'channel',
      label: 'Channel',
      type: 'select',
      options: channelTypesForFilter
        .filter(opt => opt.value !== '')
        .map(opt => ({ value: opt.value, label: opt.label }))
    },
    {
      field: 'status',
      label: 'Status',
      type: 'select',
      options: campaignStatusesForFilter
        .filter(opt => opt.value !== '')
        .map(opt => ({ value: opt.value, label: opt.label }))
    }
  ] as const;

  // Handle filter changes from ContentCard
  const handleFilterChange = (filters: any[]) => {
    const channelFilter = filters.find(f => f.field === 'channel')?.value || '';
    const statusFilter = filters.find(f => f.field === 'status')?.value || '';
    
    setChannelFilter(channelFilter as ChannelType | '');
    setStatusFilter(statusFilter as CampaignStatus | '');
    setPage(0);
  };

  // Tab options for the ContentCard
  const tabOptions = [
    { value: 'all', label: 'All', count: campaignsData?.count || 0 },
    { value: 'draft', label: 'Drafts', count: campaignsData?.results?.filter((c: Campaign) => c.status === 'DRAFT').length || 0 },
    { value: 'scheduled', label: 'Scheduled', count: campaignsData?.results?.filter((c: Campaign) => c.status === 'SCHEDULED').length || 0 },
    { value: 'active', label: 'Active', count: campaignsData?.results?.filter((c: Campaign) => ['SENDING'].includes(c.status)).length || 0 },
    { value: 'completed', label: 'Completed', count: campaignsData?.results?.filter((c: Campaign) => ['SENT', 'COMPLETED'].includes(c.status)).length || 0 },
  ];

  // Handle tab changes
  const handleTabChange = (tabValue: string) => {
    if (tabValue === 'all') {
      setStatusFilter('');
    } else if (tabValue === 'draft') {
      setStatusFilter('DRAFT');
    } else if (tabValue === 'scheduled') {
      setStatusFilter('SCHEDULED');
    } else if (tabValue === 'active') {
      setStatusFilter('SENDING');
    } else if (tabValue === 'completed') {
      setStatusFilter('COMPLETED');
    }
    setPage(0);
  };

  // Get active tab based on status filter
  const activeTab = 
    statusFilter === 'DRAFT' ? 'draft' :
    statusFilter === 'SCHEDULED' ? 'scheduled' :
    statusFilter === 'SENDING' ? 'active' :
    statusFilter === 'COMPLETED' || statusFilter === 'SENT' ? 'completed' : 'all';

  // Handle row click to open drawer
  const handleRowClick = (params: GridRowParams) => {
    const campaign = campaignsData?.results.find(c => c.id === params.id);
    if (campaign) {
      setSelectedCampaign(campaign);
      drawerContext?.updateFormData({ campaign });
      drawerContext?.openDrawer('view');
      drawerContext?.setActiveSidebarItem('view');
    }
  };

  return (
      <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0, mt: 0, pb: 0 }}>
        <Typography variant="h4" component="h1">
          Campaigns
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreateCampaign}
        >
          Create Campaign
        </Button>
      </Box>

      {/* Search and Filter Bar */}
      <Box sx={{ mb: 0, height: '100%' }}>
        <ContentCard sx={{ p: 0, m: 0, height: '100%' }}
          onSearch={handleSearchChange}
          onFilterChange={handleFilterChange}
          filterOptions={filterOptions}
          tabOptions={tabOptions}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        >
          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 0 }}>
              Failed to load campaigns. Please try again later.
            </Alert>
          )}

          {/* Campaigns Data Grid */}
          <Box sx={{ height: 'auto', width: '100%', mt: -1 }}>
            <Box sx={{ 
              height: '100%', 
              mt: 0,
              pt: 0,
              '& .MuiDataGrid-root': {
                border: 'none',
                p: 0,
                m: 0
              },
              '& .MuiDataGrid-columnHeaders': {
                borderTop: 0,
                mt: 0,
                pt: 0
              },
              '& .MuiDataGrid-row': { 
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }
            }}>
              <CustomDataGrid
                rows={campaignsData?.results || []}
                columns={columns}
                loading={isLoading}
                rowCount={campaignsData?.count || 0}
                paginationModel={{
                  pageSize: rowsPerPage,
                  page: page,
                }}
                onPaginationModelChange={(model) => {
                  handlePageChange(model.page);
                  if (model.pageSize !== rowsPerPage) {
                    handleRowsPerPageChange(model.pageSize);
                  }
                }}
                paginationMode="server"
                disableRowSelectionOnClick
                onRowClick={handleRowClick}
                getRowId={(row) => row.id}
                className="campaigns-grid"
              />
            </Box>
          </Box>
        </ContentCard>
      </Box>

      {/* Action Menu */}
      <MuiMenu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MuiMenuItem onClick={() => currentActionCampaign && handleViewCampaign(currentActionCampaign)}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MuiMenuItem>
        {currentActionCampaign?.status === 'DRAFT' && (
          <MuiMenuItem onClick={() => currentActionCampaign && handleEditCampaign(currentActionCampaign)}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MuiMenuItem>
        )}
        {currentActionCampaign?.status === 'DRAFT' && (
          <MuiMenuItem 
            onClick={() => {
              if (currentActionCampaign) {
                handleDeleteInitiate(currentActionCampaign);
              }
            }}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon sx={{ color: 'error.main' }}>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MuiMenuItem>
        )}
        {(currentActionCampaign?.status === 'SENT' || currentActionCampaign?.status === 'COMPLETED') && (
          <MuiMenuItem 
            onClick={() => {
              if (currentActionCampaign) {
                router.push(`/${tenant}/Crm/engagement/campaigns/${currentActionCampaign.id}/analytics`);
              }
            }}
          >
            <ListItemIcon>
              <BarChartIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>View Analytics</ListItemText>
          </MuiMenuItem>
        )}
        {currentActionCampaign?.status === 'SCHEDULED' && currentActionCampaign?.scheduled_at && (
          <MuiMenuItem disabled>
            <ListItemIcon>
              <ScheduleIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText 
              primary={`Scheduled for ${new Date(currentActionCampaign.scheduled_at).toLocaleString()}`} 
              primaryTypographyProps={{ variant: 'caption' }}
            />
          </MuiMenuItem>
        )}
      </MuiMenu>

      {/* Campaign View/Edit Drawer */}
      <AnimatedDrawer
        open={drawerContext?.isOpen}
        onClose={handleDrawerClose}
        title={drawerContext?.activeSidebarItem === 'edit' ? 'Edit Campaign' : 'Campaign Details'}
        onSave={drawerContext?.activeSidebarItem === 'edit' ? () => {
          // Find and click the submit button in the form
          const saveButton = document.getElementById('save-campaign-button');
          if (saveButton instanceof HTMLButtonElement) {
            saveButton.click();
          }
        } : undefined}
        saveDisabled={drawerContext?.activeSidebarItem !== 'edit' || updateCampaignMutation.isPending}
        disableBackdropClick={true}
        sidebarIcons={[
          {
            id: 'view',
            icon: <VisibilityIcon />,
            tooltip: 'View Details',
            onClick: () => drawerContext?.setActiveSidebarItem('view')
          },
          ...(selectedCampaign?.status === 'DRAFT' ? [
            {
              id: 'edit',
              icon: <EditIcon />,
              tooltip: 'Edit Campaign',
              onClick: () => {
                // Set active sidebar item to edit to show the edit form
                drawerContext?.setActiveSidebarItem('edit');
                // Update form data with current campaign details
                if (selectedCampaign) {
                  drawerContext?.updateFormData({
                    name: selectedCampaign.name,
                    sender_identifier: selectedCampaign.sender_identifier || '',
                    target_list_ids: selectedCampaign.target_lists_details?.map(list => list.list_id) || []
                  });
                }
              }
            },
            {
              id: 'delete',
              icon: <DeleteIcon />,
              tooltip: 'Delete Campaign',
              onClick: () => {
                if (selectedCampaign) {
                  // Close drawer first, then show delete confirmation
                  drawerContext?.closeDrawer();
                  // Initiate delete process
                  handleDeleteInitiate(selectedCampaign);
                }
              }
            }
          ] : [])
        ]}
        defaultSidebarItem="view"
        sidebarContent={{
          view: selectedCampaign && <CampaignViewContent campaign={selectedCampaign} />,
          edit: selectedCampaign && (
            <CampaignEditForm
              campaign={selectedCampaign}
              tenant={tenant}
              onSave={handleSaveCampaign}
              isSaving={updateCampaignMutation.isPending}
            />
          )
        }}
      />

      {/* Campaign Create Drawer */}
      <AnimatedDrawer
        open={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        title="Create New Campaign"
        onSave={() => {
          // Find and click the submit button in the form
          const submitButton = document.querySelector('button[type="submit"]');
          if (submitButton instanceof HTMLButtonElement) {
            submitButton.click();
          }
        }}
        saveDisabled={false}
        disableBackdropClick={true}
      >
        <CampaignDrawerForm
          tenant={tenant}
          onClose={() => setCreateDrawerOpen(false)}
          onSuccess={handleCampaignCreated}
        />
      </AnimatedDrawer>

      {/* Delete Confirmation Dialog */}
      {selectedCampaignForDelete && (
        <ConfirmDialog
          open={deleteConfirmOpen}
          title={"Delete Campaign"}
          content={`Are you sure you want to delete DRAFT campaign "${selectedCampaignForDelete.name}"? This action cannot be undone.`}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          isLoading={deleteCampaignMutation.isPending}
          confirmText={"Delete"}
          cancelText={"Cancel"}
        />
      )}
      </>
  );
}

// Campaign View Content Component
interface CampaignViewContentProps {
  campaign: Campaign;
}

function CampaignViewContent({ campaign }: CampaignViewContentProps): JSX.Element {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        {campaign.name}
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        ID: {campaign.id}
      </Typography>
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>Channel:</Typography>
        <Chip 
          label={campaign.campaign_channel_type_display || campaign.campaign_channel_type} 
          size="small" 
          color={campaign.campaign_channel_type === 'EMAIL' ? 'primary' : 'default'}
          variant="outlined"
          sx={{ mb: 2 }}
        />
      </Box>
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>Status:</Typography>
        <Chip 
          label={campaign.status_display || campaign.status.toLowerCase()}
          color={
            campaign.status === 'DRAFT' ? 'default' :
            campaign.status === 'SCHEDULED' ? 'info' :
            campaign.status === 'SENDING' ? 'secondary' :
            campaign.status === 'SENT' || campaign.status === 'COMPLETED' ? 'success' :
            campaign.status === 'FAILED' ? 'error' : 'default'
          }
          size="small"
          variant="outlined"
          sx={{ mb: 2 }}
        />
      </Box>
      {campaign.scheduled_at && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Scheduled For:</Typography>
          <Typography variant="body2">
            {new Date(campaign.scheduled_at).toLocaleString()}
          </Typography>
        </Box>
      )}
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>Sender:</Typography>
        <Typography variant="body2">
          {campaign.sender_identifier || 'N/A'}
        </Typography>
      </Box>
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>Created:</Typography>
        <Typography variant="body2">
          {campaign.created_at ? new Date(campaign.created_at).toLocaleDateString() : 'N/A'}
        </Typography>
      </Box>
      {campaign.target_lists_details && campaign.target_lists_details.length > 0 ? (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Target Lists:</Typography>
          <Stack spacing={1}>
            {campaign.target_lists_details.map((list) => (
              <Chip 
                key={list.id}
                label={list.list_details?.name || `List ${list.list_id}`}
                size="small"
                variant="outlined"
              />
            ))}
          </Stack>
        </Box>
      ) : (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Target Lists:</Typography>
          <Typography variant="body2" color="text.secondary">No target lists assigned</Typography>
        </Box>
      )}
    </Box>
  );
}

// Campaign Edit Form Component
interface CampaignEditFormProps {
  campaign: Campaign;
  tenant: string;
  onSave: (formData: {
    name: string;
    sender_identifier: string;
    target_list_ids: number[];
  }) => void;
  isSaving: boolean;
}

function CampaignEditForm({ campaign, tenant, onSave, isSaving }: CampaignEditFormProps): JSX.Element {
  // Initialize form state with campaign data
  const [name, setName] = useState(campaign.name);
  const [senderIdentifier, setSenderIdentifier] = useState(campaign.sender_identifier || '');
  const [selectedListIds, setSelectedListIds] = useState<number[]>(
    campaign.target_lists_details?.map(list => list.list_id) || []
  );
  
  // Get all available lists for selection
  const { data: listsData, isLoading: listsLoading } = useGetLists(tenant, 1, "", true);
  const lists = listsData?.results || [];
  
  // Handle save button click
  const handleSaveClick = () => {
    if (selectedListIds.length === 0) {
      alert('At least one target list must be selected');
      return;
    }
    
    // Call the parent's onSave with the form data
    onSave({
      name,
      sender_identifier: senderIdentifier,
      target_list_ids: selectedListIds
    });
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>Edit Campaign</Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        ID: {campaign.id}
      </Typography>
      
      <Box sx={{ mt: 3 }}>
        <TextField
          label="Campaign Name"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isSaving}
          required
          margin="normal"
        />
        
        <TextField
          label="Sender Email"
          fullWidth
          value={senderIdentifier}
          onChange={(e) => setSenderIdentifier(e.target.value)}
          disabled={isSaving}
          required
          margin="normal"
          type="email"
          helperText="Email address that will appear as the sender"
        />
        
        <FormControl fullWidth margin="normal">
          <InputLabel id="target-lists-label">Target Lists</InputLabel>
          <Select
            labelId="target-lists-label"
            multiple
            value={selectedListIds}
            onChange={(e) => setSelectedListIds(e.target.value as number[])}
            disabled={isSaving}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((listId) => {
                  const list = lists.find(l => l.id === listId);
                  return (
                    <Chip 
                      key={listId} 
                      label={list ? list.name : `List ${listId}`} 
                      size="small" 
                    />
                  );
                })}
              </Box>
            )}
          >
            {lists.map((list) => (
              <MuiMenuItem key={list.id} value={list.id}>
                {list.name}
              </MuiMenuItem>
            ))}
          </Select>
          <FormHelperText>Select target lists for this campaign</FormHelperText>
        </FormControl>
        
        {campaign.status === 'DRAFT' && (
          <Alert severity="info" sx={{ mt: 2 }}>
            This campaign is in DRAFT status. You can edit its details before scheduling or sending.
          </Alert>
        )}
        
        {/* Hidden button that will be triggered by the drawer's save button */}
        <Button
          id="save-campaign-button"
          sx={{ display: 'none' }}
          onClick={() => handleSaveClick()}
        >
          Save
        </Button>
      </Box>
    </Box>
  );
}

// Wrap the CampaignsPage with DrawerProvider to provide drawer context
export default function Page() {
  return (
    <DrawerProvider>
      <CampaignsPage />
    </DrawerProvider>
  );
}
