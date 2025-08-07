'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import {
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Container,
    Grid,
    MenuItem,
    Select,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    CircularProgress,
    TableHead,
    TableRow,
    Typography,
    LinearProgress,
    Chip,
    SelectChangeEvent
} from '@mui/material';
import Link from 'next/link';
import {
  ThemeProvider,
  createTheme,
  styled
} from '@mui/material/styles';
import {
  BarChart,
  FileDownload,
  Person,
  ShoppingCart,
  Visibility
} from '@mui/icons-material';
import {
  Chart,
  ArcElement,
  LineElement,
  BarElement,
  PointElement,
  CategoryScale,
  LinearScale,
  DoughnutController,
  LineController,
  Tooltip,
  Legend
} from 'chart.js';
// Registering Chart.js components
Chart.register(
  ArcElement,
  LineElement,
  BarElement,
  PointElement,
  CategoryScale,
  LinearScale,
  DoughnutController,
  LineController,
  Tooltip,
  Legend
);

import { COCKPIT_API_BASE_URL } from '@/utils/constants';

// Define a theme to match the design's font and color palette
const theme = createTheme({
  palette: {
      background: {
          default: '#f4f6f8',
          paper: '#ffffff',
      },
      primary: {
          main: '#3f51b5', // Indigo
      },
      secondary: {
          main: '#f50057', // Pink
      },
      success: {
          main: '#4caf50',
      },
      error: {
          main: '#f44336',
      },
      text: {
          primary: '#212B36',
          secondary: '#637381',
      },
  },
  typography: {
      fontFamily: "'Inter', sans-serif",
      h5: {
          fontWeight: 700,
      },
      h6: {
          fontWeight: 600,
      },
      subtitle1: {
          fontWeight: 600,
      },
      body1: {
          fontWeight: 500,
      },
  },
  components: {
      MuiCard: {
          styleOverrides: {
              root: {
                  boxShadow: '0 4px 12px 0 rgba(0,0,0,0.08)',
                  borderRadius: '12px',
                  height: '100%', 
              },
          },
      },
      MuiButton: {
          styleOverrides: {
              root: {
                  borderRadius: '8px',
                  textTransform: 'none',
              },
          },
      },
  },
});

// Styled components for consistency
const StatCard = styled(Card)({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
});

const LegendDot = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'color',
})<{ color: string }>(({ theme, color }) => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  backgroundColor: color,
  marginRight: theme.spacing(1),
}));

// Data for the components
const overviewStats = [{
  title: 'Total Sales',
  value: '₹1,245,890',
  change: '+15.3%',
  changeColor: 'success' as 'success',
  subtext: '+ ₹45,890 from last week',
}, {
  title: 'Total Orders',
  value: '8,564',
  change: '+7.2%',
  changeColor: 'success' as 'success',
  subtext: '+ 356 from last week',
}, {
  title: 'Units Sold',
  value: '15,230',
  change: '+9.8%',
  changeColor: 'success' as 'success',
  subtext: '+ 520 from last week',
}, {
  title: 'New Customers',
  value: '1,243',
  change: '+3.1%',
  changeColor: 'success' as 'success',
  subtext: '+ 42 from last week',
}, ];

const storeAnalytics = [{
  title: 'Unique Visits',
  value: '1,245',
  change: '+5% from yesterday',
  changeColor: 'success',
  // icon: < Visibility color = "primary" / > ,
  }, 
  {
  title: 'Items in Cart',
  value: '268',
  change: '-2.4% from yesterday',
  changeColor: 'error',
  // icon: < ShoppingCart sx = {
  //     {
  //         color: '#9c27b0'
  //     }
  // }
  // />,
}, {
  title: 'Active Sessions',
  value: '156',
  change: '- from yesterday',
  changeColor: 'inherit',
  // icon: < Person color = "success" / > ,
}, {
  title: 'Total Sessions',
  value: '2,456',
  change: '+10% from yesterday',
  changeColor: 'success',
  // icon: < BarChart sx = {
  //     {
  //         color: '#ffc107'
  //     }
  // }
  // />,
}, ];

