'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Divider, 
  Button, 
  Chip, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Stack, 
  CircularProgress,
  Alert 
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useAdminInvoice } from '@/app/hooks/api/admin/useAdminInvoices';
import { AdminInvoice } from '@/app/types/admin/invoices';
import { formatCurrency, formatDate } from '@/app/utils/formatters';

/**
 * AdminInvoiceDetailPage - Displays detailed information about a specific invoice
 * Shows customer details, billing/shipping addresses, and line items in a 40-60 split layout
 */
export default function AdminInvoiceDetailPage(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { tenant, id } = useParams() as { tenant: string; id: string };
  
  // Use the useAdminInvoice hook to fetch the invoice
  const { data: invoice, isLoading, error } = useAdminInvoice(id);
  
  // Handle back button click
  const handleBack = () => {
    router.push(`/${tenant}/Crm/admin/invoices`);
  };
  
  // Get appropriate status color based on invoice status
  const getInvoiceStatusColor = (status: string): string => {
    switch (status) {
      case 'DRAFT':
        return 'default';
      case 'ISSUED':
      case 'SENT':
      case 'VIEWED':
        return 'primary';
      case 'PAID':
        return 'success';
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };
  
  // Get payment status color
  const getPaymentStatusColor = (status: string): string => {
    switch (status) {
      case 'PAID':
        return 'success';
      case 'UNPAID':
        return 'error';
      case 'PARTIALLY_PAID':
        return 'warning';
      default:
        return 'default';
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Error state
  if (error || !invoice) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">
          {t('invoices.failed_to_load_invoice')}
        </Typography>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBack />} 
          onClick={handleBack}
          sx={{ mt: 2 }}
        >
          {t('invoices.back_to_invoices')}
        </Button>
      </Box>
    );
  }
  
  return (
    <>
      {/* Header with back button and invoice number */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5">{t('invoices.invoice')}: {invoice.invoice_number}</Typography>
          <Chip 
            label={invoice.invoice_status} 
            color={getInvoiceStatusColor(invoice.invoice_status) as any} 
            variant="outlined"
          />
          <Chip 
            label={invoice.payment_status} 
            color={getPaymentStatusColor(invoice.payment_status) as any} 
            variant="outlined"
          />
        </Box>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBack />} 
          onClick={handleBack}
        >
          {t('invoices.back_to_invoices')}
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Left side - 40% width - Customer details */}
                  <Grid size={{xs:12 , md:4}}>
          <Paper sx={{ p: 3, height: '100%', mb: { xs: 3, md: 0 } }} elevation={0}>
            {/* Customer Information */}
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'medium', mb: 2 }}>
              {t('invoices.customer_information')}
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                {invoice.customer_details?.full_name || `${invoice.contact?.first_name || ''} ${invoice.contact?.last_name || ''}`}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {invoice.customer_details?.email || invoice.contact?.email}
              </Typography>
              {(invoice.customer_details?.work_phone || invoice.contact_detail?.work_phone) && (
                <Typography variant="body2" color="text.secondary">
                  {t('invoices.phone')}: {invoice.customer_details?.work_phone || invoice.contact_detail?.work_phone}
                </Typography>
              )}
              {invoice.customer_details?.account_name && (
                <Typography variant="body2" color="text.secondary">
                  {t('invoices.company')}: {invoice.customer_details.account_name}
                </Typography>
              )}
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            {/* Billing Address */}
            {invoice.billing_address && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 1 }}>
                  {t('checkout.billing_address')}
                </Typography>
                <Typography variant="body2">
                  {invoice.billing_address.full_name}
                </Typography>
                <Typography variant="body2">
                  {invoice.billing_address.address_line1}
                </Typography>
                {invoice.billing_address.address_line2 && (
                  <Typography variant="body2">
                    {invoice.billing_address.address_line2}
                  </Typography>
                )}
                <Typography variant="body2">
                  {invoice.billing_address.city}, {invoice.billing_address.state} {invoice.billing_address.postal_code}
                </Typography>
                <Typography variant="body2">
                  {invoice.billing_address.country}
                </Typography>
                <Typography variant="body2">
                  {t('invoices.phone')}: {invoice.billing_address.phone_number}
                </Typography>
              </Box>
            )}
            
            <Divider sx={{ my: 3 }} />
            
            {/* Shipping Address */}
            {invoice.shipping_address && (
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 1 }}>
                  {t('checkout.shipping_address')}
                </Typography>
                <Typography variant="body2">
                  {invoice.shipping_address.full_name}
                </Typography>
                <Typography variant="body2">
                  {invoice.shipping_address.address_line1}
                </Typography>
                {invoice.shipping_address.address_line2 && (
                  <Typography variant="body2">
                    {invoice.shipping_address.address_line2}
                  </Typography>
                )}
                <Typography variant="body2">
                  {invoice.shipping_address.city}, {invoice.shipping_address.state} {invoice.shipping_address.postal_code}
                </Typography>
                <Typography variant="body2">
                  {invoice.shipping_address.country}
                </Typography>
                <Typography variant="body2">
                  {t('invoices.phone')}: {invoice.shipping_address.phone_number}
                </Typography>
              </Box>
            )}
            
            {/* Invoice Additional Details */}
            <Divider sx={{ my: 3 }} />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 2 }}>
                {t('invoices.invoice_details')}
              </Typography>
              <Grid container spacing={2}>
                  <Grid size={{xs:6}}>
                  <Typography variant="body2" color="text.secondary">
                    {t('invoices.invoice_date')}
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(invoice.date)}
                  </Typography>
                </Grid>
                <Grid size={{xs:6}}>
                <Typography variant="body2" color="text.secondary">
                    {t('invoices.due_date')}
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(invoice.due_date)}
                  </Typography>
                </Grid>
                {invoice.reference_number && (
                  <Grid size={{xs:6}}>
                    <Typography variant="body2" color="text.secondary">
                      {t('invoices.reference_number')}
                    </Typography>
                    <Typography variant="body2">
                      {invoice.reference_number}
                    </Typography>
                  </Grid>
                )}
                {invoice.order_id && (
                  <Grid size={{xs:12}}>
                    <Typography variant="body2" color="text.secondary">
                      {t('invoices.order_number')}
                    </Typography>
                    <Typography variant="body2">
                      {invoice.order_id}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          </Paper>
        </Grid>
        
        {/* Right side - 60% width - Line Items and Totals */}
        <Grid size={{xs:12 ,md:8}}>
        <Paper sx={{ p: 3, height: '100%' }} elevation={0}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'medium', mb: 2 }}>
              {t('invoices.line_items')}
            </Typography>
            
            {/* Line Items Table */}
            <TableContainer component={Paper} elevation={0} sx={{ mb: 3, border: '1px solid', borderColor: 'divider' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('invoices.item')}</TableCell>
                    <TableCell align="right">{t('invoices.rate')}</TableCell>
                    <TableCell align="right">{t('invoices.quantity')}</TableCell>
                    <TableCell align="right">{t('invoices.tax_percentage')}</TableCell>
                    <TableCell align="right">{t('invoices.amount')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoice.line_items && invoice.line_items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Typography variant="body2">{item.product_name || item.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{item.product_sku}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(Number(item.rate))}
                      </TableCell>
                      <TableCell align="right">{item.quantity}</TableCell>
                      <TableCell align="right">{item.tax_percentage}%</TableCell>
                      <TableCell align="right">
                        {formatCurrency(Number(item.total))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Invoice Totals */}
            <Box sx={{ ml: 'auto', maxWidth: '300px' }}>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">{t('invoices.subtotal')}</Typography>
                  <Typography variant="body2">
                    {formatCurrency(Number(invoice.sub_total))}
                  </Typography>
                </Box>
                
                {parseFloat(invoice.discount_amount) > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">{t('invoices.discount')}</Typography>
                    <Typography variant="body2">
                      -{formatCurrency(Number(invoice.discount_amount))}
                    </Typography>
                  </Box>
                )}
                
                {parseFloat(invoice.total_tax_amount) > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">{t('invoices.tax')}</Typography>
                    <Typography variant="body2">
                      {formatCurrency(Number(invoice.total_tax_amount))}
                    </Typography>
                  </Box>
                )}
                
                {parseFloat(invoice.other_charges) > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">{t('invoices.other_charges')}</Typography>
                    <Typography variant="body2">
                      {formatCurrency(Number(invoice.other_charges))}
                    </Typography>
                  </Box>
                )}
                
                <Divider />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                    {t('invoices.grand_total')}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                    {formatCurrency(Number(invoice.grand_total))}
                  </Typography>
                </Box>
              </Stack>
            </Box>
            
            {/* Notes and Terms */}
            {(invoice.notes || invoice.terms) && (
              <Box sx={{ mt: 4 }}>
                <Divider sx={{ mb: 3 }} />
                
                {invoice.notes && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'medium' }}>
                      {t('invoices.notes')}
                    </Typography>
                    <Typography variant="body2">{invoice.notes}</Typography>
                  </Box>
                )}
                
                {invoice.terms && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'medium' }}>
                      {t('invoices.terms')}
                    </Typography>
                    <Typography variant="body2">{invoice.terms}</Typography>
                  </Box>
                )}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </>
  );
}
