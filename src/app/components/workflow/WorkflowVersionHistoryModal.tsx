'use client';

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  LinearProgress,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { VisibilityOutlined, ContentCopyOutlined } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { OfmDataTable } from '@/app/components/common/OfmDataTable';
import { useGetWorkflowVersions, useCopyWorkflowVersion } from '@/app/hooks/api/ofm/useWorkflows';
import { formatDate } from '@/app/utils/date';
import type { WorkflowVersion } from '@/app/types/ofm';

interface WorkflowVersionHistoryModalProps {
  open: boolean;
  onClose: () => void;
  workflowId: string | null;
  workflowName: string | null;
}

export const WorkflowVersionHistoryModal: React.FC<WorkflowVersionHistoryModalProps> = ({
  open,
  onClose,
  workflowId,
  workflowName,
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  // Fetch workflow versions
  const {
    data,
    isLoading,
    isError,
    error
  } = useGetWorkflowVersions(workflowId, {
    enabled: open && !!workflowId
  });

  console.log('Workflow versions data:', data?.results);

  // Copy version mutation
  const { mutate: copyVersion, isLoading: isCopying } = useCopyWorkflowVersion({
    onSuccess: (data) => {
      enqueueSnackbar(t('ofm:workflows.history.copySuccess'), { variant: 'success' });
      onClose();
      router.push(`/Masters/admin/fulfillment/workflows/${workflowId}/versions/${data.id}/edit`);
    },
    onError: (error) => {
      enqueueSnackbar(t('ofm:workflows.history.copyError'), { variant: 'error' });
    }
  });

  // Table columns configuration
  const columns = [
    {
      field: 'version_number',
      headerName: t('ofm:workflows.history.columns.version'),
      flex: 1,
      renderCell: (params: any) => `Version ${params.row.version_number}`,
    },
    {
      field: 'created_at',
      headerName: t('ofm:workflows.history.columns.createdAt'),
      flex: 1,
      renderCell: (params: any) => formatDate(params.row.created_at),
    },
    {
      field: 'created_by',
      headerName: t('ofm:workflows.history.columns.createdBy'),
      flex: 1,
      renderCell: (params: any) => params.row.created_by,
    },
    {
      field: 'is_active',
      headerName: t('ofm:workflows.history.columns.status'),
      flex: 1,
      renderCell: (params: any) => params.row.is_active ? 
        t('ofm:workflows.history.status.active') : 
        t('ofm:workflows.history.status.previous'),
    },
    {
      field: 'notes',
      headerName: t('ofm:workflows.history.columns.notes'),
      flex: 2,
      renderCell: (params: any) => params.row.notes || '',
    },
    {
      field: 'actions',
      headerName: t('ofm:workflows.history.columns.actions'),
      flex: 1,
      sortable: false,
      renderCell: (params: any) => (
        <>
          <Tooltip title={t('ofm:workflows.history.actions.view')}>
            <span>
              <IconButton
                size="small"
                onClick={() => console.log('View version:', params.row.id)}
                disabled={true}
              >
                <VisibilityOutlined />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={t('ofm:workflows.history.actions.copy')}>
            <IconButton
              size="small"
              onClick={() => copyVersion({
                workflowId: workflowId!,
                sourceVersionId: params.row.id
              })}
              disabled={isCopying}
            >
              <ContentCopyOutlined />
            </IconButton>
          </Tooltip>
        </>
      ),
    }
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      aria-labelledby="workflow-version-history-title"
    >
      <DialogTitle id="workflow-version-history-title">
        {t('ofm:workflows.history.title', { name: workflowName || '' })}
      </DialogTitle>
      <DialogContent>
        {isLoading && <LinearProgress />}
        {isError && (
          <Alert severity="error">
            {error?.message || t('ofm:common.errors.loading')}
          </Alert>
        )}
        <OfmDataTable
          rows={data?.results?.map((version: WorkflowVersion) => ({
            id: version.id,
            version_number: version.version_number,
            created_at: version.created_at,
            created_by: version.created_by,
            is_active: version.is_active,
            notes: version.notes || ''
          })) || []}
          columns={columns}
          loading={isLoading}
          noRowsOverlayMessageKey="ofm:workflows.history.noVersions"
          pageSize={10}
          autoHeight
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          {t('ofm:common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WorkflowVersionHistoryModal;
