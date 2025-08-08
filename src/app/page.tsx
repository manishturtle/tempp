"use client";

import React, { useState } from "react";
import Link from "next/link";

import {
  ThemeProvider,
  createTheme,
  responsiveFontSizes,
} from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Container,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  ListItemIcon,
  Paper,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import HandymanOutlinedIcon from "@mui/icons-material/HandymanOutlined";
import BoltOutlinedIcon from "@mui/icons-material/BoltOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import AccessTime from "@mui/icons-material/AccessTime";
import TrendingUp from "@mui/icons-material/TrendingUp";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import CloudDoneOutlined from "@mui/icons-material/CloudDoneOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";

// --- THEME ---
let theme = createTheme({
  palette: {
    primary: {
      main: "hsl(222.2, 47.4%, 11.2%)", // #111827
      light: "hsla(222, 47%, 11%, 0.05)",
    },
    secondary: {
      main: "hsl(210, 40%, 96.1%)", // #f3f4f6
      contrastText: "hsl(222.2, 47.4%, 11.2%)",
    },
    background: {
      default: "#ffffff",
      paper: "#ffffff",
    },
    text: {
      primary: "hsl(222.2, 84%, 4.9%)", // #030712
      secondary: "hsl(215.4, 16.3%, 46.9%)", // #6b7280
    },
    success: {
      main: "#16a34a", // Green for checkmarks
    },
    grey: {
      50: "#f9fafb",
      100: "#f3f4f6",
      200: "#e5e7eb",
      300: "#d1d5db",
    },
    purple: {
      main: "#6d28d9",
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: "3rem",
      fontWeight: 800,
      lineHeight: 1.2,
      letterSpacing: "-0.025em",
    },
    h2: { fontSize: "2.25rem", fontWeight: 700, lineHeight: 1.2 },
    h3: { fontSize: "1.875rem", fontWeight: 700 },
    h4: { fontSize: "1.5rem", fontWeight: 700 },
    h5: { fontSize: "1.25rem", fontWeight: 600 },
    h6: { fontSize: "1.125rem", fontWeight: 600 },
    body1: { fontSize: "1rem", lineHeight: 1.6 },
    body2: { fontSize: "0.875rem" },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: "none",
          fontWeight: 600,
          padding: "10px 20px",
        },
        sizeLarge: { padding: "12px 24px", fontSize: "1rem" },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: "none",
          border: "1px solid hsl(214.3, 31.8%, 91.4%)",
        },
      },
    },
  },
});
theme = responsiveFontSizes(theme);

