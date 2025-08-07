"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Box, Typography, Button, Snackbar, Alert } from "@mui/material";
import { ShippingZoneForm } from "../shipping-zone-form/ShippingZoneForm";
import { ShippingZoneFormData } from "../shipping-zone-form/ShippingZoneForm.types";

export default function AddShippingZonePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleCancel = () => {
    router.back();
  };

  // Form submission handler - receives data from ShippingZoneForm
  const handleFormSubmit = (formData: ShippingZoneFormData) => {
    // Prepare the payload in the exact format requested
    const payload = {
      zone_name: formData.zone_name,
      description: formData.description || '',
      is_active: formData.is_active,
      pincodes: formData.pincodes
    };
    
    // Log the payload in the exact format requested
    console.log(JSON.stringify(payload, null, 4));
    
    // TODO: Make API call to save the shipping zone
    // Example: await createShippingZone({
    //   ...payload,
    //   pincode_ids: payload.pincodes.map(p => p.id)
    // });
    
    // Navigate back after successful save
    // router.push('/shipping-zones');
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2
        }}
      >
        <Typography variant="h4" component="h1">
          {t("shippingZones.AddNew")}
        </Typography>

        <Box sx={{ display: "flex", gap: 2 }}>
          <Button 
            variant="outlined" 
            onClick={handleCancel}
          >
            {t("shippingZones.cancel")}
          </Button>
          <Button 
            variant="contained" 
            type="submit"
            form="shipping-zone-form"
          >
            {t("shippingZones.save")}
          </Button>
        </Box>
      </Box>

      <ShippingZoneForm 
        onSubmit={handleFormSubmit}
      />

      {/* Error Snackbar for validation messages */}
      {error && (
        <Snackbar 
          open={!!error} 
          autoHideDuration={6000} 
          onClose={() => setError(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
}