const conversionFunnel = [{
  title: 'Product Views',
  value: '1,245',
  change: '(+8%)',
  changeColor: 'success.main',
  progress: 90,
  color: '#3f51b5',
}, {
  title: 'Add to Cart',
  value: '810',
  change: '(+5%)',
  changeColor: 'success.main',
  progress: 65,
  color: '#9c27b0',
}, {
  title: 'Checkout',
  value: '498',
  change: '(-1.5%)',
  changeColor: 'error.main',
  progress: 40,
  color: '#673ab7',
}, {
  title: 'Purchase',
  value: '373',
  change: '(+2%)',
  changeColor: 'success.main',
  progress: 30,
  color: '#4caf50',
}, {
  title: 'Abandoned',
  value: '125',
  change: '(+0.5%)',
  changeColor: 'error.main',
  progress: 10,
  color: '#f44336',
}, ];

const topProducts = [{
  name: 'Smartphone XS Pro',
  category: 'Electronics',
  price: '₹78,999',
  quantity: 245,
  amount: '₹19,354,755',
  image: 'https://placehold.co/40x40/94a3b8/ffffff?text=XS',
}, {
  name: 'Wireless Earbuds',
  category: 'Electronics',
  price: '₹12,499',
  quantity: 189,
  amount: '₹2,362,311',
  image: 'https://placehold.co/40x40/a78bfa/ffffff?text=WE',
}, {
  name: 'Designer Watch',
  category: 'Fashion',
  price: '₹24,999',
  quantity: 156,
  amount: '₹3,899,844',
  image: 'https://placehold.co/40x40/f472b6/ffffff?text=DW',
}, {
  name: 'Premium Sneakers',
  category: 'Footwear',
  price: '₹8,499',
  quantity: 132,
  amount: '₹1,121,868',
  image: 'https://placehold.co/40x40/fb923c/ffffff?text=PS',
}, {
  name: 'Skincare Set',
  category: 'Beauty',
  price: '₹4,999',
  quantity: 124,
  amount: '₹619,876',
  image: 'https://placehold.co/40x40/34d399/ffffff?text=SS',
}, ];

const topCustomers = [{
  name: 'Priya Sharma',
  location: 'Mumbai, India',
  amount: '₹145,670',
  avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuATGxBgmLMEbjnGFA_CFFTUers0HXBE9_LG_kWfJX4695wH7kJAFDx6yZ_D7Bv9XJY5ERN62ezYPRUPv-EV-Nm3wl_6fCap7pCh_ZEm_Rp_HjtIAiPeudlNXZiJw_W_O856VpQcFpRd-vQQv1zzZiQC-F7m-h4IA2i4viCH2SeeGw-fepPxTHByz35XyDRcCXE_Mz_0DCGLrnrByn7EQ0gAofIaARYJqfrDmjFXy-QXRG5ZyWkeLFakQFAcBcbDXNw_6KFQt9v3r8M',
}, {
  name: 'Rajesh Kumar',
  location: 'Delhi, India',
  amount: '₹98,450',
  avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCmdZ26f_uxd1xwFcewcldCwE9oMxBTdPIhslHoAfdgMFLkwsweEixrXVn8F4A1GF8GeM8uFC7IASFiaUHsGA5gafESzstuFtn0GgOj3WGWCHrco8nzdX-vZUD8yIpPWgTCvyR4vgzEVYhObmu-HXPGuAKVmv56Q2sZ0iDcSEA23A4-Wm10UsPxm78tB4LW6ikE1PsbKrZaoCclYhnVDL_5Ma8IoPbdYEVDDbpnAG4RTcv_bxaewjNdLCEZFRbilE77VVw35W5oKYc',
}, {
  name: 'Anita Patel',
  location: 'Bangalore, Karnataka',
  amount: '₹87,320',
  avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB36h83NCpI--JizSOWXjZNtyXjlRDhOkcXkLKjNejXz8YChIH2cyZDDs50mJW3Nib0deuXuYgaX3LNe1paVxXGE4UJjz0lh_QWs3oGXZcDLkf1Ck58UArmsmbf2UOB0gcNmE-owCMrzZ_vYa7Cs0vRhK0f8fgfnwOPVnT6GsOBTWhImw9QF-ENANZNsHOQBI5ajL4AgZ05HTZtCgNaoSi5NonaxFnnhFJ7IXflDAksvlkgiB9iky5DPhy5HCX5HZmzQWpkWUonKmA',
}, {
  name: 'Sanjay Mehta',
  location: 'Hyderabad, Telangana',
  amount: '₹76,590',
  avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAsQ3mfpg4SdMc1voQNnmLzdM-tEpax2UAjfJX2xEPqcsSOox9wNh7vXNc2nrPdbJsgbLwxLjNLNa8TvWoVdXorLJEbM_pD5-2BBN0Cqipjx4ZRTXD2VAGgAR3fw0Mx1SYdOF3PHH2J_yYTpf934zZSUCTiTsGnk6Oh82UlT1TbVyHY52GeXs7z4eTQ7z4QZKNu2LunyxqwFa6ySGNrKxP3mUFGplQygzx-55oy0_xOKZ9vwHIF4QnfECnvAEBaF0wOPmZz5Gm3E4M',
}, {
  name: 'Kavita Singh',
  location: 'Chennai, Tamil Nadu',
  amount: '₹65,230',
  avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDQeo1E-3NPwIpiMLdSW8X-BPN521ZoA9MGzRkk3zhb1Kt18VRHbeke5EnrY5JguKWLx3k0RtBgqG6rvJDUiCShmjM1KidXYM8ZRJk6GmrwOg8QOq1ZRGKMVNaUS1id0p7YqkuOyJMyLUwIRcnKSLpl5pznM6OrHDmZIjeG2Zf_KRHm8iZHXqHkfQHp61OUUqak7x8vbCmIfo5IQ3tLV1bVIwopnXRzVwxinokubZBiYhJ1Wt26ehi-25NwJ8HsUVEocqQE7mxBlZg',
}, ];


