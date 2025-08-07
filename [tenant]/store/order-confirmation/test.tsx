import React from 'react';
import { Box, Typography, Grid, Divider } from '@mui/material';
import { createTheme, ThemeProvider, styled } from '@mui/material/styles';

// Define a theme to import the 'Inter' font
const theme = createTheme({
  typography: {
    fontFamily: 'Inter, sans-serif',
  },
});

const ReceiptWrapper = styled(Box)({
  width: '100%',
  maxWidth: '550px',
  margin: '5rem auto 4rem',
  position: 'relative',
  filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.08))',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '-14px',
    right: '-14px',
    height: '26px',
    backgroundColor: '#e5e7eb',
    borderRadius: '9999px',
    boxShadow: 'inset 0px 3px 5px rgba(0, 0, 0, 0.07)',
    zIndex: 1,
  },
});

const ReceiptContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  backgroundColor: 'white',
  borderRadius: 0,
  position: 'relative',
  top: '13px',
  padding: theme.spacing(3, 4, 3),
  zIndex: 2,
  '&::after': {
    content: '""',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    transform: 'translateY(100%)',
    height: '25px',
    backgroundColor: 'white',
    clipPath: 'polygon(0% 0%, 100% 0%, 100% 20%, 97.5% 80%, 95% 30%, 92.5% 90%, 90% 25%, 87.5% 100%, 85% 40%, 82.5% 95%, 80% 35%, 77.5% 85%, 75% 20%, 72.5% 90%, 70% 50%, 67.5% 80%, 65% 20%, 62.5% 95%, 60% 30%, 57.5% 100%, 55% 25%, 52.5% 85%, 50% 20%, 47.5% 80%, 45% 30%, 42.5% 90%, 40% 25%, 37.5% 100%, 35% 40%, 32.5% 95%, 30% 35%, 27.5% 85%, 25% 20%, 22.5% 90%, 20% 50%, 17.5% 80%, 15% 20%, 12.5% 95%, 10% 30%, 7.5% 100%, 5% 25%, 2.5% 85%, 0% 20%)',
  },
}));


const PerforationSeparator = styled(Box)(({ theme }) => ({
    position: 'relative',
    marginLeft: theme.spacing(-4),
    marginRight: theme.spacing(-4),
    marginTop: theme.spacing(3),
    borderTop: '2px dashed #e5e7eb',
    '&::before, &::after': {
        content: '""',
        position: 'absolute',
        width: '30px',
        height: '30px',
        backgroundColor: '#f3f4f6',
        borderRadius: '50%',
        top: '-16px',
    },
    '&::before': {
        left: '-15px',
    },
    '&::after': {
        right: '-15px',
    },
}));


const OrderDetailItem = ({ label, value }) => (
    <Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
            {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
            {value}
        </Typography>
    </Box>
);

const OrderItem = ({ name, pack, qty, price, imageUrl }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
            component="img"
            src={imageUrl}
            alt={name}
            sx={{ width: 80, height: 80, borderRadius: 2, objectFit: 'cover' }}
        />
        <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{name}</Typography>
            <Typography variant="body2" color="text.secondary">Pack: {pack}</Typography>
            <Typography variant="body2" color="text.secondary">Qty: {qty}</Typography>
        </Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>${price.toFixed(2)}</Typography>
    </Box>
);

const TotalsRow = ({ label, value, isBold = false }) => (
     <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body1" sx={{ fontWeight: isBold ? 700 : 400, color: 'text.primary' }}>{label}</Typography>
        <Typography variant={isBold ? 'h6' : 'subtitle1'} sx={{ fontWeight: isBold ? 700 : 500, color: 'text.primary' }}>
          {typeof value === 'number' ? `$${value.toFixed(2)}` : value}
        </Typography>
    </Box>
);


function OrderSummary() {
  return (
    <ReceiptWrapper>
      <ReceiptContainer>
        <Box sx={{ textAlign: 'left', mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'text.primary', letterSpacing: '-0.025em' }}>
            Order Summary
          </Typography>
        </Box>

        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e5e7eb' }}>
          <Box sx={{ display: 'flex', width: '100%'}}>
             {/* --- CHANGE: Set flex to '1' for equal width --- */}
             <Box sx={{ flex: '1 1 0', pr: 2, textAlign: 'left' }}>
                <OrderDetailItem label="Date" value="02 May 2023" />
            </Box>
             <Box sx={{ flex: '1.5 1 0', borderLeft: '1px solid #e5e7eb', px: 2, textAlign: 'center' }}>
                 <OrderDetailItem label="Order Number" value="024-125478956" />
            </Box>
             {/* --- CHANGE: Set flex to '1' for equal width --- */}
             <Box sx={{ flex: '1 1 0', borderLeft: '1px solid #e5e7eb', pl: 2, textAlign: 'right' }}>
                <OrderDetailItem label="Payment Method" value="Mastercard" />
            </Box>
          </Box>
        </Box>
        
        <PerforationSeparator />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 4 }}>
           <OrderItem name="All In One Chocolate Combo" pack="Medium" qty={1} price={50.00} imageUrl="https://placehold.co/80x80/e2e8f0/334155?text=Item" />
           <OrderItem name="Desire Of Hearts" pack="Large" qty={1} price={50.00} imageUrl="https://placehold.co/80x80/e2e8f0/334155?text=Item" />
        </Box>
        
        <Divider sx={{ my: 4 }} />
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <TotalsRow label="Sub Total" value={100.00} />
            <TotalsRow label="Shipping" value={2.00} />
            <TotalsRow label="Tax" value={5.00} />
        </Box>
        
        <Divider sx={{ my: 3 }} />

        <TotalsRow label="Order Total" value={107.00} isBold={true} />
        
      </ReceiptContainer>
    </ReceiptWrapper>
  );
}

// Main App component
export default function App() {
  return (
        <Box sx={{ backgroundColor: '#f3f4f6', minHeight: '100vh', p: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <OrderSummary />
        </Box>
  );
}