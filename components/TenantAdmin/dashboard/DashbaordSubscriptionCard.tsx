"use client";

import {
  Box,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Button,
  useTheme,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

interface SubscriptionPlan {
  id?: number;
  name?: string;
  price?: string;
  max_users?: number;
  description?: string;
  session_type?: string;
  storage_limit?: number;
  support_level?: string;
  api_call_limit?: number;
  transaction_limit?: number;
}

interface Subscription {
  license_id?: number;
  plan_id?: number;
  plan_name?: string;
  plan_description?: string;
  valid_from?: string;
  valid_until?: string | null;
  license_status?: string;
  subscription_plan?: SubscriptionPlan;
}

interface Application {
  app_id?: number;
  name?: string;
  description?: string;
  is_active?: boolean;
  app_default_url?: string;
  created_at?: string;
  user_count?: number;
  users_count_current?: number;
  users_assigned?: number;
  subscription?: Subscription;
}

interface DashboardSubscriptionCardProps {
  // New props structure
  application?: Application;
  // Old props structure (for backward compatibility)
  title?: string;
  plan?: string;
  assigned?: number;
  total?: number;
  status?: string;
  appUrl?: string;
}

export const DashbaordSubscriptionCard = ({
  application,
  // Old props
  title,
  plan,
  assigned,
  total,
  status,
  appUrl,
}: DashboardSubscriptionCardProps) => {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();

  // Use new or old prop structure
  const appName = application?.name || title || "Application";
  const planName = application?.subscription?.plan_name || plan || "Plan";
  const maxUsers =
    application?.subscription?.subscription_plan?.max_users || total || 0;
  const assignedUsers =
    application?.user_count ||
    application?.users_count_current ||
    assigned ||
    0;
  const licenseStatus =
    application?.subscription?.license_status || status || "inactive";
  const licenseId = application?.subscription?.license_id;
  const url = application?.app_default_url || appUrl; // Use either from application or direct prop

  const usagePercentage =
    maxUsers > 0 ? Math.round((assignedUsers / maxUsers) * 100) : 0;

  const handleViewUsage = () => {
    if (licenseId) {
      router.push(`/tenant-admin/subscriptions/${licenseId}`);
    }
  };

  return (
    <Card
      sx={{
        borderRadius: 2,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        "&:hover": {
          boxShadow: "none",
        },
        boxShadow: "none",
        border: "2px solid",
        borderColor: "divider",
      }}
    >
      <CardContent sx={{ flex: 1, p: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: "primary.main",
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: "bold",
                fontSize: "1.25rem",
              }}
            >
              {appName?.charAt(0) || "A"}
            </Box>
            <Box>
              <Typography variant="body1" fontWeight="medium">
                {appName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {planName}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                bgcolor:
                  licenseStatus === "active"
                    ? "success.light"
                    : "warning.light",
                color: "white",
                px: 1,
                py: 0.5,
                borderRadius: 1,
                fontSize: "0.75rem",
                fontWeight: "medium",
                textTransform: "capitalize",
                minWidth: 60,
                textAlign: "center",
              }}
            >
              {licenseStatus}
            </Box>
            <Box
              component="a"
              href={url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (!url) {
                  e.preventDefault();
                  console.log("No URL provided for", appName);
                } else {
                  console.log("Navigating to:", url);
                }
              }}
              sx={{
                color: url ? "primary.main" : "text.disabled",
                textDecoration: "none",
                fontSize: "0.75rem",
                fontWeight: "bold",
                cursor: url ? "pointer" : "default",
                "&:hover": {
                  textDecoration: url ? "underline" : "none",
                  "& .MuiSvgIcon-root": {
                    transform: url ? "translateX(2px)" : "none",
                  },
                },
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                transition: "all 0.2s ease-in-out",
                pointerEvents: url ? "auto" : "none",
              }}
            >
              {t("Go to app")}
              <OpenInNewIcon
                sx={{
                  fontSize: "0.9rem",
                  transition: "transform 0.2s ease-in-out",
                }}
              />
            </Box>
          </Box>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Box
            sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}
          >
            <Typography variant="body2" color="text.secondary">
              {t("Users")}: {assignedUsers} / {maxUsers} {t("Assigned")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {usagePercentage}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(usagePercentage, 100)}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: theme.palette.grey[200],
              "& .MuiLinearProgress-bar": {
                borderRadius: 4,
                backgroundColor: theme.palette.primary.main,
              },
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
};
