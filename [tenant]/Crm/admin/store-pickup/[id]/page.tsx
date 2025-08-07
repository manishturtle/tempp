"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Snackbar, Alert, CircularProgress, Box, Typography, Button } from "@mui/material";
import { useTranslation } from "react-i18next";

import { StorePickupForm, StorePickupFormValues } from "../form";
import { useStorePickup, useUpdateStorePickup } from "@/app/hooks/api/admin/useStorePickup";
import type { StorePickupPayload } from "@/app/types/admin/storePickup";

/**
 * Convert form values to payload for API
 * @param data - Form values from the StorePickupForm
 * @returns Data formatted correctly for the API
 */
const formValuesToPayload = (data: StorePickupFormValues): StorePickupPayload => {
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
 * Edit Store Pickup page
 * Renders the form for editing an existing store pickup location
 * Handles API calls and navigation
 * @param {Object} props - Component props
 * @param {Object} props.params - URL parameters including ID of the store pickup to edit
 */
export default function EditStorePickupPage({ params }: { 
  params: { id: string }
}): React.ReactElement {
  const id = parseInt(params.id, 10);
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

  // Use the store pickup query hook to fetch data
  const { 
    data: storePickupData, 
    isLoading, 
    error: fetchError 
  } = useStorePickup(id);
  
  // Use the update store pickup mutation hook
  const { 
    mutateAsync: updateStorePickup, 
    isPending 
  } = useUpdateStorePickup(id);

  // Handle form submission
  const handleSubmit = async (data: StorePickupFormValues): Promise<void> => {
    try {
      // Convert form data to API payload format
      const payload = formValuesToPayload(data);
      
      // Update store pickup location using the hook
      await updateStorePickup(payload);
      
      // Show success notification
      setNotification({
        open: true,
        message: t("storePickup.updateSuccess"),
        severity: "success",
      });
      
      // Navigate back to listing page after short delay
      setTimeout(() => {
        router.push(`/${tenant}/Crm/admin/store-pickup`);
      }, 1500);
    } catch (error) {
      console.error("Failed to update store pickup:", error);
      
      // Show error notification
      setNotification({
        open: true,
        message: t("storePickup.updateError"),
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

  // Show loading state
  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  // Show error state
  if (fetchError || !storePickupData) {
    return (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <Typography variant="h6" color="error" gutterBottom>
          {t("storePickup.failedToLoad")}
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          {t("storePickup.tryAgainLater")}
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ mb: 4 }}>
        
            {/* Custom Action Buttons */}
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="h4" sx={{ mb: 2, fontWeight: 'medium' }}>
          {t("storePickup.editLocation")}
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
        <Button
            variant="outlined"
            onClick={handleCancel}
          >
            {t("common:cancel")}
          </Button>
          <Button
            variant="contained"
            type="submit"
            form="store-pickup-form"
            disabled={isPending}
            color="primary"
            startIcon={isPending ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {t("storePickup.saveChanges")}
          </Button>
        </Box>
        
        </Box>
        
        <StorePickupForm 
          defaultValues={storePickupData as unknown as StorePickupFormValues}
          onSubmit={handleSubmit}
        />
        
    
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
