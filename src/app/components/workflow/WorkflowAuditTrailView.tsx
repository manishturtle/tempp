'use client';

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  LinearProgress,
  Stack,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useGetWorkflowAuditLog } from '@/app/hooks/api/ofm/useWorkflowQueries';
import { formatDate } from '@/app/utils/date';
import { OfmDataTable } from '@/app/components/common/OfmDataTable';

interface WorkflowAuditTrailViewProps {
  workflowId: string | null;
}

export const WorkflowAuditTrailView: React.FC<WorkflowAuditTrailViewProps> = ({
  workflowId,
}) => {
  const { t } = useTranslation();

  // Fetch audit log data
  const {
    data,
    isLoading,
    isError,
    error
  } = useGetWorkflowAuditLog(workflowId!);

  // Table columns configuration
  const columns = [
    {
      field: 'change_timestamp',
      headerName: t('ofm:workflows.audit.columns.timestamp'),
      flex: 1,
      renderCell: (params: any) => formatDate(params.row.change_timestamp),
    },
    {
      field: 'user_id',
      headerName: t('ofm:workflows.audit.columns.user'),
      flex: 1,
    },
    {
      field: 'version_number',
      headerName: t('ofm:workflows.audit.columns.version'),
      flex: 1,
      renderCell: (params: any) => {
        const version = params.row.workflow_version;
        return version ? `Version ${version.version_number}` : '-';
      },
    },
    {
      field: 'change_description',
      headerName: t('ofm:workflows.audit.columns.description'),
      flex: 2,
    },
    {
      field: 'change_details',
      headerName: t('ofm:workflows.audit.columns.details'),
      flex: 2,
      renderCell: (params: any) => {
        const details = params.row.change_details;
        if (!details) return '-';
        
        const detailsText = [];
        if (details.workflow_name) {
          detailsText.push(`Workflow: ${details.workflow_name}`);
        }
        if (details.num_steps !== undefined) {
          detailsText.push(`Steps: ${details.num_steps}`);
        }
        if (details.version_number !== undefined) {
          detailsText.push(`Version: ${details.version_number}`);
        }
        return detailsText.join(' | ') || '-';
      },
    },
  ];

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Stack spacing={2}>
        {isError && (
          <Alert severity="error">
            {error?.message || t('ofm:common.errors.loading')}
          </Alert>
        )}
        
        {isLoading && <LinearProgress />}
        
        <OfmDataTable
          rows={data?.results || []}
          rowCount={data?.count || 0}
          columns={columns}
          loading={isLoading}
          noRowsOverlayMessageKey="ofm:workflows.audit.noHistory"
          pageSize={10}
          autoHeight
        />
      </Stack>
    </Paper>
  );
};

export default WorkflowAuditTrailView;
