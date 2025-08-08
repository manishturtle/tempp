import { z } from 'zod';

export const workflowFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  enable_partial_fulfillment: z.boolean().default(true),
  max_hold_time_days: z.number().min(1).default(14),
  notes: z.string().optional(),
});

export type WorkflowFormData = z.infer<typeof workflowFormSchema>;
