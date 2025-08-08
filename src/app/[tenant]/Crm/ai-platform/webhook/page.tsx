'use client';

import { useRouter } from 'next/navigation';
import { Box } from '@mui/material';
import AppLayout from '../../../../components/AIPlatform/AppLayout';
import { useTenant } from '../../../../contexts/ai-platform/TenantContext';
import { useEffect, useState } from 'react';
import { useRoleAccess } from '../../../../contexts/ai-platform/RoleAccessContext';
import FeatureGuard from '../../../../components/AIPlatform/FeatureGuard';
import { useSearchParams, useParams } from 'next/navigation';
import CustomSnackbar from '../../../../components/AIPlatform/snackbar/CustomSnackbar';
import { AI_PLATFORM_API_BASE_URL } from '@/utils/constants';

import { 
  Typography, 
  Paper, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  IconButton,
  CircularProgress,
  Chip,
  Snackbar,
  Alert
} from '@mui/material';
import ConfirmationDialog from '../../../../components/AIPlatform/ConfirmationDialog';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  ContentCopy as ContentCopyIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { getWebhookConfigs, deleteWebhookConfig } from '../../../../services_ai/route';


export interface WebhookFormData {
  id?: string;
  name: string;
  incoming_url: string;
  description: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  published_prompt_variant?: {
    id: string;
    name: string;
    version: string;
  };
}


interface Webhook {
  id: string;
  name: string;
  incoming_url: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // published_prompt_variant: string;
  [key: string]: any; // Index signature to match WebhookFormData
}

function WebhookList() {
  const router = useRouter();
  const { isLoading: tenantLoading } = useTenant();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    webhookId: '',
    webhookName: ''
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });

  const tenantSlug = useParams().tenant;
  const apiBaseUrl = AI_PLATFORM_API_BASE_URL || '';
  

  const fetchWebhooks = async () => {
    console.log("Fetching webhooks...");
    try {
      // Don't fetch if tenant data isn't loaded yet
      if (tenantLoading || !tenantSlug || !apiBaseUrl) {
        return;
      }
      setLoading(true);
      const data = await getWebhookConfigs(tenantSlug);
      setWebhooks(data);
    } catch (error) {
      console.error('Error fetching webhooks:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load webhooks',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("useEffect called...");
    if (!tenantLoading) {
      fetchWebhooks();
    }
  }, [tenantLoading, tenantSlug, apiBaseUrl]);

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteDialog({
      open: true,
      webhookId: id,
      webhookName: name
    });
  };

  const handleDeleteConfirm = async () => {
    const { webhookId } = deleteDialog;
    try {
      await deleteWebhookConfig(webhookId, tenantSlug);
      setWebhooks(prev => prev.filter(wh => wh.id !== webhookId));
      setSnackbar({
        open: true,
        message: 'Webhook deleted successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting webhook:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete webhook',
        severity: 'error'
      });
    } finally {
      setDeleteDialog({
        open: false,
        webhookId: '',
        webhookName: ''
      });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({
      open: false,
      webhookId: '',
      webhookName: ''
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSnackbar({
      open: true,
      message: 'Copied to clipboard',
      severity: 'success'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Get role access hooks
  const { hasPermission, loading: rolesLoading } = useRoleAccess();
  
  // // If roles are still loading, show loading indicator
  // if (rolesLoading) {
  //   return (
  //     <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
  //       <CircularProgress />
  //       <Typography sx={{ ml: 2 }}>Loading permissions...</Typography>
  //     </Box>
  //   );
  // }
  
  return (
    // <FeatureGuard
    //   featureKey="webhook_configration"
    //   fallback={
    //     <Box sx={{ p: 3, textAlign: 'center' }}>
    //       <Typography variant="h5" color="error" gutterBottom>
    //         Access Denied
    //       </Typography>
    //       <Typography variant="body1">
    //         You don't have permission to access the Webhook Configuration feature.
    //         Please contact your administrator for assistance.
    //       </Typography>
    //     </Box>
    //   }
    // >
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">Webhook Configurations</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchWebhooks}
            disabled={loading}
            sx={{ mr: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            // onClick={() => router.push(`/${tenantSlug}/webhook/create`)}

            onClick={() => {
              // Check permission before publishing
              // if (hasPermission('webhook_configration', 'create_webhook')) {
                router.push(`/${tenantSlug}/Crm/ai-platform/webhook/create`)
              // } else {
              //   setSnackbar({
              //     open: true,
              //     message: 'You don\'t have permission to publish prompts',
              //     severity: 'error'
              //   });
              // }
            }}
          >
            Add Webhook
          </Button>
        </Box>
      </Box>

      <Paper>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>URL</TableCell>
                  {/* <TableCell>Prompt Version</TableCell> */}
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {webhooks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No webhooks found. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  webhooks.map((webhook) => (
                    <TableRow key={webhook.id}>
                      <TableCell>{webhook.name}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {webhook.incoming_url}
                        </Typography>
                      </TableCell>
                      {/* <TableCell>v{webhook.published_prompt_variant ? webhook.published_prompt_variant : 'N/A'}</TableCell> */}
                      <TableCell>
                        <Chip 
                          label={webhook.is_active ? 'Active' : 'Inactive'} 
                          color={webhook.is_active ? 'success' : 'default'} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>{formatDate(webhook.created_at)}</TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => router.push(`/${tenantSlug}/Crm/ai-platform/webhook/create?id=${webhook.id}`)}
                          sx={{ mr: 1 }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          onClick={() => handleDeleteClick(webhook.id, webhook.name)}
                          color="error"
                          size="small"
                          title="Delete"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <ConfirmationDialog
        open={deleteDialog.open}
        title="Delete Webhook"
        message={`Are you sure you want to delete the webhook "${deleteDialog.webhookName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmColor="error"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />

      <CustomSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      />
    </>
    // </FeatureGuard>
  );
}


export default function WebhookPage() {
  const router = useRouter();
  const tenantSlug = useParams().tenant;

  const handleEditClick = (webhook: WebhookFormData) => {
    router.push(`/${tenantSlug}/Crm/ai-platform/webhook/create?id=${webhook.id}`);
  };

  return (
      <>
        {/* Main content */}
        <Box sx={{ flex: 1}}>
          <WebhookList onEdit={handleEditClick} />
        </Box>
      </>
  );
}
