"use client";

/**
 * InventoryAdjustmentForm component
 *
 * A form component for creating inventory adjustments.
 * Handles product and location selection, adjustment details, and submission.
 */
import React, { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  Box,
  Grid,
  TextField,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  CircularProgress,
  Alert,
  Autocomplete,
  Paper,
  Divider,
  Stack,
  SelectChangeEvent,
  Container,
  useTheme,
} from "@mui/material";
// import { DatePicker } from '@mui/x-date-pickers/DatePicker';
// import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
// import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import { useAdjustmentReasons } from "@/app/hooks/api/inventory";
import {
  Product,
  Location,
  AdjustmentPayload,
  AdjustmentResponse,
  FormDataState,
  InventorySummary,
  AdjustmentType,
} from "@/app/types/inventory";
import {
  fetchProducts,
  fetchLocations,
  fetchInventoryDetail,
  createAdjustment,
} from "@/app/hooks/api/inventory";
import SearchIcon from "@mui/icons-material/Search";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import AnalyticsCard from "@/app/components/common/AnalyticsCard";
import InventoryIcon from "@mui/icons-material/Inventory";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import api, { apiEndpoints } from "@/lib/api";
import { getAuthHeaders } from "@/app/hooks/api/auth";

// Form props interface
interface InventoryAdjustmentFormProps {
  onSuccess?: (response: AdjustmentResponse) => void;
  onCancel?: () => void;
}

/**
 * Inventory Adjustment Form component
 *
 * @param props - Component props
 * @returns React component
 */
export const InventoryAdjustmentForm: React.FC<
  InventoryAdjustmentFormProps
