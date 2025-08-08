import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCheckoutConfigs,
  createCheckoutConfig,
  updateCheckoutConfig,
  deleteCheckoutConfig,
  CheckoutConfig,
  CheckoutConfigInput
} from "@/app/hooks/api/storeadmin/checkoutConfig";
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
  Chip
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import CheckoutTab, { transformCheckoutForm, mapCheckoutApiToForm } from "./CheckoutTab";
import ConfirmDialog from "@/app/components/common/ConfirmDialog";

interface CheckoutFormData {
  checkout: {
    allowGuestCheckout: boolean;
    minOrderValue: string;
    allowUserSelectShipping: boolean;
    fulfillment_type: 'delivery' | 'store_pickup' | 'both' | 'none';
    pickupMethodLabel: string;
    enableDeliveryPrefs: boolean;
    enablePreferredDate: boolean;
    enableTimeSlots: boolean;
    selling_channel_id?: number | null;
    is_active: boolean;
    currency: {
      code: string;
      name: string;
    };
  };
}

export function CheckoutConfigsCardList(): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<CheckoutConfig | null>(
    null
  );
  const [isEditMode, setIsEditMode] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<CheckoutConfig | null>(null);

  const queryClient = useQueryClient();
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["checkoutConfigs"],
    queryFn: getCheckoutConfigs,
  });

  // Form setup
  const { control, handleSubmit, watch, setValue, reset } =
    useForm<CheckoutFormData>({
      defaultValues: {
        checkout: {
          allowGuestCheckout: false,
          minOrderValue: "0",
          allowUserSelectShipping: true,
          fulfillment_type: "both", // default to both
          pickupMethodLabel: "Store Pickup",
          enableDeliveryPrefs: false,
          enablePreferredDate: false,
          enableTimeSlots: false,
          currency: {
            code: "",
            name: "",
          },
        },
      },
    });

  const handleAdd = () => {
    setIsEditMode(false);
    setEditingConfig(null);
    reset({
      checkout: {
        allowGuestCheckout: true,
        minOrderValue: "25",
        allowUserSelectShipping: true,
        fulfillment_type: "both", // default to both
        pickupMethodLabel: "Store Pickup",
        enableDeliveryPrefs: true,
        enablePreferredDate: true,
        enableTimeSlots: true,
        currency: {
          code: "",
          name: "",
        },
        is_active: true,
      },
    });
    setIsDrawerOpen(true);
  };

  const handleEdit = (config: CheckoutConfig) => {
    setIsEditMode(true);
    setEditingConfig(config);
    
    // Use our mapping utility to correctly map API data to form structure
    const formData = mapCheckoutApiToForm(config);
    
    // Override specific fields if needed based on the API response
    formData.checkout.pickupMethodLabel = config.pickup_method_label;
    formData.checkout.allowUserSelectShipping = config.allow_user_select_shipping;
    formData.checkout.enableDeliveryPrefs = config.enable_delivery_prefs;
    formData.checkout.enablePreferredDate = config.enable_preferred_date;
    formData.checkout.enableTimeSlots = config.enable_time_slots;
    formData.checkout.currency = {
      code: config.currency || "INR",
      name: "", // Can be populated if you have currency data
    };
    formData.checkout.fulfillment_type = config.fulfillment_type;
  formData.checkout.is_active = typeof config.is_active === "boolean" ? config.is_active : true;
    
    reset(formData);
    setIsDrawerOpen(true);
  };

  const handleDelete = (config: CheckoutConfig) => {
    setConfigToDelete(config);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!configToDelete) return;
    
    try {
      await deleteConfig(configToDelete.id);
    } catch (error) {
      console.error("Error deleting checkout config:", error);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setConfigToDelete(null);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setEditingConfig(null);
    setIsEditMode(false);
    setApiError(null);
  };

  const { mutateAsync: addConfig } = useMutation({
    mutationFn: createCheckoutConfig,
    onSuccess: () => {
      setApiError(null);
      queryClient.invalidateQueries({ queryKey: ["checkoutConfigs"] });
      handleCloseDrawer();
    },
    onError: (error: any) => {
      console.error("Error creating checkout config:", error);
      if (error?.response?.data?.customer_group_selling_channel) {
        setApiError(error.response.data.customer_group_selling_channel[0]);
      } else if (error?.response?.data) {
        // Handle other API errors
        const firstErrorKey = Object.keys(error.response.data)[0];
        if (firstErrorKey) {
          setApiError(`${firstErrorKey}: ${error.response.data[firstErrorKey]}`);
        } else {
          setApiError(t("common.errorOccurred", "Error"));
        }
      } else {
        setApiError(t("common.errorOccurred", "Error"));
      }
    }
  });
  
  const { mutateAsync: updateConfig } = useMutation({
    mutationFn: ({ id, ...data }: { id: number } & CheckoutConfigInput) => 
      updateCheckoutConfig(id, data),
    onSuccess: () => {
      setApiError(null);
      queryClient.invalidateQueries({ queryKey: ["checkoutConfigs"] });
      handleCloseDrawer();
    },
    onError: (error: any) => {
      console.error("Error updating checkout config:", error);
      if (error?.response?.data?.customer_group_selling_channel) {
        setApiError(error.response.data.customer_group_selling_channel[0]);
      } else if (error?.response?.data) {
        // Handle other API errors
        const firstErrorKey = Object.keys(error.response.data)[0];
        if (firstErrorKey) {
          setApiError(`${firstErrorKey}: ${error.response.data[firstErrorKey]}`);
        } else {
          setApiError(t("common.errorOccurred", "Error"));
        }
      } else {
        setApiError(t("common.errorOccurred", "Error"));
      }
    }
  });
  
  const { mutateAsync: deleteConfig, isPending: isDeleting } = useMutation({
    mutationFn: deleteCheckoutConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkoutConfigs"] });
      setIsDeleteDialogOpen(false);
      setConfigToDelete(null);
    },
    onError: (error: any) => {
      console.error("Error deleting checkout config:", error);
      setIsDeleteDialogOpen(false);
      // You could add a toast notification here for the error
    }
  });
  
  const handleSave = async (data: CheckoutFormData) => {
    try {
      // Defensive: Always clear pickupMethodLabel if fulfillment_type is 'none'
      if (data.checkout.fulfillment_type === "none") {
        data.checkout.pickupMethodLabel = "";
      }
      
      const payload = transformCheckoutForm(data);
      
      if (isEditMode && editingConfig?.id) {
        await updateConfig({ id: editingConfig.id, ...payload });
      } else {
        await addConfig(payload);
      }
    } catch (error) {
      console.error("Error in handleSave:", error);
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
            {t("common.addNew", "Add New Checkout Config")}
          </Typography>
        </CardContent>
      </Card>
    </Grid>
  );

  const renderConfigCard = (config: CheckoutConfig) => (
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
                t("configuration.checkoutConfigs.noSegment", "Default")}
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
                    ? t("configuration.checkoutConfigs.cannotDeleteDefault", "Cannot delete default configuration") 
                    : (t("common.delete", "Delete") as string)
                }
              >
                <span> {/* Wrapper span for tooltip to work with disabled button */}
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
                "configuration.checkoutConfigs.minOrderValue",
                "Min Order Value"
              )}
              : {config.min_order_value}
            </Typography>
            <Typography variant="body2">
              {t("configuration.checkoutConfigs.currency", "Currency")}:{" "}
              {config.currency}
            </Typography>
            <Typography variant="body2">
              {t(
                "configuration.checkoutConfigs.allowGuestCheckout",
                "Allow Guest Checkout"
              )}
              :{" "}
              {config.allow_guest_checkout
                ? t("common.yes", "Yes")
                : t("common.no", "No")}
            </Typography>
            <Typography variant="body2">
              {t("configuration.checkoutConfigs.fulfillmentType", "Fulfillment Type")}
              {": "}
              {config.fulfillment_type === "delivery" && t("common.delivery", "Delivery")}
              {config.fulfillment_type === "store_pickup" && t("common.storePickup", "Store Pickup")}
              {config.fulfillment_type === "both" && t("common.deliveryAndPickup", "Delivery & Store Pickup")}
            </Typography>
            <Typography variant="body2">
              {t("configuration.checkoutConfigs.isActive", "Status")}:{" "}
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
          {(data || []).map((config) => renderConfigCard(config))}
        </Grid>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        title={t("configuration.checkoutConfigs.deleteTitle", "Delete Checkout Configuration")}
        content={t(
          "configuration.checkoutConfigs.deleteConfirmation",
          "Are you sure you want to delete this checkout configuration? This action cannot be undone."
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
                    "configuration.checkoutConfigs.editConfig",
                    "Edit Checkout Configuration"
                  )
                : t(
                    "configuration.checkoutConfigs.addConfig",
                    "Add Checkout Configuration"
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
            <Box sx={{ p: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
              <Typography variant="body2">
                <strong>{t("common.error", "Error")}:</strong> {apiError}
              </Typography>
            </Box>
          )}
        </AppBar>

        {/* Form Content */}
        <Box sx={{ p: 3, overflow: "auto", height: "calc(100% - 64px)" }}>
          <CheckoutTab control={control} watch={watch} setValue={setValue} />
        </Box>
      </Drawer>
    </Box>
  );
}
