import React, { useState, useEffect } from "react";
import axios from "axios";
import { SelectChangeEvent } from "@mui/material/Select";

import {ENGAGEMENT_API_BASE_URL} from "../../../utils/constants";

// Define the API base URL with the correct port
const API_BASE_URL = ENGAGEMENT_API_BASE_URL;

const {getAuthHeaders} = "@/app/hooks/api/auth"

// Create an axios instance with authentication token from localStorage
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to include authentication token
axiosInstance.interceptors.request.use((config) => {
  // Get token from localStorage
  const token = getAuthHeaders().token;
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
});

// Utility function to get tenant slug from URL
const getTenantSlug = () => {
  const pathSegments = window.location.pathname.split("/");
  // The tenant slug is typically the first segment after the initial slash
  return pathSegments[1] || "man"; // Default to 'man' if no tenant slug found
};

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Grid,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Chip,
  IconButton,
  Card,
  CardContent,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormHelperText,
  OutlinedInput,
  Snackbar,
  Backdrop,
  Autocomplete,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import DownloadIcon from "@mui/icons-material/Download";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CelebrationIcon from "@mui/icons-material/Celebration";
import SummarizeIcon from "@mui/icons-material/Summarize";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PersonOffIcon from "@mui/icons-material/PersonOff";
import CloseIcon from "@mui/icons-material/Close";
import HelpIcon from "@mui/icons-material/Help";
import SettingsIcon from "@mui/icons-material/Settings";

import { styled } from "@mui/material/styles";

// Define list type options
const LIST_TYPE_OPTIONS = [
  { value: "STATIC", label: "Static List" },
  { value: "DYNAMIC_SEGMENT", label: "Dynamic Segment" },
];

// Define source options
const SOURCE_OPTIONS = [
  { value: "MANUAL", label: "Manual Entry" },
  { value: "IMPORT", label: "File Import" },
  { value: "API", label: "API" },
];

// Define types for defaults state
interface ContactsDefaults {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  source: string;
  customerType: string;
  city: string;
  country: string;
  isEmailSubscribed: boolean;
  isSmsOptIn: boolean;
  isWhatsappOptIn: boolean;
  isEmailVerified: boolean;
  isMobileVerified: boolean;
  allowPortalAccess: boolean;
  password?: string;
  accountOwnerId?: string;
}

interface ListsDefaults {
  listType: string;
  source: string;
  name: string;
  description: string;
  // Adding this field to match how it's used in the code
  customerType?: string;
}

type DefaultsType = ContactsDefaults | ListsDefaults;

// Type guard functions to check which type of defaults we're working with
function isContactsDefaults(
  defaults: DefaultsType
): defaults is ContactsDefaults {
  return "customerType" in defaults;
}

function isListsDefaults(defaults: DefaultsType): defaults is ListsDefaults {
  return "listType" in defaults;
}

// Define Props Interface
interface CustomerUploadDialogProps {
  open: boolean;
  onClose: (refresh?: boolean) => void;
  title?: string;
  templateUrl?: string;
  validateEndpoint?: string;
  processEndpoint?: string;
  onFileSelected?: (file: File) => void;
  customUploadHandler?: (file: File, formData: FormData) => Promise<any>;
  type?: "contacts" | "lists";
}

// Styled components for file upload
const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

