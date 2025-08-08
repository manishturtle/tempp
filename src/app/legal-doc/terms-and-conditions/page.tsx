"use client";

import React, { useMemo } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Link from "@mui/material/Link";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import Grid from "@mui/material/Grid";
import Divider from "@mui/material/Divider";
import { useRouter } from "next/navigation";

// --- Icons ---
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import LocationOnIcon from "@mui/icons-material/LocationOn";

// --- Main App Component ---
function App() {
    const router = useRouter();
  // Define a new theme based on the Turtle Software logo's branding
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: "light",
          primary: {
            main: "#6A11CB", // Purple from the logo
          },
          secondary: {
            main: "#2575FC", // Cyan/Blue from the logo
          },
          background: {
            default: "#f8f9fa", // A very light, clean gray
            paper: "#ffffff",
          },
          text: {
            primary: "#212529", // A standard dark color for readability
            secondary: "#6c757d",
          },
        },
        typography: {
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          h1: {
            fontSize: "3rem",
            fontWeight: 700,
            color: "#ffffff",
            textAlign: "center",
            "@media (max-width:600px)": {
              fontSize: "2.2rem",
            },
          },
          h2: {
            fontSize: "1.75rem",
            fontWeight: 600,
            color: "#343a40",
            marginTop: "40px",
            marginBottom: "20px",
            borderBottom: "2px solid #dee2e6",
            paddingBottom: "8px",
          },
          body1: {
            fontSize: "1rem",
            lineHeight: 1.7,
            color: "#495057",
          },
          body2: {
            fontSize: "0.9rem",
            lineHeight: 1.6,
            color: "#6c757d",
          },
        },
        components: {
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundColor: "#ffffff",
                color: "#343a40",
                boxShadow: "none",
                borderBottom: "1px solid #e0e0e0",
              },
            },
          },
          MuiListItemIcon: {
            styleOverrides: {
              root: {
                minWidth: "40px",
                color: "#2575FC", // Using the secondary color for icons
              },
            },
          },
        },
      }),
    []
  );

  // --- Section Component for consistent styling ---
  const Section = ({ title, children }) => (
    <Box component="section" sx={{ mb: 5 }}>
      <Typography variant="h2">{title}</Typography>
      {children}
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ bgcolor: "background.default" }}>
        {/* --- Gradient Hero Section --- */}
        <Box
          sx={{
            background: "linear-gradient(90deg, #6A11CB 0%, #2575FC 100%)",
            color: "primary.contrastText",
            py: { xs: 6, md: 8 },
            px: 2,
          }}
        >
          <Container maxWidth="md">
            <Typography variant="h1" component="h1">
              Privacy Statement
            </Typography>
            <Typography
              variant="h6"
              component="p"
              sx={{
                mt: 2,
                textAlign: "center",
                fontWeight: 300,
                color: "rgba(255,255,255,0.9)",
              }}
            >
              Your privacy is important to us. This statement explains the
              personal data we process, how we process it, and for what
              purposes.
            </Typography>
          </Container>
        </Box>

        {/* --- Main Content (No Paper Background) --- */}
        <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
          <Box sx={{ mb: 4 }}>
            <Typography variant="body2" color="text.secondary">
              Effective Date: 01 April 2025
            </Typography>
            <Typography variant="body1" sx={{ mt: 2 }}>
              Turtle Software Private Limited ("Turtle Software", "we", "us", or
              "our") is committed to protecting your privacy. This Privacy
              Statement explains how we collect, use, disclose, and safeguard
              your information when you use our Software as a Service (SaaS)
              platform, websites, and related services (collectively, the
              "Services").
            </Typography>
            <Typography variant="body1" sx={{ mt: 2, fontWeight: "medium" }}>
              By using our Services, you agree to the practices described in
              this Privacy Statement.
            </Typography>
          </Box>

          <main>
            <Section title="1. Information We Collect">
              <Typography variant="body1" sx={{ mb: 2 }}>
                We may collect the following types of personal and usage data:
              </Typography>
              <List dense>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText
                    primaryTypographyProps={{ fontWeight: "medium" }}
                    primary="Account Information"
                    secondary="Name, email address, phone number, company name, billing information."
                  />
                </ListItem>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText
                    primaryTypographyProps={{ fontWeight: "medium" }}
                    primary="Usage Data"
                    secondary="IP address, browser type, pages visited, time spent on pages, and other diagnostic data."
                  />
                </ListItem>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText
                    primaryTypographyProps={{ fontWeight: "medium" }}
                    primary="Customer Data"
                    secondary="Any data that you or your users upload, transmit, or store within our platform."
                  />
                </ListItem>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText
                    primaryTypographyProps={{ fontWeight: "medium" }}
                    primary="Communication Data"
                    secondary="Correspondence you send to us, including support inquiries, feedback, or other messages."
                  />
                </ListItem>
              </List>
            </Section>

            <Section title="2. How We Use Your Information">
              <Typography variant="body1" sx={{ mb: 2 }}>
                We use the collected information for the following purposes:
              </Typography>
              <List sx={{ listStyleType: "disc", pl: 4, py: 0 }}>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="To provide and maintain our Services."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="To process transactions and manage customer accounts."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="To monitor usage and improve the performance of our platform."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="To send important updates, security alerts, and support communications."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="To comply with legal obligations."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
              </List>
            </Section>

            <Section title="3. Sharing of Information">
              <Typography variant="body1" sx={{ mb: 2 }}>
                We do not sell your personal data. We may share data with:
              </Typography>
              <List dense>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText
                    primary="Service Providers"
                    secondary="Assisting with hosting, analytics, customer support, etc."
                  />
                </ListItem>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText
                    primary="Regulatory Authorities"
                    secondary="Or legal entities when required to comply with laws."
                  />
                </ListItem>
                <ListItem sx={{ pl: 0 }}>
                  <ListItemText
                    primary="Business Transfers"
                    secondary="In case of mergers, acquisitions, or asset sales."
                  />
                </ListItem>
              </List>
              <Typography variant="body2" sx={{ mt: 1 }}>
                All third parties are bound by confidentiality and data
                protection obligations.
              </Typography>
            </Section>

            <Section title="4. Data Security">
              <Typography variant="body1">
                We implement appropriate technical and organizational measures
                to safeguard your data against unauthorized access, loss, or
                alteration. These include data encryption, access controls, and
                regular audits.
              </Typography>
            </Section>

            <Section title="5. Data Retention">
              <Typography variant="body1">
                We retain personal and customer data as long as necessary to
                fulfill the purposes outlined in this statement or as required
                by law.
              </Typography>
            </Section>

            <Section title="6. Your Rights">
              <Typography variant="body1" sx={{ mb: 2 }}>
                Depending on your location, you may have rights under applicable
                data protection laws, including:
              </Typography>
              <List sx={{ listStyleType: "disc", pl: 4, py: 0 }}>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="The right to access, correct, or delete your personal data."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="The right to object to or restrict certain processing."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="The right to data portability."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="The right to withdraw consent at any time."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
              </List>
              <Typography variant="body1" sx={{ mt: 2 }}>
                To exercise your rights, please contact us at{" "}
                <Link
                  href="mailto:privacy@turtlesoftware.in"
                  color="secondary"
                  sx={{ fontWeight: "medium" }}
                >
                  privacy@turtlesoftware.in
                </Link>
                .
              </Typography>
            </Section>

            <Section title="7. Cookies and Tracking Technologies">
              <Typography variant="body1">
                We may use cookies and similar technologies to analyze usage
                patterns, remember user preferences, and improve user
                experience. You can control cookie preferences via your browser
                settings.
              </Typography>
            </Section>

            <Section title="8. International Data Transfers">
              <Typography variant="body1">
                Your data may be transferred to and processed in India or other
                countries. We ensure appropriate safeguards are in place for
                such transfers.
              </Typography>
            </Section>

            <Section title="9. Changes to This Statement">
              <Typography variant="body1">
                We may update this Privacy Statement periodically. Changes will
                be posted on this page with a revised "Effective Date."
              </Typography>
            </Section>

            <Section title="10. Contact Us">
              <Typography variant="body1" sx={{ mb: 2 }}>
                If you have any questions, please contact us:
              </Typography>
              <Box
                sx={{ p: 3, border: "1px solid #dee2e6", borderRadius: "8px" }}
              >
                <Typography
                  variant="h6"
                  component="h3"
                  sx={{ mb: 2, color: "#343a40", fontWeight: 600 }}
                >
                  Turtle Software Private Limited
                </Typography>
                <List dense>
                  <ListItem disablePadding>
                    <ListItemIcon>
                      <LocationOnIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="1011 Iconic Shyamal, Nehrunagar, Ahmedabad 380014" />
                  </ListItem>
                  <ListItem disablePadding sx={{ mt: 1 }}>
                    <ListItemIcon>
                      <EmailIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>
                      <Link
                        href="mailto:privacy@turtlesoftware.in"
                        color="secondary"
                        sx={{ fontWeight: "medium" }}
                      >
                        privacy@turtlesoftware.in
                      </Link>
                    </ListItemText>
                  </ListItem>
                  <ListItem disablePadding sx={{ mt: 1 }}>
                    <ListItemIcon>
                      <PhoneIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>
                      <Link
                        href="tel:+919763327074"
                        color="secondary"
                        sx={{ fontWeight: "medium" }}
                      >
                        +91 97633 27074
                      </Link>
                    </ListItemText>
                  </ListItem>
                </List>
              </Box>
            </Section>
          </main>
        </Container>

        {/* --- Modern Footer --- */}
        <Box
          component="footer"
          sx={{
            background: "linear-gradient(90deg, #6A11CB 0%, #2575FC 100%)",
            color: "white",
            py: { xs: 4, sm: 6 },
            px: 2,
          }}
        >
          <Container maxWidth="lg">
            <Grid container spacing={4} justifyContent="space-between">
              <Grid item xs={12} md={5}>
              <Box
                  component="img"
                  sx={{
                    height: 50,
                    mb: 2,
                  }}
                  alt="Turtle Software Logo"
                  src="/images/turtle_logo_white.png" // Transparent placeholder
                />
                <Typography
                  variant="body2"
                  sx={{ color: "rgba(255,255,255,0.8)" }}
                >
                  Modern solutions for modern businesses. We build software that
                  empowers teams and drives growth.
                </Typography>
              </Grid>
              <Grid item xs={6} sm={4} md={3}>
                <Typography
                  variant="h6"
                  gutterBottom
                  onClick={() => router.push("https://store.turtleit.in/turtlesoftware/store")}
                  sx={{ fontWeight: "bold", fontSize: "1rem" }}
                >
                  Product
                </Typography>
                <Link
                  href="#"
                  color="inherit"
                  display="block"
                  sx={{
                    mb: 1,
                    textDecoration: "none",
                    opacity: 0.8,
                    "&:hover": { opacity: 1 },
                  }}
                >
                  Features
                </Link>
                <Link
                  href="#"
                  color="inherit"
                  display="block"
                  sx={{
                    mb: 1,
                    textDecoration: "none",
                    opacity: 0.8,
                    "&:hover": { opacity: 1 },
                  }}
                >
                  Pricing
                </Link>
                <Link
                  href="#"
                  color="inherit"
                  display="block"
                  sx={{
                    mb: 1,
                    textDecoration: "none",
                    opacity: 0.8,
                    "&:hover": { opacity: 1 },
                  }}
                >
                  Docs
                </Link>
              </Grid>
              <Grid item xs={6} sm={4} md={3}>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ fontWeight: "bold", fontSize: "1rem" }}
                >
                  Legal
                </Typography>
                <Link
                  href="#"
                  color="inherit"
                  display="block"
                  sx={{
                    mb: 1,
                    textDecoration: "none",
                    opacity: 0.8,
                    "&:hover": { opacity: 1 },
                  }}
                >
                  Terms of Service
                </Link>
                <Link
                  href="#"
                  color="inherit"
                  display="block"
                  sx={{
                    mb: 1,
                    textDecoration: "none",
                    opacity: 0.8,
                    "&:hover": { opacity: 1 },
                  }}
                >
                  Privacy Policy
                </Link>
                <Link
                  href="#"
                  color="inherit"
                  display="block"
                  sx={{
                    mb: 1,
                    textDecoration: "none",
                    opacity: 0.8,
                    "&:hover": { opacity: 1 },
                  }}
                >
                  Refund Policy
                </Link>
              </Grid>
            </Grid>
            <Divider sx={{ my: 4, bgcolor: "rgba(255, 255, 255, 0.2)" }} />
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Typography
                variant="body2"
                sx={{ color: "rgba(255,255,255,0.8)" }}
              >
                © {new Date().getFullYear()} Turtle Software Private Limited.
              </Typography>
            </Box>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
