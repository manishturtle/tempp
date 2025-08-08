"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  ButtonGroup,
  Button,
  Divider,
  TextField,
  Typography,
  Grid,
  Collapse,
  IconButton,
  Stack,
} from "@mui/material";
import PercentIcon from "@mui/icons-material/Percent";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { useTranslation } from "react-i18next";
import { OrderMode, discountSettings } from "@/app/types/order";

interface ProductLineItemTax {
  tax_id: number;
  tax_code: string;
  tax_rate: number;
  tax_amount: number;
  tax_name: string;
}

interface ProductLineItem {
  item_order: number;
  product_sku: string;
  product_name: string;
  product: number;
  quantity: number;
  unit_price: number;
  description?: string;
  hsn_sac_code?: string;
  discount_type: "PERCENTAGE" | "AMOUNT";
  discount_percentage?: number;
  discount_amount: number;
  taxes: ProductLineItemTax[];
  total_price: number;
  uom_symbol?: string;
}

interface OrderSummaryProps {
  mode: OrderMode;
  orderData: any;
  setOrderData: React.Dispatch<React.SetStateAction<any>>;
  roundingMethod: string;
}

interface TaxSummary {
  tax_id: number;
  tax_name: string;
  tax_rate: number;
  total_amount: number;
}

/**
 * Component for displaying order summary with subtotal, discount, taxes, and grand total
 */
