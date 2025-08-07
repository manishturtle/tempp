"use client";

/**
 * Tax Rate Profiles Listing Page
 *
 * Page component for listing, filtering, and managing tax rate profiles
 */
import React, { useState, useMemo, useRef } from "react";
import {
  Typography,
  Box,
  Button,
  Tooltip,
  IconButton,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider,
  Stack,
} from "@mui/material";

import { useTranslation } from "react-i18next";
import {
  useFetchTaxRateProfiles,
  useDeleteTaxRateProfile,
  useCreateTaxRateProfile,
  useUpdateTaxRateProfile,
} from "@/app/hooks/api/pricing";
import { TaxRateProfile, TaxRate } from "@/app/types/pricing";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AssignmentIcon from "@mui/icons-material/Assignment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import RuleIcon from "@mui/icons-material/Rule";
import AnalyticsCard from "@/app/components/common/AnalyticsCard";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/app/components/common/ConfirmDialog";
import { formatDateTime } from "@/app/utils/dateUtils";
import Loader from "@/app/components/common/Loader";
import Notification from "@/app/components/common/Notification";
import useNotification from "@/app/hooks/useNotification";
import AnimatedDrawer from "@/app/components/common/AnimatedDrawer";
import { TaxRateProfileForm } from "@/app/components/admin/pricing/forms/TaxRateProfileForm";
import { DrawerProvider, useDrawer } from "@/app/contexts/DrawerContext";
import { TaxRateProfileFormValues } from "@/app/components/admin/pricing/schemas";
import api from "@/lib/api";
import { getAuthHeaders } from "@/app/hooks/api/auth";
import Link from "next/link";

// Wrapper component that provides the DrawerContext
export default function TaxRateProfilesPageWrapper() {
  return (
    <DrawerProvider>
      <TaxRateProfilesPage />
    </DrawerProvider>
  );
}

