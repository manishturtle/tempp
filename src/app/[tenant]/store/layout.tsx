"use client";

import React, { useEffect, useState, useMemo } from "react";
import { GOOGLE_MAPS_API_KEY } from "@/app/constant";
import { Box, Toolbar, useMediaQuery } from "@mui/material";
import { useTranslation } from "react-i18next";
import { ThemeProvider } from "@/app/theme/ThemeContext";
import { LanguageProvider } from "@/app/i18n/LanguageContext";
import { I18nextProvider } from "react-i18next";
import i18n from "@/app/i18n/i18n-config";
import { QueryProvider } from "@/app/components/providers/QueryProvider";
import { AuthProvider } from "@/app/contexts/AuthContext";
import { ProductSKUProvider } from "@/app/contexts/ProductSKUContext";
import { OrderProvider } from "@/app/contexts/OrderContext";
import { InvoiceProvider } from "@/app/contexts/InvoiceContext";
import { OrderDetailProvider } from "@/app/contexts/OrderDetailContext";
import { SearchProvider } from "@/app/contexts/SearchContext";
import { AuthRefreshProvider } from "@/app/contexts/AuthRefreshContext";
import { Header } from "@/app/components/layouts/Header";
import { createContext, useContext } from "react";
import { usePathname, useRouter } from "next/navigation";
import { StoreConfigProvider } from "./StoreConfigProvider";
import { useCustomerGroupSellingChannel } from "../../hooks/api/store/useCustomerGroupSellingChannel";

/**
 * Context to provide store configuration throughout the application
 */
export interface StoreConfigContextType {
  checkout_configuration: {
    id: number;
    allow_guest_checkout: boolean;
    min_order_value: string;
    allow_user_select_shipping: boolean;
    fulfillment_type: string;
    pickup_method_label: string;
    enable_delivery_prefs: boolean;
    enable_preferred_date: boolean;
    enable_time_slots: boolean;
    currency: string;
    customer_group_selling_channel: number | null;
    is_active: boolean;
  };
  ui_template_settings: {
    id: number;
    product_card_style: string;
    pdp_layout_style: string;
    checkout_layout: string;
    customer_group_selling_channel: number | null;
    is_active: boolean;
  };
  feature_toggle_settings: {
    id: number;
    wallet_enabled: boolean;
    loyalty_enabled: boolean;
    reviews_enabled: boolean;
    wishlist_enabled: boolean;
    min_recharge_amount: string;
    max_recharge_amount: string;
    daily_transaction_limit: string;
    customer_group_selling_channel: number | null;
    is_active: boolean;
  };
}

export const StoreConfigContext = createContext<StoreConfigContextType | null>(
  null
);

/**
 * Hook to access store configuration data
 * @returns {StoreConfigContextType} Store configuration data
 */
