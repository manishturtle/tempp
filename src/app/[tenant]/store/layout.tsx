"use client";

import React, { useEffect, useState } from "react";
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
import { useCustomerGroupSellingChannel } from "@/app/hooks/api/store/useCustomerGroupSellingChannel";

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
    kill_switch: boolean;
    default_delivery_zone: string;
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
  
  // KillSwitch redirect effect
  const storeConfig = useContext(StoreConfigContext);
  useEffect(() => {
    // Check if store configuration is loaded and kill_switch is true
    if (storeConfig && storeConfig.feature_toggle_settings.kill_switch) {
      // Extract tenant slug from URL path
      const pathParts = pathname.split("/");
      const currentTenantSlug = pathParts[1];
      
      // Only redirect if not already on the maintenance page
      if (!pathname.includes("site-under-maintenance")) {
        // Redirect to maintenance page
        router.push(`/${currentTenantSlug}/site-under-maintenance`);
      }
    }
  }, [storeConfig, pathname, router]);

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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
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
                        country = comp.long_name;
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
    const customerGroupKey = `${currentTenantSlug}_customer_group_id`;
    const [segmentDetails, setSegmentDetails] = useState<any | null>(null);
    const [customerGroupId, setCustomerGroupId] = useState<number | null>(null);

    // On mount, check localStorage for both segment details and customer group ID
    useEffect(() => {
      if (!segmentKey || !customerGroupKey) return;
      const existingSegment = localStorage.getItem(segmentKey);
      const existingCustomerGroupId = localStorage.getItem(customerGroupKey);
      if (existingSegment && existingCustomerGroupId) {
        try {
          setSegmentDetails(JSON.parse(existingSegment));
          setCustomerGroupId(parseInt(existingCustomerGroupId, 10));
        } catch (e) {
          console.error('Error parsing segment details or customer group ID from localStorage', e);
        }
      }
    }, [segmentKey, customerGroupKey]);

    // Compare localStorage customer_group_id with segmentDetails.customer_group_id
    const customerGroupIdFromStorage = typeof window !== 'undefined' ? localStorage.getItem(customerGroupKey) : null;
    const segmentDetailsFromStorage = typeof window !== 'undefined' ? localStorage.getItem(segmentKey) : null;
    
    let segmentDetailsObj = null;
    try {
      segmentDetailsObj = segmentDetailsFromStorage ? JSON.parse(segmentDetailsFromStorage) : null;
    } catch (e) {
      console.error('Error parsing segment details from localStorage', e);
    }

    const customerGroupIdNumber = customerGroupIdFromStorage ? parseInt(customerGroupIdFromStorage, 10) : null;
    const segmentCustomerGroupId = segmentDetailsObj?.customer_group_id;

    // If customer_group_id from localStorage doesn't match customer_group_id inside segmentDetails, call API
    const shouldFetch = !segmentDetailsObj || !customerGroupIdFromStorage || customerGroupIdNumber !== segmentCustomerGroupId;
    const { data: segmentData, isSuccess } = useCustomerGroupSellingChannel({
      customerGroupId: typeof customerGroupIdNumber === 'number' && !isNaN(customerGroupIdNumber) ? customerGroupIdNumber : '',
      sellingChannelName: 'Ecommerce',
    });

    // Store in localStorage when fetched from API or if customerGroupId changed
    useEffect(() => {
      if (isSuccess && segmentData && segmentKey && (shouldFetch || !segmentDetails)) {
        localStorage.setItem(segmentKey, JSON.stringify(segmentData));
        if (segmentData.customer_group_id) {
          localStorage.setItem(customerGroupKey, segmentData.customer_group_id.toString());
          setCustomerGroupId(segmentData.customer_group_id);
        }
        setSegmentDetails(segmentData);
      }
    }, [isSuccess, segmentData, segmentKey, segmentDetails, shouldFetch, customerGroupKey]);
    return null;
  }
  
  // KillSwitch check component
  function KillSwitchCheck() {
    const storeConfig = useStoreConfig();
    const router = useRouter();
    const pathname = usePathname();
    
    useEffect(() => {
      // Check if kill_switch is true
      if (storeConfig.feature_toggle_settings.kill_switch) {
        // Extract tenant slug from URL path
        const pathParts = pathname.split("/");
        const currentTenantSlug = pathParts[1];
        
        // Only redirect if not already on the maintenance page
        if (!pathname.includes("site-under-maintenance")) {
          // Redirect to maintenance page
          router.push(`/${currentTenantSlug}/site-under-maintenance`);
        }
      }
    }, [storeConfig, pathname, router]);
    
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
                            <KillSwitchCheck />
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
