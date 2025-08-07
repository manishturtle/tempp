"use client";

import { useState, useEffect } from "react";
import Header from "../../../../components/AIPlatform/Header";
import CustomSnackbar from "../../../../components/AIPlatform/snackbar/CustomSnackbar"; // Import CustomSnackbar
import {
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  CircularProgress,
  Switch,
  Tooltip,
  FormControlLabel,
  Paper,
  Chip,
  Stack,
} from "@mui/material";
import {
  ContentCopy,
  Refresh,
  Check,
  HelpOutline,
  Code,
  Lock,
} from "@mui/icons-material";
import axios from "axios";
import { useParams } from "next/navigation";
import { useTenant } from "../../../../contexts/ai-platform/TenantContext";

import { AI_PLATFORM_API_BASE_URL } from "../../../../../utils/constants";
import { getAuthHeaders } from "../../../../../app/hooks/api/auth";


interface ApiKey {
  id: number;
  app_id: number;
  access_key: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  encryption_key?: string;
}

export default function ApiKeyPage() {
  const [apiKey, setApiKey] = useState<ApiKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedEncryptionKey, setCopiedEncryptionKey] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const tenantSlug = useParams().tenant;
  const apiBaseUrl = `${AI_PLATFORM_API_BASE_URL}/${tenantSlug}`;
  // const { tenantSlug, apiBaseUrl } = useTenant();

  // State for the CustomSnackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "info" | "warning",
  });

  // --- Helper functions to trigger the snackbar ---
  const showError = (message: string) => {
    setSnackbar({ open: true, message, severity: "error" });
  };

  const showSuccess = (message: string) => {
    setSnackbar({ open: true, message, severity: "success" });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const fetchApiKey = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${apiBaseUrl}/model-configurations/api-keys/`,
        { 
          headers: { ...getAuthHeaders() } }
      );

      const apiKeyData = response.data.results?.[0] || response.data[0] || null;

      if (apiKeyData) {
        setApiKey({
          ...apiKeyData,
          access_key: response.data.full_access_key || apiKeyData.access_key,
          encryption_key:
            response.data.full_encryption_key ||
            apiKeyData.encryption_key ||
            null,
        });
        return apiKeyData;
      }

      setApiKey(null);
      return null;
    } catch (error: unknown) {
      console.error("Error fetching API key:", error);
      showError("Failed to load API key. Please try again.");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKey();
  }, []);

  const handleRegenerate = async () => {
    // Use app_id from a closure to prevent issues with stale state in the confirmation callback
    const currentAppId = apiKey?.app_id;
    if (!currentAppId) {
      showError("Invalid API key. Please refresh the page and try again.");
      return;
    }

    if (
      !window.confirm(
        "Are you sure you want to regenerate your API key? This will invalidate the current key."
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(
        `${apiBaseUrl}/model-configurations/api-keys/${currentAppId}/regenerate/`,
        {},
        { headers: { ...getAuthHeaders() } }
      );

      const updatedApiKey = {
        ...response.data,
        access_key: response.data.full_access_key || response.data.access_key,
        encryption_key: response.data.full_encryption_key || null,
      };

      setApiKey(updatedApiKey);
      showSuccess("API key regenerated successfully!");
    } catch (err) {
      console.error("Error regenerating API key:", err);
      showError("Failed to regenerate API key. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleKeyStatus = async (isActive: boolean) => {
    if (!apiKey?.app_id || apiKey.is_active === isActive) return;

    try {
      setToggling(true);
      const endpoint = isActive ? "activate" : "deactivate";

      const response = await axios.post(
        `${apiBaseUrl}/model-configurations/api-keys/${apiKey.app_id}/${endpoint}/`,
        {},
        { headers: { ...getAuthHeaders() } }
      );

      if (response.data) {
        const apiKeyData = response.data.api_key || response.data;
        if (apiKeyData) {
          setApiKey((prevApiKey) => ({ ...prevApiKey!, ...apiKeyData }));
          showSuccess(
            `API key ${isActive ? "activated" : "deactivated"} successfully!`
          );
          return;
        }
      }
      throw new Error("Invalid response from server");
    } catch (error: unknown) {
      console.error(
        `Error ${isActive ? "activating" : "deactivating"} API key:`,
        error
      );
      let errorMessage = `Failed to ${
        isActive ? "activate" : "deactivate"
      } API key.`;
      if (axios.isAxiosError(error) && error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      showError(errorMessage);
      await fetchApiKey().catch((fetchErr) =>
        console.error("Error refreshing API key:", fetchErr)
      );
    } finally {
      setToggling(false);
    }
  };

  const copyToClipboard = async (
    text: string,
    keyType: "access" | "encryption" = "access"
  ) => {
    try {
      await navigator.clipboard.writeText(text);
      if (keyType === "access") {
        setCopiedKey("access");
        setTimeout(() => setCopiedKey(null), 2000);
      } else {
        setCopiedEncryptionKey(true);
        setTimeout(() => setCopiedEncryptionKey(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (loading && !apiKey) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            API Key Management
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Manage your API keys for programmatic access to the platform.
          </Typography>
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Stack spacing={2.5}>
              {/* ===== Row 1: Header ===== */}
              <Box>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Typography variant="h6">API Key</Typography>
                  {apiKey && (
                    <Chip
                      label={apiKey.is_active ? "Active" : "Inactive"}
                      color={apiKey.is_active ? "success" : "default"}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Stack>
              </Box>

              {/* ===== Row 2: Key TextFields (Always Visible) ===== */}
              {apiKey ? (
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={2}
                  width="100%"
                >
                  {/* Access Key */}
                  <Box sx={{ flex: 1, width: "100%" }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      mb={0.5}
                    >
                      Access Key
                    </Typography>
                    <TextField
                      fullWidth
                      variant="outlined"
                      value={apiKey.access_key || ""}
                      InputProps={{
                        readOnly: true,
                        endAdornment: (
                          <InputAdornment position="end">
                            <Tooltip
                              title={
                                copiedKey === "access"
                                  ? "Copied!"
                                  : "Copy to clipboard"
                              }
                              placement="top"
                            >
                              <IconButton
                                onClick={() =>
                                  copyToClipboard(apiKey.access_key, "access")
                                }
                                edge="end"
                                size="small"
                              >
                                {copiedKey === "access" ? (
                                  <Check fontSize="small" />
                                ) : (
                                  <ContentCopy fontSize="small" />
                                )}
                              </IconButton>
                            </Tooltip>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Box>

                  {/* Encryption Key */}
                  <Box sx={{ flex: 1, width: "100%" }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      mb={0.5}
                    >
                      Encryption Key
                    </Typography>
                    <TextField
                      fullWidth
                      variant="outlined"
                      value={apiKey.encryption_key || ""}
                      InputProps={{
                        readOnly: true,
                        endAdornment: (
                          <InputAdornment position="end">
                            <Tooltip
                              title={
                                copiedEncryptionKey
                                  ? "Copied!"
                                  : "Copy to clipboard"
                              }
                              placement="top"
                            >
                              <IconButton
                                onClick={() =>
                                  apiKey.encryption_key &&
                                  copyToClipboard(
                                    apiKey.encryption_key,
                                    "encryption"
                                  )
                                }
                                edge="end"
                                size="small"
                              >
                                {copiedEncryptionKey ? (
                                  <Check fontSize="small" />
                                ) : (
                                  <ContentCopy fontSize="small" />
                                )}
                              </IconButton>
                            </Tooltip>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Box>
                </Stack>
              ) : (
                <Typography color="text.secondary">
                  No API key found. Generate a new one to get started.
                </Typography>
              )}

              {/* ===== Row 3: Controls and Timestamp ===== */}
              {apiKey ? (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    pt: 1,
                  }}
                >
                  {/* Timestamp - Left aligned */}
                  <Typography variant="caption" color="text.secondary">
                    {`Updated on ${new Date(
                      apiKey.updated_at
                    ).toLocaleDateString()}`}
                  </Typography>

                  {/* Controls - Right aligned */}
                  <Stack direction="row" alignItems="center" spacing={2}>
                    {/* Toggle Switch */}
                    <FormControlLabel
                      control={
                        <Box sx={{ position: "relative" }}>
                          <Switch
                            checked={apiKey.is_active}
                            onChange={(e) => toggleKeyStatus(e.target.checked)}
                            disabled={loading || toggling}
                          />
                          {toggling && (
                            <CircularProgress
                              size={24}
                              sx={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                marginTop: "-12px",
                                marginLeft: "-12px",
                              }}
                            />
                          )}
                        </Box>
                      }
                      label={`Key is ${
                        apiKey.is_active ? "Active" : "Inactive"
                      }`}
                      sx={{ margin: 0 }}
                    />

                    {/* Regenerate Button */}
                    <Button
                      variant="outlined"
                      color="warning"
                      startIcon={<Refresh />}
                      onClick={handleRegenerate}
                      disabled={loading}
                      size="small"
                    >
                      Regenerate
                    </Button>
                  </Stack>
                </Box>
              ) : (
                // Generate Button if no key exists
                <Box sx={{ textAlign: "right", pt: 1 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Refresh />}
                    onClick={handleRegenerate}
                    disabled={loading}
                  >
                    Generate API Key
                  </Button>
                </Box>
              )}
            </Stack>
          </Paper>
        </Box>

      {/* Help Dialog */}
      <Dialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Code fontSize="large" color="primary" />
            <span>Webhook Integration Guide</span>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box mb={3}>
            <Typography variant="h6" gutterBottom>
              Webhook Endpoint
            </Typography>
            <Typography variant="body2" paragraph>
              Send encrypted payloads to the following endpoint:
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                bgcolor: "background.default",
                overflowX: "auto",
                mb: 2,
              }}
            >
              <pre style={{ margin: 0 }}>
                <code>
                  {`https://aibe.turtleit.in/api/{tenant_slug}/webhook-management/create-and-receive-webhook/`}
                </code>
              </pre>
            </Paper>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              CURL Example
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                bgcolor: "background.default",
                overflowX: "auto",
                mb: 2,
              }}
            >
              <pre style={{ margin: 0 }}>
                <code>
                  {`curl --location 'https://aibe.turtleit.in/api/{tenant_slug}/webhook-management/create-and-receive-webhook/' \\
--header 'Content-Type: application/json' \\
--header 'Access-Key: ${apiKey?.access_key || "YOUR_ACCESS_KEY"}' \\
--data '{
  "encrypted_payload": "ENCRYPTED_PAYLOAD_HERE"
}'`}
                </code>
              </pre>
            </Paper>

            <Typography variant="h6" gutterBottom>
              Example Payloads (before encryption)
            </Typography>

            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
              Example 1: Basic Webhook Creation
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                bgcolor: "background.default",
                overflowX: "auto",
                mb: 2,
              }}
            >
              <pre style={{ margin: 0 }}>
                <code>
                  {`{
  "name": "Dell Laptop Enhancement",
  "incoming_url": "https://your-domain.com/api/webhook-endpoint/",
  "webhook_context": "Enhancing product details via AI",
  "allowed_ips": [],
  "prompt_config": {
    "type": "create_auto"  // Options: "create_new", "use_existing", "create_auto"
  },
  "input_data": {
    "enhancement_type": "all",
    "language": "en",
    "product_details": {
      "name": "Dell",
      "category": "Laptops",
      "division": "Computers & Peripherals",
      "subcategory": "Gaming Laptops"
    },
    "target_audience": "general"
  }
}`}
                </code>
              </pre>
            </Paper>

            <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
              Example 2: Stock Analysis with Existing Prompt
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                bgcolor: "background.default",
                overflowX: "auto",
                mb: 2,
              }}
            >
              <pre style={{ margin: 0 }}>
                <code>
                  {`{
  "name": "Stock Analysis Webhook",
  "incoming_url": "https://your-domain.com/api/webhook-endpoint/",
  "webhook_context": "Stock market analysis for multiple stocks",
  "allowed_ips": [],
  "prompt_config": { 
    "type": "use_existing", 
    "prompt_variant_id": 1, 
    "input_type": "text", 
    "output_type": "text" 
  },
  "input_data": {
    "share": ["Tata Steel", "Reliance Industries"],
    "analysis_type": "comprehensive",
    "include_news": true,
    "include_technical": true,
    "time_period": "1w"
  }
}`}
                </code>
              </pre>
            </Paper>

            <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
              Example 3: Create New Stock Analysis Prompt
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                bgcolor: "background.default",
                overflowX: "auto",
                mb: 2,
              }}
            >
              <pre style={{ margin: 0 }}>
                <code>
                  {`{
  "name": "Stock Market Analysis",
  "incoming_url": "https://your-domain.com/api/webhook-endpoint/",
  "webhook_context": "Advanced stock analysis with custom prompt",
  "allowed_ips": [],
  "prompt_config": {
    "type": "create_new",
    "data": {
      "prompt_name": "StockFinder",
      "description": "Advanced stock analysis with technical indicators",
      "system_prompt": "You're an expert stock analyst with extensive experience in chart pattern recognition for Indian Stocks, indicator analysis, and market forecasting.",
      "user_prompt": "Your task is to perform a detailed analysis of stock named {{stock_name}}, identify key patterns, trends and potential trading opportunities. Please structure your analysis as follows: 1. Trend Analysis (Primary and secondary trends, support/resistance levels with specific price points) 2. Time Projections (When significant moves might occur based on pattern completion) 3. Historical Stock ROI on the following time frames: 1 year, 3 years, 5 years.",
      "input_type": "text",
      "output_type": "text",
      "model_api_identifier": "Gemini/gemini-1.5-flash-latest",
      "model_parameters": {
        "temperature": 0.7,
        "max_tokens": 3096,
        "top_p": 0.9
      },
      "input_data": {
        "stock_name": "Example Stock"
      }
    }
  },
  "input_data": {
    "stock_name": "Tata Motors"
  }
}`}
                </code>
              </pre>
            </Paper>

            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
              How to Encrypt Your Payload:
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                bgcolor: "background.default",
                overflowX: "auto",
                mb: 2,
              }}
            >
              <pre style={{ margin: 0 }}>
                <code>
                  {`const encryptPayload = async (payload: object): Promise<string> => {
  try {
    // Create a secret from the encryption key
    const secret = new Secret(YOUR_ENCRYPTION_KEY);
    
    // Create a token with the secret
    const iv = Array.from(window.crypto.getRandomValues(new Uint8Array(16)));
    const token = new Token({
      secret,
      time: Math.floor(Date.now() / 1000), // Current time in seconds
      iv
    });
    console.log("Encrypted payload:", payload);

    // Encode the payload
    return token.encode(JSON.stringify(payload));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt payload');
  }
};`}
                </code>
              </pre>
            </Paper>

            <Typography
              variant="body2"
              sx={{ mt: 2, mb: 1, color: "text.secondary" }}
            >
              Note: The encrypted payload should be sent in the{" "}
              <code>encrypted_payload</code> field of your request.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpOpen(false)}>Close</Button>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              onClick={() => {
                if (apiKey) {
                  const code = `curl --location 'https://aibe.turtleit.in/api/{tenant_slug}/webhook-management/create-and-receive-webhook/' \\
--header 'Content-Type: application/json' \\
--header 'Access-Key: ${apiKey.access_key}' \\
--data '{
  "encrypted_payload": "ENCRYPTED_PAYLOAD_HERE"
}'`;
                  copyToClipboard(code);
                  showSuccess("CURL command copied to clipboard!");
                }
              }}
              startIcon={<ContentCopy />}
              size="small"
            >
              Copy CURL
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                const examplePayload = JSON.stringify(
                  {
                    name: "Dell Laptop Enhancement",
                    incoming_url:
                      "https://your-domain.com/api/webhook-endpoint/",
                    webhook_context: "Enhancing product details via AI",
                    allowed_ips: [],
                    prompt_config: { type: "create_auto" },
                    input_data: {
                      enhancement_type: "all",
                      language: "en",
                      product_details: {
                        name: "Dell",
                        category: "Laptops",
                        division: "Computers & Peripherals",
                        subcategory: "Gaming Laptops",
                      },
                      target_audience: "general",
                    },
                  },
                  null,
                  2
                );
                copyToClipboard(examplePayload);
                showSuccess("Example payload copied to clipboard!");
              }}
              startIcon={<ContentCopy />}
              size="small"
            >
              Copy Example Payload
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* Snackbar for showing all messages */}
      <CustomSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={handleCloseSnackbar}
      />

      {/* Help Button */}
      <Box position="fixed" bottom={24} right={24}>
        <Tooltip title="API Integration Guide">
          <Button
            variant="contained"
            color="primary"
            onClick={() => setHelpOpen(true)}
            startIcon={<HelpOutline />}
            sx={{
              borderRadius: "50%",
              minWidth: "56px",
              height: "56px",
              boxShadow: 3,
              "& .MuiButton-startIcon": {
                margin: 0,
              },
            }}
          >
            <HelpOutline />
          </Button>
        </Tooltip>
      </Box>
    </>
  );
}
