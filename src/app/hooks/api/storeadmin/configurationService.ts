import api, { apiEndpoints } from '@/lib/api';
import { ConfigurationFormData } from '@/app/types/admin/configurationValidations';

/**
 * Fetches the current store configuration
 * 
 * @returns The current configuration data
 */
export const getConfiguration = async (): Promise<ConfigurationFormData> => {
  try {
    console.log('Fetching configuration data');
    const response = await api.get(
      apiEndpoints.configuration.admin(),
    );
    console.log('Received configuration data:', response.data);
    
    // Transform API response to frontend format
    return transformApiToConfigFormat(response.data);
  } catch (error) {
    console.error('Error fetching configuration:', error);
    throw error;
  }
};

/**
 * Updates the store configuration with new data
 * 
 * @param data - The updated configuration data
 * @returns The saved configuration data from the backend
 */

/**
 * Transform frontend configuration data to backend API format
 */
const transformConfigToApiFormat = (data: ConfigurationFormData): any => {
  // Create API-compatible structure
  return {
    // Map general store settings
    store_name: data.generalFeatures.generalStoreSettings.storeName,
    store_url: data.generalFeatures.generalStoreSettings.storeUrl,
    contact_email: data.generalFeatures.generalStoreSettings.contactEmail,
    contact_phone: data.generalFeatures.generalStoreSettings.contactPhone,
    
    // Map pending payment timeout
    pending_payment_timeout: data.generalFeatures.pendingPaymentTimeout,
    
    // Map feature toggles
    feature_toggles: {
      WALLET: data.generalFeatures.featureToggles.walletSystem || false, // Ensure WALLET is always included
      LOYALTY: data.generalFeatures.featureToggles.loyaltyProgram || false,
      REVIEWS: data.generalFeatures.featureToggles.productReviews || false,
      WISHLIST: data.generalFeatures.featureToggles.wishlist || false,
      RETURNS: false, // Add the required RETURNS toggle
      EXCHANGE: false, // Add the required EXCHANGE toggle
    },
    
    // Map wallet configuration
    wallet_config: {
      enabled: data.generalFeatures.featureToggles.walletSystem || false, // Add required enabled field
      min_recharge_amount: data.generalFeatures.walletRules?.minimumBuyIn || 10,
      max_recharge_amount: 10000, // Add required max_recharge_amount field
      bonus_percentage: data.generalFeatures.walletRules?.bonusPercentage || 0,
      min_payout: data.generalFeatures.walletRules?.minimumPayout || 10,
    },
    
    // Map loyalty configuration
    loyalty_config: {
      enabled: data.generalFeatures.featureToggles.loyaltyProgram || false, // Add required enabled field
      earn_rate: data.generalFeatures.loyaltyProgramRules?.pointsPerDollar || 1,
      redeem_rate: data.generalFeatures.loyaltyProgramRules?.redeemRate || 0.01,
      redemption_rate: data.generalFeatures.loyaltyProgramRules?.redeemRate || 0.01, // Add required redemption_rate field
      min_points: data.generalFeatures.loyaltyProgramRules?.minimumPoints || 100,
      min_points_for_redemption: data.generalFeatures.loyaltyProgramRules?.minimumPoints || 100, // Add required min_points_for_redemption field
      points_validity: data.generalFeatures.loyaltyProgramRules?.pointsValidity || 365,
    },
    
    // Map payment settings
    payment_settings: {
      enabled_gateways: ["STRIPE", "PAYPAL"], // Default enabled gateways
      default_gateway: "STRIPE", // Add required default_gateway field
    }
  };
};

/**
 * Transform backend API response to frontend format
 */
const transformApiToConfigFormat = (apiData: any): ConfigurationFormData => {
  console.log('Transforming API response to frontend format:', apiData);
  
  // Extract pending payment timeout (safely handle null)
  const pendingPaymentTimeout = apiData.pending_payment_timeout === null ? 30 : apiData.pending_payment_timeout;
  
  return {
    generalFeatures: {
      pendingPaymentTimeout: pendingPaymentTimeout,
      generalStoreSettings: {
        storeName: apiData.store_name || "",
        storeUrl: apiData.store_url || "",
        contactEmail: apiData.contact_email || "",
        contactPhone: apiData.contact_phone || "",
      },
      featureToggles: {
        walletSystem: apiData.feature_toggles?.WALLET || false,
        loyaltyProgram: apiData.feature_toggles?.LOYALTY || false,
        productReviews: apiData.feature_toggles?.REVIEWS || false,
        wishlist: apiData.feature_toggles?.WISHLIST || false,
      },
      walletRules: {
        minimumBuyIn: apiData.wallet_config?.min_recharge_amount || 10,
        bonusPercentage: apiData.wallet_config?.bonus_percentage || 0,
        minimumPayout: apiData.wallet_config?.min_payout || 10,
      },
      loyaltyProgramRules: {
        pointsRate: apiData.loyalty_config?.earn_rate || 1,
        redeemRate: apiData.loyalty_config?.redemption_rate || apiData.loyalty_config?.redeem_rate || 0.01,
        pointsPerDollar: apiData.loyalty_config?.earn_rate || 1,
        minimumPoints: apiData.loyalty_config?.min_points || 100,
        pointsValidity: apiData.loyalty_config?.points_validity || 365,
      },
    }
  };
};



/**
 * Update configuration with transformed data
 */
export const updateConfiguration = async (data: ConfigurationFormData): Promise<ConfigurationFormData> => {
  const apiFormattedData = transformConfigToApiFormat(data);
  console.log('Sending configuration update:', JSON.stringify(apiFormattedData, null, 2));
  
  try {
    const response = await api.put(
      apiEndpoints.configuration.admin(),
      apiFormattedData,
    );
    
    console.log('Configuration update successful:', response.data);
    // Transform API response back to frontend format
    return transformApiToConfigFormat(response.data);
  } catch (error) {
    console.error('Configuration update failed:', error);
    throw error;
  }
};