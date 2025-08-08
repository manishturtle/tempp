"use client";

import { useEffect } from "react";
import { useBranding } from "../../app/contexts/BrandingContext";

export default function FaviconHandler() {
  const { faviconUrl } = useBranding(); // Get the URL from our context
  useEffect(() => {
    if (!faviconUrl) {
      return;
    }

    try {
      // Find or create the favicon link element
      let faviconLink =
        document.querySelector<HTMLLinkElement>('link[rel="icon"]');

      if (!faviconLink) {
        faviconLink = document.createElement("link");
        faviconLink.rel = "icon";
        document.head.appendChild(faviconLink);
      }

      faviconLink.href = faviconUrl;

      // Find or create the apple-touch-icon link element
      let appleTouchIcon = document.querySelector<HTMLLinkElement>(
        'link[rel="apple-touch-icon"]'
      );

      if (!appleTouchIcon) {
        appleTouchIcon = document.createElement("link");
        appleTouchIcon.rel = "apple-touch-icon";
        document.head.appendChild(appleTouchIcon);
      }

      appleTouchIcon.href = faviconUrl;
    } catch (error) {
      console.error("FaviconHandler: Error setting favicon:", error);
    }
  }, [faviconUrl]); // This effect now runs whenever faviconUrl changes

  return null; // This component does not render anything
}
