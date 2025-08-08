import csv
import os
from django.db import migrations
from django.conf import settings

def load_pincode_data(apps, schema_editor):
    """
    Load pincode data from CSV file into PincodeMaster model during migration.
    Handles multi-tenant by adding default tenant info to each record.
    """
    # Get the model
    PincodeMaster = apps.get_model('shipping_zones', 'PincodeMaster')
    
    # Get the CSV file path
    file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'India Pincode Master_New.csv')
    
    # Skip if file doesn't exist
    if not os.path.exists(file_path):
        print(f"Warning: Could not find {file_path}. Pincode data not loaded.")
        return
    
    # Check if there's already data in the table (to avoid duplicate loads)
    if PincodeMaster.objects.count() > 0:
        print("Pincode data already exists, skipping import.")
        return
        
    # Batch size for bulk create
    BATCH_SIZE = 5000
    batch = []
    
    # Process CSV file
    with open(file_path, 'r', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        
        for i, row in enumerate(reader):
            # Create a new pincode entry with city as None
            new_entry = PincodeMaster(
                pincode=row['pincode'].strip(),
                city=None,  # City not provided in the data
                district=row['district'].strip(),
                state=row['statename'].strip(),
                country_code='IN',  # Default as per model
                # Multi-tenant fields added with default values
                client_id=1,  # Default client ID, adjust as needed
                created_by=1,
                updated_by=1
            )
            
            batch.append(new_entry)
            
            # Bulk create in batches
            if len(batch) >= BATCH_SIZE:
                PincodeMaster.objects.bulk_create(batch)
                batch = []
                print(f"Imported {i+1} pincodes...")
        
        # Create any remaining records
        if batch:
            PincodeMaster.objects.bulk_create(batch)
            
    print(f"Successfully imported pincode data into PincodeMaster table")

def reverse_load_pincode_data(apps, schema_editor):
    """
    Remove all pincodes loaded from the CSV.
    """
    PincodeMaster = apps.get_model('shipping_zones', 'PincodeMaster')
    PincodeMaster.objects.all().delete()

class Migration(migrations.Migration):

    dependencies = [
        ('shipping_zones', '0006_alter_pincodemaster_city'),  # Updated to depend on the migration that makes city nullable
    ]

    operations = [
        migrations.RunPython(load_pincode_data, reverse_load_pincode_data),
    ]
