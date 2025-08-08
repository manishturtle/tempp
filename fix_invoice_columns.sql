-- Set the search path to erp_turtle schema
SET search_path TO erp_turtle;

-- First, check if the table exists to avoid errors
DO $$
BEGIN
  -- The error indicates we need to rename or add columns
  -- to match what the BaseTenantModel expects
  
  -- Try to add created_by and updated_by columns if they don't exist
  BEGIN
    ALTER TABLE invoices_invoice ADD COLUMN created_by INTEGER NULL;
    RAISE NOTICE 'Added created_by column';
  EXCEPTION
    WHEN duplicate_column THEN
      RAISE NOTICE 'created_by column already exists';
  END;
  
  BEGIN
    ALTER TABLE invoices_invoice ADD COLUMN updated_by INTEGER NULL;
    RAISE NOTICE 'Added updated_by column';
  EXCEPTION
    WHEN duplicate_column THEN
      RAISE NOTICE 'updated_by column already exists';
  END;
  
  -- Copy data from _id columns if they exist
  BEGIN
    UPDATE invoices_invoice SET created_by = created_by_id WHERE created_by IS NULL AND created_by_id IS NOT NULL;
    UPDATE invoices_invoice SET updated_by = updated_by_id WHERE updated_by IS NULL AND updated_by_id IS NOT NULL;
    RAISE NOTICE 'Copied data from _id columns to regular columns';
  EXCEPTION
    WHEN undefined_column THEN
      RAISE NOTICE 'One of the columns does not exist';
  END;
  
END $$;