export const useStoreConfig = (): StoreConfigContextType => {
  const context = useContext(StoreConfigContext);
  if (!context) {
    throw new Error("useStoreConfig must be used within a StoreConfigProvider");
  }
  return context;
};

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const { t } = useTranslation("common");
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width:600px)");

  // --- Google Maps Geocode Address Logger ---
  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") return;

    // Get current tenant from URL
    const pathParts = window.location.pathname.split("/");
    const currentTenantSlug = pathParts[1];
    if (!currentTenantSlug) return;
    const locationKey = `${currentTenantSlug}_location`;
    // Check if we already have location data for this tenant
    const existingLocation = localStorage.getItem(locationKey);
    if (existingLocation) {
      try {
        const locationData = JSON.parse(existingLocation);
        if (locationData.country && locationData.pincode && locationData.state) {
          console.log(
            "Using existing location from localStorage:",
            locationData
          );
          return; // Skip geocoding if we already have valid location data
        }
      } catch (e) {
        console.error("Error parsing location data from localStorage", e);
      }
    }
    if (!GOOGLE_MAPS_API_KEY) {
      console.error("Google Maps API key is missing");
      return;
    }
    // Prevent multiple script loads
    if (document.getElementById("google-maps-script")) return;
    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&language=en`;
    script.async = true;
    script.onload = () => {
      if (navigator.geolocation && window.google?.maps) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode(
              {
                location: {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                },
              },
              (results, status) => {
                if (status === "OK" && results && results[0]) {
                  const components = results[0].address_components;
                  let country = "";
                  let pincode = "";
                  let state = "";
                  if (components && Array.isArray(components)) {
                    for (const comp of components) {
                      if (comp.types.includes("country")) {
                        country = comp.short_name; // Gets 'IN' instead of 'India'
                      }
                      if (comp.types.includes("postal_code")) {
                        pincode = comp.long_name;
                      }
                      if (comp.types.includes("administrative_area_level_1")) {
                        state = comp.long_name;
                      }
                    }
                  }
                  try {
                    if (currentTenantSlug) {
                      localStorage.setItem(
                        locationKey,
                        JSON.stringify({ country, state, pincode })
                      );
                    }
                  } catch (err) {
                    console.error(
                      "Failed to store location in localStorage",
                      err
                    );
                  }
                } else {
                  console.error("Geocoder failed:", status);
                }
              }
            );
          },
          (error) => {
            console.error("Geolocation error:", error);
          }
        );
      } else {
        console.error("Google Maps or Geolocation not available");
      }
    };
    document.body.appendChild(script);
    // Cleanup
    return () => {
      const el = document.getElementById("google-maps-script");
      if (el) el.remove();
    };
  }, []);
  // --- End Google Maps Geocode Address Logger ---

  useEffect(() => {
    // Skip if we're already on the correct path
    if (pathname === `/${pathname.split("/")[1]}/store/`) {
      return;
    }

    // Extract tenant slug from URL path
    // Example: /Atad18/store/checkout/ -> Atad18
    const pathParts = pathname.split("/");
    const currentTenantSlug = pathParts[1]; // The tenant slug is the first part of the path

    // Only proceed if we have a valid tenant slug from the URL
    if (!currentTenantSlug) {
      console.warn("No tenant slug found in URL path");
      return;
    }

    // Get the stored tenant slug
    const storedTenantSlug = localStorage.getItem("currentTenantSlug");

    // Only update and reload if the tenant has changed or we don't have a stored tenant
    if (!storedTenantSlug || storedTenantSlug !== currentTenantSlug) {
      // Store the current tenant slug in localStorage
      localStorage.setItem("currentTenantSlug", currentTenantSlug);

      // No need to clear previous tenant data as we're using tenant-prefixed keys
      console.log(`Switched to tenant: ${currentTenantSlug}`);

      // Force a full page reload to ensure all context providers re-initialize
      // with the new tenant's data
      // Don't navigate to store root if path contains '/cart'
      if (!pathname.includes("/cart")) {
        window.location.href = `/${currentTenantSlug}/store/`;
      }
    }
  }, [pathname]);

  // Segment details caching logic moved to child component
  function SegmentDetailsCache() {
    const pathParts = typeof window !== "undefined" ? window.location.pathname.split("/") : [];
    const currentTenantSlug = pathParts[1];
    const segmentKey = `${currentTenantSlug}_segmentdetails`;
    const authUserKey = `${currentTenantSlug}_auth_user`;
    const [segmentDetails, setSegmentDetails] = useState<any | null>(null);
    const [customerGroupId, setCustomerGroupId] = useState<number | null>(null);
    const [hasAuthUser, setHasAuthUser] = useState<boolean>(false);
    const [customerGroupIdFromAuth, setCustomerGroupIdFromAuth] = useState<number | null>(null);

    // Initialize state from localStorage on mount
    useEffect(() => {
      if (typeof window === 'undefined') return;
      
      // Check auth_user
      const existingAuthUser = localStorage.getItem(authUserKey);
      console.log('Initial state setup - authUserKey:', authUserKey);
      console.log('Initial state setup - existingAuthUser:', existingAuthUser);
      
      if (existingAuthUser) {
        try {
          const authUserObj = JSON.parse(existingAuthUser);
          const customerGroupId = authUserObj.customer_group_id || null;
          console.log('Initial state setup - authUserObj:', authUserObj);
          console.log('Initial state setup - customerGroupId:', customerGroupId);
          
          setHasAuthUser(true);
          setCustomerGroupIdFromAuth(customerGroupId ? parseInt(customerGroupId, 10) : null);
          setCustomerGroupId(customerGroupId);
        } catch (e) {
          console.error('Error parsing auth_user from localStorage', e);
          setHasAuthUser(false);
        }
      } else {
        console.log('No auth_user found in localStorage');
        setHasAuthUser(false);
      }

      // Check segment details
      const segmentDetailsFromStorage = localStorage.getItem(segmentKey);
      if (segmentDetailsFromStorage) {
        try {
          const segmentDetailsObj = JSON.parse(segmentDetailsFromStorage);
          setSegmentDetails(segmentDetailsObj);
        } catch (e) {
          console.error('Error parsing segment details from localStorage', e);
        }
      }
    }, [segmentKey, authUserKey]);

    // Determine if we should fetch data
    const shouldFetch = useMemo(() => {
      if (!segmentDetails) return true; // No segment details exist
      if (hasAuthUser && customerGroupIdFromAuth && segmentDetails.customer_group_id !== customerGroupIdFromAuth) {
        return true; // Auth user exists but customer_group_id doesn't match
      }
      return false;
    }, [segmentDetails, hasAuthUser, customerGroupIdFromAuth]);

    // Create query parameters based on whether auth_user exists
    // First check if ${currentTenantSlug}_auth_user exists in localStorage
    const queryParams = useMemo(() => {
      // Check if auth_user exists in localStorage
      const authUserExists = typeof window !== 'undefined' ? localStorage.getItem(authUserKey) : null;
      // Check if access_token exists in localStorage
      const accessTokenKey = `${currentTenantSlug}_access_token`;
      const accessTokenExists = typeof window !== 'undefined' ? localStorage.getItem(accessTokenKey) : null;
      
      // Parse auth_user data directly to get customer_group_id
      let authUserCustomerGroupId = null;
      if (authUserExists) {
        try {
          const authUserObj = JSON.parse(authUserExists);
          authUserCustomerGroupId = authUserObj.customer_group_id || null;
        } catch (e) {
          console.error('Error parsing auth_user in queryParams', e);
        }
      }
      
      // Debug logging
      console.log('Debug - Auth User Check:', {
        authUserKey,
        accessTokenKey,
        authUserExists: !!authUserExists,
        accessTokenExists: !!accessTokenExists,
        authUserCustomerGroupId,
        hasAuthUser,
        customerGroupIdFromAuth,
        authUserData: authUserExists ? JSON.parse(authUserExists) : null
      });
      
      // If we have both auth_user and access_token, use customer_group_id
      if (authUserExists && accessTokenExists && authUserCustomerGroupId) {
        console.log('Using customerGroupId path:', authUserCustomerGroupId);
        return {
          customerGroupId: authUserCustomerGroupId,
          sellingChannelId: 3 // hardcoded as requested (3 = Web)
        };
      } else {
        // If auth_user or access_token not found
        console.log('Using sellingChannelId path - missing auth_user or access_token');
        return {
          customerGroupId: '', // Empty string when no auth_user or access_token
          sellingChannelId: 3 // hardcoded as requested (3 = Web)
        };
      }
    }, [currentTenantSlug, authUserKey]);

    // Fetch data using the appropriate parameters (only when shouldFetch is true)
    const { data: segmentData, isSuccess, isError, error } = useCustomerGroupSellingChannel({
      ...queryParams,
      enabled: shouldFetch
    });

    // Store in localStorage when fetched from API
    useEffect(() => {
      if (isSuccess && segmentData && segmentKey) {
        // Save segment details to localStorage
        localStorage.setItem(segmentKey, JSON.stringify(segmentData));
        
        // If we have customer_group_id in the response and auth_user exists
        if (segmentData.customer_group_id && hasAuthUser) {
          try {
            const existingAuthUser = localStorage.getItem(authUserKey);
            if (existingAuthUser) {
              const updatedAuthUser = JSON.parse(existingAuthUser);
              updatedAuthUser.customer_group_id = segmentData.customer_group_id;
              localStorage.setItem(authUserKey, JSON.stringify(updatedAuthUser));
              setCustomerGroupId(segmentData.customer_group_id);
              setCustomerGroupIdFromAuth(segmentData.customer_group_id);
            }
          } catch (e) {
            console.error('Error updating customer_group_id in auth_user', e);
          }
        }
        
        setSegmentDetails(segmentData);
      }
    }, [isSuccess, segmentData, segmentKey, authUserKey, hasAuthUser]);

    // Log errors for debugging
    useEffect(() => {
      if (isError && error) {
        console.error('Error fetching segment data:', error);
      }
    }, [isError, error]);
    return null;
  }

  return (
    <QueryProvider>
      <SegmentDetailsCache />
      <AuthProvider>
        <ThemeProvider>
          <I18nextProvider i18n={i18n}>
            <LanguageProvider>
              <SearchProvider>
                <ProductSKUProvider>
                  <OrderProvider>
                    <InvoiceProvider>
                      <OrderDetailProvider>
                        <AuthRefreshProvider>
                          <StoreConfigProvider>
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                minHeight: "100vh",
                              }}
                            >
                              {/* Store Header */}
                              <Header />

                              {/* Toolbar spacer - pushes content below fixed header */}
                              {isMobile ? null : <Toolbar />}

                              {/* Main Content */}
                              <Box
                                component="main"
                                sx={{
                                  backgroundColor: (theme) =>
                                    theme.palette.grey[50],
                                  flexGrow: 1,
                                  py: { xs: 2, sm: 3, md: 1 },
                                  px: { xs: 0, sm: 0 },
                                }}
                              >
                                {children}
                              </Box>

                              {/* Store Footer */}
                              {/* <Footer /> */}
                            </Box>
                          </StoreConfigProvider>
                        </AuthRefreshProvider>
                      </OrderDetailProvider>
                    </InvoiceProvider>
                  </OrderProvider>
                </ProductSKUProvider>
              </SearchProvider>
            </LanguageProvider>
          </I18nextProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
