"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Snackbar,
  Alert,
  Box,
  Button,
  Typography,
  CircularProgress,
} from "@mui/material";
import { useTranslation } from "react-i18next";

import { StorePickupForm, StorePickupFormValues } from "../form";
import { useCreateStorePickup } from "@/app/hooks/api/admin/useStorePickup";
import type { StorePickupPayload } from "@/app/types/admin/storePickup";

/**
 * Convert form values to payload for API
 * @param data - Form values from the StorePickupForm
 * @returns Data formatted correctly for the API
 */
const formValuesToPayload = (
  data: StorePickupFormValues
): StorePickupPayload => {
  // Convert the Record-based operating hours to the expected StoreOperatingHours structure
  const operatingHours = data.operating_hours as unknown as {
    monday: { is_open: boolean; open?: string; close?: string };
    tuesday: { is_open: boolean; open?: string; close?: string };
    wednesday: { is_open: boolean; open?: string; close?: string };
    thursday: { is_open: boolean; open?: string; close?: string };
    friday: { is_open: boolean; open?: string; close?: string };
    saturday: { is_open: boolean; open?: string; close?: string };
    sunday: { is_open: boolean; open?: string; close?: string };
  };

  return {
    ...data,
    address_line2: data.address_line2 ?? undefined,
    google_place_id: data.google_place_id ?? undefined,
    operating_hours: operatingHours,
  };
};

/**
 * Add Store Pickup page
 * Renders the form for adding a new store pickup location
 * Handles API calls and navigation
 */
export default function AddStorePickupPage(): React.ReactElement {
  const { tenant } = useParams<{ tenant: string }>();
  const router = useRouter();
  const { t } = useTranslation(["common"]);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  // Use the create store pickup mutation hook
  const { mutateAsync: createStorePickup, isPending } = useCreateStorePickup();

  // Handle form submission
  const handleSubmit = async (data: StorePickupFormValues): Promise<void> => {
    try {
      // Convert form data to API payload format
      const payload = formValuesToPayload(data);

      // Create new store pickup location using the hook
      await createStorePickup(payload);

      // Show success notification
      setNotification({
        open: true,
        message: t("storePickup.addSuccess"),
        severity: "success",
      });

      // Navigate back to listing page after short delay
      setTimeout(() => {
        router.push(`/${tenant}/Crm/admin/store-pickup`);
      }, 1500);
    } catch (error) {
      console.error("Failed to create store pickup:", error);

      // Show error notification
      setNotification({
        open: true,
        message: t("storePickup.addError"),
        severity: "error",
      });
    }
  };

  // Handle cancel button click
  const handleCancel = (): void => {
    router.push(`/${tenant}/Crm/admin/store-pickup`);
  };

  // Handle notification close
  const handleCloseNotification = (): void => {
    setNotification((prev) => ({ ...prev, open: false }));
  };

  return (
    <>
      <Box >
        {/* Custom Action Buttons */}
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="h4">
            {t("storePickup.addNewLocation")}
          </Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button variant="outlined" size="small" onClick={handleCancel}>
              {t("common:cancel")}
            </Button>
            <Button
              variant="contained"
              type="submit" 
              size="small"
              form="store-pickup-form"
              disabled={isPending}
              startIcon={
                isPending ? (
                  <CircularProgress size={20} color="inherit" />
                ) : null
              }
            >
              {t("storePickup.createLocation")}
            </Button>
          </Box>
        </Box>
        <StorePickupForm onSubmit={handleSubmit} />
      </Box>

      {/* Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={5000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: "100%" }}
          variant="filled"
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </>
  );
}