const OrderSummary: React.FC<OrderSummaryProps> = ({
  mode,
  orderData,
  setOrderData,
  roundingMethod,
}) => {
  const { t } = useTranslation();
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);
  const [showDiscountConfig, setShowDiscountConfig] = useState(false);

  // Extract data from orderData
  const lineItems = (orderData.items || []) as ProductLineItem[];
  const discountSettings = orderData.discountSettings;
  const subtotal_amount = orderData.subtotal_amount;
  const tax_amount = orderData.tax_amount;
  const total_amount = orderData.total_amount;

  // Local state for discount configuration
  const [discount, setDiscount] = useState<string>("");
  const [localDiscountType, setLocalDiscountType] = useState<
    "PERCENTAGE" | "AMOUNT"
  >("PERCENTAGE");

  // Ref to track if change is internal to prevent useEffect reset
  const isInternalChangeRef = React.useRef(false);

  // Initialize discount values from props
  useEffect(() => {
    // Skip if this is an internal change to prevent state reset
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }

    if (discountSettings) {
      setLocalDiscountType(discountSettings.discount_type || "PERCENTAGE");
      if (discountSettings.discount_type === "PERCENTAGE") {
        setDiscount(discountSettings.discount_percentage?.toString() || "");
      } else {
        setDiscount(discountSettings.discount_amount?.toString() || "");
      }
    }
  }, [discountSettings]);

  // Calculate and update amounts when lineItems or discountSettings change
  useEffect(() => {
    const calculatedSubtotal = calculateSubtotal();
    const { totalTax: calculatedTaxAmount } = calculateTaxSummary();
    const calculatedTotal = calculateGrandTotal();

    // Update orderData if calculated values have changed
    if (
      calculatedSubtotal !== subtotal_amount ||
      calculatedTaxAmount !== tax_amount ||
      calculatedTotal !== total_amount
    ) {
      setOrderData((prev: any) => ({
        ...prev,
        subtotal_amount: calculatedSubtotal,
        tax_amount: calculatedTaxAmount,
        total_amount: calculatedTotal,
      }));
    }
  }, [
    lineItems,
    discountSettings,
    subtotal_amount,
    tax_amount,
    total_amount,
    setOrderData,
  ]);

  // Helper function to get discount helper text
  const getDiscountHelperText = (): string => {
    if (localDiscountType === "PERCENTAGE") {
      return "Enter percentage (0-100)";
    }
    return "Enter fixed amount";
  };

  // Handle discount changes and update parent component
  const handleDiscountChange = (
    newDiscount: string,
    newType: "PERCENTAGE" | "AMOUNT"
  ) => {
    // Mark as internal change to prevent useEffect reset
    isInternalChangeRef.current = true;

    // Parse the discount value
    const discountValue = parseFloat(newDiscount) || 0;

    // Calculate the actual discount amount even for percentage type
    let actualDiscountAmount = discountValue;
    if (newType === "PERCENTAGE") {
      const subtotal = calculateSubtotal();
      actualDiscountAmount = (discountValue / 100) * subtotal;
    }

    const updatedSettings: discountSettings = {
      discount_type: newType,
      // Always store the percentage when type is PERCENTAGE
      discount_percentage: newType === "PERCENTAGE" ? discountValue : undefined,
      // Always store the calculated amount regardless of discount type
      discount_amount: actualDiscountAmount,
    };

    setOrderData((prev: any) => ({
      ...prev,
      discountSettings: updatedSettings,
    }));
  };

  // Calculate subtotal from line items (including item-level discounts)
  const calculateSubtotal = (): number => {
    return lineItems.reduce((sum: number, item: ProductLineItem) => {
      // Calculate base amount for each item (qty * unit_price)
      const baseAmount = item.quantity * item.unit_price;
      // Subtract item discount
      const amountAfterDiscount = baseAmount - item.discount_amount;
      return sum + amountAfterDiscount;
    }, 0);
  };

  // Calculate order-level discount based on subtotal after item discounts
  const calculateOrderDiscount = (): {
    amount: number;
    type?: string;
    value?: number;
  } => {
    if (!discountSettings) {
      return { amount: 0 };
    }

    const subtotalAfterItemDiscounts = calculateSubtotal();
    let discountAmount = 0;
    let discountType = discountSettings.discount_type;
    let discountValue = 0;

    if (discountSettings.discount_type === "PERCENTAGE") {
      const percentage = discountSettings.discount_percentage || 0;
      discountAmount = (subtotalAfterItemDiscounts * percentage) / 100;
      discountValue = percentage;
    } else if (discountSettings.discount_type === "AMOUNT") {
      discountAmount = discountSettings.discount_amount || 0;
      discountValue = discountAmount;
    }

    return { amount: discountAmount, type: discountType, value: discountValue };
  };

  // Calculate tax summary by grouping taxes by tax_id and applying taxes after discounts
  const calculateTaxSummary = (): { taxes: TaxSummary[]; totalTax: number } => {
    const taxMap = new Map<number, TaxSummary>();
    const orderDiscount = calculateOrderDiscount().amount;
    const subtotal = calculateSubtotal();

    // Calculate the proportion of order discount to apply to each line item
    const discountProportion = subtotal > 0 ? orderDiscount / subtotal : 0;

    lineItems.forEach((item: ProductLineItem) => {
      if (!item.taxes || item.taxes.length === 0) {
        return;
      }

      // Calculate this item's base amount after item-level discount
      const baseAmount = item.quantity * item.unit_price;
      const itemAmountAfterDiscount = baseAmount - item.discount_amount;

      // Apply proportional order-level discount to this item
      const orderDiscountForItem = itemAmountAfterDiscount * discountProportion;
      const taxableAmount = itemAmountAfterDiscount - orderDiscountForItem;

      item.taxes.forEach((tax: ProductLineItemTax) => {
        // Recalculate tax based on discounted amount
        const recalculatedTaxAmount = (taxableAmount * tax.tax_rate) / 100;

        if (taxMap.has(tax.tax_id)) {
          const existing = taxMap.get(tax.tax_id)!;
          existing.total_amount += recalculatedTaxAmount;
        } else {
          taxMap.set(tax.tax_id, {
            tax_id: tax.tax_id,
            tax_name: tax.tax_name,
            tax_rate: tax.tax_rate,
            total_amount: recalculatedTaxAmount,
          });
        }
      });
    });

    const taxes = Array.from(taxMap.values());
    const totalTax = taxes.reduce((sum, tax) => sum + tax.total_amount, 0);

    return { taxes, totalTax };
  };

  // Apply rounding based on rounding method
  const applyRounding = (amount: number): number => {
    if (!roundingMethod || roundingMethod === "NONE") {
      // Return to 2 decimal places
      return parseFloat(amount.toFixed(2));
    }
    
    let roundedAmount: number;
    switch (roundingMethod) {
      case "ROUND_UP":
        roundedAmount = Math.ceil(amount);
        break;
      case "ROUND_DOWN":
        roundedAmount = Math.floor(amount);
        break;
      case "NORMAL":
        roundedAmount = Math.round(amount);
        break;
      default:
        // Fallback to 2 decimal places
        roundedAmount = amount;
        break;
    }
    
    // Ensure all values are returned with 2 decimal places
    return parseFloat(roundedAmount.toFixed(2));
  };

  // Calculate grand total
  const calculateGrandTotal = (): number => {
    const subtotal = calculateSubtotal();
    const { amount: orderDiscountAmount } = calculateOrderDiscount();
    const { totalTax } = calculateTaxSummary();

    const rawTotal = subtotal - orderDiscountAmount + totalTax;
    return applyRounding(rawTotal);
  };

  const subtotal = calculateSubtotal();
  const { amount: orderDiscountAmount } = calculateOrderDiscount();
  const { taxes, totalTax } = calculateTaxSummary();
  
  // Calculate raw total and rounded total
  const rawTotal = subtotal - orderDiscountAmount + totalTax;
  const grandTotal = applyRounding(rawTotal);
  const roundingDelta = parseFloat((grandTotal - rawTotal).toFixed(2));
  
  // Update orderData with calculated values
  useEffect(() => {
    setOrderData((prev: any) => ({
      ...prev,
      subtotal_amount: subtotal,
      tax_amount: totalTax,
      total_amount: grandTotal,
      rounded_delta: roundingDelta,
    }));
  }, [subtotal, totalTax, grandTotal, roundingDelta, setOrderData]);

  const SummaryRow = ({
    label,
    value,
    isTotal = false,
    color = "text.primary",
  }: {
    label: string;
    value: string;
    isTotal?: boolean;
    color?: string;
  }) => (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      sx={{ py: isTotal ? 1 : 0.5 }}
    >
      <Typography
        variant={isTotal ? "subtitle1" : "body2"}
        fontWeight={isTotal ? 600 : 400}
      >
        {label}
      </Typography>
      <Typography
        variant={isTotal ? "subtitle1" : "body2"}
        fontWeight={isTotal ? 600 : 400}
        color={color}
      >
        {value}
      </Typography>
    </Box>
  );

  return (
    <Box
      sx={{
        backgroundColor: "#fff",
        padding: "16px",
        borderRadius: "8px",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Typography variant="h6" mb={2}>
        {t("orders.orderSummary")}
      </Typography>

      <Stack>
        {/* Subtotal */}
        <SummaryRow
          label={t("orders.subtotal")}
          value={`₹ ${subtotal.toFixed(2)}`}
        />

        <Divider sx={{ my: 1 }} />

        {/* Order-level discount with toggle button */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <Box display="flex" alignItems="center">
            <Typography variant="body2">{t("orders.discount")}</Typography>
            <IconButton
              size="small"
              onClick={() => setShowDiscountConfig(!showDiscountConfig)}
              sx={{ ml: 0.5 }}
            >
              {showDiscountConfig ? <RemoveIcon fontSize="small" /> : <AddIcon fontSize="small" />}
            </IconButton>
          </Box>
          <Typography variant="body2">
            ₹ {orderDiscountAmount?.toFixed(2)}
          </Typography>
        </Box>

        {/* Collapsible discount configuration */}
        <Collapse in={showDiscountConfig}>
          <Grid container spacing={1}>
            <Grid size={6}>
              <TextField
                label={t("orders.discount")}
                value={discount}
                onChange={(e) => {
                  const value = e.target.value;
                  // Validate based on discount type
                  if (!value || Number(value) >= 0) {
                    if (
                      localDiscountType === "PERCENTAGE" &&
                      Number(value) > 100
                    ) {
                      return; // Don't update if percentage > 100
                    }
                    setDiscount(value);
                    handleDiscountChange(value, localDiscountType);
                  }
                }}
                variant="outlined"
                sx={{ mb: "0px" }}
                fullWidth
                size="small"
                type="number"
                helperText={getDiscountHelperText()}
                onWheel={(e) =>
                  e.target instanceof HTMLElement && e.target.blur()
                }
                slotProps={{
                  input: {
                    inputProps: {
                      onWheel: (e) => e.preventDefault(),
                      min: "0",
                      max:
                        localDiscountType === "PERCENTAGE" ? "100" : undefined,
                      step: "0.01",
                    },
                  },
                }}
              />
            </Grid>
            <Grid size={6}>
              <ButtonGroup
                variant="outlined"
                size="small"
                fullWidth
                sx={{ height: "37px" }}
              >
                <Button
                  onClick={() => {
                    setLocalDiscountType("PERCENTAGE");
                    setDiscount("0");
                    handleDiscountChange(discount, "PERCENTAGE");
                  }}
                  variant={
                    localDiscountType === "PERCENTAGE"
                      ? "contained"
                      : "outlined"
                  }
                  startIcon={<PercentIcon />}
                />
                <Button
                  onClick={() => {
                    setLocalDiscountType("AMOUNT");
                    setDiscount("0");
                    handleDiscountChange(discount, "AMOUNT");
                  }}
                  variant={
                    localDiscountType === "AMOUNT" ? "contained" : "outlined"
                  }
                  startIcon={<CurrencyRupeeIcon />}
                />
              </ButtonGroup>
            </Grid>
          </Grid>
        </Collapse>

        <Divider sx={{ my: 1 }} />

        {/* Tax breakdown */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <Box display="flex" alignItems="center">
            <Typography variant="body2">{t("orders.taxBreakdown")}</Typography>
            {taxes.length > 0 && (
              <IconButton
                size="small"
                onClick={() => setShowTaxBreakdown(!showTaxBreakdown)}
                sx={{ ml: 0.5 }}
              >
                {showTaxBreakdown ? <RemoveIcon fontSize="small" /> : <AddIcon fontSize="small" />}
              </IconButton>
            )}
          </Box>
          <Typography variant="body2">₹ {totalTax.toFixed(2)}</Typography>
        </Box>

        {/* Tax breakdown details */}
        {taxes.length > 0 && (
          <Collapse in={showTaxBreakdown}>
            <Box sx={{ pl: 2, py: 1 }}>
              {taxes.map((tax) => (
                <Box
                  key={tax.tax_id}
                  display="flex"
                  justifyContent="space-between"
                >
                  <Typography variant="caption" color="text.secondary">
                    {tax.tax_name} ({tax.tax_rate}%)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ₹{tax.total_amount.toFixed(2)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Collapse>
        )}

        <Divider sx={{ my: 1 }} />

        {/* Rounding Adjustment */}
        {roundingDelta !== 0 && (
          <SummaryRow
            label={t("orders.roundingAdjustment", "Rounding Adjustment")}
            value={`₹ ${roundingDelta >= 0 ? '+' : ''}${roundingDelta.toFixed(2)}`}
            color={roundingDelta >= 0 ? "success.main" : "error.main"}
          />
        )}

        {/* Grand Total */}
        <SummaryRow
          label={t("orders.grandTotal")}
          value={`₹ ${roundingMethod && roundingMethod !== "NONE" && roundingMethod !== "" ? 
            grandTotal.toFixed(2) : grandTotal.toFixed(2)}`}
          isTotal={true}
          color="primary.main"
        />
      </Stack>
    </Box>
  );
};

export default OrderSummary;
