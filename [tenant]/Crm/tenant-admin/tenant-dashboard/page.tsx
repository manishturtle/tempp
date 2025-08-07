"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Box,
  Typography,
  useTheme,
  Card,
  Grid,
  CardContent,
  LinearProgress,
  CircularProgress,
  Alert,
} from "@mui/material";
import type { Theme } from "@mui/material/styles";
import StorageIcon from "@mui/icons-material/Storage";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import GroupsIcon from "@mui/icons-material/Groups";
import InsightsIcon from "@mui/icons-material/Insights";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

// Import API functions
import {
  fetchTenantSubscriptions,
  fetchTenantApplications,
  type TenantSubscription,
  type TenantApplication,
} from "../../../../services/tenantApi";

// Import components
import { DashbaordSubscriptionCard } from "../../../../components/TenantAdmin/dashboard/DashbaordSubscriptionCard";
import { UserManagementCard } from "../../../../components/TenantAdmin/dashboard/UserManagementCard";
import { SecurityAuditCard } from "../../../../components/TenantAdmin/dashboard/SecurityAuditCard";
import { AnnouncementsCard } from "../../../../components/TenantAdmin/dashboard/AnnouncementsCard";
import { BillingInfo } from "../../../../components/TenantAdmin/dashboard/BillingInfo";

