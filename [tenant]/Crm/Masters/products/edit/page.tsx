'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Box, useTheme, Typography, CircularProgress, Alert } from '@mui/material';
import { useTranslation } from 'react-i18next';

// Import components and hooks
import ProductForm from '@/app/components/admin/products/forms/ProductForm';
import { useProductContext } from '@/app/contexts/ProductContext';
import { useFetchProduct } from '@/app/hooks/api/products';

export default function EditProductPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const tenant = params.tenant as string;
  const theme = useTheme();
  const { selectedProductId } = useProductContext();

  // Fetch product data using the hook
  const { 
    data: productData, 
    isLoading, 
    isError, 
    error 
  } = useFetchProduct(selectedProductId);

  // Redirect if no product ID is selected
  useEffect(() => {
    if (selectedProductId === null) {
      router.push(`/${tenant}/Crm/Masters/products`);
    }
  }, [selectedProductId, router, tenant]);

  return (
    <Box sx={{ pb: 10 }}> 
      
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error instanceof Error ? error.message : t('common.errorOccurred')}
        </Alert>
      )}
      
      {!isLoading && !isError && selectedProductId ? (
        <ProductForm 
          productId={selectedProductId.toString()} 
          isEditMode={true} 
          defaultValues={productData} 
        />
      ) : !isLoading && !isError && (
        <Typography variant="body1">{t('noProductSelected')}</Typography>
      )}
    </Box>
  );
}
