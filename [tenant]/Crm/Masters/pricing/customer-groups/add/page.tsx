"use client";

/**
 * Add Customer Group Page
 */
import React from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Paper, Breadcrumbs, Link as MuiLink, Alert } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useCreateCustomerGroup } from '@/app/hooks/api/pricing';
import CustomerGroupForm from '@/app/components/admin/pricing/forms/CustomerGroupForm';
import { CustomerGroupFormValues } from '@/app/components/admin/pricing/schemas';
import Link from 'next/link';
import Loader from '@/app/components/common/Loader';
import Notification from '@/app/components/common/Notification';
import useNotification from '@/app/hooks/useNotification';

export default function AddCustomerGroupPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  const { mutate: createCustomerGroup, isPending } = useCreateCustomerGroup();

  const handleSubmit = (data: CustomerGroupFormValues) => {
    createCustomerGroup(data, {
      onSuccess: () => {
        showSuccess(t('pricing.customerGroup.createSuccess', 'Customer group created successfully'));
        router.push('/Masters/pricing/customer-groups');
      },
      onError: (error) => {
        console.error('Error creating customer group:', error);
        showError(t('pricing.customerGroup.createError', 'Error creating customer group'));
      }
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <MuiLink component={Link} href="/Masters" underline="hover" color="inherit">
          {t('dashboard', 'Dashboard')}
        </MuiLink>
        <MuiLink component={Link} href="/Masters/pricing/customer-groups" underline="hover" color="inherit">
          {t('pricing.customerGroups', 'Customer Groups')}
        </MuiLink>
        <Typography color="text.primary">{t('add', 'Add')}</Typography>
      </Breadcrumbs>

      <Typography variant="h4" gutterBottom>
        {t('pricing.customerGroup.add', 'Add Customer Group')}
      </Typography>

      {/* Form */}
      <Paper sx={{ p: 3 }}>
        {isPending ? (
          <Loader message={t('pricing.saving', 'Saving...')} />
        ) : (
          <CustomerGroupForm onSubmit={handleSubmit} isSubmitting={isPending} />
        )}
      </Paper>

      {/* Notification */}
      <Notification
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={hideNotification}
      />
    </Box>
  );
}
