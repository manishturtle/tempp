/**
 * Feature flag constants for wallet and loyalty features
 */
export const WALLET = 'wallet';
export const LOYALTY = 'loyalty';

/**
 * Check if a feature is enabled for the current tenant
 * @param featureName - The name of the feature to check
 * @param clientId - The client ID of the current tenant
 * @param tenantConfig - The tenant configuration object
 * @returns True if the feature is enabled, false otherwise
 */
export const isFeatureEnabled = (
  featureName: string, 
  clientId: string | undefined,
  tenantConfig: Record<string, any> | null | undefined
): boolean => {
  if (!tenantConfig || !clientId) return false;
  
  const features = tenantConfig.features || {};
  return features[featureName]?.enabled === true;
};

/**
 * Helper function to get tenant configuration
 * This is a simplified implementation - in a real app, this would be fetched from an API
 * @param clientId - The client ID of the current tenant
 * @returns A promise that resolves to the tenant configuration
 */
export const getTenantConfiguration = async (clientId: string): Promise<Record<string, any>> => {
  // In a real app, this would make an API call
  return Promise.resolve({
    features: {
      [WALLET]: { enabled: true },
      [LOYALTY]: { enabled: true }
    }
  });
};
