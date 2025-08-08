"use client";

import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Tooltip,
  Drawer,
  AppBar,
  Toolbar,
  Button,
  Grid,
  useTheme,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  getUITemplateSettings,
  createUITemplateSettings,
  updateUITemplateSettings,
  deleteUITemplateSettings,
  UITemplateSettings,
  UITemplateSettingsInput,
} from "@/app/hooks/api/storeadmin/uiTemplateSettings";
import ConfirmDialog from "@/app/components/common/ConfirmDialog";
import { UITemplatesTab } from "@/app/components/admin/configuration/UITemplatesTab";

// Form data structure for UITemplatesTab (matching the type in UITemplatesTab.tsx)
interface UITemplateFormData {
  uiTemplates: {
    productCardStyle: "card1" | "card2" | "card3";
    pdpLayoutStyle: "classic" | "modern" | "minimalist";
    checkout_layout: "layout1" | "layout2" | "layout3";
  };
  customer_group_selling_channel: number | null;
  is_active: boolean;
}

// Helper function to convert API data to form format
function convertToFormData(
  config: UITemplateSettings | null
): UITemplateFormData {
  return {
    uiTemplates: {
      productCardStyle:
        (config?.product_card_style as "card1" | "card2" | "card3") || "card1",
      pdpLayoutStyle:
        (config?.pdp_layout_style as "classic" | "modern" | "minimalist") ||
        "classic",
      checkout_layout:
        (config?.checkout_layout as "layout1" | "layout2" | "layout3") ||
        "layout1",
    },
    customer_group_selling_channel:
      config?.customer_group_selling_channel || null,
    is_active: config?.is_active ?? true,
  };
}

/**
 * Component for managing UI Template Settings with card-based layout
 */
