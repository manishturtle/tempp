"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Container, Box, CircularProgress } from "@mui/material";
import Notification from "@/app/components/common/Notification";
import { useStoreConfig } from "../layout";

// Import layout components
import Layout1 from "./layouts/Layout1";

// Define the layout component type
type LayoutComponent = React.ComponentType<{}>;

// Map of layout names to their corresponding components
const LAYOUT_COMPONENTS: Record<string, LayoutComponent> = {
  layout1: Layout1,
  // Add more layouts here as they are created
};

/**
 * Checkout page component
 */
export default function CheckoutPage() {
  const { t } = useTranslation();
  const storeConfig = useStoreConfig();
  
  // Notification state
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error" | "info";
    open: boolean;
  }>({ message: "", type: "info", open: false });
  
  const [isLoading, setIsLoading] = useState(true);
  const [CurrentLayout, setCurrentLayout] = useState<LayoutComponent>(() => Layout1);

  // Handle notification close
  const handleNotificationClose = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };
  
  // Set the current layout based on store config
  useEffect(() => {
    if (storeConfig) {
      const layoutName = storeConfig.ui_template_settings?.checkout_layout || 'layout1';
      const layoutComponent = LAYOUT_COMPONENTS[layoutName] || Layout1;
      setCurrentLayout(() => layoutComponent);
      setIsLoading(false);
    }
  }, [storeConfig]);
  
  // Show loading state while determining layout
  if (isLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{backgroundColor:"white"}}>
      <CurrentLayout />
      
      {/* Notification component */}
      <Notification
        open={notification.open}
        message={notification.message}
        severity={notification.type}
        onClose={handleNotificationClose}
        autoHideDuration={5000}
      />
    </Box>
  );
}
