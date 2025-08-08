-- Set the search path to erp_turtle schema
SET search_path TO erp_turtle;

-- Add the created_by column if it doesn't exist
ALTER TABLE invoices_invoice 
ADD COLUMN IF NOT EXISTS created_by INTEGER NULL;

-- Add the updated_by column if it doesn't exist
ALTER TABLE invoices_invoice 
ADD COLUMN IF NOT EXISTS updated_by INTEGER NULL;
