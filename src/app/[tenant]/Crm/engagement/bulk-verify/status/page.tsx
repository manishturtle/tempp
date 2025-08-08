'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  CircularProgress, 
  Alert,
  LinearProgress,
  Paper,
  IconButton,
  Tooltip,
  Snackbar,
  Divider
} from '@mui/material';
import { useParams, useRouter } from 'next/navigation';
import { 
  useVerificationJobs, 
  useJobResultsDownloadUrl,
  VerificationJob 
} from '../../../../../hooks/engagement/evs/useVerificationJobs';
import { StatusDisplay, JobStatusDisplay } from '../../../../../components/Engagement/email-verification/StatusDisplay';
import ContentCard from '../../../../../components/common/ContentCard';
// import CustomDataGrid from '../../../../components/common/CustomDataGrid';
import CustomDataGrid from '../../../../../components/common/CustomDataGrid';
import { GridColDef, GridRenderCellParams, GridRowParams } from '@mui/x-data-grid';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import HelpIcon from '@mui/icons-material/Help';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SendIcon from '@mui/icons-material/Send';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import AnimatedDrawer from '../../../../../components/common/AnimatedDrawer';
import { DrawerProvider, useDrawer } from '../../../../../contexts/DrawerContext';
import Link from 'next/link';

// Define the type for JobResultsURL if not already defined
interface JobResultsURL {
  job_id: string;
  download_url: string;
  expires_at: string; // ISO datetime string
  status: string;
}

// Extend VerificationJob type to include missing properties
interface ExtendedVerificationJob extends Omit<VerificationJob, 'total_emails_in_file'> {
  total_records?: number;
  total_emails_in_file?: number;
  risky_count?: number;
}

export default function JobStatusPage() {
  return (
    <DrawerProvider>
      <JobStatusPageContent />
    </DrawerProvider>
  );
}

