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
