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
              Terms and Conditions
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
              Welcome to Turtle Software Private Limited. These Terms govern
              your access to and use of our Services.
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
              Welcome to Turtle Software Private Limited (“Turtle Software”,
              “we”, “our”, or “us”). These Terms and Conditions (“Terms”) govern
              your access to and use of our Software as a Service (SaaS)
              products, websites, mobile applications, APIs, and related
              services (collectively, the “Services”). By accessing or using the
              Services, you agree to be bound by these Terms. If you do not
              agree, please do not use our Services.
            </Typography>
          </Box>

          <main>
            <Section title="1. Use of Services">
              <List sx={{ listStyleType: "disc", pl: 4, py: 0 }}>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="You must be at least 18 years old and have the legal authority to enter into these Terms."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="You agree to use the Services only for lawful purposes and in accordance with these Terms."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="You are responsible for maintaining the confidentiality of your account credentials and all activities under your account."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
              </List>
            </Section>

            <Section title="2. Account Registration">
              <List sx={{ listStyleType: "disc", pl: 4, py: 0 }}>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="To use certain features of the Services, you may be required to create an account."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="You agree to provide accurate, complete, and up-to-date information."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="You are responsible for any activity that occurs under your account."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
              </List>
            </Section>

            <Section title="3. Subscription and Payment">
              <List sx={{ listStyleType: "disc", pl: 4, py: 0 }}>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="Access to the Services may require a paid subscription. Details, including pricing and billing terms, will be provided at the time of subscription."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="All payments are non-refundable unless explicitly stated otherwise."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="We reserve the right to change fees or introduce new charges with reasonable notice."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
              </List>
            </Section>

            <Section title="4. Intellectual Property">
              <List sx={{ listStyleType: "disc", pl: 4, py: 0 }}>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="All rights, title, and interest in and to the Services, including software, designs, trademarks, logos, and all intellectual property, remain the exclusive property of Turtle Software or its licensors."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="You may not copy, modify, distribute, sell, or lease any part of our Services unless explicitly authorized in writing."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
              </List>
            </Section>

            <Section title="5. Acceptable Use">
              <Typography variant="body1" sx={{ mb: 2 }}>
                You agree not to:
              </Typography>
              <List sx={{ listStyleType: "disc", pl: 4, py: 0 }}>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="Use the Services for any unlawful or unauthorized purpose."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="Attempt to gain unauthorized access to our systems or networks."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="Transmit any viruses, malware, or other harmful code."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="Reverse engineer or decompile the software."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
              </List>
            </Section>

            <Section title="6. Data and Privacy">
              <List sx={{ listStyleType: "disc", pl: 4, py: 0 }}>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary={
                      <span>
                        By using our Services, you acknowledge and agree to our{" "}
                        <Link href="#" color="secondary">
                          Privacy Statement
                        </Link>
                        .
                      </span>
                    }
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="We take appropriate security measures to protect your data but cannot guarantee complete security."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
              </List>
            </Section>

            <Section title="7. Termination">
              <Typography variant="body1" sx={{ mb: 2 }}>
                We may suspend or terminate your access to the Services at our
                sole discretion, without notice, if:
              </Typography>
              <List sx={{ listStyleType: "disc", pl: 4, py: 0 }}>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="You breach these Terms;"
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="Your account is inactive for an extended period;"
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="Required by law or court order."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
              </List>
              <Typography variant="body1" sx={{ mt: 2 }}>
                Upon termination, your right to use the Services will cease
                immediately.
              </Typography>
            </Section>

            <Section title="8. Warranties and Disclaimers">
              <List sx={{ listStyleType: "disc", pl: 4, py: 0 }}>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="The Services are provided “as is” and “as available” without warranties of any kind."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="We do not guarantee the Services will be error-free or uninterrupted."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
                <ListItem sx={{ display: "list-item", p: 0, pl: 1 }}>
                  <ListItemText
                    primary="To the fullest extent permitted by law, we disclaim all warranties, express or implied, including merchantability, fitness for a particular purpose, and non-infringement."
                    primaryTypographyProps={{ variant: "body1" }}
                  />
                </ListItem>
              </List>
            </Section>

            <Section title="9. Limitation of Liability">
              <Typography variant="body1">
                To the maximum extent permitted by applicable law, Turtle
                Software shall not be liable for any indirect, incidental,
                special, consequential, or punitive damages, including loss of
                profits, data, or goodwill, arising out of or related to your
                use of the Services.
              </Typography>
            </Section>

            <Section title="10. Modifications to Terms">
              <Typography variant="body1">
                We reserve the right to modify these Terms at any time. If
                changes are made, we will post the revised Terms on our website
                and update the effective date. Continued use of the Services
                after changes constitutes your acceptance of the revised Terms.
              </Typography>
            </Section>

            <Section title="11. Governing Law">
              <Typography variant="body1">
                These Terms are governed by the laws of India. Any disputes
                arising from or related to these Terms or the use of our
                Services shall be subject to the exclusive jurisdiction of the
                courts in Ahmedabad, India.
              </Typography>
            </Section>

            <Section title="12. Contact Us">
              <Typography variant="body1" sx={{ mb: 2 }}>
                For questions or concerns about these Terms, please contact:
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
                    <ListItemText primary="1011 Iconic Shyamal, Shyamal Cross Road, Nehrunagar, Ahmedabad 380014" />
                  </ListItem>
                  <ListItem disablePadding sx={{ mt: 1 }}>
                    <ListItemIcon>
                      <EmailIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>
                      <Link
                        href="mailto:tnc@turtlesoftware.co"
                        color="secondary"
                        sx={{ fontWeight: "medium" }}
                      >
                        tnc@turtlesoftware.co
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
