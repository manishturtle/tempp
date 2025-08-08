import { z } from 'zod';

/**
 * Zod schema for wallet rules configuration
 */
export const walletRulesSchema = z.object({
  minimumBuyIn: z.number().int().positive(),
  bonusPercentage: z.number().min(0).max(100),
  minimumPayout: z.number().int().positive(),
});

/**
 * Zod schema for loyalty program rules configuration
 */
export const loyaltyProgramRulesSchema = z.object({
  pointsRate: z.number().positive(),
  redeemRate: z.number().positive(),
  pointsPerDollar: z.number().positive(),
  minimumPoints: z.number().int().positive(),
  pointsValidity: z.number().int().positive(),
});

/**
 * Zod schema for feature toggles configuration
 */
export const featureTogglesSchema = z.object({
  walletSystem: z.boolean(),
  loyaltyProgram: z.boolean(),
  productReviews: z.boolean(),
  wishlist: z.boolean(),
});

/**
 * Zod schema for general store settings configuration
 */
export const generalStoreSettingsSchema = z.object({
  storeName: z.string().min(3),
  storeUrl: z.string().url(),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(10),
});

/**
 * Zod schema for general features tab configuration
 */
export const generalFeaturesSchema = z.object({
  pendingPaymentTimeout: z.number().positive().int(),
  generalStoreSettings: generalStoreSettingsSchema,
  featureToggles: featureTogglesSchema,
  walletRules: walletRulesSchema.optional(),
  loyaltyProgramRules: loyaltyProgramRulesSchema.optional(),
});

/**
 * Currency object schema
 */
export const currencySchema = z.object({
  code: z.string(),
  name: z.string()
});


/**
 * Complete schema for the configuration form
 */
export const configurationFormSchema = z.object({
  generalFeatures: generalFeaturesSchema,
});

/**
 * TypeScript type derived from the configuration form schema
 */
export type ConfigurationFormData = z.infer<typeof configurationFormSchema>;
export type GeneralFeaturesData = z.infer<typeof generalFeaturesSchema>;
