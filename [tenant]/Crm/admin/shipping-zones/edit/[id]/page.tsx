"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Box, Typography, Button } from "@mui/material";
import { ShippingZoneForm } from "../../shipping-zone-form/ShippingZoneForm";
import { ShippingZoneFormData } from "../../shipping-zone-form/ShippingZoneForm.types";
import { useShippingZone } from "@/app/hooks/api/admin/useShippingZones";

interface EditShippingZonePageProps {
  params: {
    id: string;
  };
}

export default function EditShippingZonePage({
  params,
}: EditShippingZonePageProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = params;

  const { data, isLoading } = useShippingZone(Number(id));

  const handleCancel = () => {
    router.back();
  };

  const handleSave = () => {
    // Save logic will be added here
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h4" component="h1">
          {t("shippingZones.editZone")}
        </Typography>

        <Box sx={{ display: "flex", gap: 2 }}>
          <Button variant="outlined" onClick={handleCancel}>
            {t("shippingZones.cancel")}
          </Button>
          <Button variant="contained" onClick={handleSave}>
            {t("shippingZones.update")}
          </Button>
        </Box>
      </Box>
      <ShippingZoneForm
        initialValues={data}
        onSubmit={handleSave}
        disabled={isLoading}
      />
    </Box>
  );
}
