

"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

import { AI_PLATFORM_API_BASE_URL } from "../../../utils/constants";
import { getAuthHeaders } from "../../../app/hooks/api/auth";

interface TenantContextType {
  tenantSlug: string | null;
  apiBaseUrl: string | null;
  // We can remove isLoading from the context type if we handle it all here,
  // but it's good practice to keep it for components that might need it.
  isLoading: boolean;
}

const TenantContext = createContext<TenantContextType>({
  tenantSlug: null,
  apiBaseUrl: null,
  isLoading: true,
});

export const useTenant = () => useContext(TenantContext);

interface TenantProviderProps {
  children: ReactNode;
}

export const TenantProvider = ({ children }: TenantProviderProps) => {
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [apiBaseUrl, setApiBaseUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // This will only run on the client side
    const getInitialTenant = () => {
      // First try to get from cookie (most up-to-date)
      const cookieValue = document.cookie
        .split("; ")
        .find((row) => row.startsWith("x-tenant-slug="))
        ?.split("=")[1];

      if (cookieValue) {
        const decodedSlug = decodeURIComponent(cookieValue);
        // Always sync cookie to localStorage
        if (localStorage.getItem("currentTenantSlug") !== decodedSlug) {
          localStorage.setItem("currentTenantSlug", decodedSlug);
        }
        return decodedSlug;
      }

      // Fallback to localStorage
      return localStorage.getItem("currentTenantSlug");
    };

    let slug = getInitialTenant();

    // Listen for storage events (changes from other tabs/windows)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "currentTenantSlug") {
        setTenantSlug(event.newValue);
      }
    };

    // Listen for custom tenant change events
    const handleTenantChange = (event: CustomEvent) => {
      const newTenant = event.detail?.tenantSlug;
      if (newTenant) {
        setTenantSlug(newTenant);
      }
    };

    // Add event listeners
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(
      "tenantChange",
      handleTenantChange as EventListener
    );

    // Expose a global function that can be called from the injected script
    (window as any).updateTenantContext = (newTenant: string) => {
      setTenantSlug(newTenant);
      // Dispatch a custom event that other parts of the app can listen to
      window.dispatchEvent(
        new CustomEvent("tenantChange", {
          detail: { tenantSlug: newTenant },
        })
      );
    };

    // Default to current origin if not set in environment variables
    const defaultApiUrl = window.location.origin;

    const apiBaseUrl = AI_PLATFORM_API_BASE_URL;

    setTenantSlug(slug);
    setApiBaseUrl(apiBaseUrl || defaultApiUrl);
    setIsLoading(false);
  }, []);

  // ⬇️ *** THE FIX IS HERE *** ⬇️
  // While loading, we render nothing. This prevents children from
  // rendering and trying to fetch data with a null apiBaseUrl.
  if (isLoading) {
    return null; // Or you could return a global loading spinner here
  }

  // Once isLoading is false, we render the provider with the children.
  return (
    <TenantContext.Provider
      value={{ tenantSlug, apiBaseUrl, isLoading: false }}
    >
      {children}
    </TenantContext.Provider>
  );
};