// Sales Summary Chart Component
const SalesSummaryChart = () => {
  const chartRef = React.useRef(null);

  React.useEffect(() => {
      let newChart: Chart | null = null;
      if (chartRef.current) {
          const ctx = (chartRef.current as HTMLCanvasElement).getContext('2d');
          if (ctx) {
               newChart = new Chart(ctx, {
                  type: 'line',
                  data: {
                      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                      datasets: [{
                          label: 'This Week',
                          data: [12000, 19000, 15000, 22000, 18000, 25000, 20000],
                          borderColor: theme.palette.primary.main,
                          tension: 0.4,
                          fill: false,
                      }, {
                          label: 'Last Week',
                          data: [10000, 17000, 13000, 20000, 16000, 23000, 18000],
                          borderColor: '#e0e0e0',
                          tension: 0.4,
                          fill: false,
                          borderDash: [5, 5],
                      }, ],
                  },
                  options: {
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                          y: {
                              beginAtZero: true
                          }
                      },
                      plugins: {
                          legend: {
                              display: false
                          }
                      },
                  },
              });
          }
      }
      return () => {
          if (newChart) {
              newChart.destroy();
          }
      }
  }, []);

  return <canvas ref = {
      chartRef
  }
  />;
};

// Sales by Location Chart Component
const SalesLocationChart = () => {
  const chartRef = React.useRef(null);

  React.useEffect(() => {
      let newChart: Chart | null = null;
      if (chartRef.current) {
          const ctx = (chartRef.current as HTMLCanvasElement).getContext('2d');
          if(ctx) {
              newChart = new Chart(ctx, {
                  type: 'doughnut',
                  data: {
                      labels: ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Others'],
                      datasets: [{
                          label: 'Sales by Location',
                          data: [345670, 235450, 187320, 145230, 90000],
                          backgroundColor: [
                              '#3f51b5', // blue
                              '#673ab7', // indigo
                              '#9c27b0', // purple
                              '#e91e63', // pink
                              '#f57c00', // orange
                          ],
                          hoverOffset: 4,
                          borderWidth: 0,
                      }, ],
                  },
                  options: {
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: '70%',
                      plugins: {
                          legend: {
                              display: false
                          }
                      },
                  },
              });
          }
      }
      return () => {
          if(newChart) {
              newChart.destroy();
          }
      };
  }, []);

  return <canvas ref = {
      chartRef
  }
  />;
};


