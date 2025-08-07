'use client';

import { Box } from '@mui/material';
import { PaymentMethods } from '../../TenantAdmin/billing/PaymentMethods';
import { BillingInformation } from '../../TenantAdmin/billing/BillingInformation';
import { InvoiceHistory } from '../../TenantAdmin/billing/InvoiceHistory';

const BillingPage = () => {
  return (
    <Box>
      <Box display="grid" gridTemplateColumns={{ xs: '1fr', lg: '2fr 1fr' }} gap={3} mb={4}>
        <PaymentMethods />
        <BillingInformation />
      </Box>
      <InvoiceHistory />
    </Box>
  );
};

export default BillingPage;
