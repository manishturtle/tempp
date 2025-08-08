'use client';

import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Chip,
  IconButton,
} from '@mui/material';
import { Download } from '@mui/icons-material';

interface Invoice {
  id: string;
  dateIssued: string;
  billingPeriod: string;
  description: string;
  subDescription?: string;
  amount: string;
  status: 'paid' | 'due' | 'overdue';
}

export const InvoiceHistory = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const invoices: Invoice[] = [
    {
      id: 'INV-2024-001A',
      dateIssued: 'Dec 1, 2024',
      billingPeriod: 'Dec 1 - Dec 31, 2024',
      description: 'CRM - Pro Plan',
      subDescription: 'Campaign credits - Business',
      amount: '$299.00',
      status: 'paid',
    },
    {
      id: 'INV-2024-002A',
      dateIssued: 'Nov 1, 2024',
      billingPeriod: 'Nov 1 - Nov 30, 2024',
      description: 'CRM - Pro Plan',
      subDescription: 'Integration platform - Business',
      amount: '$299.00',
      status: 'paid',
    },
    {
      id: 'INV-2024-003A',
      dateIssued: 'Oct 1, 2024',
      billingPeriod: 'Oct 1 - Oct 31, 2024',
      description: 'CRM - Pro Plan',
      subDescription: 'AI Content - Standard',
      amount: '$249.00',
      status: 'paid',
    },
    {
      id: 'INV-2024-004A',
      dateIssued: 'Sep 1, 2024',
      billingPeriod: 'Sep 1 - Sep 30, 2024',
      description: 'CRM - Basic Plan',
      amount: '$99.00',
      status: 'due',
    },
    {
      id: 'INV-2024-005A',
      dateIssued: 'Aug 1, 2024',
      billingPeriod: 'Aug 1 - Aug 31, 2024',
      description: 'CRM - Basic Plan',
      amount: '$99.00',
      status: 'overdue',
    },
  ];

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleYearFilterChange = (event: SelectChangeEvent) => {
    setYearFilter(event.target.value);
    setPage(0);
  };

  const handleStatusFilterChange = (event: SelectChangeEvent) => {
    setStatusFilter(event.target.value);
    setPage(0);
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Chip
            label="Paid"
            color="success"
            size="small"
            sx={{ minWidth: 70 }}
          />
        );
      case 'due':
        return (
          <Chip
            label="Due"
            color="warning"
            size="small"
            sx={{ minWidth: 70 }}
          />
        );
      case 'overdue':
        return (
          <Chip
            label="Overdue"
            color="error"
            size="small"
            sx={{ minWidth: 70 }}
          />
        );
      default:
        return null;
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const yearMatch =
      yearFilter === 'all' || invoice.dateIssued.includes(yearFilter);
    const statusMatch =
      statusFilter === 'all' || invoice.status === statusFilter;
    return yearMatch && statusMatch;
  });

  const paginatedInvoices = filteredInvoices.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Card>
      <CardContent>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
          flexWrap="wrap"
          gap={2}
        >
          <Typography variant="h6" component="h2">
            Invoice History
          </Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="year-filter">Year</InputLabel>
              <Select
                labelId="year-filter"
                value={yearFilter}
                label="Year"
                onChange={handleYearFilterChange}
              >
                <MenuItem value="all">All Years</MenuItem>
                <MenuItem value="2024">2024</MenuItem>
                <MenuItem value="2023">2023</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="status-filter">Status</InputLabel>
              <Select
                labelId="status-filter"
                value={statusFilter}
                label="Status"
                onChange={handleStatusFilterChange}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="paid">Paid</MenuItem>
                <MenuItem value="due">Due</MenuItem>
                <MenuItem value="overdue">Overdue</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        <TableContainer component={Paper} elevation={0}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Invoice ID</TableCell>
                <TableCell>Date Issued</TableCell>
                <TableCell>Billing Period</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedInvoices.map((invoice) => (
                <TableRow key={invoice.id} hover>
                  <TableCell>{invoice.id}</TableCell>
                  <TableCell>{invoice.dateIssued}</TableCell>
                  <TableCell>{invoice.billingPeriod}</TableCell>
                  <TableCell>
                    {invoice.description}
                    {invoice.subDescription && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        {invoice.subDescription}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Typography fontWeight="medium">{invoice.amount}</Typography>
                  </TableCell>
                  <TableCell>{getStatusChip(invoice.status)}</TableCell>
                  <TableCell>
                    <IconButton size="small">
                      <Download fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredInvoices.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </CardContent>
    </Card>
  );
};
