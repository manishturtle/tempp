"use client";

import { useState, useEffect, ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { useOrderContext } from "@/app/contexts/OrderContext";
import { useInvoiceContext } from "@/app/contexts/InvoiceContext";
import { useAuth } from "@/app/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useTheme, styled } from "@mui/material/styles";
import {
  Container,
  Box,
  Typography,
  Button,
  Grid,
  Alert,
  Divider,
  Skeleton,
  Paper,
} from "@mui/material";
import NextLink from "next/link";

import { useOrderDetails } from "@/app/hooks/api/store/useOrderDetails";
import { formatCurrency } from "@/app/utils/formatters";

const FRONTEND_URL =
  process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";

// --- STYLED COMPONENTS FOR RECEIPT ---

const ReceiptWrapper = styled(Box)(({ theme }) => ({
  width: "100%",
  maxWidth: "550px",
  margin: "0 auto",
  position: "relative",
  filter: "drop-shadow(0 10px 15px rgba(0,0,0,0.08))",
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: "-14px",
    right: "-14px",
    height: "26px",
    backgroundColor: "#e5e7eb",
    borderRadius: "9999px",
    boxShadow: "inset 0px 3px 5px rgba(0, 0, 0, 0.07)",
    zIndex: 1,
  },
}));

const ReceiptContainer = styled(Box)(({ theme }) => ({
  width: "100%",
  backgroundColor: "#f9fafb",
  borderRadius: 0,
  position: "relative",
  top: "13px",
  padding: theme.spacing(3, 4, 3),
  zIndex: 2,
  "&::after": {
    content: '""',
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    transform: "translateY(100%)",
    height: "25px",
    backgroundColor: "#f9fafb ",
    clipPath:
      "polygon(0% 0%, 100% 0%, 100% 20%, 97.5% 80%, 95% 30%, 92.5% 90%, 90% 25%, 87.5% 100%, 85% 40%, 82.5% 95%, 80% 35%, 77.5% 85%, 75% 20%, 72.5% 90%, 70% 50%, 67.5% 80%, 65% 20%, 62.5% 95%, 60% 30%, 57.5% 100%, 55% 25%, 52.5% 85%, 50% 20%, 47.5% 80%, 45% 30%, 42.5% 90%, 40% 25%, 37.5% 100%, 35% 40%, 32.5% 95%, 30% 35%, 27.5% 85%, 25% 20%, 22.5% 90%, 20% 50%, 17.5% 80%, 15% 20%, 12.5% 95%, 10% 30%, 7.5% 100%, 5% 25%, 2.5% 85%, 0% 20%)",
  },
}));

const PerforationSeparator = styled(Box)(({ theme }) => ({
  position: "relative",
  marginLeft: theme.spacing(-4),
  marginRight: theme.spacing(-4),
  marginTop: theme.spacing(3),
  borderTop: "2px dashed #e5e7eb",
  "&::before, &::after": {
    content: '""',
    position: "absolute",
    width: "30px",
    height: "30px",
    backgroundColor: "#f3f4f6",
    borderRadius: "50%",
    top: "-16px",
  },
  "&::before": { left: "-15px" },
  "&::after": { right: "-15px" },
}));

// --- PROP TYPES AND PRESENTATIONAL COMPONENTS ---

