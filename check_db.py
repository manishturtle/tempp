"""
Script to check database tables using Django ORM.
"""
import os
import django
import sys

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_backend.settings')
django.setup()

# Import models
from ecomm_inventory.models import (
    FulfillmentLocation, 
    AdjustmentReason, 
    Inventory, 
    SerializedInventory, 
    Lot, 
    InventoryAdjustment
)

# Function to check model fields
def check_model_fields(model_class):
    model_name = model_class.__name__
    fields = [field.name for field in model_class._meta.fields]
    
    print(f"\nModel: {model_name}")
    print(f"Fields: {', '.join(fields)}")
    print(f"client exists: {'client' in fields}")
    print(f"company_id exists: {'company_id' in fields}")

# Check each model
models_to_check = [
    FulfillmentLocation,
    AdjustmentReason,
    Inventory,
    SerializedInventory,
    Lot,
    InventoryAdjustment
]

for model in models_to_check:
    check_model_fields(model)
