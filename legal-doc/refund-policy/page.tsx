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
import LanguageIcon from "@mui/icons-material/Language";

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
          h3: {
            fontSize: "1.25rem",
            fontWeight: 600,
            color: "#495057",
            marginTop: "24px",
            marginBottom: "12px",
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
              Refund and Cancellation Policy
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
              This Policy outlines the terms for refunds and cancellations for
              our SaaS subscriptions.
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
              This Refund and Cancellation Policy ("Policy") outlines the terms
              under which Turtle Software Private Limited ("Turtle Software",
              "we", "us", or "our") offers refunds and handles service
              cancellations for its Software as a Service (SaaS) subscriptions.
            </Typography>
            <Typography variant="body1" sx={{ mt: 2, fontWeight: "medium" }}>
              By subscribing to our Services, you agree to this Policy.
            </Typography>
          </Box>

          <main>
            <Section title="1. Subscription and Payment Terms">
              <List sx={{ listStyleType: "disc", pl: 4, py: 0 }}>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="All subscriptions are billed annually in advance."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="The subscription term begins from the date of payment confirmation."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="The services are deemed to be delivered continuously and proportionally over the subscription period."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
              </List>
            </Section>

            <Section title="2. Cancellation and Refunds">
              <Typography variant="h3" component="h3">
                a. Within First 2 Months of Contract
              </Typography>
              <List sx={{ listStyleType: "disc", pl: 4, py: 0 }}>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="Customers may cancel their subscription within the first 60 calendar days from the start of the subscription term."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="In such cases, a pro-rated refund will be issued based on the unused subscription period, after deducting the charges for the usage period."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="Example: If the subscription is canceled after 45 days, the customer will be refunded the value of the remaining 320 days (365 - 45), on a pro-rata basis."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
              </List>

              <Typography variant="h3" component="h3">
                b. After 2 Months of Contract
              </Typography>
              <List sx={{ listStyleType: "disc", pl: 4, py: 0 }}>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="Cancellations made after 60 calendar days are subject to a cancellation penalty."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="The penalty amount is the lesser of the remaining subscription fee or 3 months' subscription fee."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="Any remaining amount (if any) after deducting the penalty will be refunded."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="Example: If 9 months remain: 3-month fee will be charged as penalty, 6 months refunded. If 2 months remain: only 2 months’ fee is charged (no refund due)."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
              </List>
            </Section>

            <Section title="3. How to Request a Cancellation">
              <List sx={{ listStyleType: "disc", pl: 4, py: 0 }}>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary={
                      <span>
                        All cancellation requests must be sent in writing to{" "}
                        <Link
                          href="mailto:billing@turtlesoftware.in"
                          color="secondary"
                        >
                          billing@turtlesoftware.in
                        </Link>{" "}
                        from the registered account email.
                      </span>
                    }
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="Refunds (if applicable) will be processed within 15 business days from the date of approval and credited to the original method of payment."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
              </List>
            </Section>

            <Section title="4. Non-Refundable Cases">
              <Typography variant="body1" sx={{ mb: 2 }}>
                Refunds will not be provided in the following cases:
              </Typography>
              <List sx={{ listStyleType: "disc", pl: 4, py: 0 }}>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="Cancellations requested after the subscription has expired."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="Terminations due to breach of our Terms and Conditions or Acceptable Use Policy."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="Partial use or non-use of services without a formal cancellation request."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
              </List>
            </Section>

            <Section title="5. Changes to the Policy">
              <Typography variant="body1">
                We reserve the right to update or modify this Refund and
                Cancellation Policy at any time. Any changes will be posted on
                our website and will be effective from the date of posting.
              </Typography>
            </Section>

            <Section title="6. Contact Us">
              <Typography variant="body1" sx={{ mb: 2 }}>
                If you have any questions regarding this policy, please contact:
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
                  <ListItem disablePadding sx={{ mt: 1 }}>
                    <ListItemIcon>
                      <EmailIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>
                      <Link
                        href="mailto:refunds@turtlesoftware.in"
                        color="secondary"
                        sx={{ fontWeight: "medium" }}
                      >
                        refunds@turtlesoftware.in
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
                  <ListItem disablePadding sx={{ mt: 1 }}>
                    <ListItemIcon>
                      <LanguageIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>
                      <Link
                        href="https://www.turtlesoftware.co"
                        color="secondary"
                        sx={{ fontWeight: "medium" }}
                      >
                        www.turtlesoftware.co
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
                  onClick={() => router.push("https://devstore.turtleit.in/turtlesoftware/store")}
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
