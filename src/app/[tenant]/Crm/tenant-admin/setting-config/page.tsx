"use client";

import { useState, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  Container,
  Button,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Radio,
  RadioGroup,
  Divider,
} from "@mui/material";
import { TenantConfig } from "../../../../services/tenantConfigService";
import Grid from "@mui/material/Grid";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import CircularProgress from "@mui/material/CircularProgress";
import {
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  HelpOutline as HelpOutlineIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import SaveIcon from "@mui/icons-material/Save";

import GeneralSettings, {
  GeneralFormData,
} from "../../../../components/TenantAdmin/settings/GeneralSettings";
import BrandingVisuals, {
  BrandingFormData,
} from "../../../../components/TenantAdmin/settings/BrandingVisuals";
import SecurityAuthentication from "../../../../components/TenantAdmin/settings/SecurityAuthentication";
import { saveTenantConfig } from "../../../../services/tenantConfigService";
import { getTenantConfig, TenantConfigData } from "../../../../services/tenantApi";

// Types
type TimeFormat = "12h" | "24h";
type FirstDayOfWeek = "sunday" | "monday";

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState("general");
  const [isGeneralComplete, setIsGeneralComplete] = useState(false);
  const [generalFormData, setGeneralFormData] =
    useState<GeneralFormData | null>(null);
  const [brandingFormData, setBrandingFormData] =
    useState<BrandingFormData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [existingConfig, setExistingConfig] = useState<TenantConfigData | null>(
    null
  );
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "warning" | "info",
  });

  const generalFormRef = useRef<{ triggerSubmit: () => void }>(null);
  const brandingFormRef = useRef<{ triggerSubmit: () => void }>(null);

  // Fetch tenant configuration on component mount
  useEffect(() => {
    async function fetchTenantConfig() {
      try {
        setIsLoading(true);
        const configData = await getTenantConfig();
        console.log("Fetched tenant config:", configData);
        setExistingConfig(configData);

        // Pre-populate form data from API
        const mappedGeneralData: GeneralFormData = {
          companyName: configData.company_info?.company_name || "",
          contactEmail: configData.company_info?.primary_contact_email || "",
          contactPhone: configData.company_info?.primary_contact_phone || "",
          taxId: configData.company_info?.tax_id || "",
          addressLine1:
            configData.company_info?.registered_address?.address_line_1 || "",
          addressLine2:
            configData.company_info?.registered_address?.address_line_2 || "",
          city:
            configData.company_info?.registered_address?.city?.toString() || "", // Ensure city is string
          state:
            configData.company_info?.registered_address?.state?.toString() ||
            "", // Ensure state is string
          postalCode:
            configData.company_info?.registered_address?.postal_code || "",
          country:
            configData.company_info?.registered_address?.country?.toString() ||
            "",
          language: configData.localization_config?.default_language || "en",
          timezone: configData.localization_config?.default_timezone || "UTC",
          dateFormat:
            configData.localization_config?.date_format || "MM/dd/yyyy", // Updated default to match API
          timeFormat:
            configData.localization_config?.time_format === "24h"
              ? "24h"
              : "12h",
          firstDayOfWeek: "monday",
          currency: (
            configData.localization_config?.currency || "USD"
          ).toUpperCase(), // Ensure uppercase for consistency
        };

        const mappedBrandingData: BrandingFormData = {
          default_theme_mode:
            (configData.branding_config?.default_theme_mode as
              | "light"
              | "dark"
              | "system") || "light",
          primary_brand_color:
            configData.branding_config?.primary_brand_color || "#000080", // Updated default to match API
          secondary_brand_color:
            configData.branding_config?.secondary_brand_color || "#D3D3D3", // Updated default to match API
          default_font_style:
            configData.branding_config?.default_font_style || "Roboto",
          company_logo_light:
            configData.branding_config?.company_logo_light?.url || "",
          company_logo_dark:
            configData.branding_config?.company_logo_dark?.url || "",
          favicon: configData.branding_config?.favicon?.url || "",
          custom_css: configData.branding_config?.custom_css || "",
        };

        console.log("Mapped General Data:", mappedGeneralData);
        console.log("Mapped Branding Data:", mappedBrandingData);

        setGeneralFormData(mappedGeneralData);
        setBrandingFormData(mappedBrandingData);
        setIsGeneralComplete(true); // Allow access to branding tab if we have config data

        // If we have existing config data, initial view is read-only mode
        // Otherwise, start in edit mode
        const hasData =
          configData &&
          (configData.company_info?.company_name ||
            configData.branding_config?.primary_brand_color);

        setIsEditMode(!hasData); // Only set to edit mode if there's no data
      } catch (error) {
        console.error("Failed to fetch tenant configuration:", error);
        setSnackbar({
          open: true,
          message:
            "Failed to load tenant settings. Starting in new configuration mode.",
          severity: "warning",
        });
        setIsEditMode(true); // Start in edit mode if we can't fetch existing config
      } finally {
        setIsLoading(false);
      }
    }

    fetchTenantConfig();
  }, []);

  const handleTabChange = (tab: string) => {
    if (tab === "branding" && !isGeneralComplete) {
      // If trying to go to branding tab without completing general settings
      if (generalFormRef.current) {
        generalFormRef.current.triggerSubmit();
      }
      return;
    }
    setActiveTab(tab);
  };

  // Toggle between read and edit mode
  const handleToggleEditMode = () => {
    setIsEditMode((prev) => !prev);
  };

  // Save button click handler
  const handleSave = async () => {
    try {
      setIsSaving(true);

      if (activeTab === "general" && generalFormRef.current) {
        // For general tab, use triggerSubmit to get current form values
        console.log("Triggering general form submission");
        // This will collect current form values, validate, and call handleGeneralSubmit
        generalFormRef.current.triggerSubmit();
        // We don't need to await here because triggerSubmit will handle the flow
      } else if (activeTab === "branding" && brandingFormRef.current) {
        // Verify we have generalFormData before saving branding
        if (!generalFormData) {
          console.warn(
            "No general form data available when trying to save branding"
          );
          setSnackbar({
            open: true,
            message: "Please complete and save the general settings first.",
            severity: "warning",
          });
          setActiveTab("general");
          setIsSaving(false);
          return;
        }

        console.log(
          "Triggering branding form submission with general data:",
          generalFormData
        );
        // Trigger branding form submission and check the result
        const saveSuccessful = brandingFormRef.current.triggerSubmit();

        // If save was not successful (validation failed), reset the saving state
        if (!saveSuccessful) {
          setIsSaving(false);
        }
      }
    } catch (error) {
      console.error("Error in handleSave:", error);
      setSnackbar({
        open: true,
        message:
          error instanceof Error
            ? error.message
            : "Failed to save settings. Please try again.",
        severity: "error",
      });
      setIsSaving(false);
    }
  };

  // Exit edit mode after successful save
  const handleSaveSuccess = () => {
    setIsEditMode(false);
  };

  const saveCombinedData = async (
    generalData: GeneralFormData,
    brandingData: BrandingFormData
  ) => {
    try {
      // Validate that both datasets are available
      if (!generalData || Object.keys(generalData).length === 0) {
        throw new Error("General settings data is missing or empty");
      }

      if (!brandingData || Object.keys(brandingData).length === 0) {
        throw new Error("Branding settings data is missing or empty");
      }

      console.log(
        "Creating API data with:\nGeneral:",
        generalData,
        "\nBranding:",
        brandingData
      );

      // Create the API data structure according to the backend model
      const apiData: TenantConfig = {
        company_info: {
          company_name: generalData.companyName || "",
          primary_contact_email: generalData.contactEmail || "",
          primary_contact_phone: generalData.contactPhone || "",
          tax_id: generalData.taxId || "",
          registered_address: {
            address_line_1: generalData.addressLine1 || "",
            address_line_2: generalData.addressLine2 || "",
            city: generalData.city || "",
            state: generalData.state || "",
            postal_code: generalData.postalCode || "",
            country: generalData.country || "",
          },
        },
        branding_config: {
          default_theme_mode: brandingData.default_theme_mode || "light",
          primary_brand_color: brandingData.primary_brand_color || "#000080",
          secondary_brand_color:
            brandingData.secondary_brand_color || "#D3D3D3",
          default_font_style: brandingData.default_font_style || "Roboto",
          company_logo_light: brandingData.company_logo_light
            ? {
                url:
                  typeof brandingData.company_logo_light === "string"
                    ? brandingData.company_logo_light
                    : brandingData.company_logo_light.url || "",
                filename:
                  typeof brandingData.company_logo_light === "string"
                    ? brandingData.company_logo_light.includes("base64")
                      ? "logo-light.png"
                      : brandingData.company_logo_light.split("/").pop() ||
                        "logo-light.png"
                    : brandingData.company_logo_light.filename ||
                      "logo-light.png",
              }
            : undefined,
          company_logo_dark: brandingData.company_logo_dark
            ? {
                url:
                  typeof brandingData.company_logo_dark === "string"
                    ? brandingData.company_logo_dark
                    : brandingData.company_logo_dark.url || "",
                filename:
                  typeof brandingData.company_logo_dark === "string"
                    ? brandingData.company_logo_dark.includes("base64")
                      ? "logo-dark.png"
                      : brandingData.company_logo_dark.split("/").pop() ||
                        "logo-dark.png"
                    : brandingData.company_logo_dark.filename ||
                      "logo-dark.png",
              }
            : undefined,
          favicon: brandingData.favicon
            ? {
                url:
                  typeof brandingData.favicon === "string"
                    ? brandingData.favicon
                    : brandingData.favicon.url || "",
                filename: "favicon.ico",
              }
            : undefined,
          custom_css: brandingData.custom_css || "",
        },
        localization_config: {
          default_language: generalData.language || "en",
          supported_languages: [generalData.language || "en"],
          default_timezone: generalData.timezone || "UTC",
          date_format: generalData.dateFormat || "MM/dd/yyyy",
          time_format: generalData.timeFormat || "12h",
          first_day_of_week: generalData.firstDayOfWeek || "monday",
          currency: (generalData.currency || "USD").toLowerCase(),
          number_format: "1,234.56",
          measurement_system: "metric",
        },
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("Saving tenant config:", JSON.stringify(apiData, null, 2));

      await saveTenantConfig(apiData);

      // Save the data to localStorage as backup
      localStorage.setItem(
        "lastSavedConfig",
        JSON.stringify({
          generalData,
          brandingData,
          timestamp: new Date().toISOString(),
        })
      );

      setSnackbar({
        open: true,
        message: "Settings saved successfully!",
        severity: "success",
      });

      // Exit edit mode after successful save
      handleSaveSuccess();

      // Refresh existing config data with the saved values
      setExistingConfig({
        ...existingConfig,
        company_info: {
          ...apiData.company_info,
          registered_address: {
            ...apiData.company_info.registered_address,
            city:
              parseInt(
                apiData.company_info.registered_address.city as string
              ) || 0,
            state:
              parseInt(
                apiData.company_info.registered_address.state as string
              ) || 0,
            country:
              parseInt(
                apiData.company_info.registered_address.country as string
              ) || 0,
          },
        },
        branding_config: apiData.branding_config,
        localization_config: apiData.localization_config,
      });

      // Also update the form data to ensure consistency
      setGeneralFormData(generalData);
      setBrandingFormData(brandingData);

      return true;
    } catch (error) {
      console.error("Error saving tenant config:", error);
      setSnackbar({
        open: true,
        message:
          error instanceof Error ? error.message : "Failed to save settings",
        severity: "error",
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleGeneralSubmit = async (data: GeneralFormData) => {
    if (!data || Object.keys(data).length === 0) {
      throw new Error("General settings data is missing or empty");
    }
    try {
      console.log("General form submitted:", data);
      setIsSaving(true);

      const apiData: TenantConfig = {
        company_info: {
          company_name: data.companyName || "",
          primary_contact_email: data.contactEmail || "",
          primary_contact_phone: data.contactPhone || "",
          tax_id: data.taxId || "",
          registered_address: {
            address_line_1: data.addressLine1 || "",
            address_line_2: data.addressLine2 || "",
            city: data.city || "",
            state: data.state || "",
            postal_code: data.postalCode || "",
            country: data.country || "",
          },
        },
        localization_config: {
          default_language: data.language || "en",
          supported_languages: [data.language || "en"],
          default_timezone: data.timezone || "UTC",
          date_format: data.dateFormat || "MM/dd/yyyy",
          time_format: data.timeFormat || "12h",
          first_day_of_week: data.firstDayOfWeek || "monday",
          currency: (data.currency || "USD").toLowerCase(),
          number_format: "1,234.56",
          measurement_system: "metric",
        },
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await saveTenantConfig(apiData);
      handleSaveSuccess();

      // Create a deep copy of the data to ensure it's fully captured
      // const newGeneralData = JSON.parse(JSON.stringify(data));
      // console.log("Storing general data in state:", newGeneralData);
      // // Store the data in state for later use
      // setGeneralFormData(newGeneralData);
      // setIsGeneralComplete(true);

      // // Store in localStorage as backup (will help debug persistence issues)
      // localStorage.setItem(
      //   "cachedGeneralSettings",
      //   JSON.stringify(newGeneralData)
      // );

      // Move to branding tab after saving general settings
      setActiveTab("branding");

      setSnackbar({
        open: true,
        message: "General settings saved. Please configure branding.",
        severity: "success",
      });
    } catch (error) {
      console.error("Error in handleGeneralSubmit:", error);
      setSnackbar({
        open: true,
        message:
          error instanceof Error
            ? error.message
            : "Failed to save general settings",
        severity: "error",
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleBrandingSubmit = async (data: BrandingFormData) => {
    if (!data || Object.keys(data).length === 0) {
      throw new Error("Branding settings data is missing or empty");
    }
    try {
      setIsSaving(true);

      const apiData: TenantConfig = {
        branding_config: {
          default_theme_mode: data.default_theme_mode || "light",
          primary_brand_color: data.primary_brand_color || "#000080",
          secondary_brand_color: data.secondary_brand_color || "#D3D3D3",
          default_font_style: data.default_font_style || "Roboto",
          company_logo_light: data.company_logo_light
            ? {
                url:
                  typeof data.company_logo_light === "string"
                    ? data.company_logo_light
                    : data.company_logo_light.url || "",
                filename:
                  typeof data.company_logo_light === "string"
                    ? data.company_logo_light.includes("base64")
                      ? "logo-light.png"
                      : data.company_logo_light.split("/").pop() ||
                        "logo-light.png"
                    : data.company_logo_light.filename || "logo-light.png",
              }
            : undefined,
          company_logo_dark: data.company_logo_dark
            ? {
                url:
                  typeof data.company_logo_dark === "string"
                    ? data.company_logo_dark
                    : data.company_logo_dark.url || "",
                filename:
                  typeof data.company_logo_dark === "string"
                    ? data.company_logo_dark.includes("base64")
                      ? "logo-dark.png"
                      : data.company_logo_dark.split("/").pop() ||
                        "logo-dark.png"
                    : data.company_logo_dark.filename || "logo-dark.png",
              }
            : undefined,
          favicon: data.favicon
            ? {
                url:
                  typeof data.favicon === "string"
                    ? data.favicon
                    : data.favicon.url || "",
                filename: "favicon.ico",
              }
            : undefined,
          custom_css: data.custom_css || "",
        },
      };

      setBrandingFormData(data);
      await saveTenantConfig(apiData);
      handleSaveSuccess();
      setSnackbar({
        open: true,
        message: "Branding settings saved successfully!",
        severity: "success",
      });
    } catch (error) {
      console.error("Error in handleBrandingSubmit:", error);
      setSnackbar({
        open: true,
        message:
          error instanceof Error
            ? error.message
            : "Failed to save branding settings",
        severity: "error",
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  return (
    <>
      {/* We'll put the tab buttons together with the action buttons */}

      {isLoading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: 400,
          }}
        >
          <CircularProgress />
          <Typography variant="h6" sx={{ ml: 2 }}>
            Loading tenant configuration...
          </Typography>
        </Box>
      ) : (
        <>
          {/* Tabs with action button */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: 1,
              borderColor: "divider",
              mb: 4,
            }}
          >
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => handleTabChange(newValue)}
              sx={{ mb: 1 }}
            >
              <Tab value="general" label="General Settings" />
              <Tab
                value="branding"
                label="Branding & Visuals"
                disabled={!isGeneralComplete}
              />
              <Tab
                value="security"
                label="Security & Authentication (Under Development)"
                disabled={!isGeneralComplete}
              />
            </Tabs>

            {!isLoading && (
              <Box sx={{ mb: 1 }}>
                {existingConfig && !isEditMode ? (
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={handleToggleEditMode}
                    startIcon={<EditIcon />}
                  >
                    Edit Settings
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSave}
                    disabled={isSaving}
                    startIcon={
                      isSaving ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        <SaveIcon />
                      )
                    }
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                )}
              </Box>
            )}
          </Box>

          {/* Tab Content */}
          <Box sx={{ mt: 3, mb: 3 }}>
            {activeTab === "general" && (
              <GeneralSettings
                ref={generalFormRef}
                onSave={handleGeneralSubmit}
                defaultValues={generalFormData || undefined}
                readOnly={!isEditMode}
              />
            )}
            {activeTab === "branding" && (
              <BrandingVisuals
                ref={brandingFormRef}
                onSave={handleBrandingSubmit}
                defaultValues={brandingFormData || undefined}
                readOnly={!isEditMode}
              />
            )}
            {activeTab === "security" && (
              <SecurityAuthentication
                onSave={() => {
                  setSnackbar({
                    open: true,
                    message: "Security settings saved successfully!",
                    severity: "success",
                  });
                  // Exit edit mode after successful save
                  handleSaveSuccess();
                }}
              />
            )}
          </Box>

          <Divider sx={{ my: 3 }} />
        </>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default SettingsPage;