const UploadBox = styled(Box)(({ theme }) => ({
  border: `2px dashed ${theme.palette.primary.main}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(3),
  textAlign: "center",
  backgroundColor: theme.palette.background.default,
  cursor: "pointer",
  transition: "all 0.3s ease",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

// Component
const CustomerUploadDialog: React.FC<CustomerUploadDialogProps> = ({
  open,
  onClose,
  title = "Upload Customers",
  templateUrl = "/customers/download-template/",
  validateEndpoint = "/customers/validate-upload/",
  processEndpoint = "/customers/bulk-upload/process/",
  onFileSelected,
  customUploadHandler,
  type = "contacts",
}) => {
  // State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    "success" | "info" | "warning" | "error"
  >("info");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [defaultsExpanded, setDefaultsExpanded] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [showButtons, setShowButtons] = useState(false);

  // Default values state based on type
  const [defaults, setDefaults] = useState<DefaultsType>(
    type === "contacts"
      ? {
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          source: "IMPORT",
          customerType: "Lead",
          city: "",
          country: "",
          isEmailSubscribed: false,
          isSmsOptIn: false,
          isWhatsappOptIn: false,
          isEmailVerified: false,
          isMobileVerified: false,
          allowPortalAccess: false,
          password: "",
        }
      : {
          listType: "STATIC",
          source: "IMPORT",
          name: "",
          description: "",
        }
  );

  // Handle default value changes
  const handleDefaultChange =
    (field: string) =>
    (
      event:
        | React.ChangeEvent<
            HTMLInputElement | { name?: string; value: unknown }
          >
        | SelectChangeEvent<any>
    ) => {
      const value =
        "type" in event.target && event.target.type === "checkbox"
          ? (event.target as HTMLInputElement).checked
          : (event.target as { value: unknown }).value;

      setDefaults({
        ...defaults,
        [field]: value,
      });
    };

  // Show snackbar message
  const showMessage = (
    message: string,
    severity: "success" | "info" | "warning" | "error" = "info"
  ) => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  // Close snackbar
  const handleSnackbarClose = (
    event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbarOpen(false);
  };

  // Reset State on Close
  useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setFileName("");
      setIsLoading(false);
      setIsValidating(false);
      setIsProcessing(false);
      setError(null);
      setValidationResult(null);
      setUploadProgress(0);
      setProcessingComplete(false);
      setShowSummary(false);
    }
  }, [open]);

  // Handlers
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setValidationResult(null);

    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    const fileType = file.type;
    const validTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (
      !validTypes.includes(fileType) &&
      !file.name.endsWith(".csv") &&
      !file.name.endsWith(".xlsx") &&
      !file.name.endsWith(".xls")
    ) {
      setError(
        "Invalid file format. Please upload a CSV or Excel file (.csv, .xlsx, .xls)"
      );
      showMessage(
        "Invalid file format. Please upload a CSV or Excel file.",
        "error"
      );
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("File size exceeds the maximum limit of 5MB");
      showMessage("File size exceeds the maximum limit of 5MB.", "error");
      return;
    }

    setSelectedFile(file);
    setFileName(file.name);
    showMessage(`File "${file.name}" selected successfully.`, "success");

    // Call the onFileSelected callback if provided
    if (onFileSelected) {
      onFileSelected(file);
    }

    event.target.value = ""; // Reset input
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    setError(null);
    setValidationResult(null);

    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];

      if (
        !file.name.toLowerCase().endsWith(".csv") &&
        !file.name.toLowerCase().endsWith(".xlsx") &&
        !file.name.toLowerCase().endsWith(".xls")
      ) {
        setError("Invalid file type. Please upload a CSV or Excel file.");
        return;
      }

      setSelectedFile(file);
      setFileName(file.name);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileName("");
    setValidationResult(null);
    setError(null);
  };

  const handleDownloadTemplate = async () => {
    try {
      setIsLoading(true);
      showMessage("Downloading template...", "info");

      // Get tenant slug from URL
      const tenant = getTenantSlug();

      // Use the appropriate endpoint based on the type
      let downloadUrl;
      if (type === "contacts") {
        // Use the contacts endpoint from the DRF router (note the underscore, not hyphen)
        downloadUrl = `/api/${tenant}/marketing/contacts/download_template/`;
      } else if (templateUrl) {
        // Use the provided template URL if available
        downloadUrl = templateUrl;
      } else {
        // Fallback to a default URL
        downloadUrl = `/api/${tenant}/marketing/contacts/download_template/`;
      }

      // Use the axiosInstance to handle the download with authentication
      const response = await axiosInstance.get(downloadUrl, {
        responseType: "blob",
      });

      // Create a URL for the blob
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);

      // Create a temporary link element and trigger download
      const a = document.createElement("a");
      a.href = url;
      a.download =
        type === "contacts"
          ? "contacts_upload_template.csv"
          : "customer_upload_template.csv";
      document.body.appendChild(a);
      a.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showMessage("Template downloaded successfully!", "success");
      setIsLoading(false);
    } catch (error) {
      console.error("Error downloading template:", error);
      setError(
        `Error downloading template: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      showMessage("Failed to download template. Please try again.", "error");
      setIsLoading(false);
    }
  };

  const handleValidateUpload = async () => {
    if (!selectedFile) return;

    setIsValidating(true);
    setError(null);
    setUploadProgress(0);
    showMessage("Validating file...", "info");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      console.log(defaults);

      // Add common default values to the form data
      if (defaults.source) formData.append("default_source", defaults.source);

      // Add contacts-specific defaults
      if (isContactsDefaults(defaults)) {
        // Basic contact information
        if (defaults.firstName)
          formData.append("default_first_name", defaults.firstName);
        if (defaults.lastName)
          formData.append("default_last_name", defaults.lastName);
        if (defaults.email) formData.append("default_email", defaults.email);
        if (defaults.phone) formData.append("default_phone", defaults.phone);
        if (defaults.customerType)
          formData.append("default_customer_type", defaults.customerType);

        // Communication preferences
        if (defaults.isEmailSubscribed)
          formData.append(
            "default_email_subscribed",
            defaults.isEmailSubscribed.toString()
          );
        if (defaults.isSmsOptIn)
          formData.append("default_sms_opt_in", defaults.isSmsOptIn.toString());
        if (defaults.isWhatsappOptIn)
          formData.append(
            "default_whatsapp_opt_in",
            defaults.isWhatsappOptIn.toString()
          );

        // Verification and access
        if (defaults.isEmailVerified)
          formData.append(
            "default_email_verified",
            defaults.isEmailVerified.toString()
          );
        if (defaults.isMobileVerified)
          formData.append(
            "default_mobile_verified",
            defaults.isMobileVerified.toString()
          );
        if (defaults.allowPortalAccess)
          formData.append(
            "default_allow_portal_access",
            defaults.allowPortalAccess.toString()
          );
        if (defaults.password)
          formData.append("default_password", defaults.password);
        if (defaults.accountOwnerId)
          formData.append("default_account_owner_id", defaults.accountOwnerId);
      }

      // Add lists-specific defaults
      if (isListsDefaults(defaults)) {
        if (defaults.name) formData.append("default_name", defaults.name);
        if (defaults.description)
          formData.append("default_description", defaults.description);
        if (defaults.listType)
          formData.append("default_list_type", defaults.listType);
      }

      // Create a mock progress simulation
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const newProgress = prev + 5 * Math.random();
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 300);

      // Get tenant slug from URL
      const tenant = getTenantSlug();

      // Use the appropriate endpoint based on the type
      // For lists, we'll use the contacts validation endpoint since the lists endpoint might not exist
      const validationUrl =
        type === "contacts" || type === "lists"
          ? `/api/${tenant}/marketing/contacts/validate_upload/`
          : validateEndpoint ||
            `/api/${tenant}/marketing/customers/validate_upload/`;

      console.log("Using validation endpoint:", validationUrl);

      const response = await axiosInstance.post(validationUrl, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      setValidationResult(response.data);

      if (response.data.error_count === 0) {
        showMessage(
          `Validation successful! All ${response.data.valid_count} records are valid.`,
          "success"
        );
        // Always show buttons if there are valid records
        setShowButtons(true);
      } else {
        showMessage(
          `Validation completed with ${response.data.error_count} errors found in ${response.data.total_count} records.`,
          "warning"
        );
        // Show buttons if there are valid records, even if there are also errors
        if (response.data.valid_count > 0) {
          setShowButtons(true);
        }
      }
    } catch (error: any) {
      console.error("Validation error:", error);
      const errorMessage =
        error.message || "Failed to validate file. Please try again.";
      setError(errorMessage);
      showMessage(errorMessage, "error");
    } finally {
      setIsValidating(false);
      // Reset progress after a short delay to show completion
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleProcessUpload = async (skipErrorRecords: boolean) => {
    if (!validationResult || !validationResult.valid_data) {
      showMessage(
        "No validated data available. Please validate a file first.",
        "error"
      );
      return;
    }

    setIsProcessing(true);
    setError(null);
    setUploadProgress(0);
    showMessage(
      skipErrorRecords
        ? "Processing upload (skipping error records)..."
        : "Processing upload (all records)...",
      "info"
    );

    console.log(
      "Processing validated data:",
      validationResult.valid_data.length,
      "records"
    );

    try {
      // Create a mock progress simulation
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const newProgress = prev + 5 * Math.random();
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 300);

      let response;

      if (customUploadHandler && selectedFile) {
        // Use the custom upload handler if provided
        const formData = new FormData();
        formData.append("file", selectedFile);
        // Add any other needed form data
        if (defaults.customerType)
          formData.append("list_type", defaults.customerType);
        if (defaults.source) formData.append("source", defaults.source);

        response = await customUploadHandler(selectedFile, formData);
      } else {
        // Get tenant slug from URL
        const tenant = getTenantSlug();

        // Use the appropriate endpoint based on the type
        const processingUrl =
          type === "contacts"
            ? `/api/${tenant}/marketing/contacts/bulk_create/`
            : type === "lists"
            ? `/api/${tenant}/marketing/lists/create-with-file/`
            : processEndpoint ||
              `/api/${tenant}/marketing/customers/bulk-upload/process/`;

        console.log("Using processing endpoint:", processingUrl);

        // Prepare the default values based on the type
        let defaultValues = {};

        if (isContactsDefaults(defaults)) {
          defaultValues = {
            first_name: defaults.firstName || null,
            last_name: defaults.lastName || null,
            email_address: defaults.email || null,
            phone_number: defaults.phone || null,
            source: defaults.source || null,
            is_email_subscribed: defaults.isEmailSubscribed || null,
            is_sms_opt_in: defaults.isSmsOptIn || null,
            is_whatsapp_opt_in: defaults.isWhatsappOptIn || null,
            email_verified: defaults.isEmailVerified || null,
            mobile_verified: defaults.isMobileVerified || null,
            allow_portal_access: defaults.allowPortalAccess || null,
            password: defaults.password || null,
            account_owner_id: defaults.accountOwnerId || null,
          };
        } else {
          defaultValues = {
            customer_type: defaults.customerType || null,
            source: defaults.source || null,
            name: defaults.name || null,
            description: defaults.description || null,
            list_type: defaults.listType || null,
          };
        }

        // Use the default processing endpoint
        console.log("Calling process_upload API:", processingUrl);
        console.log(
          "Sending validated data:",
          validationResult.valid_data.length,
          "records"
        );
        console.log("Default values:", defaultValues);

        // For bulk_create, we need to send the data differently than for process_upload
        let requestData;

        if (type === "lists" && processingUrl.includes("create-with-file")) {
          // For lists create-with-file endpoint, we need to send a FormData object
          const formData = new FormData();

          // Add the file - only if it's not null
          if (selectedFile) {
            formData.append("file", selectedFile);
            console.log(
              "File appended to FormData:",
              selectedFile.name,
              selectedFile.type,
              selectedFile.size
            );
          } else {
            console.error("No file selected for upload");
            throw new Error("No file selected for upload");
          }

          // Add list properties from defaults
          if (isListsDefaults(defaults)) {
            // Make sure we have required fields
            if (!defaults.name) {
              console.error("List name is required");
              throw new Error("List name is required");
            }

            formData.append("name", defaults.name);
            console.log("List name appended to FormData:", defaults.name);

            formData.append("description", defaults.description || "");
            console.log(
              "List description appended to FormData:",
              defaults.description || ""
            );

            formData.append("list_type", defaults.listType || "STATIC");
            console.log(
              "List type appended to FormData:",
              defaults.listType || "STATIC"
            );
          }

          // Log all form data entries for debugging
          console.log("FormData entries:");
          for (const pair of formData.entries()) {
            console.log(pair[0] + ":", pair[1]);
          }

          // Send the FormData directly
          response = await axiosInstance.post(processingUrl, formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });
        } else if (
          type === "contacts" &&
          processingUrl.includes("bulk_create")
        ) {
          // For bulk_create endpoint, we need to send the raw data without wrapping it
          // This preserves all fields from the uploaded file
          requestData = validationResult.valid_data.map(
            (record: Record<string, any>) => {
              // Map the fields to match what the backend expects
              return {
                // Include all original fields from the record
                ...record,
                // Map specific fields to match backend expectations
                email_address: record.email || record.email_address,
                phone_number: record.phone || record.phone_number,
                first_name: record.first_name,
                last_name: record.last_name,
                // Apply defaults for missing values
                source:
                  record.source || (defaultValues as any).source || "IMPORT",
                is_email_subscribed:
                  record.is_email_subscribed !== undefined
                    ? record.is_email_subscribed
                    : (defaultValues as any).is_email_subscribed,
                is_sms_opt_in:
                  record.is_sms_opt_in !== undefined
                    ? record.is_sms_opt_in
                    : (defaultValues as any).is_sms_opt_in,
                is_whatsapp_opt_in:
                  record.is_whatsapp_opt_in !== undefined
                    ? record.is_whatsapp_opt_in
                    : (defaultValues as any).is_whatsapp_opt_in,
              };
            }
          );
        } else {
          // For process_upload endpoint, use the original structure
          requestData = {
            validated_data: validationResult.valid_data || [],
            skip_errors: skipErrorRecords,
            defaults: defaultValues,
          };
        }

        if (type !== "lists" || !processingUrl.includes("create-with-file")) {
          response = await axiosInstance.post(processingUrl, requestData);
        }
      }

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Set success message
      setUploadResult(response.data);
      setProcessingComplete(true);
      setShowSummary(true);

      // Get the success count, providing a default if it doesn't exist
      const successCount =
        response.data.success_count ||
        response.data.created_count ||
        response.data.valid_count ||
        0;

      // Show a more specific message for contacts
      if (type === "contacts") {
        showMessage(
          `Contacts saved correctly! ${successCount} contacts have been successfully created/updated.`,
          "success"
        );
      } else if (type === "lists") {
        // For lists, show a more prominent success message
        const listName = isListsDefaults(defaults) ? defaults.name : "New list";

        // Show success message in snackbar
        showMessage(
          `List '${listName}' saved successfully with ${successCount} contacts!`,
          "success"
        );

        // Also show success message in the dialog
        setError(null); // Clear any previous errors
        setUploadResult({
          ...response.data,
          message: `List '${listName}' saved successfully with ${successCount} contacts!`,
        });

        // For lists, automatically close the dialog after a short delay
        setTimeout(() => {
          onClose(true);
        }, 2500); // Slightly longer delay to ensure message is seen
      } else {
        showMessage(
          `Upload completed successfully! ${successCount} records created.`,
          "success"
        );
      }
      setShowButtons(false);
    } catch (error: any) {
      console.error("Processing error:", error);

      // Extract more detailed error information if available
      let errorMessage = "Failed to process upload. Please try again.";

      if (error.response) {
        // The request was made and the server responded with an error status
        console.error("Error response:", error.response.data);
        errorMessage =
          error.response.data.error ||
          error.response.data.message ||
          error.message ||
          errorMessage;
      } else if (error.request) {
        // The request was made but no response was received
        console.error("Error request:", error.request);
        errorMessage =
          "No response received from the server. Please check your connection.";
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error("Error message:", error.message);
        errorMessage = error.message || errorMessage;
      }

      setError(errorMessage);
      showMessage(errorMessage, "error");
    } finally {
      setIsProcessing(false);
      // Reset progress after a short delay to show completion
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleCloseSummary = () => {
    // Close the dialog and refresh the list
    onClose(true);
  };

  return (
    <Dialog
      open={open}
      onClose={() => onClose()}
      maxWidth="md"
      fullWidth
      aria-labelledby="customer-upload-dialog-title"
    >
      <DialogTitle id="customer-upload-dialog-title">{title}</DialogTitle>

      <DialogContent>
        {/* File Upload Section */}
        <Box sx={{ mb: 3, mt: 1 }}>
          <Typography variant="subtitle1" gutterBottom>
            Upload CSV or Excel File
          </Typography>

          {/* Template Download Card */}
          <Card variant="outlined" sx={{ mb: 2, bgcolor: "info.light" }}>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <HelpIcon sx={{ mr: 1, color: "info.dark" }} />
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                      Not sure how to format your data?
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Download our template with field requirements and example
                      data
                    </Typography>
                  </Box>
                </Box>
                <Button
                  variant="contained"
                  color="info"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownloadTemplate}
                  disabled={isLoading}
                  sx={{ whiteSpace: "nowrap" }}
                >
                  {isLoading ? "Downloading..." : "Download Template"}
                </Button>
              </Box>
            </CardContent>
          </Card>

          {!selectedFile ? (
            <UploadBox
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() =>
                document.getElementById("file-upload-input")?.click()
              }
              sx={{ mb: 2 }}
            >
              <CloudUploadIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                Drag & Drop or Click to Select File
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Supported formats: CSV, Excel (.xlsx, .xls)
              </Typography>
              <VisuallyHiddenInput
                id="file-upload-input"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                disabled={isValidating || isProcessing}
              />
            </UploadBox>
          ) : (
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <CloudUploadIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                      {fileName}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={handleRemoveFile}
                    disabled={isValidating || isProcessing}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
                {(isValidating || isProcessing) && (
                  <LinearProgress sx={{ mt: 1 }} />
                )}
              </CardContent>
            </Card>
          )}

          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
            {selectedFile && !validationResult && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleValidateUpload}
                disabled={isValidating || isProcessing}
                sx={{ ml: "auto" }}
              >
                Validate File
              </Button>
            )}
          </Box>
        </Box>

        {/* Default Values Section */}
        <Accordion
          expanded={defaultsExpanded}
          onChange={() => setDefaultsExpanded(!defaultsExpanded)}
          sx={{ mb: 2 }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="default-values-content"
            id="default-values-header"
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <SettingsIcon sx={{ mr: 1, color: "primary.main" }} />
              <Typography>Default Values for Empty Fields</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Set default values to be applied to any rows where the
              corresponding column is empty in the uploaded file.
            </Typography>

            <Grid container spacing={2}>
              {type === "lists" ? (
                // List-specific fields
                <>
                  {/* List Name */}
                  <Grid item xs={12} sm={6} md={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="List Name"
                      value={(defaults as ListsDefaults).name}
                      onChange={handleDefaultChange("name")}
                      required
                    />
                  </Grid>

                  {/* List Description */}
                  <Grid item xs={12} sm={6} md={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Description"
                      value={(defaults as ListsDefaults).description}
                      onChange={handleDefaultChange("description")}
                      multiline
                      rows={1}
                    />
                  </Grid>

                  {/* List Type */}
                  <Grid item xs={12} sm={6} md={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="default-list-type-label">
                        List Type
                      </InputLabel>
                      <Select
                        labelId="default-list-type-label"
                        id="default-list-type"
                        value={(defaults as ListsDefaults).listType}
                        label="List Type"
                        onChange={handleDefaultChange("listType")}
                      >
                        {LIST_TYPE_OPTIONS.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Source */}
                  <Grid item xs={12} sm={6} md={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="default-source-label">Source</InputLabel>
                      <Select
                        labelId="default-source-label"
                        id="default-source"
                        value={(defaults as ListsDefaults).source}
                        label="Source"
                        onChange={handleDefaultChange("source")}
                      >
                        {SOURCE_OPTIONS.map((source) => (
                          <MenuItem key={source.value} value={source.value}>
                            {source.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </>
              ) : (
                // Contact-specific fields
                <>
                  {/* Basic Contact Information */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ mb: 1, mt: 1 }}>
                      Basic Contact Information
                    </Typography>
                  </Grid>

                  {/* Communication Preferences Section */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ mb: 1, mt: 2 }}>
                      Communication Preferences
                    </Typography>
                  </Grid>

                  {/* Email Subscribed */}
                  <Grid item xs={12} sm={4} md={4}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={
                            (defaults as ContactsDefaults).isEmailSubscribed
                          }
                          onChange={(e) =>
                            handleDefaultChange("isEmailSubscribed")(
                              e as unknown as React.ChangeEvent<HTMLInputElement>
                            )
                          }
                          name="isEmailSubscribed"
                        />
                      }
                      label="Email Subscribed"
                    />
                  </Grid>

                  {/* SMS Opt-In */}
                  <Grid item xs={12} sm={4} md={4}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={(defaults as ContactsDefaults).isSmsOptIn}
                          onChange={(e) =>
                            handleDefaultChange("isSmsOptIn")(
                              e as unknown as React.ChangeEvent<HTMLInputElement>
                            )
                          }
                          name="isSmsOptIn"
                        />
                      }
                      label="SMS Opt-In"
                    />
                  </Grid>

                  {/* WhatsApp Opt-In */}
                  <Grid item xs={12} sm={4} md={4}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={
                            (defaults as ContactsDefaults).isWhatsappOptIn
                          }
                          onChange={(e) =>
                            handleDefaultChange("isWhatsappOptIn")(
                              e as unknown as React.ChangeEvent<HTMLInputElement>
                            )
                          }
                          name="isWhatsappOptIn"
                        />
                      }
                      label="WhatsApp Opt-In"
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Validation Results */}
        {validationResult && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Validation Results
            </Typography>

            {/* Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={4}>
                <Card sx={{ bgcolor: "success.light" }}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Typography
                      variant="h5"
                      align="center"
                      sx={{ fontWeight: "bold" }}
                    >
                      {validationResult.valid_count}
                    </Typography>
                    <Typography variant="body2" align="center">
                      Valid Records
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={4}>
                <Card sx={{ bgcolor: "error.light" }}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Typography
                      variant="h5"
                      align="center"
                      sx={{ fontWeight: "bold" }}
                    >
                      {validationResult.error_count}
                    </Typography>
                    <Typography variant="body2" align="center">
                      Error Records
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={4}>
                <Card>
                  <CardContent sx={{ py: 1.5 }}>
                    <Typography
                      variant="h5"
                      align="center"
                      sx={{ fontWeight: "bold" }}
                    >
                      {validationResult.total_count}
                    </Typography>
                    <Typography variant="body2" align="center">
                      Total Records
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Action Buttons */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mt: 3,
                mb: 2,
              }}
            >
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => {
                  setSelectedFile(null);
                  setValidationResult(null);
                }}
                disabled={isProcessing}
                startIcon={<DeleteIcon />}
              >
                Cancel
              </Button>

              {showButtons && (
                <Box>
                  {validationResult.error_count > 0 && (
                    <Button
                      variant="contained"
                      color="warning"
                      onClick={() => handleProcessUpload(true)}
                      disabled={
                        isProcessing || validationResult.valid_count === 0
                      }
                      sx={{ mr: 1 }}
                      startIcon={<WarningIcon />}
                    >
                      Proceed with Upload (Skip Errors)
                    </Button>
                  )}

                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleProcessUpload(false)}
                    disabled={isProcessing || validationResult.error_count > 0}
                    startIcon={<CheckCircleIcon />}
                  >
                    Proceed with Upload (All Records)
                  </Button>
                </Box>
              )}
            </Box>

            {/* Error Table */}
            {validationResult.validation_errors &&
              validationResult.validation_errors.length > 0 && (
                <>
                  <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                    Validation Errors ({validationResult.error_count})
                  </Typography>
                  <TableContainer
                    component={Paper}
                    sx={{ maxHeight: 300, overflow: "auto" }}
                  >
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Row</TableCell>
                          <TableCell>Name</TableCell>
                          <TableCell>Field</TableCell>
                          <TableCell>Error</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {validationResult.validation_errors.flatMap(
                          (item: any, itemIndex: number) =>
                            item.errors
                              ? Object.entries(item.errors).map(
                                  (
                                    [field, msgs]: [string, any],
                                    errorIndex: number
                                  ) => (
                                    <TableRow
                                      key={`${itemIndex}-${field}`}
                                      sx={{
                                        bgcolor:
                                          errorIndex === 0
                                            ? "rgba(0, 0, 0, 0.04)"
                                            : "inherit",
                                        "&:hover": {
                                          bgcolor: "rgba(0, 0, 0, 0.08)",
                                        },
                                      }}
                                    >
                                      {errorIndex === 0 && (
                                        <TableCell
                                          rowSpan={
                                            Object.keys(item.errors).length
                                          }
                                        >
                                          {item.row}
                                        </TableCell>
                                      )}
                                      {errorIndex === 0 && (
                                        <TableCell
                                          rowSpan={
                                            Object.keys(item.errors).length
                                          }
                                        >
                                          {item.data.FirstName}{" "}
                                          {item.data.LastName}
                                        </TableCell>
                                      )}
                                      <TableCell>
                                        <Chip
                                          label={field}
                                          size="small"
                                          color="primary"
                                          variant="outlined"
                                        />
                                      </TableCell>
                                      <TableCell>{msgs}</TableCell>
                                    </TableRow>
                                  )
                                )
                              : []
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
          </Box>
        )}

        {/* Status Messages */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        {uploadResult && !error && !showSummary && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {uploadResult.message}
          </Alert>
        )}

        {/* Loading Indicators */}
        {uploadProgress > 0 && (
          <Box sx={{ width: "100%", mt: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Box sx={{ width: "100%", mr: 1 }}>
                <LinearProgress variant="determinate" value={uploadProgress} />
              </Box>
              <Box sx={{ minWidth: 35 }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                >{`${Math.round(uploadProgress)}%`}</Typography>
              </Box>
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              align="center"
              sx={{ display: "block", mt: 0.5 }}
            >
              {isValidating
                ? "Validating file..."
                : isProcessing
                ? "Processing upload..."
                : ""}
            </Typography>
          </Box>
        )}

        {(isValidating || isProcessing) && (
          <Backdrop
            sx={{
              color: "#fff",
              zIndex: (theme) => theme.zIndex.drawer + 1,
              position: "absolute",
            }}
            open={isValidating || isProcessing}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                bgcolor: "rgba(0,0,0,0.7)",
                p: 3,
                borderRadius: 2,
              }}
            >
              <CircularProgress color="inherit" />
              <Typography sx={{ mt: 2 }}>
                {isValidating ? "Validating..." : "Processing..."}
              </Typography>
            </Box>
          </Backdrop>
        )}

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={handleSnackbarClose}
            severity={snackbarSeverity}
            sx={{ width: "100%" }}
            action={
              <IconButton
                size="small"
                aria-label="close"
                color="inherit"
                onClick={handleSnackbarClose}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            }
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>

        {/* Upload Summary */}
        {showSummary && (
          <Box sx={{ mt: 3 }}>
            <Card sx={{ mb: 3, bgcolor: "success.light" }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <CelebrationIcon
                    sx={{ fontSize: 40, mr: 2, color: "success.dark" }}
                  />
                  <Box>
                    <Typography variant="h5" component="div">
                      Upload Complete!
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {uploadResult?.batch_id
                        ? `Batch ID: ${uploadResult.batch_id} | `
                        : ""}
                      Status: {uploadResult?.status || "Completed"}
                    </Typography>
                  </Box>
                </Box>

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={4}>
                    <Card>
                      <CardContent sx={{ py: 1.5 }}>
                        <Typography
                          variant="h5"
                          align="center"
                          sx={{ fontWeight: "bold", color: "success.main" }}
                        >
                          {uploadResult?.success_count ||
                            uploadResult?.created_count ||
                            validationResult?.valid_count ||
                            0}
                        </Typography>
                        <Typography variant="body2" align="center">
                          Successful Records
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={4}>
                    <Card>
                      <CardContent sx={{ py: 1.5 }}>
                        <Typography
                          variant="h5"
                          align="center"
                          sx={{ fontWeight: "bold", color: "error.main" }}
                        >
                          {uploadResult?.error_count ||
                            validationResult?.error_count ||
                            0}
                        </Typography>
                        <Typography variant="body2" align="center">
                          Failed Records
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={4}>
                    <Card>
                      <CardContent sx={{ py: 1.5 }}>
                        <Typography
                          variant="h5"
                          align="center"
                          sx={{ fontWeight: "bold" }}
                        >
                          {uploadResult?.total_count ||
                            validationResult?.total_count ||
                            (uploadResult?.success_count ||
                              uploadResult?.created_count ||
                              validationResult?.valid_count ||
                              0) +
                              (uploadResult?.error_count ||
                                validationResult?.error_count ||
                                0)}
                        </Typography>
                        <Typography variant="body2" align="center">
                          Total Records
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Successful Records Table */}
            {(uploadResult?.success_count > 0 ||
              uploadResult?.created_count > 0 ||
              validationResult?.valid_count > 0) && (
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="h6"
                  sx={{ display: "flex", alignItems: "center", mb: 1 }}
                >
                  <PersonAddIcon sx={{ mr: 1, color: "success.main" }} />
                  Successfully Added Records (
                  {uploadResult?.success_count ||
                    uploadResult?.created_count ||
                    validationResult?.valid_count ||
                    0}
                  )
                </Typography>
                <TableContainer
                  component={Paper}
                  sx={{ maxHeight: 250, overflow: "auto" }}
                >
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Customer ID</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Phone</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Source</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {validationResult?.valid_data
                        .slice(
                          0,
                          uploadResult?.success_count ||
                            uploadResult?.created_count ||
                            validationResult?.valid_data?.length ||
                            0
                        )
                        .map((customer: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>
                              {customer.id ||
                                customer.customer_id ||
                                `New-${index + 1}`}
                            </TableCell>
                            <TableCell>
                              {customer.first_name || customer.FirstName || ""}{" "}
                              {customer.last_name || customer.LastName || ""}
                            </TableCell>
                            <TableCell>
                              {customer.email || customer.Email || "-"}
                            </TableCell>
                            <TableCell>
                              {customer.phone ||
                                customer.phone_number ||
                                customer.Phone ||
                                "-"}
                            </TableCell>
                            <TableCell>
                              {customer.customer_type ||
                                customer.CustomerType ||
                                "Lead"}
                            </TableCell>
                            <TableCell>
                              {customer.source || customer.Source || "Import"}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* Failed Records Table */}
            {(uploadResult?.error_count > 0 ||
              validationResult?.error_count > 0) && (
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="h6"
                  sx={{ display: "flex", alignItems: "center", mb: 1 }}
                >
                  <PersonOffIcon sx={{ mr: 1, color: "error.main" }} />
                  Failed Records (
                  {uploadResult?.error_count ||
                    validationResult?.error_count ||
                    0}
                  )
                </Typography>
                <TableContainer
                  component={Paper}
                  sx={{ maxHeight: 250, overflow: "auto" }}
                >
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Email/Phone</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Error</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {uploadResult?.processing_errors &&
                        uploadResult.processing_errors.map(
                          (error: any, index: number) => (
                            <TableRow key={`proc-${index}`}>
                              <TableCell>
                                {error.data.first_name ||
                                  error.data.FirstName ||
                                  ""}{" "}
                                {error.data.last_name ||
                                  error.data.LastName ||
                                  ""}
                              </TableCell>
                              <TableCell>
                                {error.data.email ||
                                  error.data.Email ||
                                  error.data.phone ||
                                  error.data.Phone ||
                                  "-"}
                              </TableCell>
                              <TableCell>
                                {error.data.customer_type ||
                                  error.data.CustomerType ||
                                  "Lead"}
                              </TableCell>
                              <TableCell>
                                {Object.entries(error.errors).map(
                                  ([field, msg]: [string, any], i: number) => (
                                    <div key={i}>
                                      <strong>{field}:</strong>{" "}
                                      {Array.isArray(msg) ? msg[0] : msg}
                                    </div>
                                  )
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        )}
                      {validationResult?.error_records &&
                        validationResult.error_records.map(
                          (error: any, index: number) => (
                            <TableRow key={`verr-${index}`}>
                              <TableCell>
                                {error.data.first_name ||
                                  error.data.FirstName ||
                                  ""}{" "}
                                {error.data.last_name ||
                                  error.data.LastName ||
                                  ""}
                              </TableCell>
                              <TableCell>
                                {error.data.email ||
                                  error.data.Email ||
                                  error.data.phone ||
                                  error.data.Phone ||
                                  "-"}
                              </TableCell>
                              <TableCell>
                                {error.data.customer_type ||
                                  error.data.CustomerType ||
                                  "Lead"}
                              </TableCell>
                              <TableCell>
                                {error.errors &&
                                  Array.isArray(error.errors) &&
                                  error.errors.map((msg: string, i: number) => (
                                    <div key={i}>{msg}</div>
                                  ))}
                              </TableCell>
                            </TableRow>
                          )
                        )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleCloseSummary}
                startIcon={<SummarizeIcon />}
              >
                Close Summary
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {!processingComplete && (
          <Button
            onClick={() => onClose()}
            color="inherit"
            disabled={isValidating || isProcessing}
          >
            Cancel
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CustomerUploadDialog;
