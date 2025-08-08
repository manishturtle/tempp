import { z } from "zod";

// Pincode type matching the API response
export const PincodeSchema = z.object({
  id: z.number(),
  pincode: z.string().regex(/^\d+$/, "Pincode must contain only numbers"),
  city: z.string().nullable(),
  district: z.string(),
  state: z.string(),
  country_code: z.string()
});

export type Pincode = z.infer<typeof PincodeSchema>;

// Zod schema for form validation
export const ShippingZoneFormSchema = z.object({
  zone_name: z.string().min(1, "Zone name is required"),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
  pincodes: z.array(PincodeSchema).min(1, "At least one pincode is required"),
});

// TypeScript type derived from the Zod schema
export type ShippingZoneFormData = z.infer<typeof ShippingZoneFormSchema>;