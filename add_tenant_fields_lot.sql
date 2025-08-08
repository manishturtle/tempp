-- Add client_id and company_id fields to Lot table
ALTER TABLE public.ecomm_inventory_lot 
ADD COLUMN IF NOT EXISTS client_id integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS company_id integer NOT NULL DEFAULT 1;