function JobStatusPageContent() {
  const params = useParams();
  const router = useRouter();
  const tenant = params?.tenant as string;
  
  // Pagination state
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });
  
  // Convert 0-based page index to 1-based page number for API
  const apiPage = paginationModel.page + 1;
  
  // Use the updated hook with pagination parameters
  const { data, isLoading, isError, error, refetch } = useVerificationJobs(
    tenant,
    apiPage,
    paginationModel.pageSize
  );
  
  // State for selected job and drawer
  const [selectedJob, setSelectedJob] = useState<ExtendedVerificationJob | null>(null);
  
  // Use drawer context
  const drawerContext = useDrawer();
  
  // State for snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });
  
  // Results download mutation
  const getResultsUrlMutation = useJobResultsDownloadUrl(tenant);
  
  // Handle download results
  const handleDownloadResults = async (jobId: string) => {
    try {
      const response = await getResultsUrlMutation.mutateAsync(jobId);
      
      // Open the download URL in a new tab
      if (response && response.download_url) {
        window.open(response.download_url, '_blank');
        setSnackbar({
          open: true,
          message: 'Download initiated successfully',
          severity: 'success'
        });
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to get download URL',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error downloading results:', error);
      setSnackbar({
        open: true,
        message: 'Error downloading results',
        severity: 'error'
      });
    }
  };
  
  // Handle row click to open drawer
  const handleRowClick = (params: GridRowParams) => {
    const job = data?.jobs.find(job => job.id === params.id) as ExtendedVerificationJob | undefined;
    if (job) {
      setSelectedJob(job);
      drawerContext?.updateFormData({ job });
      drawerContext?.openDrawer('view');
    }
  };



  // Handle drawer close
  const handleDrawerClose = () => {
    drawerContext?.closeDrawer();
    setSelectedJob(null);
  };
  
  // Format date for display
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };
  
  // Calculate completion percentage
  const getCompletionPercentage = (job: VerificationJob) => {
    if (!job) return 0;
    
    if (job.status === 'Completed' || job.status === 'PartiallyCompleted_OutOfCredits') {
      return 100;
    }
    
    if (job.status === 'Failed') {
      return 100; // Show full bar for failed jobs too
    }
    
    if (job.emails_processed_count === 0 || job.total_emails_in_file === 0) {
      return 0;
    }
    
    return Math.round((job.emails_processed_count / job.total_emails_in_file) * 100);
  };

  const columns: GridColDef[] = [
    { 
      field: 'job_name', 
      headerName: 'Job Name', 
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams<VerificationJob>) => (
        <Typography variant="body2" noWrap>
          {params.value || 'Unnamed Job'}
        </Typography>
      )
    },
    { 
      field: 'original_filename', 
      headerName: 'File Name', 
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams<VerificationJob>) => (
        <Typography variant="body2" noWrap>
          {params.value || 'N/A'}
        </Typography>
      )
    },
    { 
      field: 'total_emails_in_file', 
      headerName: 'Total Emails', 
      width: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<VerificationJob>) => (
        <Typography variant="body2">
          {params.row.total_emails_in_file || params.row.total_records || 0}
        </Typography>
      )
    },
    { 
      field: 'submitted_at', 
      headerName: 'Submitted', 
      width: 140,
      renderCell: (params: GridRenderCellParams<VerificationJob>) => (
        <Typography variant="body2">
          {formatDate(params.value)}
        </Typography>
      )
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 130,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<VerificationJob>) => (
        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <JobStatusDisplay status={params.value} variant="chip" size="small" />
        </Box>
      )
    },
    { 
      field: 'valid_count', 
      headerName: 'Valid', 
      width: 80,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<VerificationJob>) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
          <Typography variant="body2">{params.row.valid_count || 0}</Typography>
          <Tooltip title="Emails that are valid and can be safely used.">
            <CheckCircleIcon fontSize="small" color="success" />
          </Tooltip>
        </Box>
      )
    },
    { 
      field: 'invalid_count', 
      headerName: 'Invalid', 
      width: 80,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<VerificationJob>) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
          <Typography variant="body2">{params.row.invalid_count || 0}</Typography>
          <Tooltip title="Emails that are invalid and should not be used.">
            <ErrorIcon fontSize="small" color="error" />
          </Tooltip>
        </Box>
      )
    },
    { 
      field: 'unknown_count', 
      headerName: 'Unknown', 
      width: 80,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<VerificationJob>) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
          <Typography variant="body2">{params.row.unknown_count || 0}</Typography>
          <Tooltip title="Emails with unknown status that couldn't be verified.">
            <HelpIcon fontSize="small" color="disabled" />
          </Tooltip>
        </Box>
      )
    },
   
  ];

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert 
        severity="error" 
        sx={{ my: 2 }}
        action={
          <Button 
            color="inherit" 
            size="small"
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
          >
            Retry
          </Button>
        }
      >
        Error loading verification jobs: {error?.message || 'Unknown error'}
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5, mt: -2 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Bulk Verify Status
        </Typography>
        <Button 
          variant="contained" 
          color="primary"
          startIcon={<RefreshIcon />}
          onClick={() => refetch()}
          sx={{ height: '36px' }}
        >
          Refresh
        </Button>
      </Box>
      
      <ContentCard sx={{ p: 0, m: 0 }}>
        <CustomDataGrid
          rows={data?.jobs || []}
          columns={columns}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[5, 10, 25, 50, 100]}
          rowCount={data?.total_count || 0}
          paginationMode="server"
          onRowClick={handleRowClick}
          autoHeight
          getRowId={(row) => row.id}
        />
      </ContentCard>

      {/* AnimatedDrawer for job details */}
      <AnimatedDrawer
        open={drawerContext?.isOpen}
        onClose={handleDrawerClose}
        title={selectedJob ? `Job: ${selectedJob.job_name}` : 'Job Details'}
        sidebarIcons={[
          {
            id: 'view',
            icon: <VisibilityIcon />,
            tooltip: 'View Details',
            onClick: () => drawerContext?.setActiveSidebarItem('view')
          },
          {
            id: 'download',
            icon: <DownloadIcon />,
            tooltip: 'Download Results',
            onClick: () => selectedJob && handleDownloadResults(selectedJob.id)
          }
        ]}
        defaultSidebarItem="view"
      >
        {drawerContext?.activeSidebarItem === 'view' && selectedJob && (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Job Details
            </Typography>
            
            <Paper sx={{ p: 0.5, mb: 0.5 }}>
              <Typography variant="subtitle1" gutterBottom>
                Job Information
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">File Name:</Typography>
                  <Typography variant="body2">{selectedJob.original_filename}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Status:</Typography>
                  <JobStatusDisplay status={selectedJob.status} variant="chip" size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Submitted:</Typography>
                  <Typography variant="body2">{formatDate(selectedJob.submitted_at)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Completed:</Typography>
                  <Typography variant="body2">{formatDate(selectedJob.completed_at)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Total Records:</Typography>
                  <Typography variant="body2">
                    {selectedJob.total_records || selectedJob.total_emails_in_file || 'N/A'}
                  </Typography>
                </Box>
              </Box>
            </Paper>
            
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Verification Results
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Valid:</Typography>
                  <Typography variant="body2" color="success.main">
                    {selectedJob.valid_count || 0} (
                    {selectedJob.total_emails_in_file 
                      ? Math.round((selectedJob.valid_count || 0) / selectedJob.total_emails_in_file * 100) 
                      : 0}%)
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Invalid:</Typography>
                  <Typography variant="body2" color="error.main">
                    {selectedJob.invalid_count || 0} (
                    {selectedJob.total_emails_in_file 
                      ? Math.round((selectedJob.invalid_count || 0) / selectedJob.total_emails_in_file * 100) 
                      : 0}%)
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Unknown:</Typography>
                  <Typography variant="body2" color="warning.main">
                    {selectedJob.unknown_count || 0} (
                    {selectedJob.total_emails_in_file 
                      ? Math.round((selectedJob.unknown_count || 0) / selectedJob.total_emails_in_file * 100) 
                      : 0}%)
                  </Typography>
                </Box>
                {selectedJob.risky_count !== undefined && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Risky:</Typography>
                    <Typography variant="body2" color="warning.main">
                      {selectedJob.risky_count || 0} (
                      {selectedJob.total_emails_in_file 
                        ? Math.round((selectedJob.risky_count || 0) / selectedJob.total_emails_in_file * 100) 
                        : 0}%)
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
            
            {selectedJob.status === 'completed' && (
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleDownloadResults(selectedJob.id)}
                  disabled={getResultsUrlMutation.isPending}
                >
                  Download Results
                </Button>
              </Box>
            )}
          </Box>
        )}
        

        
        {drawerContext?.activeSidebarItem === 'download' && selectedJob && (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Download Results
            </Typography>
            <Paper sx={{ p: 2 }}>
              <Typography variant="body1" gutterBottom>
                Download verification results for this job.
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleDownloadResults(selectedJob.id)}
                  disabled={getResultsUrlMutation.isPending || selectedJob.status !== 'completed'}
                >
                  {selectedJob.status !== 'completed' 
                    ? 'Job not completed' 
                    : 'Download CSV Results'}
                </Button>
                {getResultsUrlMutation.isPending && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    <Typography variant="body2">Preparing download...</Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </Box>
        )}
      </AnimatedDrawer>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}