// Main component that uses the DrawerContext
function TaxRateProfilesPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { notification, showSuccess, showError, hideNotification } =
    useNotification();

  // Use drawer context
  const drawerContext = useDrawer();

  // Local state for drawer management
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"add" | "edit">("add");
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(
    null
  );
  const [selectedProfile, setSelectedProfile] = useState<TaxRateProfile | null>(
    null
  );
  const [isViewMode, setIsViewMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form ref for submitting the form from outside
  const formRef = useRef<{ submitForm: () => void } | null>(null);

  // State for active sidebar item
  const [activeSidebarItem, setActiveSidebarItem] = useState<string>("view");

  // State for pagination and search
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCriteria, setFilterCriteria] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState("all");

  // State for delete confirmation dialog
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    id: number | null;
  }>({
    open: false,
    id: null,
  });

  // API hooks
  const {
    data,
    isLoading: isLoadingProfiles,
    isError,
    error,
    refetch,
  } = useFetchTaxRateProfiles({
    page: paginationModel.page + 1,
    search: searchQuery,
    ...filterCriteria,
  });
  const { mutate: deleteTaxRateProfile, isPending: isDeleting } =
    useDeleteTaxRateProfile();
  const { mutate: createTaxRateProfile, isPending: isCreating } =
    useCreateTaxRateProfile();
  const { mutate: updateTaxRateProfile, isPending: isUpdating } =
    useUpdateTaxRateProfile();

  // Handle drawer open for adding a new tax rate profile
  const handleAddProfile = () => {
    setSelectedProfileId(null);
    setSelectedProfile(null);
    setDrawerMode("add");
    setIsViewMode(false);
    setActiveSidebarItem("edit");
    setDrawerOpen(true);
    drawerContext.openDrawer("add");
  };

  // Handle drawer open for editing a tax rate profile
  const handleOpenEditDrawer = (id: number) => {
    // Prevent multiple calls if already loading or if the same profile is already selected
    if (isLoading || (selectedProfileId === id && drawerOpen)) {
      return;
    }

    // Set loading state first
    setIsLoading(true);

    // Set the ID and mode
    setSelectedProfileId(id);
    setDrawerMode("edit");
    setIsViewMode(true); // Set to true initially
    setActiveSidebarItem("view"); // Set active sidebar item to view

    // Always fetch from API to ensure we have the most up-to-date data
    api
      .get(`/pricing/tax-rate-profiles/${id}/`, { headers: getAuthHeaders() })
      .then((response) => {
        if (response.data) {
          // Store the full profile data
          setSelectedProfile(response.data);

          // Open drawer
          setDrawerOpen(true);

          // Update drawer context
          drawerContext.openDrawer("edit");
        }
      })
      .catch((error) => {
        console.error("Error fetching tax rate profile:", error);
        showError(
          t(
            "taxRateProfiles.fetchError",
            "Failed to fetch tax rate profile details"
          )
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Handle drawer close
  const handleDrawerClose = () => {
    setDrawerOpen(false);
    drawerContext.closeDrawer();
    setSelectedProfileId(null);
    setSelectedProfile(null);
  };

  // Handle form submission for creating or updating tax rate profile
  const handleFormSubmit = (data: TaxRateProfileFormValues) => {
    if (drawerMode === "add") {
      console.log(data);
      createTaxRateProfile(data, {
        onSuccess: () => {
          showSuccess(t("Tax Rate Profile Created Successfully"));
          setDrawerOpen(false);
          refetch();
        },
        onError: (error: any) => {
          showError(
            error?.response?.data?.detail ||
              t("pricing.taxRateProfile.createError")
          );
        },
      });
    } else if (drawerMode === "edit" && selectedProfileId) {
      console.log(data);
      updateTaxRateProfile(
        {
          id: selectedProfileId,
          ...data,
        },
        {
          onSuccess: () => {
            showSuccess(t("Tax Rate Profile Updated Successfully"));
            setDrawerOpen(false);
            refetch();
          },
          onError: (error: any) => {
            showError(
              error?.response?.data?.detail ||
                t("pricing.taxRateProfile.updateError")
            );
          },
        }
      );
    }
  };

  // Handle form save
  const handleSave = (values: TaxRateProfileFormValues) => {
    handleFormSubmit(values);
  };

  // Handle delete button click
  const handleDelete = (id: number) => {
    setConfirmDelete({ open: true, id });
  };

  // Handle delete confirmation
  const confirmDeleteAction = () => {
    if (confirmDelete.id) {
      deleteTaxRateProfile(confirmDelete.id, {
        onSuccess: () => {
          showSuccess(t("Tax Rate Profile Deleted Successfully"));
          setConfirmDelete({ open: false, id: null });
          refetch();
        },
        onError: (error) => {
          console.error("Error deleting tax rate profile:", error);
          showError(t("pricing.taxRateProfile.deleteError"));
          setConfirmDelete({ open: false, id: null });
        },
      });
    }
  };

  // Sidebar icons for the drawer
  const drawerSidebarIcons = useMemo(() => {
    if (drawerMode === "add") {
      return [];
    }
    return [
      {
        id: "view",
        icon: <VisibilityIcon />,
        tooltip: t("view", "View"),
        onClick: () => {
          setIsViewMode(true);
          setActiveSidebarItem("view");
          drawerContext.setActiveSidebarItem("view");
        },
      },
      {
        id: "edit",
        icon: <EditIcon />,
        tooltip: t("edit", "Edit"),
        onClick: () => {
          setIsViewMode(false);
          setActiveSidebarItem("edit");
          drawerContext.setActiveSidebarItem("edit");
        },
      },
    ];
  }, [drawerMode, t, drawerContext]);

  if (isLoadingProfiles) return <Loader />;

  if (isError) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error" variant="h6">
          {t("error")}
        </Typography>
      </Box>
    );
  }

  // Calculate statistics
  const totalProfiles = data?.results?.length || 0;
  const activeProfiles =
    data?.results?.filter((profile: any) => profile.is_active)?.length || 0;
  const inactiveProfiles = totalProfiles - activeProfiles;
  const totalRules =
    data?.results?.reduce(
      (sum: number, profile: any) => sum + (profile.rules?.length || 0),
      0
    ) || 0;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1,
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 600,
              color: "text.primary",
            }}
          >
            Tax Rate Profiles
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddProfile}
          >
            Add New
          </Button>
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Create and manage conditional tax rate sets for your organization
        </Typography>

        {/* Statistics Cards */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <AnalyticsCard
              title="Total Profiles"
              value={totalProfiles}
              icon={<AssignmentIcon />}
              color="primary.main"
              bgColor="primary.50"
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <AnalyticsCard
              title="Active"
              value={activeProfiles}
              icon={<CheckCircleIcon />}
              color="success.main"
              bgColor="success.50"
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <AnalyticsCard
              title="Inactive"
              value={inactiveProfiles}
              icon={<CancelIcon />}
              color="warning.main"
              bgColor="warning.50"
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <AnalyticsCard
              title="Total Rules"
              value={totalRules}
              icon={<RuleIcon />}
              color="info.main"
              bgColor="info.50"
            />
          </Grid>
        </Grid>
      </Box>

      {/* Profile Cards */}
      <Grid container spacing={2}>
        {data?.results?.map((profile: any) => (
          <Grid size={{ xs: 12, md: 6, lg: 3 }} key={profile.id}>
            <Card
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                border: "1px solid",
                borderColor: "divider",
                "&:hover": {
                  boxShadow: 2,
                  borderColor: "primary.main",
                },
                transition: "all 0.2s ease-in-out",
              }}
            >
              <CardContent sx={{ flexGrow: 1, p: 2 }}>
                {/* Header */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: "medium",
                      color: "text.primary",
                      fontSize: "1rem",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      mb: 0.5,
                      lineHeight: 1.2,
                      letterSpacing: 0.01,
                    }}
                  >
                    {profile.profile_name}
                  </Typography>
                  <Stack direction="row" sx={{ mt: -0.8 }}>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenEditDrawer(profile.id)}
                      sx={{
                        color: "primary.main",
                        minWidth: 28,
                        minHeight: 28,
                        borderRadius: 1,
                      }}
                    >
                      <EditIcon fontSize="inherit" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(profile.id)}
                      sx={{
                        color: "error.main",
                        minWidth: 28,
                        minHeight: 28,
                        borderRadius: 1,
                      }}
                    >
                      <DeleteIcon fontSize="inherit" />
                    </IconButton>
                  </Stack>
                </Box>

                {/* Rules Summary */}
                <Stack spacing={0.8}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontSize: "0.78rem" }}
                  >
                    📋 {profile.rules?.length || 0} rules configured
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontSize: "0.78rem" }}
                  >
                    {profile.is_active ? "✅" : "❌"}{" "}
                    {profile.is_active ? "Active" : "Inactive"}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontSize: "0.78rem" }}
                  >
                    🕒 Last updated {formatDateTime(profile.updated_at)}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* AnimatedDrawer for adding/editing tax rate profiles */}
      <AnimatedDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        initialWidth={550}
        expandedWidth={550}
        title={
          isViewMode
            ? t("View Tax Rate Profile")
            : drawerMode === "add"
            ? t("Add Tax Rate Profile")
            : t("Edit Tax Rate Profile")
        }
        onSave={
          isViewMode
            ? undefined
            : () => {
                if (formRef.current) {
                  formRef.current.submitForm();
                }
              }
        }
        sidebarIcons={drawerSidebarIcons}
        defaultSidebarItem={activeSidebarItem}
        enableEventSection={true}
        footerContent={
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {drawerMode === "edit" && selectedProfileId && (
              <Typography variant="caption" color="text.secondary">
                {t("lastUpdated")}:{" "}
                {selectedProfile?.updated_at
                  ? formatDateTime(selectedProfile.updated_at)
                  : ""}
              </Typography>
            )}
          </Box>
        }
      >
        <TaxRateProfileForm
          ref={formRef}
          defaultValues={
            selectedProfile
              ? {
                  profile_name: selectedProfile.profile_name || "",
                  description: selectedProfile.description || "",
                  country_code: selectedProfile.country_code || "IN",
                  is_active: selectedProfile.is_active,
                  rules: selectedProfile.rules || [],
                }
              : {
                  profile_name: "",
                  description: "",
                  country_code: "IN",
                  is_active: true,
                  rules: [],
                }
          }
          onSubmit={handleFormSubmit}
          isSubmitting={isCreating || isUpdating}
          isEditMode={drawerMode === "edit"}
          isViewMode={isViewMode}
        />
      </AnimatedDrawer>

      <ConfirmDialog
        open={confirmDelete.open}
        title={t("Delete Tax Rate Profile")}
        content={t("Delete Tax Rate Profile Confirmation")}
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete({ open: false, id: null })}
        isLoading={isDeleting}
      />

      <Notification
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={hideNotification}
      />
    </Box>
  );
}