// --- HEADER (REVISED) ---
const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const navItems = ["Solutions", "Benefits", "Pricing"];
  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: "center", p: 2 }}>
      <Box
        component="img"
        src="/images/turtlelogo.png"
        alt="Turtle Software"
        sx={{
          height: 60,
          width: "auto",
          maxWidth: "120px",
          display: "block",
          mx: "auto",
          my: 2,
          objectFit: "contain",
          imageRendering: "high-quality",
          pointerEvents: "none",
        }}
      />
      <List>
        {navItems.map((item) => (
          <ListItem key={item} disablePadding>
            <ListItemButton
              sx={{ textAlign: "center" }}
              href={`#${item.toLowerCase().replace(" ", "-")}`}
            >
              <ListItemText primary={item} />
            </ListItemButton>
          </ListItem>
        ))}
        <ListItem sx={{ mt: 2 }}>
          <Button
            variant="contained"
            fullWidth
            onClick={() => {
              window.location.href =
              // "http://localhost:3000/aad33/store/cart/?product_sku=Dell_vistro&quantity=1";
              // Clear all items from localStorage
              // localStorage.clear();
              // sessionStorage.clear();
              // window.location.href =
                "https://store.turtleit.in/turtlesoftware/store/cart/?product_sku=sales_suite&quantity=1";
            }}
          >
            Start
          </Button>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <>
      <AppBar
        component="header"
        position="fixed"
        sx={{
          bgcolor: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(8px)",
          color: "text.primary",
          boxShadow: "none",
          borderBottom: 1,
          borderColor: "grey.200",
        }}
      >
        <Container maxWidth="lg">
          <Toolbar
            disableGutters
            sx={{ justifyContent: "space-between", height: 80 }}
          >
            <Box
              component="img"
              src="/images/turtlelogo.png"
              alt="Turtle Software"
              sx={{
                height: 60,
                width: "auto", // Allow width to adjust based on aspect ratio
                maxWidth: "120px",
                display: "block",
                objectFit: "contain",
                imageRendering: "high-quality",
                pointerEvents: "none", // Prevents dragging which can affect quality perception
              }}
            />
            <Box sx={{ display: { xs: "none", md: "block" } }}>
              {navItems.map((item) => (
                <Button
                  key={item}
                  href={`#${item.toLowerCase().replace(" ", "-")}`}
                  sx={{
                    color: "text.secondary",
                    fontWeight: 500,
                    mx: 1.5,
                    "&:hover": {
                      color: "primary.main",
                      bgcolor: "transparent",
                    },
                  }}
                >
                  {item}
                </Button>
              ))}
            </Box>
            <Box sx={{ display: { xs: "none", md: "block" } }}>
              <Button
                variant="contained"
                sx={{ px: 3, py: 1.5 }}
                onClick={() => {
                  // Clear all items from localStorage
                  // localStorage.clear();
                  // sessionStorage.clear();
                  window.location.href =
                  "https://store.turtleit.in/turtlesoftware/store/cart/?product_sku=sales_suite&quantity=1";
                }}
              >
                Start 90-Days Trial for Free
              </Button>
            </Box>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="end"
              onClick={handleDrawerToggle}
              sx={{ display: { md: "none" } }}
            >
              <MenuIcon />
            </IconButton>
          </Toolbar>
        </Container>
      </AppBar>
      <Drawer
        anchor="right"
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { boxSizing: "border-box", width: 250 },
        }}
      >
        {drawer}
      </Drawer>
    </>
  );
};

