"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Box,
  Button,
  Typography,
  Breadcrumbs,
  Link,
  Paper,
  Divider,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Chip,
  CircularProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import SettingsIcon from "@mui/icons-material/Settings";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import {
  getVoucherTypeSegmentTemplateAssignments,
  deleteVoucherTypeSegmentTemplateAssignment,
  getVoucherTypes,
  getCustomerSegments,
} from "../../../../../services/configurations";

const InvoiceSettingsPage = () => {
  const pathname = usePathname();
  const router = useRouter();
  const tenantSlug = pathname?.split("/")[1];

  // State management
  const [configurations, setConfigurations] = useState<any[]>([]);
  const [voucherTypes, setVoucherTypes] = useState<any[]>([]);
  const [customerSegments, setCustomerSegments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  const handleAddConfiguration = () => {
    router.push(
      `/${tenantSlug}/Crm/tenant-admin/settings/invoices/configurations/?mode=create`
    );
  };

  // Fetch all required data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [configurationsData, voucherTypesData, segmentsData] =
          await Promise.all([
            getVoucherTypeSegmentTemplateAssignments({ paginate: false }),
            getVoucherTypes("Invoice"),
            getCustomerSegments(),
          ]);

        setConfigurations(
          configurationsData.results || configurationsData || []
        );
        setVoucherTypes(voucherTypesData.results || voucherTypesData || []);
        setCustomerSegments(segmentsData || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle configuration deletion
  const handleDeleteConfiguration = async (id: number) => {
    setDeleting(id);
    try {
      await deleteVoucherTypeSegmentTemplateAssignment(id);
      // Remove from local state
      setConfigurations((prev) => prev.filter((config) => config.id !== id));
    } catch (error) {
      console.error("Error deleting configuration:", error);
    } finally {
      setDeleting(null);
    }
  };

  const handleEdit = (id: number) => {
    router.push(
      `/${tenantSlug}/Crm/tenant-admin/settings/invoices/configurations/?mode=edit&id=${id}`
    );
  };

  return (
    <Box>
      {/* Breadcrumbs */}
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        aria-label="breadcrumb"
        sx={{ mb: 3 }}
      >
        <Link
          color="inherit"
          href={`/${tenantSlug}/Crm/tenant-admin/dashboard`}
          onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
            e.preventDefault();
            router.push(`/${tenantSlug}/Crm`);
          }}
        >
          Dashboard
        </Link>
        <Link
          color="inherit"
          href={`/${tenantSlug}/Crm/tenant-admin/settings`}
          onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
            e.preventDefault();
            router.push(`/${tenantSlug}/Crm/tenant-admin/settings`);
          }}
        >
          Settings
        </Link>
        <Typography color="text.primary">Invoice Configurations</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
        }}
      >
        <Typography variant="h5">Invoice Configurations</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddConfiguration}
        >
          Add Configuration
        </Button>
      </Box>

      {/* Content */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={2}>
          <Grid size={12}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Available Configurations
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          {/* Configuration Cards */}
          {loading ? (
            <Grid size={12}>
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress />
              </Box>
            </Grid>
          ) : configurations.length === 0 ? (
            <Grid size={12}>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  py: 6,
                }}
              >
                <SettingsIcon
                  sx={{ fontSize: 64, color: "text.secondary", mb: 2 }}
                />
                <Typography variant="h6" color="text.secondary">
                  No configurations found
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                  Add a new configuration to get started
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAddConfiguration}
                >
                  Add Configuration
                </Button>
              </Box>
            </Grid>
          ) : (
            configurations.map((config) => {
              const voucherType = voucherTypes.find(
                (vt) => vt.id === config.voucher_type
              );
              const segment = customerSegments.find(
                (s) => s.id === config.segment_id
              );

              return (
                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={config.id}>
                  <Card
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" component="div" gutterBottom>
                        {voucherType?.name ||
                          `Voucher Type ID: ${config.voucher_type}`}
                      </Typography>

                      <Box sx={{ mb: 2 }}>
                        <Chip
                          label={segment?.segment_name || "All Segments"}
                          size="small"
                          color={segment ? "primary" : "default"}
                          sx={{ mr: 1, mb: 1 }}
                        />
                        <Chip
                          label={`Template ID: ${config.template}`}
                          size="small"
                          color="secondary"
                          sx={{ mb: 1 }}
                        />
                      </Box>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Configuration Values:{" "}
                        {config.vouchertypesegmentconfigs_set?.length || 0}
                      </Typography>

                      <Typography variant="caption" color="text.secondary">
                        Created:{" "}
                        {new Date(config.created_at).toLocaleDateString()}
                      </Typography>
                    </CardContent>

                    <CardActions
                      sx={{ justifyContent: "space-between", px: 2, pb: 2 }}
                    >
                      <IconButton
                        color="primary"
                        onClick={() => handleEdit(config.id)}
                        size="small"
                        disabled={deleting === config.id}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteConfiguration(config.id)}
                        size="small"
                        disabled={deleting === config.id}
                      >
                        {deleting === config.id ? (
                          <CircularProgress size={16} />
                        ) : (
                          <DeleteIcon />
                        )}
                      </IconButton>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })
          )}
        </Grid>
      </Paper>
    </Box>
  );
};

export default InvoiceSettingsPage;
