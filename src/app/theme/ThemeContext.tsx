'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  createTheme, 
  ThemeProvider as MuiThemeProvider, 
  alpha, 
  Theme, 
  responsiveFontSizes 
} from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { Components } from '@mui/material/styles/components';
// Import for DataGrid component types
import { gridClasses } from '@mui/x-data-grid';

type ThemeMode = 'light' | 'dark';
// Support both predefined colors and custom hex codes
type ThemeColor = string; // Can be a predefined name or hex code (e.g. '#FF5733')
type FontFamily = 'inter' | 'roboto' | 'poppins' | 'montserrat' | 'opensans' | 'underdog';

// Define ColorSet interface for theme colors
interface ColorSet {
  primary: string;
  secondary: string;
  background: string;
  paper: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  accent1: string;
  accent2: string;
  accent3: string;
}

// Define ThemeColorSet interface for light/dark variants
interface ThemeColorSet {
  light: ColorSet;
  dark: ColorSet;
}

// Helper function to generate colors from hex code
function generateColorsFromHex(hexColor: string, isDark: boolean): ColorSet {
  // Helper to convert hex to RGB
  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  };
  
  // Helper to convert RGB to hex
  const rgbToHex = (r: number, g: number, b: number) => {
    return '#' + [r, g, b].map(x => {
      const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  };
  
  // Generate lighter/darker variants
  const lighten = (hex: string, percent: number) => {
    const { r, g, b } = hexToRgb(hex);
    const amount = 255 * (percent / 100);
    return rgbToHex(
      Math.min(255, r + amount),
      Math.min(255, g + amount),
      Math.min(255, b + amount)
    );
  };
  
  const darken = (hex: string, percent: number) => {
    const { r, g, b } = hexToRgb(hex);
    const amount = 255 * (percent / 100);
    return rgbToHex(
      Math.max(0, r - amount),
      Math.max(0, g - amount),
      Math.max(0, b - amount)
    );
  };
  
  // Calculate complementary color
  const complementary = () => {
    const { r, g, b } = hexToRgb(hexColor);
    return rgbToHex(255 - r, 255 - g, 255 - b);
  };
  
  return {
    primary: isDark ? lighten(hexColor, 15) : hexColor,
    secondary: complementary(),
    background: isDark ? '#121212' : '#f5f7fa',
    paper: isDark ? '#1e1e1e' : '#ffffff',
    success: isDark ? '#81c784' : '#4caf50',
    warning: isDark ? '#ffb74d' : '#ff9800',
    error: isDark ? '#e57373' : '#f44336',
    info: isDark ? '#64b5f6' : '#2196f3',
    accent1: isDark ? darken(hexColor, 25) : lighten(hexColor, 30),
    accent2: isDark ? darken(hexColor, 15) : lighten(hexColor, 15),
    accent3: isDark ? hexColor : darken(hexColor, 10)
  };
}

interface ThemeContextType {
  mode: ThemeMode;
  color: ThemeColor;
  fontFamily: FontFamily;
  toggleTheme: () => void;
  changeThemeColor: (color: ThemeColor) => void;
  changeFontFamily: (font: FontFamily) => void;
}

// Default colors to use as fallbacks
const DEFAULT_LIGHT_COLOR = '#1976d2'; // Default blue
const DEFAULT_DARK_COLOR = '#90caf9'; // Lighter blue for dark mode

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Component to load Underdog font from Google Fonts
function UnderdogFontLoader() {
  useEffect(() => {
    // Add preconnect links
    const preconnectGoogle = document.createElement('link');
    preconnectGoogle.rel = 'preconnect';
    preconnectGoogle.href = 'https://fonts.googleapis.com';
    document.head.appendChild(preconnectGoogle);

    const preconnectGstatic = document.createElement('link');
    preconnectGstatic.rel = 'preconnect';
    preconnectGstatic.href = 'https://fonts.gstatic.com';
    preconnectGstatic.crossOrigin = 'anonymous';
    document.head.appendChild(preconnectGstatic);

    // Add font stylesheet
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Underdog&display=swap';
    document.head.appendChild(fontLink);

    // Cleanup function
    return () => {
      document.head.removeChild(preconnectGoogle);
      document.head.removeChild(preconnectGstatic);
      document.head.removeChild(fontLink);
    };
  }, []);

  return null;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');
  const [color, setColor] = useState<ThemeColor>('blue');
  const [fontFamily, setFontFamily] = useState<FontFamily>('inter');

  useEffect(() => {
    try {
      // Extract tenant from URL for admin routes
      const pathParts = typeof window !== 'undefined' ? window.location.pathname.split('/') : [];
      const tenant = pathParts[1] || '';
      const isAdmin = pathParts[2] === 'Crm' || pathParts[2] === 'admin';
      
      // For admin routes, use tenant_admin_theme keys
      // For user/store routes, use tenant_theme keys
      // For non-tenant routes, use global theme keys
      let modeKey = 'themeMode';
      let colorKey = 'themeColor';
      
      if (tenant) {
        if (isAdmin) {
          // Admin route - use admin-specific keys
          modeKey = `${tenant}_admin_themeMode`;
          colorKey = `${tenant}_admin_themeColor`;
        } else {
          // User/store route - use tenant-prefixed keys
          modeKey = `${tenant}_themeMode`;
          colorKey = `${tenant}_themeColor`;
        }
      }
      
      const fontKey = 'fontFamily'; // Keep font global for now
      
      // Get values using the determined keys
      let savedMode = localStorage.getItem(modeKey) as ThemeMode;
      let savedColor = localStorage.getItem(colorKey) as ThemeColor;
      const savedFont = localStorage.getItem(fontKey) as FontFamily;
      
      // If no tenant-specific theme is found, fall back to global theme
      if (!savedMode || !(savedMode === 'light' || savedMode === 'dark')) {
        const globalMode = localStorage.getItem('themeMode') as ThemeMode;
        if (globalMode && (globalMode === 'light' || globalMode === 'dark')) {
          savedMode = globalMode;
        } else {
          savedMode = 'light'; // Default fallback
        }
      }
      
      // Set mode with validation
      if (savedMode === 'light' || savedMode === 'dark') {
        setMode(savedMode);
      }
      
      // If no tenant-specific color is found, fall back to global color
      // Check if we have a valid hex color
      if (savedColor?.startsWith('#') && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(savedColor)) {
        setColor(savedColor);
      } else if (!savedColor) {
        const globalColor = localStorage.getItem('themeColor') as ThemeColor;
        if (globalColor?.startsWith('#') && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(globalColor)) {
          savedColor = globalColor;
        } else {
          savedColor = safeMode === 'dark' ? DEFAULT_DARK_COLOR : DEFAULT_LIGHT_COLOR;
        }
        setColor(savedColor);
      } else {
        // Invalid color, use default
        savedColor = safeMode === 'dark' ? DEFAULT_DARK_COLOR : DEFAULT_LIGHT_COLOR;
        setColor(savedColor);
      }
      
      if (savedFont && ['inter', 'roboto', 'poppins', 'montserrat', 'opensans', 'underdog'].includes(savedFont)) {
        setFontFamily(savedFont);
      }
    } catch (error) {
      console.error('Error loading theme from localStorage:', error);
      // Reset to defaults if there's an error
      setMode('light');
      setColor('blue');
      setFontFamily('inter');
    }
  }, []);

  // Ensure we have valid values before creating the theme
  const safeMode = mode === 'light' || mode === 'dark' ? mode : 'light';
  
  // Generate theme from hex color
  let colorScheme;
  if (color?.startsWith('#') && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
    // Use the provided hex color
    colorScheme = generateColorsFromHex(color, safeMode === 'dark');
  } else {
    // Fallback to default color
    const defaultHex = safeMode === 'dark' ? DEFAULT_DARK_COLOR : DEFAULT_LIGHT_COLOR;
    colorScheme = generateColorsFromHex(defaultHex, safeMode === 'dark');
  }
  
  const safeColor = color; // Keep the original color value for reference
  const safeFontFamily = ['inter', 'roboto', 'poppins', 'montserrat', 'opensans', 'underdog'].includes(fontFamily) ? fontFamily : 'inter';
  
  // Font family mapping
  const fontFamilyMap = {
    inter: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    roboto: '"Roboto", "Helvetica", "Arial", sans-serif',
    poppins: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
    montserrat: '"Montserrat", "Roboto", "Helvetica", "Arial", sans-serif',
    opensans: '"Open Sans", "Roboto", "Helvetica", "Arial", sans-serif',
    underdog: '"Underdog", cursive'
  };

  const theme = createTheme({
    // Define breakpoints
    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 960,
        lg: 1280,
        xl: 1920,
      },
    },
    // Define spacing unit (in px)
    spacing: 8,
    // Configure transitions
    transitions: {
      easing: {
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
        easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
      },
      duration: {
        shortest: 150,
        shorter: 200,
        short: 250,
        standard: 300,
        complex: 375,
        enteringScreen: 225,
        leavingScreen: 195,
      },
    },
    // Define zIndex values
    zIndex: {
      mobileStepper: 1000,
      speedDial: 1050,
      appBar: 1100,
      drawer: 1200,
      modal: 1300,
      snackbar: 1400,
      tooltip: 1500,
    },
    // Configure shadows
    shadows: [
      'none',
      '0 2px 4px rgba(0,0,0,0.05)',
      '0 4px 8px rgba(0,0,0,0.08)',
      '0 6px 12px rgba(0,0,0,0.1)',
      '0 8px 16px rgba(0,0,0,0.12)',
      '0 10px 20px rgba(0,0,0,0.14)',
      '0 12px 24px rgba(0,0,0,0.16)',
      '0 14px 28px rgba(0,0,0,0.18)',
      '0 16px 32px rgba(0,0,0,0.2)',
      '0 18px 36px rgba(0,0,0,0.22)',
      '0 20px 40px rgba(0,0,0,0.24)',
      '0 22px 44px rgba(0,0,0,0.26)',
      '0 24px 48px rgba(0,0,0,0.28)',
      '0 26px 52px rgba(0,0,0,0.3)',
      '0 28px 56px rgba(0,0,0,0.32)',
      '0 30px 60px rgba(0,0,0,0.34)',
      '0 32px 64px rgba(0,0,0,0.36)',
      '0 34px 68px rgba(0,0,0,0.38)',
      '0 36px 72px rgba(0,0,0,0.4)',
      '0 38px 76px rgba(0,0,0,0.42)',
      '0 40px 80px rgba(0,0,0,0.44)',
      '0 42px 84px rgba(0,0,0,0.46)',
      '0 44px 88px rgba(0,0,0,0.48)',
      '0 46px 92px rgba(0,0,0,0.5)',
      '0 48px 96px rgba(0,0,0,0.52)'
    ],
    palette: {
      mode: safeMode,
      primary: {
        main: colorScheme.primary,
        light: colorScheme.accent2,
        dark: colorScheme.accent3,
      },
      secondary: {
        main: colorScheme.secondary,
      },
      background: {
        default: colorScheme.background,
        paper: colorScheme.paper,
      },
      success: {
        main: colorScheme.success,
      },
      warning: {
        main: colorScheme.warning,
      },
      error: {
        main: colorScheme.error,
      },
      info: {
        main: colorScheme.info,
      },
      // Map custom accent colors to standard MUI palette keys
      grey: {
        50: safeMode === 'light' ? alpha(colorScheme.accent1, 0.05) : alpha(colorScheme.accent1, 0.15),
        100: safeMode === 'light' ? alpha(colorScheme.accent1, 0.1) : alpha(colorScheme.accent1, 0.2),
        200: safeMode === 'light' ? alpha(colorScheme.accent1, 0.2) : alpha(colorScheme.accent1, 0.3),
        300: safeMode === 'light' ? alpha(colorScheme.accent1, 0.3) : alpha(colorScheme.accent1, 0.4),
        400: safeMode === 'light' ? alpha(colorScheme.accent1, 0.4) : alpha(colorScheme.accent1, 0.5),
        500: safeMode === 'light' ? alpha(colorScheme.accent1, 0.5) : alpha(colorScheme.accent1, 0.6),
        600: safeMode === 'light' ? alpha(colorScheme.accent1, 0.6) : alpha(colorScheme.accent1, 0.7),
        700: safeMode === 'light' ? alpha(colorScheme.accent1, 0.7) : alpha(colorScheme.accent1, 0.8),
        800: safeMode === 'light' ? alpha(colorScheme.accent1, 0.8) : alpha(colorScheme.accent1, 0.9),
        900: safeMode === 'light' ? alpha(colorScheme.accent1, 0.9) : alpha(colorScheme.accent1, 1.0),
      },
      action: {
        hover: alpha(colorScheme.accent2, 0.08),
        selected: alpha(colorScheme.accent2, 0.16),
        disabled: alpha(colorScheme.accent2, 0.3),
        disabledBackground: alpha(colorScheme.accent2, 0.12),
        focus: alpha(colorScheme.accent2, 0.12),
      },
      divider: safeMode === 'light' 
        ? alpha(colorScheme.accent1, 0.12) 
        : alpha(colorScheme.accent1, 0.2),
    } as any,
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: ({ theme }: { theme: Theme }) => ({
            boxShadow: theme.palette.mode === 'light' 
              ? '0 2px 4px rgba(0,0,0,0.08)' 
              : '0 2px 4px rgba(0,0,0,0.15)',
            zIndex: theme.zIndex.appBar,
          }),
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: ({ theme }: { theme: Theme }) => ({
            backgroundImage: theme.palette.mode === 'light' 
              ? 'linear-gradient(rgba(255,255,255,0.05), rgba(255,255,255,0.05))' 
              : 'linear-gradient(rgba(0,0,0,0.15), rgba(0,0,0,0.15))',
            borderRadius: 0,
            boxShadow: theme.palette.mode === 'light'
              ? '0 0 10px rgba(0,0,0,0.05)'
              : '0 0 10px rgba(0,0,0,0.2)',
            transition: 'box-shadow 0.3s ease-in-out, width 0.3s ease-in-out',
          }),
        },
      },
      MuiCard: {
        styleOverrides: {
          root: ({ theme }: { theme: Theme }) => ({
            boxShadow: theme.palette.mode === 'light' 
              ? '0 2px 8px rgba(0,0,0,0.06)' 
              : '0 2px 8px rgba(0,0,0,0.2)',
            transition: 'box-shadow 0.3s ease-in-out',
            borderRadius: theme.shape.borderRadius,
            overflow: 'hidden',
            '&:hover': {
              boxShadow: theme.palette.mode === 'light' 
                ? '0 4px 12px rgba(0,0,0,0.1)' 
                : '0 4px 12px rgba(0,0,0,0.3)',
            },
          }),
        },
      },
      MuiButton: {
        styleOverrides: {
          root: ({ theme }: { theme: Theme }) => ({
            textTransform: 'none',
            borderRadius: theme.shape.borderRadius,
            transition: 'all 0.2s ease-in-out',
          }),
          contained: ({ theme }: { theme: Theme }) => ({
            boxShadow: 'none',
            '&:hover': {
              boxShadow: theme.shadows[2],
              transform: 'translateY(-1px)',
            },
          }),
          outlined: ({ theme }: { theme: Theme }) => ({
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.04),
            },
          }),
        },
      },
      // Enhanced MuiDataGrid component overrides
      [`${gridClasses.root}`]: {
        styleOverrides: {
          root: ({ theme }: { theme: Theme }) => ({
            border: 'none',
            borderRadius: theme.shape.borderRadius,
            '&:focus': {
              outline: 'none',
            },
            '& .MuiDataGrid-main': {
              // Remove outline on focus
              '&:focus-within': {
                outline: 'none',
              },
            },
            // Customize scrollbars for better visibility
            '& ::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '& ::-webkit-scrollbar-track': {
              backgroundColor: theme.palette.mode === 'light' 
                ? alpha(theme.palette.grey[200], 0.5)
                : alpha(theme.palette.grey[900], 0.5),
              borderRadius: '4px',
            },
            '& ::-webkit-scrollbar-thumb': {
              backgroundColor: theme.palette.mode === 'light'
                ? theme.palette.grey[400]
                : theme.palette.grey[700],
              borderRadius: '4px',
              '&:hover': {
                backgroundColor: theme.palette.mode === 'light'
                  ? theme.palette.grey[600]
                  : theme.palette.grey[500],
              },
            },
          }),
          columnHeader: ({ theme }: { theme: Theme }) => ({
            backgroundColor: theme.palette.mode === 'light' 
              ? theme.palette.grey[50] 
              : theme.palette.grey[900],
            fontWeight: theme.typography.fontWeightMedium,
            fontSize: theme.typography.caption.fontSize,
            letterSpacing: '0.05em',
            padding: `${theme.spacing(1)} ${theme.spacing(2)}`,
            textTransform: 'uppercase',
            color: theme.palette.mode === 'light'
              ? theme.palette.grey[800]
              : theme.palette.grey[100],
            borderBottom: `1px solid ${
              theme.palette.mode === 'light'
                ? theme.palette.grey[300]
                : theme.palette.grey[700]
            }`,
            '&:focus': {
              outline: 'none',
            },
            '&:focus-within': {
              outline: 'none',
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontWeight: theme.typography.fontWeightMedium,
            },
            '& .MuiDataGrid-columnSeparator': {
              color: theme.palette.mode === 'light'
                ? theme.palette.grey[200]
                : theme.palette.grey[700],
            },
            '& .MuiDataGrid-columnHeaderTitleContainer': {
              padding: `0 ${theme.spacing(1)}`,
            },
          }),
          cell: ({ theme }: { theme: Theme }) => ({
            padding: `${theme.spacing(0.5)} ${theme.spacing(1.25)}`,
            borderBottom: `1px solid ${
              theme.palette.mode === 'light'
                ? theme.palette.grey[200]
                : theme.palette.grey[800]
            }`,
            fontSize: theme.typography.body2.fontSize,
            '&:focus': {
              outline: 'none',
            },
            '&:focus-within': {
              outline: 'none',
            },
          }),
          row: ({ theme }: { theme: Theme }) => ({
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
            '&.Mui-selected': {
              backgroundColor: alpha(theme.palette.primary.main, 0.08),
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.12),
              },
            },
          }),
          virtualScroller: ({ theme }: { theme: Theme }) => ({
            backgroundColor: theme.palette.background.paper,
          }),
          toolbarContainer: ({ theme }: { theme: Theme }) => ({
            padding: theme.spacing(2),
            backgroundColor: theme.palette.mode === 'light'
              ? alpha(theme.palette.primary.light, 0.05)
              : alpha(theme.palette.primary.dark, 0.1),
            borderTopLeftRadius: theme.shape.borderRadius,
            borderTopRightRadius: theme.shape.borderRadius,
            borderBottom: `1px solid ${
              theme.palette.mode === 'light'
                ? theme.palette.grey[200]
                : theme.palette.grey[800]
            }`,
          }),
          footerContainer: ({ theme }: { theme: Theme }) => ({
            borderTop: `1px solid ${
              theme.palette.mode === 'light'
                ? theme.palette.grey[200]
                : theme.palette.grey[800]
            }`,
            backgroundColor: theme.palette.mode === 'light'
              ? theme.palette.grey[50]
              : theme.palette.grey[900],
            borderBottomLeftRadius: theme.shape.borderRadius,
            borderBottomRightRadius: theme.shape.borderRadius,
            '& .MuiTablePagination-root': {
              color: theme.palette.text.secondary,
            },
            '& .MuiTablePagination-selectIcon': {
              color: theme.palette.text.secondary,
            },
          }),
          // Customize column menu
          panel: ({ theme }: { theme: Theme }) => ({
            backgroundColor: theme.palette.background.paper,
            borderRadius: theme.shape.borderRadius,
            boxShadow: theme.shadows[3],
          }),
          // Customize no rows overlay
          overlay: ({ theme }: { theme: Theme }) => ({
            backgroundColor: alpha(theme.palette.background.paper, 0.75),
            '& .MuiDataGrid-overlayContent': {
              color: theme.palette.text.secondary,
            },
          }),
          // Customize column headers
          columnHeaderCheckbox: ({ theme }: { theme: Theme }) => ({
            '& .MuiCheckbox-root': {
              padding: theme.spacing(0.5),
            },
          }),
          // Customize cell checkboxes
          cellCheckbox: ({ theme }: { theme: Theme }) => ({
            '& .MuiCheckbox-root': {
              padding: theme.spacing(0.5),
            },
          }),
        },
      },
      // Add MuiChip component overrides
      MuiChip: {
        styleOverrides: {
          root: ({ theme }: { theme: Theme }) => ({
            height: theme.spacing(4),
            borderRadius: theme.shape.borderRadiusLarge,
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              boxShadow: theme.palette.mode === 'light'
                ? '0 2px 4px rgba(0,0,0,0.1)'
                : '0 2px 4px rgba(0,0,0,0.2)',
            },
          }),
          label: ({ theme }: { theme: Theme }) => ({
            padding: `${theme.spacing(0.5)} ${theme.spacing(1.5)}`,
            fontSize: theme.typography.caption.fontSize,
          }),
          colorPrimary: ({ theme }: { theme: Theme }) => ({
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            color: theme.palette.primary.main,
          }),
          colorSecondary: ({ theme }: { theme: Theme }) => ({
            backgroundColor: alpha(theme.palette.secondary.main, 0.1),
            color: theme.palette.secondary.main,
          }),
          deleteIcon: ({ theme }: { theme: Theme }) => ({
            color: 'inherit',
            opacity: 0.7,
            '&:hover': {
              opacity: 1,
            },
          }),
        },
      },
      // Add MuiIconButton component overrides
      MuiIconButton: {
        styleOverrides: {
          root: ({ theme }: { theme: Theme }) => ({
            borderRadius: theme.shape.borderRadius,
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              backgroundColor: theme.palette.mode === 'light'
                ? alpha(theme.palette.primary.main, 0.04)
                : alpha(theme.palette.primary.main, 0.08),
            },
          }),
          colorPrimary: ({ theme }: { theme: Theme }) => ({
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
            },
          }),
        },
      },
      // Add MuiPopover component overrides
      MuiPopover: {
        styleOverrides: {
          paper: ({ theme }: { theme: Theme }) => ({
            boxShadow: theme.palette.mode === 'light'
              ? '0 2px 10px rgba(0,0,0,0.1)'
              : '0 2px 10px rgba(0,0,0,0.25)',
            borderRadius: theme.shape.borderRadius,
            overflow: 'hidden',
          }),
        },
      },
      // Add MuiTextField component overrides
      MuiTextField: {
        styleOverrides: {
          root: ({ theme }: { theme: Theme }) => ({
            marginBottom: theme.spacing(2),
            '& .MuiInputLabel-root': {
              fontSize: theme.typography.body2.fontSize,
              color: theme.palette.mode === 'dark'
                ? alpha(theme.palette.common.white, 0.7)
                : alpha(theme.palette.common.black, 0.7),
            },
            '& .MuiInputBase-input': {
              fontSize: theme.typography.body2.fontSize,
            },
            '& .MuiOutlinedInput-root': {
              // Empty state
              '& fieldset': {
                borderColor: theme.palette.mode === 'dark' 
                  ? alpha(theme.palette.common.white, 0.3) 
                  : alpha(theme.palette.common.black, 0.38), // Darker border in light mode
                borderWidth: 1,
              },
              // Hover state
              '&:hover fieldset': {
                borderColor: theme.palette.mode === 'dark' 
                  ? alpha(theme.palette.common.white, 0.5) 
                  : alpha(theme.palette.common.black, 0.55), // Darker hover border in light mode
              },
              // Focused state
              '&.Mui-focused fieldset': {
                borderColor: theme.palette.primary.main,
                borderWidth: 2,
              },
              // Filled state (when the field has a value)
              '&.Mui-filled fieldset': {
                borderColor: theme.palette.mode === 'dark'
                  ? alpha(theme.palette.common.white, 0.4)
                  : alpha(theme.palette.common.black, 0.45),
              },
              // Error state
              '&.Mui-error fieldset': {
                borderColor: theme.palette.error.main,
              },
              // Add box shadow on focus for better visual feedback
              // '&.Mui-focused': {
              //   boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
              // },
            },
          }),
        },
      },
      // Add MuiOutlinedInput component overrides
      MuiOutlinedInput: {
        styleOverrides: {
          root: ({ theme }: { theme: Theme }) => ({
            borderRadius: theme.shape.borderRadius,
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              borderColor: theme.palette.primary.main,
            },
            '&.Mui-focused': {
              boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
            },
            // Empty state
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.mode === 'dark'
                ? alpha(theme.palette.common.white, 0.3)
                : alpha(theme.palette.common.black, 0.38), // Darker in light mode
              borderWidth: 1,
            },
            // Hover state
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.mode === 'dark'
                ? alpha(theme.palette.common.white, 0.5)
                : alpha(theme.palette.common.black, 0.55), // Darker hover in light mode
            },
            // Focused state
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.primary.main,
              borderWidth: 2,
            },
            // Disabled state
            '&.Mui-disabled .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.mode === 'dark'
                ? alpha(theme.palette.common.white, 0.15)
                : alpha(theme.palette.common.black, 0.2),
            },
            // Error state
            '&.Mui-error .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.error.main,
            },
          }),
          notchedOutline: ({ theme }: { theme: Theme }) => ({
            transition: 'border-color 0.2s ease-in-out',
          }),
        },
      },
      // Add MuiSelect component overrides
      MuiSelect: {
        styleOverrides: {
          select: ({ theme }: { theme: Theme }) => ({
            fontSize: theme.typography.body2.fontSize,
            padding: `${theme.spacing(1.5)} ${theme.spacing(1.5)}`,
          }),
        },
      },
      // Add MuiMenuItem component overrides
      MuiMenuItem: {
        styleOverrides: {
          root: ({ theme }: { theme: Theme }) => ({
            fontSize: theme.typography.body2.fontSize,
            padding: `${theme.spacing(1)} ${theme.spacing(2)}`,
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
            '&.Mui-selected': {
              backgroundColor: alpha(theme.palette.primary.main, 0.08),
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.12),
              },
            },
          }),
        },
      },
      // Add MuiDialog component overrides
      MuiDialog: {
        styleOverrides: {
          paper: ({ theme }: { theme: Theme }) => ({
            borderRadius: theme.shape.borderRadius,
            boxShadow: theme.shadows[4],
            '&.MuiDialog-paperFullScreen': {
              borderRadius: 0,
            },
          }),
        },
      },
      // Add MuiDialogTitle component overrides
      MuiDialogTitle: {
        styleOverrides: {
          root: ({ theme }: { theme: Theme }) => ({
            padding: theme.spacing(3),
            fontSize: theme.typography.h5.fontSize,
            fontWeight: theme.typography.h5.fontWeight,
          }),
        },
      },
      // Add MuiDialogContent component overrides
      MuiDialogContent: {
        styleOverrides: {
          root: ({ theme }: { theme: Theme }) => ({
            padding: theme.spacing(3),
          }),
        },
      },
      // Add MuiDialogActions component overrides
      MuiDialogActions: {
        styleOverrides: {
          root: ({ theme }: { theme: Theme }) => ({
            padding: theme.spacing(2, 3),
          }),
        },
      },
      // Add MuiAlert component overrides
      MuiAlert: {
        styleOverrides: {
          root: ({ theme }: { theme: Theme }) => ({
            borderRadius: theme.shape.borderRadius,
            padding: theme.spacing(1, 2),
          }),
          standardSuccess: ({ theme }: { theme: Theme }) => ({
            backgroundColor: alpha(theme.palette.success.main, 0.1),
            color: theme.palette.success.dark,
          }),
          standardInfo: ({ theme }: { theme: Theme }) => ({
            backgroundColor: alpha(theme.palette.info.main, 0.1),
            color: theme.palette.info.dark,
          }),
          standardWarning: ({ theme }: { theme: Theme }) => ({
            backgroundColor: alpha(theme.palette.warning.main, 0.1),
            color: theme.palette.warning.dark,
          }),
          standardError: ({ theme }: { theme: Theme }) => ({
            backgroundColor: alpha(theme.palette.error.main, 0.1),
            color: theme.palette.error.dark,
          }),
          message: ({ theme }: { theme: Theme }) => ({
            fontSize: theme.typography.body2.fontSize,
            padding: theme.spacing(0.5, 0),
          }),
          icon: ({ theme }: { theme: Theme }) => ({
            padding: theme.spacing(0.5, 0),
          }),
        },
      },
      // Add MuiSnackbar component overrides
      MuiSnackbar: {
        styleOverrides: {
          root: ({ theme }: { theme: Theme }) => ({
            zIndex: theme.zIndex.snackbar,
          }),
        },
      },
      // Add MuiTooltip component overrides
      MuiTooltip: {
        styleOverrides: {
          tooltip: ({ theme }: { theme: Theme }) => ({
            backgroundColor: theme.palette.mode === 'light'
              ? alpha(theme.palette.grey[800], 0.9)
              : alpha(theme.palette.grey[700], 0.9),
            borderRadius: theme.shape.borderRadius,
            fontSize: theme.typography.caption.fontSize,
            padding: theme.spacing(0.75, 1.5),
            maxWidth: 300,
          }),
          arrow: ({ theme }: { theme: Theme }) => ({
            color: theme.palette.mode === 'light'
              ? alpha(theme.palette.grey[800], 0.9)
              : alpha(theme.palette.grey[700], 0.9),
          }),
        },
      },
      // Add MuiDivider component overrides
      MuiDivider: {
        styleOverrides: {
          root: ({ theme }: { theme: Theme }) => ({
            borderColor: theme.palette.divider,
            margin: theme.spacing(2, 0),
          }),
        },
      },
    },
    shape: {
      borderRadius: 3, // Default border radius
      // Extended border radius values
      borderRadiusSmall: 2,
      borderRadiusMedium: 4,
      borderRadiusLarge: 8,
      borderRadiusExtraLarge: 12,
    } as any, // Type assertion needed for custom properties
    typography: {
      fontFamily: fontFamilyMap[safeFontFamily],
      // Comprehensive typography scale
      h1: {
        fontWeight: 700,
        fontSize: '2.5rem',  // 40px
        lineHeight: 1.2,
        letterSpacing: '-0.01562em',
        marginBottom: '0.5em',
      },
      h2: {
        fontWeight: 700,
        fontSize: '2rem',    // 32px
        lineHeight: 1.2,
        letterSpacing: '-0.00833em',
        marginBottom: '0.5em',
      },
      h3: {
        fontWeight: 600,
        fontSize: '1.75rem', // 28px
        lineHeight: 1.3,
        letterSpacing: '0em',
        marginBottom: '0.5em',
      },
      h4: {
        fontWeight: 600,
        fontSize: '1.5rem',  // 24px
        lineHeight: 1.35,
        letterSpacing: '0.00735em',
        marginBottom: '0.5em',
      },
      h5: {
        fontWeight: 600,
        fontSize: '1.25rem', // 20px
        lineHeight: 1.4,
        letterSpacing: '0em',
        marginBottom: '0.5em',
      },
      h6: {
        fontWeight: 600,
        fontSize: '1.125rem', // 18px
        lineHeight: 1.4,
        letterSpacing: '0.0075em',
        marginBottom: '0.5em',
      },
      subtitle1: {
        fontWeight: 500,
        fontSize: '1rem',    // 16px
        lineHeight: 1.5,
        letterSpacing: '0.00938em',
      },
      subtitle2: {
        fontWeight: 500,
        fontSize: '0.875rem', // 14px
        lineHeight: 1.5,
        letterSpacing: '0.00714em',
      },
      body1: {
        fontWeight: 400,
        fontSize: '1rem',    // 16px
        lineHeight: 1.5,
        letterSpacing: '0.00938em',
      },
      body2: {
        fontWeight: 400,
        fontSize: '0.875rem', // 14px
        lineHeight: 1.5,
        letterSpacing: '0.01071em',
      },
      button: {
        fontWeight: 500,
        fontSize: '0.875rem', // 14px
        lineHeight: 1.75,
        letterSpacing: '0.02857em',
        textTransform: 'none',
      },
      caption: {
        fontWeight: 400,
        fontSize: '0.75rem',  // 12px
        lineHeight: 1.5,
        letterSpacing: '0.03333em',
      },
      overline: {
        fontWeight: 500,
        fontSize: '0.75rem',  // 12px
        lineHeight: 1.5,
        letterSpacing: '0.08333em',
        textTransform: 'uppercase',
      },
    },
  });

  const toggleTheme = () => {
    const newMode = safeMode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    
    // Determine if we're in admin context
    const pathParts = typeof window !== 'undefined' ? window.location.pathname.split('/') : [];
    const tenant = pathParts[1] || '';
    const isAdmin = pathParts[2] === 'Crm' || pathParts[2] === 'admin';
    
    if (tenant) {
      if (isAdmin) {
        // Admin route - only set admin-specific key
        localStorage.setItem(`${tenant}_admin_themeMode`, newMode);
      } else {
        // User/store route - set tenant-specific key
        localStorage.setItem(`${tenant}_themeMode`, newMode);
      }
    } else {
      // No tenant - set global key
      localStorage.setItem('themeMode', newMode);
    }
  };

  const changeThemeColor = (newColor: ThemeColor) => {
    setColor(newColor);
    
    // Determine if we're in admin context
    const pathParts = typeof window !== 'undefined' ? window.location.pathname.split('/') : [];
    const tenant = pathParts[1] || '';
    const isAdmin = pathParts[2] === 'Crm' || pathParts[2] === 'admin';
    
    if (tenant) {
      if (isAdmin) {
        // Admin route - only set admin-specific key
        localStorage.setItem(`${tenant}_admin_themeColor`, newColor);
      } else {
        // User/store route - set tenant-specific key
        localStorage.setItem(`${tenant}_themeColor`, newColor);
      }
    } else {
      // No tenant - set global key
      localStorage.setItem('themeColor', newColor);
    }
  };
  
  const changeFontFamily = (newFont: FontFamily) => {
    setFontFamily(newFont);
    // Keep font family global for now
    localStorage.setItem('fontFamily', newFont);
  };

  // Apply responsive font sizes
  const responsiveTheme = responsiveFontSizes(theme, {
    breakpoints: ['xs', 'sm', 'md', 'lg', 'xl'],
    factor: 2, // Slightly more aggressive scaling
  });

  return (
    <ThemeContext.Provider value={{ mode: safeMode, color: safeColor, fontFamily: safeFontFamily, toggleTheme, changeThemeColor, changeFontFamily }}>
      <UnderdogFontLoader />
      <MuiThemeProvider theme={responsiveTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};