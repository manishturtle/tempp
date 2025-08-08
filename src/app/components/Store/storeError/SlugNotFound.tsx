
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  createTheme,
  ThemeProvider as MuiThemeProvider,
  alpha,
  Theme,
  responsiveFontSizes,
} from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import {
  Box,
  Button,
  Container,
  Grid,
  Typography,
  useTheme,
  Stack,
} from "@mui/material";
import ContactSupportIcon from "@mui/icons-material/ContactSupport";
import StorefrontIcon from "@mui/icons-material/Storefront";

// --- Theme Types and Context Definition ---
type ThemeMode = "light" | "dark";
type ThemeColor =
  | "blue"
  | "purple"
  | "green"
  | "teal"
  | "indigo"
  | "amber"
  | "red"
  | "pink"
  | "orange"
  | "cyan"
  | "deepPurple"
  | "lime";
type FontFamily =
  | "inter"
  | "roboto"
  | "poppins"
  | "montserrat"
  | "opensans"
  | "underdog";

interface ThemeContextType {
  mode: ThemeMode;
  color: ThemeColor;
  fontFamily: FontFamily;
  toggleTheme: () => void;
  changeThemeColor: (color: ThemeColor) => void;
  changeFontFamily: (font: FontFamily) => void;
}

const themeColors = {
  blue: {
    light: {
      primary: "#1976d2",
      secondary: "#f50057",
      background: "#f5f7fa",
      paper: "#ffffff",
      success: "#4caf50",
      warning: "#ff9800",
      error: "#f44336",
      info: "#2196f3",
      accent1: "#bbdefb",
      accent2: "#64b5f6",
      accent3: "#1976d2",
    },
    dark: {
      primary: "#90caf9",
      secondary: "#f48fb1",
      background: "#121212",
      paper: "#1e1e1e",
      success: "#81c784",
      warning: "#ffb74d",
      error: "#e57373",
      info: "#64b5f6",
      accent1: "#0d47a1",
      accent2: "#1565c0",
      accent3: "#1976d2",
    },
  },
  purple: {
    light: {
      primary: "#7b1fa2",
      secondary: "#00bcd4",
      background: "#f8f6fc",
      paper: "#ffffff",
      success: "#4caf50",
      warning: "#ff9800",
      error: "#f44336",
      info: "#2196f3",
      accent1: "#e1bee7",
      accent2: "#ba68c8",
      accent3: "#8e24aa",
    },
    dark: {
      primary: "#ba68c8",
      secondary: "#80deea",
      background: "#121212",
      paper: "#1e1e1e",
      success: "#81c784",
      warning: "#ffb74d",
      error: "#e57373",
      info: "#64b5f6",
      accent1: "#4a148c",
      accent2: "#6a1b9a",
      accent3: "#7b1fa2",
    },
  },
  green: {
    light: {
      primary: "#2e7d32",
      secondary: "#ff5722",
      background: "#f7f7f7",
      paper: "#ffffff",
      success: "#4caf50",
      warning: "#ff9800",
      error: "#f44336",
      info: "#2196f3",
      accent1: "#c8e6c9",
      accent2: "#81c784",
      accent3: "#43a047",
    },
    dark: {
      primary: "#81c784",
      secondary: "#ff8a65",
      background: "#121212",
      paper: "#1e1e1e",
      success: "#81c784",
      warning: "#ffb74d",
      error: "#e57373",
      info: "#64b5f6",
      accent1: "#1b5e20",
      accent2: "#2e7d32",
      accent3: "#388e3c",
    },
  },
  red: {
    light: {
      primary: "#d32f2f",
      secondary: "#2196f3",
      background: "#ffebee",
      paper: "#ffffff",
      success: "#4caf50",
      warning: "#ff9800",
      error: "#f44336",
      info: "#2196f3",
      accent1: "#ffcdd2",
      accent2: "#e57373",
      accent3: "#f44336",
    },
    dark: {
      primary: "#ef5350",
      secondary: "#64b5f6",
      background: "#121212",
      paper: "#1e1e1e",
      success: "#81c784",
      warning: "#ffb74d",
      error: "#e57373",
      info: "#64b5f6",
      accent1: "#b71c1c",
      accent2: "#c62828",
      accent3: "#d32f2f",
    },
  },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// --- Theme Provider Component ---
function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("light");
  const [color, setColor] = useState<ThemeColor>("green");
  const [fontFamily, setFontFamily] = useState<FontFamily>("roboto");

  useEffect(() => {
    try {
      const savedMode = localStorage.getItem("themeMode") as ThemeMode;
      if (savedMode) setMode(savedMode);
    } catch (e) {
      console.warn("localStorage is not available.");
    }
  }, []);

  const theme = createTheme({
    palette: {
      mode,
      primary: { main: themeColors[color][mode].primary },
      secondary: { main: themeColors[color][mode].secondary },
      background: { default: themeColors[color][mode].background },
      success: { main: themeColors[color][mode].success },
      error: { main: themeColors.red.light.primary },
    },
    typography: {
      fontFamily: `"${
        fontFamily.charAt(0).toUpperCase() + fontFamily.slice(1)
      }", "Roboto", "Helvetica", "Arial", sans-serif`,
    },
    shape: {
      borderRadius: 8,
      borderRadiusLarge: 12,
      borderRadiusExtraLarge: 16,
    } as any,
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            borderRadius: 8,
            transition: "all 0.2s ease-in-out",
          },
          contained: ({ theme }) => ({
            boxShadow: "none",
            "&:hover": {
              boxShadow: theme.shadows[2],
              transform: "translateY(-1px)",
            },
          }),
        },
      },
    },
  });

  const responsiveTheme = responsiveFontSizes(theme);

  const themeContextValue = {
    mode,
    color,
    fontFamily,
    toggleTheme: () => setMode((prev) => (prev === "light" ? "dark" : "light")),
    changeThemeColor: setColor,
    changeFontFamily: setFontFamily,
  };

  return (
    <ThemeContext.Provider value={themeContextValue}>
      <MuiThemeProvider theme={responsiveTheme}>
        <CssBaseline enableColorScheme />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

// --- Page Component: StoreNotFoundPage ---
function StoreNotFoundPage() {
  const t = (key: string) =>
    ({
      "404_title": "404",
      oops: "Oops! Store not found.",
      description:
        "The store you're looking for doesn't exist or may have moved.",
      image_alt_text: "Cartoon turtle with a shopping cart",
    }[key] || key);

  return (
    <>
      <style jsx global>{`
        html, body {
          background: linear-gradient(145deg, hsl(221, 100%, 98%), #ffffff, hsl(271, 100%, 98%));
          margin: 0;
          height: 100vh;
          overflow: hidden;
        }
      `}</style>
      <Box
        component="main"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          overflow: "hidden",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      >
      <Container maxWidth="lg" sx={{ py: 2 }}>
        <Grid
          container
          alignItems="center"
          justifyContent="center"
          spacing={{ xs: 4, md: 6 }}
          sx={{ height: "100%" }}
        >
          <Grid size={{xs:12 , md:6}}>
            <Box sx={{ textAlign: { xs: "center", md: "left" } }}>
              <Typography
                variant="h1"
                component="h1"
                sx={{
                  fontWeight: "bold",
                  fontSize: { xs: "6rem", md: "9rem" },
                  color: "error.main",
                  lineHeight: 1,
                  animation: "fadeInUp 0.5s ease-out",
                }}
              >
                {t("404_title")}
              </Typography>
              <Typography
                variant="h3"
                component="h2"
                sx={{
                  fontWeight: "600",
                  mt: 2,
                  color: "text.primary",
                  animation: "fadeInUp 0.5s 0.2s ease-out both",
                }}
              >
                {t("oops")}
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{
                  fontSize: { md: "1.125rem" },
                  mt: 1.5,
                  mb: 1.5,
                  maxWidth: "480px",
                  mx: { xs: "auto", md: 0 },
                  animation: "fadeInUp 0.5s 0.4s ease-out both",
                }}
              >
                {t("description")}
              </Typography>
            </Box>
          </Grid>
          <Grid size={{xs:12 , md:6}}>
            <Box
              sx={{
                animation: "zoomIn 0.7s ease-out both",
                textAlign: "center",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: { xs: 2, md: 4 },
              }}
            >
              <Box
                component="img"
                src="/images/turtle-cart.png"
                alt={t("image_alt_text")}
                sx={{
                  width: "100%",
                  maxWidth: { xs: "300px", md: "300px", lg: "350px" },
                  height: "auto",
                  objectFit: "contain",
                  imageRendering: "high-quality",
                  filter: "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))",
                }}
              />
            </Box>
          </Grid>
        </Grid>
      </Container>
      <style>{`
                @keyframes fadeInUp { from { opacity: 0; transform: translate3d(0, 40px, 0); } to { opacity: 1; transform: translate3d(0, 0, 0); } }
                @keyframes zoomIn { from { opacity: 0; transform: scale3d(0.8, 0.8, 0.8); } to { opacity: 1; transform: scale3d(1, 1, 1); } }
            `}</style>
      </Box>
    </>
  );
}

// --- Main App Component ---
// This is the final component that gets rendered.
export default function App() {
  return (
    <ThemeRegistry>
      <StoreNotFoundPage />
    </ThemeRegistry>
  );
}
