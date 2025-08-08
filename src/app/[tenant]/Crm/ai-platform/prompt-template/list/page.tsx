"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTenant } from "../../../../../contexts/ai-platform/TenantContext";
import { useRoleAccess } from "../../../../../contexts/ai-platform/RoleAccessContext";
import  FeatureGuard  from "../../../../../components/AIPlatform/FeatureGuard";
import CustomSnackbar from "../../../../../components/AIPlatform/snackbar/CustomSnackbar";
import { getAuthHeaders } from "@/app/hooks/api/auth";
import {AI_PLATFORM_API_BASE_URL} from "@/utils/constants";

import {
  Box,
  Button,
  Container,
  IconButton,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Tooltip,
  CircularProgress,
  Link,
  ButtonGroup,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CompareArrows as CompareArrowsIcon,
} from "@mui/icons-material";

import { useParams } from "next/navigation";

// Interfaces based on your API response
interface ModelParameters {
  top_p: number;
  max_tokens: number;
  temperature: number;
  presence_penalty: number;
  frequency_penalty: number;
  [key: string]: any; // Allow additional properties
}

interface VariablesSchema {
  type: string;
  properties: Record<string, { type: string }>;
  required?: string[];
  [key: string]: any; // Allow additional properties
}

interface BasePromptVariant {
  id: number;
  variant_name: string;
  system_prompt: string;
  user_prompt: string;
  agentic_submodel: number;
  model_parameters: ModelParameters;
  variables_schema: VariablesSchema;
  is_published: boolean;
  published_at: string | null;
  is_active: boolean;
  prompt_name: string;
  version_number: string;
  prompt_id: number;
  created_at: string;
  updated_at: string;
  input_format?: string;
  output_format?: string;
  description?: string;
}

interface PromptVariant extends BasePromptVariant {
  originalPromptName?: string;
  originalPromptId?: number;
  versionNumber?: string;
  promptDescription?: string;
}

interface PromptVersion {
  id: number;
  version_number: string;
  published_at: string | null;
  description: string;
  variants: PromptVariant[];
  [key: string]: any; // Allow additional properties
}

interface PromptData {
  id: number;
  name: string;
  description: string;
  is_template: boolean;
  versions: PromptVersion[];
  [key: string]: any; // Allow additional properties
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
  [key: string]: any; // Allow additional properties
}

type PromptApiResponse = PaginatedResponse<PromptData>;
type ApiResponse = PromptData[] | PromptApiResponse;