export function UITemplateSettingsCardList(): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();

  // State management
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<UITemplateSettings | null>(
    null
  );
  const [isEditMode, setIsEditMode] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [configToDelete, setConfigToDelete] =
    useState<UITemplateSettings | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Fetch UI template settings
  const {
    data: uiTemplateSettings = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["uiTemplateSettings"],
    queryFn: getUITemplateSettings,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createUITemplateSettings,
    onSuccess: () => {
      setApiError(null);
      queryClient.invalidateQueries({ queryKey: ["uiTemplateSettings"] });
      handleCloseDrawer();
    },
    onError: (error: any) => {
      console.error("Error creating UI template settings:", error);
      if (error?.response?.data?.customer_group_selling_channel) {
        setApiError(error.response.data.customer_group_selling_channel[0]);
      } else if (error?.response?.data) {
        // Handle other API errors
        const firstErrorKey = Object.keys(error.response.data)[0];
        if (firstErrorKey) {
          setApiError(
            `${firstErrorKey}: ${error.response.data[firstErrorKey]}`
          );
        } else {
          setApiError(t("common.errorOccurred", "Error"));
        }
      } else {
        setApiError(t("common.errorOccurred", "Error"));
      }
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UITemplateSettingsInput }) =>
      updateUITemplateSettings(id, data),
    onSuccess: () => {
      setApiError(null);
      queryClient.invalidateQueries({ queryKey: ["uiTemplateSettings"] });
      handleCloseDrawer();
    },
    onError: (error: any) => {
      console.error("Error updating UI template settings:", error);
      if (error?.response?.data?.customer_group_selling_channel) {
        setApiError(error.response.data.customer_group_selling_channel[0]);
      } else if (error?.response?.data) {
        // Handle other API errors
        const firstErrorKey = Object.keys(error.response.data)[0];
        if (firstErrorKey) {
          setApiError(
            `${firstErrorKey}: ${error.response.data[firstErrorKey]}`
          );
        } else {
          setApiError(t("common.errorOccurred", "Error"));
        }
      } else {
        setApiError(t("common.errorOccurred", "Error"));
      }
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteUITemplateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["uiTemplateSettings"] });
      setIsConfirmDialogOpen(false);
      setConfigToDelete(null);
    },
    onError: () => {
      // Handle delete error if needed
    },
  });

  // Event handlers
  const { control, watch, handleSubmit, reset, setValue } =
    useForm<UITemplateFormData>({
      defaultValues: convertToFormData(null),
    });

  const handleAdd = (): void => {
    setEditingConfig(null);
    setIsEditMode(false);
    reset(convertToFormData(null));
    setIsDrawerOpen(true);
    setApiError(null);
  };

  const handleEdit = (config: UITemplateSettings): void => {
    setEditingConfig(config);
    setIsEditMode(true);
    reset(convertToFormData(config));
    setIsDrawerOpen(true);
    setApiError(null);
  };

  const handleCloseDrawer = (): void => {
    setIsDrawerOpen(false);
    setEditingConfig(null);
    setIsEditMode(false);
    setApiError(null);
  };

  const handleDelete = (config: UITemplateSettings): void => {
    setConfigToDelete(config);
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmDelete = (): void => {
    if (configToDelete) {
      deleteMutation.mutate(configToDelete.id);
    }
  };

  // Convert form data to API format
  const convertToApiData = (
    formData: UITemplateFormData
  ): UITemplateSettingsInput => {
    return {
      checkout_layout: formData.uiTemplates.checkout_layout,
      pdp_layout_style: formData.uiTemplates.pdpLayoutStyle,
      product_card_style: formData.uiTemplates.productCardStyle,
      is_active: formData.is_active,
      customer_group_selling_channel: formData.customer_group_selling_channel,
    };
  };

  const handleSave = (formData: UITemplateFormData): void => {
    const apiData = convertToApiData(formData);
    if (editingConfig) {
      updateMutation.mutate({ id: editingConfig.id, data: apiData });
    } else {
      createMutation.mutate(apiData);
    }
  };

  const renderAddCard = () => (
    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
      <Card
        sx={{
          height: "100%",
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
        <CardContent sx={{ textAlign: "center" }}>
          <AddIcon fontSize="large" color="primary" />
          <Typography variant="subtitle1" fontWeight={600} mt={1}>
            {t("common.addNew", "Add New UI Template Setting")}
          </Typography>
        </CardContent>
      </Card>
    </Grid>
  );

  const renderConfigCard = (config: UITemplateSettings) => (
    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={config.id}>
      <Card variant="outlined">
        <CardContent>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="subtitle1" fontWeight={600}>
              {config.segment_name ||
                t("configuration.uiTemplateSettings.noSegment", "Default")}
            </Typography>
            <Box>
              <Tooltip title={t("common.edit", "Edit") as string}>
                <IconButton
                  onClick={() => handleEdit(config)}
                  size="small"
                  color="primary"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip
                title={
                  !config.segment_name
                    ? t(
                        "configuration.uiTemplateSettings.cannotDeleteDefault",
                        "Cannot delete default configuration"
                      )
                    : (t("common.delete", "Delete") as string)
                }
              >
                <span>
                  <IconButton
                    onClick={() => handleDelete(config)}
                    size="small"
                    color="error"
                    disabled={!config.segment_name}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </Box>
          <Box mt={1}>
            <Typography variant="body2">
              {t(
                "configuration.uiTemplateSettings.checkoutLayout",
                "Checkout Layout"
              )}
              : {config.checkout_layout}
            </Typography>
            <Typography variant="body2">
              {t("configuration.uiTemplateSettings.pdpLayout", "PDP Layout")}:{" "}
              {config.pdp_layout_style}
            </Typography>
            <Typography variant="body2">
              {t(
                "configuration.uiTemplateSettings.productCard",
                "Product Card"
              )}
              : {config.product_card_style}
            </Typography>
            <Typography variant="body2">
              {t("configuration.uiTemplateSettings.isActive", "Status")}:{" "}
              <Typography
                component="span"
                color={config.is_active ? "success.main" : "text.secondary"}
              >
                {t(
                  config.is_active ? "common.active" : "common.inactive",
                  config.is_active ? "Active" : "Inactive"
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
        <Typography>{t("common.loading", "Loading...")}</Typography>
      ) : error ? (
        <Typography color="error">
          {t("common.errorOccurred", "An error occurred while loading data.")}
        </Typography>
      ) : (
        <Grid container spacing={2} sx={{ mt: 2 }}>
          {renderAddCard()}
          {(uiTemplateSettings || []).map((config) => renderConfigCard(config))}
        </Grid>
      )}

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
          // This ensures the backdrop is rendered at a high z-index
          zIndex: 1300,
        }}
        disableEscapeKeyDown // This prevents closing on ESC key
        disableScrollLock
      >
        {/* App Bar with Save and Cancel buttons */}
        <AppBar position="static" color="default" elevation={1}>
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              {isEditMode
                ? t(
                    "configuration.uiTemplateSettings.editConfig",
                    "Edit UI Template Settings"
                  )
                : t(
                    "configuration.uiTemplateSettings.addConfig",
                    "Add UI Template Settings"
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
            >
              {t("common.save", "Save")}
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
          <UITemplatesTab control={control} watch={watch} setValue={setValue} />
        </Box>
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isConfirmDialogOpen}
        onClose={() => setIsConfirmDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t(
          "configuration.uiTemplateSettings.deleteTitle",
          "Delete UI Template Setting"
        )}
        message={t(
          "configuration.uiTemplateSettings.deleteMessage",
          "Are you sure you want to delete this UI template setting? This action cannot be undone."
        )}
        confirmText={t("common.delete", "Delete")}
        cancelText={t("common.cancel", "Cancel")}
        loading={deleteMutation.isPending}
      />
    </Box>
  );
}
