'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Header from '../../../../components/AIPlatform/Header';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Button,
  Container,
  useTheme,
} from '@mui/material';
import { useTenant } from '../../../../contexts/ai-platform/TenantContext';
import { format } from 'date-fns';
import {useParams} from 'next/navigation';
import { AI_PLATFORM_API_BASE_URL } from '@/utils/constants';
import { getAuthHeaders } from '@/app/hooks/api/auth';

// Simple date formatter since we can't use date-fns
const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleString();
  } catch (e) {
    return 'Invalid date';
  }
};

// Mock auth context since it's not available in the current context
const useAuth = () => ({
  getAccessToken: async () => {
    // In a real app, this would get the auth token from your auth provider
    return localStorage.getItem('token') || '';
  },
});

interface CreditHistory {
  id: number;
  source: string;
  credits_used: string;
  request_timestamp: string;
  balance_before: string;
  balance_after: string;
  model_name?: string;
}

interface CreditSummary {
  total_credits_used: number;
  credits_remaining: number;
  usage_percentage: number;
  days_remaining: number;
}

interface CreditBalance {
  balance: {
    initial_balance: string;
    current_balance: string;
    last_updated: string;
    purchase_date: string;
    expiry_date: string;
    history: CreditHistory[];
  };
  summary: CreditSummary;
}


const CreditBalanceCard = ({ title, value, subheader, highlight = false }: CreditBalanceCardProps) => {
  const theme = useTheme();
  
  return (
    <Card 
      elevation={2} 
      sx={{ 
        height: '100%',
        display: 'flex', 
        flexDirection: 'column',
        borderLeft: highlight ? `4px solid ${theme.palette.primary.main}` : 'none',
        borderRadius: 2,
        overflow: 'hidden'
      }}
    >
      <CardContent sx={{ flexGrow: 1, p: 3 }}>
        <Typography
          variant="subtitle2"
          color="textSecondary"
          gutterBottom
          sx={{ fontSize: '0.875rem', fontWeight: 500 }}
        >
          {title}
        </Typography>
        <Typography 
          variant="h4" 
          component="div"
          sx={{ 
            fontWeight: 600, 
            color: highlight ? 'primary.main' : 'text.primary',
            mb: 1,
            lineHeight: 1.2
          }}
        >
          {value}
        </Typography>
        <Typography 
          variant="caption" 
          color="textSecondary"
          sx={{ 
            fontSize: '0.75rem',
            display: 'block',
            mt: 0.5
          }}
        >
          {subheader}
        </Typography>
      </CardContent>
    </Card>
  );
};


export default function CreditsPage() {
  const router = useRouter();
  
  const { getAccessToken } = useAuth();
  const theme = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const tenantSlug = useParams().tenant;

  // --- Start of Fix ---
  // The fetchCreditBalance function is wrapped in useCallback to prevent it
  // from being recreated on every render.
  // We've removed `getAccessToken` from the dependency array. Although `getAccessToken`
  // is used inside, its reference changes on every render, which was causing an
  // infinite loop. Since the function's logic is stable, we can safely omit it
  // to stabilize our `fetchCreditBalance` callback.
  const fetchCreditBalance = useCallback(async () => {
    if (!tenantSlug) return;
    
    try {
      setLoading(true);
      const token = await getAccessToken();
      const url = `${AI_PLATFORM_API_BASE_URL}/${tenantSlug}/webhook-management/credits/balance/`;
      console.log('Fetching from URL:', url);
      
      const response = await fetch(url, {
        headers: {
          ...getAuthHeaders()
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Failed to fetch credit balance: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('API Response:', data);
      
      if (data.status === 'success' && data.data) {
        setBalance(data.data);
      } else {
        console.error('Unexpected API response format:', data);
      }
    } catch (error) {
      console.error('Error in fetchCreditBalance:', error);
    } finally {
      setLoading(false);
    }
    // The dependency array now only includes stable values from context.
  }, [tenantSlug]);
  // --- End of Fix ---

  useEffect(() => {
    fetchCreditBalance();
    
    // // Set up an interval to refresh the balance every 30 seconds
    // const intervalId = setInterval(fetchCreditBalance, 30000);
    
    // // Clean up the interval on component unmount
    // return () => clearInterval(intervalId);
  }, [fetchCreditBalance]); // Now this useEffect runs only when fetchCreditBalance is redefined

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const formatDateShort = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Debug log for component state
  console.log('Component state:', { loading, balance });

  if (loading && !balance) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!balance) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">Failed to load credit balance. Please try again later.</Typography>
        <Button onClick={fetchCreditBalance} sx={{ mt: 2 }}>Retry</Button>
      </Box>
    );
  }

  return (
      <>
        <Box>
          <Typography variant="h4" gutterBottom>
            Credit Balance
          </Typography>

          <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <CreditBalanceCard
              title="Current Balance"
              value={balance?.balance?.current_balance}
              subheader={`Last updated: ${format(new Date(balance?.balance?.last_updated), 'MMM d, yyyy, h:mm a')}`}
              highlight
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <CreditBalanceCard
              title="Initial Balance"
              value={balance?.balance?.initial_balance}
              subheader={`Purchased: ${format(new Date(balance?.balance?.purchase_date), 'MMM d, yyyy, h:mm a')}`}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <CreditBalanceCard
              title="Expiry Date"
              value={format(new Date(balance?.balance?.expiry_date), 'MMM d, yyyy')}
              subheader={`${balance?.summary?.days_remaining} days remaining`}
            />
          </Grid>
        </Grid>

      <Paper elevation={0} sx={{mt: 2, p: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
      
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><b>Date</b></TableCell>
                <TableCell><b>Source</b></TableCell>
                <TableCell><b>Model</b></TableCell>
                <TableCell align="right"><b>Credits Used</b></TableCell>
                <TableCell align="right"><b>Balance</b></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {balance?.balance?.history?.length ? (
                balance.balance.history
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((record: CreditHistory) => (
                    <TableRow key={record.id} hover>
                      <TableCell>{formatDate(record.request_timestamp)}</TableCell>
                      <TableCell>
                        <Chip 
                          label={record.source} 
                          size="small" 
                          color={record.source === 'webhook' ? 'primary' : 'secondary'}
                        />
                      </TableCell>
                      <TableCell>{record.submodel_name || 'N/A'}</TableCell>
                      <TableCell align="right">{parseFloat(record.credits_used || '0').toLocaleString()}</TableCell>
                      <TableCell align="right">
                        <Box display="flex" flexDirection="column" alignItems="flex-end">
                          <Box>{parseFloat(record.balance_after || '0').toLocaleString()}</Box>
                          <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                            {parseFloat(record.balance_before || '0').toLocaleString()} → {parseFloat(record.balance_after || '0').toLocaleString()}
                          </Box>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="textSecondary">No usage history found</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {balance?.balance?.history?.length ? (
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={balance.balance.history.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        ) : null}
        </Paper>
      </Box>
    </>
  );
}