export default function PromptListPage() {
  // Renamed component for clarity
  const router = useRouter();
  // State for the flattened list of variants to display
  const [displayVariants, setDisplayVariants] = useState<PromptVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<PromptVariant[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const { isLoading: tenantLoading } = useTenant();
  const { hasPermission } = useRoleAccess();

  const tenantSlug = useParams().tenant;
  const apiBaseUrl = AI_PLATFORM_API_BASE_URL;

  // For delete, we'll target the parent prompt for now
  const [itemToDelete, setItemToDelete] = useState<{
    id: number;
    name: string;
    type: "prompt" | "variant";
  } | null>(null);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({
    open: false,
    message: "",
    severity: "error",
  });

  const fetchPromptData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Don't fetch if tenant data isn't loaded yet
      if (tenantLoading || !tenantSlug || !apiBaseUrl) {
        return;
      }
      const response = await fetch(
        `${apiBaseUrl}/${tenantSlug}/prompt-management/prompts/`,
        { headers: { ...getAuthHeaders() } }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to fetch prompts");
      }
      
      const responseData: ApiResponse = await response.json();
      const allVariants: PromptVariant[] = [];
      
      // Handle both array and paginated responses
      const prompts = Array.isArray(responseData) 
        ? responseData 
        : 'results' in responseData 
          ? responseData.results 
          : [];
      
      // Type guard to check if the object is a PromptData
      const isPromptData = (obj: any): obj is PromptData => {
        return obj && Array.isArray(obj.versions);
      };

      // Process each prompt
      for (const prompt of prompts) {
        if (!isPromptData(prompt) || !prompt.versions) continue;
        
        for (const version of prompt.versions) {
          if (!version.variants) continue;
          
          for (const variant of version.variants) {
            allVariants.push({
              ...variant,
              originalPromptName: prompt.name,
              originalPromptId: prompt.id,
              versionNumber: version.version_number,
              promptDescription: prompt.description,
            });
          }
        }
      }

      // Sort variants by their own updated_at date, newest first
      allVariants.sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      setDisplayVariants(allVariants);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      showSnackbar(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!tenantLoading) {
      fetchPromptData();
    }
  }, [tenantLoading, tenantSlug, apiBaseUrl]);

  const showSnackbar = (message: string, severity: "success" | "error" | "info" | "warning") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleDeleteClick = (variant: PromptVariant) => {
    // For now, delete targets the parent prompt template.
    // If you want to delete individual variants, the API endpoint and logic would differ.
    setItemToDelete({
      id: variant.prompt_id,
      name: variant.prompt_name,
      type: "prompt",
    });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    // Current logic deletes the parent prompt.
    // To delete a variant: use DELETE /api/prompt-management/prompt-variants/{variant.id}/ (example)
    // and update displayVariants state accordingly.
    if (itemToDelete.type === "prompt") {
      try {
        const response = await fetch(
          `${apiBaseUrl}/${tenantSlug}/prompt-management/prompts/${itemToDelete.id}/`,
          {
            method: "DELETE",
            headers: { ...getAuthHeaders() },
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.detail || `Failed to delete prompt '${itemToDelete.name}'`
          );
        }

        // Refetch or filter out all variants belonging to the deleted prompt
        setDisplayVariants((prevVariants) =>
          prevVariants.filter((v) => v.prompt_id !== itemToDelete.id)
        );
        showSnackbar(
          `Prompt '${itemToDelete.name}' deleted successfully`,
          "success"
        );
      } catch (err) {
        const errorMsg =
          err instanceof Error
            ? err.message
            : "An unknown error occurred during deletion.";
        showSnackbar(errorMsg, "error");
        console.error("Delete error:", err);
      } finally {
        setDeleteDialogOpen(false);
        setItemToDelete(null);
      }
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return dateString; // Return original if parsing fails
    }
  };

  return (
    // <FeatureGuard featureKey="workbench" fallback={
    //   <Container maxWidth="lg" sx={{ py: 4 }}>
    //     <Box sx={{ p: 3, textAlign: 'center', minHeight: 'calc(100vh - 64px)' }}>
    //       <Typography variant="h5" color="error" gutterBottom>
    //         Access Denied
    //       </Typography>
    //       <Typography variant="body1">
    //         You don't have permission to access the Workbench feature.
    //         Please contact your administrator for assistance.
    //       </Typography>
    //     </Box>
    //   </Container>
    // }>
      <>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography variant="h4" component="h1" fontWeight="medium">
            Prompt Variants
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              // if (hasPermission('workbench', 'create_prompt')) {
                router.push(`/${tenantSlug}/Crm/ai-platform/prompt-template/create`);
              // } else {
              //   setSnackbar({
              //     open: true,
              //     message: 'You don\'t have permission to create new templates',
              //     severity: 'error'
              //   });
              // }
            }}
            sx={{ textTransform: "none" }}
          >
            Create New Template
          </Button>
        </Box>

        {error && !loading && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Paper elevation={2}>
          <TableContainer>
            <Table stickyHeader aria-label="prompt variants table">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold" }}>Variant Name</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Version</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Published</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Last Updated</TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold" }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    {/* Adjusted colSpan from 7 to 6 */}
                    <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                      <CircularProgress />
                      <Typography sx={{ mt: 1 }}>
                        Loading Prompt Variants...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : displayVariants.length === 0 && !error ? (
                  <TableRow>
                    {/* Adjusted colSpan from 7 to 6 */}
                    <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                      <Typography>No prompt variants found.</Typography>
                      <Button
                        variant="text"
                        onClick={() => {
                          if (hasPermission('workbench', 'create_prompt')) {
                            router.push(`/${tenantSlug}/Crm/ai-platform/prompt-template/create`);
                          } else {
                            setSnackbar({
                              open: true,
                              message: 'You don\'t have permission to create new templates',
                              severity: 'error'
                            });
                          }
                        }}
                        sx={{ mt: 1 }}
                      >
                        Create one now
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  displayVariants.map((variant) => (
                    <TableRow hover key={variant.id}>
                      <TableCell>
                        <Tooltip
                          title={variant.variant_name}
                          placement="top-start"
                        >
                          <Typography
                            variant="body2"
                            noWrap
                            sx={{
                              maxWidth: "200px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {variant.variant_name}
                            {/* You could consider prefixing with prompt_name if variant_name alone is not unique enough: */}
                            {/* {variant.prompt_name} - {variant.variant_name} */}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      {/* // REMOVED THIS CELL:
                          <TableCell>
                            <Link component="button" variant="body2" onClick={() => router.push(`/prompt-template/create?edit=${variant.prompt_id}`)} sx={{textAlign: 'left'}}>
                                {variant.prompt_name}
                            </Link>
                          </TableCell> 
                        */}
                      <TableCell>{variant.version_number}</TableCell>
                      <TableCell>
                        <Chip
                          label={variant.is_active ? "Active" : "Inactive"}
                          color={variant.is_active ? "success" : "default"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip
                          title={
                            variant.published_at
                              ? `At: ${formatDate(variant.published_at)}`
                              : "Not Published"
                          }
                        >
                          <Chip
                            label={variant.is_published ? "Yes" : "No"}
                            color={variant.is_published ? "primary" : "default"}
                            size="small"
                          />
                        </Tooltip>
                      </TableCell>
                      <TableCell>{formatDate(variant.updated_at)}</TableCell>
                      <TableCell align="right">
                        <ButtonGroup size="small" variant="outlined">
                          <Tooltip title="Edit variant">
                            <IconButton
                              size="small"
                              onClick={() => {
                                if (hasPermission('workbench', 'edit_prompt')) {
                                  router.push(
                                    `/${tenantSlug}/Crm/ai-platform/prompt-template/create?editVariant=${variant.id}`
                                  );
                                } else {
                                  setSnackbar({
                                    open: true,
                                    message: 'You don\'t have permission to edit templates',
                                    severity: 'error'
                                  });
                                }
                              }}
                              color="primary"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete variant">
                            <IconButton
                              size="small"
                              onClick={() => {
                                if (hasPermission('workbench', 'delete_prompt')) {
                                  handleDeleteClick(variant);
                                } else {
                                  setSnackbar({
                                    open: true,
                                    message: 'You don\'t have permission to delete templates',
                                    severity: 'error'
                                  });
                                }
                              }}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {/* <Tooltip title="Add to comparison">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedVariants(prev => {
                                  const exists = prev.some(v => v.id === variant.id);
                                  if (exists) return prev;
                                  return [...prev, variant];
                                });
                                setCompareModalOpen(true);
                              }}
                              color="primary"
                            >
                              <CompareArrowsIcon fontSize="small" />
                            </IconButton>
                          </Tooltip> */}
                        </ButtonGroup>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Delete Confirmation Dialog and Snackbar remain the same */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
        >
          <DialogTitle>Delete Variant</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete the variant "{itemToDelete?.name}"?
              This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} color="error" autoFocus>
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        <CustomSnackbar
          open={snackbar.open}
          message={snackbar.message}
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        />
      </>
    // </FeatureGuard>
  );
}
