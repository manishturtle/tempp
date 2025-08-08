"use client";

import { InventoryAdjustmentForm } from '@/app/components/admin/inventory/InventoryAdjustmentForm';
import { Box, Typography, Paper } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function InventoryAdjustmentPage() {
  const { t } = useTranslation();

  return (
    <Box>
        <InventoryAdjustmentForm />
    </Box>
  );
}