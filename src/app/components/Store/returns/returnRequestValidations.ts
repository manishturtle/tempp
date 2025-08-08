import { z } from 'zod';

export const returnRequestItemSchema = z.object({
  itemId: z.string(),
  productId: z.string(), // For reference
  name: z.string(), // For display in summary or errors
  imageUrl: z.string().optional(),
  variantInfo: z.string().optional(),
  orderedQuantity: z.number(),
  eligibleQuantity: z.number(),
  unitPriceFormatted: z.string(),
  sku: z.string(), // New field
  // ---- Fields to validate ----
  selected: z.boolean().optional(), // To track if the item row checkbox is ticked
  quantityToReturn: z.number()
    .min(0, { message: "Quantity must be 0 or more." }) // i18n: validation.quantity.minZero
    .max(1000), // Replace 1000 with a reasonable max or remove if not needed
  reason: z.string().optional(), // Optional at item level if only one overall reason, but design shows per item
}).refine(data => !data.selected || (data.quantityToReturn > 0 && data.quantityToReturn <= data.eligibleQuantity), {
  message: "Return quantity must be between 1 and eligible quantity for selected items.", // i18n: validation.quantity.invalidForSelected
  path: ['quantityToReturn'],
}).refine(data => !data.selected || (data.quantityToReturn > 0 && data.reason && data.reason !== ''), {
  message: 'orders.returns.initiation.validation.reasonRequired', // i18n: validation.reason.requiredForSelected
  path: ['reason'],
});

export const returnRequestFormSchema = z.object({
  items: z.array(returnRequestItemSchema),
  additionalComments: z.string().max(500, { message: "Comments cannot exceed 500 characters." }).optional(), // i18n: validation.comments.maxLength
  preferredResolutionId: z.string().optional(),
}).refine(data => data.items.some(item => item.selected && item.quantityToReturn > 0), {
  message: "Please select at least one item and specify quantity/reason to return.", // i18n: validation.noItemSelected
  // This error isn't tied to a specific path, could be a form-level error.
});

export type ReturnRequestFormData = z.infer<typeof returnRequestFormSchema>;
export type ReturnRequestItemFormData = z.infer<typeof returnRequestItemSchema>;
