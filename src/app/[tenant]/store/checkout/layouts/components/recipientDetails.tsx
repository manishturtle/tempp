"use client";

import React, { useEffect } from "react";
import {
  Box,
  Grid,
  Typography,
  TextField,
  RadioGroup,
  Radio,
  Paper,
  useTheme,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { useForm, Controller } from "react-hook-form";
import { useParams } from "next/navigation";
import {
  useShippingMethods,
  type ShippingMethod,
} from "@/app/hooks/api/store/useShippingMethods";

// Format delivery days for display
const formatDeliveryDays = (minDays: number, maxDays: number): string => {
  if (minDays === maxDays) {
    return `${minDays} ${minDays === 1 ? "day" : "days"}`;
  }
  return `${minDays}-${maxDays} days`;
};

// Calculate estimated delivery date
const calculateEstimatedDelivery = (
  minDays: number,
  maxDays: number
): string => {
  const today = new Date();
  const minDate = new Date(today);
  minDate.setDate(today.getDate() + minDays);

  if (minDays === maxDays) {
    return minDate.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + maxDays);

  return `${minDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  })}-${maxDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })}`;
};

export interface RecipientData {
  fullName: string;
  phoneNumber: string;
}

// Interface for shipping method display data
export interface ShippingMethodDisplayData {
  name: string;
  days: string;
  estimatedDelivery: string;
}

interface RecipientDetailsFormProps {
  recipientDetails?: RecipientData;
  allow_user_select_shipping?: boolean;
  onRecipientDetailsChange?: (details: RecipientData) => void;
  selectedShippingMethod?: string;
  onShippingMethodChange?: (methodId: string) => void;
  onSubmit: (data: {
    recipientDetails: RecipientData;
    shippingMethod: string;
    selectedMethodData?: ShippingMethodDisplayData;
  }) => void;
  formId?: string;
}

/**
 * Component for entering recipient details and selecting shipping methods
 */
export const RecipientDetailsForm: React.FC<RecipientDetailsFormProps> = ({
  recipientDetails = { fullName: "", phoneNumber: "" },
  allow_user_select_shipping = false,
  selectedShippingMethod = "",
  onSubmit,
  formId = "recipient-details-form",
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const params = useParams();
  const { data: shippingMethods, isLoading, error } = useShippingMethods();

  // Get user data from localStorage to pre-fill name
  const tenantId = Array.isArray(params?.tenant)
    ? params.tenant[0]
    : params?.tenant || "";
  const userKey = tenantId ? `${tenantId}_auth_user` : " ";
  
  // Get user's full name from localStorage
  const getUserFullName = () => {
    const userDataStr = localStorage.getItem(userKey);
    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        if (userData.first_name && userData.last_name) {
          return `${userData.first_name} ${userData.last_name}`;
        }
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
    return recipientDetails.fullName; // Fallback to prop value
  };

  const { control, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      fullName: getUserFullName(),
      phoneNumber: recipientDetails.phoneNumber,
      shippingMethod: "", // Start empty and let the effect handle it
    },
  });

  const currentShippingMethod = watch("shippingMethod");

  // Force set the first shipping method when data loads - with fewer dependencies to avoid loops
  useEffect(() => {
    console.log("⏱️ Shipping methods data change detected");
    console.log("📋 Available shipping methods:", shippingMethods);

    // Only run this effect when shipping methods are loaded successfully
    if (shippingMethods && shippingMethods.length > 0) {
      console.log("✅ Shipping methods available, setting default");
      // Always set the first method as default
      const defaultMethodId = shippingMethods[0].id.toString();
      console.log("🔹 Setting default shipping method to:", defaultMethodId);
      setValue("shippingMethod", defaultMethodId, {
        shouldValidate: true,
        shouldDirty: true,
      });
    } else {
      console.log("❌ No shipping methods available yet");
    }
  }, [shippingMethods, setValue]);

  const onFormSubmit = (data: {
    fullName: string;
    phoneNumber: string;
    shippingMethod: string;
  }) => {
    // Find the complete shipping method object to pass along
    const selectedMethod = shippingMethods?.find(
      (method) => String(method.id) === data.shippingMethod
    );

    onSubmit({
      recipientDetails: {
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
      },
      shippingMethod: data.shippingMethod,
      // Pass the complete method object for display in Layout1
      selectedMethodData: selectedMethod
        ? {
            name: selectedMethod.name,
            days: `${selectedMethod.min_delivery_days}-${selectedMethod.max_delivery_days} days`,
            estimatedDelivery: calculateEstimatedDelivery(
              selectedMethod.min_delivery_days,
              selectedMethod.max_delivery_days
            ),
          }
        : undefined,
    });
  };

  return (
    <form id={formId} onSubmit={handleSubmit(onFormSubmit)}>
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12 }}>
          <Typography variant="body2" color="text.secondary">
            {t("common:store.checkout.recipientDetails", "Receiver Details")}
          </Typography>
        </Grid>

        {/* Full Name */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Controller
            name="fullName"
            control={control}
            rules={{ required: true }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label={t("common:store.checkout.recipientName", "Full Name")}
                variant="outlined"
                size="small"
                fullWidth
                required
                error={!!fieldState.error}
                helperText={
                  fieldState.error
                    ? t("common:validation.required", "This field is required")
                    : ""
                }
              />
            )}
          />
        </Grid>

        {/* Phone Number */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Controller
            name="phoneNumber"
            control={control}
            rules={{ required: true }}
            render={({ field, fieldState }) => (
              <Box
                sx={{
                  "& .react-tel-input": {
                    width: "100%",
                    "& .form-control": {
                      width: "100%",
                      height: "38px",
                      fontSize: "0.875rem",
                      borderRadius: "4px",
                      borderColor: fieldState.error
                        ? theme.palette.error.main
                        : "rgba(0, 0, 0, 0.23)",
                      paddingTop: "8px",
                      paddingBottom: "8px",
                      "&:hover": {
                        borderColor: "rgba(0, 0, 0, 0.87)",
                      },
                      "&:focus": {
                        borderColor: fieldState.error
                          ? theme.palette.error.main
                          : theme.palette.primary.main,
                        boxShadow: `0 0 0 1px ${
                          fieldState.error
                            ? theme.palette.error.main
                            : theme.palette.primary.main
                        }`,
                      },
                    },
                    "& .flag-dropdown": {
                      borderColor: fieldState.error
                        ? theme.palette.error.main
                        : "rgba(0, 0, 0, 0.23)",
                      "&:hover, &:focus-within": {
                        borderColor: "rgba(0, 0, 0, 0.87)",
                        backgroundColor: "transparent",
                      },
                    },
                    "& .selected-flag": {
                      padding: "0 8px 0 12px",
                    },
                    "& .country-list": {
                      fontSize: "0.75rem",
                    },
                    "& .special-label": {
                      position: "absolute",
                      zIndex: 1,
                      top: "-9px",
                      left: "11px",
                      display: "block",
                      color: "rgba(0,0,0,0.7)",
                      padding: "0 5px",
                      fontSize: "0.7rem",
                      whiteSpace: "nowrap",
                    },
                  },
                }}
              >
                <PhoneInput
                  country={"in"} // Default to India
                  value={field.value}
                  onChange={(phone) => field.onChange(phone)}
                  placeholder={t(
                    "common:store.checkout.phoneNumber",
                    "Phone Number"
                  )}
                  inputProps={{
                    required: true,
                    name: "phoneNumber",
                    style: {
                      width: "100%",
                      height: "38px",
                      fontSize: "0.875rem",
                    },
                  }}
                  inputStyle={{
                    paddingLeft: "46px",
                    width: "100%",
                    height: "40px",
                    fontSize: "0.875rem",
                  }}
                  containerStyle={{
                    width: "100%",
                  }}
                  enableSearch={true}
                  disableSearchIcon={false}
                  countryCodeEditable={false}
                />
                {fieldState.error && (
                  <Typography color="error" variant="caption">
                    {t("common:validation.required", "This field is required")}
                  </Typography>
                )}
              </Box>
            )}
          />
        </Grid>
        {allow_user_select_shipping && shippingMethods && shippingMethods.length >= 1 && (
          <>
            <Grid size={{ xs: 12 }}>
              <Typography variant="body2" color="text.secondary">
                {t("common:store.checkout.shippingMethods", "SHIPPING METHODS")}
              </Typography>
            </Grid>

            {/* Shipping Methods */}
            <Grid size={{ xs: 12 }}>
              <Controller
                name="shippingMethod"
                control={control}
                render={({ field }) => {
                  console.log(
                    "🔄 Rendering RadioGroup with value:",
                    field.value
                  );
                  // Force a non-null string value to avoid React controlled component warnings
                  const safeValue = field.value || "";
                  return (
                    <RadioGroup {...field} value={safeValue}>
                      <Grid container spacing={2}>
                        {isLoading ? (
                          <Grid size={{ xs: 12 }}>
                            <Typography>Loading shipping methods...</Typography>
                          </Grid>
                        ) : error ? (
                          <Grid size={{ xs: 12 }}>
                            <Typography color="error">
                              Error loading shipping methods
                            </Typography>
                          </Grid>
                        ) : (
                          shippingMethods?.map((method: ShippingMethod) => (
                            <Grid
                              size={{ xs: 12, sm: 6, md: 4 }}
                              key={method.id}
                            >
                              <Paper
                                sx={{
                                  height: "100%",
                                  p: 1,
                                  bgcolor:
                                    field.value === method.id.toString()
                                      ? "rgba(25, 118, 210, 0.08)"
                                      : "background.paper",
                                  border: "1px solid",
                                  borderColor: theme.palette.primary.main,
                                  borderRadius: 1,
                                  cursor: "pointer",
                                  boxShadow:
                                    field.value === method.id.toString()
                                      ? 1
                                      : 0,
                                  "&:hover": {
                                    bgcolor:
                                      field.value === method.id.toString()
                                        ? "rgba(25, 118, 210, 0.08)"
                                        : "rgba(0, 0, 0, 0.04)",
                                  },
                                  transition: "all 0.2s",
                                  display: "flex",
                                  flexDirection: "column",
                                  justifyContent: "space-between",
                                }}
                                onClick={() => {
                                  const methodId = method.id.toString();
                                  console.log(
                                    "Selecting shipping method:",
                                    methodId
                                  );
                                  field.onChange(methodId);
                                }}
                              >
                                <Box>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                    }}
                                  >
                                    <Typography
                                      fontSize={14}
                                      fontWeight={
                                        field.value === method.id.toString()
                                          ? "medium"
                                          : "normal"
                                      }
                                    >
                                      {method.name}
                                    </Typography>
                                    {/* <Typography
                                  fontSize={14}
                                  fontWeight="medium"
                                  color="primary"
                                  align="right"
                                >
                                </Typography> */}
                                  </Box>
                                  <Box>
                                    <Typography
                                      fontSize={13}
                                      color="text.secondary"
                                    >
                                      {formatDeliveryDays(
                                        method.min_delivery_days,
                                        method.max_delivery_days
                                      )}
                                    </Typography>
                                    <Typography
                                      fontSize={13}
                                      color="text.secondary"
                                    >
                                      Est. delivery:{" "}
                                      {calculateEstimatedDelivery(
                                        method.min_delivery_days,
                                        method.max_delivery_days
                                      )}
                                    </Typography>
                                  </Box>
                                </Box>
                              </Paper>
                            </Grid>
                          ))
                        )}
                      </Grid>
                    </RadioGroup>
                  );
                }}
              />
            </Grid>
          </>
        )}
      </Grid>
    </form>
  );
};

export default RecipientDetailsForm;