// --- HERO ---
const Hero = () => {
  const heroDescriptions = [
    {
      title: "Launch Your D2C Brand with Ease",
      content:
        "From Idea to Orders, All-in-One Suite. Whether you're selling fashion, food, electronics, or experiences—our powerful Product Sales Suite makes it effortless to build, run, and grow your direct-to-customer business.",
    },
    {
      title: "Power Your B2B Sales Engine",
      content:
        "Smart CRM, Orders, and Service in One Platform. Streamline every part of your customer journey with automation, visibility, and control.",
    },
    {
      title: "Deliver Services Smarter",
      content:
        "Let Your Customers Book, Track & Pay Online. Give your customers a seamless digital experience, from service requests to real-time tracking.",
    },
  ];
  return (
    <Box
      id="hero"
      component="section"
      sx={{
        pt: { xs: 18, md: 24 },
        pb: 12,
        background:
          "linear-gradient(145deg, hsl(221, 100%, 98%), #ffffff, hsl(271, 100%, 98%))",
        overflow: "hidden",
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ textAlign: "center", mb: 8 }}>
          <Typography
            variant="h2"
            component="h1"
            sx={{ fontWeight: 800, maxWidth: "80ch", mx: "auto" }}
          >
            End-to-end solution for{" "}
            <Typography
              component="span"
              variant="inherit"
              sx={{ color: "purple.main" }}
            >
              e-commerce
            </Typography>
            , digital marketing, business development, account management, and
            service management.
          </Typography>
        </Box>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {heroDescriptions.map((desc) => (
            <Grid size={{xs:12 , md:4}} key={desc.title}>
              <Card sx={{ height: "100%", p: 2 }}>
                <CardContent>
                  <Typography variant="body1" color="text.secondary">
                    <b>{desc.title}</b>
                    <br />
                    {desc.content}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        <Stack alignItems="center" spacing={4}>
          <Button
            variant="contained"
            size="large"
            sx={{ bgcolor: "purple.main", "&:hover": { bgcolor: "#581c87" } }}
            onClick={() => {
              // Clear all items from localStorage
              // localStorage.clear();
              // sessionStorage.clear();
              window.location.href =
                "https://store.turtleit.in/turtlesoftware/store/cart/?product_sku=sales_suite&quantity=1";
            }}
          >
            Start your Evaluation
          </Button>
          <Stack
            direction="row"
            spacing={{ xs: 2, sm: 4 }}
            justifyContent="center"
          >
            <Box>
              <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                90-Day
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Evaluation for free
              </Typography>
            </Box>
            <Box>
              <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                No Credit Card
              </Typography>
              <Typography variant="body2" color="text.secondary">
                No card required
              </Typography>
            </Box>
            <Box>
              <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                AI Driven
              </Typography>
              <Typography variant="body2" color="text.secondary">
                For all modules
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
};

// --- FEATURES ---
const features = [
  {
    icon: ShoppingCartOutlinedIcon,
    title: "E-Commerce Platform",
    description:
      "Complete online store solution with inventory management, payment processing, and order fulfillment.",
    subFeatures: [
      "Multi-channel selling (Web, Mobile, Social)",
      "Inventory tracking & management",
      "Payment gateway integrations",
      "Order processing & fulfillment",
    ],
  },
  {
    icon: PeopleOutlinedIcon,
    title: "CRM & Sales Management",
    description:
      "Powerful customer relationship management with sales pipeline, lead tracking, and customer insights.",
    subFeatures: [
      "Lead capture & management",
      "Sales pipeline automation",
      "Customer interaction history",
      "Performance analytics",
    ],
  },
  {
    icon: HandymanOutlinedIcon,
    title: "Service Management",
    description:
      "End-to-end service delivery platform with booking, scheduling, and customer communication.",
    subFeatures: [
      "Online booking & scheduling",
      "Service delivery tracking",
      "Customer communication tools",
      "Service performance metrics",
    ],
  },
  {
    icon: BoltOutlinedIcon,
    title: "AI-Powered Automation",
    description:
      "Intelligent automation for repetitive tasks, customer support, and business process optimization.",
    subFeatures: [
      "Smart customer support chatbots",
      "Automated workflow management",
      "Predictive analytics",
      "Intelligent recommendations",
    ],
  },
  {
    icon: BarChartOutlinedIcon,
    title: "Analytics & Reporting",
    description:
      "Comprehensive business intelligence with real-time dashboards and actionable insights.",
    subFeatures: [
      "Real-time business dashboards",
      "Sales & revenue analytics",
      "Customer behavior insights",
      "Custom report generation",
    ],
  },
  {
    icon: SecurityOutlinedIcon,
    title: "Security & Compliance",
    description:
      "Enterprise-grade security with data protection, compliance management, and secure transactions.",
    subFeatures: [
      "Data encryption & protection",
      "Compliance management",
      "Secure payment processing",
      "User access controls",
    ],
  },
];

const Features = () => {
  return (
    <Box
      id="solutions"
      component="section"
      sx={{ py: 12, bgcolor: "background.default" }}
    >
      <Container maxWidth="lg">
        <Box sx={{ textAlign: "center", mb: 8 }}>
          <Typography variant="h2" component="h2">
            Everything You Need to Scale Your Business
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ mt: 2, maxWidth: "65ch", mx: "auto", fontWeight: 400 }}
          >
            Turtle Sales Suite provides a comprehensive suite of tools to manage
            every aspect of your business, from e-commerce and customer
            relationships to service delivery and analytics.
          </Typography>
        </Box>
        <Grid container spacing={4}>
          {features.map((feature) => (
            <Grid size={{xs:12 , sm:6 , md:4}} key={feature.title}>
              <Card
                variant="outlined"
                sx={{ height: "100%", bgcolor: "background.default" }}
              >
                <CardContent
                  sx={{
                    p: 3,
                    display: "flex",
                    flexDirection: "column",
                    textAlign: "left",
                    height: "100%",
                  }}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      border: 1,
                      borderColor: "grey.200",
                      borderRadius: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mb: 2,
                    }}
                  >
                    <feature.icon
                      sx={{ color: "text.secondary", fontSize: 28 }}
                    />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                    {feature.title}
                  </Typography>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ mb: 2, flexGrow: 1 }}
                  >
                    {feature.description}
                  </Typography>
                  <List sx={{ p: 0 }}>
                    {feature.subFeatures.map((sub) => (
                      <ListItem key={sub} sx={{ p: 0, mb: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 20 }}>
                          <Box
                            sx={{
                              width: 4,
                              height: 4,
                              bgcolor: "text.secondary",
                              borderRadius: "50%",
                            }}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body2" color="text.secondary">
                              {sub}
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

// --- BENEFITS ---
const results = [
  // {
  //   icon: TrendingUp,
  //   stat: "40%",
  //   statDesc: "Revenue Increase",
  //   title: "Increase Revenue by 40%",
  //   description:
  //     "Streamlined sales processes and better customer insights drive significant revenue growth.",
  // },
  {
    icon: AccessTime,
    stat: "7.5 hrs",
    statDesc: "Time saved weekly per employee",
    title: "Increase Net Productivity",
    description:
      "Integrated system complimented by, automated workflows and AI Powered solution to reduce operational overheads.",
  },
  // {
  //   icon: AttachMoneyIcon,
  //   stat: "30%",
  //   statDesc: "Cost Reduction",
  //   title: "Reduce Costs by 30%",
  //   description:
  //     "Consolidate multiple tools into one platform and eliminate redundant subscriptions.",
  // },
  {
    icon: CloudDoneOutlined,
    stat: "1 Day",
    statDesc: "Average set-up time",
    title: "Faster Implementation",
    description:
      "Launch new sales channel integrated with CRM & Service Management in a day with our intuitive setup leading to faster time to market",
  },
  {
    icon: GroupsOutlined,
    stat: "100%",
    statDesc: "Customer Satisfaction",
    title: "Greater Satisfaction Quotient",
    description:
      "Better service delivery and faster response times with real-time tracking on customer portal leading to unmatched satisfaction.",
  },
  
  // {
  //   icon: TrackChangesIcon,
  //   stat: "3x",
  //   statDesc: "Faster Decisions",
  //   title: "Better Decision Making",
  //   description:
  //     "Real-time analytics and insights help you make data-driven decisions faster.",
  // },
];

const Benefits = () => {
  return (
    <Box id="benefits" component="section" sx={{ py: 12, bgcolor: "grey.50" }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: "center", mb: 8 }}>
          <Typography variant="h2" component="h2">
            Benefits for Growing Businesses
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ mt: 2, maxWidth: "65ch", mx: "auto", fontWeight: 400 }}
          >
            See measurable improvements in your business operations, revenue,
            and customer satisfaction within the first 90 days.
          </Typography>
        </Box>
        <Grid container spacing={3}>
          {results.map((result) => (
            <Grid size={{xs:12 , sm:6 , md:4}} key={result.title}>
              <Card
                variant="outlined"
                sx={{ p: 3, height: "100%", bgcolor: "background.default" }}
              >
                <CardContent
                  sx={{
                    p: "0 !important",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                  }}
                >
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      background: `linear-gradient(to bottom right, ${theme.palette.primary.main}, ${theme.palette.purple.main})`,
                      color: "white",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mb: 2,
                    }}
                  >
                    <result.icon sx={{ fontSize: 32 }} />
                  </Box>
                  <Typography
                    variant="h3"
                    sx={{ fontWeight: "bold", color: "purple.main" }}
                  >
                    {result.stat}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    {result.statDesc}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                    {result.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {result.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

// --- PRICING ---
const plans = [
  {
    name: "Pay-As-You-Go",
    subtitle: "Always Monthly Pay. No Contract",
    price: "₹ 5,000",
    period: "/ Month / User excl. Taxes",
    features: [
      "Minimum Purchase of 10 Users which includes 2000 Products",
      "Additional 1000 Products @ ₹15,000 /Month",
    ],
    popular: false,
  },
  {
    name: "Monthly Plan",
    subtitle: "Upfront Monthly Pay. Annual Contract",
    price: "₹ 3,000",
    period: "/ Month / User excl. Taxes",
    features: [
      "Minimum Purchase of 25 Users which includes 2000 Products",
      "Additional User @ ₹3,000 /Month",
      "1000 Products @ ₹15,000 /Month",
    ],
    popular: true,
  },
  {
    name: "Annual Plan",
    subtitle: "Upfront Yearly Pay. Annual Contract",
    price: "₹ 2,500",
    period: "/ Month / User excl. Taxes",
    features: [
      "Minimum Purchase of 20 Users which includes 2000 Products",
      "Additional User @ ₹2,500 / Month",
      "1000 Products @ ₹15,000 / Month",
    ],
    popular: false,
  },
];

const Pricing = () => {
  return (
    <Box
      id="pricing"
      component="section"
      sx={{ py: 12, bgcolor: "background.default" }}
    >
      <Container maxWidth="lg">
        <Box sx={{ textAlign: "center", mb: 6, pt: 2 }}>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ fontWeight: 400 }}
          >
            After 90 Days, you can upgrade to Pay-as-you-go or Fixed
            Subscription Plans
          </Typography>
        </Box>
        <Grid
          container
          spacing={2}
          alignItems="stretch"
          justifyContent="center"
        >
          {plans.map((plan) => (
            <Grid
              size={{xs:12 , sm:8 , md:4}}
              key={plan.name}
              sx={{ display: "flex" }}
            >
              <Card
                sx={{
                  position: "relative",
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  bgcolor: "background.paper",
                  color: "text.primary",
                  borderRadius: 4,
                  border: `1px solid ${
                    plan.popular
                      ? theme.palette.primary.main
                      : theme.palette.grey[300]
                  }`,
                  boxShadow: plan.popular
                    ? "0px 20px 25px -5px rgba(0,0,0,0.1), 0px 10px 10px -5px rgba(0,0,0,0.04)"
                    : "none",
                  transition:
                    "transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out",
                  transform: plan.popular ? "scale(1.05)" : "none",
                  overflow: "visible",
                }}
              >
                {plan.popular && (
                  <Chip
                    label="Most Popular Choice"
                    sx={{
                      bgcolor: theme.palette.primary.main,
                      color: "white",
                      fontWeight: "bold",
                      position: "absolute",
                      top: -14,
                      left: "50%",
                      transform: "translateX(-50%)",
                    }}
                  />
                )}
                <CardContent
                  sx={{
                    p: 4,
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "column",
                    textAlign: "center",
                  }}
                >
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography
                      variant="h5"
                      sx={{ mb: 0.5, fontWeight: "bold" }}
                    >
                      {plan.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "text.secondary",
                        mb: 2,
                      }}
                    >
                      {plan.subtitle}
                    </Typography>
                    <Box sx={{ my: 2 }}>
                      <Typography
                        variant="h2"
                        component="span"
                        sx={{ fontWeight: "bold" }}
                      >
                        {plan.price}
                      </Typography>
                    </Box>
                    <Typography
                      color="text.secondary"
                      variant="body2"
                      sx={{ mb: 2 }}
                    >
                      {plan.period}
                    </Typography>
                    <Box sx={{ my: 2, textAlign: "left" }}>
                      <List>
                        {plan.features.map((feature) => (
                          <ListItem
                            key={feature}
                            disableGutters
                            sx={{ py: 0.5 }}
                          >
                            <CheckCircleIcon
                              sx={{
                                mr: 1.5,
                                fontSize: 20,
                                color: "success.main",
                              }}
                            />
                            <ListItemText
                              primary={feature}
                              sx={{
                                color: "text.secondary",
                              }}
                              primaryTypographyProps={{ variant: "body2" }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  </Box>
                  <Button
                    fullWidth
                    onClick={() => {
                      // Clear all items from localStorage
                      // localStorage.clear();
                      // sessionStorage.clear();
                      window.location.href =
                        "https://store.turtleit.in/turtlesoftware/store/cart/?product_sku=sales_suite&quantity=1";
                    }}
                    size="large"
                    variant={plan.popular ? "contained" : "outlined"}
                    sx={{
                      mt: 4,
                      py: 1.5,
                      cursor: "pointer",
                      bgcolor: plan.popular ? "primary.main" : "transparent",
                      color: plan.popular ? "white" : "primary.main",
                      borderColor: "primary.main",
                      "&:hover": {
                        bgcolor: plan.popular
                          ? "primary.main"
                          : "primary.light",
                      },
                    }}
                  >
                    Start Trial
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

// --- FINAL CTA ---
const FinalCTA = () => {
  return (
    <Box
      id="contact"
      component="section"
      sx={{
        py: 12,
        background: `linear-gradient(to right, ${theme.palette.primary.main}, ${theme.palette.purple.main})`,
        color: "white",
      }}
    >
      <Container maxWidth="md" sx={{ textAlign: "center" }}>
        <Typography
          variant="h2"
          component="h2"
          sx={{ mb: 2, fontWeight: "bold" }}
        >
          Ready to Transform Your Business Operations?
        </Typography>
        <Typography
          variant="h6"
          sx={{
            opacity: 0.8,
            mb: 4,
            maxWidth: "65ch",
            mx: "auto",
            fontWeight: 400,
          }}
        >
          Subscribe now to accelerate your growth with Turtle Sales Suite.
        </Typography>
        <Button
          onClick={() => {
            // Clear all items from localStorage
            localStorage.clear();
            sessionStorage.clear();
            window.location.href =
              "https://store.turtleit.in/turtlesoftware/store/cart/?product_sku=sales_suite&quantity=1";
          }}
          size="large"
          variant="contained"
          endIcon={<ArrowForwardIcon />}
          sx={{
            bgcolor: "white",
            color: "primary.main",
            "&:hover": { bgcolor: "grey.200" },
            mb: 6,
            cursor: "pointer",
          }}
        >
          Start Your 90-Days Evaluation for Free
        </Button>
        <Grid container spacing={4} sx={{ opacity: 0.9 }}>
          <Grid size={{xs:12 , md:4}}>
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              90-Day
            </Typography>
            <Typography variant="body2">Free Evaluation</Typography>
          </Grid>
          <Grid size={{xs:12 , md:4}}>
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              No
            </Typography>
            <Typography variant="body2">Credit Card Required</Typography>
          </Grid>
          <Grid size={{xs:12 , md:4}}>
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              AI-Driven
            </Typography>
            <Typography variant="body2">Productivity & Automation</Typography>
          </Grid>
        </Grid>

        {/* New Grid for Links */}
        <Grid
          container
          spacing={2}
          justifyContent="center"
          sx={{ mt: 4, pt: 2, borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}
        >
          <Grid size={{xs:12 , sm:6}}>
            <Link
              href="/legal-doc/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "white",
                textDecoration: "none",
                opacity: 0.8,
              }}
            >
              Privacy Statement
            </Link>
          </Grid>
          <Grid size={{xs:12 , sm:6}}>
            <Link
              href="/legal-doc/terms-and-conditions"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "white",
                textDecoration: "none",
                opacity: 0.8,
              }}
            >
              Terms and Conditions
            </Link>
          </Grid>
          <Grid size={{xs:12 , sm:6}}>
            <Link
              href="/legal-doc/refund-policy"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "white",
                textDecoration: "none",
                opacity: 0.8,
              }}
            >
              Refund Policy
            </Link>
          </Grid>
        </Grid>

        {/* Contact Information and Copyright */}
        <Box sx={{ mt: 4, textAlign: "center", color: "white", opacity: 0.8 }}>
          <Typography variant="body2">
            Email: hello@turtlesoftware.co
          </Typography>
          <Typography variant="body2">
            1011 Iconic Shyamal, Near Shyamal Cross Road, Nehrunagar, Ahmedabad
            380014
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, fontSize: "0.875rem" }}>
            Copyrighted. Turtle Software Private Limited.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

// --- AI Hero Section ---
const AIHeroSection = () => (
  <Box
    sx={{
      position: "relative",
      overflow: "hidden",
      background: "linear-gradient(135deg, #4158D0 0%, #C850C0 100%)",
      color: "white",
      pt: { xs: 10, md: 12 },
      pb: { xs: 20, md: 24 },
      clipPath: "ellipse(70% 60% at 50% 40%)",
    }}
  >
    <Container maxWidth="lg">
      <Box
        sx={{
          textAlign: "center",
          maxWidth: 1200,
          mx: "auto",
          px: 2,
          paddingTop: 4,
        }}
      >
        <Typography
          variant="h1"
          component="h1"
          sx={{
            fontSize: { xs: "2.5rem", md: "3.5rem" },
            fontWeight: 800,
            mb: 2,
          }}
        >
          Sales Transformation with AI
        </Typography>
        <Typography
          variant="body1"
          sx={{
            fontSize: { xs: "1.1rem", md: "1.25rem" },
            maxWidth: 700,
            mx: "auto",
          }}
        >
          Digital Commerce, Customer Relationship & Service Management
        </Typography>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={3}
          justifyContent="center"
          sx={{ mt: 4 }}
        >
          <Button
            variant="contained"
            size="large"
            sx={{
              bgcolor: "purple.main",
              "&:hover": { bgcolor: "#581c87" },
              border: "1px solid #fff",
              px: 4,
              py: 1.5,
            }}
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById("hero")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Know More
          </Button>
        </Stack>
        {/* AI Images Display */}
        <Box
          component="img"
          src="/images/aiimg.png"
          alt="AI Visualization"
          sx={{
            width: "100%",
            height: "auto",
            maxHeight: { xs: 400, md: 500 },
            maxWidth: "100%",
            objectFit: "contain",
            borderRadius: 2,
            my: { xs: 3, md: 4 },
            transition: "transform 0.3s ease",
            "&:hover": {
              transform: "translateY(-5px)",
            },
          }}
        />
      </Box>
    </Container>
  </Box>
);

// --- Main Index Page ---
const Index = () => (
  <Box
    sx={{
      background:
        "linear-gradient(325deg, hsl(271, 100%, 98%), #ffffff, hsl(221, 100%, 98%))",
    }}
  >
    <Header />
    <main>
      <AIHeroSection />
      <Hero />
      <Features />
      <Benefits />
      <Pricing />
      <FinalCTA />
    </main>
  </Box>
);

// --- App Entry Point ---
function App() {
  React.useEffect(() => {
    if (
      !document.querySelector(
        'link[href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"]'
      )
    ) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap";
      document.head.appendChild(link);
    }
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash) {
        const element = document.getElementById(hash);
        if (element) {
          const yOffset = -80;
          const y =
            element.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: "smooth" });
        }
      }
    };
    // Modified smooth scroll function to not intercept external links
    const smoothScroll = (e: any) => {
      const link = e.target.closest("a");
      // Only handle internal anchor links, not external URLs
      if (link && link.hash && link.hostname === window.location.hostname) {
        e.preventDefault();
        window.location.hash = link.hash;
      }
    };
    document.addEventListener("click", smoothScroll);
    window.addEventListener("hashchange", handleHashChange);
    setTimeout(() => handleHashChange(), 100);
    return () => {
      document.removeEventListener("click", smoothScroll);
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Index />
    </ThemeProvider>
  );
}

export default App;
