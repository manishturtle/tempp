import json
import os
from pathlib import Path
from datetime import datetime
from django.db import migrations


def load_country_data(apps, schema_editor):
    """
    Loads country data from sampledata JSON file into the Country table.
    Skips records that already exist based on unique field (iso_code).
    """
    # Get the model
    Country = apps.get_model('shared', 'Country')
    
    # Define path to data file
    base_dir = Path(__file__).parent.parent / 'sampledata'
    country_path = base_dir / 'country.json'
    
    # Skip if file doesn't exist
    if not os.path.exists(country_path):
        print(f"Warning: Could not find {country_path}. Country data not loaded.")
        return
    
    # Check if there's already data in the table (to avoid duplicate loads)
    if Country.objects.count() > 0:
        print("Country data already exists, skipping import.")
        return
    
    # Batch size for bulk create
    BATCH_SIZE = 100
    batch = []
    
    # Load the data file
    with open(country_path, 'r', encoding='utf-8') as f:
        countries = json.load(f)
        
        for i, country_data in enumerate(countries):
            # Map fields from JSON to model fields
            insert_data = {}
            field_mapping = {
                'created_by_id': 'created_by',
                'updated_by_id': 'updated_by'
            }
            
            # Skip date fields that might cause issues
            skip_fields = ['created_at', 'updated_at']
            
            for k, v in country_data.items():
                # Skip date fields
                if k in skip_fields:
                    continue
                    
                # Map field names if needed
                field_name = field_mapping.get(k, k)
                # Only include fields that exist in the model
                if field_name in [f.name for f in Country._meta.fields]:
                    insert_data[field_name] = v
            
            # Add default values for multi-tenant fields if not present
            if 'client_id' not in insert_data:
                insert_data['client_id'] = 1
            if 'company_id' not in insert_data:
                insert_data['company_id'] = 1
            
            # Create a new country entry
            new_entry = Country(**insert_data)
            batch.append(new_entry)
            
            # Bulk create in batches
            if len(batch) >= BATCH_SIZE:
                try:
                    Country.objects.bulk_create(batch, ignore_conflicts=True)
                except Exception as e:
                    print(f"Error importing countries: {e}")
                    # Try one by one if bulk fails
                    for entry in batch:
                        try:
                            entry.save()
                        except Exception as e2:
                            print(f"Error importing country {entry.iso_code if hasattr(entry, 'iso_code') else 'unknown'}: {e2}")
                batch = []
                print(f"Imported {i+1} countries...")
        
        # Create any remaining records
        if batch:
            try:
                Country.objects.bulk_create(batch, ignore_conflicts=True)
            except Exception as e:
                print(f"Error importing remaining countries: {e}")
                # Try one by one if bulk fails
                for entry in batch:
                    try:
                        entry.save()
                    except Exception as e2:
                        print(f"Error importing country {entry.iso_code if hasattr(entry, 'iso_code') else 'unknown'}: {e2}")
    
    print(f"Successfully imported country data into Country table")


def load_currency_data(apps, schema_editor):
    """
    Loads currency data from sampledata JSON file into the Currency table.
    Skips records that already exist based on unique field (code).
    """
    # Get the model
    Currency = apps.get_model('shared', 'Currency')
    
    # Define path to data file
    base_dir = Path(__file__).parent.parent / 'sampledata'
    currency_path = base_dir / 'currency.json'
    
    # Skip if file doesn't exist
    if not os.path.exists(currency_path):
        print(f"Warning: Could not find {currency_path}. Currency data not loaded.")
        return
    
    # Check if there's already data in the table (to avoid duplicate loads)
    if Currency.objects.count() > 0:
        print("Currency data already exists, skipping import.")
        return
    
    # Batch size for bulk create
    BATCH_SIZE = 100
    batch = []
    
    # Load the data file
    with open(currency_path, 'r', encoding='utf-8') as f:
        currencies = json.load(f)
        
        for i, currency_data in enumerate(currencies):
            # Map fields from JSON to model fields
            insert_data = {}
            field_mapping = {
                'created_by_id': 'created_by',
                'updated_by_id': 'updated_by'
            }
            
            # Skip date fields that might cause issues
            skip_fields = ['created_at', 'updated_at']
            
            for k, v in currency_data.items():
                # Skip date fields
                if k in skip_fields:
                    continue
                    
                # Map field names if needed
                field_name = field_mapping.get(k, k)
                # Only include fields that exist in the model
                if field_name in [f.name for f in Currency._meta.fields]:
                    insert_data[field_name] = v
            
            # Add default values for multi-tenant fields if not present
            if 'client_id' not in insert_data:
                insert_data['client_id'] = 1
            if 'company_id' not in insert_data:
                insert_data['company_id'] = 1
            
            # Create a new currency entry
            new_entry = Currency(**insert_data)
            batch.append(new_entry)
            
            # Bulk create in batches
            if len(batch) >= BATCH_SIZE:
                try:
                    Currency.objects.bulk_create(batch, ignore_conflicts=True)
                except Exception as e:
                    print(f"Error importing currencies: {e}")
                    # Try one by one if bulk fails
                    for entry in batch:
                        try:
                            entry.save()
                        except Exception as e2:
                            print(f"Error importing currency {entry.code if hasattr(entry, 'code') else 'unknown'}: {e2}")
                batch = []
                print(f"Imported {i+1} currencies...")
        
        # Create any remaining records
        if batch:
            try:
                Currency.objects.bulk_create(batch, ignore_conflicts=True)
            except Exception as e:
                print(f"Error importing remaining currencies: {e}")
                # Try one by one if bulk fails
                for entry in batch:
                    try:
                        entry.save()
                    except Exception as e2:
                        print(f"Error importing currency {entry.code if hasattr(entry, 'code') else 'unknown'}: {e2}")
    
    print(f"Successfully imported currency data into Currency table")


def reverse_load_data(apps, schema_editor):
    """
    Remove all countries and currencies loaded from the JSON files.
    """
    Country = apps.get_model('shared', 'Country')
    Currency = apps.get_model('shared', 'Currency')
    
    Country.objects.all().delete()
    Currency.objects.all().delete()

class Migration(migrations.Migration):
    dependencies = [
        ('shared', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(load_country_data, reverse_load_data),
        migrations.RunPython(load_currency_data, reverse_load_data),
    ]
