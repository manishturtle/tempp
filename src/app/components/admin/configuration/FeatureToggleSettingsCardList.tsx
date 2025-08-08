import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getFeatureToggleSettings,
  createFeatureToggleSetting,
  updateFeatureToggleSetting,
  deleteFeatureToggleSetting,
  FeatureToggleSettings,
  FeatureToggleSettingsInput,
} from "@/app/hooks/api/storeadmin/featureToggleSettings";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  Drawer,
  AppBar,
  Toolbar,
  Button,
  Chip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import FeatureToggleTab, {
  transformFeatureToggleForm,
  mapFeatureToggleApiToForm,
  FeatureToggleFormData,
} from "./FeatureToggleTab";
import ConfirmDialog from "@/app/components/common/ConfirmDialog";

export function FeatureToggleSettingsCardList(): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingSettings, setEditingSettings] =
    useState<FeatureToggleSettings | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [settingsToDelete, setSettingsToDelete] =
    useState<FeatureToggleSettings | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["featureToggleSettings"],
    queryFn: getFeatureToggleSettings,
  });

  // Form setup
  const { control, handleSubmit, watch, setValue, reset } =
    useForm<FeatureToggleFormData>({
      defaultValues: {
        featureToggle: {
          customer_group_selling_channel: null,
          wallet_enabled: false,
          loyalty_enabled: false,
          reviews_enabled: true,
          wishlist_enabled: true,
          min_recharge_amount: "",
          max_recharge_amount: "",
          daily_transaction_limit: "",
          is_active: true,
          kill_switch :false,
          default_delivery_zone:""
        },
      },
    });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createFeatureToggleSetting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["featureToggleSettings"] });
      setIsDrawerOpen(false);
      setApiError(null);
    },
    onError: (error: any) => {
      setApiError(
        error.response?.data?.customer_group_selling_channel ||
          "Failed to create feature toggle settings"
      );
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: number } & FeatureToggleSettingsInput) =>
      updateFeatureToggleSetting(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["featureToggleSettings"] });
      setIsDrawerOpen(false);
      setApiError(null);
    },
    onError: (error: any) => {
      setApiError(
        error.response?.data?.customer_group_selling_channel ||
          "Failed to update feature toggle settings"
      );
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteFeatureToggleSetting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["featureToggleSettings"] });
      setIsDeleteDialogOpen(false);
      setSettingsToDelete(null);
    },
    onError: (error: any) => {
      setApiError(
        error.response?.data?.customer_group_selling_channel ||
          "Failed to delete feature toggle settings"
      );
    },
  });

  const isCreating = createMutation.isPending;
  const isUpdating = updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  const handleAdd = () => {
    setIsEditMode(false);
    setEditingSettings(null);
    reset({
      featureToggle: {
        customer_group_selling_channel: null,
        wallet_enabled: false,
        loyalty_enabled: false,
        reviews_enabled: true,
        wishlist_enabled: true,
        min_recharge_amount: "",
        max_recharge_amount: "",
        daily_transaction_limit: "",
        is_active: true,
        kill_switch: false,
        default_delivery_zone: "All over world", // Set default to "All over world"
      },
    });
    setIsDrawerOpen(true);
  };

  const handleEdit = (settings: FeatureToggleSettings) => {
    setIsEditMode(true);
    setEditingSettings(settings);

    // Map API data to form structure
    const formData = mapFeatureToggleApiToForm(settings);
    reset(formData);
    setIsDrawerOpen(true);
  };

  const handleDelete = (settings: FeatureToggleSettings) => {
    setSettingsToDelete(settings);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (settingsToDelete) {
      deleteMutation.mutate(settingsToDelete.id);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setSettingsToDelete(null);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setApiError(null);
  };

  const handleSave = (data: FeatureToggleFormData) => {
    const transformedData = transformFeatureToggleForm(data);

    if (isEditMode && editingSettings) {
      updateMutation.mutate({ id: editingSettings.id, ...transformedData });
    } else {
      createMutation.mutate(transformedData);
    }
  };

  const renderAddCard = () => (
    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
      <Card
        sx={{
          height: 150,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `2px dashed ${theme.palette.divider}`,
          backgroundColor: "transparent",
          cursor: "pointer",
          "&:hover": {
            borderColor: theme.palette.primary.main,
            backgroundColor: theme.palette.action.hover,
          },
        }}
        onClick={handleAdd}
      >
        <Box textAlign="center">
          <AddIcon
            sx={{
              fontSize: 48,
              color: theme.palette.text.secondary,
              mb: 1,
            }}
          />
          <Typography variant="h6" color="text.secondary">
            {t(
              "configuration.featureToggleSettings.addSettings",
              "Add Feature Toggle Settings"
            )}
          </Typography>
        </Box>
      </Card>
    </Grid>
  );

  const renderSettingsCard = (settings: FeatureToggleSettings) => (
    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={settings.id}>
      <Card sx={{ height: 150, position: "relative" }}>
        <Box
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            display: "flex",
            gap: 1,
          }}
        >
          <Tooltip title={t("common.edit", "Edit")}>
            <IconButton size="small" onClick={() => handleEdit(settings)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t("common.delete", "Delete")}>
            <IconButton
              size="small"
              onClick={() => handleDelete(settings)}
              color="error"
              disabled={!settings.segment_name}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1, pr: 6 }}>
            {settings.segment_name || "Default Settings"}
          </Typography>

          <Box sx={{ mb: 1 }}>
            <Typography variant="body2">
              Wallet: {settings.wallet_enabled ? "True" : "False"}
            </Typography>
            {/* <Typography variant="body2">
              Loyalty: {settings.loyalty_enabled ? "True" : "False"}
            </Typography> */}
            <Typography variant="body2">
              Reviews: {settings.reviews_enabled ? "True" : "False"}
            </Typography>
            <Typography variant="body2">
              Wishlist: {settings.wishlist_enabled ? "True" : "False"}
            </Typography>
            <Typography variant="body2">
              {t("configuration.checkoutConfigs.isActive", "Status")}:{" "}
              <Typography
                component="span"
                color={settings.is_active ? "success.main" : "text.secondary"}
              >
                {t(
                  settings.is_active ? "common.active" : "common.inactive",
                  settings.is_active ? "Active" : "Inactive"
                )}
              </Typography>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );

  return (
    <Box>
      {isLoading ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight={200}
        >
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">
          {t("common.errorLoadingData", "Error loading data")}
        </Typography>
      ) : (
        <Grid container spacing={2} sx={{ mt: 2 }}>
          {renderAddCard()}
          {(data || []).map((settings) => renderSettingsCard(settings))}
        </Grid>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        title={t(
          "configuration.featureToggleSettings.deleteTitle",
          "Delete Feature Toggle Settings"
        )}
        content={t(
          "configuration.featureToggleSettings.deleteConfirmation",
          "Are you sure you want to delete these feature toggle settings? This action cannot be undone."
        )}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isLoading={isDeleting}
        confirmText={t("common.delete", "Delete")}
        cancelText={t("common.cancel", "Cancel")}
      />

      {/* Full Screen Drawer */}
      <Drawer
        anchor="right"
        open={isDrawerOpen}
        onClose={(_, reason) => {
          // Prevent closing on backdrop click or escape key
          if (reason === "backdropClick" || reason === "escapeKeyDown") {
            return;
          }
          handleCloseDrawer();
        }}
        PaperProps={{
          sx: {
            width: "100%",
            height: "100%",
          },
        }}
        sx={{
          zIndex: 1300,
        }}
        disableEscapeKeyDown
        disableScrollLock
      >
        {/* App Bar with Save and Cancel buttons */}
        <AppBar position="static" color="default" elevation={1}>
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              {isEditMode
                ? t(
                    "configuration.featureToggleSettings.editSettings",
                    "Edit Feature Toggle Settings"
                  )
                : t(
                    "configuration.featureToggleSettings.addSettings",
                    "Add Feature Toggle Settings"
                  )}
            </Typography>
            <Button color="inherit" onClick={handleCloseDrawer} sx={{ mr: 2 }}>
              <CloseIcon sx={{ mr: 1 }} />
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit(handleSave)}
              startIcon={<SaveIcon />}
              disabled={isCreating || isUpdating}
            >
              {isCreating || isUpdating ? (
                <CircularProgress size={20} />
              ) : (
                t("common.save", "Save")
              )}
            </Button>
          </Toolbar>
          {apiError && (
            <Box
              sx={{ p: 2, bgcolor: "error.light", color: "error.contrastText" }}
            >
              <Typography variant="body2">
                <strong>{t("common.error", "Error")}:</strong> {apiError}
              </Typography>
            </Box>
          )}
        </AppBar>

        {/* Form Content */}
        <Box sx={{ p: 3, overflow: "auto", height: "calc(100% - 64px)" }}>
          <FeatureToggleTab
            control={control}
            watch={watch}
            setValue={setValue}
          />
        </Box>
      </Drawer>
    </Box>
  );
}
