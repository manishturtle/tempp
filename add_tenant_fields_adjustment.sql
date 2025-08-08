-- Add client_id and company_id fields to InventoryAdjustment table
ALTER TABLE public.ecomm_inventory_inventoryadjustment 
ADD COLUMN IF NOT EXISTS client_id integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS company_id integer NOT NULL DEFAULT 1;
