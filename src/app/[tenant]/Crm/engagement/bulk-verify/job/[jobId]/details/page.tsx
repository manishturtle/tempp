'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Chip, 
  Button, 
  TextField, 
  InputAdornment,
  IconButton,
  CircularProgress,
  Alert,
  Tooltip,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack
} from '@mui/material';
import { useParams } from 'next/navigation';
import { SelectChangeEvent } from '@mui/material/Select';
import { 
  useVerificationJobDetails,
  useJobEmailResults,
  EmailResult
} from '../../../../../../../hooks/engagement/evs/useJobEmailResults';

import { useJobResultsDownloadUrl } from '../../../../../../../hooks/engagement/evs/useVerificationJobs';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from 'next/link';

// Email result interface is now imported from useJobEmailResults.ts

export default function JobDetailsPage() {
  const params = useParams();
  const tenant = params?.tenant as string;
  const jobId = params?.jobId as string;
  
  // State for search and filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  
  // Fetch job details
  const { 
    data: jobDetails, 
    isLoading: isLoadingDetails, 
    isError: isErrorDetails, 
    error: detailsError,
    refetch: refetchDetails
  } = useVerificationJobDetails(tenant, jobId);
  
  // Fetch job email results with pagination, search, and filtering
  const { 
    data: emailResults, 
    isLoading: isLoadingEmails, 
    isError: isErrorEmails, 
    error: emailsError,
    refetch: refetchEmails
  } = useJobEmailResults(tenant, jobId, page, pageSize, searchTerm, statusFilter);
  
  // Download URL mutation
  const getResultsUrlMutation = useJobResultsDownloadUrl(tenant);
  
  // Format date for display
  const formatDate = (dateString?: string | null): string => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Invalid date';
    }
  };
  
  // Handle download of job results
  const handleDownloadResults = () => {
    getResultsUrlMutation.mutate(jobId, {
      onSuccess: (data) => {
        // Open the download URL in a new tab
        if (data && data.download_url) {
          window.open(data.download_url, '_blank');
        } else {
          console.error('Download URL not found in response:', data);
        }
      },
      onError: (downloadError: Error) => {
        console.error('Error getting download URL:', downloadError);
      }
    });
  };
  
  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page when searching
    refetchEmails();
  };
  
  // Handle status filter change
  const handleStatusFilterChange = (event: SelectChangeEvent<string>) => {
    setStatusFilter(event.target.value);
    setPage(1); // Reset to first page when filtering
    refetchEmails();
  };
  
  // Handle pagination change
  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    refetchEmails();
  };
  
  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'valid':
        return <CheckCircleIcon color="success" fontSize="small" />;
      case 'invalid':
        return <ErrorIcon color="error" fontSize="small" />;
      case 'risky':
        return <WarningIcon color="warning" fontSize="small" />;
      default:
        return null;
    }
  };
  
  if (isLoadingDetails) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (isErrorDetails) {
    return (
      <Alert 
        severity="error" 
        sx={{ my: 2 }}
        action={
          <Button color="inherit" size="small" onClick={() => refetchDetails()}>
            Retry
          </Button>
        }
      >
        Failed to load job details: {detailsError instanceof Error ? detailsError.message : 'Unknown error'}
      </Alert>
    );
  }
  
  return (
    <Box>
      {/* Header with back button */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button 
          component={Link}
          href={`/${tenant}/Crm/engagement/bulk-verify/status`}
          startIcon={<ArrowBackIcon />}
          sx={{ mr: 2 }}
        >
          Back to Jobs
        </Button>
        <Typography variant="h5">
          Detailed Report
        </Typography>
      </Box>
      
      {/* Subheader with description */}
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Review and manage email statuses before proceeding to send
      </Typography>
      
      {/* Summary Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        {/* Deliverable */}
        <Box sx={{ flex: '1 1 300px' }}>
          <Paper 
            sx={{ 
              p: 2, 
              height: '100%', 
              backgroundColor: '#f1f8e9', 
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="h4" color="success.main" sx={{ fontWeight: 'bold', mr: 1 }}>
                {jobDetails?.valid_count || 0}
              </Typography>
              <CheckCircleIcon color="success" />
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 1 }}>
              Deliverable
            </Typography>
            <Typography variant="body2" color="success.main">
              Valid email addresses ready to send
            </Typography>
          </Paper>
        </Box>
        
        {/* Risky */}
        <Box sx={{ flex: '1 1 300px' }}>
          <Paper 
            sx={{ 
              p: 2, 
              height: '100%', 
              backgroundColor: '#fff8e1', 
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="h4" color="warning.main" sx={{ fontWeight: 'bold', mr: 1 }}>
                {jobDetails?.risky_count || 0}
              </Typography>
              <WarningIcon color="warning" />
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 1 }}>
              Risky
            </Typography>
            <Typography variant="body2" color="warning.main">
              Potentially problematic addresses
            </Typography>
          </Paper>
        </Box>
        
        {/* Invalid */}
        <Box sx={{ flex: '1 1 300px' }}>
          <Paper 
            sx={{ 
              p: 2, 
              height: '100%', 
              backgroundColor: '#ffebee', 
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="h4" color="error.main" sx={{ fontWeight: 'bold', mr: 1 }}>
                {jobDetails?.invalid_count || 0}
              </Typography>
              <ErrorIcon color="error" />
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 1 }}>
              Invalid
            </Typography>
            <Typography variant="body2" color="error.main">
              Addresses that cannot receive emails
            </Typography>
          </Paper>
        </Box>
      </Box>
      
      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
        {(jobDetails?.status === 'Completed' || jobDetails?.status === 'PartiallyCompleted_OutOfCredits') && (
          <>
            <Button 
              variant="contained" 
              color="primary"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadResults}
              disabled={getResultsUrlMutation.isPending}
            >
              Download Results
            </Button>
            
            <Button 
              component={Link}
              href={`/${tenant}/Crm/engagement/bulk-verify/job/${jobId}/review-and-send`}
              variant="contained" 
              color="success"
              startIcon={<SendIcon />}
            >
              Send Emails
            </Button>
          </>
        )}
        
        <Button 
          variant="outlined" 
          startIcon={<RefreshIcon />}
          onClick={() => {
            refetchDetails();
            refetchEmails();
          }}
        >
          Refresh Data
        </Button>
      </Box>
      
      {/* Email Results Table */}
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">
            Processed Emails
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Processed: {jobDetails?.emails_processed_count || 0} / {jobDetails?.total_emails_in_file || 0}
            </Typography>
          </Box>
        </Box>
        
        {/* Search and Filter Controls */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <form onSubmit={handleSearch} style={{ flex: 1, minWidth: '250px' }}>
            <TextField
              fullWidth
              placeholder="Search emails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton type="submit" edge="end">
                      <SearchIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              size="small"
            />
          </form>
          
          <FormControl sx={{ minWidth: 200 }} size="small">
            <InputLabel id="status-filter-label">Status</InputLabel>
            <Select
              labelId="status-filter-label"
              id="status-filter"
              value={statusFilter}
              label="Status"
              onChange={handleStatusFilterChange}
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="valid">Valid Emails</MenuItem>
              <MenuItem value="risky">Risky Emails</MenuItem>
              <MenuItem value="invalid">Invalid Emails</MenuItem>
            </Select>
          </FormControl>
        </Box>
        
        {/* Email Table */}
        {isLoadingEmails ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : isErrorEmails ? (
          <Alert 
            severity="error" 
            sx={{ my: 2 }}
            action={
              <Button color="inherit" size="small" onClick={() => refetchEmails()}>
                Retry
              </Button>
            }
          >
            Failed to load email results: {emailsError instanceof Error ? emailsError.message : 'Unknown error'}
          </Alert>
        ) : (
          <>
            {/* Table Header */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: '40px 2fr 1fr 1fr 1fr',
              bgcolor: '#f5f5f5',
              p: 1,
              borderRadius: 1,
              mb: 1
            }}>
              <Box>
                <Typography variant="subtitle2">#</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2">EMAIL ADDRESS</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2">VERIFICATION</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2">SUB-STATUS</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2">FLAGS</Typography>
              </Box>
            </Box>
            
            {/* Table Rows */}
            {emailResults?.emails && emailResults.emails.length > 0 ? (
              emailResults.emails.map((email: EmailResult, index: number) => (
                <Box 
                  key={index}
                  sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: '40px 2fr 1fr 1fr 1fr',
                    p: 1,
                    borderBottom: '1px solid #e0e0e0',
                    '&:hover': { bgcolor: '#f9f9f9' }
                  }}
                >
                  <Box>
                    <Typography variant="body2">{(page - 1) * pageSize + index + 1}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2">{email.email}</Typography>
                  </Box>
                  <Box>
                    <Chip 
                      label={email.verification_status} 
                      size="small"
                      color={
                        email.verification_status === 'Valid' ? 'success' : 
                        email.verification_status === 'Risky' ? 'warning' : 'error'
                      }
                      variant="filled"
                    />
                  </Box>
                  <Box>
                    <Typography variant="body2">{email.sub_status.replace(/_/g, ' ')}</Typography>
                  </Box>
                  <Box>
                    {email.verification_flags && (
                      <Stack direction="row" spacing={1}>
                        {email.verification_flags.is_disposable && (
                          <Tooltip title="Disposable Email">
                            <Chip size="small" label="Disposable" color="warning" variant="outlined" />
                          </Tooltip>
                        )}
                        {email.verification_flags.is_role_account && (
                          <Tooltip title="Role Account (e.g. info@, support@)">
                            <Chip size="small" label="Role" color="info" variant="outlined" />
                          </Tooltip>
                        )}
                        {email.verification_flags.is_catch_all && (
                          <Tooltip title="Catch-all Domain">
                            <Chip size="small" label="Catch-all" color="secondary" variant="outlined" />
                          </Tooltip>
                        )}
                      </Stack>
                    )}
                  </Box>
                </Box>
              ))
            ) : (
              <Alert severity="info" sx={{ my: 2 }}>
                No email results found. {searchTerm ? 'Try a different search term.' : ''}
              </Alert>
            )}
            
            {/* Pagination */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Showing {emailResults?.emails?.length ? (page - 1) * pageSize + 1 : 0}-
                {emailResults?.emails?.length ? Math.min(page * pageSize, emailResults.pagination?.total_emails) : 0} of {emailResults?.pagination?.total_emails || 0} results
              </Typography>
              
              <Pagination 
                count={emailResults?.pagination?.total_pages || 1} 
                page={page}
                onChange={handlePageChange}
                color="primary"
              />
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
}
