/**
 * Shipping Zones Management Page
 *
 * Page component for listing and managing shipping zones with card-based UI
 */
"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  CircularProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ShippingZoneForm from "./components/ShippingZoneForm";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";

import {
  useShippingZones,
  useDeleteShippingZone,
  ShippingZone,
} from "@/app/hooks/api/admin/useShippingZones";
import Notification from "@/app/components/common/Notification";
import useNotification from "@/app/hooks/useNotification";
import DeleteConfirmationDialog from "@/app/components/admin/catalogue/DeleteConfirmationDialog";

function ShippingZonesPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ tenant: string }>();
  const tenant = params?.tenant as string;

  // State for new card and edit mode
  const [showNewCard, setShowNewCard] = useState(false);
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null);

  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [zoneToDelete, setZoneToDelete] = useState<ShippingZone | null>(null);

  // Notification state
  const { notification, showSuccess, showError, hideNotification } =
    useNotification();

  // Fetch shipping zones data
  const {
    data,
    isLoading: isLoadingZones,
    error,
    refetch,
  } = useShippingZones({});

  // Delete mutation
  const { mutate: deleteZone, isPending: isDeleting } = useDeleteShippingZone();

  // Handle delete click
  const handleDeleteClick = (zone: ShippingZone) => {
    setZoneToDelete(zone);
    setDeleteDialogOpen(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (!zoneToDelete) return;

    deleteZone(zoneToDelete.id, {
      onSuccess: () => {
        showSuccess(t("shippingZones.deleteSuccess"));
        refetch();
        setDeleteDialogOpen(false);
      },
      onError: (error) => {
        showError(t("shippingZones.deleteError"));
      },
    });
  };

  // Handle delete dialog close
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setZoneToDelete(null);
  };

  // Handle edit zone
  const handleEditZone = (zone: ShippingZone) => {
    // Get unique country codes from pincodes
    const pincodes = zone.pincodes as Array<{
      country_code?: string;
      state?: string;
    }>;
    const uniqueCountries = Array.from(
      new Set(pincodes?.map((p) => p.country_code).filter(Boolean))
    );
    const uniqueStates = Array.from(
      new Set(pincodes?.map((p) => p.state).filter(Boolean))
    );

    console.log("Zone Details:", {
      id: zone.id,
      name: zone.zone_name,
      uniqueCountryCodes: uniqueCountries,
      totalPincodes: zone.pincodes?.length || 0,
      states: uniqueStates,
    });

    setEditingZone(zone);
  };

  // Handle save new shipping zone
  const handleSaveZone = async (data: {
    zoneName: string;
    country: string;
  }) => {
    try {
      // TODO: Replace with actual API call to create shipping zone
      console.log("Saving shipping zone:", data);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      showSuccess(t("shippingZones.createSuccess"));
      refetch(); // Refresh the list
    } catch (error) {
      showError(t("shippingZones.createError"));
    }
  };

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Page header with title and action buttons */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1">
          {t("shippingZones.title")}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowNewCard(true)}
        >
          {t("shippingZones.addNew")}
        </Button>
      </Box>

      {/* New Shipping Zone Form */}
      {showNewCard && (
        <ShippingZoneForm
          onClose={() => setShowNewCard(false)}
          onSave={async (data) => {
            await handleSaveZone(data);
            setShowNewCard(false);
          }}
        />
      )}

      {/* Edit Shipping Zone Form */}
      {editingZone && (
        <ShippingZoneForm
          key={`edit-zone-${editingZone.id}`}
          zone={editingZone}
          isEdit={true}
          onClose={() => setEditingZone(null)}
          onSave={async (data) => {
            await handleSaveZone(data);
            setEditingZone(null);
            refetch(); // Refresh the list after edit
          }}
        />
      )}

      {/* Shipping Zones Cards */}
      <Box sx={{ mb: 2 }}>
        {isLoadingZones ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <Typography color="error">{t("error")}</Typography>
          </Box>
        ) : (
          data?.results?.map((zone: ShippingZone) => (
            // Skip rendering the card if it's being edited
            editingZone?.id === zone.id ? null : (
            <Card
              key={zone.id}
              sx={{
                width: "100%",
                mb: 2,
                transition: "all 0.3s",
                "&:hover": {
                  boxShadow: (theme) => theme.shadows[4],
                },
              }}
            >
              <CardContent>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 10 }}>
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      {zone.zone_name}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 1.5,
                        alignItems: "center",
                        mb: 1,
                      }}
                    >
                      <span>
                        {t("shippingZones.countriesCount")}:{" "}
                        <strong>
                          {new Set(zone.pincodes?.map((p) => (p as any).country_code))
                            .size || 0}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        {t("shippingZones.statesCount")}:{" "}
                        <strong>
                          {new Set(zone.pincodes?.map((p) => (p as any).state)).size ||
                            0}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        {t("shippingZones.districtsCount")}:{" "}
                        <strong>
                          {new Set(zone.pincodes?.map((p) => (p as any).district))
                            .size || 0}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        {t("shippingZones.pincodesCount")}:{" "}
                        <strong>{zone.pincodes?.length || 0}</strong>
                      </span>
                    </Typography>
                  </Grid>
                  <Grid
                    size={{ xs: 12, sm: 2 }}
                    sx={{
                      display: "flex",
                      flexDirection: { xs: "column", sm: "row" },
                      justifyContent: "flex-end",
                      alignItems: { xs: "flex-start", sm: "center" },
                      mt: { xs: 2, sm: 0 },
                    }}
                  >
                    <IconButton
                      color="primary"
                      onClick={() => handleEditZone(zone)}
                      size="small"
                      sx={{ mr: 1 }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <Chip
                      label={
                        zone.is_active
                          ? t("shippingZones.active")
                          : t("shippingZones.inactive")
                      }
                      color={zone.is_active ? "success" : "default"}
                      size="small"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
            )
          )).filter(Boolean)
        )}
      </Box>

      {/* Notification component */}
      <Notification
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={hideNotification}
      />

      {/* Delete confirmation dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onClose={handleDeleteDialogClose}
        onConfirm={handleDeleteConfirm}
        title={t("shippingZones.deleteConfirmation")}
        message={t("shippingZones.deleteConfirmationMessage", {
          item: zoneToDelete?.zone_name || t("shippingZones.zone"),
        })}
        loading={isDeleting}
      />
    </Box>
  );
}

export default ShippingZonesPage;
