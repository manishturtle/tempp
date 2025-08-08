import React, { useState } from "react";
import { Theme } from "@mui/material/styles";
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Chip,
  CssBaseline,
  ThemeProvider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Button,
  Divider,
  useTheme,
} from "@mui/material";
import {
  AccountTree,
  ListAlt,
  Workspaces,
  BusinessCenter,
  Category,
  Ballot,
  ArrowForward,
  Close as CloseIcon,
  ChevronRight,
} from "@mui/icons-material";

// Keyframes for animations
const keyframes = `
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(15px); }
    to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeInRight {
    from { opacity: 0; transform: translateX(-20px); }
    to { opacity: 1; transform: translateX(0); }
}
`;

// A more visually distinct card for configuration objects
const ConfigObjectCard = ({
  icon,
  title,
  description,
  example,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  example: string;
}) => (
  <Paper
    variant="outlined"
    sx={{
      p: 2.5,
      height: "100%",
      borderColor: "rgba(0, 0, 0, 0.08)",
      borderRadius: "12px",
      transition: "transform 0.3s ease, box-shadow 0.3s ease",
      display: "flex",
      flexDirection: "column",
      "&:hover": {
        transform: "translateY(-6px)",
        boxShadow: "0 12px 24px -4px rgba(23, 43, 77, 0.12)",
      },
    }}
  >
    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "primary.main",
          color: "white",
          mr: 2,
        }}
      >
        {icon}
      </Box>
      <Typography variant="h6" component="h3">
        {title}
      </Typography>
    </Box>
    <Typography variant="body2" sx={{ mb: 2, flexGrow: 1 }}>
      {description}
    </Typography>
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 1,
        mt: "auto",
        pt: 1,
      }}
    >
      <Typography
        variant="caption"
        sx={{ fontStyle: "italic", color: "primary.main" }}
      >
        Example:
      </Typography>
      <Chip
        label={example}
      />
    </Box>
  </Paper>
);

// A more compact component for the 3-step configuration flow
const ProcessStep = ({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) => (
  <Box sx={{ textAlign: "center" }}>
    <Box
      sx={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        bgcolor: "primary.main",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        mx: "auto",
        mb: 1.5,
        fontSize: "1.4rem",
        fontWeight: 700,
        boxShadow: "0 4px 12px rgba(0, 82, 204, 0.35)",
      }}
    >
      {number}
    </Box>
    <Typography
      variant="h6"
      gutterBottom
      sx={{ fontSize: "1rem", lineHeight: 1.2, minHeight: "32px" }}
    >
      {title}
    </Typography>
    <Box sx={{ color: "text.secondary", fontSize: "0.8rem", lineHeight: 1.4 }}>
      {children}
    </Box>
  </Box>
);

