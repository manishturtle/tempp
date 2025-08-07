'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { COCKPIT_API_BASE_URL } from '../../../utils/constants';

interface BrandingConfig {
  branding_config?: {
    company_logo_light?: {
      url: string;
      path: string;
      filename: string;
    };
    company_logo_dark?: {
      url: string;
      path: string;
      filename: string;
    };
    primary_brand_color?: string;
    secondary_brand_color?: string;
  };
}

interface BrandingContextType {
  brandingConfig: BrandingConfig | null;
  isLoading: boolean;
  error: Error | null;
}

const BrandingContext = createContext<BrandingContextType>({
  brandingConfig: null,
  isLoading: true,
  error: null,
});

export const BrandingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [brandingConfig, setBrandingConfig] = useState<BrandingConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchBrandingConfig = async () => {
      try {
        const pathSegments = window.location.pathname.split('/').filter(Boolean);
        const tenantSlug = pathSegments.length > 0 ? pathSegments[0] : null;
        
        if (!tenantSlug) {
          setIsLoading(false);
          return;
        }
        
        const response = await fetch(`${COCKPIT_API_BASE_URL}/${tenantSlug}/tenant-admin/tenant-login-config/`);
        
        if (response.ok) {
          const data = await response.json();
          setBrandingConfig(data);
        }
      } catch (err) {
        console.error('Failed to fetch branding configuration:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch branding configuration'));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBrandingConfig();
  }, []);

  return (
    <BrandingContext.Provider value={{ brandingConfig, isLoading, error }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = (): BrandingContextType => {
  return useContext(BrandingContext);
};