export default function TenantDashboardPage() {
  const theme = useTheme();
  const router = useRouter();
  const tenantSlug = useParams().tenant;


  const dummydata = {
    tenant_id: 11,
    tenant_name: "Turtle Electronics",
    tenant_status: "active",
    default_url: "https://devstore.turtleit.in/store/turtle_electronics/",
    paid_until: null,
    applications: [
      {
        app_id: 1,
        name: "Ecommerce",
        description: "test",
        is_active: true,
        app_default_url: "https://devstore.turtleit.in/turtle_electronics/Crm/",
        created_at: "2025-05-29T13:44:08.660608Z",
        user_count: 1,
        features: [
          {
            id: 1,
            key: "contact_management",
            name: "Contact Management",
            app_id: 1,
            is_active: true,
            description: "Manage customer contacts and details",
            subfeatures: [
              {
                id: 1001,
                key: "basic_contact",
                name: "Basic Contact Info",
                settings: {
                  fields: ["name", "email", "phone"],
                  enabled: true,
                },
                description: "Basic contact information fields",
              },
              {
                id: 1002,
                key: "advanced_contact",
                name: "Advanced Contact Info",
                settings: {
                  fields: ["social_media", "preferences"],
                  enabled: false,
                },
                description: "Advanced contact details",
              },
            ],
            license_id: 9,
            plan_name: "Silver",
            license_status: "active",
          },
          {
            id: 2,
            key: "deal_management",
            name: "Deal Management",
            app_id: 1,
            is_active: true,
            description: "Track and manage deals",
            subfeatures: [
              {
                id: 2001,
                key: "pipeline_stages",
                name: "Pipeline Stages",
                settings: {
                  stages: [
                    "qualification",
                    "proposal",
                    "negotiation",
                    "closed",
                  ],
                  enabled: true,
                },
                description: "Configure sales pipeline stages",
              },
            ],
            license_id: 9,
            plan_name: "Silver",
            license_status: "active",
          },
        ],
        subscription: {
          license_id: 9,
          plan_id: 1,
          plan_name: "Silver",
          plan_description: "",
          valid_from: "2025-06-02T07:08:21.114532Z",
          valid_until: "2025-09-02T07:08:21.114532Z",
          license_status: "active",
          subscription_plan: {
            id: 1,
            name: "Silver",
            price: "5000.00",
            max_users: 5000,
            description: "",
            session_type: "concurrent",
            billing_cycle: "monthly",
            storage_limit: 5000,
            support_level: "basic",
            api_call_limit: 5000,
            transaction_limit: 1000,
          },
        },
      },
    ],
  };

  const [subscriptions, setSubscriptions] = useState<TenantSubscription | null>(
    null
  );
  const [loading, setLoading] = useState({
    subscriptions: true,
  });
  const [error, setError] = useState<{
    subscriptions: string | null;
  }>({ subscriptions: null });

  // Check if user is authenticated and fetch data
  useEffect(() => {
    // const token = localStorage.getItem("token");
    // if (!token) {
    //   router.push("/login");
    //   return;
    // }

    // Fetch subscriptions
   
    const loadSubscriptions = async () => {
      try {
        const data = await fetchTenantSubscriptions(tenantSlug as string);
        // Transform the API response to match our component's expectations
        const transformedData = {
          ...data,
          // Add any necessary transformations here
        };
        setSubscriptions(transformedData);
        setError((prev) => ({ ...prev, subscriptions: null }));
      } catch (err) {
        console.error("Error fetching subscriptions:", err);
        setError((prev) => ({
          ...prev,
          subscriptions:
            err instanceof Error ? err.message : "Failed to load subscriptions",
        }));
      } finally {
        setLoading((prev) => ({ ...prev, subscriptions: false }));
      }
    };

    // We no longer need a separate loadApplications function since applications now come with subscriptions

    loadSubscriptions();
  }, [router, tenantSlug]);

  // Helper function to get icon based on subscription name
  const getSubscriptionIcon = (name: string): ReactNode => {
    const iconMap: Record<string, ReactNode> = {
      CRM: <BusinessCenterIcon />,
      HR: <GroupsIcon />,
      Finance: <InsightsIcon />,
      Analytics: <InsightsIcon />,
      Inventory: <StorageIcon />,
    };

    const match = Object.keys(iconMap).find((key) =>
      name.toLowerCase().includes(key.toLowerCase())
    );

    return match ? iconMap[match] : <BusinessCenterIcon />;
  };

  // Helper function to get color based on subscription name
  const getSubscriptionColor = (name: string, theme: Theme) => {
    const colorMap: Record<string, string> = {
      CRM: theme.palette.primary.main,
      HR: theme.palette.secondary.main,
      Finance: theme.palette.info.main,
      Analytics: theme.palette.warning.main,
      Inventory: theme.palette.success.main,
    };

    const match = Object.keys(colorMap).find((key) =>
      name.toLowerCase().includes(key.toLowerCase())
    );

    return match ? colorMap[match] : theme.palette.primary.main;
  };

  const isLoading = loading.subscriptions;
  const hasError = Boolean(error.subscriptions);

  // Calculate totals from subscriptions data
  const totalActiveUsers =
    subscriptions?.applications?.reduce(
      (total: number, app) => total + (app.user_count || 0),
      0
    ) || 0;

  const totalSubscriptions = subscriptions?.applications?.length || 0;

  // Get tenant info from subscriptions
  const tenantName = subscriptions?.tenant_name || "Tenant";
  const tenantStatus = subscriptions?.tenant_status || "active";

  // Format status for display
  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Get current time for greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    const timeGreeting =
      hour < 12
        ? "Good morning"
        : hour < 18
        ? "Good afternoon"
        : "Good evening";
    return `${timeGreeting}${isLoading ? "" : `, ${tenantName}`}`;
  };

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 600,
            lineHeight: 1.2,
            mb: 1,
          }}
        >
          {isLoading ? "Loading..." : getGreeting()}
        </Typography>
        <Typography
          variant="h6"
          color="text.secondary"
          sx={{
            fontWeight: 400,
            opacity: 0.9,
            lineHeight: 1.4,
          }}
        ></Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <Card sx={{ height: "100%", borderRadius: 2, boxShadow: 1 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Total Active Users
              </Typography>
              <Typography variant="h4" sx={{ mt: 1, mb: 1.5, fontWeight: 600 }}>
                {isLoading ? <CircularProgress size={24} /> : totalActiveUsers}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Across all applications
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <Card sx={{ height: "100%", borderRadius: 2, boxShadow: 1 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Active Subscriptions
              </Typography>
              <Typography variant="h4" sx={{ mt: 1, mb: 1.5, fontWeight: 600 }}>
                {isLoading ? (
                  <CircularProgress size={24} />
                ) : (
                  totalSubscriptions
                )}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Active application subscriptions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <Card sx={{ height: "100%", borderRadius: 2, boxShadow: 1 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Total Storage Used
              </Typography>
              <Typography variant="h5" sx={{ mt: 1, mb: 1.5, fontWeight: 600 }}>
                120 GB / 250 GB
              </Typography>
              <Box sx={{ width: "100%", mb: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={48}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: theme.palette.grey[200],
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 3,
                      backgroundColor: theme.palette.primary.main,
                    },
                  }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                48% of total storage used
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <Card sx={{ height: "100%", borderRadius: 2, boxShadow: 1 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                API Calls This Month
              </Typography>
              <Typography variant="h5" sx={{ mt: 1, mb: 1.5, fontWeight: 600 }}>
                1.2M / 3M
              </Typography>
              <Box sx={{ width: "100%", mb: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={40}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: theme.palette.grey[200],
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 3,
                      backgroundColor: theme.palette.secondary.main,
                    },
                  }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                40% of monthly limit used
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", lg: "row" },
          gap: 3,
        }}
      >
        {/* Left Column */}
        <Box sx={{ flex: 2 }}>
          {/* Subscriptions Section */}
          <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 1 }}>
            <CardContent sx={{ p: 3 }}>
              <Box mb={3}>
                <Typography variant="h6" fontWeight={600}>
                  My Subscriptions & Billing
                </Typography>
              </Box>

              {loading.subscriptions ? (
                <Box display="flex" justifyContent="center" p={4}>
                  <CircularProgress />
                </Box>
              ) : error.subscriptions ? (
                <Alert severity="error" icon={<ErrorOutlineIcon />}>
                  {error.subscriptions}
                </Alert>
              ) : !subscriptions?.applications ||
                subscriptions.applications.length === 0 ? (
                <Alert severity="info">
                  No subscriptions found. Add a subscription to get started.
                </Alert>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {subscriptions.applications.map((app, index) => {
                    const plan = app.subscription.subscription_plan;
                    const status = app.subscription.license_status as
                      | "active"
                      | "inactive"
                      | "trial"
                      | "suspended"
                      | "pending"
                      | "cancelled"
                      | "pending upgrade";

                    // Prepare metrics data
                    const metrics = [
                      {
                        label: "API Calls",
                        value: 1200000, // Example value - replace with actual data
                        max: 2000000, // Example value - replace with actual data
                        color: "primary" as const,
                      },
                      {
                        label: "Processing Credits",
                        value: 7500, // Example value - replace with actual data
                        max: 10000, // Example value - replace with actual data
                        color: "secondary" as const,
                      },
                    ];

                    return (
                      <DashbaordSubscriptionCard
                        key={`${app.app_id}-${index}`}
                        title={app.name}
                        plan={app.subscription.plan_name}
                        assigned={app.users_count_current || 0}
                        total={app.users_assigned || 0}
                        status={app.subscription.license_status}
                        appUrl={app.app_default_url}
                      />
                    );
                  })}
                </Box>
              )}

              <BillingInfo />
            </CardContent>
          </Card>
        </Box>

        {/* Right Column */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
          <UserManagementCard />
          <SecurityAuditCard />
          <AnnouncementsCard />
        </Box>
      </Box>
    </>
  );
}
