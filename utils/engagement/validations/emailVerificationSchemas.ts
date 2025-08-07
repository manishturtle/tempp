import { z } from 'zod';

const MAX_FILE_SIZE_MB = 5; // 5MB - make this configurable from settings/env later
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['text/csv', 'text/plain', 'application/vnd.ms-excel']; // Common CSV MIME types + TXT

// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Schema for file upload
const fileUploadSchema = z.object({
  uploadType: z.literal('file'),
  jobName: z.string().max(100, "Job name cannot exceed 100 characters.").optional().or(z.literal('')),
  emailListFile: z
    .custom<FileList>()
    .refine((files) => files && files.length === 1, "Please select a file.")
    .refine((files) => files && files[0].size <= MAX_FILE_SIZE_BYTES, `File size must be less than ${MAX_FILE_SIZE_MB}MB.`)
    .refine(
      (files) => files && ALLOWED_FILE_TYPES.includes(files[0].type),
      "Invalid file type. Only .csv and .txt files are allowed."
    ),
  manualEmails: z.string().optional()
});

// Schema for manual email entry
const manualEmailSchema = z.object({
  uploadType: z.literal('manual'),
  jobName: z.string().max(100, "Job name cannot exceed 100 characters.").optional().or(z.literal('')),
  emailListFile: z.custom<FileList>().optional(),
  manualEmails: z.string()
    .min(1, "Please enter at least one email address.")
    .refine(
      (emails) => {
        // Split by commas, newlines, or spaces and validate each email
        const emailList = emails.split(/[,\n\s]+/).filter(email => email.trim() !== '');
        return emailList.every(email => EMAIL_REGEX.test(email.trim()));
      },
      "One or more email addresses are invalid. Please check and try again."
    )
});

// Combined schema that accepts either file upload or manual entry
export const bulkUploadFormSchema = z.discriminatedUnion('uploadType', [
  fileUploadSchema,
  manualEmailSchema
]);

export type BulkUploadFormValues = z.infer<typeof bulkUploadFormSchema>;
