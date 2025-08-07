"use client";

import React, { useState, useEffect } from "react";
import {
  useRouter,
  useParams,
  useSearchParams as useNextSearchParams,
} from "next/navigation"; // Renamed to avoid conflict
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Snackbar,
  Alert,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Link,
  CircularProgress,
 
} from "@mui/material";
import AppDrawer from "../../../../../components/AIPlatform/AppDrawer";
import { styled } from "@mui/material/styles";

import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import AppLayout from "../../../../../components/AIPlatform/AppLayout";
import { useTenant } from "../../../../../contexts/ai-platform/TenantContext";
import { AI_PLATFORM_API_BASE_URL } from '@/utils/constants';
import { getAuthHeaders } from '@/app/hooks/api/auth';


// Interfaces (assuming these are mostly correct from your snippet)
const StyledCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: "none", // Or a subtle shadow like theme.shadows[1] if you prefer
  backgroundColor: theme.palette.background.paper,
}));
interface ModelParameters {
  top_p: number;
  max_tokens: number;
  temperature: number;
  presence_penalty: number;
  frequency_penalty: number;
}

interface VariablesSchema {
  type: string;
  properties: Record<string, { type: string }>;
}

interface PromptVariant {
  id: number;
  variant_name: string;
  system_prompt: string;
  user_prompt: string;
  agentic_submodel: number; // Should be ID
  model_parameters: ModelParameters;
  variables_schema: VariablesSchema;
  is_published: boolean;
  published_at: string | null;
  is_active: boolean;
  prompt_name: string; // Added for display
  version_number: string; // Added for display
  // prompt_id: number; // Usually variant is enough, or implies parent prompt's ID
  // created_at: string;
  // updated_at: string;
  // input_format: string;
  // output_format: string;
}

interface PromptVersion {
  id: number;
  version_number: string;
  description: string;
  variants: PromptVariant[];
}

interface PromptData {
  id: number;
  name: string;
  description?: string; // Make optional if not always present
  // is_template: boolean; // Not used in current variant extraction
  versions: PromptVersion[];
}

interface PromptApiResponse {
  // For the list of prompts
  count?: number;
  next?: string | null;
  previous?: string | null;
  results: PromptData[]; // Assuming prompts API returns a list under 'results' or directly an array
}

interface WebhookForm {
  name: string;
  published_prompt_variant: string;
  webhook_secret_key: string;
  decoded_webhook_secret_key?: string; // Add decoded key for edit mode
  incoming_url: string;
  allowed_ips?: string[];
  webhook_context: string;
}


