"use client";

/**
 * Edit Customer Group Page
 */
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Typography, Box, Paper, Breadcrumbs, Link as MuiLink, Button, Stack, Alert } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useFetchCustomerGroup, useUpdateCustomerGroup } from '@/app/hooks/api/pricing';
import CustomerGroupForm from '@/app/components/admin/pricing/forms/CustomerGroupForm';
import { CustomerGroupFormValues } from '@/app/components/admin/pricing/schemas';
import Link from 'next/link';
import Loader from '@/app/components/common/Loader';
import Notification from '@/app/components/common/Notification';
import useNotification from '@/app/hooks/useNotification';
import EditIcon from '@mui/icons-material/Edit';
import { formatDateTime } from '@/app/utils/dateUtils';

interface EditCustomerGroupPageProps {
  params: {
    id: string;
  };
}

export default function EditCustomerGroupPage({ params }: EditCustomerGroupPageProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const id = parseInt(params.id, 10);
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  
  // State to track if edit mode is enabled
  const [isEditMode, setIsEditMode] = useState(false);
  
  const { data: customerGroup, isLoading, error } = useFetchCustomerGroup(id);
  const { mutate: updateCustomerGroup, isPending: isUpdating } = useUpdateCustomerGroup();

  // Toggle edit mode
  const handleEnableEdit = () => {
    setIsEditMode(true);
  };

  const handleSubmit = (data: CustomerGroupFormValues) => {
    if (!customerGroup) return;
    
    updateCustomerGroup(
      { 
        ...customerGroup,
        ...data
      },
      {
        onSuccess: () => {
          showSuccess(t('pricing.customerGroup.updateSuccess', 'Customer group updated successfully'));
          router.push('/Masters/pricing/customer-groups');
        },
        onError: (error) => {
          console.error('Error updating customer group:', error);
          showError(t('pricing.customerGroup.updateError', 'Error updating customer group'));
        }
      }
    );
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <Loader message={t('pricing.loading', 'Loading...')} />
      </Box>
    );
  }

  if (!customerGroup) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          {t('pricing.customerGroup.notFound', 'Customer group not found')}
        </Alert>
        <Button 
          component={Link} 
          href="/Masters/pricing/customer-groups"
          variant="contained" 
          sx={{ mt: 2 }}
        >
          {t('back', 'Back')}
        </Button>
      </Box>
    );
  }

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
        <Typography color="text.primary">
          {isEditMode ? t('edit', 'Edit') : t('view', 'View')}
        </Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          {isEditMode ? t('pricing.customerGroup.edit', 'Edit Customer Group') : t('pricing.customerGroup.details', 'Customer Group Details')}: {customerGroup.name}
        </Typography>
        
        {!isEditMode && (
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={handleEnableEdit}
          >
            {t('edit', 'Edit')}
          </Button>
        )}
      </Box>

      {/* Form */}
      <Paper sx={{ p: 3 }}>
        {isUpdating ? (
          <Loader message={t('pricing.saving', 'Saving...')} />
        ) : (
          <CustomerGroupForm 
            defaultValues={{
              name: customerGroup.name,
              code: customerGroup.code,
              description: customerGroup.description || '',
              is_active: customerGroup.is_active
            }}
            onSubmit={handleSubmit} 
            isSubmitting={isUpdating}
            isEditMode={isEditMode}
            readOnly={!isEditMode}
          />
        )}
      </Paper>

      {/* Audit Information */}
      {!isEditMode && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('auditInformation', 'Audit Information')}
          </Typography>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Typography variant="body1" fontWeight="bold" sx={{ width: 150 }}>
                {t('createdBy')}:
              </Typography>
              <Typography variant="body1">
                {customerGroup.created_by?.username || 'N/A'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Typography variant="body1" fontWeight="bold" sx={{ width: 150 }}>
                {t('createdAt')}:
              </Typography>
              <Typography variant="body1">
                {formatDateTime(customerGroup.created_at)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Typography variant="body1" fontWeight="bold" sx={{ width: 150 }}>
                {t('updatedBy')}:
              </Typography>
              <Typography variant="body1">
                {customerGroup.updated_by?.username || 'N/A'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Typography variant="body1" fontWeight="bold" sx={{ width: 150 }}>
                {t('updatedAt')}:
              </Typography>
              <Typography variant="body1">
                {formatDateTime(customerGroup.updated_at)}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      )}

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