export default function TenantPage(): React.ReactElement {
  const params = useParams();
  const tenant = params.tenant as string;
  const authChecked = useRef(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
const [accountFilter, setAccountFilter] = React.useState('weekly');
    const [salesFilter, setSalesFilter] = React.useState('last7');

    const handleAccountFilterChange = (event: SelectChangeEvent) => {
        setAccountFilter(event.target.value as string);
    };

    const handleSalesFilterChange = (event: SelectChangeEvent) => {
        setSalesFilter(event.target.value as string);
    };
  /**
   * Fetches session data from the session API endpoint
   */
  /**
   * Fetches session data from the session API endpoint with optimized handling
   * Uses a combination of sessionStorage and URL cleanup to prevent infinite loops
   */
  const fetchSessionData = async (tenant_slug: string, sessionId: string): Promise<any> => {
    // Use sessionStorage instead of localStorage for session-specific data
    // This is more appropriate as it's cleared when the session ends
    const processedSessions = JSON.parse(sessionStorage.getItem('processed_sessions') || '{}');
    
    // If we've already processed this session, don't make the API call again
    if (processedSessions[sessionId]) {
      console.log('Session already processed, skipping API call');
      return null;
    }
    
    try {
      // Use a cancelable token for better control over the request
      const source = axios.CancelToken.source();
      
      // Set a timeout to cancel the request after 5 seconds
      const timeoutId = setTimeout(() => {
        source.cancel('Request timeout after 5 seconds');
      }, 5000);
      
      const response = await axios.get(
        `${COCKPIT_API_BASE_URL}/${tenant_slug}/auth/session/?session_id=${sessionId}`,
        { cancelToken: source.token }
      );
      
      // Clear the timeout since the request completed
      clearTimeout(timeoutId);
      
      // Only update session storage if we're not in the process of logging out
      if (localStorage.getItem('is_logging_out') !== 'true') {
        // Mark this session as processed
        processedSessions[sessionId] = true;
        sessionStorage.setItem('processed_sessions', JSON.stringify(processedSessions));
      }
      
      return response.data;
    } catch (error) {
      // Only update session storage if we're not in the process of logging out
      if (localStorage.getItem('is_logging_out') !== 'true') {
        // Mark as processed on error to prevent retries
        processedSessions[sessionId] = true;
        sessionStorage.setItem('processed_sessions', JSON.stringify(processedSessions));
      }
      
      if (axios.isCancel(error)) {
        console.warn('Request was cancelled:', error.message);
      } else {
        console.error('Error fetching session data:', error);
      }
      
      throw error;
    }
  };

  /**
   * Handles authentication flow including token extraction, tenant verification, and redirects
   */
  const handleAuth = async (tenant_slug: string): Promise<void> => {
    try {
    const currentUrl = window.location.href;
    const token = localStorage.getItem(`${tenant_slug}_admin_token`);
    const hasCheckedTenant = localStorage.getItem(`${tenant_slug}_admin_has_checked_tenant`);
    const app_id = "1";

    console.log("tenant_slug", tenant_slug);
     
      // If we have a token, proceed with tenant configuration
      if (token && tenant_slug) {
        // Make sure we have tenant_slug stored
        localStorage.setItem(`${tenant_slug}_admin_tenant_slug`, tenant_slug as string);
        localStorage.setItem(`${tenant_slug}_admin_app_id`, app_id || '');
        
        // Call tenant configuration API
        try {
          const configResponse = await fetch(`${COCKPIT_API_BASE_URL}/${tenant_slug}/tenant-admin/tenant-login-config/`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (configResponse.ok) {
            const configData = await configResponse.json();
            console.log('Tenant config data:', configData);
            
            // Check if config data is empty (all empty objects)
            const isEmptyConfig = configData && 
              Object.keys(configData.branding_config || {}).length === 0 &&
              Object.keys(configData.company_info || {}).length === 0 &&
              Object.keys(configData.localization_config || {}).length === 0;
              
            // If config is empty, we should still check tenant existence
            if (isEmptyConfig) {
              console.log('Empty tenant config received, proceeding with tenant existence check...');
              // We'll let the function continue to the tenant existence check below
            } 
            // Extract and store specific configuration values individually
            else if (configData) {
              // Store localization settings with tenant_slug_admin_ prefix
              const localization = configData.localization_config || {};
              localStorage.setItem(`${tenant_slug}_admin_appLanguage`, localization.default_language || 'en');
              
              // Store branding configuration with tenant_slug_admin_ prefix
              const branding = configData.branding_config || {};
              localStorage.setItem(`${tenant_slug}_admin_fontFamily`, branding.default_font_style || 'roboto');
              localStorage.setItem(`${tenant_slug}_admin_themeColor`, branding.primary_brand_color || '');
              localStorage.setItem(`${tenant_slug}_admin_secondaryColor`, branding.secondary_brand_color || '');
              localStorage.setItem(`${tenant_slug}_admin_themeMode`, branding.default_theme_mode || 'system');
              
              // Store logo information with tenant_slug_admin_ prefix - both dark and light versions
              if (branding.company_logo_dark && branding.company_logo_dark.url) {
                localStorage.setItem(`${tenant_slug}_admin_logoDark`, branding.company_logo_dark.url);
              }
              if (branding.company_logo_light && branding.company_logo_light.url) {
                localStorage.setItem(`${tenant_slug}_admin_logoLight`, branding.company_logo_light.url);
              }
              
              // Store company details in a single object
              const companyInfo = configData.company_info || {};
              const companyDetails = {
                name: companyInfo.company_name || '',
                address1: companyInfo.registered_address?.address_line_1 || '',
                address2: companyInfo.registered_address?.address_line_2 || '',
                city: companyInfo.registered_address?.city || '',
                state: companyInfo.registered_address?.state || '',
                country: companyInfo.registered_address?.country || '',
                pincode: companyInfo.registered_address?.postal_code || '',
                gstin: companyInfo.tax_id || '',
                phone: companyInfo.primary_contact_phone || '',
                email: companyInfo.primary_contact_email || ''
              };
              
              // Store as a single JSON string with tenant_slug_admin_ prefix
              localStorage.setItem(`${tenant_slug}_admin_companyDetails`, JSON.stringify(companyDetails));
            }
            
            // Store tenant specific information with tenant_slug_admin_ prefix in localStorage
            localStorage.setItem(`${tenant_slug}_admin_tenant_slug`, tenant_slug as string);
            localStorage.setItem(`${tenant_slug}_admin_app_id`, app_id || '');
            
            // Check onboarding status
            console.log('About to check onboarding status...');
            try {
              const authToken = token || localStorage.getItem(`${tenant_slug}_admin_token`);
              console.log('Using auth token:', authToken ? 'Token exists' : 'No token');
              
              const onboardingResponse = await fetch(`https://bedevstore.turtleit.in/api/v1/onboarding/tenant-configuration-status/`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${authToken}`,
                },
              });
              
              console.log('API response status:', onboardingResponse.status);
              if (onboardingResponse.ok) {
                const onboardingData = await onboardingResponse.json();
                console.log('Onboarding status data:', onboardingData);
                
                // Store onboarding status in localStorage to prevent repeated checks
                const isOnboardingCompleted = onboardingData?.is_onboarding_completed === true;
                localStorage.setItem(`${tenant_slug}_admin_onboarding_completed`, String(isOnboardingCompleted));
                
                // If onboarding is not completed, redirect to onboarding page
                if (onboardingData && !isOnboardingCompleted) {
                  console.log('Onboarding not completed. Redirecting to onboarding page...');
                  window.location.href = `/${tenant_slug}/onboarding`;
                  return; // Stop execution since we're redirecting
                }
              } else {
                console.error('Failed to fetch onboarding status');
              }
            } catch (onboardingErr) {
              console.error('Error checking onboarding status:', onboardingErr);
            }
          } else {
            console.error('Failed to fetch tenant configuration');
          }
        } catch (configErr) {
          console.error('Error fetching tenant configuration:', configErr);
        }
        
        // Remove token from URL without refreshing page
        const newUrl = window.location.pathname +
          window.location.search.replace(/[?&]token=[^&]+/, '') +
          window.location.hash;
        window.history.replaceState({}, document.title, newUrl);
        setIsLoading(false);
        return;
      }

      // Skip tenant check if we have both a token and have checked tenant before
      const storedToken = localStorage.getItem(`${tenant_slug}_admin_token`);
      const storedTenantSlug = localStorage.getItem(`${tenant_slug}_admin_tenant_slug`);
      const hasProcessedTenantCheck = sessionStorage.getItem(`${tenant_slug}_processed_tenant_check`);
      
      // If we already have both a token and have marked the tenant as checked, we can skip the tenant check
      if (storedToken && hasCheckedTenant && storedTenantSlug) {
        console.log("Already authenticated and tenant verified, skipping checks");
        setIsLoading(false);
        return;
      }
      
      // Mark that we've checked tenant in localStorage to prevent future checks
      localStorage.setItem(`${tenant_slug}_admin_has_checked_tenant`, 'true');
      
      // If we already have a token or have processed the tenant check in this session, we can skip the tenant check API call
      if (storedToken || hasProcessedTenantCheck) {
        console.log("Token exists or tenant check already processed, skipping tenant check API");
        setIsLoading(false);
        return;
      }
      
      // Only update session storage if we're not in the process of logging out
      if (localStorage.getItem('is_logging_out') !== 'true') {
        // Mark that we're processing the tenant check in this session
        sessionStorage.setItem(`${tenant_slug}_processed_tenant_check`, 'true');
      }
      
      console.log("No token found, checking tenant...", currentUrl);
      
      // Only perform tenant check API call if we have no token
      const checkTenantResponse = await axios.post(
        `${COCKPIT_API_BASE_URL}/platform-admin/subscription/check-tenant-exist/`,
        {
          application_url: currentUrl,
        }
      );

      const tenantData = checkTenantResponse.data;
      console.log("tenant check response:", tenantData);

      if (tenantData?.redirect_to_iam) {
        console.log("Redirecting to IAM:", tenantData.redirect_to_iam);
        window.location.href = tenantData.redirect_to_iam;
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error in auth flow:", error);
      setError("Authentication error occurred. Please try again.");
      setIsLoading(false);
      
      if (axios.isAxiosError(error) && [401, 403].includes(error.response?.status || 0)) {
        // Get tenant_slug from URL or localStorage for cleanup
        const urlParams = new URLSearchParams(window.location.search);
        const tenantFromUrl = urlParams.get('tenant_slug') || tenant;
        if (tenantFromUrl) {
          localStorage.removeItem(`${tenantFromUrl}_admin_token`);
        }
        // Instead of reloading immediately, let the user see the error
        setTimeout(() => window.location.reload(), 3000);
      }
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || authChecked.current) return;
    
    const checkTenantAndAuth = async () => {
      authChecked.current = true;
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');
      
      // Clean up URL immediately if session_id is present to prevent page refresh issues
      if (sessionId && window.history.replaceState) {
        const currentUrl = new URL(window.location.href);
        urlParams.delete('session_id');
        currentUrl.search = urlParams.toString();
        window.history.replaceState({}, document.title, currentUrl.toString());
      }

      try {
        // First check if tenant exists
        const tenantCheckResponse = await fetch(`${COCKPIT_API_BASE_URL}/${tenant}/tenant-admin/tenant-login-config/`);
        if (!tenantCheckResponse.ok) {
          throw new Error('Tenant not found or inaccessible');
        }
        
        const tenantConfig = await tenantCheckResponse.json();
        // Only validate tenant_id if the config is not empty
        const isEmptyConfig = tenantConfig && 
          Object.keys(tenantConfig.branding_config || {}).length === 0 &&
          Object.keys(tenantConfig.company_info || {}).length === 0 &&
          Object.keys(tenantConfig.localization_config || {}).length === 0;
          
        if (!tenantConfig || (!isEmptyConfig && !tenantConfig.tenant_id)) {
          console.warn('Invalid or empty tenant configuration, but proceeding with tenant check');
          // Don't throw an error, let the handleAuth function handle the tenant check
        }
        
        // Store tenant config for later use if needed
        localStorage.setItem(`${tenant}_config`, JSON.stringify(tenantConfig));
        
        // Now proceed with authentication
        const storedToken = localStorage.getItem(`${tenant}_admin_token`);
        
        // Check if this is a fresh login by looking for sessionId
        const isLogin = sessionId;
        const hasCompletedOnboarding = localStorage.getItem(`${tenant}_admin_onboarding_completed`);
        
        // First try to fetch session data if session ID is present
        if (sessionId) {
          try {
            const sessionData = await fetchSessionData(tenant, sessionId);
            
            // Only process valid session data
            if (sessionData?.access_token) {
              setSessionData(sessionData);
              localStorage.setItem(`${tenant}_admin_token`, sessionData.access_token);
              localStorage.setItem(`${tenant}_admin_tenant_slug`, tenant);
              
              // After setting the token from session, call handleAuth to process tenant admin data
              await handleAuth(tenant);
              return;
            }
          } catch (sessionError) {
            console.error('Error fetching session data:', sessionError);
            // Continue with normal auth flow if session fetch fails
          }
        }
        
        // Call handleAuth in these cases:
        // 1. When we don't have a token (first login)
        // 2. When there's a URL parameter indicating login/token
        // 3. When we haven't checked onboarding status yet
        if (!storedToken || isLogin || !hasCompletedOnboarding) {
          await handleAuth(tenant);
        } else {
          // If we have a token and no login indicators, we're already authenticated
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error during tenant check or authentication:', error);
        setError('Failed to verify tenant or authenticate. Please check the URL and try again.');
        setIsLoading(false);
      }
    };

    checkTenantAndAuth();

    // Cleanup function to reset the flag if component unmounts
    return () => {
      authChecked.current = false;
    };
  }, [tenant]);

  useEffect(() => {
    // Clean up any reload count when component unmounts
    return () => {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('reloadCount');
      }
    };
  }, []);

  if (isLoading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh' 
        }}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Verifying tenant: {tenant}...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          p: 3
        }}
      >
        <Typography variant="h5" color="error" gutterBottom>
          {error}
        </Typography>
        <Typography variant="body1">
          Please check your URL or contact support.
        </Typography>
      </Box>
    );
  }

  return (
       <ThemeProvider theme={theme}>
            <Box sx={{ minHeight: '100vh'}}>
                {/* <Container> */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                        <Typography variant="h5" color="text.primary">
                            Account Overview
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                            <Button variant="contained" color="primary" startIcon={<FileDownload />}>
                                Export Report
                            </Button>
                            <Select value={accountFilter} onChange={handleAccountFilterChange} size="small" sx={{ bgcolor: 'background.paper' }}>
                                <MenuItem value="daily">Daily</MenuItem>
                                <MenuItem value="weekly">Weekly</MenuItem>
                                <MenuItem value="monthly">Monthly</MenuItem>
                                <MenuItem value="quarterly">Quarterly</MenuItem>
                                <MenuItem value="ytd">YTD</MenuItem>
                            </Select>
                        </Box>
                    </Box>

                    <Grid container spacing={3} mb={4}>
                        {overviewStats.map((stat, index) => (
                            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
                                <StatCard>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <Box>
                                                <Typography variant="body1" color="text.secondary">{stat.title}</Typography>
                                                <Typography variant="h5" color="text.primary" sx={{ mt: 0.5 }}>{stat.value}</Typography>
                                            </Box>
                                            <Chip label={stat.change} color={stat.changeColor} size="small" />
                                        </Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
                                            {stat.subtext}
                                        </Typography>
                                    </CardContent>
                                </StatCard>
                            </Grid>
                        ))}
                    </Grid>

                    <Grid container spacing={3} mb={4}>
                        <Grid size={{ xs: 12, lg: 8 }}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                                        <Typography variant="h6" color="text.primary">Sales Summary</Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <LegendDot color={theme.palette.primary.main} />
                                                <Typography variant="caption" color="text.secondary">This Week</Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <LegendDot color="#e0e0e0" />
                                                <Typography variant="caption" color="text.secondary">Last Week</Typography>
                                            </Box>
                                            <Select value={salesFilter} onChange={handleSalesFilterChange} size="small" sx={{ fontSize: '0.75rem' }}>
                                                <MenuItem value="last7">Last 7 Days</MenuItem>
                                            </Select>
                                        </Box>
                                    </Box>
                                    <Box sx={{ height: 300 }}>
                                        <SalesSummaryChart />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid size={{ xs: 12, lg: 4 }}>
                            <Card>
                                <CardContent sx={{ display: 'flex', flexDirection: 'column' }}>
                                    <Typography variant="h6" color="text.primary" mb={2}>Sales by Location</Typography>
                                    <Box sx={{ height: 160, mb: 2, position: 'relative' }}>
                                        <SalesLocationChart />
                                    </Box>
                                    <Box flexGrow={1}>
                                        {[
                                            { label: 'Maharashtra', value: '₹345,670', color: '#3f51b5' },
                                            { label: 'Delhi', value: '₹235,450', color: '#673ab7' },
                                            { label: 'Karnataka', value: '₹187,320', color: '#9c27b0' },
                                            { label: 'Tamil Nadu', value: '₹145,230', color: '#e91e63' },
                                        ].map((item) => (
                                            <Box key={item.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <LegendDot color={item.color} />
                                                    <Typography variant="body2">{item.label}</Typography>
                                                </Box>
                                                <Typography variant="body2" fontWeight="600">{item.value}</Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                    <Box sx={{ textAlign: 'right', mt: 'auto', pt: 1 }}>
                                        <Link href="#">
                                            View Detailed Report→
                                        </Link>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    <Typography variant="h5" color="text.primary" mb={3}>
                        Store Analytics (Today)
                    </Typography>
                    <Grid container spacing={3} mb={4}>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Grid container spacing={3}>
                                {storeAnalytics.map((item, index) => (
                                    <Grid size={{ xs: 12, sm: 6 }} key={index}>
                                        <StatCard>
                                            <CardContent>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <Typography variant="body2" color="text.secondary">{item.title}</Typography>
                                                    {item.icon}
                                                </Box>
                                                <Typography variant="h5" color="text.primary" sx={{ my: 1 }}>{item.value}</Typography>
                                                <Typography variant="caption" color={item.changeColor === 'inherit' ? 'text.secondary' : `${item.changeColor}.main`}>
                                                    {item.change}
                                                </Typography>
                                            </CardContent>
                                        </StatCard>
                                    </Grid>
                                ))}
                            </Grid>
                        </Grid>
                        <Grid size={{ xs: 12, md: 8 }}>
                             <Card>
                                <CardContent sx={{ display: 'flex', flexDirection: 'column' }}>
                                    <Typography variant="h6" color="text.primary" mb={3}>
                                        Conversion Rate Funnel
                                    </Typography>
                                    <Box flexGrow={1} display="flex" flexDirection="column" justifyContent="space-around">
                                        {conversionFunnel.map((item) => (
                                            <Box key={item.title}>
                                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                                                    <Typography variant="body2" color="text.secondary">{item.title}</Typography>
                                                    <Typography variant="body2" fontWeight="600">
                                                        {item.value}{' '}
                                                        <Typography component="span" variant="caption" color={item.changeColor}>
                                                            {item.change}
                                                        </Typography>
                                                    </Typography>
                                                </Box>
                                                <LinearProgress variant="determinate" value={item.progress} sx={{ height: 12, borderRadius: 6, '& .MuiLinearProgress-bar': { backgroundColor: item.color }, }}/>
                                            </Box>
                                        ))}
                                    </Box>
                                    <Typography variant="caption" fontStyle="italic" color="text.secondary" mt={2}>
                                        *These numbers are indicative and non-real-time. The actual count may vary.
                                    </Typography>
                                    <Link href="#">
                                        View Funnel Details→
                                    </Link>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, lg: 8 }}>
                            <Card>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: '1px solid #e0e0e0' }}>
                                    <Typography variant="h6" color="text.primary">Top 5 Selling Products</Typography>
                                    <Link href="#">View All</Link>
                                </Box>
                                <TableContainer>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Product</TableCell>
                                                <TableCell>Category</TableCell>
                                                <TableCell>Price</TableCell>
                                                <TableCell>Quantity</TableCell>
                                                <TableCell>Amount</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {topProducts.map((product) => (
                                                <TableRow key={product.name} hover>
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                            <Avatar src={product.image} alt={product.name} variant="rounded" />
                                                            <Typography variant="body2">{product.name}</Typography>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell>{product.category}</TableCell>
                                                    <TableCell>{product.price}</TableCell>
                                                    <TableCell>{product.quantity}</TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight="600">{product.amount}</Typography>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Card>
                        </Grid>
                        <Grid size={{ xs: 12, lg: 4 }}>
                            <Card>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: '1px solid #e0e0e0' }}>
                                    <Typography variant="h6" color="text.primary">Weekly Top 5 Customers</Typography>
                                    <Link href="#">View All</Link>
                                </Box>
                                <Box p={2}>
                                    {topCustomers.map((customer) => (
                                        <Box key={customer.name} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, '&:last-child': { mb: 0 } }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Avatar src={customer.avatar} alt={customer.name} />
                                                <Box>
                                                    <Typography variant="body2" fontWeight="600">{customer.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{customer.location}</Typography>
                                                </Box>
                                            </Box>
                                            <Typography variant="body2" fontWeight="600">{customer.amount}</Typography>
                                        </Box>
                                    ))}
                                </Box>
                            </Card>
                        </Grid>
                    </Grid>
                {/* </Container> */}
            </Box>
        </ThemeProvider>
  );
}