export default function CreateWebhookPage() {
  const router = useRouter();
  const searchParams = useNextSearchParams(); // Use renamed import

  const [loading, setLoading] = useState(false); // For form submission (create/update)
  const [promptsLoading, setPromptsLoading] = useState(true); // For loading prompt variants
  const [isLoadingWebhook, setIsLoadingWebhook] = useState(false); // For fetching existing webhook data

  const tenantSlug = useParams().tenant;


  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({ open: false, message: "", severity: "success" });

  const [ipInput, setIpInput] = useState("");

  const [isEditMode, setIsEditMode] = useState(false);
  const [webhookIdToEdit, setWebhookIdToEdit] = useState<string | null>(null);

  const [promptVariantsForSelect, setPromptVariantsForSelect] = useState<
    Array<{
      id: number;
      displayName: string; // e.g., "Prompt Name - Version - Variant Name"
    }>
  >([]);

  const [formData, setFormData] = useState<WebhookForm>({
    name: "",
    published_prompt_variant: "",
    webhook_secret_key: "",
    incoming_url: "",
    allowed_ips: [],
    webhook_context: "",
  });

  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Effect to check for edit mode and fetch existing webhook data
  useEffect(() => {
    // Try to get the ID from either 'id' or 'webhookId' parameter
    const idFromUrl = searchParams.get("id") || searchParams.get("webhookId");
    const promptVariantId = searchParams.get("promptVariantId");
    const fromPrompt = searchParams.get("fromPrompt");
    const forceRefresh = searchParams.get("forceRefresh") === "true";

    // Function to update form data from URL parameters
    const updateFormDataFromParams = () => {
      const newFormData: Partial<WebhookForm> = {};

      // Get all parameters from URL
      searchParams.forEach((value, key) => {
        if (key === "allowed_ips") {
          try {
            newFormData.allowed_ips = JSON.parse(decodeURIComponent(value));
          } catch (e) {
            console.error("Error parsing allowed_ips:", e);
          }
        } else if (key === "name") {
          newFormData.name = value;
        } else if (key === "webhook_secret_key") {
          newFormData.webhook_secret_key = value;
        } else if (key === "incoming_url") {
          newFormData.incoming_url = value;
        } else if (key === "webhook_context") {
          newFormData.webhook_context = value;
        } else if (key === "published_prompt_variant") {
          newFormData.published_prompt_variant = value;
        }
      });

      return newFormData;
    };

    if (idFromUrl) {
      // Edit mode
      setIsEditMode(true);
      setWebhookIdToEdit(idFromUrl);

      if (forceRefresh) {
        // If force refresh, update form data from URL params first
        const formUpdates = updateFormDataFromParams();
        setFormData((prev) => ({
          ...prev,
          ...formUpdates,
        }));
      } else {
        // Otherwise, fetch the latest data from the server
        fetchWebhookData(idFromUrl);
      }
    } else if (promptVariantId || fromPrompt === "true") {
      // Coming back from prompt template with a variant ID
      const formUpdates = updateFormDataFromParams();

      // If we have a prompt variant ID, ensure it's set
      if (promptVariantId) {
        formUpdates.published_prompt_variant = promptVariantId;
      }

      setFormData((prev) => ({
        ...prev,
        ...formUpdates,
      }));

      // Clean up the URL after setting the form data
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("promptVariantId");
      cleanUrl.searchParams.delete("fromPrompt");
      cleanUrl.searchParams.delete("forceRefresh");
      window.history.replaceState({}, "", cleanUrl.toString());
    }
  }, [searchParams]); // Re-run if searchParams change

  const fetchWebhookData = async (id: string) => {
    setIsLoadingWebhook(true);
    try {
      const response = await fetch(
        `${AI_PLATFORM_API_BASE_URL}/${tenantSlug}/webhook-management/webhooks/${id}/`,
        {
          headers: {
            ...getAuthHeaders(),
          },
        }
      ); // Use direct ID endpoint
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to fetch webhook data");
      }
      const webhook: WebhookForm & { id: string } = await response.json(); // Assuming API returns a single object for the ID

      if (!webhook) {
        throw new Error("Webhook not found");
      }

      setFormData({
        name: webhook.name || "",
        published_prompt_variant:
          webhook.published_prompt_variant?.toString() || "",
        webhook_secret_key: webhook.decoded_webhook_secret_key || "", // Use decoded secret key for editing
        incoming_url: webhook.incoming_url || "",
        allowed_ips: Array.isArray(webhook.allowed_ips)
          ? webhook.allowed_ips
          : [],
        webhook_context: webhook.webhook_context || "",
      });
    } catch (error) {
      console.error("Error fetching webhook data:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load webhook data."
      );
    } finally {
      setIsLoadingWebhook(false);
    }
  };

  // State to track if we need to force refresh the prompt list
  const [forceRefresh, setForceRefresh] = useState(false);

  // Effect to handle force refresh parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("forceRefresh") === "true") {
      setForceRefresh(true);
      // Remove the parameter to prevent unnecessary refreshes
      params.delete("forceRefresh");
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, "", newUrl);
    }
  }, []);

  // Effect to fetch prompt variants for the dropdown
  useEffect(() => {
    const fetchAllPromptVariants = async () => {
      setPromptsLoading(true);
      try {
        const response = await fetch(
          `${AI_PLATFORM_API_BASE_URL}/${tenantSlug}/prompt-management/prompts/`,
          {
            headers: {
              ...getAuthHeaders(),
            },
          }
        );
        if (!response.ok) {
          throw new Error("Failed to fetch prompts list");
        }
        const promptsResponse = (await response.json()) as PromptApiResponse;
        const allPrompts =
          promptsResponse.results ||
          (Array.isArray(promptsResponse) ? promptsResponse : []);

        const variants: Array<{ id: number; displayName: string }> = [];
        allPrompts.forEach((prompt) => {
          prompt.versions.forEach((version) => {
            version.variants.forEach((variant) => {
              variants.push({
                id: variant.id,
                displayName: `${prompt.name} (v${version.version_number}) - ${variant.variant_name}`,
              });
            });
          });
        });
        setPromptVariantsForSelect(variants);

        // Handle URL parameters for variant selection and form data
        if (!isEditMode) {
          const params = new URLSearchParams(window.location.search);
          const promptVariantId = params.get("promptVariantId");
          const savedFormDataString = sessionStorage.getItem("webhookFormData");

          // Handle saved form data from session storage
          if (savedFormDataString) {
            const parsedDataFromSession = JSON.parse(
              savedFormDataString
            ) as Partial<WebhookForm>;
            setFormData((prev) => ({
              ...prev,
              ...parsedDataFromSession,
              // Use promptVariantId from URL if available, otherwise keep the saved one
              published_prompt_variant:
                promptVariantId ||
                parsedDataFromSession.published_prompt_variant ||
                "",
            }));
            // Clear the session storage after using it
            sessionStorage.removeItem("webhookFormData");
          } else if (promptVariantId) {
            // If no saved data but we have a promptVariantId, just set that
            setFormData((prev) => ({
              ...prev,
              published_prompt_variant: promptVariantId,
            }));
          } else if (params.get("promptId")) {
            const promptId = params.get("promptId");
            if (
              promptId &&
              variants.some((v) => v.id.toString() === promptId)
            ) {
              setFormData((prev) => ({
                ...prev,
                published_prompt_variant: promptId,
              }));
              const newUrl = new URL(window.location.href);
              newUrl.searchParams.delete("promptId");
              window.history.replaceState({}, "", newUrl.toString());
            } else {
              console.warn(
                `Prompt Variant ID ${promptIdParam} not found in fetched variants.`
              );
            }
          }
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load prompt variants."
        );
        console.error("Error fetching prompt variants:", err);
      } finally {
        setPromptsLoading(false);
      }
    };
    fetchAllPromptVariants();
  }, [isEditMode, forceRefresh]); // Re-fetch when edit mode changes or force refresh is triggered (though typically it's set once)

  const handleInputChange = (
    e:
      | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      | SelectChangeEvent<string>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name as string]: value }));
  };

  const handleIpInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddIps();
    }
  };

  const handleAddIps = () => {
    if (!ipInput.trim()) return;
    const newIps = ipInput
      .split(/[,\s]+/)
      .map((ip) => ip.trim())
      .filter((ip) => ip);
    if (newIps.length > 0) {
      setFormData((prev) => ({
        ...prev,
        allowed_ips: [...new Set([...(prev.allowed_ips || []), ...newIps])],
      }));
      setIpInput("");
    }
  };

  const handleRemoveIp = (ipToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      allowed_ips: (prev.allowed_ips || []).filter((ip) => ip !== ipToRemove),
    }));
  };

  const navigateToCreatePrompt = () => {
    // Save current form data to session storage
    const formDataToSave = {
      ...formData,
      // Add isEditMode flag to know where to redirect back
      _isEditMode: isEditMode,
      _webhookId: webhookIdToEdit,
    };

    // Store in session storage for retrieval after prompt creation
    sessionStorage.setItem("webhookFormData", JSON.stringify(formDataToSave));

    // Navigate to prompt creation with fromWebhook flag
    router.push(`/${tenantSlug}/Crm/ai-platform/prompt-template/create?fromWebhook=true`);
  };

  const navigateToWorkbench = () => {
    if (
      formData.published_prompt_variant &&
      formData.published_prompt_variant !== "new-prompt"
    ) {
      // Save current form data to session storage
      const formDataToSave = {
        ...formData,
        _isEditMode: isEditMode,
        _webhookId: webhookIdToEdit,
      };

      // Store in session storage for retrieval after prompt edit
      sessionStorage.setItem("webhookFormData", JSON.stringify(formDataToSave));

      // Navigate to prompt edit with the variant ID
      router.push(
        `/${tenantSlug}/Crm/ai-platform/prompt-template/create?editVariant=${formData.published_prompt_variant}&fromWebhook=true`
      );
    } else {
      setSnackbar({
        open: true,
        message: "Please select a valid prompt variant to edit in workbench.",
        severity: "error",
      });
    }
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) return "Webhook Name is required.";
    if (
      !formData.published_prompt_variant ||
      formData.published_prompt_variant === "new-prompt"
    ) {
      return "Published Prompt Variant is required.";
    }
   
    if (!formData.incoming_url.trim()) return "Incoming URL is required.";
    try {
      new URL(formData.incoming_url.trim());
    } catch (_) {
      return "Incoming URL must be a valid URL.";
    }
    // if (!formData.webhook_context.trim()) return 'Webhook Context is required.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setSnackbar({ open: true, message: validationError, severity: "error" });
      return;
    }
    setLoading(true);
    setSnackbar({ open: false, message: "", severity: "success" });

    const payload: Partial<WebhookForm> & {
      published_prompt_variant?: number | null;
      webhook_secret_key?: string;
    } = {
      name: formData.name.trim(),
      published_prompt_variant: formData.published_prompt_variant
        ? Number(formData.published_prompt_variant)
        : null,
      incoming_url: formData.incoming_url.trim(),
      webhook_context: formData.webhook_context.trim(),
      allowed_ips:
        formData.allowed_ips && formData.allowed_ips.length > 0
          ? formData.allowed_ips.map((ip) => ip.trim()).filter((ip) => ip)
          : [],
      // is_active: true, // Assuming backend handles this or you want to set it
    };

    // Only include the secret key when creating a new webhook
    if (!isEditMode) {
      payload.webhook_secret_key = formData.webhook_secret_key.trim();
    }

    const url =
      isEditMode && webhookIdToEdit
        ? `${AI_PLATFORM_API_BASE_URL}/${tenantSlug}/webhook-management/webhooks/${webhookIdToEdit}/`
        : `${AI_PLATFORM_API_BASE_URL}/${tenantSlug}/webhook-management/webhooks/`;

    const method = isEditMode && webhookIdToEdit ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error("API Error:", responseData);
        let errorMessage = isEditMode
          ? "Failed to update webhook"
          : "Failed to create webhook";
        if (responseData.non_field_errors) {
          errorMessage = Array.isArray(responseData.non_field_errors)
            ? responseData.non_field_errors.join("\n")
            : String(responseData.non_field_errors);
        } else if (responseData.detail) {
          errorMessage = responseData.detail;
        } else if (
          typeof responseData === "object" &&
          Object.keys(responseData).length > 0
        ) {
          const fieldErrors = Object.entries(responseData)
            .map(
              ([field, errors]) =>
                `${field}: ${
                  Array.isArray(errors) ? errors.join(", ") : errors
                }`
            )
            .join("\n");
          if (fieldErrors) errorMessage = fieldErrors;
        }
        throw new Error(errorMessage);
      }

      const currentSuccessMsg = isEditMode
        ? "Webhook updated successfully!"
        : "Webhook created successfully!";
      setSuccessMessage(currentSuccessMsg);
      setSuccess(true);

      setTimeout(() => {
        router.push(`/${tenantSlug}/Crm/ai-platform/webhook`);
      }, 1500);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setSnackbar({ open: true, message: errorMessage, severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePrompt = () => {
    // Save current form data to session storage
    const formDataToSave = {
      name: formData.name,
      webhook_secret_key: formData.webhook_secret_key,
      incoming_url: formData.incoming_url,
      allowed_ips: formData.allowed_ips,
      webhook_context: formData.webhook_context,
    };
    sessionStorage.setItem("webhookFormData", JSON.stringify(formDataToSave));

    // Redirect to prompt creation with fromWebhook flag
    const url = new URL(`/${tenantSlug}/Crm/ai-platform/prompt-template/create`, window.location.origin);
    url.searchParams.set("fromWebhook", "true");
    // Add current form data as encoded parameter
    url.searchParams.set(
      "webhookData",
      new URLSearchParams(formDataToSave as any).toString()
    );

    router.push(url.toString());
  };

  const handleCancel = () => {
    router.push(`/${tenantSlug}/Crm/ai-platform/webhook`);
  };

  if (isLoadingWebhook && isEditMode) {
    return (
      <AppDrawer>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "calc(100vh - 64px)",
          }}
        >
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading webhook data...</Typography>
        </Box>
      </AppDrawer>
    );
  }

  return (
    <>
      <Box sx={{ maxWidth: "lg", mx: "auto" }}>
        <Paper
          elevation={0}
          sx={{ p: { xs: 2, md: 3 }, backgroundColor: "transparent", mb: 3 }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <Typography variant="h4" component="h1" fontWeight="medium">
              {isEditMode ? "Edit Webhook" : "Create New Webhook"}
            </Typography>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                variant="outlined"
                onClick={handleCancel}
                sx={{ textTransform: "none" }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="webhook-form"
                variant="contained"
                color="primary"
                disabled={loading || promptsLoading || isLoadingWebhook}
                sx={{ textTransform: "none" }}
                startIcon={
                  loading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : null
                }
              >
                {loading
                  ? isEditMode
                    ? "Updating..."
                    : "Creating..."
                  : isEditMode
                  ? "Update Webhook"
                  : "Create Webhook"}
              </Button>
            </Box>
          </Box>
        </Paper>

        <StyledCard>
          <form id="webhook-form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Webhook Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  margin="normal"
                />
                <FormControl
                  fullWidth
                  margin="normal"
                  required
                  error={!formData.published_prompt_variant}
                >
                  <InputLabel id="published-prompt-label">
                    Published Prompt Variant
                  </InputLabel>
                  <Select
                    labelId="published-prompt-label"
                    name="published_prompt_variant"
                    value={formData.published_prompt_variant || ""}
                    onChange={handleInputChange}
                    label="Published Prompt Variant"
                    disabled={promptsLoading}
                  >
                    <MenuItem
                      value="new-prompt"
                      onClick={navigateToCreatePrompt}
                    >
                      <AddIcon sx={{ mr: 1 }} fontSize="small" /> Create New
                      Prompt
                    </MenuItem>
                    <Divider sx={{ my: 1 }} />
                    {promptsLoading ? (
                      <MenuItem disabled>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        Loading variants...
                      </MenuItem>
                    ) : promptVariantsForSelect.length === 0 ? (
                      <MenuItem disabled>
                        No prompt variants available. Click "Create New".
                      </MenuItem>
                    ) : (
                      promptVariantsForSelect.map((variant) => (
                        <MenuItem
                          key={variant.id}
                          value={variant.id.toString()}
                        >
                          {variant.displayName}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                  {formData.published_prompt_variant &&
                    formData.published_prompt_variant !== "new-prompt" && (
                      <Typography variant="caption" display="block" mt={1}>
                        <Link
                          component="button"
                          type="button"
                          variant="body2"
                          onClick={navigateToWorkbench}
                          sx={{
                            textAlign: "left",
                            textDecoration: "underline",
                          }}
                        >
                          Go to workbench
                        </Link>
                      </Typography>
                    )}
                </FormControl>
                {/* <TextField
                  fullWidth
                  label="Webhook Secret Key"
                  name="webhook_secret_key"
                  value={formData.webhook_secret_key}
                  onChange={handleInputChange}
                  required={!isEditMode}
                  margin="normal"
                  helperText={
                    isEditMode 
                      ? "Secret key cannot be modified after creation." 
                      : "Secure key for authenticating incoming requests. Save this key securely as it won't be shown again."
                  }
                  disabled={isEditMode}
                  type={isEditMode ? 'password' : 'text'}
                  InputProps={{
                    readOnly: isEditMode,
                    endAdornment: isEditMode ? (
                      <Typography variant="caption" color="textSecondary">
                        (Hidden for security)
                      </Typography>
                    ) : null,
                  }}
                /> */}
                <TextField
                  fullWidth
                  label="Webhook callback url"
                  name="incoming_url"
                  value={formData.incoming_url}
                  onChange={handleInputChange}
                  required
                  margin="normal"
                  helperText="The unique URL that will receive POST requests."
                />
                <TextField
                  fullWidth
                  label="Webhook Context"
                  name="webhook_context"
                  value={formData.webhook_context}
                  onChange={handleInputChange}
                  margin="normal"
                  helperText="Optional context (e.g., 'customer_support', 'order_updates')."
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Allowed IPs (Optional)
                  </Typography>
                  <Box display="flex" gap={1} mb={1} alignItems="center">
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="e.g., 192.168.1.1, 10.0.0.0/24"
                      value={ipInput}
                      onChange={(e) => setIpInput(e.target.value)}
                      onKeyDown={handleIpInputKeyDown}
                    />
                    <Button
                      variant="outlined"
                      onClick={handleAddIps}
                      startIcon={<AddIcon />}
                      sx={{
                        textTransform: "none",
                        whiteSpace: "nowrap",
                        height: "40px",
                      }}
                    >
                      Add IP
                    </Button>
                  </Box>
                  <Box
                    display="flex"
                    flexWrap="wrap"
                    gap={0.5}
                    mt={1}
                    sx={{ minHeight: "36px" }}
                  >
                    {(formData.allowed_ips || []).map((ip) => (
                      <Chip
                        key={ip}
                        label={ip}
                        onDelete={() => handleRemoveIp(ip)}
                        deleteIcon={<DeleteIcon />}
                        size="small"
                      />
                    ))}
                  </Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    mt={0.5}
                  >
                    Leave blank for all IPs. Separate IPs/CIDRs with commas or
                    spaces.
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </form>
        </StyledCard>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
            variant="filled"
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </>
  );
}