> = ({ onSuccess, onCancel }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Initial form state
  const initialFormState: FormDataState = {
    productId: null,
    locationId: null,
    inventoryId: null,
    adjustment_type: "",
    quantity_change: "",
    reason: null,
    notes: "",
    serial_number: "",
    lot_number: "",
    expiry_date: null,
  };

  // Form state
  const [formData, setFormData] = useState<FormDataState>(initialFormState);

  // Product and location data
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null
  );

  // Inventory details
  const [inventorySummary, setInventorySummary] =
    useState<InventorySummary | null>(null);

  // Loading states
  const [isProductsLoading, setIsProductsLoading] = useState<boolean>(false);
  const [isLocationsLoading, setIsLocationsLoading] = useState<boolean>(false);
  const [isInventoryLoading, setIsInventoryLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Error states
  const [productsError, setProductsError] = useState<string>("");
  const [locationsError, setLocationsError] = useState<string>("");
  const [inventoryError, setInventoryError] = useState<string>("");
  const [reasonsError, setReasonsError] = useState<string>("");

  // Form errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<
    string | Record<string, string[]>
  >("");

  // Success state
  const [submitSuccess, setSubmitSuccess] = useState<string>("");

  // Calculate new stock level and adjustment validity
  const currentStock = inventorySummary?.stock_quantity || 0;
  const adjustmentValue = formData.quantity_change
    ? parseInt(formData.quantity_change, 10)
    : 0;
  const newStockLevel = currentStock + adjustmentValue;
  const isValidAdjustment = newStockLevel >= 0;

  // Get adjustment reasons using the hook
  const {
    reasons,
    isLoading: isReasonsLoading,
    isError: isReasonsError,
  } = useAdjustmentReasons({
    is_active: true,
    adjustment_type:
      (formData.adjustment_type as
        | "ADD"
        | "SUB"
        | "RES"
        | "REL_RES"
        | "INIT") || undefined,
  });

  // Fetch products
  useEffect(() => {
    const getProducts = async () => {
      setIsProductsLoading(true);
      setProductsError("");

      try {
        const response = await fetchProducts({ is_active: true });
        setProducts(response.results);
      } catch (error: any) {
        console.error("Error fetching products:", error);
        setProductsError(
          error.message ||
            t("common.errorLoading", { resource: t("common.product") })
        );
      } finally {
        setIsProductsLoading(false);
      }
    };

    getProducts();
  }, [t]);

  // Fetch locations
  useEffect(() => {
    const getLocations = async () => {
      setIsLocationsLoading(true);
      setLocationsError("");

      try {
        const response = await fetchLocations({ is_active: true });
        setLocations(response.results);
      } catch (error: any) {
        console.error("Error fetching locations:", error);
        setLocationsError(
          error.message ||
            t("common.errorLoading", { resource: t("inventory.location") })
        );
      } finally {
        setIsLocationsLoading(false);
      }
    };

    getLocations();
  }, [t]);

  // Fetch inventory details when product and location are selected
  useEffect(() => {
    const getInventoryDetails = async () => {
      if (!formData.productId || !formData.locationId) {
        return;
      }

      setIsInventoryLoading(true);
      setInventoryError("");

      try {
        // Get tenant slug directly
        const tenantSlug =
          typeof window !== "undefined"
            ? localStorage.getItem("tenant_slug") || "turtle"
            : "turtle";

        // Construct the URL manually with the tenant slug
        const url = `/${tenantSlug}/inventory/inventory/?product__id=${formData.productId}&location__id=${formData.locationId}`;

        console.log("Fetching inventory with URL:", url);

        // Make the API request
        const response = await api.get(url, { headers: getAuthHeaders() });

        console.log("Raw inventory response:", response.data);

        // Find the inventory item that matches our selected product and location
        const inventoryItem = response.data.results.find(
          (item: { product: { id: number }; location: { id: number } }) =>
            item.product.id === formData.productId &&
            item.location.id === formData.locationId
        );

        if (inventoryItem) {
          console.log("Found matching inventory item:", inventoryItem);
          setFormData((prev) => ({ ...prev, inventoryId: inventoryItem.id }));
          setInventorySummary({
            stock_quantity: inventoryItem.stock_quantity || 0,
            reserved_quantity: inventoryItem.reserved_quantity || 0,
            non_saleable_quantity: inventoryItem.non_saleable_quantity || 0,
            on_order_quantity: inventoryItem.on_order_quantity || 0,
            in_transit_quantity: inventoryItem.in_transit_quantity || 0,
            returned_quantity: inventoryItem.returned_quantity || 0,
            hold_quantity: inventoryItem.hold_quantity || 0,
            backorder_quantity: inventoryItem.backorder_quantity || 0,
            low_stock_threshold: inventoryItem.low_stock_threshold || 0,
            available_to_promise: inventoryItem.available_to_promise || 0,
            total_available: inventoryItem.total_available || 0,
            total_unavailable: inventoryItem.total_unavailable || 0,
            stock_status: inventoryItem.stock_status || "UNKNOWN",
          });
          console.log("Inventory summary:", inventorySummary);
        } else {
          throw new Error(
            "No matching inventory item found for selected product and location"
          );
        }
      } catch (error: any) {
        console.error("Error fetching inventory details:", error);
        setInventoryError(
          error.message || t("inventory.adjustment.errors.inventoryNotFound")
        );

        // Clear inventory ID and summary
        setFormData((prev) => ({ ...prev, inventoryId: null }));
        setInventorySummary(null);
      } finally {
        setIsInventoryLoading(false);
      }
    };

    getInventoryDetails();
  }, [
    formData.productId,
    formData.locationId,
    t,
    api,
    apiEndpoints.inventory.list,
    getAuthHeaders,
  ]);

  // Form change handlers
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field if it exists
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear related errors
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }

    // If adjustment type changes, reset the reason
    if (name === "adjustment_type") {
      setFormData((prev) => ({
        ...prev,
        reason: null,
      }));
    }
  };

  const handleDateChange = (date: Date | null) => {
    setFormData((prev) => ({ ...prev, expiry_date: date }));
    // Clear error for this field if it exists
    if (formErrors.expiry_date) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.expiry_date;
        return newErrors;
      });
    }
  };

  const handleProductChange = (
    _event: React.SyntheticEvent,
    newValue: Product | null
  ) => {
    setSelectedProduct(newValue);
    setFormData((prev) => ({
      ...prev,
      productId: newValue?.id || null,
      inventoryId: null,
      serial_number: "",
      lot_number: "",
      expiry_date: null,
    }));
    // Clear inventory summary when product changes
    setInventorySummary(null);
    // Clear error for this field if it exists
    if (formErrors.productId) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.productId;
        return newErrors;
      });
    }
  };

  const handleLocationChange = (
    _event: React.SyntheticEvent,
    newValue: Location | null
  ) => {
    setSelectedLocation(newValue);
    setFormData((prev) => ({
      ...prev,
      locationId: newValue?.id || null,
      inventoryId: null,
    }));
    // Clear inventory summary when location changes
    setInventorySummary(null);
    // Clear error for this field if it exists
    if (formErrors.locationId) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.locationId;
        return newErrors;
      });
    }
  };

  // Form submission handler
  const handleSubmit = async () => {
    // Validate form
    const errors: Record<string, string> = {};

    if (!formData.productId) {
      errors.productId = t("inventory.adjustment.errors.productRequired");
    }

    if (!formData.locationId) {
      errors.locationId = t("inventory.adjustment.errors.locationRequired");
    }

    if (!formData.adjustment_type) {
      errors.adjustment_type = t(
        "inventory.adjustment.errors.adjustmentTypeRequired"
      );
    }

    if (!formData.quantity_change) {
      errors.quantity_change = t(
        "inventory.adjustment.errors.quantityRequired"
      );
    } else {
      const quantity = parseInt(formData.quantity_change, 10);
      if (isNaN(quantity)) {
        errors.quantity_change = t(
          "inventory.adjustment.errors.invalidQuantity"
        );
      } else if (formData.adjustment_type === "SUB" && quantity > 0) {
        errors.quantity_change = t(
          "inventory.adjustment.errors.negativeQuantityRequired"
        );
      } else if (formData.adjustment_type === "ADD" && quantity < 0) {
        errors.quantity_change = t(
          "inventory.adjustment.errors.positiveQuantityRequired"
        );
      }
    }

    if (!formData.reason) {
      errors.reason = t("inventory.adjustment.errors.reasonRequired");
    }

    // Validate serial/lot number if product is serialized/lotted
    if (selectedProduct?.is_serialized && !formData.serial_number) {
      errors.serial_number = t(
        "inventory.adjustment.errors.serialNumberRequired"
      );
    }

    if (selectedProduct?.is_lotted) {
      if (!formData.lot_number) {
        errors.lot_number = t("inventory.adjustment.errors.lotNumberRequired");
      }

      // if (!formData.expiry_date) {
      //   errors.expiry_date = t('inventory.adjustment.errors.expiryDateRequired');
      // }
    }

    // Check if we have a valid inventory record or product/location
    if (!formData.productId || !formData.locationId) {
      errors.productId = t(
        "inventory.adjustment.errors.productOrLocationRequired"
      );
    }

    // If there are errors, set them and return
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // Clear errors
    setFormErrors({});
    setSubmitError("");
    setSubmitSuccess("");
    setIsSubmitting(true);

    try {
      // Prepare payload
      const payload: AdjustmentPayload = {
        product_id: formData.productId as number,
        location_id: formData.locationId as number,
        adjustment_type: formData.adjustment_type as AdjustmentType,
        quantity_change: parseInt(formData.quantity_change, 10),
        reason: formData.reason as number,
        notes: formData.notes || undefined,
        serial_number: selectedProduct?.is_serialized
          ? formData.serial_number
          : undefined,
        lot_number: selectedProduct?.is_lotted
          ? formData.lot_number
          : undefined,
        expiry_date:
          selectedProduct?.is_lotted && formData.expiry_date
            ? formData.expiry_date.toISOString().split("T")[0]
            : undefined,
      };

      // Log the payload for debugging
      console.log("Submitting adjustment payload:", payload);

      // Submit adjustment
      const response = await createAdjustment(payload);

      // Log the response
      console.log("Adjustment response:", response);

      // Handle success
      setSubmitSuccess(t("inventory.adjustment.success.created"));

      // Reset form
      setFormData(initialFormState);
      setSelectedProduct(null);
      setSelectedLocation(null);
      setInventorySummary(null);

      // Invalidate inventory queries to ensure fresh data is fetched
      queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
      queryClient.invalidateQueries({ queryKey: ["inventorySummary"] });

      // Navigate to inventory page after successful submission with tenant slug
      setTimeout(() => {
        const tenantSlug =
          typeof window !== "undefined"
            ? localStorage.getItem("tenant_slug") || "turtle"
            : "turtle";
        router.push(`/${tenantSlug}/Crm/Masters/inventory/`);
      }, 1000); // Short delay to show success message
    } catch (error: any) {
      // Handle error
      console.error("Error creating adjustment:", error);

      // Log detailed error information
      if (error.response) {
        console.log("Error response data:", error.response.data);
        console.log("Error response status:", error.response.status);
        console.log("Error response headers:", error.response.headers);
      } else if (error.request) {
        console.log("Error request:", error.request);
      } else {
        console.log("Error message:", error.message);
      }

      if (error.response && error.response.data) {
        setSubmitError(error.response.data);
      } else {
        setSubmitError(error.message || "Failed to create adjustment");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: theme.spacing(2),
          }}
        >
          <Typography variant="h5" component="h1">
            {t("inventory.adjustment.title")}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
            startIcon={
              isSubmitting ? <CircularProgress size={20} /> : undefined
            }
            sx={{ minWidth: 150 }}
          >
            {isSubmitting
              ? t("common.saving")
              : t("inventory.adjustment.saveChanges")}
          </Button>
        </Box>

        {submitSuccess && (
          <Alert severity="success" sx={{ mb: theme.spacing(2) }}>
            {submitSuccess}
          </Alert>
        )}

        {typeof submitError === "string" && submitError && (
          <Alert severity="error" sx={{ mb: theme.spacing(2) }}>
            {submitError}
          </Alert>
        )}

        {typeof submitError === "object" &&
          Object.keys(submitError).length > 0 && (
            <Alert severity="error" sx={{ mb: theme.spacing(2) }}>
              <ul style={{ margin: 0, paddingLeft: theme.spacing(2) }}>
                {Object.entries(submitError).map(([field, errors]) => (
                  <li key={field}>
                    {field}:{" "}
                    {Array.isArray(errors) ? errors.join(", ") : errors}
                  </li>
                ))}
              </ul>
            </Alert>
          )}
      </Box>
      <Paper
        elevation={0}
        sx={{
          p: theme.spacing(3),
          borderRadius: theme.shape.borderRadius,
          boxShadow: theme.shadows[1],
        }}
      >
        <form
          onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <Grid container spacing={3}>
            {/* Left Column - Form Fields */}
            <Grid size={{ xs: 12, md: 8 }}>
              <Grid container spacing={1}>
                {/* Product and Location Selection */}
                <Grid size={{ xs: 12 }}>
                  <FormControl fullWidth error={!!formErrors.productId}>
                    <Autocomplete
                      id="product-select"
                      options={products}
                      getOptionLabel={(option) =>
                        `${option.name} (${option.sku})`
                      }
                      loading={isProductsLoading}
                      value={selectedProduct}
                      onChange={handleProductChange}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label={`${t("inventory.adjustment.product")}*`}
                          placeholder={t(
                            "inventory.adjustment.productPlaceholder"
                          )}
                          error={!!formErrors.productId}
                          helperText={formErrors.productId}
                          size="small"
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {isProductsLoading ? (
                                  <CircularProgress color="inherit" size={20} />
                                ) : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                    />
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <FormControl fullWidth error={!!formErrors.locationId}>
                    <Autocomplete
                      id="location-select"
                      options={locations}
                      getOptionLabel={(option) => option.name}
                      loading={isLocationsLoading}
                      value={selectedLocation}
                      onChange={handleLocationChange}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label={`${t("inventory.adjustment.location")}*`}
                          placeholder={t(
                            "inventory.adjustment.locationPlaceholder"
                          )}
                          error={!!formErrors.locationId}
                          helperText={formErrors.locationId}
                          size="small"
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {isLocationsLoading ? (
                                  <CircularProgress color="inherit" size={20} />
                                ) : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                    />
                  </FormControl>
                </Grid>

                {/* Serial/Lot Number and Expiry Date */}
                {selectedProduct && (
                  <>
                    {selectedProduct.is_serialized && (
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          fullWidth
                          id="serial-number"
                          name="serial_number"
                          label={t("inventory.adjustment.serialNumber")}
                          placeholder={t(
                            "inventory.adjustment.serialNumberPlaceholder"
                          )}
                          value={formData.serial_number}
                          onChange={handleInputChange}
                          error={!!formErrors.serial_number}
                          helperText={formErrors.serial_number}
                          size="small"
                          required={selectedProduct.is_serialized}
                        />
                      </Grid>
                    )}

                    {selectedProduct.is_lotted && (
                      <>
                        <Grid size={{ xs: 12, md: selectedProduct.is_serialized ? 6 : 6 }}>
                          <TextField
                            fullWidth
                            id="lot-number"
                            name="lot_number"
                            label={t("inventory.adjustment.lotNumber")}
                            placeholder={t(
                              "inventory.adjustment.lotNumberPlaceholder"
                            )}
                            value={formData.lot_number}
                            onChange={handleInputChange}
                            error={!!formErrors.lot_number}
                            helperText={formErrors.lot_number}
                            size="small"
                            required={selectedProduct.is_lotted}
                          />
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                          <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <DatePicker
                              label={t("inventory.adjustment.expiryDate")}
                              value={
                                formData.expiry_date
                                  ? dayjs(formData.expiry_date)
                                  : null
                              }
                              onChange={(value) => {
                                setFormData((prev) => ({
                                  ...prev,
                                  expiry_date: value?.toDate() || null,
                                }));
                              }}
                              slotProps={{
                                textField: {
                                  fullWidth: true,
                                  error: !!formErrors.expiry_date,
                                  helperText: formErrors.expiry_date,
                                  required: selectedProduct.is_lotted,
                                  placeholder: t(
                                    "inventory.adjustment.expiryDatePlaceholder"
                                  ),
                                  size: "small",
                                },
                              }}
                              sx={{
                                "& .MuiInputBase-root": {
                                  padding: "8px 10px",
                                  fontSize: "0.875rem",
                                  height: "38px",
                                },
                                "& .MuiInputBase-input": {
                                  height: "100%",
                                },
                              }}
                            />
                          </LocalizationProvider>
                        </Grid>
                      </>
                    )}
                  </>
                )}

                {/* Adjustment Type and Reason */}
                <Grid size={{ xs: 12 }}>
                  <FormControl
                    fullWidth
                    error={!!formErrors.adjustment_type}
                    required
                    size="small"
                    sx={{ marginBottom: theme.spacing(2) }}
                  >
                    <InputLabel id="adjustment-type-label" size="small">
                      {t("inventory.adjustment.adjustmentType")}
                    </InputLabel>
                    <Select
                      labelId="adjustment-type-label"
                      id="adjustment-type"
                      name="adjustment_type"
                      size="small"
                      value={formData.adjustment_type}
                      onChange={handleSelectChange}
                      label={t("inventory.adjustment.adjustmentType")}
                      sx={{
                        "& .MuiSelect-select": {
                          padding: "8px 12px",
                          fontSize: "0.875rem",
                        },
                      }}
                    >
                      <MenuItem value="">
                        <em>
                          {t("inventory.adjustment.adjustmentTypePlaceholder")}
                        </em>
                      </MenuItem>
                      <MenuItem value="ADD" sx={{ fontSize: "0.875rem" }}>
                        {t("inventory.adjustment.types.addition")}
                      </MenuItem>
                      <MenuItem value="SUB" sx={{ fontSize: "0.875rem" }}>
                        {t("inventory.adjustment.types.subtraction")}
                      </MenuItem>
                      <MenuItem value="RES" sx={{ fontSize: "0.875rem" }}>
                        {t("inventory.adjustment.types.reservation")}
                      </MenuItem>
                      <MenuItem value="REL_RES" sx={{ fontSize: "0.875rem" }}>
                        {t("inventory.adjustment.types.releaseReservation")}
                      </MenuItem>
                      <MenuItem value="INIT" sx={{ fontSize: "0.875rem" }}>
                        {t("inventory.adjustment.types.initialStock")}
                      </MenuItem>
                      <MenuItem value="NON_SALE" sx={{ fontSize: "0.875rem" }}>
                        {t("inventory.adjustment.types.nonSaleable")}
                      </MenuItem>
                      <MenuItem value="RECV_PO" sx={{ fontSize: "0.875rem" }}>
                        {t("inventory.adjustment.types.receiveOrder")}
                      </MenuItem>
                      <MenuItem value="SHIP_ORD" sx={{ fontSize: "0.875rem" }}>
                        {t("inventory.adjustment.types.shipOrder")}
                      </MenuItem>
                      <MenuItem value="RET_STOCK" sx={{ fontSize: "0.875rem" }}>
                        {t("inventory.adjustment.types.returnToStock")}
                      </MenuItem>
                      <MenuItem
                        value="RET_NON_SALE"
                        sx={{ fontSize: "0.875rem" }}
                      >
                        {t("inventory.adjustment.types.moveToNonSaleable")}
                      </MenuItem>
                      <MenuItem value="HOLD" sx={{ fontSize: "0.875rem" }}>
                        {t("inventory.adjustment.types.hold")}
                      </MenuItem>
                      <MenuItem value="REL_HOLD" sx={{ fontSize: "0.875rem" }}>
                        {t("inventory.adjustment.types.releaseHold")}
                      </MenuItem>
                      <MenuItem value="CYCLE" sx={{ fontSize: "0.875rem" }}>
                        {t("inventory.adjustment.types.cycleCount")}
                      </MenuItem>
                    </Select>
                    {formErrors.adjustment_type && (
                      <FormHelperText>
                        {formErrors.adjustment_type}
                      </FormHelperText>
                    )}
                  </FormControl>
                </Grid>

                {/* Quantity */}
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    id="quantity-change"
                    size="small"
                    name="quantity_change"
                    label={t("inventory.adjustment.quantity")}
                    placeholder={t("inventory.adjustment.quantityPlaceholder")}
                    value={formData.quantity_change}
                    onChange={handleInputChange}
                    error={!!formErrors.quantity_change}
                    helperText={
                      formErrors.quantity_change ||
                      t("inventory.adjustment.quantityHelp")
                    }
                    required
                    type="number"
                    InputProps={{
                      inputProps: {
                        min: formData.adjustment_type === "SUB" ? -999999 : 0,
                      },
                    }}
                  />
                </Grid>

                {/* Notes */}
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    id="notes"
                    name="notes"
                    label={t("inventory.adjustment.notes")}
                    placeholder={t("inventory.adjustment.notesPlaceholder")}
                    value={formData.notes}
                    onChange={handleInputChange}
                    multiline
                    rows={4}
                  />
                </Grid>
              </Grid>
            </Grid>

            {/* Right Column - Current Quantities and Summary */}
            <Grid size={{ xs: 12, md: 4 }}>
              {/* Current Quantities */}
              <FormControl
                fullWidth
                error={!!formErrors.reason}
                required
                size="small"
              >
                <Autocomplete
                  id="reason-select"
                  options={reasons || []}
                  getOptionLabel={(option) => option?.name || ""}
                  loading={isReasonsLoading}
                  value={reasons?.find((r) => r.id === formData.reason) || null}
                  onChange={(event, newValue) => {
                    setFormData((prev) => ({
                      ...prev,
                      reason: newValue?.id || null,
                    }));
                  }}
                  disabled={!formData.adjustment_type}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t("inventory.adjustment.reason")}
                      placeholder={t("inventory.adjustment.reasonPlaceholder")}
                      error={!!formErrors.reason}
                      helperText={formErrors.reason}
                      size="small"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {isReasonsLoading && (
                              <CircularProgress color="inherit" size={20} />
                            )}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props}>{option.name}</li>
                  )}
                />
              </FormControl>
              <Paper
                elevation={0}
                sx={{
                  p: theme.spacing(3),
                  mb: theme.spacing(3),
                  backgroundColor: theme.palette.background.default,
                  borderRadius: theme.shape.borderRadius,
                }}
              >
                {isInventoryLoading ? (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      p: theme.spacing(3),
                    }}
                  >
                    <CircularProgress />
                  </Box>
                ) : inventorySummary ? (
                  <>
                    <Typography variant="h6" gutterBottom>
                      {t("inventory.adjustment.currentQuantities")}
                    </Typography>

                    <Box sx={{ mt: theme.spacing(2) }}>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 6 }}>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            {t("field.stockQuantity")}
                          </Typography>
                          <Typography
                            variant="h6"
                            sx={{ fontWeight: "medium" }}
                          >
                            {inventorySummary.stock_quantity}
                          </Typography>
                        </Grid>

                        <Grid size={{ xs: 6 }}>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            {t("field.reservedQuantity")}
                          </Typography>
                          <Typography
                            variant="h6"
                            sx={{ fontWeight: "medium" }}
                          >
                            {inventorySummary.reserved_quantity}
                          </Typography>
                        </Grid>

                        <Grid size={{ xs: 6 }}>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            {t("field.nonSaleable")}
                          </Typography>
                          <Typography
                            variant="h6"
                            sx={{ fontWeight: "medium" }}
                          >
                            {inventorySummary.non_saleable_quantity}
                          </Typography>
                        </Grid>

                        <Grid size={{ xs: 6 }}>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            {t("field.onOrder")}
                          </Typography>
                          <Typography
                            variant="h6"
                            sx={{ fontWeight: "medium" }}
                          >
                            {inventorySummary.on_order_quantity}
                          </Typography>
                        </Grid>

                        <Grid size={{ xs: 6 }}>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            {t("field.inTransit")}
                          </Typography>
                          <Typography
                            variant="h6"
                            sx={{ fontWeight: "medium" }}
                          >
                            {inventorySummary.in_transit_quantity}
                          </Typography>
                        </Grid>

                        <Grid size={{ xs: 6 }}>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            {t("field.returned")}
                          </Typography>
                          <Typography
                            variant="h6"
                            sx={{ fontWeight: "medium" }}
                          >
                            {inventorySummary.returned_quantity}
                          </Typography>
                        </Grid>

                        <Grid size={{ xs: 6 }}>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            {t("field.onHold")}
                          </Typography>
                          <Typography
                            variant="h6"
                            sx={{ fontWeight: "medium" }}
                          >
                            {inventorySummary.hold_quantity}
                          </Typography>
                        </Grid>

                        <Grid size={{ xs: 6 }}>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            {t("field.backorder")}
                          </Typography>
                          <Typography
                            variant="h6"
                            sx={{ fontWeight: "medium" }}
                          >
                            {inventorySummary.backorder_quantity}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  </>
                ) : (
                  <Box sx={{ p: theme.spacing(3), textAlign: "center" }}>
                    <Typography variant="body1" color="text.secondary">
                      {t("inventory.adjustment.selectProductLocation")}
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>

            <Grid size={{ xs: 12 }}>
              {/* Adjustment Summary */}
              {inventorySummary &&
                formData.quantity_change &&
                !isNaN(parseInt(formData.quantity_change, 10)) && (
                  <>
                    <Typography
                      variant="h6"
                      gutterBottom
                      sx={{ mb: theme.spacing(2) }}
                    >
                      {t("inventory.adjustment.adjustmentSummary")}
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 3 }}>
                        <AnalyticsCard
                          title={t("inventory.adjustment.currentStock")}
                          value={currentStock}
                          icon={<InventoryIcon />}
                          color="primary.main"
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 3 }}>
                        <AnalyticsCard
                          title={t("inventory.adjustment.adjustment")}
                          value={Math.abs(adjustmentValue)}
                          prefix={adjustmentValue >= 0 ? "+" : "-"}
                          icon={
                            adjustmentValue >= 0 ? (
                              <TrendingUpIcon />
                            ) : (
                              <TrendingDownIcon />
                            )
                          }
                          color={
                            adjustmentValue >= 0 ? "success.main" : "error.main"
                          }
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 3 }}>
                        <AnalyticsCard
                          title={t("inventory.adjustment.newStockLevel")}
                          value={newStockLevel}
                          icon={<InventoryIcon />}
                          color="info.main"
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 3 }}>
                        <AnalyticsCard
                          title={t("inventory.adjustment.status")}
                          value={inventorySummary.stock_status}
                          icon={
                            isValidAdjustment ? (
                              <CheckCircleOutlineIcon />
                            ) : (
                              <ErrorOutlineIcon />
                            )
                          }
                          color={
                            isValidAdjustment ? "success.main" : "error.main"
                          }
                        />
                      </Grid>
                    </Grid>
                  </>
                )}
            </Grid>
          </Grid>
        </form>
      </Paper>
    </>
  );
};

export default InventoryAdjustmentForm;
