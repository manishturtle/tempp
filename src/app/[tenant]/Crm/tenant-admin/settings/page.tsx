"use client";
import {
  Box,
  Typography,
  Divider,
  Card,
  CardContent,
  Grid,
  Breadcrumbs,
  Link,
} from "@mui/material";
import DescriptionIcon from "@mui/icons-material/Description";
import { useRouter, usePathname } from "next/navigation";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";

const SettingsPage = () => {
  const pathname = usePathname();
  const router = useRouter();
  const tenantSlug = pathname?.split("/")[1];

  const handleNavigation = (path: string) => {
    if (!path) return;
    switch (path) {
      case "invoices":
        router.push(`/${tenantSlug}/Crm/tenant-admin/settings/invoices`);
        break;
      default:
        break;
    }
  };
  return (
    <Box>
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        aria-label="breadcrumb"
        sx={{ mb: 3 }}
      >
        <Link
          color="inherit"
          href={`/${tenantSlug}/Crm`}
          onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
            e.preventDefault();
            router.push(`/${tenantSlug}/Crm`);
          }}
        >
          Dashboard
        </Link>
        <Typography color="text.primary">Settings</Typography>
      </Breadcrumbs>
      <Typography variant="h5">Setting Configurations</Typography>
      <Divider />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 8, md: 6, lg: 4 }}>
          <Card
            sx={{
              boxShadow: "none",
              border: "1px solid #E0E0E0",
              borderRadius: "8px",
              "&:hover": {
                boxShadow: "none",
                cursor: "pointer",
                "& .MuiTypography-h6": {
                  color: "primary.main",
                  textDecoration: "underline",
                  cursor: "pointer",
                },
              },
            }}
            onClick={() => handleNavigation("invoices")}
          >
            <CardContent
              sx={{
                display: "flex",
                alignItems: "center",
              }}
            >
              <Box
                sx={{
                  mr: 2,
                  backgroundColor: "primary.main",
                  color: "primary.contrastText",
                  p: 1,
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <DescriptionIcon />
              </Box>
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    mb: "0px",
                    transition:
                      "color 0.2s ease-in-out, text-decoration 0.2s ease-in-out",
                    "&:hover, .MuiCard-root:hover &": {
                      color: "primary.main",
                      textDecoration: "underline",
                      cursor: "pointer",
                    },
                  }}
                  onClick={() => handleNavigation("invoices")}
                >
                  Invoice Configurations
                </Typography>
                <Typography sx={{ mb: "0px", color: "#666", fontSize: "13px" }}>
                  Invoice configurations
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SettingsPage;
