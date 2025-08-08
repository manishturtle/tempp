'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, IconButton, useTheme, useMediaQuery } from '@mui/material';
import { useTranslation } from 'react-i18next';

// Import components and hooks
import ProductForm from '@/app/components/admin/products/forms/ProductForm';


export default function AddProductPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  
  

  return (
    <Box sx={{ pb: 10 }}> 
    
          <ProductForm  />

    </Box>
  );
}