// The main content component with improved layout
const HowItWorksContent = ({ theme }: { theme: Theme }) => (
  <>
    <Box
      sx={{
        textAlign: "center",
        mb: 3,
        animation: "fadeIn 0.5s ease-out",
        mt: 3,
      }}
    >
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ maxWidth: "750px", margin: "auto" }}
      >
        This section guides you through configuring your service management
        system. Our robust, multi-layered framework connects the services you
        offer to the underlying operational processes, ensuring every service
        ticket is accurately categorized, routed, and efficiently resolved.
      </Typography>
    </Box>

    <Divider sx={{ mb: 3 }}>
      <Chip label="Configuration Process" />
    </Divider>

    <Box sx={{ mb: 6, animation: "fadeIn 0.7s ease-out" }}>
      {/* <Typography variant="h4" component="h2">
        Configuration Process Flow (Recommended Order)
      </Typography> */}
      <Typography color="text.secondary" sx={{ mb: 4, textAlign: "center" }}>
        To ensure a logical setup, we recommend building your system from the
        ground up:
      </Typography>
      <Grid
        container
        spacing={{ xs: 1, md: 2 }}
        alignItems="center"
        justifyContent="center"
      >
        <Grid size={{ xs: 3.5, md: 3.5 }}>
          <ProcessStep number="1" title="Define Operations">
            <>
              <strong>Process Groups, Processes,</strong> &amp;{" "}
              <strong>SOPs</strong>
              <br />
              define internal workflows.
            </>
          </ProcessStep>
        </Grid>
        <Grid
          size={1}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ChevronRight
            sx={{ fontSize: { xs: 28, md: 40 }, color: "rgba(0,0,0,0.2)" }}
          />
        </Grid>
        <Grid size={{ xs: 3.5, md: 3.5 }}>
          <ProcessStep number="2" title="Define Services">
            <>
              <strong>Functions, Service Categories,</strong> &amp;{" "}
              <strong>Subcategories</strong>
              <br />
              define what you offer.
            </>
          </ProcessStep>
        </Grid>
        <Grid
          size={1}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ChevronRight
            sx={{ fontSize: { xs: 28, md: 40 }, color: "rgba(0,0,0,0.2)" }}
          />
        </Grid>
        <Grid size={{ xs: 3, md: 3 }}>
          <ProcessStep number="3" title="Link Them">
            <>
              Connect <strong>Service Subcategories</strong>
              <br />
              to their corresponding <strong>SOPs</strong>.
            </>
          </ProcessStep>
        </Grid>
      </Grid>
    </Box>

    <Divider sx={{ mb: 3 }}>
      <Chip label="Configuration Objects" />
    </Divider>

    <Box sx={{ mb: 6, animation: "fadeIn 0.9s ease-out" }}>
      <Typography variant="h4" component="h2">
        Understanding Each Configuration Object
      </Typography>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }} sx={{ display: "flex" }}>
          <ConfigObjectCard
            icon={<Workspaces />}
            title="Process Group"
            description="A high-level grouping of related operational activities."
            example="IT Operations Management"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }} sx={{ display: "flex" }}>
          <ConfigObjectCard
            icon={<AccountTree />}
            title="Process"
            description="A sequence of steps to achieve an operational objective."
            example="Incident Resolution"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }} sx={{ display: "flex" }}>
          <ConfigObjectCard
            icon={<ListAlt />}
            title="SOP"
            description="Detailed, step-by-step instructions for a specific Process."
            example="SOP: Set up Email Account"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }} sx={{ display: "flex" }}>
          <ConfigObjectCard
            icon={<BusinessCenter />}
            title="Function"
            description="An organizational unit responsible for delivering services."
            example="Human Resources"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }} sx={{ display: "flex" }}>
          <ConfigObjectCard
            icon={<Category />}
            title="Service Category"
            description="A broad grouping of service requests offered by a Function."
            example="Recruitment Services"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }} sx={{ display: "flex" }}>
          <ConfigObjectCard
            icon={<Ballot />}
            title="Service Subcategory"
            description="The most specific classification for a service request, linked to an SOP."
            example="Executive Management Hiring"
          />
        </Grid>
      </Grid>
    </Box>

    <Divider sx={{ mb: 3 }}>
      <Chip label="Ticket Resolution Flow" />
    </Divider>

    <Box sx={{ animation: "fadeIn 1.1s ease-out" }}>
      <Typography variant="h4" component="h2">
        How Your Configuration Works for Service Tickets
      </Typography>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          mt: 4,
          p: 3,
          bgcolor: "#f4f5f7",
          borderRadius: "12px",
        }}
      >
        {["Service Subcategory", "SOP", "Process", "Process Group"].map(
          (item, index) => (
            <React.Fragment key={item}>
              <Paper
                elevation={2}
                sx={{
                  p: 2,
                  textAlign: "center",
                  width: "100%",
                  maxWidth: 180,
                  borderRadius: "8px",
                  border: `1px solid ${theme.palette.primary.main}`,
                  animation: `fadeInRight 0.5s ease-out ${index * 0.2}s forwards`,
                  opacity: 1, // Changed from 0 to 1 to ensure visibility
                }}
              >
                <Typography variant="subtitle1" fontWeight="bold">
                  {item}
                </Typography>
              </Paper>
              {index < 3 && (
                <ArrowForward
                  sx={{
                    fontSize: 40,
                    color: "secondary.main",
                    transform: { xs: "rotate(90deg)", md: "none" },
                    my: { xs: 2, md: 0 },
                    opacity: 1, // Changed from 0 to 1 to ensure visibility
                    animation: `fadeInRight 0.5s ease-out ${index * 0.2 + 0.1}s forwards`,
                  }}
                />
              )}
            </React.Fragment>
          )
        )}
      </Box>
    </Box>
  </>
);

// The Dialog component wrapper
export const HowItWorksDialog = ({
  open,
  handleClose,
  theme,
}: {
  open: boolean;
  handleClose: () => void;
  theme: Theme;
}) => {
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { bgcolor: "background.paper" } }}
    >
      <DialogTitle
        sx={{
          m: 0,
          p: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          bgcolor: "background.default",
          borderBottom: "1px solid rgba(0,0,0,0.12)",
        }}
      >
        <Typography variant="h2" component="div">
          How It Works
        </Typography>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{ color: "text.secondary" }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <HowItWorksContent theme={theme} />
      </DialogContent>
      <DialogActions
        sx={{
          p: "16px 24px",
          bgcolor: "background.default",
          borderTop: "1px solid rgba(0,0,0,0.12)",
        }}
      >
        <Button onClick={handleClose} variant="contained" color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Preview component for development purposes
export function HowItWorksPreview() {
  const [open, setOpen] = useState(true); // Default to open for immediate preview
  const handleClose = () => setOpen(false);
  const theme = useTheme();
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <style>{keyframes}</style>
      <Container
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          textAlign: "center",
          bgcolor: "background.default",
        }}
      >
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={() => setOpen(true)}
        >
          Show 'How It Works'
        </Button>
      </Container>
      <HowItWorksDialog open={open} handleClose={handleClose} theme={theme} />
    </ThemeProvider>
  );
}