type BillingAddressItemProps = {
  label: string;
  children: ReactNode;
};
const BillingAddressItem = ({ label, children }: BillingAddressItemProps) => (
  <Grid container size={{ xs: 12, sm: 3 }} spacing={1}>
    <Grid size={{ xs: 12, sm: 3 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Grid>
    <Grid size={{ xs: 12, sm: 9 }}>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {children}
      </Typography>
    </Grid>
  </Grid>
);

type OrderDetailItemProps = {
  label: string;
  value: string | number;
};
const OrderDetailItem = ({ label, value }: OrderDetailItemProps) => (
  <Box>
    <Typography
      variant="caption"
      sx={{
        color: "text.secondary",
        textTransform: "uppercase",
        fontWeight: 600,
        letterSpacing: "0.05em",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Typography>
    <Typography
      variant="body2"
      sx={{ fontWeight: 500, color: "text.primary", wordBreak: "break-word" }}
    >
      {value}
    </Typography>
  </Box>
);

type OrderItemProps = {
  name: string;
  qty: number;
  price: number;
  imageUrl?: string;
};
const OrderItem = ({ name, qty, price, imageUrl }: OrderItemProps) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
    <Box
      component="img"
      src={imageUrl || "https://placehold.co/80x80/e2e8f0/334155?text=Item"}
      alt={name}
      sx={{
        width: 64,
        height: 64,
        borderRadius: 2,
        objectFit: "cover",
        border: "1px solid #e5e7eb",
      }}
    />
    <Box sx={{ flex: 1 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        {name}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Qty: {qty}
      </Typography>
    </Box>
    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
      {formatCurrency(price)}
    </Typography>
  </Box>
);

type TotalsRowProps = {
  label: string;
  value: number;
  isBold?: boolean;
};
const TotalsRow = ({ label, value, isBold = false }: TotalsRowProps) => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    }}
  >
    <Typography
      variant="body1"
      sx={{ fontWeight: isBold ? 700 : 400, color: "text.secondary" }}
    >
      {label}
    </Typography>
    <Typography
      variant={isBold ? "h6" : "body1"}
      sx={{ fontWeight: isBold ? 700 : 600, color: "text.primary" }}
    >
      {formatCurrency(value)}
    </Typography>
  </Box>
);

/**
 * Order Confirmation Page
 */
export default function OrderConfirmationPage() {
  const { t } = useTranslation("common");
  const theme = useTheme();
  const router = useRouter();
  const params = useParams();
  const tenantSlug = params?.tenant as string;
  const { orderId } = useOrderContext();
  const { setInvoiceId } = useInvoiceContext();
  const { isAuthenticated } = useAuth();

  const {
    data: orderData,
    isLoading,
    isError,
  } = useOrderDetails(orderId || "");

  useEffect(() => {
    if (!orderId) {
      router.push("/store");
    }
  }, [orderId, router]);

  if (isError) {
    return (
      <Container
        maxWidth="md"
        sx={{ py: theme.spacing(8), textAlign: "center" }}
      >
        <Alert severity="error" sx={{ mb: 2 }}>
          {t("store.confirmation.errorLoadingOrder")}
        </Alert>
        <Button component={NextLink} href="/" variant="contained">
          {t("store.confirmation.continueShopping")}
        </Button>
      </Container>
    );
  }

  const coralColor = "#f56565";
  const coralHoverColor = "#e53e3e";

  const buttonSx = {
    py: 1.5,
    px: 4,
    borderRadius: "9999px",
    textTransform: "none",
    fontSize: "1rem",
    fontWeight: "600",
  };

  return (
    <Box
      sx={{
        backgroundColor: "white",
        minHeight: "100vh",
        p: { xs: 2, md: 4 },
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={{ xs: 4, md: 8 }} justifyContent="center">
          {/* --- LEFT COLUMN: Confirmation Message & Billing --- */}
          <Grid
            size={{ xs: 12, md: 7 }}
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-start",
            }}
          >
            <Box sx={{ py: 2 }}>
              <Typography variant="h3" sx={{ fontWeight: "bold", mb: 2 }}>
                Thank you for your purchase!
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 5 }}>
                Your order has been processed. We will notify you via email for
                further updates.
              </Typography>

              <Box sx={{ mb: 5 }}>
                <Typography variant="h6" sx={{ fontWeight: "bold", mb: 3 }}>
                  Billing address
                </Typography>

                {isLoading ? (
                  <Box>
                    <Skeleton height={30} width="80%" />
                    <Skeleton height={30} width="60%" />
                    <Skeleton height={30} width="70%" />
                  </Box>
                ) : (
                  <Box sx={{display:"flex",flexDirection:"column"}}>
                    <BillingAddressItem label="Name">
                      {orderData?.billing_address?.full_name}
                    </BillingAddressItem>
                    <BillingAddressItem label="Address">
                      {[
                        orderData?.billing_address?.address_line1,
                        orderData?.billing_address?.address_line2,
                        orderData?.billing_address?.city,
                        orderData?.billing_address?.state,
                        orderData?.billing_address?.postal_code,
                        orderData?.billing_address?.country,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </BillingAddressItem>
                    <BillingAddressItem label="Phone">
                      {orderData?.billing_address?.phone_number}
                    </BillingAddressItem>
                    <BillingAddressItem label="Email">
                      {orderData?.customer_email || orderData?.contact_email}
                    </BillingAddressItem>
                  </Box>
                )}
              </Box>

              {/* --- UPDATED: Two prominent action buttons --- */}
              {!isLoading && (
                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                  <Button
                    component={NextLink}
                    href={`/${tenantSlug}/store`}
                    variant="contained"
                    color="primary"
                    sx={{
                      ...buttonSx,
                    }}
                  >
                    {t("store.confirmation.continueShopping")}
                  </Button>

                  {orderData?.invoice && (
                    <Button
                      variant="outlined"
                      color="primary"
                      component={NextLink}
                      href={`/${tenantSlug}/store/invoice`}
                      onClick={() => {
                        if (orderData?.invoice?.id) {
                          setInvoiceId(String(orderData.invoice.id));
                        }
                      }}
                      sx={{
                        ...buttonSx,
                      }}
                    >
                      View Invoice
                    </Button>
                  )}
                </Box>
              )}
            </Box>
          </Grid>

          {/* --- RIGHT COLUMN: Order Summary Receipt --- */}
          <Grid size={{ xs: 12, md: 5 }}>
            {isLoading ? (
              <Skeleton
                variant="rectangular"
                height={600}
                sx={{ maxWidth: "550px", mx: "auto" }}
              />
            ) : (
              <ReceiptWrapper>
                <ReceiptContainer>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: "bold", letterSpacing: "-0.025em" }}
                  >
                    Order Summary
                  </Typography>

                  <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid #e5e7eb" }}>
                    <Box sx={{ display: "flex", width: "100%" }}>
                      <Box sx={{ flex: "1 1 0", pr: 1, textAlign: "left" }}>
                        <OrderDetailItem
                          label="Date"
                          value={
                            orderData?.created_at
                              ? new Date(orderData.created_at)
                                  .toLocaleDateString("en-GB") // This will format as dd/mm/yyyy
                                  .split("/")
                                  .join("-") // Convert slashes to dashes
                              : "N/A"
                          }
                        />
                      </Box>
                      <Box
                        sx={{
                          flex: "1.5 1 0",
                          borderLeft: "1px solid #e5e7eb",
                          px: 1,
                          textAlign: "center",
                        }}
                      >
                        <OrderDetailItem
                          label="Order Number"
                          value={orderData?.order_id || "N/A"}
                        />
                      </Box>
                      <Box
                        sx={{
                          flex: "1 1 0",
                          borderLeft: "1px solid #e5e7eb",
                          pl: 1,
                          textAlign: "right",
                        }}
                      >
                        <OrderDetailItem
                          label="Payment Method"
                          value="Pay on Delivery"
                        />
                      </Box>
                    </Box>
                  </Box>

                  <PerforationSeparator />

                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 3,
                      mt: 4,
                    }}
                  >
                    {orderData?.items?.map((item) => (
                      <OrderItem
                        key={item.id}
                        name={item.product_name}
                        qty={item.quantity}
                        price={Number(item.total_price)}
                        imageUrl={item.image_url}
                      />
                    ))}
                  </Box>

                  <Divider sx={{ my: 4 }} />

                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
                  >
                    <TotalsRow
                      label="Sub Total"
                      value={Number(orderData?.subtotal_amount)}
                    />
                    <TotalsRow
                      label="Shipping"
                      value={Number(orderData?.shipping_amount)}
                    />
                    {Number(orderData?.discount_amount) > 0 && (
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography variant="body1" color="success.main">
                          Discount
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{ fontWeight: 600 }}
                          color="success.main"
                        >
                          -{formatCurrency(Number(orderData?.discount_amount))}
                        </Typography>
                      </Box>
                    )}
                    <TotalsRow
                      label="Tax"
                      value={Number(orderData?.tax_amount)}
                    />
                  </Box>

                  <Divider sx={{ my: 3 }} />

                  <TotalsRow
                    label="Order Total"
                    value={Number(orderData?.total_amount)}
                    isBold={true}
                  />
                </ReceiptContainer>
              </ReceiptWrapper>
            )}
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
