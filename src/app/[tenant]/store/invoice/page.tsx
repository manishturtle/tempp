"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "@mui/material/styles";
import { useQuery } from "@tanstack/react-query";
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Divider,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Link,
} from "@mui/material";
import ReceiptIcon from "@mui/icons-material/Receipt";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Invoice, getInvoiceById } from "@/app/hooks/api/store/invoiceService";
import { useInvoiceContext } from "@/app/contexts/InvoiceContext";
import { formatCurrency } from "@/app/utils/formatters";
import { formatDate } from "@/app/utils/formatters";
import NextLink from "next/link";
import { useTranslation } from "react-i18next";
import Image from "next/image";

/**
 * Invoice Page
 * Displays the details of an invoice
 */
export default function InvoicePage() {
  const { t } = useTranslation("common");
  const theme = useTheme();
  const router = useRouter();
  const params = useParams();
  const tenantSlug = params?.tenant as string;
  const { invoiceId } = useInvoiceContext();

  // Redirect to home if no invoice ID is in context
  useEffect(() => {
    if (!invoiceId) {
      router.push(`/${tenantSlug}/store`);
    }
  }, [invoiceId, router]);

  // Fetch invoice data
  const {
    data: invoiceData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: async () => (invoiceId ? getInvoiceById(Number(invoiceId)) : null),
    enabled: !!invoiceId, // Only fetch if we have an invoiceId
  });

  // Handle print invoice
  const handlePrintInvoice = () => {
    window.print();
  };

  // If error loading the invoice
  if (isError) {
    return (
      <Container maxWidth="md" sx={{ py: theme.spacing(8) }}>
        <Button
          startIcon={<ArrowBackIcon />}
          component={NextLink}
          href={`/${tenantSlug}/store/account/orders`}
          sx={{ mb: theme.spacing(2) }}
        >
          {t("store.invoice.backToOrders")}
        </Button>
        <Paper variant="outlined" sx={{ p: theme.spacing(3) }}>
          <Typography variant="h5" gutterBottom color="error">
            {t("store.invoice.errorLoadingInvoice")}
          </Typography>
          <Typography variant="body1">
            {t("store.invoice.tryAgainLater")}
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mb: theme.spacing(3) }}>
        <Button
          startIcon={<ArrowBackIcon />}
          component={NextLink}
          href={`/${tenantSlug}/store/product/`}
          sx={{ mb: theme.spacing(2) }}
        >
          {t("store.invoice.backToShopping")}
        </Button>
      </Box>

      {/* Invoice Content */}
      <Paper
        elevation={0}
        sx={{
          mb: theme.spacing(4),
          boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.1)",
          borderRadius: theme.shape.borderRadius,
          border: `1px solid ${theme.palette.divider}`,
          "@media print": {
            boxShadow: "none",
            border: "1px solid #ddd",
          },
        }}
      >
        {/* Invoice Header */}
        <Box
          sx={{
            p: theme.spacing(3),
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box>
              {isLoading ? (
                <Skeleton variant="text" width={150} height={40} />
              ) : (
                <Typography
                  variant="h4"
                  sx={{ fontWeight: theme.typography.fontWeightBold }}
                >
                  {t("store.invoice.title")}
                </Typography>
              )}
            </Box>
            <Box sx={{ textAlign: "right" }}>
              {isLoading ? (
                <Skeleton variant="rectangular" width={180} height={60} />
              ) : (
                (() => {
                  // Helper function to try getting item from localStorage with retries
                  const getItemWithRetry = (key: string, maxRetries: number): string | null => {
                    if (typeof window === "undefined") return null;
                    
                    let retries = 0;
                    let result = null;
                    
                    while (retries < maxRetries) {
                      result = localStorage.getItem(key);
                      if (result) break;
                      retries++;
                    }
                    
                    return result;
                  };
                  
                  try {
                    // Get tenant slug from URL
                    const tenantSlug = window.location.pathname.split('/')[1] || '';
                    
                    // Try to get logos with retries using tenant-prefixed keys
                    const logoDark = tenantSlug 
                      ? getItemWithRetry(`${tenantSlug}_logoDark`, 3) || getItemWithRetry("logoDark", 3)
                      : getItemWithRetry("logoDark", 3);
                      
                    const logoLight = tenantSlug 
                      ? getItemWithRetry(`${tenantSlug}_logoLight`, 3) || getItemWithRetry("logoLight", 3)
                      : getItemWithRetry("logoLight", 3);
                      
                    const legacyLogo = tenantSlug 
                      ? getItemWithRetry(`${tenantSlug}_logo`, 3) || getItemWithRetry("logo", 3)
                      : getItemWithRetry("logo", 3);
                    
                    // Get brand name with tenant prefix
                    const brandNameKey = tenantSlug ? `${tenantSlug}_brandName` : 'brandName';
                    const brandName = localStorage.getItem(brandNameKey) || '';
                    
                    // Determine logo source
                    let logoSrc = '';
                    
                    // Use dark logo only when mode is explicitly dark
                    if (theme.palette.mode === 'dark' && logoDark) {
                      logoSrc = logoDark;
                    } else if (logoLight) {
                      // Otherwise use light logo
                      logoSrc = logoLight;
                    } else if (legacyLogo) {
                      // Fall back to legacy logo if available
                      logoSrc = `${
                        process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
                        "https://bedevcockpit.turtleit.in"
                      }${legacyLogo}`;
                    } else {
                      // Return empty box if no logo is available
                      return <Box sx={{ width: 180, height: 60 }} />;
                    }


                    return (
                      <Image
                        src={logoSrc}
                        alt={brandName}
                        width={180}
                        height={60}
                        priority
                        style={{
                          objectFit: "contain",
                          height: "auto",
                          maxHeight: "60px",
                        }}
                      />
                    );
                  } catch (error) {
                    console.error("Error loading logo:", error);
                    // Return empty box instead of fallback text
                    return <Box sx={{ width: 180, height: 60 }} />;
                  }
                })()
              )}
            </Box>
          </Box>

          {/* From and Bill To */}
          <Grid container spacing={2} sx={{ mt: 3 }}>
            {/* From */}
            <Grid item xs={12} md={6}>
              <Typography
                variant="h6"
                sx={{ mb: 1, fontWeight: theme.typography.fontWeightMedium }}
              >
                {t("store.invoice.from")}
              </Typography>
              {isLoading ? (
                <Box sx={{ mb: 2 }}>
                  <Skeleton variant="text" width="70%" />
                  <Skeleton variant="text" width="90%" />
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="50%" />
                  <Skeleton variant="text" width="40%" />
                </Box>
              ) : (
                <Box>
                  {(() => {
                    try {
                      // Get tenant slug from URL
                      const tenantSlug = window.location.pathname.split('/')[1] || '';
                      
                      // Get company details with tenant prefix
                      const companyDetailsKey = tenantSlug ? `${tenantSlug}_companyDetails` : 'companyDetails';
                      const companyDetails = JSON.parse(
                        localStorage.getItem(companyDetailsKey) || "{}"
                      );
                      
                      // Get brand name with tenant prefix, fallback to non-prefixed
                      const brandNameKey = tenantSlug ? `${tenantSlug}_brandName` : 'brandName';
                      const brandName = localStorage.getItem(brandNameKey) || '';
                      
                      // Get logo with tenant prefix, try dark/light variants first
                      const logoKey = tenantSlug 
                        ? `${tenantSlug}_logoDark` || `${tenantSlug}_logoLight` || `${tenantSlug}_logo`
                        : 'logo';
                      const logo = localStorage.getItem(logoKey) || '';

                      // Format address lines
                      const addressLines = [
                        companyDetails.address1,
                        companyDetails.address2,
                        [
                          companyDetails.city,
                          companyDetails.state,
                          companyDetails.pincode,
                        ]
                          .filter(Boolean)
                          .join(", "),
                        companyDetails.country,
                        companyDetails.phone &&
                          `Phone: ${companyDetails.phone}`,
                        companyDetails.email &&
                          `Email: ${companyDetails.email}`,
                        companyDetails.gstin &&
                          `GSTIN: ${companyDetails.gstin}`,
                      ].filter(Boolean);

                      return (
                        <Typography variant="body1" component="div">
                          <Box sx={{ mb: 1 }}>
                            <strong>
                              {brandName ||
                                companyDetails.name ||
                                "Company Name"}
                            </strong>
                          </Box>
                          {addressLines.map((line, index) => (
                            <Box key={index}>{line}</Box>
                          ))}
                        </Typography>
                      );
                    } catch (error) {
                      console.error("Error parsing company details:", error);
                      return (
                        <Typography variant="body2" color="error">
                          Error loading company information
                        </Typography>
                      );
                    }
                  })()}
                </Box>
              )}
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography
                variant="h6"
                sx={{
                  mb: 1,
                  fontWeight: theme.typography.fontWeightMedium,
                  textAlign: "right",
                }}
              >
                {t("store.invoice.invoiceDetails")}
              </Typography>
              {isLoading ? (
                <Box sx={{ mb: 2, textAlign: "right" }}>
                  <Skeleton variant="text" width="60%" sx={{ ml: "auto" }} />
                  <Skeleton variant="text" width="70%" sx={{ ml: "auto" }} />
                  <Skeleton variant="text" width="50%" sx={{ ml: "auto" }} />
                  <Skeleton variant="text" width="40%" sx={{ ml: "auto" }} />
                </Box>
              ) : (
                <Typography variant="body1" sx={{ mb: 2, textAlign: "right" }}>
                  Invoice Number: <strong>{invoiceData?.invoice_number}</strong>
                  <br />
                  Invoice Date:{" "}
                  <strong>{formatDate(invoiceData?.date || "")}</strong>
                  <br />
                  Due Date:{" "}
                  <strong>{formatDate(invoiceData?.due_date || "")}</strong>
                  <br />
                  Amount:{" "}
                  <strong>
                    {formatCurrency(
                      parseFloat(invoiceData?.grand_total || "0")
                    )}
                  </strong>
                </Typography>
              )}
            </Grid>

            {/* Bill To and Invoice Details Section */}
            {/* Bill To */}
            <Grid item xs={12} md={6}>
              <Typography
                variant="h6"
                sx={{ mb: 1, fontWeight: theme.typography.fontWeightMedium }}
              >
                {t("store.invoice.billTo")}
              </Typography>
              {isLoading ? (
                <Box sx={{ mb: 2 }}>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="70%" />
                  <Skeleton variant="text" width="50%" />
                  <Skeleton variant="text" width="40%" />
                </Box>
              ) : (
                <Box>
                  <Typography variant="body1" component="div">
                    <Box>
                      <strong>
                        {invoiceData?.billing_address?.full_name ||
                          invoiceData?.account?.name ||
                          "N/A"}
                      </strong>
                    </Box>
                    <Box>
                      {invoiceData?.billing_address?.address_line1 || ""}
                    </Box>
                    {invoiceData?.billing_address?.address_line2 && (
                      <Box>{invoiceData.billing_address.address_line2}</Box>
                    )}
                    <Box>
                      {[
                        invoiceData?.billing_address?.city,
                        invoiceData?.billing_address?.state,
                        invoiceData?.billing_address?.postal_code,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </Box>
                    <Box sx={{ mb: 1 }}>
                      {invoiceData?.billing_address?.country}
                    </Box>
                    <Box sx={{ mb: 1 }}>
                      <strong>Phone:</strong>{" "}
                      {invoiceData?.billing_address?.phone_number || "N/A"}
                    </Box>
                    {invoiceData?.contact?.email && (
                      <Box>
                        <strong>Email:</strong> {invoiceData.contact.email}
                      </Box>
                    )}
                  </Typography>
                </Box>
              )}
            </Grid>

            {/* Shipping to  */}

            <Grid item xs={12} md={6}>
              <Typography
                variant="h6"
                sx={{
                  mb: 1,
                  fontWeight: theme.typography.fontWeightMedium,
                  textAlign: "right",
                }}
              >
                {t("store.invoice.shipTo")}
              </Typography>
              {isLoading ? (
                <Box>
                  <Skeleton variant="text" width="80%" />
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="70%" />
                  <Skeleton variant="text" width="50%" />
                </Box>
              ) : invoiceData?.shipping_address ? (
                <Box sx={{ textAlign: "right" }}>
                  <Typography variant="body1" component="div">
                    <Box>
                      <strong>{invoiceData.shipping_address.full_name}</strong>
                    </Box>
                    <Box>{invoiceData.shipping_address.address_line1}</Box>
                    {invoiceData.shipping_address.address_line2 && (
                      <Box>{invoiceData.shipping_address.address_line2}</Box>
                    )}
                    <Box>
                      {[
                        invoiceData?.shipping_address?.city,
                        invoiceData?.shipping_address?.state,
                        invoiceData?.shipping_address?.postal_code,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </Box>
                    <Box>{invoiceData.shipping_address.country}</Box>
                    <Box sx={{ mt: 1 }}>
                      <strong>Phone:</strong>{" "}
                      {invoiceData.shipping_address.phone_number}
                    </Box>
                  </Typography>
                </Box>
              ) : (
                <Box>{t("store.invoice.sameAsBilling")}</Box>
              )}
            </Grid>
          </Grid>
        </Box>

        {/* Invoice Items */}
        <Box sx={{ mb: theme.spacing(4), mt: theme.spacing(2) }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      backgroundColor: theme.palette.grey[100],
                      fontWeight: theme.typography.fontWeightMedium,
                      borderTopLeftRadius: theme.shape.borderRadius,
                      borderBottom: `2px solid ${theme.palette.divider}`,
                    }}
                  >
                    {t("store.invoice.item")}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      backgroundColor: theme.palette.grey[100],
                      fontWeight: theme.typography.fontWeightMedium,
                      borderBottom: `2px solid ${theme.palette.divider}`,
                    }}
                  >
                    {t("store.invoice.quantity")}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      backgroundColor: theme.palette.grey[100],
                      fontWeight: theme.typography.fontWeightMedium,
                      borderBottom: `2px solid ${theme.palette.divider}`,
                    }}
                  >
                    {t("store.invoice.rate")}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      backgroundColor: theme.palette.grey[100],
                      fontWeight: theme.typography.fontWeightMedium,
                      borderBottom: `2px solid ${theme.palette.divider}`,
                    }}
                  >
                    {t("store.invoice.tax")}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      backgroundColor: theme.palette.grey[100],
                      fontWeight: theme.typography.fontWeightMedium,
                      borderTopRightRadius: theme.shape.borderRadius,
                      borderBottom: `2px solid ${theme.palette.divider}`,
                    }}
                  >
                    {t("store.invoice.amount")}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading
                  ? Array.from(new Array(3)).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Skeleton variant="text" />
                          <Skeleton variant="text" width="60%" />
                        </TableCell>
                        <TableCell align="right">
                          <Skeleton variant="text" />
                        </TableCell>
                        <TableCell align="right">
                          <Skeleton variant="text" />
                        </TableCell>
                        <TableCell align="right">
                          <Skeleton variant="text" />
                        </TableCell>
                        <TableCell align="right">
                          <Skeleton variant="text" />
                        </TableCell>
                      </TableRow>
                    ))
                  : invoiceData?.line_items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography
                            variant="body1"
                            sx={{
                              fontWeight: theme.typography.fontWeightMedium,
                            }}
                          >
                            {item.product_name}
                          </Typography>
                          {item.product_sku && (
                            <Typography variant="body2" color="text.secondary">
                              {item.product_sku}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(parseFloat(item.rate.toString()))}
                        </TableCell>
                        <TableCell align="right">
                          {item.tax_percentage || "0"}%
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(parseFloat(item.total.toString()))}
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Invoice Totals */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            px: theme.spacing(3),
            pb: theme.spacing(3),
          }}
        >
          <Box sx={{ width: { xs: "100%", sm: "350px" } }}>
            {/* Subtotal */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                py: theme.spacing(1),
                typography: "body2",
              }}
            >
              <span>{t("store.invoice.subtotal")}</span>
              {isLoading ? (
                <Skeleton width={80} />
              ) : (
                <span style={{ fontWeight: theme.typography.fontWeightMedium }}>
                  {formatCurrency(parseFloat(invoiceData?.sub_total || "0"))}
                </span>
              )}
            </Box>

            {/* Discount (if any) */}
            {!isLoading &&
              parseFloat(invoiceData?.discount_amount || "0") > 0 && (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    py: theme.spacing(1),
                    typography: "body2",
                  }}
                >
                  <span>{t("store.invoice.discount")}</span>
                  <span
                    style={{ fontWeight: theme.typography.fontWeightMedium }}
                  >
                    {formatCurrency(
                      parseFloat(invoiceData?.discount_amount || "0")
                    )}
                  </span>
                </Box>
              )}

            {/* Tax */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                py: theme.spacing(1),
                typography: "body2",
              }}
            >
              <span>{t("store.invoice.tax")}</span>
              {isLoading ? (
                <Skeleton width={80} />
              ) : (
                <span style={{ fontWeight: theme.typography.fontWeightMedium }}>
                  {formatCurrency(
                    parseFloat(invoiceData?.total_tax_amount || "0")
                  )}
                </span>
              )}
            </Box>

            {/* Grand Total */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mt: theme.spacing(1),
                p: theme.spacing(1.5),
                borderRadius: theme.shape.borderRadius,
                bgcolor: theme.palette.grey[100],
                typography: "subtitle1",
                fontWeight: theme.typography.fontWeightBold,
                borderTop: `2px solid ${theme.palette.divider}`,
              }}
            >
              <span>TOTAL</span>
              {isLoading ? (
                <Skeleton width={100} height={24} />
              ) : (
                <span>
                  {formatCurrency(parseFloat(invoiceData?.grand_total || "0"))}
                </span>
              )}
            </Box>
          </Box>
        </Box>

        {/* Notes & Terms */}
        <Box
          sx={{
            px: theme.spacing(3),
            pt: theme.spacing(4),
            pb: theme.spacing(3),
          }}
        >
          {/* Notes (if any) */}
          {!isLoading && invoiceData?.notes && (
            <Box sx={{ mb: theme.spacing(4) }}>
              <Typography
                variant="h6"
                sx={{
                  mb: theme.spacing(1),
                  fontWeight: theme.typography.fontWeightMedium,
                }}
              >
                {t("store.invoice.notes")}
              </Typography>
              <Box
                sx={{
                  p: theme.spacing(1.5),
                  borderRadius: theme.shape.borderRadius,
                  bgcolor: theme.palette.grey[50],
                }}
              >
                <Typography variant="body1">{invoiceData.notes}</Typography>
              </Box>
            </Box>
          )}

          {/* Terms & Conditions (if any) */}
          {!isLoading && invoiceData?.terms && (
            <Box>
              <Typography
                variant="h6"
                sx={{
                  mb: theme.spacing(1),
                  fontWeight: theme.typography.fontWeightMedium,
                }}
              >
                {t("store.invoice.terms")}
              </Typography>
              <Box
                sx={{
                  p: theme.spacing(1.5),
                  borderRadius: theme.shape.borderRadius,
                  bgcolor: theme.palette.grey[50],
                }}
              >
                <Typography variant="body1">{invoiceData.terms}</Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Action Buttons */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          gap: theme.spacing(2),
          mt: theme.spacing(6),
          mb: theme.spacing(4),
          "@media print": {
            display: "none",
          },
        }}
      >
        <Button
          variant="contained"
          color="primary"
          onClick={handlePrintInvoice}
          startIcon={<ReceiptIcon />}
          sx={{
            fontWeight: theme.typography.fontWeightMedium,
            borderRadius: "0.375rem",
            padding: "0.75rem 1.5rem",
            textTransform: "none",
            boxShadow: theme.shadows[2],
          }}
        >
          {t("store.invoice.printInvoice")}
        </Button>
        {invoiceData?.invoice_url && (
          <Button
            component={Link}
            href={invoiceData.invoice_url}
            target="_blank"
            rel="noopener noreferrer"
            variant="contained"
            color="secondary"
            sx={{
              fontWeight: theme.typography.fontWeightMedium,
              borderRadius: "0.375rem",
              padding: "0.75rem 1.5rem",
              textTransform: "none",
              boxShadow: theme.shadows[2],
            }}
          >
            {t("store.invoice.downloadPDF")}
          </Button>
        )}
      </Box>
    </Container>
  );
}
