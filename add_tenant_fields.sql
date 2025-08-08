-- Add client_id and company_id fields to FulfillmentLocation table
ALTER TABLE public.ecomm_inventory_fulfillmentlocation 
ADD COLUMN IF NOT EXISTS client_id integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS company_id integer NOT NULL DEFAULT 1;

-- Add client_id and company_id fields to AdjustmentReason table
ALTER TABLE public.ecomm_inventory_adjustmentreason 
ADD COLUMN IF NOT EXISTS client_id integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS company_id integer NOT NULL DEFAULT 1;

-- Add client_id and company_id fields to Inventory table
ALTER TABLE public.ecomm_inventory_inventory 
ADD COLUMN IF NOT EXISTS client_id integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS company_id integer NOT NULL DEFAULT 1;

-- Add client_id and company_id fields to SerializedInventory table
ALTER TABLE public.ecomm_inventory_serializedinventory 
ADD COLUMN IF NOT EXISTS client_id integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS company_id integer NOT NULL DEFAULT 1;

-- Add client_id and company_id fields to Lot table
ALTER TABLE public.ecomm_inventory_lot 
ADD COLUMN IF NOT EXISTS client_id integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS company_id integer NOT NULL DEFAULT 1;

-- Add client_id and company_id fields to InventoryAdjustment table
ALTER TABLE public.ecomm_inventory_inventoryadjustment 
ADD COLUMN IF NOT EXISTS client_id integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS company_id integer NOT NULL DEFAULT 1;

-- Add foreign key constraints
ALTER TABLE public.ecomm_inventory_fulfillmentlocation 
ADD CONSTRAINT fk_fulfillmentlocation_client 
FOREIGN KEY (client_id) REFERENCES public.tenants_tenant(id);

ALTER TABLE public.ecomm_inventory_adjustmentreason 
ADD CONSTRAINT fk_adjustmentreason_client 
FOREIGN KEY (client_id) REFERENCES public.tenants_tenant(id);

ALTER TABLE public.ecomm_inventory_inventory 
ADD CONSTRAINT fk_inventory_client 
FOREIGN KEY (client_id) REFERENCES public.tenants_tenant(id);

ALTER TABLE public.ecomm_inventory_serializedinventory 
ADD CONSTRAINT fk_serializedinventory_client 
FOREIGN KEY (client_id) REFERENCES public.tenants_tenant(id);

ALTER TABLE public.ecomm_inventory_lot 
ADD CONSTRAINT fk_lot_client 
FOREIGN KEY (client_id) REFERENCES public.tenants_tenant(id);

ALTER TABLE public.ecomm_inventory_inventoryadjustment 
ADD CONSTRAINT fk_inventoryadjustment_client 
FOREIGN KEY (client_id) REFERENCES public.tenants_tenant(id);
